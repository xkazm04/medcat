/**
 * Script to merge duplicate products into canonical entries.
 *
 * Products with the same (manufacturer_name, manufacturer_sku) are considered duplicates.
 * For each group of duplicates:
 * 1. Pick canonical product (most complete data, oldest created_at as tiebreaker)
 * 2. Merge non-null fields from duplicates into canonical
 * 3. Create product_offerings for each vendor/price combo
 * 4. Migrate product_price_matches to canonical product
 * 5. Delete duplicate products
 *
 * Usage: npx tsx scripts/merge-duplicate-products.ts [--dry-run]
 *
 * Options:
 *   --dry-run    Preview changes without applying them
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase credentials in .env file')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DRY_RUN = process.argv.includes('--dry-run')

interface ProductRow {
  id: string
  name: string
  sku: string
  description: string | null
  price: number | null
  vendor_id: string | null
  emdn_category_id: string | null
  material_id: string | null
  udi_di: string | null
  ce_marked: boolean
  mdr_class: string | null
  manufacturer_name: string | null
  manufacturer_sku: string | null
  created_at: string
  updated_at: string
}

/** Score a product's completeness for canonical selection */
function completenessScore(p: ProductRow): number {
  let score = 0
  if (p.description) score += 2
  if (p.emdn_category_id) score += 3
  if (p.price !== null) score += 1
  if (p.udi_di) score += 2
  if (p.ce_marked) score += 1
  if (p.mdr_class) score += 1
  if (p.material_id) score += 1
  return score
}

/** Merge non-null fields from source into target (target takes priority) */
function mergeFields(target: ProductRow, source: ProductRow): Partial<ProductRow> {
  const updates: Record<string, unknown> = {}
  const mergeableFields: (keyof ProductRow)[] = [
    'description', 'emdn_category_id', 'material_id',
    'udi_di', 'mdr_class',
  ]

  for (const field of mergeableFields) {
    if (target[field] === null && source[field] !== null) {
      updates[field] = source[field]
    }
  }

  // Merge ce_marked: true takes priority
  if (!target.ce_marked && source.ce_marked) {
    updates.ce_marked = true
  }

  return updates
}

