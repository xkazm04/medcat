/**
 * Script to import data from Data Borndigital CSV
 *
 * Usage: npx tsx scripts/import-borndigital.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'
import { config } from 'dotenv'

// Load environment variables from .env file
config()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase credentials in .env file')
  process.exit(1)
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

interface CSVRow {
  'Supplier_Name': string
  'CFN (REF)': string
  'Material_Description': string
  'Manufacturer Name': string
}

async function clearDatabase() {
  console.log('🗑️  Clearing existing products...')
  const { error, count } = await supabase
    .from('products')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

  if (error) {
    console.error('Error clearing products:', error)
    throw error
  }

  console.log(`✓ Deleted ${count || 0} existing products`)
}

async function getOrCreateVendor(vendorName: string): Promise<string> {
  // Check if vendor exists
  const { data: existing } = await supabase
    .from('vendors')
    .select('id')
    .eq('name', vendorName)
    .single()

  if (existing) {
    return existing.id
  }

  // Create new vendor
  const { data: newVendor, error } = await supabase
    .from('vendors')
    .insert({ name: vendorName })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating vendor:', error)
    throw error
  }

  return newVendor!.id
}

async function importCSV() {
  const csvPath = path.join(process.cwd(), 'docs', 'Data Borndigital(Sheet1).csv')

  console.log('📁 Reading CSV file...')
  const fileContent = fs.readFileSync(csvPath, 'utf-8')

  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CSVRow[]

  console.log(`📊 Found ${records.length} rows in CSV`)

  // Group products by vendor
  const vendorMap = new Map<string, CSVRow[]>()
  for (const row of records) {
    const vendor = row['Supplier_Name']
    if (!vendorMap.has(vendor)) {
      vendorMap.set(vendor, [])
    }
    vendorMap.get(vendor)!.push(row)
  }

  console.log(`👥 Found ${vendorMap.size} unique vendors`)

  let totalImported = 0
  let totalSkipped = 0

  // Process each vendor's products
  for (const [vendorName, vendorProducts] of vendorMap.entries()) {
    console.log(`\n📦 Processing vendor: ${vendorName} (${vendorProducts.length} products)`)

    // Get or create vendor
    const vendorId = await getOrCreateVendor(vendorName)

    // Prepare products for batch insert
    const products = vendorProducts.map(row => ({
      name: row['Material_Description'],
      sku: row['CFN (REF)'],
      manufacturer_name: row['Manufacturer Name'] || null,
      vendor_id: vendorId,
      ce_marked: false,
      price: null,
      description: null,
    }))

    // Insert in batches of 100
    const BATCH_SIZE = 100
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE)

      const { data, error } = await supabase
        .from('products')
        .insert(batch)
        .select('id')

      if (error) {
        console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, error)
        totalSkipped += batch.length
      } else {
        totalImported += data?.length || 0
        process.stdout.write(`  Progress: ${Math.min(i + BATCH_SIZE, products.length)}/${products.length}\r`)
      }
    }

    console.log(`  ✓ Completed ${vendorName}`)
  }

  console.log('\n\n✅ Import completed!')
  console.log(`   Imported: ${totalImported} products`)
  console.log(`   Skipped: ${totalSkipped} products`)
}

async function main() {
  try {
    console.log('🚀 Starting Borndigital data import...\n')

    await clearDatabase()
    await importCSV()

    console.log('\n🎉 All done!')
  } catch (error) {
    console.error('\n❌ Import failed:', error)
    process.exit(1)
  }
}

main()
