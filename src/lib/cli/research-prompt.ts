/**
 * Builds the research prompt for Claude CLI set decomposition.
 *
 * Five reliability improvements over naive estimation:
 * 1. Per-component evidence chain (cite source, not just "estimated")
 * 2. Cross-validation with existing component-scoped reference prices
 * 3. Web search for published reimbursement catalogs
 * 4. Multi-entry triangulation (use full price range, not just highest)
 * 5. Mandatory validation checklist before final output
 */

import type { SetGroupEntry, SetMatchedProduct } from '@/lib/types'

// Inline the fraction map as reference text (from component-fractions.ts)
const FRACTION_REFERENCE = `
Hip TEP Components:
- Femoral stem (P090801): 30-35% of set
- Acetabular cup (P090803): 15-20% of set
- Femoral head (P090802): 10-15% of set
- Acetabular liner (P09080399): 8-12% of set
- Dual-mobility cup (P09080305): 18-22% of set
- Femoral hemi (P090804): 40-50% of set

Knee TEP Components:
- Femoral component (P09090301): 35-40% of set
- Tibial component (P09090302): 25-30% of set
- Tibial baseplate (P0909030201): 20-25% of set
- Tibial insert (P0909030202): 10-15% of set
- Unicondylar femoral (P09090401): 40-50% of set
- Unicondylar tibial (P09090402): 35-45% of set
- Patellar (P09090702): 5-8% of set

Shoulder Components:
- Humeral (P090101): 35-45% of set
- Glenoid (P090102): 30-40% of set

Accessories:
- Augment (P09098001): 5-10% of set
- Stem extension (P09098006): 8-12% of set
`.trim()

