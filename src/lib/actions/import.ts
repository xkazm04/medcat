"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { importRowSchema } from "@/lib/schemas/import";

/**
 * Result of a bulk import operation.
 */
export interface ImportResult {
  /** Number of new products created */
  created: number;
  /** Number of existing products updated */
  updated: number;
  /** Number of rows skipped due to validation errors */
  skipped: number;
  /** Number of products with unclassified EMDN */
  unclassified: number;
  /** Validation errors with row details */
  errors: Array<{ row: number; field: string; message: string }>;
}

/** Batch size for processing imports */
const BATCH_SIZE = 100;

/**
 * Look up EMDN category IDs from codes.
 * Caches results for efficiency when processing many rows.
 *
 * @param codes - Array of EMDN codes to look up
 * @returns Map of code to category ID (null if not found)
 */
async function lookupEMDNCodes(
  codes: string[]
): Promise<Map<string, string | null>> {
  const supabase = await createClient();

  // Filter out empty codes
  const validCodes = codes.filter((c) => c && c.trim().length > 0);

  if (validCodes.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("emdn_categories")
    .select("id, code")
    .in("code", validCodes);

  if (error) {
    console.error("Error looking up EMDN codes:", error);
    return new Map();
  }

  const codeMap = new Map<string, string | null>();
  for (const category of data || []) {
    codeMap.set(category.code, category.id);
  }

  return codeMap;
}

/**
 * Check which products already exist by SKU + vendor_id pair.
 * Used to show "will update" warning before import.
 *
 * @param skus - Array of SKUs to check
 * @param vendorId - Vendor ID to match
 * @returns Map of SKU to existing product ID
 */
export async function checkExistingProducts(
  skus: string[],
  vendorId: string
): Promise<Map<string, string>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, sku")
    .eq("vendor_id", vendorId)
    .in("sku", skus);

  if (error) {
    console.error("Error checking existing products:", error);
    return new Map();
  }

  const existingMap = new Map<string, string>();
  for (const product of data || []) {
    existingMap.set(product.sku, product.id);
  }

  return existingMap;
}

/**
 * Import products from mapped CSV rows.
 * Handles deduplication by SKU + vendor_id pair:
 * - If product with same SKU+vendor exists: update it
 * - If no match: create new product
 *
 * @param rows - Array of row objects (from mapped CSV data)
 * @param vendorId - Vendor ID to assign to all imported products
 * @returns ImportResult with counts and any errors
 */
export async function importProducts(
  rows: unknown[],
  vendorId: string
): Promise<ImportResult> {
  const supabase = await createClient();

  const result: ImportResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    unclassified: 0,
    errors: [],
  };

  // Process rows in batches
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    // Collect valid rows and their SKUs for this batch
    const validRows: Array<{
      rowIndex: number;
      emdn_code?: string | null;
      data: {
        name: string;
        sku: string;
        description?: string | null;
        price?: number | null;
        vendor_id: string;
        manufacturer_name?: string | null;
        manufacturer_sku?: string | null;
        emdn_category_id?: string | null;
        ce_marked: boolean;
      };
    }> = [];
    const skusToCheck: string[] = [];
    const emdnCodesToLookup: string[] = [];

    // Validate each row
    for (let j = 0; j < batch.length; j++) {
      const rowIndex = i + j;
      const row = batch[j];

      // Add row index and vendor_id for validation
      const rowWithMeta = {
        ...(row as object),
        _rowIndex: rowIndex,
        vendor_id: vendorId,
      };

      const validated = importRowSchema.safeParse(rowWithMeta);

      if (!validated.success) {
        result.skipped++;
        // Add first error for this row
        const firstIssue = validated.error.issues[0];
        result.errors.push({
          row: rowIndex,
          field: firstIssue.path.join(".") || "unknown",
          message: firstIssue.message,
        });
        continue;
      }

      // Extract product data (without _rowIndex)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _rowIndex, ...productData } = validated.data;

      const emdnCode = productData.emdn_code?.trim() || null;

      validRows.push({
        rowIndex,
        emdn_code: emdnCode,
        data: {
          name: productData.name,
          sku: productData.sku,
          description: productData.description ?? null,
          price: productData.price ?? null,
          vendor_id: vendorId,
          manufacturer_name: productData.manufacturer_name ?? null,
          manufacturer_sku: productData.manufacturer_sku ?? null,
          emdn_category_id: null, // Will be resolved after lookup
          ce_marked: productData.ce_marked ?? false,
        },
      });
      skusToCheck.push(productData.sku);
      if (emdnCode) {
        emdnCodesToLookup.push(emdnCode);
      }
    }

    if (validRows.length === 0) continue;

    // Check which products already exist for this batch
    const existingProducts = await checkExistingProducts(skusToCheck, vendorId);

    // Look up EMDN category IDs from codes
    const emdnLookup = await lookupEMDNCodes(emdnCodesToLookup);

    // Resolve EMDN category IDs for each valid row
    for (const validRow of validRows) {
      if (validRow.emdn_code) {
        const categoryId = emdnLookup.get(validRow.emdn_code);
        if (categoryId) {
          validRow.data.emdn_category_id = categoryId;
        } else {
          // EMDN code not found in database - mark as unclassified
          result.unclassified++;
        }
      } else {
        // No EMDN code provided - mark as unclassified
        result.unclassified++;
      }
    }

    // Process each valid row
    for (const validRow of validRows) {
      const existingId = existingProducts.get(validRow.data.sku);

      if (existingId) {
        // Update existing product
        const { error } = await supabase
          .from("products")
          .update(validRow.data)
          .eq("id", existingId);

        if (error) {
          result.skipped++;
          result.errors.push({
            row: validRow.rowIndex,
            field: "database",
            message: error.message,
          });
        } else {
          result.updated++;
        }
      } else {
        // Insert new product
        const { error } = await supabase.from("products").insert(validRow.data);

        if (error) {
          result.skipped++;
          result.errors.push({
            row: validRow.rowIndex,
            field: "database",
            message: error.message,
          });
        } else {
          result.created++;
        }
      }
    }
  }

  // Revalidate cache after all operations
  revalidatePath("/");

  return result;
}
