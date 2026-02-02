/**
 * Seed Data Script
 *
 * Populates the database with sample vendors, materials, and products
 * for development and testing.
 *
 * Usage: npm run seed
 *
 * Requires:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (bypasses RLS for inserts)
 * - EMDN categories must be imported first (run import:emdn)
 */

import { createClient } from "@supabase/supabase-js";

// Sample Vendors - Major orthopedic device manufacturers
const VENDORS = [
  {
    name: "DePuy Synthes",
    code: "DPS",
    website: "https://www.depuysynthes.com",
  },
  {
    name: "Stryker Corporation",
    code: "STR",
    website: "https://www.stryker.com",
  },
  {
    name: "Zimmer Biomet",
    code: "ZBM",
    website: "https://www.zimmerbiomet.com",
  },
  {
    name: "Smith & Nephew",
    code: "SNW",
    website: "https://www.smith-nephew.com",
  },
];

// Sample Materials - Common orthopedic materials
const MATERIALS = [
  { name: "Titanium Alloy (Ti-6Al-4V)", code: "TI6AL4V" },
  { name: "Stainless Steel (316L)", code: "SS316L" },
  { name: "Cobalt Chrome (CoCr)", code: "COCR" },
  { name: "PEEK (Polyether Ether Ketone)", code: "PEEK" },
  { name: "UHMWPE (Ultra-High Molecular Weight Polyethylene)", code: "UHMWPE" },
];

// Product templates with category codes and price ranges
// These will be created for multiple vendors with varying prices
interface ProductTemplate {
  baseName: string;
  skuSuffix: string;
  description: string;
  categoryCode: string; // EMDN code to match
  materialCode: string; // Material code to match
  basePrice: number;
  priceVariance: number; // +/- percentage
}

