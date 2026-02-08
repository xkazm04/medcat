/**
 * Test: Pricing Reference Search via Gemini Web Search Grounding
 *
 * Fetches 10 diverse products from the database, runs Gemini web search
 * with the same grounding approach as the chat UI, attempts to extract
 * structured pricing data from each result, and reports success rates.
 *
 * Usage: npm run test:pricing
 *        npm run test:pricing -- --dry-run    (show products without searching)
 *        npm run test:pricing -- --limit 5    (test fewer products)
 */

import { createClient } from '@supabase/supabase-js'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText } from 'ai'
import { config } from 'dotenv'

config() // Load .env (or .env.local if present)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !GEMINI_API_KEY) {
  console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or GEMINI_API_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Same Google provider setup as src/lib/chat/tools.ts
const google = createGoogleGenerativeAI({ apiKey: GEMINI_API_KEY })

const isDryRun = process.argv.includes('--dry-run')
const limitArg = process.argv.indexOf('--limit')
const PRODUCT_LIMIT = limitArg !== -1 ? parseInt(process.argv[limitArg + 1], 10) || 10 : 10

// ─── Types ───────────────────────────────────────────────────────────

interface TestProduct {
  id: string
  name: string
  sku: string
  manufacturer_name: string | null
  emdn_code: string | null
  emdn_name: string | null
  price: number | null
}

interface ExtractedPrice {
  country: string
  source: string
  code: string | null
  price_eur: number
  price_type: string
  url: string | null
}

interface SearchResult {
  product: TestProduct
  duration_ms: number
  raw_text: string
  sources: Array<{ url: string; title: string; domain: string }>
  search_queries: string[]
  extracted_prices: ExtractedPrice[]
  parse_strategy: string // which strategy extracted the prices
  prices_removed_by_filter: number // count of prices removed by quality filter
  error: string | null
}

// ─── Product Selection ───────────────────────────────────────────────

async function selectDiverseProducts(limit: number): Promise<TestProduct[]> {
  // Get products with EMDN categories, preferring those with different categories
  // to test diverse device types
  const { data, error } = await supabase
    .from('products')
    .select(`
      id, name, sku, manufacturer_name, price,
      emdn_category:emdn_categories(code, name)
    `)
    .not('emdn_category_id', 'is', null)
    .not('manufacturer_name', 'is', null)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) {
    console.error('Failed to fetch products:', error.message)
    process.exit(1)
  }

  if (!data || data.length === 0) {
    console.error('No products with EMDN categories found')
    process.exit(1)
  }

  // Deduplicate by EMDN category to get diverse products
  const seenCategories = new Set<string>()
  const diverse: TestProduct[] = []

  for (const row of data) {
    const cat = row.emdn_category as any
    const code = cat?.code || null
    const catKey = code || row.name

    if (!seenCategories.has(catKey) && diverse.length < limit) {
      seenCategories.add(catKey)
      diverse.push({
        id: row.id,
        name: row.name,
        sku: row.sku,
        manufacturer_name: row.manufacturer_name,
        emdn_code: code,
        emdn_name: cat?.name || null,
        price: row.price,
      })
    }
  }

  // If we didn't fill from diverse categories, top up with remaining
  if (diverse.length < limit) {
    for (const row of data) {
      if (diverse.length >= limit) break
      if (diverse.some((d) => d.id === row.id)) continue
      const cat = row.emdn_category as any
      diverse.push({
        id: row.id,
        name: row.name,
        sku: row.sku,
        manufacturer_name: row.manufacturer_name,
        emdn_code: cat?.code || null,
        emdn_name: cat?.name || null,
        price: row.price,
      })
    }
  }

  return diverse
}

// ─── Gemini Web Search ───────────────────────────────────────────────

