import { createClient } from "@/lib/supabase/server";
import { checkCircuit, CircuitBreakerError } from "@/lib/supabase/circuit-breaker";
import type { EMDNCategory, Material, ProductWithRelations, Vendor } from "@/lib/types";

export interface GetProductsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  vendor?: string;
  category?: string;
  material?: string;
  ceMarked?: string;
  mdrClass?: string;
  manufacturer?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface GetProductsResult {
  data: ProductWithRelations[];
  count: number;
  error: Error | null;
}

export async function getProducts(params: GetProductsParams = {}): Promise<GetProductsResult> {
  // Circuit breaker check to prevent infinite loops
  checkCircuit();

  const {
    page = 1,
    pageSize = 20,
    search,
    vendor,
    category,
    material,
    ceMarked,
    mdrClass,
    manufacturer,
    minPrice,
    maxPrice,
    sortBy = "name",
    sortOrder = "asc",
  } = params;

  const supabase = await createClient();
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("products")
    .select(
      `
      id,
      name,
      sku,
      description,
      price,
      vendor_id,
      emdn_category_id,
      material_id,
      udi_di,
      ce_marked,
      mdr_class,
      manufacturer_name,
      manufacturer_sku,
      created_at,
      updated_at,
      vendor:vendors(id, name, code, website, created_at, updated_at),
      emdn_category:emdn_categories(id, code, name, parent_id, depth, path, created_at),
      material:materials(id, name, code)
    `,
      { count: "exact" }
    );

  // Apply search filter using tsvector full-text search (migration 009)
  // Falls back to ILIKE for single-character queries that tsquery can't parse
  if (search) {
    const searchQuery = search.trim();
    if (searchQuery) {
      if (searchQuery.length <= 1) {
        // Single char: tsquery can't parse, use ILIKE fallback
        // Escape PostgREST filter syntax chars and SQL wildcards to prevent injection
        const escaped = searchQuery.replace(/[%_.,()\\]/g, c => `\\${c}`);
        query = query.or(
          `name.ilike.%${escaped}%,sku.ilike.%${escaped}%,description.ilike.%${escaped}%,manufacturer_name.ilike.%${escaped}%`
        );
      } else {
        // Use websearch_to_tsquery via the search_vector column (GIN-indexed, weighted A-D)
        query = query.textSearch('search_vector', searchQuery, { type: 'websearch', config: 'english' });
      }
    }
  }

  // Apply vendor filter (comma-separated IDs)
  if (vendor) {
    const vendorIds = vendor.split(",").filter(Boolean);
    if (vendorIds.length > 0) {
      query = query.in("vendor_id", vendorIds);
    }
  }

  // Apply category filter (includes all descendants)
  if (category) {
    // Get all descendant category IDs using RPC function
    const { data: categoryIds } = await supabase
      .rpc("get_category_descendants", { parent_category_id: category });

    if (categoryIds && categoryIds.length > 0) {
      query = query.in("emdn_category_id", categoryIds);
    } else {
      // Fallback to exact match if RPC fails
      query = query.eq("emdn_category_id", category);
    }
  }

  // Apply material filter (comma-separated IDs)
  if (material) {
    const materialIds = material.split(",").filter(Boolean);
    if (materialIds.length > 0) {
      query = query.in("material_id", materialIds);
    }
  }

  // Apply CE marked filter (comma-separated values for multiselect)
  if (ceMarked !== undefined && ceMarked !== null && ceMarked !== "") {
    const ceValues = ceMarked.split(",").filter(Boolean);
    if (ceValues.length === 1) {
      query = query.eq("ce_marked", ceValues[0] === "true");
    }
    // If both true and false are selected, no filter needed (shows all)
  }

  // Apply MDR class filter (comma-separated values for multiselect)
  if (mdrClass !== undefined && mdrClass !== null && mdrClass !== "") {
    const mdrClasses = mdrClass.split(",").filter(Boolean);
    if (mdrClasses.length > 0) {
      query = query.in("mdr_class", mdrClasses);
    }
  }

  // Apply manufacturer filter (comma-separated names)
  if (manufacturer !== undefined && manufacturer !== null && manufacturer !== "") {
    const manufacturers = manufacturer.split(",").filter(Boolean).map(decodeURIComponent);
    if (manufacturers.length > 0) {
      query = query.in("manufacturer_name", manufacturers);
    }
  }

  // Apply price range filter
  if (minPrice !== undefined && !isNaN(minPrice)) {
    query = query.gte("price", minPrice);
  }
  if (maxPrice !== undefined && !isNaN(maxPrice)) {
    query = query.lte("price", maxPrice);
  }

  // Apply sorting
  const validSortColumns = ["name", "sku", "price", "created_at"];
  const column = validSortColumns.includes(sortBy) ? sortBy : "name";
  query = query.order(column, { ascending: sortOrder === "asc" });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error("Error fetching products:", error.message);
    throw new Error(`Failed to fetch products: ${error.message}`);
  }

  return {
    data: (data as unknown as ProductWithRelations[]) || [],
    count: count || 0,
    error: null,
  };
}

