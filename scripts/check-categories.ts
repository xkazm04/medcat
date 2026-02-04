/**
 * Check category assignments in the database
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function check() {
  console.log('🔍 Checking category assignments...\n')

  // Count products with/without categories
  const { count: totalProducts } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })

  const { count: withCategory } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .not('emdn_category_id', 'is', null)

  const { count: withoutCategory } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .is('emdn_category_id', null)

  console.log(`📊 Product Category Status:`)
  console.log(`   Total products: ${totalProducts}`)
  console.log(`   With category: ${withCategory}`)
  console.log(`   Without category: ${withoutCategory}`)
  console.log(`   Coverage: ${((withCategory || 0) / (totalProducts || 1) * 100).toFixed(1)}%`)

  // Check which categories are actually used
  const { data: usedCategories } = await supabase
    .from('products')
    .select('emdn_category_id')
    .not('emdn_category_id', 'is', null)

  const uniqueCategoryIds = [...new Set(usedCategories?.map(p => p.emdn_category_id) || [])]
  console.log(`\n📁 Used Categories: ${uniqueCategoryIds.length}`)

  if (uniqueCategoryIds.length > 0) {
    const { data: categoryDetails } = await supabase
      .from('emdn_categories')
      .select('id, code, name')
      .in('id', uniqueCategoryIds)

    console.log('\n   Categories in use:')
    categoryDetails?.forEach(c => {
      console.log(`   - ${c.code}: ${c.name}`)
    })
  }

  // Check the specific category from the URL
  const testCategoryId = 'fc00ca61-9e2f-4288-ab66-19b6307a2567'
  const { data: testCategory } = await supabase
    .from('emdn_categories')
    .select('id, code, name')
    .eq('id', testCategoryId)
    .single()

  console.log(`\n🔎 Test Category (${testCategoryId}):`)
  if (testCategory) {
    console.log(`   Code: ${testCategory.code}`)
    console.log(`   Name: ${testCategory.name}`)

    const { count: productsInCategory } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('emdn_category_id', testCategoryId)

    console.log(`   Products directly in this category: ${productsInCategory}`)
  } else {
    console.log(`   Category not found!`)
  }

  // Check total EMDN categories in database
  const { count: totalCategories } = await supabase
    .from('emdn_categories')
    .select('*', { count: 'exact', head: true })

  console.log(`\n📚 Total EMDN categories in database: ${totalCategories}`)

  // Sample products without categories
  const { data: sampleUncategorized } = await supabase
    .from('products')
    .select('name, sku')
    .is('emdn_category_id', null)
    .limit(5)

  if (sampleUncategorized && sampleUncategorized.length > 0) {
    console.log(`\n📦 Sample uncategorized products:`)
    sampleUncategorized.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.name} (SKU: ${p.sku})`)
    })
  }
}

check().catch(console.error)
