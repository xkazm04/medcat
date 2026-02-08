/**
 * Fix Pricing Precision v2: Addresses all data quality issues found in investigation.
 *
 * Proposal 1: Revert set-level XC codes from component-level EMDN leaves
 * Proposal 3: Fix XC2.7 and XC2.10 classification from single_component to set
 * Proposal 4: Flag split-price entries (časť 1/2)
 *
 * Usage: npx tsx scripts/fix-pricing-precision-v2.ts
 *        npx tsx scripts/fix-pricing-precision-v2.ts --dry-run
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

// ─── XC Codes that are SETS but were mapped to component-level EMDN leaves ───
// These should have emdn_leaf_category_id = NULL (revert to original emdn_category_id)
// because the price covers a complete set, not a specific component.
const SET_XC_CODES_TO_REVERT = [
  // Hip primary sets — were mapped to P090803 (acetabular components) but price whole sets
  'XC1.1', 'XC1.2', 'XC1.3', 'XC1.4', 'XC1.5', 'XC1.7', 'XC1.8', 'XC1.9',
  // Hip primary sets with dual-mobility — were mapped to P09080305
  'XC1.1.1', 'XC1.2.1',
  // Knee primary sets — were mapped to P090903/P090904 (component categories)
  'XC2.1', 'XC2.2', 'XC2.3', 'XC2.4', 'XC2.17',
  // Knee revision SETS — were mapped to P090905 (revision components) but price complete revisions
  'XC2.5', 'XC2.8', 'XC2.11', 'XC2.14', 'XC2.15', 'XC2.16', 'XC2.18',
  // Knee rotational TEP sets — WRONGLY classified as single_component
  'XC2.7', 'XC2.10',
  // Knee individual modular — stay as leaf-mapped (P090906 is correct, it's a specific category)
  // 'XC2.12' — KEEP, this is correct
  // Hip revision sets — P090880 (accessories/revision) is arguably correct as "revision area"
  // but the prices are for complete revision procedures, so better to revert too
  'XC1.13', 'XC1.14', 'XC1.16',
  // Hip individual modular — P090899 (other) is fine as-is, these are specialized
  // 'XC1.11', 'XC1.18' — KEEP
  // Shoulder/elbow/ankle SETS — P0901/P0902/P0905 are at depth 2, same as original. No change needed.
  // 'XC3.1', 'XC3.2', 'XC3.3', 'XC3.4', 'XC3.5' — leaf = orig, no-op
]

// ─── XC Codes to KEEP leaf-mapped (truly specific component or correct mapping) ───
// XC1.15 → P090804 (hemiarthroplasty → femoral components) — correct, it's stem+head only
// XC1.17 → P09080405 (head only) — correct, true single component
// XC1.11/1.18 → P090899 (individual modular) — correct specialty category
// XC2.12 → P090906 (large resections) — correct specialty category
// XC2.13 → P0909050202 (tibial liner revision) — correct, true single component
// XC3.6 → P090204 (radial head) — correct single component
// XC3.7 → P090404 (CMC thumb) — correct single component
// XC3.15 → P090204 (radial head/neck) — correct single component
// XC3.10/3.12/3.13/3.14 — specialty items, keep as-is

// ─── Component type fixes ───
const COMPONENT_TYPE_FIXES: Record<string, string> = {
  'XC2.7': 'set',   // Was 'single_component', actually "Hybridná rotačná TEP kolenného kĺbu (set)"
  'XC2.10': 'set',  // Was 'single_component', actually "Necementovaná rotačná TEP kolenného kĺbu (set)"
}

async function main() {
  console.log(`Fix Pricing Precision v2${isDryRun ? ' (DRY RUN)' : ''}\n`)

  // ── Step 1: Revert leaf EMDN mappings for set-level XC codes ──
  console.log('=== STEP 1: Revert leaf EMDN for set-level XC codes ===')

  const { data: toRevert, error: revertErr } = await supabase
    .from('reference_prices')
    .select('id, xc_subcode, emdn_leaf_category_id')
    .in('xc_subcode', SET_XC_CODES_TO_REVERT)
    .not('emdn_leaf_category_id', 'is', null)

  if (revertErr) {
    console.error('Failed to query:', revertErr.message)
    process.exit(1)
  }

  console.log(`  Found ${toRevert?.length || 0} prices to revert leaf mapping`)

  // Group by XC for reporting
  const revertByXc = new Map<string, number>()
  for (const p of toRevert || []) {
    revertByXc.set(p.xc_subcode!, (revertByXc.get(p.xc_subcode!) || 0) + 1)
  }
  for (const [xc, count] of [...revertByXc.entries()].sort()) {
    console.log(`    ${xc}: ${count} prices`)
  }

  if (!isDryRun && toRevert && toRevert.length > 0) {
    const ids = toRevert.map(p => p.id)
    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50)
      const { error } = await supabase
        .from('reference_prices')
        .update({ emdn_leaf_category_id: null })
        .in('id', batch)
      if (error) console.error(`    Batch error: ${error.message}`)
    }
    console.log(`  Reverted ${ids.length} leaf mappings to NULL`)
  }

  // ── Step 2: Check what remains leaf-mapped ──
  console.log('\n=== REMAINING LEAF-MAPPED PRICES ===')
  const { data: remaining } = await supabase
    .from('reference_prices')
    .select('xc_subcode, emdn_leaf_category_id, emdn_categories!reference_prices_emdn_leaf_category_id_fkey(code, depth)')
    .not('emdn_leaf_category_id', 'is', null)

  const remainByXc = new Map<string, { code: string, count: number }>()
  for (const p of remaining || []) {
    const xc = p.xc_subcode || 'no-xc'
    const code = (p as any).emdn_categories?.code || '?'
    if (!remainByXc.has(xc)) remainByXc.set(xc, { code, count: 0 })
    remainByXc.get(xc)!.count++
  }
  for (const [xc, data] of [...remainByXc.entries()].sort()) {
    console.log(`  ${xc.padEnd(10)} → ${data.code} (${data.count} prices)`)
  }

  // ── Step 3: Fix component_type for XC2.7 and XC2.10 ──
  console.log('\n=== STEP 3: Fix component_type for XC2.7 and XC2.10 ===')
  for (const [xc, newType] of Object.entries(COMPONENT_TYPE_FIXES)) {
    const { data: toFix } = await supabase
      .from('reference_prices')
      .select('id, component_type')
      .eq('xc_subcode', xc)

    const needsFix = (toFix || []).filter(p => p.component_type !== newType)
    console.log(`  ${xc}: ${needsFix.length} prices to change from '${needsFix[0]?.component_type}' to '${newType}'`)

    if (!isDryRun && needsFix.length > 0) {
      const { error } = await supabase
        .from('reference_prices')
        .update({ component_type: newType })
        .eq('xc_subcode', xc)
      if (error) console.error(`    Error: ${error.message}`)
      else console.log(`  Updated ${needsFix.length} prices`)
    }
  }

  // ── Step 4: Flag split-price entries ──
  console.log('\n=== STEP 4: Flag split-price entries ===')
  const { data: allPrices } = await supabase
    .from('reference_prices')
    .select('id, price_eur, component_description, notes')

  const splitEntries = (allPrices || []).filter(p =>
    p.component_description &&
    (/časť\s*\d+\s*\/\s*\d+/i.test(p.component_description) ||
     /part\s*\d+\s*\/\s*\d+/i.test(p.component_description))
  )

  console.log(`  Found ${splitEntries.length} split-price entries:`)
  for (const p of splitEntries) {
    const desc = (p.component_description || '').substring(0, 80)
    const currentNotes = p.notes || ''
    const alreadyFlagged = currentNotes.includes('SPLIT_PRICE')
    console.log(`    €${p.price_eur?.toFixed(2).padStart(10)} | ${alreadyFlagged ? 'ALREADY FLAGGED' : 'TO FLAG'} | ${desc}`)

    if (!isDryRun && !alreadyFlagged) {
      const newNotes = currentNotes
        ? `${currentNotes}; SPLIT_PRICE: This is a partial entry (part X of Y). Actual price is higher.`
        : 'SPLIT_PRICE: This is a partial entry (part X of Y). Actual price is higher.'
      const { error } = await supabase
        .from('reference_prices')
        .update({ notes: newNotes })
        .eq('id', p.id)
      if (error) console.error(`    Error: ${error.message}`)
    }
  }

  // ── Step 5: Re-run product matching (clear old + regenerate) ──
  if (!isDryRun) {
    console.log('\n=== STEP 5: Re-running product-to-price matching ===')
    console.log('  (Run: npx tsx scripts/match-products-to-prices.ts)')
  }

  // ── Verification ──
  console.log('\n=== VERIFICATION ===')
  // Test the CCB cup again
  const { data: product } = await supabase.from('products')
    .select('id, name, emdn_category_id')
    .eq('name', 'CCB full-profile cup PE 50/28 cem.')
    .single()

  if (product) {
    const { data: rpc } = await supabase.rpc('get_reference_prices', {
      p_product_id: product.id,
      p_emdn_category_id: product.emdn_category_id
    })

    console.log(`\nCCB cup: ${rpc?.length || 0} prices (was 185 before fix)`)
    if (rpc && rpc.length > 0) {
      const prices = rpc.map((r: any) => r.price_eur)
      console.log(`Range: €${Math.min(...prices).toFixed(0)}–€${Math.max(...prices).toFixed(0)}`)

      const byType = new Map<string, number>()
      for (const r of rpc) byType.set((r as any).match_type, (byType.get((r as any).match_type) || 0) + 1)
      for (const [t, c] of byType) console.log(`  ${t}: ${c}`)
    } else {
      console.log('  No prices (expected — set prices no longer match component products via leaf)')
    }
  }

  if (isDryRun) console.log('\nDRY RUN — no changes made')
  else console.log('\nDone. Now run: npx tsx scripts/match-products-to-prices.ts')
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
