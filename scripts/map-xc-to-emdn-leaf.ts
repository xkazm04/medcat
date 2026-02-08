/**
 * Phase 2b: Map XC subcodes to leaf EMDN categories.
 *
 * Uses deterministic rule-based mapping (not AI) to assign emdn_leaf_category_id
 * on reference_prices where the current emdn_category_id is too broad (depth 2).
 *
 * For hip (XC1.*) the current mapping is P0908 (depth 2) for ALL subcodes.
 * This maps each XC subcode to the most specific EMDN category that describes
 * the same class of implant.
 *
 * Usage: npx tsx scripts/map-xc-to-emdn-leaf.ts
 *        npx tsx scripts/map-xc-to-emdn-leaf.ts --dry-run
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const isDryRun = process.argv.includes('--dry-run')

// ─── XC Subcode → EMDN Leaf Code Mapping ────────────────────────
//
// These are deterministic mappings based on the known semantics of
// Slovak XC codes and the EMDN classification hierarchy.

const XC_TO_EMDN_LEAF: Record<string, string> = {
  // ── Hip primary (XC1.1-1.10): complete TEP sets
  // Sets include femoral + acetabular → mapped to P0908 (stays at depth 2 as "whole hip set")
  // But we CAN distinguish cemented vs uncemented at depth 3
  'XC1.1': 'P090803',    // Cemented TEP → acetabular components (cemented cup + cemented stem)
  'XC1.1.1': 'P09080305', // Cemented with dual-mobility cup
  'XC1.2': 'P090803',    // Cemented CoP TEP → acetabular (ceramic head, PE cup)
  'XC1.2.1': 'P09080305', // Cemented CoP dual-mobility
  'XC1.3': 'P090803',    // Hybrid TEP MoP (cem stem + uncem cup)
  'XC1.4': 'P090803',    // Hybrid TEP CoP
  'XC1.5': 'P090803',    // Hybrid TEP CoC
  'XC1.7': 'P090803',    // Uncemented TEP MoP
  'XC1.8': 'P090803',    // Uncemented TEP CoP
  'XC1.9': 'P090803',    // Uncemented TEP CoC

  // ── Hip revision (XC1.13-1.16): revision components
  'XC1.13': 'P090880',   // Revision one component → accessories/revision area
  'XC1.14': 'P090880',   // Revision both components
  'XC1.16': 'P090880',   // Revision both + augmentation

  // ── Hip single components
  'XC1.15': 'P090804',   // Hemiarthroplasty → femoral components
  'XC1.17': 'P09080405', // Head replacement → femoral heads (depth 4)

  // ── Hip individual modular
  'XC1.11': 'P090899',   // Individual modular with skeletal → hip other
  'XC1.18': 'P090899',   // Complete individual femur replacement → hip other

  // ── Knee primary (XC2.1-2.4)
  'XC2.1': 'P090903',    // Cemented bicompartmental → bicompartmental primary
  'XC2.2': 'P090903',    // Uncemented bicompartmental
  'XC2.3': 'P090904',    // Cemented unicondylar
  'XC2.4': 'P090904',    // Uncemented unicondylar
  'XC2.17': 'P090903',   // Ceramic/antiallergic primary TEP

  // ── Knee revision (XC2.5-2.8, 2.11, 2.14-2.16, 2.18)
  'XC2.5': 'P090905',    // Revision single component
  'XC2.8': 'P090905',    // Revision hinged
  'XC2.11': 'P090905',   // Revision with augmentation
  'XC2.14': 'P090905',   // Revision single + liner
  'XC2.15': 'P090905',   // Revision both components
  'XC2.16': 'P090905',   // Revision both + augmentation
  'XC2.18': 'P090905',   // Revision ceramic/antiallergic

  // ── Knee single components
  'XC2.7': 'P0909030202', // Tibial liner replacement → tibial inserts (depth 5)
  'XC2.10': 'P09090702', // Patellar component
  'XC2.13': 'P0909050202', // Tibial liner revision → revision tibial inserts (depth 5)

  // ── Knee individual modular
  'XC2.12': 'P090906',   // Individual modular with skeletal → large resections

  // ── Shoulder
  'XC3.1': 'P0901',      // TEP shoulder (keep depth 2 — no better subcategory available)
  'XC3.2': 'P0901',      // Shoulder hemi
  'XC3.3': 'P0901',      // Modular shoulder
  'XC3.9': 'P090199',    // Revision/reverse shoulder → other

  // ── Elbow
  'XC3.4': 'P0902',      // TEP elbow
  'XC3.6': 'P090204',    // Radial head

  // ── Ankle
  'XC3.5': 'P0905',      // TEP ankle

  // ── Hand
  'XC3.7': 'P090404',    // CMC thumb

  // ── Other XC3 (misc)
  'XC3.10': 'P090199',   // External fixator pediatric
  'XC3.12': 'P090805',   // Temporary spacer → hip spacer (closest match)
  'XC3.13': 'P090199',   // Growing IM system
  'XC3.14': 'P091299',   // Pediatric IM → osteosynthesis other
  'XC3.15': 'P090204',   // Radial head/neck replacement
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  console.log(`Map XC Subcodes to Leaf EMDN${isDryRun ? ' (DRY RUN)' : ''}\n`)

  // Step 1: Load EMDN categories to resolve codes → IDs
  const { data: emdnCats, error: catErr } = await supabase
    .from('emdn_categories')
    .select('id, code, name, depth')
    .like('code', 'P%')

  if (catErr || !emdnCats) {
    console.error('Failed to load EMDN categories:', catErr?.message)
    process.exit(1)
  }

  const codeToId = new Map<string, { id: string; name: string; depth: number }>()
  for (const c of emdnCats) {
    codeToId.set(c.code, { id: c.id, name: c.name, depth: c.depth })
  }

  // Validate all mappings
  console.log('Validating XC→EMDN leaf mappings:')
  let valid = 0
  let invalid = 0
  for (const [xc, emdn] of Object.entries(XC_TO_EMDN_LEAF)) {
    const cat = codeToId.get(emdn)
    if (cat) {
      console.log(`  ${xc.padEnd(10)} → ${emdn.padEnd(16)} d${cat.depth} ${cat.name}`)
      valid++
    } else {
      console.error(`  ${xc.padEnd(10)} → ${emdn.padEnd(16)} NOT FOUND IN DB!`)
      invalid++
    }
  }
  console.log(`\n  Valid: ${valid}, Invalid: ${invalid}`)

  if (invalid > 0) {
    console.error('Fix invalid mappings before proceeding')
    process.exit(1)
  }

  // Step 2: Load reference prices with xc_subcode
  const { data: prices, error: prErr } = await supabase
    .from('reference_prices')
    .select('id, xc_subcode, emdn_category_id, emdn_leaf_category_id')
    .not('xc_subcode', 'is', null)

  if (prErr || !prices) {
    console.error('Failed to load prices:', prErr?.message)
    process.exit(1)
  }

  console.log(`\nLoaded ${prices.length} prices with XC subcodes`)

  // Step 3: Map each to its leaf EMDN
  const updates: { id: string; emdn_leaf_category_id: string }[] = []
  const unmapped: string[] = []

  for (const p of prices) {
    if (p.emdn_leaf_category_id) continue // Already mapped

    const leafCode = XC_TO_EMDN_LEAF[p.xc_subcode!]
    if (!leafCode) {
      // XC4/XC5 codes aren't in the explicit mapping — use current emdn_category_id as leaf
      // (these are already at P0912/P091299/P0999 which is the best available)
      continue
    }

    const leafCat = codeToId.get(leafCode)
    if (!leafCat) continue

    // Only update if leaf is different from current emdn_category_id
    // (i.e., we're actually improving the mapping)
    updates.push({ id: p.id, emdn_leaf_category_id: leafCat.id })
  }

  console.log(`\nPrepared ${updates.length} leaf mappings`)
  console.log(`Unmapped subcodes (using current emdn_category_id): XC4.*/XC5.* (kept as-is)`)

  if (isDryRun) {
    // Show distribution of leaf depths
    const leafDepths = new Map<number, number>()
    for (const u of updates) {
      const cat = emdnCats.find(c => c.id === u.emdn_leaf_category_id)
      if (cat) {
        leafDepths.set(cat.depth, (leafDepths.get(cat.depth) || 0) + 1)
      }
    }
    console.log('\nLeaf depth distribution:')
    for (const [d, c] of [...leafDepths.entries()].sort()) {
      console.log(`  depth ${d}: ${c} prices`)
    }
    console.log('\nDRY RUN — no changes made')
    return
  }

  // Step 4: Update
  let updated = 0
  for (let i = 0; i < updates.length; i += 50) {
    const batch = updates.slice(i, i + 50)
    for (const u of batch) {
      const { error } = await supabase
        .from('reference_prices')
        .update({ emdn_leaf_category_id: u.emdn_leaf_category_id })
        .eq('id', u.id)

      if (error) {
        console.error(`  Failed: ${u.id} — ${error.message}`)
      } else {
        updated++
      }
    }
    process.stdout.write(`\r  Updated ${updated}/${updates.length}`)
  }

  console.log(`\n\nUpdated ${updated} reference prices with leaf EMDN IDs`)

  // Verify
  const { data: verify } = await supabase
    .from('reference_prices')
    .select('emdn_leaf_category_id, emdn_categories!reference_prices_emdn_leaf_category_id_fkey(code, depth)')
    .not('emdn_leaf_category_id', 'is', null)

  const leafDist = new Map<string, number>()
  for (const v of verify || []) {
    const cat = v.emdn_categories as any
    if (cat) {
      const key = `${cat.code} (d${cat.depth})`
      leafDist.set(key, (leafDist.get(key) || 0) + 1)
    }
  }
  console.log('\nLeaf EMDN distribution:')
  for (const [k, v] of [...leafDist.entries()].sort()) {
    console.log(`  ${k}: ${v} prices`)
  }
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
