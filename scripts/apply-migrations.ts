/**
 * Apply database migrations for category filtering fix
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function applyMigrations() {
  console.log('🔧 Applying database migrations...\n')

  // Migration 1: Fix RPC function delimiter
  console.log('1. Fixing get_category_descendants function...')
  const { error: rpcError } = await supabase.rpc('get_category_descendants', {
    parent_category_id: '00000000-0000-0000-0000-000000000000'
  }).limit(0)

  // Create or replace the function
  const fixRpcSql = `
    CREATE OR REPLACE FUNCTION get_category_descendants(parent_category_id UUID)
    RETURNS SETOF UUID
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      parent_path TEXT;
    BEGIN
      SELECT path INTO parent_path
      FROM emdn_categories
      WHERE id = parent_category_id;

      IF parent_path IS NULL THEN
        RETURN QUERY SELECT parent_category_id;
        RETURN;
      END IF;

      RETURN QUERY
      SELECT id FROM emdn_categories
      WHERE id = parent_category_id
         OR path LIKE parent_path || '.%';
    END;
    $$;
  `

  // Note: Direct SQL execution requires database function or Supabase dashboard
  // For now, we'll test the fix manually
  console.log('   ⚠️  Run this SQL in Supabase Dashboard > SQL Editor:')
  console.log('   ' + fixRpcSql.split('\n').slice(1, -1).join('\n   '))

  // Test current function
  console.log('\n2. Testing category filtering...')

  // Get a category with known products
  const { data: testCat } = await supabase
    .from('emdn_categories')
    .select('id, code, path')
    .eq('code', 'P0912')
    .single()

  if (testCat) {
    console.log(`   Test category: ${testCat.code} (path: ${testCat.path})`)

    // Test RPC
    const { data: descendants, error } = await supabase
      .rpc('get_category_descendants', { parent_category_id: testCat.id })

    if (error) {
      console.log(`   ❌ RPC Error: ${error.message}`)
    } else {
      console.log(`   Descendants returned: ${descendants?.length || 0}`)

      if (descendants && descendants.length > 1) {
        console.log('   ✅ RPC is working correctly!')
      } else {
        console.log('   ❌ RPC still returning only 1 result - needs manual fix')
      }
    }

    // Direct path query for comparison
    const { data: pathQuery } = await supabase
      .from('emdn_categories')
      .select('id')
      .or(`id.eq.${testCat.id},path.like.${testCat.path}.%`)

    console.log(`   Direct path query returns: ${pathQuery?.length || 0} categories`)
  }

  console.log('\n3. Creating optimized indexes...')
  console.log('   ⚠️  Run migration 008_optimize_product_indexes.sql in Supabase Dashboard')

  console.log('\n4. Creating materialized view for category counts...')
  console.log('   ⚠️  Run migration 007_category_counts_materialized.sql in Supabase Dashboard')

  console.log('\n✅ Migration scripts ready. Apply via Supabase Dashboard SQL Editor.')
}

applyMigrations().catch(console.error)