async function main() {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`  Merge Duplicate Products`)
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE'}`)
  console.log(`${'='.repeat(60)}\n`)

  // 1. Fetch all products with manufacturer info
  const allProducts: ProductRow[] = []
  let offset = 0
  const BATCH = 1000

  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: true })
      .range(offset, offset + BATCH - 1)

    if (error) {
      console.error('Error fetching products:', error.message)
      process.exit(1)
    }
    if (!data || data.length === 0) break
    allProducts.push(...data)
    if (data.length < BATCH) break
    offset += BATCH
  }

  console.log(`Total products: ${allProducts.length}`)

  // 2. Group by (manufacturer_name, manufacturer_sku) — only where both are non-null
  const groups = new Map<string, ProductRow[]>()
  let noManufacturer = 0

  for (const p of allProducts) {
    if (!p.manufacturer_name || !p.manufacturer_sku) {
      noManufacturer++
      continue
    }
    const key = `${p.manufacturer_name.toLowerCase()}|||${p.manufacturer_sku.toLowerCase()}`
    const group = groups.get(key) || []
    group.push(p)
    groups.set(key, group)
  }

  const duplicateGroups = [...groups.entries()].filter(([, g]) => g.length > 1)

  console.log(`Products with manufacturer info: ${allProducts.length - noManufacturer}`)
  console.log(`Products without manufacturer info: ${noManufacturer} (skipped)`)
  console.log(`Unique manufacturer identities: ${groups.size}`)
  console.log(`Groups with duplicates: ${duplicateGroups.length}`)
  console.log()

  if (duplicateGroups.length === 0) {
    console.log('No duplicates found. Nothing to merge.')
    return
  }

  // 3. Process each duplicate group
  let totalMerged = 0
  let totalOfferingsCreated = 0
  let totalPriceMatchesMigrated = 0
  let totalDeleted = 0

  for (const [key, products] of duplicateGroups) {
    const [mfr, sku] = key.split('|||')

    // Sort by completeness (desc), then created_at (asc) for tiebreaker
    products.sort((a, b) => {
      const scoreDiff = completenessScore(b) - completenessScore(a)
      if (scoreDiff !== 0) return scoreDiff
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })

    const canonical = products[0]
    const duplicates = products.slice(1)

    console.log(`  Merging: "${mfr}" / "${sku}" (${products.length} products)`)
    console.log(`    Canonical: ${canonical.id} "${canonical.name}"`)

    // Merge fields from duplicates into canonical
    let mergedUpdates: Record<string, unknown> = {}
    for (const dup of duplicates) {
      const updates = mergeFields(canonical, dup)
      mergedUpdates = { ...mergedUpdates, ...updates }
      console.log(`    Duplicate: ${dup.id} "${dup.name}" (vendor: ${dup.vendor_id || 'none'})`)
    }

    if (!DRY_RUN) {
      // Update canonical product with merged fields
      if (Object.keys(mergedUpdates).length > 0) {
        const { error } = await supabase
          .from('products')
          .update(mergedUpdates)
          .eq('id', canonical.id)

        if (error) {
          console.error(`    Error updating canonical: ${error.message}`)
          continue
        }
      }

      // Create product_offerings for each product's vendor/price
      for (const p of products) {
        if (!p.vendor_id) continue

        // Check if offering already exists (from migration 020)
        const { data: existing } = await supabase
          .from('product_offerings')
          .select('id')
          .eq('product_id', canonical.id)
          .eq('vendor_id', p.vendor_id)
          .maybeSingle()

        if (!existing) {
          const { error } = await supabase
            .from('product_offerings')
            .insert({
              product_id: canonical.id,
              vendor_id: p.vendor_id,
              vendor_sku: p.sku,
              vendor_price: p.price,
              is_primary: p.id === canonical.id,
            })

          if (error) {
            // Could be duplicate constraint — already created for this product_id+vendor_id
            if (!error.message.includes('duplicate')) {
              console.error(`    Error creating offering: ${error.message}`)
            }
          } else {
            totalOfferingsCreated++
          }
        }
      }

      // Migrate product_price_matches from duplicates to canonical
      for (const dup of duplicates) {
        const { data: matches } = await supabase
          .from('product_price_matches')
          .select('id, reference_price_id')
          .eq('product_id', dup.id)

        if (matches && matches.length > 0) {
          for (const match of matches) {
            // Check if canonical already has this reference price match
            const { data: existingMatch } = await supabase
              .from('product_price_matches')
              .select('id')
              .eq('product_id', canonical.id)
              .eq('reference_price_id', match.reference_price_id)
              .maybeSingle()

            if (!existingMatch) {
              const { error } = await supabase
                .from('product_price_matches')
                .update({ product_id: canonical.id })
                .eq('id', match.id)

              if (!error) totalPriceMatchesMigrated++
            } else {
              // Delete duplicate match
              await supabase
                .from('product_price_matches')
                .delete()
                .eq('id', match.id)
            }
          }
        }
      }

      // Delete offerings that pointed to duplicate product_ids
      for (const dup of duplicates) {
        await supabase
          .from('product_offerings')
          .delete()
          .eq('product_id', dup.id)
      }

      // Delete duplicate products
      for (const dup of duplicates) {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', dup.id)

        if (error) {
          console.error(`    Error deleting duplicate ${dup.id}: ${error.message}`)
        } else {
          totalDeleted++
        }
      }
    }

    totalMerged++
  }

  // 4. Summary
  console.log(`\n${'='.repeat(60)}`)
  console.log(`  Summary${DRY_RUN ? ' (DRY RUN)' : ''}`)
  console.log(`${'='.repeat(60)}`)
  console.log(`  Groups merged: ${totalMerged}`)
  console.log(`  Products deleted: ${totalDeleted}`)
  console.log(`  Offerings created: ${totalOfferingsCreated}`)
  console.log(`  Price matches migrated: ${totalPriceMatchesMigrated}`)
  console.log()
}

main().catch(console.error)
