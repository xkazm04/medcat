---
phase: 04-comparison-engine
plan: 01
subsystem: database
tags: [pg_trgm, postgresql, similarity, rpc, supabase, server-actions]

# Dependency graph
requires:
  - phase: 01-foundation-catalog
    provides: products table schema, Supabase client
provides:
  - pg_trgm extension for trigram-based text similarity
  - GIN indexes for fast similarity search
  - find_similar_products RPC function
  - get_product_price_comparison RPC function
  - Server Actions for similarity search
affects: [04-02, 04-03, extraction-preview, product-detail]

# Tech tracking
tech-stack:
  added: [pg_trgm]
  patterns: [RPC functions for complex queries, Server Actions wrapping Supabase RPC]

key-files:
  created:
    - supabase/migrations/003_similarity_search.sql
    - src/lib/actions/similarity.ts
  modified: []

key-decisions:
  - "Use pg_trgm extension for trigram similarity (handles word reordering)"
  - "LOWER() for case-insensitive matching in RPC functions"
  - "Default threshold 0.3 for duplicate warning, 0.5 for price comparison grouping"
  - "SKU similarity threshold 0.8 (higher confidence needed for SKU matches)"

patterns-established:
  - "RPC functions with SECURITY DEFINER for complex queries"
  - "Server Actions with typed result objects (success/data/error)"

# Metrics
duration: 3min
completed: 2026-02-02
---

# Phase 4 Plan 01: Similarity Search Foundation Summary

**PostgreSQL pg_trgm extension with two RPC functions for duplicate detection and price comparison, wrapped in typed Server Actions**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-02T15:55:24Z
- **Completed:** 2026-02-02T15:58:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Enabled pg_trgm extension for trigram-based text similarity matching
- Created GIN indexes on products.name and products.sku for fast similarity searches
- Implemented find_similar_products RPC for duplicate detection during extraction
- Implemented get_product_price_comparison RPC for vendor price comparison view
- Created typed Server Actions that can be called from client components

## Task Commits

Each task was committed atomically:

1. **Task 1: Create pg_trgm migration with RPC functions** - `31a15c5` (feat)
2. **Task 2: Create similarity Server Actions** - `91ee532` (feat)

## Files Created/Modified
- `supabase/migrations/003_similarity_search.sql` - pg_trgm extension, GIN indexes, two RPC functions
- `src/lib/actions/similarity.ts` - Server Actions for findSimilarProducts and getProductPriceComparison

## Decisions Made
- Used LOWER() in all similarity comparisons for case-insensitive matching
- Set default threshold 0.3 for duplicate warnings (catches most similar products without too many false positives)
- Set default threshold 0.5 for price comparison grouping (higher confidence for meaningful groups)
- SKU matches require 0.8 similarity (SKUs are more precise identifiers)
- Order price comparison results by price ASC NULLS LAST for easy vendor comparison

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**Database migration required.** User must run 003_similarity_search.sql in Supabase SQL Editor:
1. Go to Supabase Dashboard > SQL Editor
2. Paste contents of `supabase/migrations/003_similarity_search.sql`
3. Execute the migration

Note: pg_trgm extension is available in Supabase by default, no additional configuration needed.

## Next Phase Readiness
- Server Actions ready to be integrated into extraction preview (04-02-PLAN.md)
- Server Actions ready to be integrated into product detail view (04-03-PLAN.md)
- No blockers

---
*Phase: 04-comparison-engine*
*Completed: 2026-02-02*
