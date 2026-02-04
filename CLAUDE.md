# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MedCatalog is an orthopedic medical device product catalog built with Next.js 16 and Supabase. It manages medical implants with EMDN (European Medical Device Nomenclature) classification, featuring AI-powered document extraction, bulk CSV import, and advanced filtering.

## Commands

```bash
npm run dev              # Start development server (port 3000)
npm run build            # Production build
npm run lint             # Run ESLint

# Data scripts
npm run import:emdn      # Import EMDN categories from CSV
npm run import:borndigital  # Import Borndigital product dataset
npx tsx scripts/categorize-products.ts  # Bulk categorization with pattern rules
```

## Architecture

### Server/Client Component Pattern
- **Server Components** (`page.tsx`): Fetch data server-side, pass to client components
- **Client Components** (`*-client.tsx`, components with interactivity): Handle user interactions
- **Server Actions** (`lib/actions/`): Handle database mutations via `"use server"`

### URL-Based State
Filters are stored in URL search params, not component state. Changes update URL via `router.push()`, enabling browser navigation and shareable URLs.

### Data Flow
```
Home (Server) → fetches products, vendors, categories in parallel
     ↓
CatalogClient (Client) → manages UI state, reads URL params
     ↓
DataTable + FilterSidebar → interactive components
```

### Key Patterns
- **Circuit Breaker** (`lib/supabase/circuit-breaker.ts`): Prevents infinite loops during SSR hydration (50 req/10s limit, 30s cooldown)
- **Virtual Scrolling**: TanStack React Virtual with fixed 52px row height
- **TanStack Query**: 5-minute stale time for categories, aggressive caching
- **Zod Schemas** (`lib/schemas/`): Runtime validation for forms and AI extraction

### Database
PostgreSQL via Supabase with:
- **RPC Function**: `get_category_descendants(parent_id)` for hierarchical category filtering
- **Full-text Search**: GIN index on product name/description/SKU
- **Tables**: `products`, `vendors`, `emdn_categories`, `materials`

## Key Directories

- `src/lib/actions/` - Server actions (extraction, import, products, similarity)
- `src/lib/schemas/` - Zod validation schemas
- `src/lib/supabase/` - Supabase client with circuit breaker
- `src/components/table/` - Data table with virtual scrolling
- `src/components/filters/` - Filter sidebar components
- `src/components/extraction/` - AI extraction UI
- `scripts/` - Data import/enrichment scripts
- `supabase/migrations/` - SQL migrations (ordered by timestamp)

## AI Extraction

Uses Google Gemini API (`lib/gemini/client.ts`) with lazy initialization. Supports .txt, .md, .pdf files. Extracted data validated against `extractedProductSchema` in `lib/schemas/extraction.ts`.

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GEMINI_API_KEY=...
```

## Path Alias

`@/*` maps to `./src/*` (configured in tsconfig.json)
