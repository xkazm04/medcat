/**
 * Import LPPR (France) reference tariffs for orthopedic knee revision implants.
 *
 * Source: Legifrance LPPR tariff schedules (legifrance.gouv.fr)
 * Data validated against research doc findings.
 *
 * Usage: npm run import:lppr
 *        npm run import:lppr -- --dry-run
 */

import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'
import { config } from 'dotenv'

config({ path: '.env.local' })
config({ path: '.env' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY

const isDryRun = process.argv.includes('--dry-run')

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// LPPR tariff data from Legifrance research (knee revision components)
// Prices are regulated reimbursement ceilings in EUR TTC
const LPPR_TARIFFS = [
  {
    source_code: '3104987',
    component_description: 'Knee revision femoral bicondylar cemented',
    component_description_fr: 'Genou, implant fémoral de reprise bicondylien, cimenté',
    price_eur: 1333.59,
    source_url: 'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000038392176',
  },
  {
    source_code: '3184058',
    component_description: 'Knee revision femoral non-cemented',
    component_description_fr: 'Genou, implant fémoral de reprise, non cimenté',
    price_eur: 1537.23,
    source_url: 'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000038392176',
  },
  {
    source_code: '3105811',
    component_description: 'Knee revision tibial baseplate cemented',
    component_description_fr: 'Genou, embase de reprise, cimentée',
    price_eur: 870.83, // Updated 2025 tariff (was 986.78)
    source_url: 'https://kohenavocats.fr/2025/08/07/decision-du-23-juillet-2025-fixant-les-tarifs-de-responsabilite-et-les-prix-limites-de-vente-au-public-plv-en-euros-ttc-de-certains-implants-orthopediques-inscrits-au-titre-iii-sur-la-liste-des-prod/',
  },
  {
    source_code: '3175711',
    component_description: 'Knee revision tibial baseplate non-cemented',
    component_description_fr: 'Genou, embase de reprise, non cimentée',
    price_eur: 1045.06, // Updated 2025 tariff (was 1177.53)
    source_url: 'https://kohenavocats.fr/2025/08/07/decision-du-23-juillet-2025-fixant-les-tarifs-de-responsabilite-et-les-prix-limites-de-vente-au-public-plv-en-euros-ttc-de-certains-implants-orthopediques-inscrits-au-titre-iii-sur-la-liste-des-prod/',
  },
  {
    source_code: '3187157',
    component_description: 'Knee revision shim/augment block',
    component_description_fr: 'Genou, cale de rattrapage (shim/augment)',
    price_eur: 248.85,
    source_url: 'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000038392176',
  },
  {
    source_code: '3101405',
    component_description: 'Knee revision stem/anchor extension',
    component_description_fr: 'Genou, quille d\'ancrage (stem/anchor)',
    price_eur: 249.27,
    source_url: 'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000038392176',
  },
]

/**
 * Use Gemini to map LPPR component descriptions to EMDN category codes.
 * Returns a map of source_code -> emdn_category_id.
 */
async function mapEMDNCategoriesWithAI(): Promise<Map<string, string>> {
  const mappings = new Map<string, string>()

  if (!GEMINI_API_KEY) {
    console.log('  No GEMINI_API_KEY — skipping AI EMDN mapping')
    return mappings
  }

  // Fetch all orthopedic-related EMDN categories
  const { data: categories, error } = await supabase
    .from('emdn_categories')
    .select('id, code, name')
    .like('code', 'P%')
    .order('code')

  if (error || !categories || categories.length === 0) {
    console.log('  No EMDN categories found, skipping AI mapping')
    return mappings
  }

  const categoryList = categories
    .map((c) => `${c.code}: ${c.name}`)
    .join('\n')

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })

  for (const tariff of LPPR_TARIFFS) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Given this French LPPR tariff for an orthopedic knee revision component:
"${tariff.component_description}" (French: "${tariff.component_description_fr}", LPP code: ${tariff.source_code})

And these EMDN (European Medical Device Nomenclature) categories:
${categoryList}

Which EMDN code best matches this component? Consider that:
- This is a KNEE REVISION implant component
- EMDN codes starting with P09 are for joint prostheses
- P0909 subcategories are specifically for revision knee prostheses

Return ONLY the EMDN code (e.g., "P090905") that best matches. If no good match exists, return "NONE".`,
      })

      const emdnCode = response.text?.trim().replace(/["`']/g, '')
      if (emdnCode && emdnCode !== 'NONE') {
        const matched = categories.find((c) => c.code === emdnCode)
        if (matched) {
          mappings.set(tariff.source_code, matched.id)
          console.log(`  ${tariff.source_code} → ${emdnCode} (${matched.name})`)
        } else {
          console.log(`  ${tariff.source_code} → AI returned "${emdnCode}" but no matching category found`)
        }
      } else {
        console.log(`  ${tariff.source_code} → No EMDN match`)
      }
    } catch (err) {
      console.error(`  ${tariff.source_code} → AI mapping error:`, (err as Error).message)
    }
  }

  return mappings
}

