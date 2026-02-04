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
  price: number | null;
  vendor_id: string | null;
  vendor_name: string | null;
  name_similarity: number;
  sku_similarity: number;
}

/**
 * Represents a product in a price comparison group.
 * Used to show all vendor prices for similar products.
 */
export interface ProductPriceComparison {
  id: string;
  name: string;
  sku: string;
  price: number | null;
  vendor_id: string | null;
  vendor_name: string | null;
  similarity: number;
}

interface SimilarityResult {
  success: boolean;
  data?: SimilarProduct[];
  error?: string;
}

interface PriceComparisonResult {
  success: boolean;
  data?: ProductPriceComparison[];
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
    console.error("Similarity search error:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data ?? [] };
}

/**
 * Get all products similar to a given product for price comparison.
 * Returns products ordered by price ascending for easy comparison.
 *
 * @param productId - UUID of the product to compare
 * @param threshold - Minimum similarity threshold (default 0.5 for grouping)
 * @returns PriceComparisonResult with similar products or error
 */
export async function getProductPriceComparison(
  productId: string,
  threshold: number = 0.5
): Promise<PriceComparisonResult> {
  checkCircuit();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_product_price_comparison", {
    product_id: productId,
    similarity_threshold: threshold,
  });

  if (error) {
    console.error("Price comparison error:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data ?? [] };
}
