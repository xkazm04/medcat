# Technical Overview

MedCatalog is a medical device product catalog system for orthopedic implants with EMDN classification support.

## Key Use Cases

### 1. Product Catalog Browsing

Users browse and search medical device products through a filterable data table.

**Workflow:**
1. Server Component (`page.tsx`) fetches products, vendors, categories, and manufacturers in parallel
2. Data passed to `CatalogClient` which manages UI state
3. Filters stored in URL search params - enables sharing and browser navigation
4. `DataTable` renders with virtual scrolling for performance

**Filters Available:**
- Full-text search (name, description, SKU)
- EMDN category (hierarchical, includes descendants)
- Vendor (multi-select)
- Manufacturer (multi-select)
- CE marking status
- MDR class (I, IIa, IIb, III)
- Price range

### 2. AI-Powered Product Extraction

Extract product data from vendor documentation using Google Gemini.

**Workflow:**
1. User uploads file (.txt, .md, .pdf) via `upload-form.tsx`
2. Server action `extractProductFromDocument` processes file:
   - PDF: text extraction via `pdf-parse`
   - Text/MD: direct content
3. Gemini API called with structured output schema (`extractedProductSchema`)
4. Returns: name, SKU, description, price, vendor, manufacturer, materials, regulatory info, EMDN suggestion with rationale
5. `ExtractionPreview` shows editable form with:
   - Auto-matched vendor/EMDN from extracted names
   - "New" badge if vendor not found (auto-creates on save)
   - Similarity check against existing products
6. User confirms and saves to database

**Key Schema (lib/schemas/extraction.ts):**
```typescript
{
  name: string,
  sku: string,
  description: string | null,
  price: number | null,
  vendor_name: string | null,      // Text, resolved to ID on save
  manufacturer_name: string | null,
  material_name: string | null,
  ce_marked: boolean,
  mdr_class: "I" | "IIa" | "IIb" | "III" | null,
  udi_di: string | null,
  suggested_emdn: string | null,   // EMDN code suggestion
  emdn_rationale: string | null    // Why this EMDN was chosen
}
```

### 3. Bulk CSV Import

Import products from CSV files with column mapping and validation.

**Wizard Steps:**
1. **Vendor Selection** - All imported products linked to one vendor (SKU deduplication per vendor)
2. **File Upload** - CSV with headers, parsed via PapaParse
3. **Column Mapping** - Map CSV columns to product fields (name, sku required)
4. **Validation** - Check required fields, detect existing SKUs
5. **Import** - Batch insert in chunks of 100

**Mappable Fields:**
- name (required)
- sku (required)
- description
- price
- manufacturer_name
- manufacturer_sku
- emdn_code (looked up to category ID)

**Import Logic:**
- Existing SKU (same vendor): skipped
- EMDN code provided: matched to category ID
- No EMDN code: product created as unclassified

### 4. Product Management

CRUD operations on products with regulatory compliance tracking.

**Product Fields:**
| Field | Type | Description |
|-------|------|-------------|
| name | string | Product name |
| sku | string | Catalog/reference number |
| description | text | Full description |
| price | decimal(10,2) | Unit price in CZK |
| vendor_id | FK | Distributor reference |
| emdn_category_id | FK | EMDN classification |
| material_id | FK | Material composition |
| manufacturer_name | string | OEM name |
| manufacturer_sku | string | OEM part number |
| udi_di | string(14) | UDI Device Identifier |
| ce_marked | boolean | CE marking status |
| mdr_class | enum | MDR risk class (I/IIa/IIb/III) |

### 5. EMDN Category Navigation

Hierarchical category tree for product classification (P09 branch - Orthopedic).

**Key Characteristics:**
- 295 categories, up to 8 levels deep
- Selecting parent category filters to all descendants
- Product counts propagated up tree (parent shows total of all children)
- Materialized view `category_product_counts` for performance

**RPC Function:**
```sql
get_category_descendants(parent_category_id UUID)
-- Returns array of all descendant category IDs
```

---

## Data Table Design

### Architecture

```
DataTable (data-table.tsx)
├── TanStack Table (react-table v8)
│   ├── Manual pagination (server-driven)
│   ├── Manual sorting (server-driven)
│   └── Column visibility state
├── TanStack Virtual (react-virtual)
│   ├── Fixed row height: 52px
│   ├── Overscan: 5 rows
│   └── Container max-height: calc(100vh - 320px)
└── URL State Sync
    ├── sortBy, sortOrder
    ├── page
    └── All filter params
```

### Column Definitions (columns.tsx)

| Column | Width | Features |
|--------|-------|----------|
| Product | 40% | Name (clickable), SKU, Vendor inline; sortable |
| Manufacturer | 10% | Filter dropdown in header |
| Price | 8% | Right-aligned, CZK format; sortable |
| Regulatory | 10% | CE/MDR badges; filter dropdown in header |
| Category | 50% | Expandable hierarchy view |
| Actions | 48px | View/Edit/Delete dropdown |

