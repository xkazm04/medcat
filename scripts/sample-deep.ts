import { readFileSync } from 'fs'

const products = JSON.parse(readFileSync('products-for-recategorization.json', 'utf-8'))

// P0909 — need to see more variety (skip first 40 which are all ART SURF)
const p0909 = products.filter((p: any) => p.current_emdn_code === 'P0909')
console.log(`=== P0909 unique prefixes (${p0909.length} total) ===`)
const prefixes = new Map<string, number>()
for (const p of p0909) {
  const prefix = (p.name as string).substring(0, 20)
  prefixes.set(prefix, (prefixes.get(prefix) || 0) + 1)
}
const sorted = [...prefixes.entries()].sort((a, b) => b[1] - a[1])
for (const [prefix, count] of sorted.slice(0, 40)) {
  console.log(`  ${count.toString().padStart(4)}x  ${prefix}...`)
}

// Show unique product names (dedup by first word patterns)
console.log(`\n=== P0909 diverse samples ===`)
const seen = new Set<string>()
for (const p of p0909) {
  const key = (p.name as string).split(' ').slice(0, 3).join(' ')
  if (!seen.has(key)) {
    seen.add(key)
    console.log(`  ${p.name} | ${p.manufacturer || ''}`)
  }
}

// P090804 diverse samples
console.log(`\n=== P090804 diverse samples ===`)
const p090804 = products.filter((p: any) => p.current_emdn_code === 'P090804')
const seen2 = new Set<string>()
for (const p of p090804) {
  const key = (p.name as string).split(' ').slice(0, 3).join(' ')
  if (!seen2.has(key)) {
    seen2.add(key)
    console.log(`  ${p.name} | ${p.manufacturer || ''}`)
  }
}

// P090906 diverse samples
console.log(`\n=== P090906 diverse samples ===`)
const p090906 = products.filter((p: any) => p.current_emdn_code === 'P090906')
const seen3 = new Set<string>()
for (const p of p090906) {
  const key = (p.name as string).split(' ').slice(0, 3).join(' ')
  if (!seen3.has(key)) {
    seen3.add(key)
    console.log(`  ${p.name} | ${p.manufacturer || ''}`)
  }
}
