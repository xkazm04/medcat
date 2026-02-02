# Roadmap: MedCatalog v1.1

## Overview

MedCatalog v1.1 extends the catalog with bulk import capabilities and deep research tooling. The roadmap adds manufacturer tracking to the schema, improves navigation for large datasets with EMDN tree browsing, enables CSV bulk import for existing product data, and provides structured research prompts for finding EU vendor pricing via Perplexity.

## Phases

**Phase Numbering:**
- Continues from v1.0 (phases 1-4)
- v1.1 starts at phase 5

- [x] **Phase 5: Schema & Navigation** - Manufacturer fields, EMDN tree navigation, performance foundation
- [ ] **Phase 6: Bulk Import** - CSV upload, column mapping, deduplication, import flow
- [ ] **Phase 7: Research Prompt** - Structured prompt generator for EU vendor pricing research

## Phase Details

### Phase 5: Schema & Navigation
**Goal**: Schema supports manufacturer info, EMDN tree enables hierarchical browsing, catalog handles 1000+ products
**Depends on**: v1.0 completion (phases 1-4)
**Requirements**: SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-04, NAV-01, NAV-02, NAV-03, NAV-04, PERF-01, PERF-02, PERF-03
**Success Criteria** (what must be TRUE):
  1. Products table has manufacturer_name and manufacturer_sku columns
  2. Product detail shows manufacturer info when available
  3. EMDN filter shows collapsible tree with expand/collapse
  4. Selecting parent category filters to all descendants
  5. Catalog table responsive with 1000 products loaded
**Plans**: 2 plans
Plans:
- [ ] 05-01-PLAN.md - Schema extension: manufacturer fields, types, UI
- [ ] 05-02-PLAN.md - Descendant navigation: RPC function, query update, breadcrumb

### Phase 6: Bulk Import
**Goal**: Users can import products from CSV files with column mapping and deduplication
**Depends on**: Phase 5 (schema must have manufacturer fields)
**Requirements**: IMPORT-01, IMPORT-02, IMPORT-03, IMPORT-04, IMPORT-05, IMPORT-06
**Success Criteria** (what must be TRUE):
  1. User can upload CSV file and see parsed preview
  2. User can map CSV columns to product fields
  3. System validates required fields before import
  4. System warns on duplicate SKUs with update option
  5. User sees import summary (created, updated, skipped counts)
**Plans**: TBD during planning

### Phase 7: Research Prompt
**Goal**: Users can generate structured research prompts for finding EU vendors and pricing via Perplexity
**Depends on**: Phase 5 (needs manufacturer fields for complete prompts)
**Requirements**: RSRCH-01, RSRCH-02, RSRCH-03, RSRCH-04, RSRCH-05
**Success Criteria** (what must be TRUE):
  1. Product detail has "Research Pricing" button
  2. Button generates structured prompt with product specs
  3. User can copy prompt to clipboard with one click
  4. User can open Perplexity in new tab
  5. Prompt format documented for consistent data entry
**Plans**: TBD during planning

## Progress

**Execution Order:**
Phases execute in numeric order: 5 -> 6 -> 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 5. Schema & Navigation | 0/2 | Planned | — |
| 6. Bulk Import | 0/? | Not Started | — |
| 7. Research Prompt | 0/? | Not Started | — |

---
*Roadmap created: 2026-02-02*
*Milestone: v1.1 Deep Research & Bulk Import*
*Continues from: v1.0 (phases 1-4)*
