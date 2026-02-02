# Phase 5: Schema & Navigation - Research

**Researched:** 2026-02-02
**Domain:** PostgreSQL schema migrations, hierarchical data filtering, table virtualization
**Confidence:** HIGH

## Summary

Phase 5 requires three distinct technical areas: (1) adding manufacturer fields to the products schema via PostgreSQL migration, (2) enhancing EMDN category navigation to filter by descendants when a parent is selected, and (3) optimizing table performance for 1000+ products.

The existing codebase has solid foundations: EMDN categories already use a hierarchical structure with `parent_id` and `path` columns, TanStack Table is configured for server-side pagination, and the category tree component exists with expand/collapse functionality. The main work involves extending these patterns rather than building from scratch.

**Primary recommendation:** Use PostgreSQL's native path prefix matching (LIKE 'P09/%') for descendant filtering rather than recursive CTEs or ltree extension - the existing `path` column already supports this pattern and has an index.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-table | ^8.21.3 | Data table with server-side pagination | Already in use, supports virtualization integration |
| Supabase/PostgreSQL | Latest | Database with RPC functions | Already configured with RLS and pg_trgm |
| motion | ^12.29.3 | Animations for tree expand/collapse | Already used in category-tree.tsx |
| Zod | ^4.3.6 | Schema validation | Already used for product forms |

### Required Addition
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/react-virtual | ^3.x | Row virtualization | Only if client has 1000+ products loaded at once without pagination |

### Not Needed
| Library | Why Not |
|---------|---------|
| ltree extension | Existing `path` column with text prefix matching is sufficient |
| react-arborist | Custom CategoryTree already exists, no need to replace |
| AG Grid | Overkill - TanStack Table + Virtual handles 1000 rows easily |

**Installation (only if virtualization needed):**
```bash
npm install @tanstack/react-virtual
```

## Architecture Patterns

### Recommended Changes Structure
```
supabase/migrations/
└── 004_manufacturer_fields.sql    # New migration for manufacturer columns

src/lib/
├── types.ts                        # Add manufacturer_name, manufacturer_sku to Product
├── schemas/product.ts              # Add manufacturer fields to Zod schema
└── queries.ts                      # Update category filter for descendants

src/components/
├── product/
│   ├── product-form.tsx            # Add manufacturer fields
│   └── product-detail.tsx          # Display manufacturer info
└── filters/
    └── category-tree.tsx           # Already has expand/collapse (may need breadcrumb)
```

### Pattern 1: Safe Schema Migration
**What:** Add nullable columns without requiring data backfill
**When to use:** Adding optional fields to existing tables
**Example:**
```sql
-- Source: PostgreSQL documentation
-- Fast operation in PostgreSQL 11+: nullable columns with no default are instant

ALTER TABLE products
ADD COLUMN IF NOT EXISTS manufacturer_name TEXT,
ADD COLUMN IF NOT EXISTS manufacturer_sku TEXT;

-- Add index for manufacturer_sku lookups (useful for searching)
CREATE INDEX IF NOT EXISTS idx_products_manufacturer_sku
  ON products(manufacturer_sku)
  WHERE manufacturer_sku IS NOT NULL;

-- Optional: Add index for manufacturer_name text search
CREATE INDEX IF NOT EXISTS idx_products_manufacturer_name_trgm
  ON products USING GIN (manufacturer_name gin_trgm_ops)
  WHERE manufacturer_name IS NOT NULL;
```

### Pattern 2: Descendant Category Filtering via Path Prefix
**What:** Filter products by category and all its descendants using the existing path column
**When to use:** User selects a parent category in the tree
**Example:**
```typescript
// In queries.ts - getProducts function
// Source: Existing pattern in codebase + PostgreSQL LIKE optimization

// Current (exact match only):
if (category) {
  query = query.eq("emdn_category_id", category);
}

// Updated (include descendants):
if (category) {
  // First, get the category's path
  const { data: categoryData } = await supabase
    .from("emdn_categories")
    .select("path")
    .eq("id", category)
    .single();

  if (categoryData?.path) {
    // Filter by path prefix to get all descendants
    // Products where category path starts with selected category's path
    query = query.or(
      `emdn_category_id.eq.${category},emdn_category.path.like.${categoryData.path}/%`
    );
  } else {
    query = query.eq("emdn_category_id", category);
  }
}
```

