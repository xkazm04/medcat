/**
 * Import Slovak SZM (Special Healthcare Materials) reference prices.
 *
 * Source: Ministry of Health SR quarterly categorization list (health.gov.sk)
 * File: Zoznam_SZM_YYYYMM.xlsx — XC* rows = orthopedic implants
 *
 * Extracts:
 * - Category-level prices (UZP2 from subgroup header rows)
 * - Device-level prices (UZP from individual device rows)
 * Maps XC subgroup codes → EMDN categories via AI-assisted matching.
 *
 * Usage: npm run import:sk-szm
 *        npm run import:sk-szm -- --dry-run
 *        npm run import:sk-szm -- --categories-only  (skip individual devices)
 */

import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'
import { config } from 'dotenv'
import * as XLSX from 'xlsx'
import { readFileSync, existsSync, writeFileSync } from 'fs'

config()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const isDryRun = process.argv.includes('--dry-run')
const categoriesOnly = process.argv.includes('--categories-only')

const SZM_FILE = 'scripts/data/sk-szm-2026q1.xlsx'
const MAPPING_CACHE_FILE = 'scripts/data/sk-xc-emdn-mapping.json'
const VALID_FROM = '2026-01-01'
const VALID_UNTIL = '2026-03-31'

// ─── Excel Column Indices (0-based) ──────────────────────────────────
// Row 1 headers: č.r. | Podskupina | Kód MZ SR | Kód ŠÚKL | Názov | Doplnok | Výrobca | Štát | MJD | DPH | AKC | ÚZP | DOP | DOP% | SÚ | Presk.obm. | KN | ID | Z | Výnimka
const COL = {
  SEQ: 0,         // č.r. - sequential number
  SUBGROUP: 1,    // Podskupina - XC code (e.g., "XC1.1")
  CODE_MZSR: 2,   // Kód MZ SR (e.g., "X00277")
  CODE_SUKL: 3,   // Kód ŠÚKL (e.g., "P54456,P54457")
  NAME: 4,        // Názov - device name
  SUPPLEMENT: 5,  // Doplnok názvu - description supplement
  MANUFACTURER: 6,// Výrobca - manufacturer abbrev
  COUNTRY: 7,     // Štát - manufacturer country
  UNIT: 8,        // MJD - unit (set, ks, etc.)
  VAT: 9,         // DPH - VAT rate
  AKC: 10,        // Max dispensary price
  UZP: 11,        // ÚZP - insurance reimbursement
  DOP: 12,        // Patient copayment
  DOP_PCT: 13,    // Copayment %
  SU: 14,         // Reimbursement method
  UZP2: 15,       // ÚZP2 - category-level reimbursement (only on subgroup header rows)
  UZP2_UNIT: 16,  // Jednotka ÚZP2 - unit for category price
}

// ─── Types ───────────────────────────────────────────────────────────

interface CategoryPrice {
  xc_code: string
  name_sk: string
  uzp2: number
  unit: string
}

interface DevicePrice {
  xc_code: string
  code_mzsr: string
  code_sukl: string
  name: string
  supplement: string | null
  manufacturer: string
  country: string
  unit: string
  uzp: number // insurance reimbursement EUR
  akc: number // max dispensary price EUR
}

// ─── Excel Parsing ───────────────────────────────────────────────────

