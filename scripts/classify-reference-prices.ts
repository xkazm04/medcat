/**
 * Phase 2a: Extract XC subcodes and classify component types for reference prices.
 *
 * Parses source_code from existing SK reference_prices to populate:
 * - xc_subcode: The XC subcode (e.g., "XC1.1", "XC1.17")
 * - component_type: Derived classification based on XC code semantics
 *
 * Component type categories:
 * - single_component: Individual item (head, cup, liner, screw)
 * - set: Complete primary prosthesis set (stem + cup + head + liner)
 * - revision_set: Revision prosthesis (one or both components)
 * - individual_modular: Patient-specific or modular mega-prosthesis
 * - fixation_device: Osteosynthesis material (plates, nails, screws, wires)
 * - arthroscopic: Arthroscopic surgery components
 * - temporary: Temporary spacer/implant
 * - other: Uncategorized
 *
 * Usage: npx tsx scripts/classify-reference-prices.ts
 *        npx tsx scripts/classify-reference-prices.ts --dry-run
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

// ─── XC Subcode → Component Type Mapping ──────────────────────────
//
// Based on analysis of 845 SK reference prices and the MZ SR categorization
// schema. Each XC group has specific subcodes for different procedure types.

interface XCRule {
  pattern: RegExp
  component_type: string
  description: string
}

const XC_RULES: XCRule[] = [
  // ── Hip (XC1.*) ──
  { pattern: /^XC1\.1(\.\d+)?$/, component_type: 'set', description: 'Cemented TEP hip MoP' },
  { pattern: /^XC1\.2(\.\d+)?$/, component_type: 'set', description: 'Cemented TEP hip CoP' },
  { pattern: /^XC1\.3$/, component_type: 'set', description: 'Hybrid TEP hip MoP' },
  { pattern: /^XC1\.4$/, component_type: 'set', description: 'Hybrid TEP hip CoP' },
  { pattern: /^XC1\.5$/, component_type: 'set', description: 'Hybrid TEP hip CoC' },
  { pattern: /^XC1\.6$/, component_type: 'set', description: 'Hybrid TEP hip MoM' },
  { pattern: /^XC1\.7$/, component_type: 'set', description: 'Uncemented TEP hip MoP' },
  { pattern: /^XC1\.8$/, component_type: 'set', description: 'Uncemented TEP hip CoP' },
  { pattern: /^XC1\.9$/, component_type: 'set', description: 'Uncemented TEP hip CoC' },
  { pattern: /^XC1\.10$/, component_type: 'set', description: 'Uncemented TEP hip MoM' },
  { pattern: /^XC1\.11$/, component_type: 'individual_modular', description: 'Individual modular TEP hip with skeletal replacement' },
  { pattern: /^XC1\.12$/, component_type: 'individual_modular', description: 'Individual modular TEP hip standard' },
  { pattern: /^XC1\.13$/, component_type: 'revision_set', description: 'Revision TEP hip — single component' },
  { pattern: /^XC1\.14$/, component_type: 'revision_set', description: 'Revision TEP hip — both components' },
  { pattern: /^XC1\.15$/, component_type: 'set', description: 'Hemiarthroplasty hip' },
  { pattern: /^XC1\.16$/, component_type: 'revision_set', description: 'Revision TEP hip — both components + augmentation' },
  { pattern: /^XC1\.17$/, component_type: 'single_component', description: 'Revision TEP hip — head replacement only' },
  { pattern: /^XC1\.18$/, component_type: 'individual_modular', description: 'Complete individual modular femur replacement (hip+knee)' },

  // ── Knee (XC2.*) ──
  { pattern: /^XC2\.1$/, component_type: 'set', description: 'Cemented TEP knee' },
  { pattern: /^XC2\.2$/, component_type: 'set', description: 'Uncemented TEP knee' },
  { pattern: /^XC2\.3$/, component_type: 'set', description: 'Cemented unicondylar knee' },
  { pattern: /^XC2\.4$/, component_type: 'set', description: 'Uncemented unicondylar knee' },
  { pattern: /^XC2\.5$/, component_type: 'revision_set', description: 'Revision TEP knee — single component' },
  { pattern: /^XC2\.6$/, component_type: 'revision_set', description: 'Revision TEP knee — both components' },
  { pattern: /^XC2\.7$/, component_type: 'single_component', description: 'Revision TEP knee — liner replacement' },
  { pattern: /^XC2\.8$/, component_type: 'revision_set', description: 'Revision TEP knee — hinged' },
  { pattern: /^XC2\.9$/, component_type: 'individual_modular', description: 'Individual modular TEP knee with skeletal replacement' },
  { pattern: /^XC2\.10$/, component_type: 'single_component', description: 'Patellar component' },
  { pattern: /^XC2\.11$/, component_type: 'revision_set', description: 'Revision TEP knee with augmentation' },
  { pattern: /^XC2\.12$/, component_type: 'individual_modular', description: 'Individual modular TEP knee with skeletal replacement' },
  { pattern: /^XC2\.13$/, component_type: 'single_component', description: 'Revision TEP knee — tibial liner replacement only' },
  { pattern: /^XC2\.14$/, component_type: 'revision_set', description: 'Revision TEP knee — single component + liner' },
  { pattern: /^XC2\.15$/, component_type: 'revision_set', description: 'Revision TEP knee — both components + liner' },
  { pattern: /^XC2\.16$/, component_type: 'revision_set', description: 'Revision TEP knee — both + special augmentation' },
  { pattern: /^XC2\.17$/, component_type: 'set', description: 'Primary TEP knee ceramic/antiallergic' },
  { pattern: /^XC2\.18$/, component_type: 'revision_set', description: 'Revision TEP knee ceramic/antiallergic' },

  // ── Other joints (XC3.*) ──
  { pattern: /^XC3\.1$/, component_type: 'set', description: 'TEP shoulder' },
  { pattern: /^XC3\.2$/, component_type: 'set', description: 'Shoulder hemiarthroplasty' },
  { pattern: /^XC3\.3$/, component_type: 'set', description: 'Modular shoulder TEP/hemi' },
  { pattern: /^XC3\.4$/, component_type: 'set', description: 'TEP elbow' },
  { pattern: /^XC3\.5$/, component_type: 'set', description: 'TEP ankle' },
  { pattern: /^XC3\.6$/, component_type: 'single_component', description: 'Radial head replacement' },
  { pattern: /^XC3\.7$/, component_type: 'single_component', description: 'CMC thumb joint prosthesis' },
  { pattern: /^XC3\.9$/, component_type: 'revision_set', description: 'Revision/reverse shoulder TEP' },
  { pattern: /^XC3\.10$/, component_type: 'individual_modular', description: 'Individual modular external fixator (pediatric)' },
  { pattern: /^XC3\.12$/, component_type: 'temporary', description: 'Temporary spacer (hip/knee/shoulder)' },
  { pattern: /^XC3\.13$/, component_type: 'individual_modular', description: 'Growing intramedullary system (limb lengthening)' },
  { pattern: /^XC3\.14$/, component_type: 'fixation_device', description: 'Pediatric intramedullary system' },
  { pattern: /^XC3\.15$/, component_type: 'single_component', description: 'Radial head and neck replacement' },

  // ── Osteosynthesis (XC4.*) ──
  { pattern: /^XC4\.\d+/, component_type: 'fixation_device', description: 'Osteosynthesis material' },

  // ── Arthroscopic (XC5.*) ──
  { pattern: /^XC5\.\d+/, component_type: 'arthroscopic', description: 'Arthroscopic surgery component' },
]

// ── France LPPR mapping (individual component prices) ──
const FR_RULES: XCRule[] = [
  { pattern: /revision.*(?:femoral|tibial|shim|augment|stem|anchor)/i, component_type: 'single_component', description: 'FR LPPR knee revision component' },
  { pattern: /knee.*revision/i, component_type: 'revision_set', description: 'FR LPPR knee revision set' },
  { pattern: /knee/i, component_type: 'set', description: 'FR LPPR knee' },
]

function classifySourceCode(sourceCode: string | null, sourceName: string | null, componentDesc: string | null): {
  xc_subcode: string | null
  component_type: string
} {
  if (!sourceCode) {
    return { xc_subcode: null, component_type: 'other' }
  }

  // Extract XC subcode: "XC1.17/X01203" → "XC1.17", "XC1.1" → "XC1.1"
  const xcMatch = sourceCode.match(/^(XC\d+(?:\.\d+)*)/)
  if (!xcMatch) {
    // Non-XC code — check if LPPR (France) by source name
    if (sourceName === 'LPPR' || sourceName === 'Legifrance LPPR') {
      for (const rule of FR_RULES) {
        if (componentDesc && rule.pattern.test(componentDesc)) {
          return { xc_subcode: null, component_type: rule.component_type }
        }
      }
      return { xc_subcode: null, component_type: 'single_component' }
    }
    return { xc_subcode: null, component_type: 'other' }
  }

  const xc_subcode = xcMatch[1]

  // Match against rules
  for (const rule of XC_RULES) {
    if (rule.pattern.test(xc_subcode)) {
      return { xc_subcode, component_type: rule.component_type }
    }
  }

  // Fallback: try to infer from the XC group prefix
  if (xc_subcode.startsWith('XC4')) return { xc_subcode, component_type: 'fixation_device' }
  if (xc_subcode.startsWith('XC5')) return { xc_subcode, component_type: 'arthroscopic' }

  return { xc_subcode, component_type: 'other' }
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  console.log(`Classify Reference Prices${isDryRun ? ' (DRY RUN)' : ''}\n`)

  // Fetch all reference prices
  const { data: prices, error } = await supabase
    .from('reference_prices')
    .select('id, source_code, source_name, component_description, xc_subcode, component_type')

  if (error || !prices) {
    console.error('Failed to fetch prices:', error?.message)
    process.exit(1)
  }

  console.log(`Loaded ${prices.length} reference prices`)

  // Classify each
  const updates: { id: string; xc_subcode: string | null; component_type: string }[] = []
  const stats = new Map<string, number>()

  for (const p of prices) {
    // Skip already classified
    if (p.xc_subcode && p.component_type) continue

    const { xc_subcode, component_type } = classifySourceCode(
      p.source_code,
      p.source_name,
      p.component_description
    )

    updates.push({ id: p.id, xc_subcode, component_type })
    stats.set(component_type, (stats.get(component_type) || 0) + 1)
  }

  console.log(`\nClassification results (${updates.length} to update):`)
  for (const [type, count] of [...stats.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`)
  }

  // Show XC subcode distribution
  const xcDist = new Map<string, number>()
  for (const u of updates) {
    if (u.xc_subcode) {
      xcDist.set(u.xc_subcode, (xcDist.get(u.xc_subcode) || 0) + 1)
    }
  }
  console.log(`\nXC subcode distribution (${xcDist.size} unique subcodes):`)
  for (const [xc, count] of [...xcDist.entries()].sort()) {
    const ct = updates.find(u => u.xc_subcode === xc)?.component_type || '?'
    console.log(`  ${xc} → ${ct} (${count} prices)`)
  }

  if (isDryRun) {
    console.log('\nDRY RUN — no changes made')
    return
  }

  // Update in batches
  let updated = 0
  for (let i = 0; i < updates.length; i += 50) {
    const batch = updates.slice(i, i + 50)
    for (const u of batch) {
      const { error: updateErr } = await supabase
        .from('reference_prices')
        .update({ xc_subcode: u.xc_subcode, component_type: u.component_type })
        .eq('id', u.id)

      if (updateErr) {
        console.error(`  Update failed for ${u.id}: ${updateErr.message}`)
      } else {
        updated++
      }
    }
    process.stdout.write(`\r  Updated ${updated}/${updates.length}`)
  }

  console.log(`\n\nUpdated ${updated} reference prices`)

  // Verify
  const { data: verifyData } = await supabase
    .from('reference_prices')
    .select('component_type')
    .not('component_type', 'is', null)

  const typeCounts = new Map<string, number>()
  for (const v of verifyData || []) {
    typeCounts.set(v.component_type, (typeCounts.get(v.component_type) || 0) + 1)
  }
  console.log('\nVerification — component_type distribution:')
  for (const [type, count] of [...typeCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`)
  }
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