export function buildResearchPrompt(
  groupCode: string,
  entries: SetGroupEntry[],
  matchedProducts: SetMatchedProduct[]
): string {
  // Sort entries by price descending for analysis
  const sorted = [...entries].sort((a, b) => b.price_eur - a.price_eur)
  const primary = sorted[0]

  // Compute price range across all entries
  const prices = entries.map((e) => e.price_eur)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length

  // Build entries table — ALL entries, not just one
  const entriesTable = sorted
    .map(
      (e) =>
        `| ${e.manufacturer_name || '—'} | €${e.price_eur.toFixed(0)} | ${e.price_original} ${e.currency_original} | ${e.component_description || '—'} | ${e.emdn_code || '—'} | ${e.price_scope || 'set'} |`
    )
    .join('\n')

  // Build matched products table
  const productsTable =
    matchedProducts.length > 0
      ? matchedProducts
          .slice(0, 30)
          .map(
            (mp) =>
              `| ${mp.product_name} | ${mp.product_manufacturer || '—'} | ${mp.sku || '—'} | ${mp.product_min_price != null ? `€${Math.round(mp.product_min_price)}${mp.product_offering_count > 1 ? ` (${mp.product_offering_count} offers)` : ''}` : '—'} | ${Math.round(mp.match_score * 100)}% |`
          )
          .join('\n')
      : '(No matched products)'

  return `# Task: Decompose Medical Device Set Price into Component Prices

## Context
You are analyzing reference prices from the Slovak Ministry of Health reimbursement registry. Set prices cover complete surgical kits. Procedure prices include both implant costs and surgical procedure costs.

Your task: break down the set/procedure price into individual component prices with EVIDENCE for each estimate.

## IMPORTANT: Research Strategy
Before producing the JSON output, you SHOULD:
1. **Use WebSearch** to find published reimbursement prices for individual components in European registries:
   - French LPPR/ATIH reimbursement catalog (base-donnees-publique.medicaments.gouv.fr, ameli.fr)
   - German InEK DRG catalog component prices
   - UK NHS Supply Chain orthopedic implant prices
   - Search queries like: "${primary.component_description || groupCode} implant component price reimbursement Europe"
2. **Cross-reference** matched catalog products (CZK prices ÷ 25.2 ≈ EUR) as price anchors
3. **Use fraction estimates ONLY as fallback** when no real price data is found

## Primary Set Data
- XC Code: ${groupCode}
- Description: ${primary.component_description || 'N/A'}
- Scope: ${primary.price_scope || 'set'}
- Manufacturer: ${primary.manufacturer_name || 'N/A'}
- EMDN: ${primary.emdn_code || 'N/A'}

## Price Range Across All Entries (${entries.length} entries from ${new Set(entries.map((e) => e.manufacturer_name).filter(Boolean)).size} manufacturers)
- Minimum: €${minPrice.toFixed(0)}
- Maximum: €${maxPrice.toFixed(0)}
- Average: €${avgPrice.toFixed(0)}
- Spread: ${maxPrice > 0 ? Math.round(((maxPrice - minPrice) / avgPrice) * 100) : 0}%

Use this range to produce **min/max price estimates** for each component, not just a single point value.

| Manufacturer | Price EUR | Original | Description | EMDN | Scope |
|---|---|---|---|---|---|
${entriesTable}

## Matched Catalog Products (${matchedProducts.length})
These are real products from our catalog matched to this set. Their CZK prices are HARD EVIDENCE — convert with CZK ÷ 25.2 ≈ EUR:
| Product | Manufacturer | SKU | Price | Match Score |
|---|---|---|---|---|
${productsTable}

## Component Fraction Reference (USE ONLY AS FALLBACK)
These are rough estimates. Prefer real prices from web search or catalog matches:
${FRACTION_REFERENCE}

## Evidence Types (use in "evidence_type" field)
- "catalog_product_price" — a matched catalog product price converted to EUR (STRONGEST)
- "component_reference" — an existing component-scoped reference price from another country
- "web_source" — a published price found via web search (include URL in evidence_source)
- "cross_manufacturer" — triangulated from multiple manufacturers in this group
- "fraction_estimate" — estimated from fraction ranges (WEAKEST — use only as last resort)

## Instructions
1. Identify all individual components in this set based on XC code and description
2. For EACH component: find the best evidence available (search web, check catalog prices)
3. Assign evidence_type and evidence_source for every component
4. Use the full price range (min to max across manufacturers) to produce price_range per component
5. For procedure-scoped prices, separate implant cost from procedure cost
6. Run the validation checklist BEFORE producing final output
7. Any component with only "fraction_estimate" evidence MUST have confidence "low"

## Validation Checklist (MUST complete before output)
Before outputting JSON, verify:
- [ ] Component fractions sum to 1.0 (±0.02 tolerance)
- [ ] No single component exceeds 50% of set price (flag if it does)
- [ ] If matched catalog products exist, at least one component price is within 30% of a catalog EUR equivalent
- [ ] The breakdown is clinically complete (hip TEP needs stem+cup+head+liner minimum)

## Output Format
Respond with ONLY a JSON block:
\`\`\`json
{
  "source": {
    "xc_subcode": "${groupCode}",
    "price_eur": ${primary.price_eur},
    "price_scope": "${primary.price_scope || 'set'}",
    "description": ${JSON.stringify(primary.component_description)},
    "manufacturer_name": ${JSON.stringify(primary.manufacturer_name)},
    "source_country": "${primary.source_country}"
  },
  "components": [
    {
      "component_type": "femoral_stem",
      "emdn_code": "P090801",
      "description": "Femoral stem",
      "estimated_price_eur": 1040,
      "price_range": { "min": 920, "max": 1120 },
      "fraction_of_set": 0.325,
      "confidence": "high",
      "evidence_type": "catalog_product_price",
      "evidence_source": "DePuy Corail stem CZK 26,200 = €1,040",
      "reasoning": "Matched catalog product DePuy Corail at CZK 26,200 (€1,040), confirmed by typical 30-35% fraction"
    }
  ],
  "procedure_cost": null,
  "validation": {
    "fractions_sum_to_one": true,
    "no_component_exceeds_50pct": true,
    "catalog_match_within_30pct": true,
    "clinically_complete": true,
    "notes": "All checks passed. Stem price confirmed by catalog match."
  },
  "reasoning": "Overall decomposition reasoning with key evidence sources cited...",
  "confidence": "high"
}
\`\`\`

IMPORTANT: Output ONLY the JSON block. No text before or after. The JSON must be valid and parseable.`
}