function parseExcel(): { categories: CategoryPrice[]; devices: DevicePrice[] } {
  if (!existsSync(SZM_FILE)) {
    console.error(`Excel file not found: ${SZM_FILE}`)
    console.error('Download from: https://health.gov.sk/Clanok?zkszm-202601')
    process.exit(1)
  }

  const wb = XLSX.readFile(SZM_FILE)
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })

  const categories: CategoryPrice[] = []
  const devices: DevicePrice[] = []

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length < 5) continue

    const nameCell = String(row[COL.NAME] || '').trim()
    const subgroup = String(row[COL.SUBGROUP] || '').trim()

    // Is this a subgroup HEADER row? (has XC code in name, UZP2 value, no subgroup in col B)
    const xcHeaderMatch = nameCell.match(/^(XC\d+(?:\.\d+)*)\s+(.+)/)
    if (xcHeaderMatch && !subgroup && row[COL.UZP2]) {
      const uzp2 = parseFloat(String(row[COL.UZP2]))
      if (!isNaN(uzp2) && uzp2 > 0) {
        categories.push({
          xc_code: xcHeaderMatch[1],
          name_sk: xcHeaderMatch[2].trim(),
          uzp2,
          unit: String(row[COL.UZP2_UNIT] || 'set').trim(),
        })
      }
      continue
    }

    // Is this a DEVICE data row? (has XC subgroup code in col B)
    if (subgroup.startsWith('XC') && row[COL.CODE_MZSR]) {
      const uzp = parseFloat(String(row[COL.UZP] || 0))
      const akc = parseFloat(String(row[COL.AKC] || 0))
      if (uzp > 0 || akc > 0) {
        devices.push({
          xc_code: subgroup,
          code_mzsr: String(row[COL.CODE_MZSR]).trim(),
          code_sukl: String(row[COL.CODE_SUKL] || '').trim(),
          name: nameCell,
          supplement: row[COL.SUPPLEMENT] ? String(row[COL.SUPPLEMENT]).trim() : null,
          manufacturer: String(row[COL.MANUFACTURER] || '').trim(),
          country: String(row[COL.COUNTRY] || '').trim(),
          unit: String(row[COL.UNIT] || 'set').trim(),
          uzp,
          akc,
        })
      }
    }
  }

  return { categories, devices }
}

// ─── EMDN Mapping ────────────────────────────────────────────────────

type XCtoEMDNMap = Record<string, { emdn_id: string; emdn_code: string; emdn_name: string }>

