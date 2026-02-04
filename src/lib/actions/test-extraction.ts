"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { extractFromContent } from "./extraction";
import { TEST_PRODUCT_SPEC, TEST_PRODUCT_NAME } from "@/lib/constants/test-product";
import type { ExtractedProduct } from "@/lib/schemas/extraction";

interface TestExtractionResult {
  success: boolean;
  data?: ExtractedProduct;
  error?: string;
  deletedExisting?: boolean;
}

/**
 * Run test extraction with hardcoded product spec.
 *
 * This action:
 * 1. Deletes any existing product with the test product name
 * 2. Runs extraction on the hardcoded spec
 * 3. Returns the extracted data for preview
 */
export async function runTestExtraction(): Promise<TestExtractionResult> {
  const supabase = await createClient();

  // Step 1: Delete existing test product if it exists
  let deletedExisting = false;
  const { data: existingProducts } = await supabase
    .from("products")
    .select("id")
    .ilike("name", `%${TEST_PRODUCT_NAME}%`);

  if (existingProducts && existingProducts.length > 0) {
    const { error: deleteError } = await supabase
      .from("products")
      .delete()
      .in("id", existingProducts.map(p => p.id));

    if (deleteError) {
      console.error("Error deleting existing test products:", deleteError);
    } else {
      deletedExisting = true;
      console.log(`Deleted ${existingProducts.length} existing test product(s)`);
    }
  }

  // Step 2: Run extraction on the test spec
  const extractionResult = await extractFromContent(TEST_PRODUCT_SPEC);

  if (!extractionResult.success) {
    return {
      success: false,
      error: extractionResult.error || "Extraction failed",
      deletedExisting,
    };
  }

  // Revalidate to reflect any deletions
  revalidatePath("/");

  return {
    success: true,
    data: extractionResult.data,
    deletedExisting,
  };
}

/**
 * Get the raw test product specification for display.
 */
export async function getTestProductSpec(): Promise<string> {
  return TEST_PRODUCT_SPEC;
}