async function searchPricingForProduct(product: TestProduct): Promise<SearchResult> {
  const start = Date.now()

  try {
    // Build search context — use generic device type, not full product name
    // (full names with sizes/materials confuse web search)
    const deviceType = product.emdn_name || product.name
    const manufacturer = product.manufacturer_name || ''

    // Pricing-focused prompt: balanced between structured output and not scaring model into silence
    const prompt = `Find EU reimbursement tariffs and procurement prices for this medical device:
Device type: ${deviceType}
Product name: ${product.name}
Manufacturer: ${manufacturer}
${product.emdn_code ? `EMDN code: ${product.emdn_code}` : ''}

Search these sources for pricing data:
1. France LPPR (legifrance.gouv.fr, ameli.fr) — "Liste des Produits et Prestations" reimbursement tariffs. LPP codes: 31xxxxx or 27xxxxx.
2. Slovakia MZ SR (kategorizacia.mzsr.sk) — device category reimbursement ceilings. Category codes: XC2.*, XC3.*
3. EU/Czech tender portals (ted.europa.eu, cz.openprocurements.com) — CPV 33183100 contract award notices with unit prices
4. UK NHS (find-tender.service.gov.uk, NHS Supply Chain) — framework agreement ceiling prices
5. India NPPA (nppa.gov.in) — ceiling prices for orthopedic implants

IMPORTANT GUIDELINES:
- Approximate and category-level prices are valuable. If you cannot find the exact product, look for prices for the same device CATEGORY (e.g., "elbow prosthesis" or "knee prosthesis" category prices).
- Convert non-EUR prices: 1 GBP ≈ 1.17 EUR, 1 CZK ≈ 0.04 EUR, 1 INR ≈ 0.011 EUR, 1 HUF ≈ 0.0025 EUR
- Include the source URL where you found the price

After your search, output each price found as a structured PRICE: line in this exact format:
PRICE: [2-letter country]|[source name]|[reference code or NONE]|[EUR amount]|[price type]|[source URL or NONE]

Examples:
PRICE: FR|LPPR|LPP 3104987|1333.59|reimbursement_ceiling|https://www.ameli.fr/...
PRICE: SK|MZ SR|XC3.4|3025.00|reimbursement_ceiling|https://kategorizacia.mzsr.sk/...
PRICE: GB|NHS|NONE|6000.00|tender_unit|https://find-tender.service.gov.uk/...
PRICE: IN|NPPA|NONE|567.19|reimbursement_ceiling|https://nppa.gov.in/...

Valid price types: reimbursement_ceiling, tender_unit, catalog_list, reference

You may include brief notes about your findings, but you MUST include PRICE: lines at the end for every numeric price you found.`

    const response = await generateText({
      model: google('gemini-2.5-flash'),
      tools: {
        google_search: google.tools.googleSearch({}),
      },
      prompt,
      temperature: 1.0, // Recommended for grounding
    })

    const groundingMetadata = (response.providerMetadata?.google as any)?.groundingMetadata

    // Extract sources
    const sources = (groundingMetadata?.groundingChunks || [])
      .filter((chunk: any) => chunk.web?.uri)
      .map((chunk: any) => {
        try {
          return {
            url: chunk.web.uri,
            title: chunk.web.title || 'Unknown',
            domain: new URL(chunk.web.uri).hostname.replace('www.', ''),
          }
        } catch {
          return null
        }
      })
      .filter(Boolean)

    const searchQueries = groundingMetadata?.webSearchQueries || []

    // Parse structured pricing from response text
    const { prices: extracted, strategy } = parsePricesFromText(response.text)

    // Apply quality filtering
    const { filtered, removed } = filterAndRankPrices(extracted)

    return {
      product,
      duration_ms: Date.now() - start,
      raw_text: response.text,
      sources,
      search_queries: searchQueries,
      extracted_prices: filtered,
      parse_strategy: strategy,
      prices_removed_by_filter: removed,
      error: null,
    }
  } catch (err) {
    return {
      product,
      duration_ms: Date.now() - start,
      raw_text: '',
      sources: [],
      search_queries: [],
      extracted_prices: [],
      parse_strategy: 'error',
      prices_removed_by_filter: 0,
      error: (err as Error).message,
    }
  }
}

