# Requirements: MedCatalog v1.2

**Defined:** 2026-02-05
**Core Value:** Procurement can quickly compare prices for identical orthopedic products across multiple vendors

## v1.2 Requirements

Requirements for v1.2 release. Each maps to roadmap phases.

### Chat Widget

- [ ] **CHAT-01**: User can open floating chat widget from catalog page (bottom-right button)
- [ ] **CHAT-02**: Chat panel slides out with smooth animation
- [ ] **CHAT-03**: User can close chat panel (returns to floating button)
- [ ] **CHAT-04**: Chat displays streaming text responses from Gemini
- [ ] **CHAT-05**: User sees typing indicator while AI is responding
- [ ] **CHAT-06**: Chat shows suggested starter prompts on open
- [ ] **CHAT-07**: User can type message and send with button or Enter key

### Product Search

- [ ] **SRCH-01**: User can search products via natural language query
- [ ] **SRCH-02**: AI translates natural language to catalog filters
- [ ] **SRCH-03**: Matching products display as cards in chat
- [ ] **SRCH-04**: User can filter by category, vendor, price, material via chat
- [ ] **SRCH-05**: Quick action buttons appear after product results ("Compare prices", "Show more", "Filter by vendor")
- [ ] **SRCH-06**: AI suggests EMDN categories when query is ambiguous
- [ ] **SRCH-07**: User can click "Open in catalog" to apply chat filters to main table

### Price Comparison

- [ ] **COMP-01**: User can request price comparison for a product
- [ ] **COMP-02**: Comparison displays as inline table in chat response
- [ ] **COMP-03**: Table shows product name, vendors, and prices side-by-side

### Alternative Discovery

- [ ] **ALT-01**: User can request alternatives for a product
- [ ] **ALT-02**: AI uses web search to find EU market alternatives
- [ ] **ALT-03**: External suggestions display with source citations
- [ ] **ALT-04**: Results clearly labeled as "external" (not from catalog)

### Infrastructure

- [ ] **INFRA-01**: Chat uses Vercel AI SDK for streaming
- [ ] **INFRA-02**: Proper SSE connection cleanup prevents memory leaks
- [ ] **INFRA-03**: Tool calling wraps existing queries (getProducts, findSimilar, comparePrices)
- [ ] **INFRA-04**: Context management prevents token exhaustion in long conversations
- [ ] **INFRA-05**: Graceful error handling with fallback messages

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Voice input | Nice-to-have, adds complexity without blocking value |
| Chat history persistence | Ephemeral chat is sufficient for v1.2 |
| Full-page chat replacement | Chat supplements catalog, doesn't replace it |
| Multi-product comparison widget | Complex UI, defer to v1.3 |
| Product mutations via chat | Read-only design keeps scope manageable |
| Mobile-optimized chat | Desktop-first, mobile can work but not optimized |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CHAT-01 | Phase 8 | Complete |
| CHAT-02 | Phase 8 | Complete |
| CHAT-03 | Phase 8 | Complete |
| CHAT-04 | Phase 8 | Complete |
| CHAT-05 | Phase 12 | Pending |
| CHAT-06 | Phase 12 | Pending |
| CHAT-07 | Phase 8 | Complete |
| SRCH-01 | Phase 9 | Complete |
| SRCH-02 | Phase 9 | Complete |
| SRCH-03 | Phase 9 | Complete |
| SRCH-04 | Phase 9 | Complete |
| SRCH-05 | Phase 12 | Pending |
| SRCH-06 | Phase 9 | Complete |
| SRCH-07 | Phase 12 | Pending |
| COMP-01 | Phase 9 | Complete |
| COMP-02 | Phase 9 | Complete |
| COMP-03 | Phase 9 | Complete |
| ALT-01 | Phase 11 | Complete |
| ALT-02 | Phase 11 | Complete |
| ALT-03 | Phase 11 | Complete |
| ALT-04 | Phase 11 | Complete |
| INFRA-01 | Phase 8 | Complete |
| INFRA-02 | Phase 8 | Complete |
| INFRA-03 | Phase 9 | Complete |
| INFRA-04 | Phase 10 | Complete |
| INFRA-05 | Phase 10 | Complete |

**Coverage:**
- v1.2 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0

---
*Requirements defined: 2026-02-05*
*Roadmap created: 2026-02-05*
