import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SHALLOW_CODES = [
  'P0909',     // 759 - top-level knee
  'P090804',   // 214 - hip femoral (parent)
  'P0906',     // 107 - top-level foot
  'P090104',   // 46 - shoulder humeral (parent)
  'P0908',     // 29 - top-level hip
  'P090803',   // 26 - hip acetabular (parent)
  'P090905',   // 24 - revision knee
  'P090880',   // 24 - hip accessories
  'P090904',   // 19 - unicompartmental knee
  'P090907',   // 27 - patello-femoral knee
  'P09090702', // 17 - patellar components
  'P090906',   // 138 - knee large resections (check if actually correct or misclassified)
  'P09',       // 7 - very top level
  null,        // 13 - uncategorized
]

async function main() {
  for (const code of SHALLOW_CODES) {
    let query = sb.from('products')
      .select('name, manufacturer_name, sku, emdn_categories!products_emdn_category_id_fkey ( code, name )')
      .order('name')
      .limit(30)

    if (code === null) {
      query = query.is('emdn_category_id', null)
    } else {
      // Need to join and filter by code
      query = query.eq('emdn_categories.code', code)
    }

    const { data, error } = await query

    if (error) { console.error(`Error for ${code}:`, error); continue }

    // Filter to only matching code (supabase inner join quirk)
    const filtered = code === null
      ? data
      : data?.filter((p: any) => (p.emdn_categories as any)?.code === code)

    if (!filtered || filtered.length === 0) continue

    console.log(`\n=== ${code || 'UNCATEGORIZED'} (${filtered.length} shown) ===`)
    for (const p of filtered) {
      console.log(`  ${(p as any).name} | ${(p as any).manufacturer_name || ''} | ${(p as any).sku || ''}`)
    }
  }
}

main().catch(err => { console.error(err); process.exit(1) })
