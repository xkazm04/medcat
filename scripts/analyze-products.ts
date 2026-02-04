/**
 * Analyze product names to understand patterns for categorization
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function analyze() {
  console.log('🔍 Analyzing product data for categorization patterns...\n')

  // Get all products
  const { data: products } = await supabase
    .from('products')
    .select('name, sku, manufacturer_name')
    .order('name')

  if (!products) {
    console.log('No products found')
    return
  }

  // Analyze name patterns
  const patterns: Record<string, string[]> = {}
  const keywords = [
    // Hip
    'hip', 'acetabul', 'femoral', 'femur',
    // Knee
    'knee', 'tibial', 'tibia', 'patella',
    // Elbow
    'elbow', 'humeral', 'humerus', 'ulna', 'radial',
    // Shoulder
    'shoulder', 'glenoid', 'humeral head',
    // Ankle/Foot
    'ankle', 'talus', 'calcaneus',
    // Spine
    'spine', 'spinal', 'vertebr', 'disc', 'cage', 'pedicle',
    // Trauma/Osteosynthesis
    'plate', 'screw', 'nail', 'pin', 'wire', 'staple',
    // General implants
    'stem', 'cup', 'liner', 'head', 'insert', 'bearing',
    // Materials
    'titanium', 'ceramic', 'polyethylene', 'pe ', 'cobalt', 'chrome',
    // Cement
    'cement', 'cem.', 'cem ',
    // Sizes
    'standard', 'revision', 'primary',
  ]

  keywords.forEach(kw => patterns[kw] = [])

  products.forEach(p => {
    const nameLower = p.name.toLowerCase()
    keywords.forEach(kw => {
      if (nameLower.includes(kw)) {
        if (patterns[kw].length < 3) {
          patterns[kw].push(p.name)
        }
      }
    })
  })

  // Count by keyword
  const counts: Record<string, number> = {}
  keywords.forEach(kw => {
    counts[kw] = products.filter(p => p.name.toLowerCase().includes(kw)).length
  })

  console.log('📊 Keyword Analysis (count | keyword | examples):')
  console.log('─'.repeat(80))

  // Sort by count
  const sortedKeywords = Object.entries(counts)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])

  sortedKeywords.forEach(([kw, count]) => {
    console.log(`\n${count.toString().padStart(4)} | "${kw}"`)
    patterns[kw].slice(0, 2).forEach(ex => {
      console.log(`       └─ ${ex.substring(0, 70)}${ex.length > 70 ? '...' : ''}`)
    })
  })

  // Analyze by manufacturer
  console.log('\n\n📦 Products by Manufacturer:')
  console.log('─'.repeat(80))

  const byManufacturer: Record<string, number> = {}
  products.forEach(p => {
    const mfr = p.manufacturer_name || 'Unknown'
    byManufacturer[mfr] = (byManufacturer[mfr] || 0) + 1
  })

  Object.entries(byManufacturer)
    .sort((a, b) => b[1] - a[1])
    .forEach(([mfr, count]) => {
      console.log(`${count.toString().padStart(4)} | ${mfr}`)
    })

  // Get sample products for each major category
  console.log('\n\n🏷️  Sample Products by Detected Category:')
  console.log('─'.repeat(80))

  const categoryPatterns = [
    { name: 'HIP', patterns: ['hip', 'acetabul', 'femoral stem', 'femur'] },
    { name: 'KNEE', patterns: ['knee', 'tibial', 'patella'] },
    { name: 'ELBOW', patterns: ['elbow', 'ulna', 'humeral'] },
    { name: 'SHOULDER', patterns: ['shoulder', 'glenoid'] },
    { name: 'ANKLE', patterns: ['ankle', 'talus'] },
    { name: 'SPINE', patterns: ['spine', 'spinal', 'vertebr', 'disc', 'cage'] },
    { name: 'TRAUMA/PLATES', patterns: ['plate'] },
    { name: 'TRAUMA/SCREWS', patterns: ['screw'] },
    { name: 'TRAUMA/NAILS', patterns: ['nail'] },
  ]

  for (const cat of categoryPatterns) {
    const matching = products.filter(p => {
      const nameLower = p.name.toLowerCase()
      return cat.patterns.some(pattern => nameLower.includes(pattern))
    })
    console.log(`\n${cat.name} (${matching.length} products):`)
    matching.slice(0, 3).forEach(p => {
      console.log(`  - ${p.name.substring(0, 65)}${p.name.length > 65 ? '...' : ''}`)
    })
  }

  // Get EMDN categories
  console.log('\n\n📚 Available EMDN Categories (P09 branch):')
  console.log('─'.repeat(80))

  const { data: categories } = await supabase
    .from('emdn_categories')
    .select('id, code, name')
    .like('code', 'P09%')
    .order('code')

  categories?.forEach(cat => {
    console.log(`${cat.code.padEnd(10)} | ${cat.name}`)
  })
}

analyze().catch(console.error)