export async function getVendors(): Promise<Vendor[]> {
  checkCircuit();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error fetching vendors:", error.message);
    throw new Error(`Failed to fetch vendors: ${error.message}`);
  }

  return data || [];
}

export async function getMaterials(): Promise<Material[]> {
  checkCircuit();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("materials")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error fetching materials:", error.message);
    throw new Error(`Failed to fetch materials: ${error.message}`);
  }

  return data || [];
}

export async function getEMDNCategoriesFlat(): Promise<EMDNCategory[]> {
  checkCircuit();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("emdn_categories")
    .select("*")
    .order("code");

  if (error) {
    console.error("Error fetching EMDN categories:", error.message);
    throw new Error(`Failed to fetch EMDN categories: ${error.message}`);
  }

  return data || [];
}

export interface CategoryNode extends EMDNCategory {
  children: CategoryNode[];
  productCount: number;
  name_cs?: string | null; // Czech translation (matches EMDNCategory type)
}

/**
 * Get localized category name based on locale
 * Falls back to English name if Czech translation not available
 */
export function getLocalizedCategoryName(
  category: { name: string; name_cs?: string | null },
  locale?: string
): string {
  if (locale === 'cs' && category.name_cs) {
    return category.name_cs;
  }
  return category.name;
}

/**
 * Get EMDN categories as a tree structure.
 * Only includes categories that have products assigned (directly or via descendants).
 * Uses materialized view for fast counts when available.
 */
export async function getEMDNCategories(): Promise<CategoryNode[]> {
  checkCircuit();
  const supabase = await createClient();

  // Try to use materialized view first (fast path) - includes Czech i18n
  const { data: matViewData, error: matViewError } = await supabase
    .from("category_product_counts")
    .select("id, code, name, name_cs, parent_id, path, depth, total_count")
    .gt("total_count", 0)
    .order("code");

  if (!matViewError && matViewData && matViewData.length > 0) {
    // Build tree from materialized view
    return buildTreeFromMatView(matViewData);
  }

  // Fallback: compute counts directly (slower path)
  console.log("[getEMDNCategories] Materialized view not available, computing counts directly");
  return computeCategoryTreeFallback(supabase);
}

// Build tree from materialized view data
function buildTreeFromMatView(data: Array<{
  id: string;
  code: string;
  name: string;
  name_cs?: string;
  parent_id: string | null;
  path: string;
  depth: number;
  total_count: number;
}>): CategoryNode[] {
  const categoryMap = new Map<string, CategoryNode>();
  const rootCategories: CategoryNode[] = [];

  // First pass: create nodes
  data.forEach((row) => {
    categoryMap.set(row.id, {
      id: row.id,
      code: row.code,
      name: row.name,
      name_cs: row.name_cs,
      parent_id: row.parent_id,
      path: row.path,
      depth: row.depth,
      created_at: "",
      children: [],
      productCount: row.total_count,
    });
  });

  // Second pass: build tree
  data.forEach((row) => {
    const node = categoryMap.get(row.id)!;
    if (row.parent_id && categoryMap.has(row.parent_id)) {
      categoryMap.get(row.parent_id)!.children.push(node);
    } else if (!row.parent_id || !categoryMap.has(row.parent_id)) {
      rootCategories.push(node);
    }
  });

  return rootCategories;
}