const PRODUCT_TEMPLATES: ProductTemplate[] = [
  // Bone Screws (P0912 - Osteosynthesis devices)
  {
    baseName: "3.5mm Cortical Screw, Self-Tapping, 30mm",
    skuSuffix: "CS-3530",
    description: "Self-tapping cortical bone screw for small fragment fixation. Fully threaded design.",
    categoryCode: "P0912",
    materialCode: "TI6AL4V",
    basePrice: 85,
    priceVariance: 15,
  },
  {
    baseName: "4.5mm Cortical Screw, Self-Tapping, 40mm",
    skuSuffix: "CS-4540",
    description: "Self-tapping cortical bone screw for large fragment fixation. Fully threaded design.",
    categoryCode: "P0912",
    materialCode: "TI6AL4V",
    basePrice: 95,
    priceVariance: 12,
  },
  {
    baseName: "6.5mm Cancellous Screw, 45mm",
    skuSuffix: "CAN-6545",
    description: "Partially threaded cancellous bone screw for metaphyseal fixation.",
    categoryCode: "P0912",
    materialCode: "SS316L",
    basePrice: 110,
    priceVariance: 18,
  },
  // Bone Plates (P0912 - Osteosynthesis devices)
  {
    baseName: "3.5mm LCP Reconstruction Plate, 8 Holes",
    skuSuffix: "LCP-35-8",
    description: "Locking compression plate for small fragment reconstruction. Titanium alloy construction.",
    categoryCode: "P0912",
    materialCode: "TI6AL4V",
    basePrice: 450,
    priceVariance: 20,
  },
  {
    baseName: "4.5mm LCP Broad Plate, 10 Holes",
    skuSuffix: "LCP-45-10",
    description: "Locking compression plate for large fragment fixation. Low profile design.",
    categoryCode: "P0912",
    materialCode: "TI6AL4V",
    basePrice: 580,
    priceVariance: 15,
  },
  {
    baseName: "Distal Femur Locking Plate, Left",
    skuSuffix: "DFLP-L",
    description: "Anatomically contoured locking plate for distal femur fractures. Left side.",
    categoryCode: "P0912",
    materialCode: "TI6AL4V",
    basePrice: 1250,
    priceVariance: 22,
  },
  // Hip Implants (P0908 - Hip prostheses)
  {
    baseName: "Cemented Femoral Stem, Size 12",
    skuSuffix: "CFS-12",
    description: "Polished cemented femoral stem for primary total hip arthroplasty. Cobalt chrome alloy.",
    categoryCode: "P0908",
    materialCode: "COCR",
    basePrice: 1850,
    priceVariance: 18,
  },
  {
    baseName: "Cementless Femoral Stem, Size 14",
    skuSuffix: "UFS-14",
    description: "Press-fit cementless femoral stem with hydroxyapatite coating. Titanium alloy.",
    categoryCode: "P0908",
    materialCode: "TI6AL4V",
    basePrice: 2200,
    priceVariance: 20,
  },
  {
    baseName: "Acetabular Shell, 54mm",
    skuSuffix: "ACE-54",
    description: "Press-fit acetabular shell with porous coating for bone ingrowth.",
    categoryCode: "P0908",
    materialCode: "TI6AL4V",
    basePrice: 1650,
    priceVariance: 15,
  },
  {
    baseName: "Polyethylene Liner, 54mm/32mm",
    skuSuffix: "PLIN-5432",
    description: "Highly cross-linked polyethylene liner for acetabular shell. 32mm inner diameter.",
    categoryCode: "P0908",
    materialCode: "UHMWPE",
    basePrice: 580,
    priceVariance: 12,
  },
  {
    baseName: "Femoral Head, 32mm, +0 Offset",
    skuSuffix: "FH-32-0",
    description: "Ceramic femoral head for total hip arthroplasty. Neutral neck offset.",
    categoryCode: "P0908",
    materialCode: "COCR",
    basePrice: 420,
    priceVariance: 10,
  },
  // Knee Implants (P0909 - Knee prostheses)
  {
    baseName: "Femoral Component CR, Size D",
    skuSuffix: "KFC-CR-D",
    description: "Cruciate-retaining femoral component for total knee arthroplasty. Cobalt chrome.",
    categoryCode: "P0909",
    materialCode: "COCR",
    basePrice: 2400,
    priceVariance: 18,
  },
  {
    baseName: "Tibial Baseplate, Size 4",
    skuSuffix: "KTB-4",
    description: "Modular tibial baseplate with central stem. Titanium alloy construction.",
    categoryCode: "P0909",
    materialCode: "TI6AL4V",
    basePrice: 1100,
    priceVariance: 15,
  },
  {
    baseName: "Tibial Insert CR, 10mm",
    skuSuffix: "KTI-CR-10",
    description: "Cruciate-retaining polyethylene tibial insert. 10mm thickness.",
    categoryCode: "P0909",
    materialCode: "UHMWPE",
    basePrice: 380,
    priceVariance: 12,
  },
  {
    baseName: "Patellar Component, 32mm",
    skuSuffix: "KPC-32",
    description: "All-polyethylene patellar component for total knee arthroplasty.",
    categoryCode: "P0909",
    materialCode: "UHMWPE",
    basePrice: 220,
    priceVariance: 15,
  },
  // Spinal Implants (P0907 - Spine stabilization)
  {
    baseName: "Pedicle Screw, 6.5mm x 45mm",
    skuSuffix: "PS-6545",
    description: "Polyaxial pedicle screw for posterior spinal fusion. Top-loading design.",
    categoryCode: "P0907",
    materialCode: "TI6AL4V",
    basePrice: 650,
    priceVariance: 22,
  },
  {
    baseName: "PEEK Interbody Cage, 10mm",
    skuSuffix: "CAGE-10",
    description: "PEEK interbody fusion cage with titanium markers. Lordotic design.",
    categoryCode: "P0907",
    materialCode: "PEEK",
    basePrice: 1800,
    priceVariance: 18,
  },
  {
    baseName: "Spinal Rod, 5.5mm x 300mm",
    skuSuffix: "ROD-55-300",
    description: "Pre-contoured spinal rod for posterior instrumentation. Titanium alloy.",
    categoryCode: "P0907",
    materialCode: "TI6AL4V",
    basePrice: 320,
    priceVariance: 15,
  },
  {
    baseName: "Cross Connector",
    skuSuffix: "XCON",
    description: "Cross-link connector for bilateral spinal rod systems.",
    categoryCode: "P0907",
    materialCode: "TI6AL4V",
    basePrice: 280,
    priceVariance: 12,
  },
  // Shoulder Implants (P0901 - Shoulder prostheses)
  {
    baseName: "Humeral Stem, Size 10",
    skuSuffix: "SHS-10",
    description: "Modular humeral stem for shoulder arthroplasty. Press-fit design.",
    categoryCode: "P0901",
    materialCode: "TI6AL4V",
    basePrice: 1950,
    priceVariance: 18,
  },
  {
    baseName: "Glenoid Component, Size M",
    skuSuffix: "SGC-M",
    description: "All-polyethylene glenoid component for anatomic shoulder arthroplasty.",
    categoryCode: "P0901",
    materialCode: "UHMWPE",
    basePrice: 680,
    priceVariance: 15,
  },
];

