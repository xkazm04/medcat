"use server";

import { createClient } from "@/lib/supabase/server";
import { checkCircuit } from "@/lib/supabase/circuit-breaker";

/**
 * Represents a product found via similarity search.
 * Used during extraction preview to warn about potential duplicates.
 */
export interface SimilarProduct {
  id: string;
  name: string;
  sku: string;
  manufacturer_name: string | null;
  manufacturer_sku: string | null;
  emdn_category_id: string | null;
  name_similarity: number;
  sku_similarity: number;
  offering_count: number;
  min_price: number | null;
  max_price: number | null;
}

/**
 * Represents a vendor offering for a product (from price comparison RPC).
 */
export interface OfferingComparison {
  offering_id: string;
  vendor_id: string;
  vendor_name: string | null;
  vendor_sku: string | null;
  vendor_price: number | null;
  currency: string | null;
  is_primary: boolean;
}

interface SimilarityResult {
  success: boolean;
  data?: SimilarProduct[];
  error?: string;
}

interface PriceComparisonResult {
  success: boolean;
  data?: OfferingComparison[];
  error?: string;
}

/**
 * Find products similar to the given name and optional SKU.
 * Uses PostgreSQL pg_trgm extension for trigram-based similarity matching.
 *
 * @param name - Product name to search for
 * @param sku - Optional SKU to match (high threshold 0.8 for SKU matches)
 * @param threshold - Minimum name similarity threshold (default 0.3)
 * @returns SimilarityResult with matching products or error
 */
export async function findSimilarProducts(
  name: string,
  sku?: string,
  threshold: number = 0.3
): Promise<SimilarityResult> {
  checkCircuit();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("find_similar_products", {
    search_name: name,
    search_sku: sku || null,
    similarity_threshold: threshold,
    max_results: 5,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data ?? [] };
}

/**
 * Get all vendor offerings for a given product for price comparison.
 * Returns offerings ordered by price ascending for easy comparison.
 *
 * @param productId - UUID of the product to compare
 * @returns PriceComparisonResult with vendor offerings or error
 */
export async function getProductPriceComparison(
  productId: string
): Promise<PriceComparisonResult> {
  checkCircuit();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_product_price_comparison", {
    p_product_id: productId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data ?? [] };
}
