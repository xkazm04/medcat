import { createClient } from "@/lib/supabase/server";
import { checkCircuit, CircuitBreakerError } from "@/lib/supabase/circuit-breaker";
import type { EMDNCategory, Material, ProductWithRelations, Vendor } from "@/lib/types";

// Mock data for when Supabase is not configured
const MOCK_VENDORS: Vendor[] = [
  { id: "v1", name: "DePuy Synthes", code: "DEPUY", website: "https://depuysynthes.com", created_at: "2024-01-01", updated_at: "2024-01-01" },
  { id: "v2", name: "Stryker", code: "STRYKER", website: "https://stryker.com", created_at: "2024-01-01", updated_at: "2024-01-01" },
];

const MOCK_MATERIALS: Material[] = [
  { id: "m1", name: "Titanium Alloy", code: "TI6AL4V" },
  { id: "m2", name: "Cobalt Chrome", code: "COCR" },
];

const MOCK_CATEGORIES: EMDNCategory[] = [
  { id: "c1", code: "P09", name: "Orthopaedic and prosthetic devices", parent_id: null, depth: 0, path: "P09", created_at: "2024-01-01" },
  { id: "c2", code: "P0901", name: "Orthopaedic bone implants", parent_id: "c1", depth: 1, path: "P09/P0901", created_at: "2024-01-01" },
];

const MOCK_PRODUCTS: ProductWithRelations[] = [
  {
    id: "p1",
    name: "Hip Stem Titanium - Standard",
    sku: "HS-TI-001",
    description: "Primary hip stem implant made from titanium alloy, suitable for cemented or press-fit fixation",
    price: 2450.00,
    vendor_id: "v1",
    emdn_category_id: "c2",
    material_id: "m1",
    udi_di: "00850123456789",
    ce_marked: true,
    mdr_class: "IIb",
    manufacturer_name: "DePuy Synthes Inc.",
    manufacturer_sku: "HS-001-TI",
    created_at: "2024-01-15",
    updated_at: "2024-01-15",
    vendor: MOCK_VENDORS[0],
    emdn_category: MOCK_CATEGORIES[1],
    material: MOCK_MATERIALS[0],
  },
  {
    id: "p2",
    name: "Knee Replacement System - Total",
    sku: "KR-COCR-002",
    description: "Complete knee replacement system with femoral component, tibial baseplate, and polyethylene insert",
    price: 4890.00,
    vendor_id: "v2",
    emdn_category_id: "c2",
    material_id: "m2",
    udi_di: "00850987654321",
    ce_marked: true,
    mdr_class: "III",
    manufacturer_name: "Stryker Corporation",
    manufacturer_sku: "KRS-002-COCR",
    created_at: "2024-01-20",
    updated_at: "2024-01-20",
    vendor: MOCK_VENDORS[1],
    emdn_category: MOCK_CATEGORIES[1],
    material: MOCK_MATERIALS[1],
  },
];

export interface GetProductsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  vendor?: string;
  category?: string;
  material?: string;
  ceMarked?: string;
  mdrClass?: string;
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

  // Apply search filter
  if (search) {
    query = query.or(
      `name.ilike.%${search}%,description.ilike.%${search}%,sku.ilike.%${search}%`
    );
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

  // Apply CE marked filter
  if (ceMarked !== undefined && ceMarked !== null && ceMarked !== "") {
    query = query.eq("ce_marked", ceMarked === "true");
  }

  // Apply MDR class filter
  if (mdrClass !== undefined && mdrClass !== null && mdrClass !== "") {
    query = query.eq("mdr_class", mdrClass);
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
    console.error("Error fetching products (using mock data):", error.message);
    // Return mock data when Supabase is not configured
    return { data: MOCK_PRODUCTS, count: MOCK_PRODUCTS.length, error: null };
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
    console.error("Error fetching vendors (using mock data):", error.message);
    return MOCK_VENDORS;
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
    console.error("Error fetching materials (using mock data):", error.message);
    return MOCK_MATERIALS;
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
    console.error("Error fetching EMDN categories (using mock data):", error.message);
    return MOCK_CATEGORIES;
  }

  return data || [];
}

export interface CategoryNode extends EMDNCategory {
  children: CategoryNode[];
  productCount: number;
}

/**
 * Get EMDN categories as a tree structure.
 * Only includes categories that have products assigned (directly or via descendants).
 * Uses materialized view for fast counts when available.
 */
export async function getEMDNCategories(): Promise<CategoryNode[]> {
  checkCircuit();
  const supabase = await createClient();

  // Try to use materialized view first (fast path)
  const { data: matViewData, error: matViewError } = await supabase
    .from("category_product_counts")
    .select("id, code, name, parent_id, path, depth, total_count")
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
    console.error("Error fetching EMDN categories (using mock data):", catError.message);
    const mockRoot: CategoryNode = { ...MOCK_CATEGORIES[0], children: [], productCount: 0 };
    const mockChild: CategoryNode = { ...MOCK_CATEGORIES[1], children: [], productCount: 0 };
    mockRoot.children.push(mockChild);
    return [mockRoot];
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