// ─── Price Parsing ───────────────────────────────────────────────────

interface ParseResult {
  prices: ExtractedPrice[]
  strategy: string
}

function parsePricesFromText(text: string): ParseResult {
  // Strategy 1: Parse structured PRICE: lines (best case — model followed instructions)
  const structuredPrices: ExtractedPrice[] = []
  const priceLineRegex = /PRICE:\s*([A-Z]{2})\|([^|]+)\|([^|]*)\|([\d.,]+)\|([^|]+)\|(.*)/g
  let match
  while ((match = priceLineRegex.exec(text)) !== null) {
    const codeRaw = match[3].trim()
    const eurAmount = parseFloat(match[4].replace(/,/g, ''))
    if (!isNaN(eurAmount) && eurAmount > 0) {
      const urlRaw = match[6].trim()
      structuredPrices.push({
        country: match[1].trim(),
        source: match[2].trim(),
        code: (codeRaw && codeRaw !== 'NONE' && codeRaw !== 'N/A') ? codeRaw : null,
        price_eur: eurAmount,
        price_type: match[5].trim(),
        url: (urlRaw && urlRaw !== 'NONE' && urlRaw !== 'N/A') ? urlRaw : null,
      })
    }
  }
  if (structuredPrices.length > 0) return { prices: deduplicatePrices(structuredPrices), strategy: 'structured_lines' }

  // Check for explicit "no prices" signal
  if (/PRICE:\s*NONE/i.test(text)) return { prices: [], strategy: 'explicit_none' }

  // Strategy 2: Parse markdown bullet-list format
  const bulletPrices = parseMarkdownBullets(text)
  if (bulletPrices.length > 0) return { prices: deduplicatePrices(bulletPrices), strategy: 'markdown_bullets' }

  // Strategy 3: Parse markdown table format
  const tablePrices = parseMarkdownTable(text)
  if (tablePrices.length > 0) return { prices: deduplicatePrices(tablePrices), strategy: 'markdown_table' }

  // Strategy 4: Line-by-line EUR amount extraction with context
  const linePrices = parseLineByLine(text)
  if (linePrices.length > 0) return { prices: deduplicatePrices(linePrices), strategy: 'line_by_line' }

  return { prices: [], strategy: text.length === 0 ? 'empty_response' : 'no_match' }
}

// ─── Country/Source Detection Helpers ────────────────────────────────

interface CountrySource {
  country: string
  source: string
  priceType: string
}

const COUNTRY_PATTERNS: Array<{ pattern: RegExp; result: CountrySource }> = [
  { pattern: /\bFR\b|France|French|LPPR|legifrance|ameli\.fr/i, result: { country: 'FR', source: 'LPPR', priceType: 'reimbursement_ceiling' } },
  { pattern: /\bSK\b|Slovak|MZ\s*SR|kategorizacia/i, result: { country: 'SK', source: 'MZ SR', priceType: 'reimbursement_ceiling' } },
  { pattern: /\bCZ\b|Czech|openprocurements|vhodne-uverejneni/i, result: { country: 'CZ', source: 'CZ Tender', priceType: 'tender_unit' } },
  { pattern: /\bHU\b|Hungar/i, result: { country: 'HU', source: 'HU Tender', priceType: 'tender_unit' } },
  { pattern: /\bGB\b|United Kingdom|\bUK\b|\bNHS\b|find-tender|supply chain/i, result: { country: 'GB', source: 'NHS', priceType: 'tender_unit' } },
  { pattern: /\bDE\b|German|InEK/i, result: { country: 'DE', source: 'InEK', priceType: 'reference' } },
  { pattern: /\bIN\b|India|NPPA|nppa\.gov/i, result: { country: 'IN', source: 'NPPA', priceType: 'reimbursement_ceiling' } },
  { pattern: /\bTED\b|ted\.europa/i, result: { country: 'EU', source: 'TED', priceType: 'tender_unit' } },
]

