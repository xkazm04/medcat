/**
 * EMDN Enrichment Script (Local - No AI Required)
 *
 * Enriches CSV with EMDN codes using keyword matching.
 * Specifically designed for orthopedic implants (hip & knee prostheses).
 *
 * Usage: npx tsx scripts/enrich-csv-emdn-local.ts [input.csv] [output.csv]
 *
 * Defaults:
 *   input:  docs/BornDigital DATA(SVK).csv
 *   output: docs/BornDigital DATA(SVK)-enriched.csv
 */

import * as fs from "fs";
import * as path from "path";
import * as Papa from "papaparse";

// Input/output paths
const DEFAULT_INPUT = "docs/BornDigital DATA(SVK).csv";
const DEFAULT_OUTPUT = "docs/BornDigital DATA(SVK)-enriched.csv";

/**
 * EMDN Classification Rules
 * Based on EMDN V2_EN.xlsx orthopedic categories
 */
interface ClassificationRule {
  code: string;
  name: string;
  keywords: string[];
  excludeKeywords?: string[];
  priority: number; // Higher = more specific, checked first
}

const CLASSIFICATION_RULES: ClassificationRule[] = [
  // ============ HIP PROSTHESES (P0908) ============

  // Acetabular inserts/liners - most specific first
  {
    code: "P0908030401",
    name: "HIP PROSTHESES POLYETHYLENE ACETABULAR INSERTS",
    keywords: ["hxpe", "liner", "polyethylene", "xlpe", "insert", "longevity", "g7 longevity", "marathon"],
    excludeKeywords: ["tibial", "knee"],
    priority: 100,
  },
  {
    code: "P0908030402",
    name: "HIP PROSTHESES CERAMIC ACETABULAR INSERTS",
    keywords: ["ceramic liner", "biolox liner", "ceramic insert"],
    excludeKeywords: ["tibial", "knee"],
    priority: 100,
  },
  {
    code: "P09080304",
    name: "HIP PROSTHESES ACETABULAR INSERTS",
    keywords: ["hip liner", "acetabular insert", "vlozka"],
    excludeKeywords: ["tibial", "knee"],
    priority: 90,
  },

  // Double-mobility acetabular cups
  {
    code: "P0908030502",
    name: "DOUBLE-MOBILITY ACETABULAR COMPONENTS INSERTS",
    keywords: ["dual mobility", "double mobility", "dual-mobility"],
    priority: 95,
  },

  // Acetabular cups
  {
    code: "P0908030102",
    name: "PRIMARY IMPLANT UNCEMENTED ACETABULAR CUPS",
    keywords: ["jamka", "acetabul", "cup", "allofit", "pracetabulum", "necem", "g7 shell", "g7 acetab", "trident", "pinnacle"],
    excludeKeywords: ["cemented", "cement", "tibial", "knee"],
    priority: 85,
  },
  {
    code: "P0908030101",
    name: "PRIMARY IMPLANT CEMENTED ACETABULAR CUPS",
    keywords: ["jamka", "acetabul", "cup", "cement"],
    excludeKeywords: ["uncemented", "necem", "tibial", "knee"],
    priority: 84,
  },
  {
    code: "P09080301",
    name: "PRIMARY IMPLANT ACETABULAR CUPS",
    keywords: ["jamka", "acetabul", "cup", "pracetabulum"],
    excludeKeywords: ["tibial", "knee"],
    priority: 80,
  },

  // Femoral heads
  {
    code: "P090804050201",
    name: "CERAMIC FEMORAL HEADS, TOTAL HIP REPLACEMENT",
    keywords: ["biolox", "ceramic head", "delta head", "delta ceramic", "ceramic fem hd", "ceramic fem head"],
    priority: 100,
  },
  {
    code: "P090804050202",
    name: "METAL FEMORAL HEADS, TOTAL HIP REPLACEMENT",
    keywords: ["cocr head", "metal head", "cobalt head"],
    priority: 100,
  },
  {
    code: "P09080405",
    name: "FEMORAL HEADS",
    keywords: ["head", "hlavica", "femoral head"],
    excludeKeywords: ["tibial", "knee", "humeral"],
    priority: 75,
  },

  // Femoral stems
  {
    code: "P090804010201",
    name: "UNCEMENTED FEMORAL STEMS FOR PRIMARY IMPLANT, WITH FIXED NECK, STRAIGHT",
    keywords: ["taperloc", "avenir", "optimys", "corail", "accolade"],
    excludeKeywords: ["cement", "revision"],
    priority: 95,
  },
  {
    code: "P0908040102",
    name: "PRIMARY IMPLANT UNCEMENTED FEMORAL STEMS",
    keywords: ["stem", "driek", "femoral stem", "necem"],
    excludeKeywords: ["cement", "revision", "tibial", "knee"],
    priority: 85,
  },
  {
    code: "P0908040101",
    name: "PRIMARY IMPLANT CEMENTED FEMORAL STEMS",
    keywords: ["stem", "driek", "femoral stem", "cement"],
    excludeKeywords: ["uncem", "necem", "revision", "tibial", "knee"],
    priority: 84,
  },
  {
    code: "P09080401",
    name: "PRIMARY IMPLANT FEMORAL STEMS",
    keywords: ["stem", "driek"],
    excludeKeywords: ["tibial", "knee", "revision"],
    priority: 70,
  },

  // Hip accessories
  {
    code: "P09088007",
    name: "HIP PROSTHESES FIXING SCREWS",
    keywords: ["hip screw", "acetabular screw"],
    priority: 90,
  },
  {
    code: "P09088001",
    name: "ACETABULAR RINGS",
    keywords: ["acetabular ring", "reinforcement ring"],
    priority: 90,
  },
  {
    code: "P090880",
    name: "HIP PROSTHESES - ACCESSORIES",
    keywords: ["hip access", "centralizer", "cement restrict"],
    priority: 60,
  },

  // Generic hip prosthesis
  {
    code: "P0908",
    name: "HIP PROSTHESES",
    keywords: ["hip", "acetab", "femur"],
    excludeKeywords: ["knee", "tibial"],
    priority: 50,
  },

  // ============ KNEE PROSTHESES (P0909) ============

  // Knee femoral components
  {
    code: "P0909030101",
    name: "BICOMPARTMENTAL PRIMARY IMPLANT CEMENTED FEMORAL COMPONENTS",
    keywords: ["femoral", "femoralna", "knee femor", "physica", "persona"],
    excludeKeywords: ["tibial", "hip", "uncement"],
    priority: 85,
  },
  {
    code: "P0909030102",
    name: "BICOMPARTMENTAL PRIMARY IMPLANT UNCEMENTED FEMORAL COMPONENTS",
    keywords: ["femoral", "femoralna", "knee femor", "physica", "persona", "uncement"],
    excludeKeywords: ["tibial", "hip"],
    priority: 86,
  },
  {
    code: "P09090301",
    name: "BICOMPARTMENTAL PRIMARY IMPLANT FEMORAL COMPONENTS",
    keywords: ["femoral", "femoralna", "lps-flex", "lps flex", "persona", "physica", "fem ps", "fem cr", "psn fem", "nrg fem"],
    excludeKeywords: ["tibial", "hip", "head", "stem"],
    priority: 80,
  },

  // Knee tibial components
  {
    code: "P090903020201",
    name: "BICOMPARTMENTAL PRIMARY IMPLANT MOBILE BEARING TIBIAL INSERTS",
    keywords: ["mdb ve asf", "mbd ve asf", "mobile bearing", "psn mdb", "psn mbd"],
    excludeKeywords: ["hip"],
    priority: 95,
  },
  {
    code: "P0909030202",
    name: "BICOMPARTMENTAL PRIMARY IMPLANT FIXED BEARING TIBIAL INSERTS",
    keywords: ["tibial insert", "tibia insert", "knee insert", "tibial vlozka", "psn asf ps", "asf ps"],
    excludeKeywords: ["hip", "mobile"],
    priority: 90,
  },
  {
    code: "P0909030201",
    name: "BICOMPARTMENTAL PRIMARY IMPLANT TIBIAL PLATES",
    keywords: ["tibial plate", "tibia plate", "tibial tray", "baseplate"],
    excludeKeywords: ["hip"],
    priority: 90,
  },
  {
    code: "P09090302",
    name: "BICOMPARTMENTAL PRIMARY IMPLANT TIBIAL COMPONENTS",
    keywords: ["tibial", "tibia"],
    excludeKeywords: ["hip"],
    priority: 75,
  },

  // Patellar components
  {
    code: "P09090702",
    name: "PATELLAR COMPONENTS",
    keywords: ["patell", "patella"],
    priority: 85,
  },

  // Knee accessories
  {
    code: "P0909800601",
    name: "KNEE PROSTHESES FEMORAL STEMS",
    keywords: ["knee stem", "femoral stem knee"],
    priority: 80,
  },
  {
    code: "P0909800602",
    name: "KNEE PROSTHESES TIBIAL STEMS",
    keywords: ["tibial stem", "tib stm", "psn tib", "tibia stem", "tib np stm"],
    priority: 80,
  },
  {
    code: "P09098001",
    name: "KNEE PROSTHESES AUGMENTS",
    keywords: ["knee augment", "tibial augment", "femoral augment"],
    priority: 85,
  },
  {
    code: "P090980",
    name: "KNEE PROSTHESES - ACCESSORIES",
    keywords: ["knee access"],
    priority: 60,
  },

  // Generic knee prosthesis
  {
    code: "P0909",
    name: "KNEE PROSTHESES",
    keywords: ["knee", "tibial", "tibia", "persona", "physica", "lps"],
    excludeKeywords: ["hip", "acetab", "femoral head"],
    priority: 50,
  },

  // ============ SHOULDER (P0901) ============
  {
    code: "P0901",
    name: "SHOULDER PROSTHESES",
    keywords: ["shoulder", "humeral", "glenoid"],
    priority: 50,
  },

  // ============ SPINE (P0907) ============
  {
    code: "P09070101",
    name: "SPINAL CAGES",
    keywords: ["cage", "spinal", "interbody"],
    priority: 80,
  },
  {
    code: "P0907",
    name: "SPINE STABILISATION PROSTHESES AND SYSTEMS",
    keywords: ["spine", "spinal", "vertebral", "disc"],
    priority: 50,
  },

  // ============ OSTEOSYNTHESIS (P0912) ============
  {
    code: "P09120501",
    name: "OSTEOSYNTHESIS COMPRESSION PLATES",
    keywords: ["compression plate", "locking plate"],
    priority: 80,
  },
  {
    code: "P091205",
    name: "BONE FIXATION PLATES",
    keywords: ["plate", "bone plate", "fixation plate"],
    excludeKeywords: ["tibial", "baseplate"],
    priority: 60,
  },
  {
    code: "P09120601",
    name: "CORTICAL SCREWS",
    keywords: ["cortical screw"],
    priority: 80,
  },
  {
    code: "P091206",
    name: "BONE FIXATION SCREWS",
    keywords: ["screw", "bone screw"],
    excludeKeywords: ["acetabular", "hip"],
    priority: 55,
  },
  {
    code: "P09120201",
    name: "INTRAMEDULLARY NAILS",
    keywords: ["nail", "intramedullary", "im nail"],
    priority: 70,
  },
  {
    code: "P0912",
    name: "OSTEOSYNTHESIS DEVICES",
    keywords: ["osteosynthesis", "fixation"],
    priority: 40,
  },

  // ============ CEMENT (P0990) ============
  {
    code: "P099001",
    name: "ORTHOPAEDIC PROSTHESES CEMENTS AND ACCESSORIES",
    keywords: ["cement", "pmma", "bone cement"],
    excludeKeywords: ["uncement", "necem", "cementless"],
    priority: 70,
  },
];

