# Requirements: MedCatalog

**Defined:** 2026-02-02
**Core Value:** Procurement can quickly compare prices for identical orthopedic products across multiple vendors

## v1.1 Requirements

Requirements for v1.1 release. Each maps to roadmap phases.

### Research Prompt Generator

- [ ] **RSRCH-01**: User can generate structured research prompt from product detail view
- [ ] **RSRCH-02**: Prompt template includes product specs, manufacturer, SKU for EU vendor search
- [ ] **RSRCH-03**: User can copy generated prompt to clipboard with one click
- [ ] **RSRCH-04**: User can open Perplexity in new tab with prompt ready to paste
- [ ] **RSRCH-05**: Prompt output format is documented for consistent comparison data entry

### Bulk Import

- [ ] **IMPORT-01**: User can upload CSV file for bulk product import
- [ ] **IMPORT-02**: System parses CSV and shows column mapping preview
- [ ] **IMPORT-03**: User can map CSV columns to product schema fields
- [ ] **IMPORT-04**: System validates data before import (required fields, format)
- [ ] **IMPORT-05**: System deduplicates by SKU (warns on existing, option to update)
- [ ] **IMPORT-06**: User sees import progress and summary (created, updated, skipped)

### Schema Extension

- [ ] **SCHEMA-01**: Products table has `manufacturer_name` field
- [ ] **SCHEMA-02**: Products table has `manufacturer_sku` field
- [ ] **SCHEMA-03**: Migration script adds fields without data loss
- [ ] **SCHEMA-04**: Product detail and forms display manufacturer info

### Navigation

- [ ] **NAV-01**: EMDN categories display as collapsible tree in filter sidebar
- [ ] **NAV-02**: User can expand/collapse category levels
- [ ] **NAV-03**: Selecting a parent category filters to all descendants
- [ ] **NAV-04**: Current category path shows breadcrumb in filter

### Performance

- [ ] **PERF-01**: Catalog table handles 1000+ products without lag
- [ ] **PERF-02**: EMDN tree lazy-loads children on expand
- [ ] **PERF-03**: Database indexes optimized for new fields

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real-time Perplexity API integration | Manual copy-paste workflow is more flexible and doesn't require API key |
| Multi-file upload | Single CSV at a time is sufficient for v1.1 |
| Excel (.xlsx) import | CSV is universal; Excel adds dependency complexity |
| Background import jobs | Synchronous import with progress is sufficient for ~1000 products |
| Virtual scrolling | Standard pagination handles 1000+ products; defer to v1.2 if needed |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCHEMA-01 | Phase 5 | Complete |
| SCHEMA-02 | Phase 5 | Complete |
| SCHEMA-03 | Phase 5 | Complete |
| SCHEMA-04 | Phase 5 | Complete |
| NAV-01 | Phase 5 | Complete |
| NAV-02 | Phase 5 | Complete |
| NAV-03 | Phase 5 | Complete |
| NAV-04 | Phase 5 | Complete |
| PERF-01 | Phase 5 | Human Verification |
| PERF-02 | Phase 5 | Complete |
| PERF-03 | Phase 5 | Complete |
| IMPORT-01 | Phase 6 | Complete |
| IMPORT-02 | Phase 6 | Complete |
| IMPORT-03 | Phase 6 | Complete |
| IMPORT-04 | Phase 6 | Complete |
| IMPORT-05 | Phase 6 | Complete |
| IMPORT-06 | Phase 6 | Complete |
| RSRCH-01 | Phase 7 | Pending |
| RSRCH-02 | Phase 7 | Pending |
| RSRCH-03 | Phase 7 | Pending |
| RSRCH-04 | Phase 7 | Pending |
| RSRCH-05 | Phase 7 | Pending |

**Coverage:**
- v1.1 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-02*
*Last updated: 2026-02-02 after Phase 6 completion*