// Fallback: compute tree directly from tables
async function computeCategoryTreeFallback(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<CategoryNode[]> {
  // Get all categories
  const { data: categoriesData, error: catError } = await supabase
    .from("emdn_categories")
    .select("*")
    .order("code");

  if (catError) {
    console.error("Error fetching EMDN categories:", catError.message);
    throw new Error(`Failed to fetch EMDN categories: ${catError.message}`);
  }

  // Get product counts per category
  const { data: productCounts, error: countError } = await supabase
    .from("products")
    .select("emdn_category_id")
    .not("emdn_category_id", "is", null);

  const countMap = new Map<string, number>();
  if (!countError && productCounts) {
    productCounts.forEach((p) => {
      const catId = p.emdn_category_id;
      countMap.set(catId, (countMap.get(catId) || 0) + 1);
    });
  }

  // Build tree structure
  const categories = categoriesData || [];
  const categoryMap = new Map<string, CategoryNode>();
  const rootCategories: CategoryNode[] = [];

  // First pass: create nodes with direct counts
  categories.forEach((cat) => {
    categoryMap.set(cat.id, {
      ...cat,
      children: [],
      productCount: countMap.get(cat.id) || 0,
    });
  });

  // Second pass: build tree
  categories.forEach((cat) => {
    const node = categoryMap.get(cat.id)!;
    if (cat.parent_id && categoryMap.has(cat.parent_id)) {
      categoryMap.get(cat.parent_id)!.children.push(node);
    } else {
      rootCategories.push(node);
    }
  });

  // Third pass: propagate counts up (parent includes children's counts)
  function propagateCounts(node: CategoryNode): number {
    let total = node.productCount;
    for (const child of node.children) {
      total += propagateCounts(child);
    }
    node.productCount = total;
    return total;
  }
  rootCategories.forEach(propagateCounts);

  // Filter out categories with no products
  function filterEmptyCategories(nodes: CategoryNode[]): CategoryNode[] {
    return nodes
      .filter((node) => node.productCount > 0)
      .map((node) => ({
        ...node,
        children: filterEmptyCategories(node.children),
      }));
  }

  return filterEmptyCategories(rootCategories);
}

/**
 * Get all EMDN categories (even those without products).
 * Used for forms where user needs to select from all categories.
 */
export async function getEMDNCategoriesAll(): Promise<CategoryNode[]> {
  checkCircuit();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("emdn_categories")
    .select("*")
    .order("code");

  if (error) {
    console.error("Error fetching EMDN categories:", error.message);
    return [];
  }

  const categories = data || [];
  const categoryMap = new Map<string, CategoryNode>();
  const rootCategories: CategoryNode[] = [];

  categories.forEach((cat) => {
    categoryMap.set(cat.id, { ...cat, children: [], productCount: 0 });
  });

  categories.forEach((cat) => {
    const node = categoryMap.get(cat.id)!;
    if (cat.parent_id && categoryMap.has(cat.parent_id)) {
      categoryMap.get(cat.parent_id)!.children.push(node);
    } else {
      rootCategories.push(node);
    }
  });

  return rootCategories;
}

/**
 * Get EMDN category paths that have reference prices.
 * Used to show "EU Ref" indicator in catalog table.
 * Returns paths like ["P/P09/P0908", "P/P09/P0909"] — products whose
 * emdn_category.path starts with any of these have reference price coverage.
 */
export async function getRefPricePaths(): Promise<string[]> {
  checkCircuit();
  const supabase = await createClient();

  // First get distinct category IDs from reference_prices
  const { data: refData, error: refError } = await supabase
    .from("reference_prices")
    .select("emdn_category_id")
    .not("emdn_category_id", "is", null);

  if (refError || !refData) {
    console.error("Error fetching ref price category IDs:", refError?.message);
    return [];
  }

  // Deduplicate category IDs client-side (much smaller payload than full rows)
  const uniqueIds = [...new Set(refData.map(r => r.emdn_category_id as string))];
  if (uniqueIds.length === 0) return [];

  // Batch-fetch only the paths we need
  const { data: catData, error: catError } = await supabase
    .from("emdn_categories")
    .select("path")
    .in("id", uniqueIds);

  if (catError || !catData) {
    console.error("Error fetching category paths:", catError?.message);
    return [];
  }

  return catData.map(c => c.path).filter(Boolean);
}

/**
 * Get unique manufacturer names from products.
 * Returns sorted list of unique manufacturer names (ascending).
 */
export async function getManufacturers(): Promise<string[]> {
  checkCircuit();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("manufacturer_name")
    .not("manufacturer_name", "is", null)
    .order("manufacturer_name", { ascending: true });

  if (error) {
    console.error("Error fetching manufacturers:", error.message);
    throw new Error(`Failed to fetch manufacturers: ${error.message}`);
  }

  // Extract unique manufacturer names
  const uniqueManufacturers = [...new Set(
    (data || [])
      .map((p) => p.manufacturer_name)
      .filter((name): name is string => name !== null && name.trim() !== "")
  )].sort((a, b) => a.localeCompare(b));

  return uniqueManufacturers;
}
