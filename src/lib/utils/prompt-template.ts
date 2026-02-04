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

  // === OUTPUT FORMAT (strict) ===
  sections.push('## Required Output Format')
  sections.push('')
  sections.push('Return exactly this table format with 3-5 alternatives:')
  sections.push('')
  sections.push('| Manufacturer | Product | REF | Price EUR | EU Distributor |')
  sections.push('|--------------|---------|-----|-----------|----------------|')
  sections.push('| [Company] | [Name] | [SKU] | [Price or "On request"] | [Contact/URL] |')
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

