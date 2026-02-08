/**
 * Run SQL migration files against Supabase via DATABASE_URL.
 *
 * Usage:
 *   npx tsx scripts/run-migration.ts supabase/migrations/014_reference_prices_hierarchy.sql
 *   npx tsx scripts/run-migration.ts --all          # Run all unapplied migrations
 *   npx tsx scripts/run-migration.ts --dry-run FILE  # Show SQL without executing
 */
import { config } from 'dotenv'
import { readFileSync, existsSync } from 'fs'
import { readdirSync } from 'fs'
import { join } from 'path'
import pg from 'pg'

config({ path: '.env' })

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set in .env')
  process.exit(1)
}

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const isAll = args.includes('--all')
const files = args.filter((a) => !a.startsWith('--'))

async function main() {
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  })

  await client.connect()
  console.log('Connected to database\n')

  // Ensure migration tracking table exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT now()
    )
  `)

  let migrationFiles: string[] = []

  if (isAll) {
    // Find all migration files, filter out already-applied ones
    const dir = join(process.cwd(), 'supabase', 'migrations')
    if (!existsSync(dir)) {
      console.error('No supabase/migrations/ directory found')
      process.exit(1)
    }
    const allFiles = readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort()

    const { rows: applied } = await client.query('SELECT name FROM _migrations')
    const appliedSet = new Set(applied.map((r: { name: string }) => r.name))

    migrationFiles = allFiles
      .filter((f) => !appliedSet.has(f))
      .map((f) => join(dir, f))

    if (migrationFiles.length === 0) {
      console.log('All migrations already applied.')
      await client.end()
      return
    }
    console.log(`Found ${migrationFiles.length} unapplied migration(s):\n`)
  } else if (files.length > 0) {
    migrationFiles = files
  } else {
    console.error('Usage: npx tsx scripts/run-migration.ts [--all | FILE ...]')
    console.error('       npx tsx scripts/run-migration.ts --dry-run FILE')
    process.exit(1)
  }

  for (const file of migrationFiles) {
    if (!existsSync(file)) {
      console.error(`File not found: ${file}`)
      process.exit(1)
    }

    const sql = readFileSync(file, 'utf-8')
    const name = file.split(/[/\\]/).pop()!

    console.log(`--- ${name} ---`)

    if (isDryRun) {
      console.log(sql)
      console.log('(dry run — not executed)\n')
      continue
    }

    try {
      await client.query(sql)
      // Record migration as applied
      await client.query(
        'INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
        [name]
      )
      console.log(`Applied successfully.\n`)
    } catch (e: any) {
      console.error(`FAILED: ${e.message}\n`)
      // Don't exit on "already exists" errors for idempotent migrations
      if (e.message.includes('already exists')) {
        console.log('(continuing — object already exists)\n')
        await client.query(
          'INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
          [name]
        )
      } else {
        await client.end()
        process.exit(1)
      }
    }
  }

  await client.end()
  console.log('Done.')
}

main().catch((err) => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