async function mapXCtoEMDN(xcCodes: string[]): Promise<XCtoEMDNMap> {
  // Check cache first
  if (existsSync(MAPPING_CACHE_FILE)) {
    console.log('  Loading cached XC→EMDN mappings...')
    const cached = JSON.parse(readFileSync(MAPPING_CACHE_FILE, 'utf8'))
    // Verify all codes are cached
    const missing = xcCodes.filter((c) => !(c in cached))
    if (missing.length === 0) {
      console.log(`  All ${xcCodes.length} codes cached`)
      return cached
    }
    console.log(`  ${xcCodes.length - missing.length} cached, ${missing.length} need mapping`)
  }

  if (!GEMINI_API_KEY) {
    console.log('  No GEMINI_API_KEY — skipping AI EMDN mapping')
    return {}
  }

  // Fetch EMDN categories (P* = prostheses)
  const { data: emdnCats, error } = await supabase
    .from('emdn_categories')
    .select('id, code, name')
    .like('code', 'P%')
    .order('code')

  if (error || !emdnCats?.length) {
    console.log('  No EMDN categories found in DB')
    return {}
  }

  const categoryList = emdnCats.map((c) => `${c.code}: ${c.name}`).join('\n')
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })
  const mapping: XCtoEMDNMap = {}

  // Load existing cache to extend
  if (existsSync(MAPPING_CACHE_FILE)) {
    Object.assign(mapping, JSON.parse(readFileSync(MAPPING_CACHE_FILE, 'utf8')))
  }

  // Build batch prompt for unmapped codes
  const unmapped = xcCodes.filter((c) => !(c in mapping))
  if (unmapped.length === 0) return mapping

  // Map in batches of 10
  for (let b = 0; b < unmapped.length; b += 10) {
    const batch = unmapped.slice(b, b + 10)
    const descriptions = batch.map((code) => {
      // Find category name from our parsed data
      return code
    })

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Map these Slovak SZM (Special Healthcare Materials) orthopedic category codes to the best matching EMDN code.

Slovak XC codes to map:
${batch.join('\n')}

Context for SK codes:
- XC1.* = Hip joint prostheses (TEP bedrového kĺbu)
- XC2.* = Knee joint prostheses (TEP kolenného kĺbu)
- XC3.1 = Shoulder prosthesis (TEP ramena)
- XC3.2 = Shoulder hemiarthroplasty
- XC3.3 = Modular shoulder prosthesis
- XC3.4 = Elbow prosthesis (TEP lakťa)
- XC3.5 = Ankle prosthesis (TEP členka)
- XC3.6 = Radial head replacement
- XC3.7 = CMC thumb joint prosthesis
- XC3.9 = Revision/reverse shoulder prosthesis
- XC4.* = Osteosynthesis material (plates, nails, screws)
- XC5.* = Arthroscopic surgery components

Available EMDN codes:
${categoryList}

For each XC code, return the best matching EMDN code.
Return ONLY a JSON array like: [{"xc":"XC1.1","emdn":"P090901"},{"xc":"XC2.1","emdn":"P0909"}]
If no good EMDN match exists, use "NONE" for emdn.`,
      })

      const text = response.text || ''
      // Extract JSON from response
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const results: Array<{ xc: string; emdn: string }> = JSON.parse(jsonMatch[0])
        for (const r of results) {
          if (r.emdn === 'NONE') continue
          const matched = emdnCats.find((c) => c.code === r.emdn)
          if (matched) {
            mapping[r.xc] = { emdn_id: matched.id, emdn_code: matched.code, emdn_name: matched.name }
            console.log(`  ${r.xc} → ${matched.code} (${matched.name})`)
          }
        }
      }
    } catch (err) {
      console.error(`  Batch mapping error:`, (err as Error).message)
    }

    // Rate limit
    if (b + 10 < unmapped.length) {
      await new Promise((r) => setTimeout(r, 1000))
    }
  }

  // Save cache
  writeFileSync(MAPPING_CACHE_FILE, JSON.stringify(mapping, null, 2))
  console.log(`  Saved mapping cache to ${MAPPING_CACHE_FILE}`)

  return mapping
}

// ─── DB Insert ───────────────────────────────────────────────────────

async function insertPrices(
  categories: CategoryPrice[],
  devices: DevicePrice[],
  xcMapping: XCtoEMDNMap,
) {
  const rows: any[] = []

  // Category-level prices (UZP2 — the subgroup reimbursement ceiling per set)
  for (const cat of categories) {
    const emdn = xcMapping[cat.xc_code]
    if (!emdn) continue // Skip unmapped categories

    rows.push({
      product_id: null,
      emdn_category_id: emdn.emdn_id,
      price_original: cat.uzp2,
      currency_original: 'EUR',
      price_eur: cat.uzp2,
      price_type: 'reimbursement_ceiling',
      source_country: 'SK',
      source_name: 'MZ SR',
      source_url: 'https://health.gov.sk/Clanok?zkszm-202601',
      source_code: cat.xc_code,
      manufacturer_name: null,
      product_family: null,
      component_description: `${cat.xc_code} ${cat.name_sk} (${cat.unit})`,
      valid_from: VALID_FROM,
      valid_until: VALID_UNTIL,
      extraction_method: 'excel_import',
      notes: `Category-level UZP2 for ${cat.xc_code}`,
    })
  }

  // Device-level prices (individual UZP)
  if (!categoriesOnly) {
    for (const dev of devices) {
      const emdn = xcMapping[dev.xc_code]
      if (!emdn) continue

      rows.push({
        product_id: null,
        emdn_category_id: emdn.emdn_id,
        price_original: dev.uzp,
        currency_original: 'EUR',
        price_eur: dev.uzp,
        price_type: 'reimbursement_ceiling',
        source_country: 'SK',
        source_name: 'MZ SR',
        source_url: 'https://health.gov.sk/Clanok?zkszm-202601',
        source_code: `${dev.xc_code}/${dev.code_mzsr}`,
        manufacturer_name: dev.manufacturer,
        product_family: null,
        component_description: dev.supplement ? `${dev.name} — ${dev.supplement}` : dev.name,
        valid_from: VALID_FROM,
        valid_until: VALID_UNTIL,
        extraction_method: 'excel_import',
        notes: `ŠÚKL: ${dev.code_sukl}, Country: ${dev.country}`,
      })
    }
  }

  console.log(`\nPrepared ${rows.length} rows for insert`)
  console.log(`  Category prices: ${rows.filter((r) => r.notes?.startsWith('Category')).length}`)
  console.log(`  Device prices: ${rows.filter((r) => !r.notes?.startsWith('Category')).length}`)

  if (isDryRun) {
    console.log('\nDRY RUN — sample rows:')
    for (const r of rows.slice(0, 10)) {
      console.log(`  ${r.source_code} | €${r.price_eur} | ${r.component_description?.substring(0, 60)}`)
    }
    if (rows.length > 10) console.log(`  ... and ${rows.length - 10} more`)
    return
  }

  // Delete existing SK MZ SR prices from this period (idempotent re-import)
  console.log('\nRemoving existing SK/MZ SR prices for this period...')
  const { error: delError } = await supabase
    .from('reference_prices')
    .delete()
    .eq('source_country', 'SK')
    .eq('source_name', 'MZ SR')
    .eq('extraction_method', 'excel_import')

  if (delError) {
    console.error('Delete error:', delError.message)
  }

  // Insert in batches of 100
  let inserted = 0
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100)
    const { data, error } = await supabase.from('reference_prices').insert(batch).select('id')

    if (error) {
      console.error(`Batch ${Math.floor(i / 100) + 1} insert error:`, error.message)
      // Try to narrow down which rows fail
      if (batch.length > 1) {
        console.log('  Retrying one-by-one...')
        for (const row of batch) {
          const { error: singleErr } = await supabase.from('reference_prices').insert(row)
          if (singleErr) {
            console.error(`  Failed: ${row.source_code} — ${singleErr.message}`)
          } else {
            inserted++
          }
        }
      }
    } else {
      inserted += data?.length || 0
    }

    process.stdout.write(`\r  Inserted ${inserted}/${rows.length}`)
  }

  console.log(`\n\nInserted ${inserted} reference prices`)

  // Verify
  const { count } = await supabase
    .from('reference_prices')
    .select('*', { count: 'exact', head: true })
    .eq('source_country', 'SK')
    .eq('source_name', 'MZ SR')

  console.log(`Verification: ${count} SK/MZ SR prices in database`)
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log(`SK SZM Import${isDryRun ? ' (DRY RUN)' : ''}${categoriesOnly ? ' (categories only)' : ''}\n`)

  // Step 1: Parse Excel
  console.log('Step 1: Parsing Excel file...')
  const { categories, devices } = parseExcel()
  console.log(`  Found ${categories.length} XC category prices`)
  console.log(`  Found ${devices.length} XC device entries`)

  // Show category breakdown
  const byCat = new Map<string, number>()
  for (const d of devices) {
    const prefix = d.xc_code.split('.')[0] + '.' + (d.xc_code.split('.')[1] || '')
    byCat.set(prefix.replace(/\.$/, ''), (byCat.get(prefix.replace(/\.$/, '')) || 0) + 1)
  }
  console.log('\n  Category breakdown:')
  const xcGroups = new Map<string, string>([
    ['XC1', 'Hip prostheses'],
    ['XC2', 'Knee prostheses'],
    ['XC3', 'Other joint prostheses'],
    ['XC4', 'Osteosynthesis material'],
    ['XC5', 'Arthroscopic components'],
  ])
  for (const [prefix, label] of xcGroups) {
    const count = devices.filter((d) => d.xc_code.startsWith(prefix)).length
    console.log(`    ${prefix} (${label}): ${count} devices`)
  }

  // Step 2: Map XC codes to EMDN
  console.log('\nStep 2: Mapping XC codes to EMDN categories...')
  const allXcCodes = [...new Set([...categories.map((c) => c.xc_code), ...devices.map((d) => d.xc_code)])]
  const xcMapping = await mapXCtoEMDN(allXcCodes)
  const mappedCount = allXcCodes.filter((c) => c in xcMapping).length
  console.log(`  Mapped ${mappedCount} of ${allXcCodes.length} XC codes to EMDN`)

  const unmapped = allXcCodes.filter((c) => !(c in xcMapping))
  if (unmapped.length > 0) {
    console.log(`  Unmapped codes: ${unmapped.join(', ')}`)
  }

  // Step 3: Insert
  console.log('\nStep 3: Inserting reference prices...')
  await insertPrices(categories, devices, xcMapping)

  console.log('\nDone!')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
