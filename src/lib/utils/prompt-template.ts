import type { ProductWithRelations } from '@/lib/types'

/**
 * Generate a comprehensive research prompt for finding alternative medical devices
 * and EU pricing using authoritative databases and nomenclature systems.
 */
export function generateResearchPrompt(product: ProductWithRelations): string {
  const sections: string[] = []

  // === HEADER ===
  sections.push('# Medical Device Alternative Products & EU Pricing Research')
  sections.push('')

  // === REFERENCE PRODUCT ===
  sections.push('## Reference Product')
  sections.push('')
  sections.push(`**Product Name:** ${product.name}`)

  if (product.manufacturer_name) {
    sections.push(`**Manufacturer:** ${product.manufacturer_name}`)
  }
  if (product.manufacturer_sku) {
    sections.push(`**Manufacturer SKU/REF:** ${product.manufacturer_sku}`)
  }
  if (product.sku && product.vendor?.name) {
    sections.push(`**Vendor Reference:** ${product.sku} (${product.vendor.name})`)
  }

  sections.push('')

  // === CLASSIFICATION IDENTIFIERS ===
  sections.push('## Classification & Material Identifiers')
  sections.push('')

  if (product.emdn_category?.code) {
    sections.push(`**EMDN Code:** ${product.emdn_category.code}`)
  }
  if (product.emdn_category?.name) {
    sections.push(`**EMDN Category:** ${product.emdn_category.name}`)
  }
  if (product.emdn_category?.path) {
    sections.push(`**EMDN Path:** ${product.emdn_category.path}`)
  }
  if (product.material?.name) {
    sections.push(`**Material Composition:** ${product.material.name}`)
  }
  if (product.mdr_class) {
    sections.push(`**MDR Risk Class:** ${product.mdr_class}`)
  }
  if (product.udi_di) {
    sections.push(`**UDI-DI:** ${product.udi_di}`)
  }
  if (product.ce_marked) {
    sections.push(`**CE Marked:** Yes`)
  }

  if (product.description) {
    sections.push('')
    const truncatedDesc = product.description.length > 300
      ? product.description.slice(0, 300) + '...'
      : product.description
    sections.push(`**Description:** ${truncatedDesc}`)
  }

  sections.push('')

  // === SEARCH INSTRUCTIONS ===
  sections.push('## Search Instructions')
  sections.push('')
  sections.push('Find **alternative products from different manufacturers** that match:')
  sections.push('')

  if (product.emdn_category?.code) {
    sections.push(`1. **Same EMDN classification** (${product.emdn_category.code}) - search EUDAMED database`)
  } else {
    sections.push('1. **Same device type/intended use** based on product description')
  }

  if (product.material?.name) {
    sections.push(`2. **Same or equivalent material composition:** ${product.material.name}`)
  } else {
    sections.push('2. **Compatible material composition** for the intended use')
  }

  sections.push('3. **Same MDR risk classification** for regulatory equivalence')
  sections.push('4. **CE marked** for EU market authorization')
  sections.push('')

  // === AUTHORITATIVE SOURCES ===
  sections.push('## Authoritative Sources to Search')
  sections.push('')
  sections.push('**EU Regulatory Databases:**')
  sections.push('- EUDAMED Public Database (https://search.eudamed.com/) - Search by EMDN code, manufacturer, device type')
  sections.push('- EMDN Browser (https://webgate.ec.europa.eu/dyna2/emdn/) - Find related device categories')
  sections.push('')
  sections.push('**Industry Resources:**')
  sections.push('- MedicalExpo (https://www.medicalexpo.com/) - Medical device manufacturer directory')
  sections.push('- UK National Joint Registry - Implant benchmarking data')
  sections.push('- GMDN Agency - Cross-reference nomenclature for equivalent devices')
  sections.push('')

  // === MAJOR MANUFACTURERS TO CHECK ===
  sections.push('**Major Orthopedic/Medical Device Manufacturers to Check:**')
  sections.push('- Stryker, DePuy Synthes (J&J), Zimmer Biomet, Smith+Nephew, Medtronic')
  sections.push('- EU manufacturers: B. Braun, Königsee Implantate, ImplanTec, aap Implantate')
  sections.push('')

  // === OUTPUT FORMAT ===
  sections.push('## Required Output Format')
  sections.push('')
  sections.push('Provide results as a **comparison table** with these columns:')
  sections.push('')
  sections.push('| Manufacturer | Product Name | REF/SKU | Material | MDR Class | EU Price (EUR) | Source/Contact |')
  sections.push('|--------------|--------------|---------|----------|-----------|----------------|----------------|')
  sections.push('')
  sections.push('**For each alternative product include:**')
  sections.push('- Manufacturer name and country')
  sections.push('- Exact product name and reference number')
  sections.push('- Material composition (must match or be equivalent)')
  sections.push('- MDR risk classification')
  sections.push('- EU list price or hospital procurement price if available')
  sections.push('- Source URL or distributor contact for Czech Republic/Central Europe')
  sections.push('')

  // === GEOGRAPHIC FOCUS ===
  sections.push('## Geographic Priority')
  sections.push('')
  sections.push('1. **Czech Republic** - primary market')
  sections.push('2. **Central Europe** - Germany, Austria, Poland, Slovakia')
  sections.push('3. **EU-wide** distributors with CE marking')
  sections.push('')

  // === NOTES ===
  sections.push('## Important Notes')
  sections.push('')
  sections.push('- Only include CE-marked products authorized for EU market')
  sections.push('- Verify EMDN/GMDN classification matches for regulatory equivalence')
  sections.push('- Include only products with same or superior material properties')
  sections.push('- If exact pricing unavailable, indicate "Price on request" with contact')
  sections.push('- Exclude products without verifiable EU market authorization')

  return sections.join('\n')
}

/**
 * Generate a shorter prompt variant for quick searches
 */
export function generateQuickSearchPrompt(product: ProductWithRelations): string {
  const parts: string[] = []

  parts.push(`Find EU alternatives for: ${product.name}`)

  if (product.manufacturer_name) {
    parts.push(`Current manufacturer: ${product.manufacturer_name}`)
  }
  if (product.emdn_category?.code) {
    parts.push(`EMDN: ${product.emdn_category.code} (${product.emdn_category.name})`)
  }
  if (product.material?.name) {
    parts.push(`Material: ${product.material.name}`)
  }

  parts.push('')
  parts.push('Search EUDAMED for same EMDN code. List alternatives in table format with: Manufacturer | Product | REF | Price EUR | Distributor')
  parts.push('Focus on Czech Republic and Central Europe.')

  return parts.join('\n')
}
