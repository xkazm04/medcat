import { readFileSync } from 'fs'
const products = JSON.parse(readFileSync('products-for-recategorization.json', 'utf-8'))

// Check: products at P0908030401 being reclassified to shoulder (SMR match)
console.log('=== P0908030401 (PE inserts) with SMR in name ===')
const peInserts = products.filter((p: any) => p.current_emdn_code === 'P0908030401')
for (const p of peInserts.filter((p: any) => /smr/i.test(p.name))) {
  console.log(`  ${p.name} | ${p.manufacturer}`)
}

// Check: products at P0908040101 being reclassified to shoulder
console.log('\n=== P0908040101 (cemented stems) with SMR/shoulder in name ===')
const cemStems = products.filter((p: any) => p.current_emdn_code === 'P0908040101')
for (const p of cemStems.filter((p: any) => /smr|shoulder|humeral/i.test(p.name))) {
  console.log(`  ${p.name} | ${p.manufacturer}`)
}

// Check: products at P0908040102 being reclassified to shoulder
console.log('\n=== P0908040102 (uncemented stems) with SMR/shoulder in name ===')
const uncemStems = products.filter((p: any) => p.current_emdn_code === 'P0908040102')
for (const p of uncemStems.filter((p: any) => /smr|shoulder|humeral/i.test(p.name))) {
  console.log(`  ${p.name} | ${p.manufacturer}`)
}

// Check: P0909800602 products being reclassified to unicompartmental
console.log('\n=== P0909800602 (knee tibial stems) with ZUK/OXF in name ===')
const tibStems = products.filter((p: any) => p.current_emdn_code === 'P0909800602')
for (const p of tibStems.filter((p: any) => /zuk|oxf|unicompartmental/i.test(p.name))) {
  console.log(`  ${p.name} | ${p.manufacturer}`)
}

// Also check: what are those 60 products?
console.log('\n=== ALL P0909800602 products (diverse) ===')
const seen = new Set<string>()
for (const p of tibStems) {
  const key = (p.name as string).split(' ').slice(0, 4).join(' ')
  if (!seen.has(key)) {
    seen.add(key)
    console.log(`  ${p.name} | ${p.manufacturer}`)
  }
}

// Check: P090804050202 (metal heads) → P0908040503 (bi-articular cups): 17 products
console.log('\n=== P090804050202 (metal heads) with bi-articular pattern ===')
const metalHeads = products.filter((p: any) => p.current_emdn_code === 'P090804050202')
for (const p of metalHeads.filter((p: any) => /bi.?articular|bipolar/i.test(p.name))) {
  console.log(`  ${p.name} | ${p.manufacturer}`)
}

// Check: P090803010201 → P09120601 (screws): 8 products
console.log('\n=== P090803010201 (uncemented cups) matching screw patterns ===')
const uncemCups = products.filter((p: any) => p.current_emdn_code === 'P090803010201')
for (const p of uncemCups.filter((p: any) => /screw|scr\b/i.test(p.name))) {
  console.log(`  ${p.name} | ${p.manufacturer}`)
}
