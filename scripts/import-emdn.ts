/**
 * EMDN Import Script
 *
 * Parses EMDN V2_EN.xlsx and imports orthopedic-relevant categories
 * into the Supabase emdn_categories table.
 *
 * Usage: npm run import:emdn
 *
 * Requires:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (bypasses RLS for inserts)
 */

import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

// Configuration
const EXCEL_FILE = "docs/EMDN V2_EN.xlsx";

// Orthopedic-relevant category prefixes
// P09: Orthopedic prostheses, osteosynthesis devices
// P10: Spinal devices (if exists)
// Also include parent P for hierarchy
const ORTHOPEDIC_PREFIXES = ["P09", "P10"];

interface EMDNRow {
  categoryCode: string;
  categoryDescription: string;
  code: string;
  term: string;
  level: number;
  isTerminal: boolean;
}

interface CategoryToInsert {
  code: string;
  name: string;
  parent_id: string | null;
  depth: number;
  path: string;
}

function parseExcelRow(row: (string | number)[]): EMDNRow | null {
  if (!row || row.length < 6) return null;

  const code = row[2]?.toString()?.trim();
  const term = row[3]?.toString()?.trim();
  const level = Number(row[4]);
  const terminal = row[5]?.toString()?.trim()?.toUpperCase();

  if (!code || !term || isNaN(level)) return null;

  return {
    categoryCode: row[0]?.toString()?.trim() || "",
    categoryDescription: row[1]?.toString()?.trim() || "",
    code,
    term,
    level,
    isTerminal: terminal === "YES",
  };
}

function isOrthopedicRelevant(code: string): boolean {
  // Include root P category for hierarchy
  if (code === "P") return true;

  // Include all orthopedic prefixes
  return ORTHOPEDIC_PREFIXES.some(prefix => code.startsWith(prefix));
}

function findParentCode(code: string, allCodes: Set<string>): string | null {
  // Try progressively shorter codes to find parent
  for (let len = code.length - 1; len >= 1; len--) {
    // Try removing 2 characters at a time (common EMDN pattern)
    const candidate = code.substring(0, len);
    if (allCodes.has(candidate)) {
      return candidate;
    }
  }
  return null;
}

function buildPath(code: string, parentPaths: Map<string, string>): string {
  // Path is the full path from root including this code
  const parentCode = findParentCode(code, new Set(parentPaths.keys()));
  if (parentCode && parentPaths.has(parentCode)) {
    return `${parentPaths.get(parentCode)}.${code}`;
  }
  return code;
}

async function main() {
  console.log("=== EMDN Import Script ===\n");

  const isDryRun = process.argv.includes("--dry-run");
  if (isDryRun) {
    console.log("*** DRY RUN MODE - No database writes ***\n");
  }

  // Validate environment variables (skip in dry-run)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!isDryRun && (!supabaseUrl || !supabaseKey)) {
    console.error("Error: Missing environment variables");
    console.error("Required:");
    console.error("  - NEXT_PUBLIC_SUPABASE_URL");
    console.error("  - SUPABASE_SERVICE_ROLE_KEY");
    console.error("\nHint: Copy from Supabase Dashboard > Settings > API");
    console.error("\nTip: Use --dry-run to test parsing without database connection");
    process.exit(1);
  }

  // Create Supabase client with service role key (bypasses RLS)
  const supabase = isDryRun
    ? null
    : createClient(supabaseUrl!, supabaseKey!, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

  // Read Excel file
  const excelPath = path.join(process.cwd(), EXCEL_FILE);
  console.log(`Reading: ${excelPath}`);

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.readFile(excelPath);
  } catch (error) {
    console.error(`Error: Could not read Excel file: ${error}`);
    process.exit(1);
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1 });

  console.log(`Total rows in Excel: ${rawData.length}`);

  // Parse all rows (skip header rows)
  const allCategories: EMDNRow[] = [];
  for (let i = 2; i < rawData.length; i++) {
    const parsed = parseExcelRow(rawData[i]);
    if (parsed) {
      allCategories.push(parsed);
    }
  }
  console.log(`Parsed categories: ${allCategories.length}`);

  // Filter to orthopedic-relevant categories
  const orthopedicCategories = allCategories.filter(cat => isOrthopedicRelevant(cat.code));
  console.log(`Orthopedic-relevant categories: ${orthopedicCategories.length}`);

  // Build lookup sets for parent finding
  const allOrthopedicCodes = new Set(orthopedicCategories.map(c => c.code));

  // Sort by code length (shorter = parent, insert first)
  orthopedicCategories.sort((a, b) => a.code.length - b.code.length);

  // Build categories with parent references
  const codeToId = new Map<string, string>();
  const pathMap = new Map<string, string>();

  let insertedCount = 0;
  let skippedCount = 0;

  if (isDryRun) {
    console.log("\n=== Dry Run Summary ===");
    console.log(`Would insert ${orthopedicCategories.length} categories`);

    // Show sample hierarchy for dry run
    console.log("\nSample categories to insert:");
    orthopedicCategories.slice(0, 15).forEach(cat => {
      const parentCode = findParentCode(cat.code, allOrthopedicCodes);
      const parentPath = parentCode ? pathMap.get(parentCode) : null;
      const catPath = parentPath ? `${parentPath}.${cat.code}` : cat.code;
      pathMap.set(cat.code, catPath);

      const indent = "  ".repeat(cat.level - 1);
      console.log(`${indent}${cat.code}: ${cat.term.substring(0, 50)}`);
    });
    console.log("  ...");
    return;
  }

  console.log("\nInserting categories...");

  for (const cat of orthopedicCategories) {
    // Find parent
    const parentCode = findParentCode(cat.code, allOrthopedicCodes);
    const parentId = parentCode ? (codeToId.get(parentCode) ?? null) : null;

    // Build path
    const parentPath = parentCode ? pathMap.get(parentCode) : null;
    const catPath = parentPath ? `${parentPath}.${cat.code}` : cat.code;

    const categoryData: CategoryToInsert = {
      code: cat.code,
      name: cat.term,
      parent_id: parentId,
      depth: cat.level - 1, // EMDN levels start at 1, our depth starts at 0
      path: catPath,
    };

    // Insert (upsert) into database
    const { data, error } = await supabase!
      .from("emdn_categories")
      .upsert(categoryData, { onConflict: "code" })
      .select("id")
      .single();

    if (error) {
      console.error(`Error inserting ${cat.code}: ${error.message}`);
      skippedCount++;
      continue;
    }

    // Store ID and path for children
    codeToId.set(cat.code, data.id);
    pathMap.set(cat.code, catPath);
    insertedCount++;

    // Progress indicator
    if (insertedCount % 50 === 0) {
      console.log(`  Inserted ${insertedCount} categories...`);
    }
  }

  console.log("\n=== Import Complete ===");
  console.log(`Inserted: ${insertedCount}`);
  console.log(`Skipped: ${skippedCount}`);

  // Verify by querying the database
  const { count, error: countError } = await supabase!
    .from("emdn_categories")
    .select("*", { count: "exact", head: true });

  if (!countError) {
    console.log(`\nTotal categories in database: ${count}`);
  }

  // Show sample hierarchy
  console.log("\nSample hierarchy (P09 root):");
  const { data: sample } = await supabase!
    .from("emdn_categories")
    .select("code, name, depth")
    .like("code", "P09%")
    .order("code")
    .limit(10);

  if (sample) {
    sample.forEach(cat => {
      const indent = "  ".repeat(cat.depth);
      console.log(`${indent}${cat.code}: ${cat.name.substring(0, 50)}`);
    });
  }
}

main().catch(console.error);
