# Roadmap: MedCatalog

## Overview

MedCatalog transforms vendor product sheets into a searchable catalog with AI-powered extraction and cross-vendor price comparison. The roadmap progresses from a functional catalog foundation through product management, AI extraction pipeline, and finally the core differentiator: duplicate detection and price comparison across vendors.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation + Catalog** - Database schema, EMDN setup, and browsable product table
- [ ] **Phase 2: Product Management** - Detail views, editing, and deletion capabilities
- [ ] **Phase 3: AI Extraction** - Gemini-powered product data extraction from vendor sheets
- [ ] **Phase 4: Comparison Engine** - Duplicate detection and multi-vendor price comparison

## Phase Details

### Phase 1: Foundation + Catalog
**Goal**: Users can browse, filter, and search orthopedic products in an elegant, paginated table
**Depends on**: Nothing (first phase)
**Requirements**: FOUN-01, FOUN-02, FOUN-03, DISP-01, DISP-02, DISP-03, DISP-04, DISP-05
**Success Criteria** (what must be TRUE):
  1. User can view products in a sortable table with frozen header
  2. User can filter products by vendor, EMDN category, price range, and material
  3. User can paginate through products (20 per page)
  4. User can search products by name, description, or SKU
  5. Table displays with light theme styling and smooth Framer Motion animations
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Project setup (Next.js 15, Tailwind v4, Supabase) and database schema
- [x] 01-02-PLAN.md — EMDN data import and seed data (vendors, materials, products)
- [x] 01-03-PLAN.md — Catalog table UI with filtering, search, pagination, and animations

### Phase 2: Product Management
**Goal**: Users can view full product details and manage product data
**Depends on**: Phase 1
**Requirements**: PROD-01, PROD-02, PROD-03, PROD-04, PROD-05
**Success Criteria** (what must be TRUE):
  1. User can view full product detail in modal or side panel
  2. User can see EMDN classification with hierarchy explanation
  3. User can edit product metadata and save changes
  4. User can delete products from the catalog
  5. User can see regulatory info (UDI, CE marking, MDR class)
**Plans**: 4 plans

Plans:
- [ ] 02-01-PLAN.md — Install dependencies, extend types, create Zod schema and Server Actions
- [ ] 02-02-PLAN.md — Create Sheet component, EMDN breadcrumb, and Regulatory info display
- [ ] 02-03-PLAN.md — Create ProductDetail, ProductForm, and DeleteDialog components
- [ ] 02-04-PLAN.md — Integrate ProductSheet and wire to table row actions

### Phase 3: AI Extraction
**Goal**: Users can upload vendor product sheets and have Gemini extract structured data
**Depends on**: Phase 2
**Requirements**: EXTR-01, EXTR-02, EXTR-03, EXTR-04, EXTR-05
**Success Criteria** (what must be TRUE):
  1. User can upload txt/markdown vendor product sheet
  2. Gemini extracts name, description, SKU, vendor, pricing, specs, materials, regulatory info
  3. User can preview all extracted data before saving to catalog
  4. User can edit/correct any extracted field before committing
  5. Gemini suggests appropriate EMDN classification based on product description
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD
- [ ] 03-03: TBD

### Phase 4: Comparison Engine
**Goal**: Users can identify duplicate products and compare prices across vendors
**Depends on**: Phase 3
**Requirements**: DUPL-01, DUPL-02, COMP-01, COMP-02
**Success Criteria** (what must be TRUE):
  1. System warns user when adding product similar to existing one
  2. User sees similarity percentage and links to similar products
  3. Same/similar products from different vendors are grouped together
  4. User can see all vendor prices for a product at a glance
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation + Catalog | 3/3 | Complete | 2026-02-02 |
| 2. Product Management | 0/4 | Planned | - |
| 3. AI Extraction | 0/3 | Not started | - |
| 4. Comparison Engine | 0/2 | Not started | - |

---
*Roadmap created: 2026-02-02*
*Phase 1 planned: 2026-02-02*
*Phase 2 planned: 2026-02-02*
*Depth: quick (3-5 phases)*
