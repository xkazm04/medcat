# EU Reference Pricing — Data Sources

## All Pricing Sources

| Source | Country | Data Type | How Used | Quality | Coverage |
|---|---|---|---|---|---|
| **SK MZ SR SZM Excel** | SK | Reimbursement ceilings per device | **Quarterly import script** (`import:sk-szm`) | T1 — Official | 839 prices, 127 categories, 712 devices |
| **FR LPPR tariffs** | FR | Reimbursement ceilings per component | **Import script** (`import:lppr`) | T1 — Official | 6 knee revision tariffs (expandable) |
| **FR LPPR (ameli.fr)** | FR | Reimbursement tariffs, LPP codes | **Gemini web search** (chat + test) | T1 — Official | Found for 5/10 test products |
| **SK MZ SR (kategorizacia)** | SK | Category reimbursement ceilings | **Gemini web search** (chat + test) | T1 — Official | Found for 3/10 test products |
| **EU TED (ted.europa.eu)** | EU | Tender award values | **Gemini web search** (chat + test) | T2 — Tender | Occasional, lot-level prices |
| **GB NHS (find-tender)** | GB | Framework agreement prices | **Gemini web search** (chat + test) | T2 — Tender | Found for 1-2/10 test products |
| **IN NPPA** | IN | Ceiling prices for implants | **Gemini web search** (chat + test) | T3 — Non-EU | Found for 3-6/10 test products |
| **CZ openprocurements** | CZ | Lot-level tender estimates | **Gemini web search** only | T2 — Tender | Lot values only, no unit prices |
| **FR LPPR / SK MZ SR / EU TED** | Multi | Registry-specific search queries | **Deep research prompt** (product detail) | N/A | User-guided manual research |
| **SUKL ZPSCAU (CZ)** | CZ | Outpatient device prices | **Not used** — no surgical implants | N/A | 0 orthopedic implants |
| **VZP ZUM catalog (CZ)** | CZ | Surgical implant reimbursement | **Not available** — PDF-only, needs OCR | Potentially T1 | Unknown coverage |

## Source Quality Tiers

| Tier | Description | Sources |
|---|---|---|
| **T1** | Official national reimbursement registries | FR LPPR, SK MZ SR, DE InEK, CZ SUKL |
| **T2** | Official procurement / tender portals | EU TED, GB NHS, CZ/HU national tenders, Malta contracts.gov |
| **T3** | Non-EU official ceiling prices | IN NPPA |
| **T99** | Blocked — retail marketplaces | IndiaMART, Hospital Store, Tradeindia, MedicalExpo, etc. |

## By Access Method

| Method | Sources Used | When Triggered |
|---|---|---|
| **Quarterly import scripts** | SK SZM Excel, FR LPPR tariffs | Scheduled/manual DB refresh (`npm run import:sk-szm`, `npm run import:lppr`) |
| **Gemini web search** (chat tool) | FR LPPR, SK MZ SR, EU TED, GB NHS, IN NPPA, CZ tenders | User asks about prices/alternatives in chat (`searchExternalProducts`, `lookupReferencePrices`) |
| **Deep research prompt** (product detail) | Links to legifrance.gouv.fr, kategorizacia.mzsr.sk, EUDAMED | User clicks "Research EU Pricing" on product detail page |
| **DB lookup** (reference_prices table) | All imported data (SK SZM + FR LPPR) | `lookupReferencePrices` chat tool, `ReferencePricesWidget` on product detail |

## Current DB Coverage

| Metric | Value |
|---|---|
| Total reference prices in DB | **839** |
| SK MZ SR prices | 839 (127 category + 712 device) |
| FR LPPR prices | 0 (script ready, migration not yet applied) |
| Products with matching ref prices | **377 / 2,569** (15%) |
| EMDN categories covered | 11 (hip, knee, shoulder, elbow, ankle, hand, osteosynthesis) |

## CZ Investigation Results

### cz.openprocurements.com

- 60+ orthopedic tenders found via CPV 33183100
- Shows lot-level estimated values (e.g., CZK 60M for all implant types at FN Hradec Kralove)
- No per-device unit prices — those are in PDF attachments on TenderArena (behind auth)
- No API, frequent 503 errors, HTML-only
- Best use: discovery tool for Gemini web search, not import source

### SUKL ZPSCAU

- Downloaded and inspected the 12,848-row XLSX (March 2024)
- Contains only voucher-dispensed outpatient devices (braces, hearing aids, wound care)
- Zero surgical implant entries — orthopedic implants are reimbursed through hospital DRG
- **Not useful for our case**

### VZP ZUM Catalog

- Surgical implant reimbursement prices exist in VZP ZUM catalog
- Available as PDF only (`pzt1125m.pdf`) — would need OCR/parsing
- Potentially high value but high effort to extract

## SK SZM Details

- **Source file**: `health.gov.sk/Zdroje?/Sources/kategorizacia/zkszm/YYYYMM/Zoznam_SZM_YYYYMM.xlsx`
- **Update cadence**: Quarterly (Jan 1, Apr 1, Jul 1, Oct 1)
- **XC code groups**: XC1 (hip), XC2 (knee), XC3 (other joints), XC4 (osteosynthesis), XC5 (arthroscopy)
- **Price columns**: UZP (insurance reimbursement per device), UZP2 (category-level ceiling per set)
- **XC-to-EMDN mapping**: AI-assisted via Gemini, cached in `scripts/data/sk-xc-emdn-mapping.json`

## Potential Expansion

| Source | Effort | Potential Impact |
|---|---|---|
| Expand FR LPPR (scrape ameli.fr) | Medium — need to map more LPP codes | Could cover all joint prosthesis categories |
| VZP ZUM PDF parsing | High — PDF extraction + OCR | Would add CZ surgical implant prices |
| TED open data (CSV bulk) | Medium — download + filter CPV 33183100 | EU-wide tender award values |
| Hlidac statu API (CZ contracts) | Medium — API integration + text parsing | CZ contract values (not unit prices) |

## Gemini Web Search Test Results

Tested across 10 diverse products with quality filtering enabled:

| Run | Products with prices | Total prices | Parse strategy |
|---|---|---|---|
| v1 (original) | 4/10 (40%) | 4 | mixed |
| v2 (strict prompt) | 3/10 (30%) | 7 | structured_lines |
| v3 (balanced prompt) | 7/10 (70%) | 54 raw, 16 after filter | structured_lines (100%) |

Quality filter removes: Indian marketplaces, retail catalogs, non-EU commercial sources. Keeps: T1 official registries, T2 tenders, T3 NPPA ceiling prices.
