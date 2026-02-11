"use server";

import { createClient } from "@/lib/supabase/server";
import { checkCircuit } from "@/lib/supabase/circuit-breaker";
import type { ProductWithRelations } from "@/lib/types";

export interface ExportFilters {
  search?: string;
  vendor?: string;
  category?: string;
  material?: string;
  ceMarked?: string;
  mdrClass?: string;
  manufacturer?: string;
  minPrice?: number;
  maxPrice?: number;
}

/**
 * Fetch products for export with optional filters but NO pagination.
 * Uses .range() in batches to avoid Supabase default 1000 row limit.
 */
export async function getProductsForExport(
  filters?: ExportFilters
): Promise<ProductWithRelations[]> {
  checkCircuit();
  const supabase = await createClient();

  const selectQuery = `
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
    material:materials(id, name, code),
    offerings:product_offerings(id, product_id, vendor_id, vendor_sku, vendor_price, currency, is_primary, created_at, updated_at, vendor:vendors(id, name, code, website, created_at, updated_at))
  `;

  // Build query with filters
  let query = supabase.from("products").select(selectQuery, { count: "exact" });

  if (filters) {
    const { search, vendor, category, material, ceMarked, mdrClass, manufacturer, minPrice, maxPrice } = filters;

    if (search) {
      const searchQuery = search.trim();
      if (searchQuery) {
        if (searchQuery.length <= 1) {
          const escaped = searchQuery.replace(/[%_.,()\\]/g, c => `\\${c}`);
          query = query.or(
            `name.ilike.%${escaped}%,sku.ilike.%${escaped}%,description.ilike.%${escaped}%,manufacturer_name.ilike.%${escaped}%`
          );
        } else {
          query = query.textSearch('search_vector', searchQuery, { type: 'websearch', config: 'english' });
        }
      }
    }

    if (vendor) {
      const vendorIds = vendor.split(",").filter(Boolean);
      if (vendorIds.length > 0) {
        query = query.in("vendor_id", vendorIds);
      }
    }

    if (category) {
      const { data: categoryIds } = await supabase
        .rpc("get_category_descendants", { parent_category_id: category });
      if (categoryIds && categoryIds.length > 0) {
        query = query.in("emdn_category_id", categoryIds);
      } else {
        query = query.eq("emdn_category_id", category);
      }
    }

    if (material) {
      const materialIds = material.split(",").filter(Boolean);
      if (materialIds.length > 0) {
        query = query.in("material_id", materialIds);
      }
    }

    if (ceMarked !== undefined && ceMarked !== null && ceMarked !== "") {
      const ceValues = ceMarked.split(",").filter(Boolean);
      if (ceValues.length === 1) {
        query = query.eq("ce_marked", ceValues[0] === "true");
      }
    }

    if (mdrClass !== undefined && mdrClass !== null && mdrClass !== "") {
      const mdrClasses = mdrClass.split(",").filter(Boolean);
      if (mdrClasses.length > 0) {
        query = query.in("mdr_class", mdrClasses);
      }
    }

    if (manufacturer !== undefined && manufacturer !== null && manufacturer !== "") {
      const manufacturers = manufacturer.split(",").filter(Boolean).map(decodeURIComponent);
      if (manufacturers.length > 0) {
        query = query.in("manufacturer_name", manufacturers);
      }
    }

    if (minPrice !== undefined && !isNaN(minPrice)) {
      query = query.gte("price", minPrice);
    }
    if (maxPrice !== undefined && !isNaN(maxPrice)) {
      query = query.lte("price", maxPrice);
    }
  }

  query = query.order("name", { ascending: true });

  // Fetch in batches to avoid Supabase 1000-row default limit
  const BATCH_SIZE = 1000;
  const allProducts: ProductWithRelations[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await query.range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error("Error fetching products for export:", error.message);
      throw new Error(`Failed to fetch products for export: ${error.message}`);
    }

    const batch = (data as unknown as ProductWithRelations[]) || [];
    allProducts.push(...batch);

    if (batch.length < BATCH_SIZE) {
      hasMore = false;
    } else {
      offset += BATCH_SIZE;
    }
  }

  return allProducts;
}