function detectCountrySource(text: string): CountrySource | null {
  for (const { pattern, result } of COUNTRY_PATTERNS) {
    if (pattern.test(text)) return result
  }
  return null
}

// Extract reference codes like LPP 3104987, XC3.4, CPV 33183100
function extractRefCode(text: string): string | null {
  const codePatterns = [
    /LPP\s*(\d{7})/i,
    /code\s+LPP\s*(\d{7})/i,
    /(?:LPP|code)\s+(2\d{6}|3\d{6})/i,
    /XC\d\.\d+/i,
    /CPV\s*\d{8}/i,
  ]
  for (const p of codePatterns) {
    const m = text.match(p)
    if (m) return m[0]
  }
  return null
}

// Extract URL from text (markdown link or bare URL)
function extractUrl(text: string): string | null {
  // Markdown link: [text](url)
  const mdLink = text.match(/\[.*?\]\((https?:\/\/[^\s)]+)\)/)
  if (mdLink) return mdLink[1]
  // Bare URL
  const bareUrl = text.match(/(https?:\/\/[^\s,)>"]+)/)
  if (bareUrl) return bareUrl[1]
  return null
}

// ─── EUR Amount Regex ────────────────────────────────────────────────

// Matches: €1,537.23, EUR 1537, 1,333.59 EUR, € 870.83, 1333.59€
const EUR_AMOUNT_REGEX = /(?:€\s?|EUR\s?)([\d,]+(?:\.\d{1,2})?)|(\d[\d,]*(?:\.\d{1,2})?)\s?(?:€|EUR)/gi

function parseEurAmounts(text: string): number[] {
  const amounts: number[] = []
  let m
  const re = new RegExp(EUR_AMOUNT_REGEX.source, EUR_AMOUNT_REGEX.flags)
  while ((m = re.exec(text)) !== null) {
    const raw = (m[1] || m[2]).replace(/,/g, '')
    const val = parseFloat(raw)
    if (!isNaN(val) && val > 0 && val < 500000) amounts.push(val)
  }
  return amounts
}

// ─── Strategy 2: Markdown Bullet Parsing ─────────────────────────────

function parseMarkdownBullets(text: string): ExtractedPrice[] {
  const prices: ExtractedPrice[] = []

  // Split by country header patterns:
  // **FR - France**, **France (FR)**, ## France, ### FR - France, * **France**
  const sections = text.split(/(?=(?:^|\n)(?:\*\*|#{1,3}\s*|\*\s+\*\*)(?:[A-Z]{2}\s*[-–—]\s*\w|\w+\s*\([A-Z]{2}\)|France|Slovakia|Czech|Hungary|United Kingdom|India|Germany))/i)

  for (const section of sections) {
    if (section.trim().length < 10) continue

    const cs = detectCountrySource(section.substring(0, 200))
    if (!cs) continue

    // Look for price amounts in this section
    const amounts = parseEurAmounts(section)
    // Also check for plain number after "Price:" or "Tariff:" or "Price in EUR:"
    const priceValueMatch = section.match(/(?:Price(?:\s+in\s+EUR)?|Tariff|Amount|ceiling|Reimbursement)\s*[:=]\s*[€]?\s*([\d,]+(?:\.\d{1,2})?)/i)
    if (priceValueMatch) {
      const val = parseFloat(priceValueMatch[1].replace(/,/g, ''))
      if (!isNaN(val) && val > 0 && val < 500000 && !amounts.includes(val)) {
        amounts.unshift(val) // prioritize labeled prices
      }
    }

    if (amounts.length === 0) continue

    const code = extractRefCode(section)
    const url = extractUrl(section)

    // Take the first (most prominent) price per country section
    prices.push({
      country: cs.country,
      source: cs.source,
      code,
      price_eur: amounts[0],
      price_type: cs.priceType,
      url,
    })

    // If there are additional amounts with different codes, add them too
    if (amounts.length > 1) {
      for (let i = 1; i < Math.min(amounts.length, 3); i++) {
        if (Math.abs(amounts[i] - amounts[0]) > 1) { // skip near-duplicates
          prices.push({
            country: cs.country,
            source: cs.source,
            code,
            price_eur: amounts[i],
            price_type: cs.priceType,
            url,
          })
        }
      }
    }
  }

  return prices
}

// ─── Strategy 3: Markdown Table Parsing ──────────────────────────────

function parseMarkdownTable(text: string): ExtractedPrice[] {
  const prices: ExtractedPrice[] = []

  // Find table rows: | ... | ... | ... |
  const tableRowRegex = /^\|(.+)\|$/gm
  const rows: string[][] = []

  let m
  while ((m = tableRowRegex.exec(text)) !== null) {
    const cells = m[1].split('|').map(c => c.trim())
    // Skip separator rows (---) and header rows
    if (cells.some(c => /^-+$/.test(c))) continue
    rows.push(cells)
  }

  if (rows.length < 2) return prices // need header + at least 1 data row

  // Try to identify columns by header names
  const header = rows[0].map(h => h.toLowerCase())
  const countryCol = header.findIndex(h => /country|code|iso/i.test(h))
  const sourceCol = header.findIndex(h => /source|registry|name/i.test(h))
  const codeCol = header.findIndex(h => /code|ref|lpp|xc/i.test(h))
  const priceCol = header.findIndex(h => /price|eur|amount|tariff/i.test(h))
  const typeCol = header.findIndex(h => /type/i.test(h))
  const urlCol = header.findIndex(h => /url|link/i.test(h))

  if (priceCol === -1) return prices // need at least a price column

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const priceStr = (row[priceCol] || '').replace(/[€EUR,\s]/g, '')
    const amount = parseFloat(priceStr)
    if (isNaN(amount) || amount <= 0) continue

    const countryText = row[countryCol] || ''
    const sourceText = row[sourceCol] || ''
    const cs = detectCountrySource(countryText + ' ' + sourceText) || { country: 'EU', source: 'Unknown', priceType: 'reference' }

    const codeText = codeCol >= 0 ? row[codeCol] : null
    const urlText = urlCol >= 0 ? row[urlCol] : null

    prices.push({
      country: cs.country,
      source: cs.source || sourceText || 'Unknown',
      code: (codeText && codeText !== '-' && codeText !== 'N/A') ? codeText : null,
      price_eur: amount,
      price_type: (typeCol >= 0 && row[typeCol]) ? row[typeCol] : cs.priceType,
      url: urlText ? extractUrl(urlText) : null,
    })
  }

  return prices
}

// ─── Strategy 4: Line-by-Line EUR Amount Extraction ──────────────────

function parseLineByLine(text: string): ExtractedPrice[] {
  const prices: ExtractedPrice[] = []
  const lines = text.split('\n')

  // Track current country context (from headers/bold text)
  let currentCS: CountrySource | null = null

  for (const line of lines) {
    // Update country context from header lines
    const headerMatch = line.match(/(?:\*\*|#{1,3}\s*)([^*#]+)/)
    if (headerMatch) {
      const headerCS = detectCountrySource(headerMatch[1])
      if (headerCS) currentCS = headerCS
    }

    // Check for EUR amounts on this line
    const amounts = parseEurAmounts(line)
    if (amounts.length === 0) continue

    // Determine country from this line or current context
    const lineCS = detectCountrySource(line)
    const cs = lineCS || currentCS
    if (!cs) continue

    const code = extractRefCode(line)
    const url = extractUrl(line)

    for (const amount of amounts.slice(0, 2)) { // max 2 per line
      prices.push({
        country: cs.country,
        source: cs.source,
        code,
        price_eur: amount,
        price_type: cs.priceType,
        url,
      })
    }
  }

  return prices
}

// ─── Deduplication ───────────────────────────────────────────────────

function deduplicatePrices(prices: ExtractedPrice[]): ExtractedPrice[] {
  const seen = new Set<string>()
  const result: ExtractedPrice[] = []
  for (const p of prices) {
    // Deduplicate by country + rounded amount (avoid float precision issues)
    const key = `${p.country}:${Math.round(p.price_eur * 100)}`
    if (!seen.has(key)) {
      seen.add(key)
      result.push(p)
    }
  }
  return result
}

// ─── Quality Filtering ──────────────────────────────────────────────

/**
 * Source quality tiers (lower = better):
 * T1: Official national reimbursement registries (LPPR, MZ SR)
 * T2: Official procurement / tender portals (TED, NHS, national govt tenders)
 * T3: NPPA ceiling prices (official but non-EU)
 * T4: Everything else (marketplaces, retail catalogs) — filtered out
 */

// Allowed EU countries for reference pricing
const EU_RELEVANT_COUNTRIES = new Set(['FR', 'SK', 'CZ', 'DE', 'HU', 'PL', 'GB', 'EU', 'MT', 'AT', 'IT', 'ES', 'NL', 'BE'])

// Tier 1: Official reimbursement registries
const TIER1_SOURCES = new Set(['LPPR', 'MZ SR', 'InEK', 'SUKL'])

// Tier 2: Official procurement/tender portals
const TIER2_SOURCES = new Set(['TED', 'NHS', 'CZ Tender', 'HU Tender', 'contracts.gov', 'NHS Trust Contract Register'])

// Tier 3: Non-EU official ceiling prices (useful for context)
const TIER3_SOURCES = new Set(['NPPA'])

// Blocked sources: retail marketplaces and catalog aggregators
const BLOCKED_SOURCES = new Set([
  'IndiaMART', 'Hospital Store', 'Tradeindia', 'Bharucha Associates',
  'Healing Touch Surgicals', 'MedicalExpo', 'Synergy Surgical',
  'Geosurgical', 'Alibaba', 'Amazon', 'eBay',
])

// Blocked countries for reference pricing (too far from EU market context)
const BLOCKED_COUNTRIES = new Set(['CN', 'BD', 'PK', 'NG'])

function getSourceTier(price: ExtractedPrice): number {
  if (TIER1_SOURCES.has(price.source)) return 1
  if (TIER2_SOURCES.has(price.source)) return 2
  if (TIER3_SOURCES.has(price.source)) return 3
  // Check if source contains blocked marketplace patterns
  if (BLOCKED_SOURCES.has(price.source)) return 99
  // Unknown sources from EU countries get tier 3
  if (EU_RELEVANT_COUNTRIES.has(price.country)) return 3
  return 99
}

const MAX_PRICES_PER_PRODUCT = 8

function filterAndRankPrices(prices: ExtractedPrice[]): { filtered: ExtractedPrice[]; removed: number } {
  const before = prices.length

  const filtered = prices
    // Remove blocked sources and countries
    .filter(p => !BLOCKED_SOURCES.has(p.source))
    .filter(p => !BLOCKED_COUNTRIES.has(p.country))
    // For non-EU countries, only keep official sources (NPPA)
    .filter(p => EU_RELEVANT_COUNTRIES.has(p.country) || TIER3_SOURCES.has(p.source))
    // Sort by quality tier, then by price_eur ascending (cheapest first within tier)
    .sort((a, b) => {
      const tierDiff = getSourceTier(a) - getSourceTier(b)
      if (tierDiff !== 0) return tierDiff
      return a.price_eur - b.price_eur
    })
    // Cap per product
    .slice(0, MAX_PRICES_PER_PRODUCT)

  return { filtered, removed: before - filtered.length }
}

// ─── Reporting ───────────────────────────────────────────────────────

function printReport(results: SearchResult[]) {
  console.log('\n' + '='.repeat(80))
  console.log('PRICING SEARCH TEST REPORT')
  console.log('='.repeat(80))

  // Per-product details
  for (const r of results) {
    console.log(`\n${'─'.repeat(80)}`)
    console.log(`Product: ${r.product.name}`)
    console.log(`  SKU: ${r.product.sku} | Manufacturer: ${r.product.manufacturer_name || 'N/A'}`)
    console.log(`  EMDN: ${r.product.emdn_code || 'N/A'} (${r.product.emdn_name || 'N/A'})`)
    console.log(`  Catalog price: ${r.product.price !== null ? `CZK ${r.product.price}` : 'N/A'}`)
    console.log(`  Duration: ${(r.duration_ms / 1000).toFixed(1)}s`)

    if (r.error) {
      console.log(`  ERROR: ${r.error}`)
      continue
    }

    console.log(`  Sources: ${r.sources.length} web sources`)
    if (r.sources.length > 0) {
      for (const s of r.sources.slice(0, 3)) {
        console.log(`    - ${s.domain}: ${s.title.substring(0, 60)}`)
      }
    }

    console.log(`  Search queries: ${r.search_queries.length}`)
    for (const q of r.search_queries.slice(0, 2)) {
      console.log(`    - "${q}"`)
    }

    console.log(`  Extracted prices: ${r.extracted_prices.length} (strategy: ${r.parse_strategy}${r.prices_removed_by_filter > 0 ? `, ${r.prices_removed_by_filter} filtered out` : ''})`)
    if (r.extracted_prices.length > 0) {
      for (const p of r.extracted_prices) {
        const tier = getSourceTier(p)
        console.log(`    T${tier} ${p.country} | ${p.source} | €${p.price_eur.toFixed(2)} | ${p.price_type}${p.code ? ` | code: ${p.code}` : ''}${p.url ? ` | ${p.url.substring(0, 50)}...` : ''}`)
      }
    }
  }

  // Summary statistics
  console.log('\n' + '='.repeat(80))
  console.log('SUMMARY')
  console.log('='.repeat(80))

  const total = results.length
  const errors = results.filter((r) => r.error !== null).length
  const withSources = results.filter((r) => r.sources.length > 0).length
  const withPrices = results.filter((r) => r.extracted_prices.length > 0).length
  const totalPrices = results.reduce((sum, r) => sum + r.extracted_prices.length, 0)
  const avgDuration = results.reduce((sum, r) => sum + r.duration_ms, 0) / total

  const totalFiltered = results.reduce((sum, r) => sum + r.prices_removed_by_filter, 0)

  console.log(`\nProducts tested:        ${total}`)
  console.log(`API errors:             ${errors} (${((errors / total) * 100).toFixed(0)}%)`)
  console.log(`With web sources:       ${withSources} (${((withSources / total) * 100).toFixed(0)}%)`)
  console.log(`With extracted prices:  ${withPrices} (${((withPrices / total) * 100).toFixed(0)}%)`)
  console.log(`Total prices (after):   ${totalPrices}`)
  console.log(`Total filtered out:     ${totalFiltered}`)
  console.log(`Avg prices/product:     ${(totalPrices / total).toFixed(1)}`)
  console.log(`Avg search duration:    ${(avgDuration / 1000).toFixed(1)}s`)

  // Price breakdown by country
  const byCountry = new Map<string, number>()
  const bySource = new Map<string, number>()
  const byType = new Map<string, number>()
  for (const r of results) {
    for (const p of r.extracted_prices) {
      byCountry.set(p.country, (byCountry.get(p.country) || 0) + 1)
      bySource.set(p.source, (bySource.get(p.source) || 0) + 1)
      byType.set(p.price_type, (byType.get(p.price_type) || 0) + 1)
    }
  }

  // Strategy breakdown
  const byStrategy = new Map<string, number>()
  for (const r of results) {
    byStrategy.set(r.parse_strategy, (byStrategy.get(r.parse_strategy) || 0) + 1)
  }
  console.log('\nParse strategy breakdown:')
  for (const [k, v] of [...byStrategy.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`)
  }

  if (byCountry.size > 0) {
    console.log('\nPrices by country:')
    for (const [k, v] of [...byCountry.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${k}: ${v}`)
    }

    console.log('\nPrices by source:')
    for (const [k, v] of [...bySource.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${k}: ${v}`)
    }

    console.log('\nPrices by type:')
    for (const [k, v] of [...byType.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${k}: ${v}`)
    }
  }

  // Price range analysis
  const allPrices = results.flatMap((r) => r.extracted_prices.map((p) => p.price_eur))
  if (allPrices.length > 0) {
    allPrices.sort((a, b) => a - b)
    console.log(`\nPrice range (EUR):`)
    console.log(`  Min:    €${allPrices[0].toFixed(2)}`)
    console.log(`  Median: €${allPrices[Math.floor(allPrices.length / 2)].toFixed(2)}`)
    console.log(`  Max:    €${allPrices[allPrices.length - 1].toFixed(2)}`)
  }

  // Source domain analysis
  const domainCounts = new Map<string, number>()
  for (const r of results) {
    for (const s of r.sources) {
      domainCounts.set(s.domain, (domainCounts.get(s.domain) || 0) + 1)
    }
  }
  if (domainCounts.size > 0) {
    console.log('\nTop web source domains:')
    const sorted = [...domainCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
    for (const [domain, count] of sorted) {
      console.log(`  ${domain}: ${count}`)
    }
  }

  console.log('\n' + '='.repeat(80))
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log(`Pricing Search Test (Gemini Web Grounding)\n`)
  console.log(`Limit: ${PRODUCT_LIMIT} products`)
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no API calls)' : 'LIVE'}\n`)

  // Step 1: Select diverse products
  console.log('Fetching products from database...')
  const products = await selectDiverseProducts(PRODUCT_LIMIT)
  console.log(`Selected ${products.length} diverse products:\n`)

  for (let i = 0; i < products.length; i++) {
    const p = products[i]
    console.log(`  ${i + 1}. ${p.name}`)
    console.log(`     ${p.sku} | ${p.manufacturer_name || 'N/A'} | EMDN: ${p.emdn_code || 'N/A'}`)
  }

  if (isDryRun) {
    console.log('\nDry run — skipping web searches.')
    return
  }

  // Step 2: Run searches sequentially (to avoid rate limiting)
  console.log(`\nRunning ${products.length} pricing searches (sequential to avoid rate limits)...\n`)
  const results: SearchResult[] = []

  for (let i = 0; i < products.length; i++) {
    const p = products[i]
    process.stdout.write(`[${i + 1}/${products.length}] ${p.name.substring(0, 50).padEnd(50)} `)

    const result = await searchPricingForProduct(p)
    results.push(result)

    if (result.error) {
      console.log(`ERROR (${(result.duration_ms / 1000).toFixed(1)}s)`)
    } else {
      console.log(
        `${result.extracted_prices.length} prices, ${result.sources.length} sources (${(result.duration_ms / 1000).toFixed(1)}s)`
      )
    }

    // Rate limit courtesy: 2s between requests
    if (i < products.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }

  // Step 3: Report
  printReport(results)

  // Step 4: Output raw data for inspection
  const outputPath = 'scripts/test-pricing-results.json'
  const { writeFileSync } = await import('fs')
  writeFileSync(
    outputPath,
    JSON.stringify(
      results.map((r) => ({
        product: r.product,
        duration_ms: r.duration_ms,
        sources_count: r.sources.length,
        search_queries: r.search_queries,
        extracted_prices: r.extracted_prices,
        parse_strategy: r.parse_strategy,
        prices_removed_by_filter: r.prices_removed_by_filter,
        error: r.error,
        raw_text_length: r.raw_text.length,
        raw_text: r.raw_text, // full text for debugging
      })),
      null,
      2
    )
  )
  console.log(`\nDetailed results saved to: ${outputPath}`)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
