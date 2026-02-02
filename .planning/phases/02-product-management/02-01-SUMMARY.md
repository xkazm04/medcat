---
phase: 02-product-management
plan: 01
subsystem: product-crud
tags: [zod, server-actions, validation, regulatory, migration]

dependency-graph:
  requires: [01-foundation-catalog]
  provides: [productSchema, updateProduct, deleteProduct, regulatory-fields]
  affects: [02-02, 02-03]

tech-stack:
  added: [@radix-ui/react-dialog, @radix-ui/react-alert-dialog, react-hook-form, @hookform/resolvers, zod]
  patterns: [server-actions, zod-validation, formdata-parsing]

key-files:
  created:
    - src/lib/schemas/product.ts
    - src/lib/actions/products.ts
    - supabase/migrations/002_regulatory_fields.sql
  modified:
    - package.json
    - src/lib/types.ts
    - src/lib/queries.ts

decisions:
  - ce_marked-boolean-conversion: "FormData sends strings; convert 'true'/'false' to boolean in Server Action"
  - nullable-field-handling: "Convert empty strings to null for optional UUID and text fields"
  - permissive-rls: "Allow all update/delete for now; tighten when auth is added"

metrics:
  duration: 3 min
  completed: 2026-02-02
---

# Phase 02 Plan 01: Dependencies, Types, Schema & Actions Summary

**One-liner:** Zod validation schema with regulatory fields (udi_di, ce_marked, mdr_class), Server Actions for product CRUD

## What Was Built

### 1. Dependencies Installed
- `@radix-ui/react-dialog` - Modal dialogs for edit forms
- `@radix-ui/react-alert-dialog` - Confirmation dialogs for delete
- `react-hook-form` - Form state management
- `@hookform/resolvers` - Zod resolver for react-hook-form
- `zod` - Schema validation library

### 2. Extended Product Type
Added regulatory compliance fields to `src/lib/types.ts`:
- `udi_di: string | null` - UDI-DI identifier (max 14 chars)
- `ce_marked: boolean` - CE marking status
- `mdr_class: 'I' | 'IIa' | 'IIb' | 'III' | null` - MDR risk classification

### 3. Zod Validation Schema
Created `src/lib/schemas/product.ts`:
```typescript
export const productSchema = z.object({
  name: z.string().min(1).max(255),
  sku: z.string().min(1).max(50),
  description: z.string().max(2000).nullable().optional(),
  price: z.coerce.number().positive().nullable().optional(),
  vendor_id: z.string().uuid().nullable().optional(),
  emdn_category_id: z.string().uuid().nullable().optional(),
  material_id: z.string().uuid().nullable().optional(),
  udi_di: z.string().max(14).nullable().optional(),
  ce_marked: z.boolean().default(false),
  mdr_class: z.enum(["I", "IIa", "IIb", "III"]).nullable().optional(),
});
export type ProductFormData = z.infer<typeof productSchema>;
```

### 4. Server Actions
Created `src/lib/actions/products.ts`:
- `updateProduct(id, formData)` - Validates and updates product
- `deleteProduct(id)` - Deletes product by ID
- Both actions revalidate cache on success
- Return structured error objects for form display

### 5. Database Migration
Created `supabase/migrations/002_regulatory_fields.sql`:
- Adds udi_di, ce_marked, mdr_class columns
- Creates partial index on udi_di for lookups
- Adds permissive RLS policies for update/delete

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated queries.ts for type compatibility**
- **Found during:** Task 1
- **Issue:** Mock data and Supabase query missing new regulatory fields caused TypeScript errors
- **Fix:** Added udi_di, ce_marked, mdr_class to mock products and SELECT query
- **Files modified:** src/lib/queries.ts
- **Commit:** 3f0600a

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 3f0600a | feat | Install dependencies and add regulatory fields |
| 139aad1 | feat | Create Zod schema and Server Actions |
| 4064092 | chore | Add regulatory fields migration |

## Testing Performed

- All dependencies installed and importable
- TypeScript compiles without errors
- Schema exports productSchema and ProductFormData
- Actions export updateProduct and deleteProduct

## User Actions Required

1. **Run migration in Supabase SQL Editor:**
   - Open Supabase Dashboard > SQL Editor
   - Copy contents of `supabase/migrations/002_regulatory_fields.sql`
   - Execute the migration

## Next Phase Readiness

**Ready for 02-02:** Edit functionality
- Schema available for form validation
- updateProduct action ready for form submission
- Types include regulatory fields for UI display

**Dependencies satisfied:**
- productSchema can be imported
- Server Actions are ready
- Migration file prepared for database update