/**
 * Classify a product name into EMDN code
 */
function classifyProduct(productName: string): { code: string; name: string; confidence: string } | null {
  const normalized = productName.toLowerCase();

  // Sort rules by priority (highest first)
  const sortedRules = [...CLASSIFICATION_RULES].sort((a, b) => b.priority - a.priority);

  for (const rule of sortedRules) {
    // Check if any keyword matches
    const hasMatch = rule.keywords.some((kw) => normalized.includes(kw.toLowerCase()));

    if (!hasMatch) continue;

    // Check exclusions
    if (rule.excludeKeywords) {
      const hasExclusion = rule.excludeKeywords.some((kw) => normalized.includes(kw.toLowerCase()));
      if (hasExclusion) continue;
    }

    // Determine confidence based on priority
    let confidence: string;
    if (rule.priority >= 90) {
      confidence = "high";
    } else if (rule.priority >= 70) {
      confidence = "medium";
    } else {
      confidence = "low";
    }

    return { code: rule.code, name: rule.name, confidence };
  }

  return null;
}

/**
 * Main enrichment function
 */
async function enrichCSV(inputPath: string, outputPath: string) {
  console.log("=== EMDN Enrichment Script (Local) ===\n");
  console.log(`Input:  ${inputPath}`);
  console.log(`Output: ${outputPath}\n`);

  // Load input CSV
  console.log("Loading CSV...");
  const csvContent = fs.readFileSync(path.resolve(process.cwd(), inputPath), "utf-8");
  const parseResult = Papa.parse<Record<string, string>>(csvContent, { header: true });

  if (parseResult.errors.length > 0) {
    console.warn("  CSV parse warnings:", parseResult.errors.slice(0, 3));
  }

  const rows = parseResult.data;
  console.log(`  Loaded ${rows.length} rows\n`);

  // Find the product name column
  const nameColumn = Object.keys(rows[0] || {}).find((k) =>
    k.toLowerCase().includes("material name")
  );

  if (!nameColumn) {
    console.error("ERROR: Could not find 'Material Name' column in CSV");
    process.exit(1);
  }

  console.log(`  Using column: "${nameColumn}"\n`);

  // Classify each row
  console.log("Classifying products...\n");

  let classified = 0;
  let unclassified = 0;
  const codeCounts: Record<string, number> = {};
  const confidenceCounts = { high: 0, medium: 0, low: 0 };

  const enrichedRows = rows.map((row) => {
    const name = row[nameColumn]?.trim();
    if (!name) {
      unclassified++;
      return { ...row, emdn_code: "UNCLASSIFIED", emdn_name: "Unclassified - requires manual review", emdn_confidence: "" };
    }

    const classification = classifyProduct(name);

    if (classification) {
      classified++;
      codeCounts[classification.code] = (codeCounts[classification.code] || 0) + 1;
      confidenceCounts[classification.confidence as keyof typeof confidenceCounts]++;

      return {
        ...row,
        emdn_code: classification.code,
        emdn_name: classification.name,
        emdn_confidence: classification.confidence,
      };
    } else {
      unclassified++;
      return { ...row, emdn_code: "UNCLASSIFIED", emdn_name: "Unclassified - requires manual review", emdn_confidence: "" };
    }
  });

  // Summary
  console.log("=== Classification Summary ===\n");
  console.log(`  Total rows:    ${rows.length}`);
  console.log(`  Classified:    ${classified} (${Math.round((classified / rows.length) * 100)}%)`);
  console.log(`  Unclassified:  ${unclassified}`);
  console.log(`\n  Confidence breakdown:`);
  console.log(`    High:   ${confidenceCounts.high}`);
  console.log(`    Medium: ${confidenceCounts.medium}`);
  console.log(`    Low:    ${confidenceCounts.low}`);

  // Top codes
  const topCodes = Object.entries(codeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  console.log(`\n  Top EMDN codes:`);
  topCodes.forEach(([code, count]) => {
    const rule = CLASSIFICATION_RULES.find((r) => r.code === code);
    console.log(`    ${code}: ${count} (${rule?.name.substring(0, 40)}...)`);
  });

  // Write output CSV
  const outputCSV = Papa.unparse(enrichedRows);
  fs.writeFileSync(path.resolve(process.cwd(), outputPath), outputCSV, "utf-8");

  console.log(`\n=== Output ===\n`);
  console.log(`  Written to: ${outputPath}`);
  console.log(`  New columns: emdn_code, emdn_name, emdn_confidence`);
  console.log("\nDone!");

  // Show some unclassified examples
  const unclassifiedExamples = enrichedRows
    .filter((r) => r.emdn_code === "UNCLASSIFIED" && (r as Record<string, string>)[nameColumn])
    .slice(0, 5)
    .map((r) => (r as Record<string, string>)[nameColumn]);

  if (unclassifiedExamples.length > 0) {
    console.log("\n=== Unclassified Examples (may need manual review) ===\n");
    unclassifiedExamples.forEach((name) => console.log(`  - ${name}`));
  }
}

// Run
const inputPath = process.argv[2] || DEFAULT_INPUT;
const outputPath = process.argv[3] || DEFAULT_OUTPUT;

enrichCSV(inputPath, outputPath).catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
