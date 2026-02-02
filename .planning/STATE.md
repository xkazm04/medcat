# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-02)

**Core value:** Procurement can quickly compare prices for identical orthopedic products across multiple vendors
**Current focus:** Milestone v1.1 — Deep Research & Bulk Import

## Current Position

Phase: 5 of 7 (Schema & Navigation) - Not Started
Plan: —
Status: Ready to plan Phase 5
Last activity: 2026-02-02 — Roadmap created

Progress: [░░░░░░░░░░] 0% (0/3 phases)

## Milestone History

| Version | Phases | Plans | Shipped |
|---------|--------|-------|---------|
| v1.0    | 4      | 14    | 2026-02-02 |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Key v1.0 decisions (still applicable):

- Tailwind v4 with @theme CSS config (no tailwind.config.js)
- Next.js 15 async cookies() API for Supabase server client
- SKU not unique - same SKU can exist from multiple vendors
- Filter EMDN to orthopedic categories only (P09, P10)
- Use pg_trgm extension for trigram similarity
- Default threshold 0.3 for duplicate warning, 0.5 for price comparison

### Technical Debt

- Permissive RLS policies need tightening when auth is added
- Manual migration execution required (no automated migration runner)

### Data Analysis (v1.1)

CSV file `docs/BornDigital DATA(SVK).csv`:
- 10,293 rows (transaction-level, many duplicates)
- 947 unique products by SKU
- 2-3 suppliers (Zimmer Slovakia, Enovis Slovakia)
- 16 manufacturers (Zimmer Inc, Biomet, etc.)
- Schema gap: need manufacturer + manufacturer_sku fields

### Pending Todos

- User must create Supabase project and set env vars
- User must run database migrations in Supabase SQL Editor
- User must add SUPABASE_SERVICE_ROLE_KEY and GEMINI_API_KEY to .env.local
- User must run `npm run import:emdn` then `npm run seed`

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-02
Stopped at: Defining v1.1 requirements
Resume file: None
