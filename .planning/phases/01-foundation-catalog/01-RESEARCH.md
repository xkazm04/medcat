# Phase 1: Foundation + Catalog - Research

**Researched:** 2026-02-02
**Domain:** Supabase schema design, Next.js 15 App Router data fetching, TanStack Table, Tailwind v4, Motion animations
**Confidence:** HIGH

## Summary

This phase establishes the database foundation and product catalog browsing experience. Research confirms the tech stack decisions: Next.js 15.5 with App Router, Tailwind CSS v4, Motion v11.x, @supabase/ssr, and TanStack Table for the data grid.

The database schema requires careful design for products, vendors, pricing, materials, and the hierarchical EMDN classification system. Supabase with Row Level Security (RLS) policies will secure access. For the catalog table, TanStack Table (headless) provides the flexibility needed for custom styling with Tailwind while handling sorting, pagination, and filtering logic. The EMDN hierarchy for filtering requires a tree view component - either a lightweight custom implementation or shadcn-based tree component.

**Primary recommendation:** Use TanStack Table for complete UI control with compact styling, implement server-side pagination from the start (Supabase handles large datasets well), and use a simple recursive tree component for EMDN category filtering rather than a heavy library.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.5.x | React framework with App Router | Server components, server actions, built-in optimization |
| @supabase/supabase-js | 2.x | Supabase client | Official client library |
| @supabase/ssr | 0.5.x | SSR-compatible Supabase client | Cookie-based session handling for App Router |
| @tanstack/react-table | 8.x | Headless table logic | Complete control over UI, handles sorting/pagination/filtering |
| Tailwind CSS | 4.x | CSS-first utility framework | @theme directive for design tokens, no config file needed |
| motion | 11.x | Animation library | Rebranded from Framer Motion, import from `motion/react` |
| TypeScript | 5.x | Type safety | Required for project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| xlsx (SheetJS) | 0.20.x | Parse EMDN Excel file | One-time import script for EMDN data |
| usehooks-ts | 3.x | React hooks collection | useDebounce for search input |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TanStack Table | AG Grid | AG Grid has built-in UI but less styling control, larger bundle |
| TanStack Table | Mantine React Table | Pre-built UI but requires Mantine ecosystem |
| Custom tree | react-arborist | Full-featured but overkill for simple filtering; 15KB+ |
| usehooks-ts | Custom hook | Library provides battle-tested implementation |

**Installation:**
```bash
npm install @supabase/supabase-js @supabase/ssr @tanstack/react-table motion usehooks-ts
npm install -D xlsx  # Dev dependency for one-time EMDN import
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── layout.tsx           # Root layout with providers
│   ├── page.tsx             # Home/redirect
│   ├── (catalog)/
│   │   └── products/
│   │       ├── page.tsx     # Products catalog (Server Component)
│   │       └── loading.tsx  # Loading skeleton
│   └── api/                 # API routes if needed
├── components/
│   ├── ui/                  # Base UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   └── dropdown-menu.tsx
│   ├── table/               # Table components
│   │   ├── data-table.tsx   # Main table wrapper
│   │   ├── table-header.tsx
│   │   ├── table-row.tsx
│   │   └── table-pagination.tsx
│   └── filters/             # Filter components
│       ├── filter-sidebar.tsx
│       ├── category-tree.tsx
│       ├── price-range-filter.tsx
│       └── search-input.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts        # Browser client
│   │   ├── server.ts        # Server client
│   │   └── middleware.ts    # Auth middleware helper
│   ├── utils.ts             # General utilities
│   └── types.ts             # Shared TypeScript types
├── hooks/
│   └── use-debounce.ts      # Or import from usehooks-ts
└── styles/
    └── globals.css          # Tailwind imports + @theme
```

### Pattern 1: Server-Side Data Fetching with Supabase
**What:** Fetch data in Server Components using the server Supabase client
**When to use:** Initial page load, SEO-critical content, secure data access

```typescript
// src/app/(catalog)/products/page.tsx
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs

import { createClient } from '@/lib/supabase/server'

interface ProductsPageProps {
  searchParams: Promise<{
    page?: string
    search?: string
    category?: string
    vendor?: string
  }>
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams
  const supabase = await createClient()

  const page = parseInt(params.page || '1')
  const pageSize = 20
  const offset = (page - 1) * pageSize

  let query = supabase
    .from('products')
    .select(`
      id,
      name,
      sku,
      price,
      vendor:vendors(name),
      emdn_category:emdn_categories(name)
    `, { count: 'exact' })
    .range(offset, offset + pageSize - 1)
    .order('name')

  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,sku.ilike.%${params.search}%`)
  }

  if (params.category) {
    query = query.eq('emdn_category_id', params.category)
  }

  const { data: products, count, error } = await query

  return <ProductsTable products={products} totalCount={count} currentPage={page} />
}
```

### Pattern 2: TanStack Table with Server-Side Operations
**What:** Use TanStack Table for UI logic while delegating data operations to server
**When to use:** Tables with sorting, filtering, pagination where data comes from server

```typescript
// src/components/table/data-table.tsx
// Source: https://tanstack.com/table/latest

