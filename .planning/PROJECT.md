# MedCatalog

## What This Is

A vendor-neutral medical product catalog for orthopedic materials. Procurement teams upload vendor product sheets, which are automatically classified using EMDN standards and compared against existing inventory. The system enables price comparison across vendors for the same or equivalent products.

## Core Value

Procurement can quickly compare prices for identical orthopedic products across multiple vendors — the same product, different suppliers, all prices visible at a glance.

## Requirements

### Validated (v1.0 + v1.1)

**v1.0 - Core Catalog**
- [x] User can upload txt/markdown vendor product sheet and have it analyzed by Gemini
- [x] Gemini extracts structured data: name, description, SKU, pricing, specs, materials, regulatory info
- [x] Gemini classifies product per EMDN (orthopedic subset)
- [x] System warns user of duplicate/similar products in catalog
- [x] User can review and edit extracted metadata before saving
- [x] Products save to Supabase with vendor, pricing, material composition, EMDN classification
- [x] Catalog displays as sortable, filterable, paginated table (20 items/page)
- [x] User can view product detail
- [x] User can edit product metadata
- [x] User can delete products
- [x] Same products from different vendors are grouped for price comparison
- [x] UI is elegant, light-themed, with smooth animations (Motion)

**v1.1 - Deep Research & Bulk Import**
- [x] User can generate structured research prompt from product specs
- [x] Research prompt opens Perplexity with copy-to-clipboard
- [x] User can import products from CSV files (bulk import)
- [x] CSV import supports column mapping to schema fields
- [x] Schema supports manufacturer (separate from vendor/supplier)
- [x] System deduplicates products by SKU during import
- [x] User can navigate EMDN categories hierarchically (tree view)
- [x] Catalog performs well with 1000+ products

### Active (v1.2)

**Chatbot Interface (Experimental)**

- [ ] User can open floating chat widget from catalog page
- [ ] Chatbot queries product catalog via natural language
- [ ] Chatbot uses Gemini with web search for EU market alternatives
- [ ] Responses include interactive button options (quick actions)
- [ ] Responses include inline tables for product comparisons
- [ ] User can find products by category, price, material, specs
- [ ] User can request price comparison across vendors
- [ ] User can search for alternative products on EU market

### Out of Scope

- Multi-page navigation — this is a single-page application
- User authentication — prototype assumes trusted access
- Vendor management portal — vendors don't interact with the system directly
- Mobile-specific layouts — desktop-first prototype
- Real-time collaboration — single-user workflow

## Context

**Domain:** Medical device procurement for hospice/healthcare, specifically orthopedic products (implants, instruments, materials).

**EMDN Classification:** European Medical Devices Nomenclature — hierarchical classification system for medical devices. We have `EMDN V2_EN.xlsx` which needs filtering to orthopedic-relevant categories only.

**Data Sources:**
- Vendor product sheets in txt/markdown format (AI extraction)
- CSV exports from ERP/procurement systems (bulk import)
- Sample: `docs/BornDigital DATA(SVK).csv` — 947 unique products, 10k transaction rows
- Deep research via Perplexity for EU vendor pricing

**Key Data Points to Extract:**
- Basic: Product name, description, vendor SKU/catalog number
- Pricing: Unit price, quantity discounts, currency
- Specs: Dimensions, weight, material composition (titanium, PEEK, stainless steel, etc.)
- Regulatory: CE marking, MDR classification, EMDN code

**Duplicate Detection:** When adding new products, Gemini should check existing catalog for similar items and warn user (not block) — allows linking same product from different vendors.

## Constraints

- **LLM**: Gemini via `genai` SDK, model `gemini-3-flash-preview` — server-side only
- **Database**: Supabase (PostgreSQL) — credentials provided post-migration
- **Stack**: NextJS, Tailwind CSS, TypeScript, Framer Motion
- **UI**: Single page, light theme, elegant design with advanced typography and borders, no dead space
- **Prototype**: Quality over quantity — one polished page, not multiple rough pages

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Warn on duplicates, don't block | Same product from different vendors is valid — that's the comparison use case | ✓ v1.0 |
| Server-side Gemini only | Keep API key secure, no client exposure | ✓ v1.0 |
| Filter EMDN to orthopedic | Full EMDN is too broad for this use case | ✓ v1.0 |
| Material = physical composition | Track what products are made of (titanium, PEEK), not component lists | ✓ v1.0 |
| pg_trgm for similarity | Trigram matching handles word reordering better than LIKE | ✓ v1.0 |
| Dark gray + green UI accents | Professional, minimal design with subtle green highlights | ✓ v1.0 |

---
*Last updated: 2026-02-05 after v1.2 milestone start*