function calculateVendorPrice(basePrice: number, variance: number, vendorIndex: number): number {
  // Create deterministic but varied pricing per vendor
  const multipliers = [1.0, 0.95, 1.08, 1.02];
  const baseMultiplier = multipliers[vendorIndex % multipliers.length];
  const varianceFactor = 1 + ((vendorIndex * 7) % variance) / 100 - variance / 200;
  const price = basePrice * baseMultiplier * varianceFactor;
  // Round to 2 decimal places
  return Math.round(price * 100) / 100;
}

async function main() {
  console.log("=== Seed Data Script ===\n");

  const isDryRun = process.argv.includes("--dry-run");
  if (isDryRun) {
    console.log("*** DRY RUN MODE - No database writes ***\n");
  }

  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!isDryRun && (!supabaseUrl || !supabaseKey)) {
    console.error("Error: Missing environment variables");
    console.error("Required:");
    console.error("  - NEXT_PUBLIC_SUPABASE_URL");
    console.error("  - SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = isDryRun
    ? null
    : createClient(supabaseUrl!, supabaseKey!, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

  // Track IDs for foreign key references
  const vendorIds = new Map<string, string>();
  const materialIds = new Map<string, string>();
  const categoryIds = new Map<string, string>();

  // --- Insert Vendors ---
  console.log("Inserting vendors...");
  if (isDryRun) {
    VENDORS.forEach(v => console.log(`  Would insert: ${v.name} (${v.code})`));
  } else {
    for (const vendor of VENDORS) {
      const { data, error } = await supabase!
        .from("vendors")
        .upsert(vendor, { onConflict: "code" })
        .select("id")
        .single();

      if (error) {
        console.error(`  Error inserting vendor ${vendor.code}: ${error.message}`);
        continue;
      }
      vendorIds.set(vendor.code, data.id);
      console.log(`  Inserted: ${vendor.name}`);
    }
  }
  console.log(`Vendors: ${isDryRun ? VENDORS.length : vendorIds.size}\n`);

  // --- Insert Materials ---
  console.log("Inserting materials...");
  if (isDryRun) {
    MATERIALS.forEach(m => console.log(`  Would insert: ${m.name}`));
  } else {
    for (const material of MATERIALS) {
      const { data, error } = await supabase!
        .from("materials")
        .upsert(material, { onConflict: "code" })
        .select("id")
        .single();

      if (error) {
        console.error(`  Error inserting material ${material.code}: ${error.message}`);
        continue;
      }
      materialIds.set(material.code, data.id);
      console.log(`  Inserted: ${material.name}`);
    }
  }
  console.log(`Materials: ${isDryRun ? MATERIALS.length : materialIds.size}\n`);

  // --- Fetch EMDN category IDs ---
  console.log("Fetching EMDN category IDs...");
  const neededCategoryCodes = [...new Set(PRODUCT_TEMPLATES.map(p => p.categoryCode))];

  if (!isDryRun) {
    const { data: categories, error } = await supabase!
      .from("emdn_categories")
      .select("id, code")
      .in("code", neededCategoryCodes);

    if (error) {
      console.error("Error fetching categories:", error.message);
      process.exit(1);
    }

    if (!categories || categories.length === 0) {
      console.error("No EMDN categories found. Run 'npm run import:emdn' first.");
      process.exit(1);
    }

    categories.forEach(c => categoryIds.set(c.code, c.id));
    console.log(`Found ${categories.length} categories\n`);
  } else {
    console.log(`Would look up: ${neededCategoryCodes.join(", ")}\n`);
  }

  // --- Insert Products ---
  console.log("Inserting products...");
  let productCount = 0;
  const vendorCodes = VENDORS.map(v => v.code);

  for (const template of PRODUCT_TEMPLATES) {
    // Create product for each vendor (with varying prices)
    for (let i = 0; i < vendorCodes.length; i++) {
      const vendorCode = vendorCodes[i];
      const sku = `${vendorCode}-${template.skuSuffix}`;
      const price = calculateVendorPrice(template.basePrice, template.priceVariance, i);

      const product = {
        name: template.baseName,
        sku,
        description: template.description,
        price,
        vendor_id: vendorIds.get(vendorCode) || null,
        emdn_category_id: categoryIds.get(template.categoryCode) || null,
        material_id: materialIds.get(template.materialCode) || null,
      };

      if (isDryRun) {
        console.log(`  Would insert: ${sku} - ${template.baseName} @ $${price}`);
        productCount++;
        continue;
      }

      // Check if product already exists (by SKU)
      const { data: existing } = await supabase!
        .from("products")
        .select("id")
        .eq("sku", sku)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase!
          .from("products")
          .update(product)
          .eq("id", existing.id);

        if (error) {
          console.error(`  Error updating ${sku}: ${error.message}`);
          continue;
        }
        console.log(`  Updated: ${sku}`);
      } else {
        // Insert new
        const { error } = await supabase!.from("products").insert(product);

        if (error) {
          console.error(`  Error inserting ${sku}: ${error.message}`);
          continue;
        }
        console.log(`  Inserted: ${sku}`);
      }
      productCount++;
    }
  }
  console.log(`\nProducts: ${productCount}`);

  // --- Summary ---
  console.log("\n=== Seed Complete ===");
  console.log(`Vendors: ${VENDORS.length}`);
  console.log(`Materials: ${MATERIALS.length}`);
  console.log(`Products: ${productCount} (${PRODUCT_TEMPLATES.length} templates x ${VENDORS.length} vendors)`);

  if (!isDryRun) {
    // Verify with a sample query
    console.log("\nSample products with relations:");
    const { data: sample } = await supabase!
      .from("products")
      .select(
        `
        name,
        sku,
        price,
        vendor:vendors(name),
        category:emdn_categories(code, name),
        material:materials(name)
      `
      )
      .limit(5);

    if (sample) {
      sample.forEach(p => {
        const vendor = Array.isArray(p.vendor) ? p.vendor[0] : p.vendor;
        const category = Array.isArray(p.category) ? p.category[0] : p.category;
        const material = Array.isArray(p.material) ? p.material[0] : p.material;
        console.log(`  ${p.sku}: $${p.price} - ${vendor?.name || "N/A"}`);
        console.log(`    Category: ${category?.code || "N/A"} | Material: ${material?.name || "N/A"}`);
      });
    }
  }
}

main().catch(console.error);
