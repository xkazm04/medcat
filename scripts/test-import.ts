/**
 * Test Import Script
 *
 * Tests the bulk import functionality with the enriched CSV data.
 * Uses Supabase client directly to simulate the import action.
 *
 * Usage: npx tsx scripts/test-import.ts
 *
 * Requires:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (for admin access)
 */

import * as fs from "fs";
import * as path from "path";
import * as Papa from "papaparse";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("ERROR: Missing Supabase credentials");
  console.error("Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Configuration
const ENRICHED_CSV = "docs/BornDigital DATA(SVK)-enriched.csv";
const TEST_LIMIT = 1000; // Only test with first N rows
const TEST_VENDOR_NAME = "Test Import Vendor";

interface ImportRow {
  name: string;
  sku: string;
  description?: string | null;
  price?: number | null;
  vendor_id: string;
  manufacturer_name?: string | null;
  manufacturer_sku?: string | null;
  emdn_category_id?: string | null;
}

async function main() {
  console.log("=== Import Test Script ===\n");

  // Load enriched CSV
  console.log(`Loading CSV: ${ENRICHED_CSV}`);
  const csvPath = path.resolve(process.cwd(), ENRICHED_CSV);

  if (!fs.existsSync(csvPath)) {
    console.error(`ERROR: File not found: ${csvPath}`);
    console.error("Run 'npm run enrich:emdn:local' first to create the enriched CSV");
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const parseResult = Papa.parse<Record<string, string>>(csvContent, { header: true });

  console.log(`  Loaded ${parseResult.data.length} rows\n`);

  // Find column names (handle multiline headers)
  const columns = Object.keys(parseResult.data[0] || {});
  const nameCol = columns.find((c) => c.toLowerCase().includes("material name")) || "";
  const skuCol = columns.find((c) => c.toLowerCase().includes("supplier material")) || "";
  const mfrCol = columns.find((c) => c.toLowerCase().includes("manufacturer")) || "";
  const mfrSkuCol = columns.find((c) => c.toLowerCase().includes("manufactorer material")) || "";
  const emdnCol = "emdn_code";

  console.log("Column mapping:");
  console.log(`  Name: "${nameCol}"`);
  console.log(`  SKU: "${skuCol}"`);
  console.log(`  Manufacturer: "${mfrCol}"`);
  console.log(`  Mfr SKU: "${mfrSkuCol}"`);
  console.log(`  EMDN: "${emdnCol}"\n`);

  // Get or create test vendor
  console.log("Setting up test vendor...");
  let vendorId: string;

  const { data: existingVendor } = await supabase
    .from("vendors")
    .select("id")
    .eq("name", TEST_VENDOR_NAME)
    .single();

  if (existingVendor) {
    vendorId = existingVendor.id;
    console.log(`  Using existing vendor: ${vendorId}\n`);
  } else {
    const { data: newVendor, error } = await supabase
      .from("vendors")
      .insert({ name: TEST_VENDOR_NAME, code: "TEST" })
      .select("id")
      .single();

    if (error || !newVendor) {
      console.error("ERROR: Failed to create test vendor:", error);
      process.exit(1);
    }

    vendorId = newVendor.id;
    console.log(`  Created test vendor: ${vendorId}\n`);
  }

  // Build EMDN code -> category ID lookup
  console.log("Building EMDN lookup...");
  const emdnCodes = new Set<string>();
  parseResult.data.slice(0, TEST_LIMIT).forEach((row) => {
    const code = row[emdnCol]?.trim();
    if (code && code !== "UNCLASSIFIED") {
      emdnCodes.add(code);
    }
  });

  const { data: emdnCategories } = await supabase
    .from("emdn_categories")
    .select("id, code")
    .in("code", Array.from(emdnCodes));

  const emdnLookup = new Map<string, string>();
  (emdnCategories || []).forEach((cat) => {
    emdnLookup.set(cat.code, cat.id);
  });

  console.log(`  Found ${emdnLookup.size} EMDN codes in database\n`);

  // Prepare import rows
  console.log(`Preparing ${TEST_LIMIT} test rows...\n`);

  const importRows: ImportRow[] = [];
  let classified = 0;
  let unclassified = 0;

  for (let i = 0; i < Math.min(TEST_LIMIT, parseResult.data.length); i++) {
    const row = parseResult.data[i];
    const name = row[nameCol]?.trim();
    const sku = row[skuCol]?.trim();

    if (!name || !sku) continue;

    const emdnCode = row[emdnCol]?.trim();
    let categoryId: string | null = null;

    if (emdnCode && emdnCode !== "UNCLASSIFIED") {
      categoryId = emdnLookup.get(emdnCode) || null;
      if (categoryId) {
        classified++;
      } else {
        unclassified++;
      }
    } else {
      unclassified++;
    }

    importRows.push({
      name,
      sku,
      vendor_id: vendorId,
      manufacturer_name: row[mfrCol]?.trim() || null,
      manufacturer_sku: row[mfrSkuCol]?.trim() || null,
      emdn_category_id: categoryId,
    });
  }

  console.log(`  Prepared ${importRows.length} rows`);
  console.log(`  Classified: ${classified}`);
  console.log(`  Unclassified: ${unclassified}\n`);

  // Check for existing products
  console.log("Checking for existing products...");
  const skus = importRows.map((r) => r.sku);
  const { data: existing } = await supabase
    .from("products")
    .select("id, sku")
    .eq("vendor_id", vendorId)
    .in("sku", skus);

  const existingMap = new Map<string, string>();
  (existing || []).forEach((p) => existingMap.set(p.sku, p.id));
  console.log(`  Found ${existingMap.size} existing products\n`);

  // Perform import
  console.log("Performing import...\n");

  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const row of importRows) {
    const existingId = existingMap.get(row.sku);

    if (existingId) {
      // Update
      const { error } = await supabase
        .from("products")
        .update(row)
        .eq("id", existingId);

      if (error) {
        errors++;
        console.error(`  Error updating ${row.sku}:`, error.message);
      } else {
        updated++;
      }
    } else {
      // Insert
      const { error } = await supabase.from("products").insert(row);

      if (error) {
        errors++;
        console.error(`  Error inserting ${row.sku}:`, error.message);
      } else {
        created++;
      }
    }
  }

  console.log("=== Import Results ===\n");
  console.log(`  Created: ${created}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Total: ${importRows.length}\n`);

  // Verify a sample product
  console.log("Verifying sample product...\n");
  const { data: sample } = await supabase
    .from("products")
    .select("id, name, sku, emdn_category_id, manufacturer_name")
    .eq("vendor_id", vendorId)
    .not("emdn_category_id", "is", null)
    .limit(1)
    .single();

  if (sample) {
    // Get EMDN category name
    const { data: category } = await supabase
      .from("emdn_categories")
      .select("code, name")
      .eq("id", sample.emdn_category_id)
      .single();

    console.log("  Sample product:");
    console.log(`    Name: ${sample.name?.substring(0, 50)}`);
    console.log(`    SKU: ${sample.sku}`);
    console.log(`    Manufacturer: ${sample.manufacturer_name}`);
    console.log(`    EMDN Code: ${category?.code}`);
    console.log(`    EMDN Name: ${category?.name?.substring(0, 50)}`);
  } else {
    console.log("  No sample product with EMDN category found");
  }

  console.log("\nDone!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
