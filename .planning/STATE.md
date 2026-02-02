# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-02)

**Core value:** Procurement can quickly compare prices for identical orthopedic products across multiple vendors
**Current focus:** Phase 4 - Comparison Engine

## Current Position

Phase: 4 of 4 (Comparison Engine)
Plan: 1 of 3
Status: In progress
Last activity: 2026-02-02 - Completed 04-01-PLAN.md (Similarity Search Foundation)

Progress: [########=-] 80% (12/15 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 12
- Average duration: 6 min
- Total execution time: 1.35 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-catalog | 3 | 35 min | 12 min |
| 02-product-management | 4 | 20 min | 5 min |
| 03-ai-extraction | 4 | 12 min | 3 min |
| 04-comparison-engine | 1 | 3 min | 3 min |

**Recent Trend:**
- Last 5 plans: 3 min, 2 min, 2 min, 5 min, 3 min
- Trend: Stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Tailwind v4 with @theme CSS config (no tailwind.config.js)
- Next.js 15 async cookies() API for Supabase server client
- SKU not unique - same SKU can exist from multiple vendors
- Public read RLS policies for catalog (no auth required)
- Filter EMDN to orthopedic categories only (P09, P10) - keeps database focused
- Use Supabase service role key for imports (bypasses RLS)
- URL searchParams as source of truth for filters
- Mock data fallback when Supabase not configured
- FormData sends strings; convert ce_marked 'true'/'false' to boolean in Server Action
- Permissive RLS for update/delete; tighten when auth is added
- Sheet default width min(500px, 90vw) for responsive desktop-first
- Spring animation config (damping 25, stiffness 300) for smooth sheet feel
- Use z.input/z.output types for React Hook Form with Zod transforms
- Column factory function (createColumns) injects callbacks instead of static columns export
- Server/Client boundary: page.tsx fetches all data, passes to CatalogClient wrapper
- Extraction schema uses string vendor_name/material_name (not UUIDs), resolved later in preview form
- EXTRACTION_MODEL = "gemini-3-flash-preview" as single source of truth
- Server Action returns typed ExtractionResult with success/data/error for client handling
- createProduct returns productId on success for UI feedback
- Case-insensitive partial matching for vendor/material name-to-ID resolution
- Show extracted raw text above dropdowns for user transparency
- ExtractionSheet uses step state ('upload' | 'preview') with reset on open
- Use pg_trgm extension for trigram similarity (handles word reordering)
- LOWER() for case-insensitive matching in RPC functions
- Default threshold 0.3 for duplicate warning, 0.5 for price comparison grouping
- SKU similarity threshold 0.8 (higher confidence needed for SKU matches)

### Pending Todos

- User must create Supabase project and set env vars
- User must run database migration in Supabase SQL Editor
- User must add SUPABASE_SERVICE_ROLE_KEY to .env.local
- User must run `npm run import:emdn` then `npm run seed`
- User must run 002_regulatory_fields.sql migration in Supabase SQL Editor
- User must add GEMINI_API_KEY to .env.local (from https://aistudio.google.com/apikey)
- User must run 003_similarity_search.sql migration in Supabase SQL Editor

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-02T15:58:00Z
Stopped at: Completed 04-01-PLAN.md (Similarity Search Foundation)
Resume file: None
