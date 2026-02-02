# Requirements: MedCatalog

**Defined:** 2026-02-02
**Core Value:** Procurement can quickly compare prices for identical orthopedic products across multiple vendors

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Foundation

- [x] **FOUN-01**: Supabase schema supports products, vendors, pricing, materials, EMDN classification
- [x] **FOUN-02**: EMDN codes filtered to orthopedic-relevant categories and imported to database
- [x] **FOUN-03**: NextJS project with Tailwind v4, TypeScript, and Framer Motion configured

### Catalog Display

- [x] **DISP-01**: User can view products in sortable table with frozen header and zebra striping
- [x] **DISP-02**: User can filter products by vendor, EMDN category, price range, and material
- [x] **DISP-03**: User can paginate through products (20 items per page)
- [x] **DISP-04**: User can search products by name, description, or SKU
- [x] **DISP-05**: Catalog table displays elegantly with light theme, advanced typography, Framer Motion animations

### Product Data

- [x] **PROD-01**: User can view full product detail in modal or side panel
- [x] **PROD-02**: User can see EMDN classification code with hierarchy explanation
- [x] **PROD-03**: User can edit product metadata
- [x] **PROD-04**: User can delete products
- [x] **PROD-05**: User can see regulatory info (UDI, CE marking, MDR class)

### AI Extraction

- [x] **EXTR-01**: User can upload txt/markdown vendor product sheet
- [x] **EXTR-02**: Gemini extracts structured data: name, description, SKU, vendor, pricing, specs, materials, regulatory info
- [x] **EXTR-03**: User can preview extracted data before saving
- [x] **EXTR-04**: User can edit/correct extracted fields before committing
- [x] **EXTR-05**: Gemini suggests EMDN classification based on product description

### Duplicate Detection

- [x] **DUPL-01**: System warns user when adding product similar to existing one
- [x] **DUPL-02**: User sees similarity percentage and links to similar products

### Price Comparison

- [x] **COMP-01**: Same/similar products from different vendors grouped for price comparison
- [x] **COMP-02**: User can see all vendor prices for a product at a glance

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Features

- **CONF-01**: Confidence scoring displayed per extracted field
- **SAVE-01**: User can save filter presets for repeated use
- **BULK-01**: User can bulk import products via CSV
- **AUDT-01**: System tracks change history with user, timestamp, before/after values
- **COMP-03**: Side-by-side comparison view for 3-4 products

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real-time vendor catalog sync | Massive complexity; vendors don't have consistent APIs |
| ERP/EHR integration | Each hospital has different systems; scope explosion |
| Multi-currency conversion | Exchange rate complexity; store prices in original currency |
| Advanced analytics dashboard | Need data first; premature optimization |
| Vendor management/scoring | Different problem domain |
| Purchase order generation | Procurement workflow varies by org |
| Multi-language support | English first; EMDN codes standardized in EU |
| Complex role-based permissions | Prototype assumes trusted access |
| Offline mode | Adds sync/conflict complexity |
| Image recognition | Orthopedic implants look similar; high error rate |
| Mobile-optimized UI | Desktop-first for procurement teams |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUN-01 | Phase 1 | Complete |
| FOUN-02 | Phase 1 | Complete |
| FOUN-03 | Phase 1 | Complete |
| DISP-01 | Phase 1 | Complete |
| DISP-02 | Phase 1 | Complete |
| DISP-03 | Phase 1 | Complete |
| DISP-04 | Phase 1 | Complete |
| DISP-05 | Phase 1 | Complete |
| PROD-01 | Phase 2 | Complete |
| PROD-02 | Phase 2 | Complete |
| PROD-03 | Phase 2 | Complete |
| PROD-04 | Phase 2 | Complete |
| PROD-05 | Phase 2 | Complete |
| EXTR-01 | Phase 3 | Complete |
| EXTR-02 | Phase 3 | Complete |
| EXTR-03 | Phase 3 | Complete |
| EXTR-04 | Phase 3 | Complete |
| EXTR-05 | Phase 3 | Complete |
| DUPL-01 | Phase 4 | Complete |
| DUPL-02 | Phase 4 | Complete |
| COMP-01 | Phase 4 | Complete |
| COMP-02 | Phase 4 | Complete |

**Coverage:**
- v1 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0

---
*Requirements defined: 2026-02-02*
*Last updated: 2026-02-02 after roadmap creation*
