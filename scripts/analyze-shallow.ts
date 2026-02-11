import { readFileSync } from 'fs'

const products = JSON.parse(readFileSync('products-for-recategorization.json', 'utf-8'))

const SHALLOW_CODES = [
  'P0909', 'P090804', 'P0906', 'P090104', 'P0908', 'P090803',
  'P090905', 'P090880', 'P090904', 'P090907', 'P09090702',
  'P090906', 'P09', null
]

for (const code of SHALLOW_CODES) {
  const matching = products.filter((p: any) =>
    code === null ? !p.current_emdn_code : p.current_emdn_code === code
  )
  if (matching.length === 0) continue

  console.log(`\n=== ${code || 'UNCATEGORIZED'} — ${matching[0].current_emdn_name || 'N/A'} (${matching.length} total) ===`)
  // Show up to 40 samples
  for (const p of matching.slice(0, 40)) {
    console.log(`  ${p.name} | ${p.manufacturer || ''}`)
  }
  if (matching.length > 40) {
    console.log(`  ... and ${matching.length - 40} more`)
  }
}