### Column Visibility

Persisted to `localStorage` with key `"catalog-columns"`:
```typescript
interface ColumnVisibility {
  product: boolean;    // Always true (primary)
  sku: boolean;        // Shown inline with product
  vendor: boolean;     // Shown inline with product
  manufacturer: boolean;
  price: boolean;
  regulatory: boolean;
  category: boolean;
}
```

Toggle UI in `ColumnVisibilityToggle` component.

### Virtual Scrolling

**Why:** Dataset can exceed 2,500+ products per page.

**Implementation:**
```typescript
const virtualizer = useVirtualizer({
  count: rows.length,
  getScrollElement: () => tableContainerRef.current,
  estimateSize: () => ROW_HEIGHT,  // 52px fixed
  overscan: 5,
});
```

**Padding Strategy:**
- Top padding: `virtualRows[0].start`
- Bottom padding: `totalSize - virtualRows[last].end`
- Rendered as empty `<tr>` elements

### Server-Side Operations

All filtering, sorting, and pagination handled by Supabase query in `getProducts()`:

```typescript
interface GetProductsParams {
  page?: number;           // 1-indexed
  pageSize?: number;       // Default: 20
  search?: string;         // Full-text on name, description, sku
  vendor?: string;         // Comma-separated IDs
  category?: string;       // Single ID (includes descendants)
  material?: string;       // Comma-separated IDs
  ceMarked?: string;       // "true" or "false"
  mdrClass?: string;       // Comma-separated: "I,IIa,IIb,III"
  manufacturer?: string;   // Comma-separated names (URL-encoded)
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;         // "name" | "sku" | "price" | "created_at"
  sortOrder?: "asc" | "desc";
}
```

### Memoization Strategy

Cell components memoized with `React.memo`:
- `ProductCell` - name, SKU, vendor display
- `ManufacturerCell` - manufacturer name
- `PriceCell` - formatted price

Column definitions memoized via `useColumns` hook.

### Sorting Behavior

1. User clicks sortable column header
2. `onSortingChange` callback fires
3. URL updated with `sortBy` and `sortOrder`
4. Page resets to 1
5. Server re-fetches with new sort params

### Pagination

- Server returns `count` (total matching rows)
- `pageCount` calculated: `Math.ceil(count / pageSize)`
- `TablePagination` component shows page controls
- Page change updates URL, triggers server fetch
- Table scrolls to top on page change

---

## Database Schema

### Core Tables

```
vendors
├── id (UUID PK)
├── name (VARCHAR)
├── code (VARCHAR UNIQUE)
├── website (VARCHAR)
└── timestamps

emdn_categories
├── id (UUID PK)
├── code (VARCHAR UNIQUE) -- e.g., "P090803"
├── name (VARCHAR)
├── parent_id (FK self)
├── depth (INT)
├── path (VARCHAR)
└── created_at

materials
├── id (UUID PK)
├── name (VARCHAR)
└── code (VARCHAR UNIQUE)

products
├── id (UUID PK)
├── name, sku, description
├── price (DECIMAL 10,2)
├── vendor_id → vendors
├── emdn_category_id → emdn_categories
├── material_id → materials
├── manufacturer_name, manufacturer_sku
├── udi_di (VARCHAR 14)
├── ce_marked (BOOLEAN)
├── mdr_class (ENUM: I/IIa/IIb/III)
└── timestamps
```

### Indexes

- `products.vendor_id` (B-tree)
- `products.emdn_category_id` (B-tree)
- `products.material_id` (B-tree)
- `products(name, description, sku)` (GIN, full-text)

### Materialized View

```sql
category_product_counts
├── id, code, name, parent_id, path, depth
└── total_count (includes descendants)
```

Refreshed after bulk imports for fast category tree queries.

---

## Error Handling

### Circuit Breaker (lib/supabase/circuit-breaker.ts)

Prevents infinite request loops during SSR hydration issues.

**Configuration:**
- Max requests: 50 per 10-second window
- Cooldown: 30 seconds when tripped
- Throws `CircuitBreakerError` when open

**Usage:**
```typescript
checkCircuit(); // Call before every Supabase query
```

### Fallback Data

When Supabase unavailable or not configured:
- `getProducts()` returns mock products
- `getVendors()` returns mock vendors
- `getEMDNCategories()` returns mock category tree

Enables development without database connection.

---

## Performance Optimizations

1. **Parallel Data Fetching** - Home page fetches products, vendors, categories, manufacturers concurrently
2. **Virtual Scrolling** - Only renders visible rows (overscan: 5)
3. **Materialized Views** - Pre-computed category counts
4. **TanStack Query Caching** - 5-minute stale time for categories
5. **Memoized Components** - Cell renderers wrapped in `React.memo`
6. **Server Components** - Data fetching on server, reduced JS bundle
7. **URL State** - No client-side filter state to sync
