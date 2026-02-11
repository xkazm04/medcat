"use server";

import { createClient } from "@/lib/supabase/server";
import { checkCircuit } from "@/lib/supabase/circuit-breaker";
import { revalidatePath, revalidateTag } from "next/cache";

export interface XLSXImportRow {
  name: string;
  sku: string;
  vendor_name?: string | null;
  manufacturer_name?: string | null;
  manufacturer_sku?: string | null;
  price?: number | null;
  ce_marked?: boolean;
  mdr_class?: string | null;
  udi_di?: string | null;
  emdn_code?: string | null;
  description?: string | null;
}

export interface XLSXImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  updated: number;
  errors: Array<{ row: number; message: string }>;
  duplicates: Array<{ row: number; name: string; sku: string }>;
  formatError?: string;
}

const BATCH_SIZE = 100;

/**
 * Resolve vendor names to vendor IDs, creating new vendors as needed.
 * Returns a map of vendor name (lowercased) → vendor ID.
 */
async function resolveVendors(
  vendorNames: string[]
): Promise<Map<string, string>> {
  const unique = [...new Set(vendorNames.map(n => n.trim()).filter(Boolean))];
  if (unique.length === 0) return new Map();

  checkCircuit();
  const supabase = await createClient();
  const result = new Map<string, string>();

  // Look up existing vendors (case-insensitive)
  for (const name of unique) {
    const { data: existing } = await supabase
      .from("vendors")
      .select("id")
      .ilike("name", name)
      .maybeSingle();

    if (existing) {
      result.set(name.toLowerCase(), existing.id);
    } else {
      // Create new vendor
      const { data: created } = await supabase
        .from("vendors")
        .insert({ name })
        .select("id")
        .single();

      if (created) {
        result.set(name.toLowerCase(), created.id);
      }
    }
  }

  return result;
}

/**
 * Look up EMDN category IDs from codes.
 */
async function lookupEMDNCodes(
  codes: string[]
): Promise<Map<string, string>> {
  const validCodes = [...new Set(codes.filter(c => c && c.trim().length > 0))];
  if (validCodes.length === 0) return new Map();

  checkCircuit();
  const supabase = await createClient();

  const { data } = await supabase
    .from("emdn_categories")
    .select("id, code")
    .in("code", validCodes);

  const codeMap = new Map<string, string>();
  for (const cat of data || []) {
    codeMap.set(cat.code, cat.id);
  }
  return codeMap;
}

/**
 * Import products from parsed XLSX rows.
 * Handles:
 * - Vendor resolution (lookup or create by name)
 * - EMDN code resolution
 * - Duplicate detection by (manufacturer_name, manufacturer_sku) or SKU
 * - Creates product_offerings for vendor/price data
 * - Row validation
 */
