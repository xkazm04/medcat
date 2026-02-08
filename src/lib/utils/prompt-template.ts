import type { ProductWithRelations } from '@/lib/types'

/**
 * Generate a structured research prompt for finding alternative medical devices
 * and EU pricing. Designed for consistent outputs from AI tools.
 */
export function generateResearchPrompt(product: ProductWithRelations): string {
  const emdnCode = product.emdn_category?.code || null
  const emdnName = product.emdn_category?.name || null

  const sections: string[] = []

  // === TASK DEFINITION ===
  sections.push('# Task: Find Alternative Medical Devices with EU Pricing')
  sections.push('')
  sections.push('Search for **alternative products from different manufacturers** that are functionally equivalent to the reference product below. Return results in the exact table format specified.')
  sections.push('')

  // === REFERENCE PRODUCT (compact) ===
  sections.push('## Reference Product')
  sections.push('')
  sections.push(`- **Name:** ${product.name}`)
  sections.push(`- **SKU:** ${product.sku}`)
  if (product.manufacturer_name) {
    sections.push(`- **Manufacturer:** ${product.manufacturer_name}`)
  }
  if (emdnCode) {
    sections.push(`- **EMDN Code:** ${emdnCode}`)
    sections.push(`- **EMDN Category:** ${emdnName}`)
  }
  if (product.mdr_class) {
    sections.push(`- **MDR Class:** ${product.mdr_class}`)
  }
  sections.push('')

  // === SEARCH CRITERIA (explicit) ===
  sections.push('## Search Criteria')
  sections.push('')

  if (emdnCode) {
    sections.push(`1. **EMDN Code ${emdnCode}** - Search EUDAMED for devices with this exact code or parent category`)
  } else {
    sections.push('1. **Device Type** - Search for same intended use based on product name')
  }

  sections.push('2. **Different Manufacturer** - Exclude products from the same manufacturer')
  sections.push('3. **CE Marked** - Only include products with valid EU market authorization')
  sections.push('4. **Available in EU** - Must have EU distributor or direct sales')
  sections.push('')

  // === DATABASES TO SEARCH ===
  sections.push('## Search These Databases')
  sections.push('')
  if (emdnCode) {
    sections.push(`1. **EUDAMED** (search.eudamed.com) → Search EMDN code: ${emdnCode}`)
  } else {
    sections.push('1. **EUDAMED** (search.eudamed.com) → Search by device name')
  }
  sections.push('2. **MedicalExpo** (medicalexpo.com) → Manufacturer directory')
  sections.push('3. **Manufacturer websites** → Stryker, Zimmer Biomet, DePuy Synthes, Smith+Nephew, B. Braun')
  sections.push('')

  // === PRICING REGISTRIES ===
  sections.push('## Pricing Registries to Search')
  sections.push('')
  if (emdnCode) {
    sections.push(`1. **France LPPR** (legifrance.gouv.fr) → Search LPP tariff for EMDN code ${emdnCode}`)
    sections.push('   - Look for "Liste des Produits et Prestations" tariff entries')
    sections.push('   - Include LPP code and reimbursement amount in EUR')
  } else {
    sections.push('1. **France LPPR** (legifrance.gouv.fr) → Search reimbursement tariffs by device type')
  }
  sections.push('2. **Slovakia MZ SR** (kategorizacia.mzsr.sk) → Search device category reimbursement')
  sections.push('   - Look for XC2.* category codes matching the device type')
  sections.push('3. **Czech Tenders** (cz.openprocurements.com) → CPV 33183100 orthopedic device tenders')
  sections.push('   - Search recent procurement results for similar devices')
  sections.push('4. **EU TED** (ted.europa.eu) → Framework agreements with unit prices')
  sections.push('   - Search CPV 33183100 in recent contract award notices')
  sections.push('')

  // === OUTPUT FORMAT (strict) ===
  sections.push('## Required Output Format')
  sections.push('')
  sections.push('Return exactly this table format with 3-5 alternatives:')
  sections.push('')
  sections.push('| Manufacturer | Product | REF | Price EUR | EU Distributor |')
  sections.push('|--------------|---------|-----|-----------|----------------|')
  sections.push('| [Company] | [Name] | [SKU] | [Price or "On request"] | [Contact/URL] |')
  sections.push('')

  // === PRICING OUTPUT FORMAT ===
  sections.push('## Pricing Data Format')
  sections.push('')
  sections.push('If pricing data is found in registries or tenders, include this additional table:')
  sections.push('')
  sections.push('| Country | Source | Code | Price EUR | Type | URL |')
  sections.push('|---------|--------|------|-----------|------|-----|')
  sections.push('| [CC] | [Registry name] | [LPP/XC2/CPV code] | [Amount] | [reimbursement/tender] | [Source URL] |')
  sections.push('')

  // === CONSTRAINTS ===
  sections.push('## Constraints')
  sections.push('')
  sections.push('- Only CE-marked products')
  sections.push('- Only products currently available in EU market')
  sections.push('- Include pricing if publicly available, otherwise "On request"')
  sections.push('- Prioritize Czech Republic and Central Europe distributors')
  if (emdnCode) {
    sections.push(`- Products must match EMDN ${emdnCode} or equivalent classification`)
  }

  return sections.join('\n')
}

