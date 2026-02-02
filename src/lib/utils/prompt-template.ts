import type { ProductWithRelations } from '@/lib/types'

export function generateResearchPrompt(product: ProductWithRelations): string {
  const lines: string[] = []

  lines.push('Find EU medical device distributors and pricing for:')
  lines.push('')
  lines.push(`Product: ${product.name}`)

  if (product.manufacturer_name) {
    lines.push(`Manufacturer: ${product.manufacturer_name}`)
  }
  if (product.manufacturer_sku) {
    lines.push(`Manufacturer Part Number: ${product.manufacturer_sku}`)
  }
  if (product.sku && product.vendor?.name) {
    lines.push(`Known as SKU "${product.sku}" at ${product.vendor.name}`)
  }
  if (product.description) {
    const truncatedDesc =
      product.description.length > 200
        ? product.description.slice(0, 200) + '...'
        : product.description
    lines.push(`Description: ${truncatedDesc}`)
  }
  if (product.emdn_category?.name) {
    lines.push(`EMDN Category: ${product.emdn_category.name}`)
  }
  if (product.material?.name) {
    lines.push(`Material: ${product.material.name}`)
  }
  if (product.mdr_class) {
    lines.push(`MDR Classification: Class ${product.mdr_class}`)
  }
  if (product.ce_marked) {
    lines.push(`CE Marked: Yes`)
  }
  if (product.udi_di) {
    lines.push(`UDI-DI: ${product.udi_di}`)
  }

  lines.push('')
  lines.push('Please provide:')
  lines.push('1. EU distributors/vendors that sell this exact product')
  lines.push('2. Current pricing in EUR with vendor contact details')
  lines.push('3. Alternative equivalent products if exact match unavailable')
  lines.push('')
  lines.push('Focus on Czech Republic and surrounding EU countries.')

  return lines.join('\n')
}