export async function importFromXLSX(
  rows: XLSXImportRow[]
): Promise<XLSXImportResult> {
  checkCircuit();
  const supabase = await createClient();

  const result: XLSXImportResult = {
    success: true,
    imported: 0,
    skipped: 0,
    updated: 0,
    errors: [],
    duplicates: [],
  };

  if (rows.length === 0) {
    return { ...result, formatError: "No valid rows found in the file." };
  }

  // 1. Collect all vendor names and EMDN codes for batch resolution
  const vendorNames = rows
    .map(r => r.vendor_name)
    .filter((n): n is string => !!n);
  const emdnCodes = rows
    .map(r => r.emdn_code)
    .filter((c): c is string => !!c);

  const [vendorMap, emdnMap] = await Promise.all([
    resolveVendors(vendorNames),
    lookupEMDNCodes(emdnCodes),
  ]);

  // 2. Process rows in batches
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    for (let j = 0; j < batch.length; j++) {
      const rowIndex = i + j + 2; // +2 for 1-based + header row
      const row = batch[j];

      // Validate required fields
      if (!row.name || row.name.trim().length === 0) {
        result.errors.push({ row: rowIndex, message: "Product Name is required" });
        result.skipped++;
        continue;
      }
      if (!row.sku || row.sku.trim().length === 0) {
        result.errors.push({ row: rowIndex, message: "SKU is required" });
        result.skipped++;
        continue;
      }
      if (row.name.length > 255) {
        result.errors.push({ row: rowIndex, message: "Product Name too long (max 255)" });
        result.skipped++;
        continue;
      }
      if (row.sku.length > 50) {
        result.errors.push({ row: rowIndex, message: "SKU too long (max 50)" });
        result.skipped++;
        continue;
      }

      // Validate mdr_class if provided
      const validMdrClasses = ['I', 'IIa', 'IIb', 'III'];
      if (row.mdr_class && !validMdrClasses.includes(row.mdr_class)) {
        result.errors.push({ row: rowIndex, message: `Invalid MDR Class: ${row.mdr_class}` });
        result.skipped++;
        continue;
      }

      // Resolve vendor
      const vendorId = row.vendor_name
        ? vendorMap.get(row.vendor_name.toLowerCase()) || null
        : null;

      // Resolve EMDN category
      const emdnCategoryId = row.emdn_code
        ? emdnMap.get(row.emdn_code) || null
        : null;

      const mfrName = row.manufacturer_name?.trim() || null;
      const mfrSku = row.manufacturer_sku?.trim() || null;

      // Check for existing product by (manufacturer_name, manufacturer_sku) or by SKU
      let existingProductId: string | null = null;

      if (mfrName && mfrSku) {
        const { data: existing } = await supabase
          .from("products")
          .select("id")
          .eq("manufacturer_name", mfrName)
          .eq("manufacturer_sku", mfrSku)
          .maybeSingle();
        existingProductId = existing?.id ?? null;
      }

      if (!existingProductId) {
        // Fallback: check by SKU
        const { data: existing } = await supabase
          .from("products")
          .select("id")
          .eq("sku", row.sku.trim())
          .maybeSingle();
        existingProductId = existing?.id ?? null;
      }

      if (existingProductId) {
        // Duplicate found — but if vendor data present, add offering
        if (vendorId) {
          const { data: existingOffering } = await supabase
            .from("product_offerings")
            .select("id")
            .eq("product_id", existingProductId)
            .eq("vendor_id", vendorId)
            .maybeSingle();

          if (!existingOffering) {
            await supabase
              .from("product_offerings")
              .insert({
                product_id: existingProductId,
                vendor_id: vendorId,
                vendor_price: row.price ?? null,
                currency: 'EUR',
                is_primary: false,
              });
          }
        }
        result.duplicates.push({
          row: rowIndex,
          name: row.name.trim(),
          sku: row.sku.trim(),
        });
        result.skipped++;
        continue;
      }

      // Insert new product (without price/vendor_id — those go to offerings)
      const productData = {
        name: row.name.trim(),
        sku: row.sku.trim(),
        description: row.description?.trim() || null,
        emdn_category_id: emdnCategoryId,
        manufacturer_name: mfrName,
        manufacturer_sku: mfrSku,
        ce_marked: row.ce_marked ?? false,
        mdr_class: row.mdr_class || null,
        udi_di: row.udi_di?.trim() || null,
      };

      const { data: created, error } = await supabase
        .from("products")
        .insert(productData)
        .select("id")
        .single();

      if (error) {
        result.errors.push({ row: rowIndex, message: error.message });
        result.skipped++;
      } else if (created) {
        result.imported++;

        // Create offering if vendor data available
        if (vendorId) {
          await supabase
            .from("product_offerings")
            .insert({
              product_id: created.id,
              vendor_id: vendorId,
              vendor_price: row.price ?? null,
              currency: 'EUR',
              is_primary: true,
            });
        }
      }
    }
  }

  // Revalidate cache
  revalidatePath("/");
  revalidateTag("categories", "default");

  return result;
}