'use client'

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  PaginationState,
} from '@tanstack/react-table'
import { useRouter, useSearchParams } from 'next/navigation'

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[]
  data: TData[]
  pageCount: number
}

export function DataTable<TData>({ columns, data, pageCount }: DataTableProps<TData>) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: parseInt(searchParams.get('page') || '1') - 1,
    pageSize: 20,
  })

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,  // Server handles pagination
    manualSorting: true,     // Server handles sorting
    pageCount,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
  })

  // Sync state changes to URL for server-side handling
  useEffect(() => {
    const params = new URLSearchParams(searchParams)
    params.set('page', String(pagination.pageIndex + 1))
    router.push(`?${params.toString()}`)
  }, [pagination])

  return (
    <table className="w-full">
      {/* render table */}
    </table>
  )
}
```

### Pattern 3: Tailwind v4 Theme Configuration
**What:** CSS-first configuration using @theme directive
**When to use:** Project setup, defining design tokens

```css
/* src/styles/globals.css */
/* Source: https://tailwindcss.com/docs/theme */

@import "tailwindcss";

@theme {
  /* Colors - Light theme optimized */
  --color-background: #ffffff;
  --color-foreground: #0a0a0a;
  --color-muted: #f5f5f5;
  --color-muted-foreground: #737373;
  --color-border: #e5e5e5;
  --color-accent: #2563eb;
  --color-accent-foreground: #ffffff;

  /* Table specific */
  --color-table-header: #fafafa;
  --color-table-row-alt: #fafafa;
  --color-table-row-hover: #f5f5f5;

  /* Typography */
  --font-sans: Inter, ui-sans-serif, system-ui, sans-serif;
  --font-mono: ui-monospace, monospace;

  /* Spacing */
  --spacing-table-cell: 0.75rem;
  --spacing-table-cell-compact: 0.5rem;

  /* Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-header: 0 1px 3px 0 rgb(0 0 0 / 0.1);
}
```

### Pattern 4: Motion Animations for Table
**What:** Subtle enter/exit animations for table rows
**When to use:** Page transitions, row additions, loading states

```typescript
// src/components/table/animated-row.tsx
// Source: https://motion.dev/

'use client'

import { motion } from 'motion/react'

interface AnimatedRowProps {
  children: React.ReactNode
  index: number
}

export function AnimatedRow({ children, index }: AnimatedRowProps) {
  return (
    <motion.tr
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.2,
        delay: index * 0.02,  // Stagger effect
        ease: 'easeOut'
      }}
      className="group"
    >
      {children}
    </motion.tr>
  )
}
```

### Pattern 5: EMDN Category Tree Filter
**What:** Recursive tree component for hierarchical EMDN categories
**When to use:** Category filtering in sidebar

```typescript
// src/components/filters/category-tree.tsx

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronRight } from 'lucide-react'

interface Category {
  id: string
  code: string
  name: string
  children?: Category[]
}

interface CategoryTreeProps {
  categories: Category[]
  selectedId?: string
  onSelect: (id: string) => void
}

function CategoryNode({
  category,
  selectedId,
  onSelect,
  depth = 0
}: {
  category: Category
  selectedId?: string
  onSelect: (id: string) => void
  depth?: number
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasChildren = category.children && category.children.length > 0
  const isSelected = selectedId === category.id

  return (
    <div>
      <button
        onClick={() => {
          if (hasChildren) setIsExpanded(!isExpanded)
          onSelect(category.id)
        }}
        className={`
          flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md
          hover:bg-muted transition-colors
          ${isSelected ? 'bg-accent/10 text-accent font-medium' : ''}
        `}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {hasChildren && (
          <ChevronRight
            className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          />
        )}
        <span className="truncate">{category.name}</span>
      </button>

      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {category.children!.map(child => (
              <CategoryNode
                key={child.id}
                category={child}
                selectedId={selectedId}
                onSelect={onSelect}
                depth={depth + 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function CategoryTree({ categories, selectedId, onSelect }: CategoryTreeProps) {
  return (
    <div className="space-y-0.5">
      {categories.map(category => (
        <CategoryNode
          key={category.id}
          category={category}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
```

### Anti-Patterns to Avoid
- **Mixing client/server pagination:** Be consistent - if using server-side pagination, ALL data operations (sort, filter, page) must go through the server
- **Fetching all data then paginating client-side:** Will not scale; Supabase `.range()` is efficient
- **Storing filter state only in React state:** Use URL searchParams for shareable/bookmarkable filters
- **Using `framer-motion` import:** Library rebranded - use `motion/react` import
- **Creating `tailwind.config.js`:** Tailwind v4 is CSS-first; use `@theme` directive

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Table sorting/pagination logic | Custom sorting state | TanStack Table | Edge cases: multi-column sort, stable sort, direction toggle |
| Debounced search | setTimeout wrapper | usehooks-ts useDebounce | Cleanup, race conditions, TypeScript types |
| Excel parsing | fs + manual parsing | xlsx (SheetJS) | Format variations, encoding, formula handling |
| URL search params sync | Manual parsing | Next.js useSearchParams | Handles encoding, updates, SSR hydration |
| Supabase client per request | Global singleton | @supabase/ssr createClient | Cookie handling, token refresh, per-request isolation |

**Key insight:** The temptation with tables is to "just render a `<table>`" but pagination state, sort direction toggles, column visibility, and row selection quickly compound into complexity. TanStack Table's headless approach means zero UI opinions but all the state management solved.

## Common Pitfalls

### Pitfall 1: Supabase Client Creation in Server Components
**What goes wrong:** Using browser client in server components, or creating multiple clients per render
**Why it happens:** Confusion between `createBrowserClient` and server client patterns
**How to avoid:**
- Create `lib/supabase/client.ts` (browser) and `lib/supabase/server.ts` (server) separately
- Server client uses `cookies()` from next/headers
- Browser client is a singleton
**Warning signs:** Auth state not persisting, cookies not updating

### Pitfall 2: EMDN Hierarchy Queries Without Indexes
**What goes wrong:** Slow tree traversal queries as EMDN data grows
**Why it happens:** Self-referential foreign keys without proper indexing
**How to avoid:**
- Index `parent_id` column on emdn_categories table
- Consider using PostgreSQL `ltree` extension for deep hierarchies
- Pre-compute paths if needed
**Warning signs:** Slow category filter load, N+1 queries for tree

### Pitfall 3: TanStack Table with Server Data - State Mismatch
**What goes wrong:** Table state and URL params get out of sync
**Why it happens:** Updating React state but forgetting to update URL, or vice versa
**How to avoid:**
- URL searchParams is source of truth for server-fetched tables
- Derive initial table state from searchParams
- Use router.push to update params, not local state
**Warning signs:** Pagination doesn't survive refresh, filters reset on navigation

### Pitfall 4: Motion Animations Blocking Paint
**What goes wrong:** Table loads but appears frozen during animation
**Why it happens:** Animating too many rows, or animating layout properties
**How to avoid:**
- Limit stagger delay (max 10-15 rows animated individually)
- Use `opacity` and `transform` only (GPU accelerated)
- Use `layout` prop sparingly
**Warning signs:** FPS drops on page load, janky scrolling

### Pitfall 5: RLS Policies on Public Catalog
**What goes wrong:** Products not visible without authentication
**Why it happens:** Default RLS blocks all access; forgot to add public read policy
**How to avoid:**
- For public catalog: `CREATE POLICY "Public read" ON products FOR SELECT USING (true)`
- Test with anon key, not service key
- Use Supabase dashboard to test policies
**Warning signs:** Empty table in production, works only when logged in

### Pitfall 6: Tailwind v4 Migration Confusion
**What goes wrong:** Styles not applying, utilities not generated
**Why it happens:** Mixing v3 config patterns with v4
**How to avoid:**
- No `tailwind.config.js` needed
- Use `@theme { }` in CSS for customization
- Use `@import "tailwindcss"` not `@tailwind base/components/utilities`
**Warning signs:** Custom colors not working, PostCSS errors

## Code Examples

Verified patterns from official sources:

### Supabase Server Client Setup
```typescript
// src/lib/supabase/server.ts
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component - ignore
          }
        },
      },
    }
  )
}
```

### Supabase Browser Client Setup
```typescript
// src/lib/supabase/client.ts
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Database Schema Example
```sql
-- Supabase migration for Phase 1

-- Enable ltree for hierarchical EMDN (optional, for deep queries)
-- CREATE EXTENSION IF NOT EXISTS ltree;

-- Vendors table
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- EMDN Categories (hierarchical)
CREATE TABLE emdn_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,        -- e.g., "P090101"
  name TEXT NOT NULL,               -- e.g., "Bone screws"
  parent_id UUID REFERENCES emdn_categories(id),
  depth INTEGER NOT NULL DEFAULT 0, -- For quick level filtering
  path TEXT,                        -- Materialized path: "P.P09.P0901.P090101"
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_emdn_parent ON emdn_categories(parent_id);
CREATE INDEX idx_emdn_path ON emdn_categories(path);

-- Materials lookup
CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE
);

-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  vendor_id UUID REFERENCES vendors(id),
  emdn_category_id UUID REFERENCES emdn_categories(id),
  material_id UUID REFERENCES materials(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_products_vendor ON products(vendor_id);
CREATE INDEX idx_products_emdn ON products(emdn_category_id);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_sku ON products(sku);

-- RLS Policies (public read for catalog)
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE emdn_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read vendors" ON vendors FOR SELECT USING (true);
CREATE POLICY "Public read emdn" ON emdn_categories FOR SELECT USING (true);
CREATE POLICY "Public read materials" ON materials FOR SELECT USING (true);
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);
```

### Debounced Search Hook Usage
```typescript
// Using usehooks-ts
// Source: https://usehooks.com/usedebounce

'use client'

import { useState, useEffect } from 'react'
import { useDebounce } from 'usehooks-ts'
import { useRouter, useSearchParams } from 'next/navigation'

export function SearchInput() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(searchParams.get('search') || '')
  const debouncedValue = useDebounce(value, 300)

  useEffect(() => {
    const params = new URLSearchParams(searchParams)
    if (debouncedValue) {
      params.set('search', debouncedValue)
    } else {
      params.delete('search')
    }
    params.set('page', '1') // Reset to first page on search
    router.push(`?${params.toString()}`)
  }, [debouncedValue])

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="Search products..."
      className="w-full px-3 py-2 border rounded-md"
    />
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| framer-motion import | motion/react import | Nov 2024 | Library rebranded; same API |
| tailwind.config.js | @theme in CSS | Tailwind v4 (late 2024) | No JS config needed |
| @supabase/auth-helpers | @supabase/ssr | 2024 | Deprecated; use ssr package |
| getServerSideProps | Server Components + async | Next.js 13+ (App Router) | Direct data fetching in components |
| Client-side table state | URL searchParams source of truth | Pattern evolution | Shareable, bookmarkable, SSR-friendly |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Use `@supabase/ssr` instead
- `framer-motion` package name: Works but use `motion` package
- `@tailwind base/components/utilities`: Use `@import "tailwindcss"` in v4
- React Table v7: Upgrade to TanStack Table v8 (different API)

## Open Questions

Things that couldn't be fully resolved:

1. **EMDN Excel Structure**
   - What we know: EMDN V2_EN.xlsx exists in project root; EMDN has 7-level hierarchy with alphanumeric codes
   - What's unclear: Exact column structure in the Excel file, how orthopedic categories are identified
   - Recommendation: Read Excel file during planning/implementation to determine parsing strategy; orthopedic categories likely start with specific letter codes (investigate P for prosthetics, J for implants)

2. **Authentication Requirements**
   - What we know: RLS policies configured for public read access
   - What's unclear: Whether admin users will need write access in this phase
   - Recommendation: Phase 1 is read-only catalog; defer auth/admin to later phase per CONTEXT.md

3. **Data Volume Expectations**
   - What we know: TanStack Table handles 100K+ rows with virtualization; Supabase pagination is efficient
   - What's unclear: Expected product count, whether virtualization is needed
   - Recommendation: Start with simple pagination (20 items); add virtualization only if scroll performance degrades

## Sources

### Primary (HIGH confidence)
- [Next.js App Router Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching) - Server components, caching
- [Supabase SSR Setup for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) - Client creation, middleware
- [Tailwind CSS v4 Theme Variables](https://tailwindcss.com/docs/theme) - @theme directive syntax
- [TanStack Table Documentation](https://tanstack.com/table/latest) - Sorting, pagination, filtering APIs
- [Motion/React Documentation](https://motion.dev/) - Animation patterns

### Secondary (MEDIUM confidence)
- [Motion Upgrade Guide](https://motion.dev/docs/react-upgrade-guide) - Framer Motion to Motion migration (WebFetch verified)
- [Supabase RLS Best Practices](https://supabase.com/docs/guides/database/postgres/row-level-security) - Policy patterns
- [EMDN Overview](https://health.ec.europa.eu/medical-devices-topics-interest/european-medical-devices-nomenclature-emdn_en) - Classification structure

### Tertiary (LOW confidence)
- Community patterns for TanStack Table + Next.js App Router (WebSearch, multiple sources agree)
- EMDN orthopedic category codes (need to verify against actual Excel file)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via official docs
- Architecture: HIGH - Next.js App Router patterns well-documented
- Database schema: MEDIUM - Based on requirements; EMDN structure needs validation
- Pitfalls: HIGH - Common issues documented across multiple sources

**Research date:** 2026-02-02
**Valid until:** 2026-03-02 (30 days - stack is stable)
