/**
 * Analyze unmatched products to improve categorization rules
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function analyze() {
  // Get products still without category
  const { data: products } = await supabase
    .from('products')
    .select('name')
    .is('emdn_category_id', null)
    .order('name')

  if (!products) return

  console.log(`📦 ${products.length} products still uncategorized\n`)

  // Extract common patterns
  const words = new Map<string, number>()

  products.forEach(p => {
    // Split into words and count
    const nameWords = p.name.toUpperCase().split(/[\s\-\/\(\)]+/)
    nameWords.forEach((w: string) => {
      if (w.length > 2) {
        words.set(w, (words.get(w) || 0) + 1)
      }
    })
  })

  // Sort by frequency
  const sorted = [...words.entries()].sort((a, b) => b[1] - a[1])

  console.log('📊 Most common words in unmatched products:')
  sorted.slice(0, 40).forEach(([word, count]) => {
    console.log(`${count.toString().padStart(4)} | ${word}`)
  })

  // Show samples of common patterns
  console.log('\n\n📋 Sample unmatched products by pattern:')

  const patterns = [
    { name: 'ALLOFIT', pattern: /allofit/i },
    { name: 'SHELL', pattern: /shell/i },
    { name: 'TIB (tibial)', pattern: /\btib\b/i },
    { name: 'FEM (femoral)', pattern: /\bfem\b/i },
    { name: 'DRILL', pattern: /drill/i },
    { name: 'AUG (augment)', pattern: /\baug\b/i },
    { name: 'PLUS/+', pattern: /plus|\+/i },
    { name: 'SIZE/SZ', pattern: /\bsz\b|\bsize\b/i },
    { name: 'ADAPTOR', pattern: /adapt/i },
    { name: 'PLUG', pattern: /plug/i },
    { name: 'CENTRALIZER', pattern: /central/i },
    { name: 'TAPER', pattern: /taper/i },
    { name: 'SLEEVE', pattern: /sleeve/i },
    { name: 'OFFSET', pattern: /offset/i },
    { name: 'MODULAR', pattern: /modular/i },
  ]

  for (const p of patterns) {
    const matches = products.filter(prod => p.pattern.test(prod.name))
    if (matches.length > 0) {
      console.log(`\n${p.name} (${matches.length}):`)
      matches.slice(0, 3).forEach(m => {
        console.log(`  └─ ${m.name.substring(0, 70)}`)
      })
    }
  }
}

analyze().catch(console.error)
