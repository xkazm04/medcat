# Roadmap: MedCatalog v1.2

## Overview

MedCatalog v1.2 adds a conversational AI interface to the orthopedic product catalog. Users can query products via natural language, get price comparisons inline, and discover EU market alternatives through web-grounded search. The chatbot supplements (not replaces) the existing catalog UI, providing a faster path to answers for experienced users while maintaining full catalog capabilities.

## Milestones

- v1.0 MVP - Phases 1-4 (shipped 2026-02-02)
- v1.1 Deep Research & Bulk Import - Phases 5-7 (shipped 2026-02-02)
- **v1.2 Chatbot Interface** - Phases 8-12 (in progress)

## Phases

### v1.2 Chatbot Interface (In Progress)

**Milestone Goal:** Natural language interface for product search, price comparison, and EU market alternative discovery.

- [x] **Phase 8: Streaming Foundation** - Chat widget with basic streaming responses ✓
- [ ] **Phase 9: Catalog Search Tools** - NL-to-filter translation via tool calling
- [ ] **Phase 10: Context and Error Handling** - Conversation memory and graceful degradation
- [ ] **Phase 11: External Web Search** - EU market alternatives via Gemini grounding
- [ ] **Phase 12: UI Polish and Integration** - Typing indicators, quick actions, catalog integration

## Phase Details

### Phase 8: Streaming Foundation
**Goal**: Users can open a chat widget and receive streaming text responses from Gemini
**Depends on**: Nothing (first phase of v1.2, builds on existing infrastructure)
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-07, INFRA-01, INFRA-02
**Success Criteria** (what must be TRUE):
  1. User can open floating chat widget from catalog page via bottom-right button
  2. Chat panel slides out with smooth animation and can be closed
  3. User can type a message and send it with button or Enter key
  4. AI response streams in real-time (text appears incrementally, not all at once)
  5. Closing chat during streaming cleanly aborts the connection (no memory leaks)
**Plans**: 2 plans

Plans:
- [x] 08-01-PLAN.md - Streaming infrastructure (Vercel AI SDK + API route) ✓
- [x] 08-02-PLAN.md - Chat widget UI (components + page integration) ✓

### Phase 9: Catalog Search Tools
**Goal**: Users can search the product catalog via natural language and get structured results
**Depends on**: Phase 8
**Requirements**: SRCH-01, SRCH-02, SRCH-03, SRCH-04, SRCH-06, COMP-01, COMP-02, COMP-03, INFRA-03
**Success Criteria** (what must be TRUE):
  1. User can ask "show me titanium knee implants under 500 EUR" and see matching products
  2. Search results display as product cards within the chat
  3. User can request price comparison for a product and see vendors/prices in an inline table
  4. When query is ambiguous, AI suggests relevant EMDN categories to narrow search
  5. Tool calls wrap existing queries (getProducts, findSimilar, comparePrices) without duplicating logic
**Plans**: 2 plans

Plans:
- [ ] 09-01-PLAN.md - Tool definitions + API route integration
- [ ] 09-02-PLAN.md - Tool rendering components (cards, tables, chips)

### Phase 10: Context and Error Handling
**Goal**: Conversations maintain context across turns and handle errors gracefully
**Depends on**: Phase 9
**Requirements**: INFRA-04, INFRA-05
**Success Criteria** (what must be TRUE):
  1. User can have multi-turn conversations without context being lost ("show me more like that")
  2. Long conversations do not exhaust token limits or cause errors
  3. API failures show friendly fallback messages instead of raw errors
  4. Rate limit and timeout errors are handled with clear user guidance
**Plans**: TBD

Plans:
- [ ] 10-01: TBD

### Phase 11: External Web Search
**Goal**: Users can discover EU market alternatives not in the catalog via web search
**Depends on**: Phase 10
**Requirements**: ALT-01, ALT-02, ALT-03, ALT-04
**Success Criteria** (what must be TRUE):
  1. User can ask "find alternatives to [product] on EU market" and get web-sourced results
  2. External suggestions include source citations (links to original sources)
  3. Results are clearly labeled as "external" to distinguish from catalog data
  4. AI uses Gemini Google Search grounding for EU medical device market queries
**Plans**: TBD

Plans:
- [ ] 11-01: TBD

### Phase 12: UI Polish and Integration
**Goal**: Chat interface has production-ready UX with full catalog integration
**Depends on**: Phase 11
**Requirements**: CHAT-05, CHAT-06, SRCH-05, SRCH-07
**Success Criteria** (what must be TRUE):
  1. User sees typing indicator while AI is generating a response
  2. Chat shows suggested starter prompts when opened (helps new users)
  3. Quick action buttons appear after product results ("Compare prices", "Show more", "Filter by vendor")
  4. User can click "Open in catalog" to apply chat filters to the main data table
**Plans**: TBD

Plans:
- [ ] 12-01: TBD

## Progress

**Execution Order:** Phases 8 -> 9 -> 10 -> 11 -> 12

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 8. Streaming Foundation | v1.2 | 2/2 | Complete | 2026-02-05 |
| 9. Catalog Search Tools | v1.2 | 0/2 | Not started | - |
| 10. Context and Error Handling | v1.2 | 0/? | Not started | - |
| 11. External Web Search | v1.2 | 0/? | Not started | - |
| 12. UI Polish and Integration | v1.2 | 0/? | Not started | - |

---
*Roadmap created: 2026-02-05*
*Milestone: v1.2 Chatbot Interface*
*Continues from: v1.1 (phases 5-7)*