**Alternative using RPC function (cleaner):**
```sql
-- Create function to get all descendant category IDs
CREATE OR REPLACE FUNCTION get_category_descendants(parent_category_id UUID)
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  parent_path TEXT;
BEGIN
  -- Get the parent's path
  SELECT path INTO parent_path
  FROM emdn_categories
  WHERE id = parent_category_id;

  IF parent_path IS NULL THEN
    RETURN;
  END IF;

  -- Return all categories with matching path prefix
  RETURN QUERY
  SELECT id FROM emdn_categories
  WHERE path = parent_path  -- The parent itself
     OR path LIKE parent_path || '/%';  -- All descendants
END;
$$;

GRANT EXECUTE ON FUNCTION get_category_descendants TO anon, authenticated;
```

### Pattern 3: Table Virtualization (If Needed)
**What:** Render only visible rows for large datasets
**When to use:** Only when client renders 1000+ rows without pagination
**Example:**
```typescript
// Source: TanStack Virtual documentation
import { useVirtualizer } from '@tanstack/react-virtual'

// In DataTable component
const parentRef = useRef<HTMLDivElement>(null)

const rowVirtualizer = useVirtualizer({
  count: table.getRowModel().rows.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 48, // row height in pixels
  overscan: 5, // render 5 extra rows above/below viewport
})

const virtualRows = rowVirtualizer.getVirtualItems()

// Render only virtual rows
<div ref={parentRef} className="overflow-auto h-[600px]">
  <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
    {virtualRows.map((virtualRow) => {
      const row = table.getRowModel().rows[virtualRow.index]
      return (
        <tr
          key={row.id}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            transform: `translateY(${virtualRow.start}px)`,
          }}
        >
          {/* cells */}
        </tr>
      )
    })}
  </div>
</div>
```

### Anti-Patterns to Avoid
- **Recursive CTE on every query:** Using WITH RECURSIVE for descendant lookup is slower than path prefix matching for read-heavy workloads
- **Client-side filtering of categories:** Keep the descendant logic in the database where the index can help
- **Loading all products without pagination:** Even with virtualization, fetching 10000 products is slow; use server-side pagination
- **Adding NOT NULL columns with defaults to large tables:** Use nullable columns or add default in separate step

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tree expand/collapse animations | Custom CSS transitions | Existing motion/AnimatePresence in category-tree.tsx | Already works, handles height animations properly |
| Category breadcrumb path | Parse path string manually | Existing EMDNBreadcrumb component | Already parses "P/P09/P0901" format |
| Table virtualization | Custom intersection observer | @tanstack/react-virtual | Handles edge cases, overscan, dynamic heights |
| Path-based descendant query | Recursive CTE | LIKE 'path/%' with index | Much simpler, equally fast with B-tree index |

**Key insight:** The existing codebase already has the building blocks (path column, tree component, breadcrumb). This phase extends patterns rather than creating new ones.

## Common Pitfalls

### Pitfall 1: Forgetting Index for Path Prefix Queries
**What goes wrong:** LIKE queries without proper index cause full table scans
**Why it happens:** Default B-tree index doesn't support LIKE unless using text_pattern_ops or C locale
**How to avoid:**
```sql
-- Check current locale
SHOW LC_COLLATE;

-- If not 'C', create pattern index
CREATE INDEX idx_emdn_path_pattern ON emdn_categories (path text_pattern_ops);
```
**Warning signs:** Slow category filter queries with EXPLAIN showing Seq Scan

### Pitfall 2: N+1 Query for Category Path Lookup
**What goes wrong:** Fetching category path in separate query for each filter request
**Why it happens:** Not thinking about query efficiency when adding descendant logic
**How to avoid:**
- Option A: Use RPC function that does lookup internally
- Option B: Join categories in main query and filter with subquery
- Option C: Include category IDs directly in URL (client sends all descendant IDs)
**Warning signs:** Two database calls per product list fetch

