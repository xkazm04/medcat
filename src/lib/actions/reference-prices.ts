"use server";

import { createClient } from "@/lib/supabase/server";
import { checkCircuit } from "@/lib/supabase/circuit-breaker";
import type { ReferencePrice } from "@/lib/types";

interface ReferencePricesResult {
  success: boolean;
  data?: ReferencePrice[];
  productEmdnCode?: string | null;
  error?: string;
}

/**
 * Get reference prices for a product.
 * Looks up the product's EMDN category, then queries reference_prices
 * for both direct product_id match AND emdn_category_id match.
 */
export async function getReferencePricesForProduct(
  productId: string
): Promise<ReferencePricesResult> {
  checkCircuit();
  const supabase = await createClient();

  // Step 1: Get the product's emdn_category_id and EMDN code
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("emdn_category_id, emdn_category:emdn_categories(code)")
    .eq("id", productId)
    .single();

  if (productError) {
    return { success: false, error: productError.message };
  }

  const productEmdnCode = (product as any)?.emdn_category?.code ?? null;

  // Step 2: Call the RPC with both product_id and emdn_category_id
  const { data, error } = await supabase.rpc("get_reference_prices", {
    p_product_id: productId,
    p_emdn_category_id: product?.emdn_category_id || null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: (data as ReferencePrice[]) ?? [], productEmdnCode };
}

/**
 * Get reference prices by EMDN category directly.
 * Uses RPC for hierarchy-aware matching (walks up ancestor chain).
 * Used by chat tool when only category ID is available.
 */
export async function getReferencePricesByCategory(
  emdnCategoryId: string,
  countries?: string[]
): Promise<ReferencePricesResult> {
  checkCircuit();
  const supabase = await createClient();

  // Use hierarchy-aware RPC (matches exact + ancestor categories)
  const { data, error } = await supabase.rpc("get_reference_prices", {
    p_product_id: null,
    p_emdn_category_id: emdnCategoryId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  let prices = (data as ReferencePrice[]) ?? [];

  // Apply country filter if specified
  if (countries && countries.length > 0) {
    const countrySet = new Set(countries);
    prices = prices.filter((p) => countrySet.has(p.source_country));
  }

  return { success: true, data: prices };
}
