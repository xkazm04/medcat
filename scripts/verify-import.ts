/**
 * Verify the Borndigital import
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function verify() {
  console.log('🔍 Verifying import...\n')

  // Count products
  const { count: productCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })

  console.log(`📊 Total products in database: ${productCount}`)
  console.log(`📄 Expected from CSV: 2581`)
  console.log(`✓ Match: ${productCount === 2581 ? 'YES' : 'NO'}\n`)

  // Count vendors
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, name')

  console.log(`👥 Vendors (${vendors?.length || 0}):`)
  if (vendors) {
    for (const vendor of vendors) {
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendor.id)
      console.log(`   - ${vendor.name}: ${count} products`)
    }
  }

  // Sample products
  const { data: samples } = await supabase
    .from('products')
    .select('name, sku, manufacturer_name, vendor:vendors(name)')
    .limit(5)

  console.log(`\n📦 Sample Products:`)
  if (samples) {
    samples.forEach((p: any, i: number) => {
      console.log(`\n   ${i + 1}. ${p.name}`)
      console.log(`      SKU: ${p.sku}`)
      console.log(`      Manufacturer: ${p.manufacturer_name || 'N/A'}`)
      console.log(`      Vendor: ${p.vendor?.name || 'N/A'}`)
    })
  }
}

verify().catch(console.error)