### Pitfall 3: Virtualization Without Fixed Heights
**What goes wrong:** Rows jump around, scroll position lost, janky UX
**Why it happens:** Dynamic content heights cause recalculations
**How to avoid:**
- Set fixed row heights (or consistent min-height)
- Use `estimateSize` that matches actual row height
- Avoid expandable content within virtualized rows
**Warning signs:** Visual glitches when scrolling fast, rows re-rendering unexpectedly

### Pitfall 4: Migration Blocking Writes
**What goes wrong:** ALTER TABLE locks table during migration
**Why it happens:** Adding columns with defaults (pre-PostgreSQL 11) or volatile defaults
**How to avoid:**
- Add nullable columns (no default) - instant operation
- Add default value as separate ALTER if needed
- Run migrations during low-traffic periods
**Warning signs:** Connection timeouts during deployment

### Pitfall 5: Selecting All Descendants Loads Entire Tree
**What goes wrong:** Clicking top-level category causes massive query
**Why it happens:** P09 category might have hundreds of descendants and thousands of products
**How to avoid:**
- Keep server-side pagination even with category filter
- Consider showing "X products in this category" count first
- Limit initial results, let user refine with subcategory
**Warning signs:** Long load times when selecting broad categories

## Code Examples

Verified patterns from official sources:

### Migration File: 004_manufacturer_fields.sql
```sql
-- Migration: Add manufacturer fields to products table
-- PostgreSQL 11+ makes ADD COLUMN with no default instant

-- Add manufacturer columns (nullable, no default = fast operation)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS manufacturer_name TEXT,
ADD COLUMN IF NOT EXISTS manufacturer_sku TEXT;

-- Create partial indexes (only index non-null values)
CREATE INDEX IF NOT EXISTS idx_products_manufacturer_sku
  ON products(manufacturer_sku)
  WHERE manufacturer_sku IS NOT NULL;

-- Add trigram index for manufacturer name search (if needed)
CREATE INDEX IF NOT EXISTS idx_products_manufacturer_name_trgm
  ON products USING GIN (manufacturer_name gin_trgm_ops)
  WHERE manufacturer_name IS NOT NULL;

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
AND column_name IN ('manufacturer_name', 'manufacturer_sku');
```

### TypeScript Type Update
```typescript
// In src/lib/types.ts
export interface Product {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  price: number | null;
  vendor_id: string | null;
  emdn_category_id: string | null;
  material_id: string | null;
  udi_di: string | null;
  ce_marked: boolean;
  mdr_class: 'I' | 'IIa' | 'IIb' | 'III' | null;
  manufacturer_name: string | null;  // NEW
  manufacturer_sku: string | null;   // NEW
  created_at: string;
  updated_at: string;
}
```

### Zod Schema Update
```typescript
// In src/lib/schemas/product.ts
export const productSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  sku: z.string().min(1, "SKU is required").max(50, "SKU too long"),
  description: z.string().max(2000, "Description too long").nullable().optional(),
  price: z.coerce.number().positive("Price must be positive").nullable().optional(),
  vendor_id: z.string().uuid("Invalid vendor ID").nullable().optional(),
  emdn_category_id: z.string().uuid("Invalid category ID").nullable().optional(),
  material_id: z.string().uuid("Invalid material ID").nullable().optional(),
  udi_di: z.string().max(14, "UDI-DI max 14 characters").nullable().optional(),
  ce_marked: z.boolean().default(false),
  mdr_class: z.enum(["I", "IIa", "IIb", "III"]).nullable().optional(),
  manufacturer_name: z.string().max(255, "Manufacturer name too long").nullable().optional(),  // NEW
  manufacturer_sku: z.string().max(100, "Manufacturer SKU too long").nullable().optional(),    // NEW
});
```