async function main() {
  console.log(`LPPR Tariff Import${isDryRun ? ' (DRY RUN)' : ''}\n`)
  console.log(`Importing ${LPPR_TARIFFS.length} knee revision component tariffs\n`)

  // Step 1: AI-assisted EMDN mapping
  console.log('Step 1: Mapping LPP codes to EMDN categories via AI...')
  const emdnMappings = await mapEMDNCategoriesWithAI()
  console.log(`  Mapped ${emdnMappings.size} of ${LPPR_TARIFFS.length} tariffs\n`)

  // Step 1b: Delete existing LPPR prices (idempotent)
  if (!isDryRun) {
    const { count: existingCount } = await supabase
      .from('reference_prices')
      .select('*', { count: 'exact', head: true })
      .eq('source_name', 'LPPR')
      .eq('source_country', 'FR')

    if (existingCount && existingCount > 0) {
      console.log(`  Deleting ${existingCount} existing LPPR prices...`)
      const { error: delError } = await supabase
        .from('reference_prices')
        .delete()
        .eq('source_name', 'LPPR')
        .eq('source_country', 'FR')

      if (delError) {
        console.error('  Delete error:', delError.message)
        process.exit(1)
      }
    }
    console.log()
  }

  // Step 2: Prepare rows
  const rows = LPPR_TARIFFS.map((tariff) => ({
    product_id: null,
    emdn_category_id: emdnMappings.get(tariff.source_code) || null,
    price_original: tariff.price_eur,
    currency_original: 'EUR',
    price_eur: tariff.price_eur,
    price_type: 'reimbursement_ceiling',
    source_country: 'FR',
    source_name: 'LPPR',
    source_url: tariff.source_url,
    source_code: tariff.source_code,
    manufacturer_name: null,
    product_family: 'Knee Revision',
    component_description: tariff.component_description,
    valid_from: '2024-01-01',
    valid_until: null,
    extraction_method: 'manual',
    notes: `French: ${tariff.component_description_fr}`,
  }))

  // Rows without EMDN mapping cannot be inserted (CHECK constraint requires at least one linkage)
  const insertable = rows.filter((r) => r.emdn_category_id !== null)
  const skipped = rows.filter((r) => r.emdn_category_id === null)

  if (skipped.length > 0) {
    console.log(`Warning: ${skipped.length} tariffs have no EMDN mapping and will be skipped:`)
    skipped.forEach((r) => console.log(`  - ${r.source_code}: ${r.component_description}`))
    console.log()
  }

  if (isDryRun) {
    console.log('DRY RUN — would insert:')
    insertable.forEach((r) => {
      console.log(`  ${r.source_code} | €${r.price_eur} | ${r.component_description} | EMDN: ${r.emdn_category_id}`)
    })
    return
  }

  // Step 3: Insert
  if (insertable.length === 0) {
    console.log('No rows to insert (all tariffs lack EMDN mapping)')
    return
  }

  console.log(`Step 2: Inserting ${insertable.length} reference prices...`)
  const { data, error } = await supabase
    .from('reference_prices')
    .insert(insertable)
    .select('id')

  if (error) {
    console.error('Insert error:', error.message)
    process.exit(1)
  }

  console.log(`  Inserted ${data?.length || 0} reference prices`)

  // Step 4: Verify
  const { count } = await supabase
    .from('reference_prices')
    .select('*', { count: 'exact', head: true })
    .eq('source_name', 'LPPR')

  console.log(`\nVerification: ${count} LPPR prices in database`)
  console.log('Done!')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
