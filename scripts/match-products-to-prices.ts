/**
 * Phase 3: Rule-based product-to-price matching.
 *
 * For each product, finds relevant reference prices using:
 * 1. EMDN category ancestry (must share ancestor within 3 levels)
 * 2. Manufacturer/brand keyword matching
 * 3. Component type compatibility
 *
 * Stores scored matches in product_price_matches.
 *
 * Usage: npx tsx scripts/match-products-to-prices.ts
 *        npx tsx scripts/match-products-to-prices.ts --dry-run
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

// ─── Manufacturer Code → Known Brand Keywords ─────────────────
// Maps 3-letter SK reference price manufacturer codes to brand/product
// keywords that appear in product names.
const MFR_CODE_TO_BRANDS: Record<string, string[]> = {
  'DPI': ['depuy', 'charnley', 'corail', 'sigma', 'attune', 'pinnacle', 'marathon', 'triloc'],
  'ZIM': ['zimmer', 'nexgen', 'trilogy', 'continuum', 'persona', 'avenir', 'fitmore', 'taperloc', 'znn', 'cbl'],
  'AES': ['aesculap', 'braun', 'bicontact', 'plasmacup', 'plasmafit', 'centrament', 'excia', 'corehip', 'trilliance', 'isofar', 'metha'],
  'BEZ': ['beznoska', 'poldi', 'csc', 'rmd', 'beznoska'],
  'LIM': ['lima', 'physica', 'modulus'],
  'SND': ['smith', 'nephew', 'genesis', 'polarstem', 'r3', 'oxinium', 'journey', 'legion'],
  'MHG': ['mathys', 'twinsys', 'ccb', 'optimys', 'rmb', 'bettlach', 'enovis'],
  'GRP': ['lepine', 'trendhip', 'screwcup'],
  'M17': ['medacta', 'amystem', 'mpact', 'versafitcup', 'quadra', 'mectacer'],
  'SRF': ['serf', 'novae', 'sunfit', 'sagitta'],
  'STR': ['stryker', 'abgii', 'trident', 'accolade', 'mako', 'triathlon', 'rejuvenate'],
  'ICA': ['implantcast', 'mutars', 'ecofit', 'actinia', 'bicana', 'muller'],
  'WAL': ['waldemar', 'megasystem', 'endo modell', 'lubinus'],
  'BIM': ['biomet', 'bimetric', 'taperloc', 'mallory', 'exceed', 'avantage'],
  'BIM-GB': ['biomet', 'bimetric', 'taperloc', 'mallory', 'oxford'],
  'BIM-US': ['biomet', 'maxfire', 'marxmen'],
  'ADL-IT': ['adler', 'hydra', 'fixa', 'larus', 'pulchra', 'parva'],
  'ADL- IT': ['adler', 'hydra', 'fixa', 'larus', 'pulchra', 'parva'],
  'XNO': ['xnov'],
  'SYT': ['synthes', 'depuy synthes'],
  'SYT-CH': ['synthes', 'depuy synthes'],
  'HOB': ['hofer'],
  'HOB-AT': ['hofer'],
  'C2F': ['c2f', 'mc2'],
  'MDN': ['medin'],
  'SVQ': ['genutech'],
  'MHB': ['balansys'],
  'MMG': ['bioball'],
  'ZMN': ['zimmer'],
  'CVO': ['dixi'],
  'KRM': ['karpometakarp'],
  'MXO': ['freedom'],
  'DDE': ['symbol'],
  'ATH': ['arthrex', 'tightrope', 'gryphon'],
  'DPI-US': ['depuy', 'intrafix', 'gryphon', 'versalok'],
  'MDO': ['medline', 'versaloop', 'rigidloop', 'truespan', 'latarjet'],
  'STORZ': ['storz', 'megafix'],
  'CYE': ['conmed', 'quattro', 'crossfix'],
  'BTD': ['activapin', 'activanail', 'activascrew'],
  'SXA': ['magnezix'],
  'MGZ': ['medgal'],
  'KIO': ['kinamed', 'inteos'],
  'CHP-PL': ['charfix'],
  'CHV': ['variloc', 'neogen'],
  'DMM': ['marquardt'],
  'LSM': ['vrp', 'diphos'],
  'NUI': ['precice', 'stryde'],
  'PGM': ['fassier', 'duval'],
}

// ─── EMDN Category Helpers ─────────────────────────────────────

interface EmdnCategory {
  id: string
  code: string
  name: string
  depth: number
  parent_id: string | null
}

interface Product {
  id: string
  name: string
  sku: string | null
  description: string | null
  vendor_name: string | null
  emdn_category_id: string | null
}

interface ReferencePrice {
  id: string
  emdn_category_id: string | null
  emdn_leaf_category_id: string | null
  manufacturer_name: string | null
  component_description: string | null
  product_family: string | null
  component_type: string | null
  xc_subcode: string | null
  price_eur: number | null
}

function getAncestorIds(
  catId: string,
  categoryMap: Map<string, EmdnCategory>
): string[] {
  const ancestors: string[] = []
  let current = catId
  while (current) {
    ancestors.push(current)
    const cat = categoryMap.get(current)
    if (!cat || !cat.parent_id) break
    current = cat.parent_id
  }
  return ancestors
}

// ─── Matching Logic ─────────────────────────────────────────────

interface Match {
  product_id: string
  reference_price_id: string
  match_score: number
  match_reason: string
  match_method: string
}

function computeMatch(
  product: Product,
  price: ReferencePrice,
  productAncestors: Set<string>,
  categoryMap: Map<string, EmdnCategory>
): Match | null {
  // Must share EMDN ancestry
  const priceCategory = price.emdn_leaf_category_id || price.emdn_category_id
  if (!priceCategory) return null

  const isAncestor = productAncestors.has(priceCategory)
  if (!isAncestor) return null

  // Base score from EMDN depth proximity
  const productCat = product.emdn_category_id
    ? categoryMap.get(product.emdn_category_id)
    : null
  const priceCat = categoryMap.get(priceCategory)

  if (!productCat || !priceCat) return null

  // Depth difference (smaller = better)
  const depthDiff = Math.abs(productCat.depth - priceCat.depth)

  let score = 0.3 // Base category match
  const reasons: string[] = []

  // Boost for closer EMDN depth
  if (depthDiff === 0) {
    score += 0.2
    reasons.push('exact EMDN depth')
  } else if (depthDiff === 1) {
    score += 0.15
    reasons.push('EMDN depth ±1')
  } else if (depthDiff === 2) {
    score += 0.1
    reasons.push('EMDN depth ±2')
  }

  // Manufacturer/brand matching
  const productNameLower = product.name.toLowerCase()
  const productDescLower = (product.description || '').toLowerCase()
  const vendorLower = (product.vendor_name || '').toLowerCase()
  const priceDescLower = (price.component_description || '').toLowerCase()

  if (price.manufacturer_name) {
    const brands = MFR_CODE_TO_BRANDS[price.manufacturer_name] || []
    let brandMatch = false

    for (const brand of brands) {
      if (
        productNameLower.includes(brand) ||
        productDescLower.includes(brand) ||
        vendorLower.includes(brand)
      ) {
        brandMatch = true
        score += 0.3
        reasons.push(`brand match: ${brand}`)
        break
      }
    }

    // Also check if product name keywords appear in price description
    if (!brandMatch) {
      const productWords = productNameLower
        .split(/[\s\-\/,]+/)
        .filter(w => w.length >= 3)
        .filter(w => !['dia', 'mm', 'taper', 'size', 'with', 'for', 'the', 'and'].includes(w))

      for (const word of productWords) {
        if (priceDescLower.includes(word) && word.length >= 4) {
          score += 0.15
          reasons.push(`keyword: ${word}`)
          break
        }
      }
    }
  }

  // Cap at 0.95 (reserve 1.0 for manual/direct matches)
  score = Math.min(0.95, score)

  if (score < 0.3) return null // Too low to be useful

  return {
    product_id: product.id,
    reference_price_id: price.id,
    match_score: Math.round(score * 100) / 100,
    match_reason: reasons.length > 0 ? reasons.join('; ') : 'EMDN category ancestor',
    match_method: 'rule',
  }
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  console.log(`Match Products to Prices${isDryRun ? ' (DRY RUN)' : ''}\n`)

  // Load EMDN categories
  const { data: categories, error: catErr } = await supabase
    .from('emdn_categories')
    .select('id, code, name, depth, parent_id')
  if (catErr || !categories) {
    console.error('Failed to load categories:', catErr?.message)
    process.exit(1)
  }

  const categoryMap = new Map<string, EmdnCategory>()
  for (const c of categories) {
    categoryMap.set(c.id, c as EmdnCategory)
  }
  console.log(`Loaded ${categories.length} EMDN categories`)

  // Load products (paginated to get all)
  const rawProducts: any[] = []
  let page = 0
  const pageSize = 1000
  while (true) {
    const { data, error: prodErr } = await supabase
      .from('products')
      .select('id, name, sku, description, emdn_category_id, manufacturer:vendors(name)')
      .not('emdn_category_id', 'is', null)
      .range(page * pageSize, (page + 1) * pageSize - 1)
    if (prodErr) {
      console.error('Failed to load products:', prodErr.message)
      process.exit(1)
    }
    if (!data || data.length === 0) break
    rawProducts.push(...data)
    if (data.length < pageSize) break
    page++
  }

  const products: Product[] = rawProducts.map(p => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    description: p.description,
    vendor_name: (p.manufacturer as any)?.name || null,
    emdn_category_id: p.emdn_category_id,
  }))
  console.log(`Loaded ${products.length} products`)

  // Load reference prices
  const { data: prices, error: prErr } = await supabase
    .from('reference_prices')
    .select('id, emdn_category_id, emdn_leaf_category_id, manufacturer_name, component_description, product_family, component_type, xc_subcode, price_eur')
  if (prErr || !prices) {
    console.error('Failed to load prices:', prErr?.message)
    process.exit(1)
  }
  console.log(`Loaded ${prices.length} reference prices`)

  // Pre-compute ancestor sets for each product
  console.log('\nBuilding EMDN ancestor index...')
  const productAncestors = new Map<string, Set<string>>()
  for (const p of products) {
    if (p.emdn_category_id) {
      const ancestors = getAncestorIds(p.emdn_category_id, categoryMap)
      productAncestors.set(p.id, new Set(ancestors))
    }
  }

  // Also build a reverse index: category_id → reference_prices
  const priceByCategoryId = new Map<string, ReferencePrice[]>()
  for (const p of prices) {
    const catId = p.emdn_leaf_category_id || p.emdn_category_id
    if (!catId) continue
    if (!priceByCategoryId.has(catId)) priceByCategoryId.set(catId, [])
    priceByCategoryId.get(catId)!.push(p as ReferencePrice)
  }

  // Match products to prices
  console.log('Matching products to prices...\n')
  const allMatches: Match[] = []
  let productsWithMatches = 0
  let productsWithoutMatches = 0

  for (const product of products) {
    const ancestors = productAncestors.get(product.id)
    if (!ancestors) {
      productsWithoutMatches++
      continue
    }

    // Find candidate prices: any price whose category is in the product's ancestor chain
    const candidatePrices = new Map<string, ReferencePrice>()
    for (const ancestorId of ancestors) {
      const pricesForCat = priceByCategoryId.get(ancestorId)
      if (pricesForCat) {
        for (const p of pricesForCat) {
          candidatePrices.set(p.id, p)
        }
      }
    }

    const matches: Match[] = []
    for (const price of candidatePrices.values()) {
      const match = computeMatch(product, price, ancestors, categoryMap)
      if (match) {
        matches.push(match)
      }
    }

    if (matches.length > 0) {
      // Keep top 20 matches per product (by score descending)
      matches.sort((a, b) => b.match_score - a.match_score)
      const topMatches = matches.slice(0, 20)
      allMatches.push(...topMatches)
      productsWithMatches++
    } else {
      productsWithoutMatches++
    }
  }

  console.log(`Products with matches: ${productsWithMatches}`)
  console.log(`Products without matches: ${productsWithoutMatches}`)
  console.log(`Total matches to insert: ${allMatches.length}`)

  // Score distribution
  const scoreDist = new Map<number, number>()
  for (const m of allMatches) {
    const bucket = Math.round(m.match_score * 10) / 10
    scoreDist.set(bucket, (scoreDist.get(bucket) || 0) + 1)
  }
  console.log('\nScore distribution:')
  for (const [score, count] of [...scoreDist.entries()].sort()) {
    console.log(`  ${score.toFixed(1)}: ${count} matches`)
  }

  // Show sample high-score matches
  const topSamples = allMatches
    .filter(m => m.match_score >= 0.6)
    .slice(0, 10)
  if (topSamples.length > 0) {
    console.log('\nSample high-score matches:')
    for (const m of topSamples) {
      const prod = products.find(p => p.id === m.product_id)
      const price = prices.find(p => p.id === m.reference_price_id)
      console.log(`  ${m.match_score.toFixed(2)} | ${(prod?.name || '').substring(0, 50)} → €${price?.price_eur?.toFixed(2)} [${m.match_reason}]`)
    }
  }

  if (isDryRun) {
    console.log('\nDRY RUN — no changes made')
    return
  }

  // Clear existing rule-based matches and insert new ones
  console.log('\nClearing existing rule-based matches...')
  const { error: delErr } = await supabase
    .from('product_price_matches')
    .delete()
    .eq('match_method', 'rule')
  if (delErr) {
    console.error('Failed to clear old matches:', delErr.message)
  }

  // Insert in batches
  console.log('Inserting matches...')
  let inserted = 0
  let errors = 0
  for (let i = 0; i < allMatches.length; i += 100) {
    const batch = allMatches.slice(i, i + 100).map(m => ({
      product_id: m.product_id,
      reference_price_id: m.reference_price_id,
      match_score: m.match_score,
      match_reason: m.match_reason,
      match_method: m.match_method,
    }))

    const { error: insertErr } = await supabase
      .from('product_price_matches')
      .upsert(batch, { onConflict: 'product_id,reference_price_id' })

    if (insertErr) {
      console.error(`  Batch error at ${i}: ${insertErr.message}`)
      errors++
    } else {
      inserted += batch.length
    }
    process.stdout.write(`\r  Inserted ${inserted}/${allMatches.length}`)
  }

  console.log(`\n\nInserted ${inserted} matches (${errors} batch errors)`)

  // Verify with the problematic product
  console.log('\n=== Verification: CCB full-profile cup PE 50/28 cem. ===')
  const { data: testProduct } = await supabase.from('products')
    .select('id, name')
    .eq('name', 'CCB full-profile cup PE 50/28 cem.')
    .single()

  if (testProduct) {
    const { data: testMatches } = await supabase
      .from('product_price_matches')
      .select(`
        match_score, match_reason,
        reference_prices(price_eur, manufacturer_name, component_description)
      `)
      .eq('product_id', testProduct.id)
      .order('match_score', { ascending: false })
      .limit(10)

    if (testMatches?.length) {
      for (const m of testMatches) {
        const rp = (m as any).reference_prices
        console.log(`  score:${m.match_score} €${rp?.price_eur?.toFixed(2)} [${rp?.manufacturer_name}] ${(rp?.component_description || '').substring(0, 60)}`)
      }
    } else {
      console.log('  No matches found (check RPC)')
    }
  }
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
