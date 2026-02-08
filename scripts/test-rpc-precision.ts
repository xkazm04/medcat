import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env' })

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  // Find the problematic product
  const { data: p } = await s.from('products')
    .select('id, name, emdn_category_id')
    .eq('name', 'CCB full-profile cup PE 50/28 cem.')
    .single()

  if (!p) {
    console.log('Product not found')
    return
  }

  console.log('Product:', p.name)
  console.log('EMDN category:', p.emdn_category_id)

  // Get EMDN category details
  const { data: cat } = await s.from('emdn_categories')
    .select('code, name, depth')
    .eq('id', p.emdn_category_id)
    .single()
  console.log('Category:', cat?.code, 'd' + cat?.depth, cat?.name)

  // Call the new precision RPC
  const { data: rpc, error } = await s.rpc('get_reference_prices', {
    p_product_id: p.id,
    p_emdn_category_id: p.emdn_category_id
  })

  if (error) {
    console.log('RPC error:', error.message)
    return
  }

  console.log('\nRPC returned:', rpc?.length, 'prices (was 276 before)')

  if (rpc?.length) {
    const prices = rpc.map((r: any) => r.price_eur)
    console.log('Range:', Math.min(...prices).toFixed(2), '–', Math.max(...prices).toFixed(2), 'EUR')
    console.log('(Was: 167.99 – 19,845.00 EUR)')

    // Group by match_type
    const byType = new Map<string, any[]>()
    for (const r of rpc) {
      const t = r.match_type
      if (!byType.has(t)) byType.set(t, [])
      byType.get(t)!.push(r)
    }

    console.log('\nBy match type:')
    for (const [type, items] of byType) {
      const itemPrices = items.map((i: any) => i.price_eur)
      console.log(`  ${type}: ${items.length} prices, €${Math.min(...itemPrices).toFixed(2)}–€${Math.max(...itemPrices).toFixed(2)}`)
    }

    console.log('\nAll prices:')
    for (const r of rpc.slice(0, 20)) {
      console.log(`  €${r.price_eur?.toFixed(2).padStart(10)} [${r.match_type}] score:${r.match_score} cat:${r.category_code} d${r.category_depth} | ${(r.component_description || '').substring(0, 60)}`)
    }
    if (rpc.length > 20) {
      console.log(`  ... and ${rpc.length - 20} more`)
    }
  }
}

main().catch(console.error)