### RPC Function for Category Descendants
```sql
-- Source: PostgreSQL path prefix pattern
CREATE OR REPLACE FUNCTION get_products_by_category_tree(
  category_id UUID,
  search_term TEXT DEFAULT NULL,
  page_num INT DEFAULT 1,
  page_size INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  sku TEXT,
  price DECIMAL(10,2),
  -- ... other fields
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  category_path TEXT;
  offset_val INT;
BEGIN
  -- Get the category's path
  SELECT path INTO category_path FROM emdn_categories WHERE emdn_categories.id = category_id;

  offset_val := (page_num - 1) * page_size;

  RETURN QUERY
  WITH category_ids AS (
    SELECT ec.id
    FROM emdn_categories ec
    WHERE ec.id = category_id
       OR ec.path LIKE category_path || '/%'
  )
  SELECT
    p.id,
    p.name,
    p.sku,
    p.price,
    COUNT(*) OVER() as total_count
  FROM products p
  WHERE p.emdn_category_id IN (SELECT ci.id FROM category_ids ci)
    AND (search_term IS NULL OR p.name ILIKE '%' || search_term || '%')
  ORDER BY p.name
  LIMIT page_size OFFSET offset_val;
END;
$$;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Recursive CTEs for tree queries | Path prefix with LIKE | N/A (both valid) | Path prefix simpler for reads, CTE better for complex traversals |
| render-all-rows tables | Virtualization with @tanstack/react-virtual | 2023-2024 | Required for 1000+ rows, optional below that |
| window-based virtualization (react-window) | @tanstack/react-virtual | 2023 | Better API, maintained, tree-shakeable |
| ADD COLUMN ... DEFAULT rewrites table | ADD COLUMN instant (PostgreSQL 11+) | PostgreSQL 11 (2018) | No longer a concern for nullable columns |

**Deprecated/outdated:**
- react-window: Replaced by @tanstack/react-virtual for new projects
- react-virtualized: Superseded, no longer actively developed
- Manual scroll event handling: Use modern virtualization libraries

## Open Questions

Things that couldn't be fully resolved:

1. **Current path index type**
   - What we know: `idx_emdn_path` index exists on emdn_categories(path)
   - What's unclear: Is it using text_pattern_ops? What's the database locale?
   - Recommendation: Check with `\d emdn_categories` and `SHOW LC_COLLATE` before implementing LIKE queries

2. **Virtualization necessity**
   - What we know: Current pageSize is 20, server-side pagination is used
   - What's unclear: Will users ever need to see 1000+ rows at once without pagination?
   - Recommendation: Test with 1000 products first without virtualization; add only if laggy

3. **Category filter URL state**
   - What we know: Currently passes single category ID in URL
   - What's unclear: Should URL show selected path for bookmarking/sharing?
   - Recommendation: Keep single ID for simplicity; breadcrumb can derive path from ID

## Sources

### Primary (HIGH confidence)
- [PostgreSQL ALTER TABLE Documentation](https://www.postgresql.org/docs/current/sql-altertable.html) - Schema migration syntax
- [PostgreSQL WITH RECURSIVE Documentation](https://www.postgresql.org/docs/current/queries-with.html) - Hierarchical query patterns
- [TanStack Virtual Introduction](https://tanstack.com/virtual/latest/docs/introduction) - Virtualization API
- [TanStack Table Virtualization Guide](https://tanstack.com/table/v8/docs/guide/virtualization) - Integration patterns

### Secondary (MEDIUM confidence)
- [PostgreSQL text_pattern_ops Documentation](https://www.postgresql.org/docs/current/indexes-opclass.html) - Index operator classes
- [Supabase RPC Documentation](https://supabase.com/docs/reference/javascript/rpc) - Database function calls
- [Beyond Flat Tables: Hierarchical Data in Supabase](https://dev.to/roel_peters_8b77a70a08fdb/beyond-flat-tables-model-hierarchical-data-in-supabase-with-recursive-queries-4ndl) - Recursive CTE examples
- [TanStack Virtual Table Example](https://dev.to/ainayeem/building-an-efficient-virtualized-table-with-tanstack-virtual-and-react-query-with-shadcn-2hhl) - Code patterns

### Tertiary (LOW confidence)
- WebSearch results on "TanStack Table 1000 rows performance" - General guidance, needs validation with actual testing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing libraries already in codebase
- Architecture (migrations): HIGH - PostgreSQL ALTER TABLE is well-documented
- Architecture (descendant filter): HIGH - Path prefix matching is standard pattern
- Architecture (virtualization): MEDIUM - May not be needed with server-side pagination
- Pitfalls: HIGH - Based on official documentation and common patterns

**Research date:** 2026-02-02
**Valid until:** 2026-03-02 (30 days - stable patterns, no major version changes expected)
