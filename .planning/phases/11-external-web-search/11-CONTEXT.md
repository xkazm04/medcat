# Phase 11: External Web Search - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can discover EU market alternatives for orthopedic products that aren't in the catalog. Web search is triggered by explicit request referencing a catalog product. Results display with source citations and are visually distinguished from catalog data. Does not add general web browsing or unanchored searches.

</domain>

<decisions>
## Implementation Decisions

### Result presentation
- Card-based layout (similar to catalog product cards, but with external styling)
- Each card shows: product name + source link only (minimal info — user clicks through for details)
- 3-5 results per query (curated selection, user can ask for more)
- AI provides brief 1-2 sentence summary of what it found before showing cards

### Source citations
- Domain name as clickable link (e.g., "medicaldevices.eu" — clean, tells user where they'll go)
- Links open in new tab (user stays in catalog)
- AI summary uses numbered references [1], [2] linking to specific sources
- Hide results with unavailable/broken source links (don't show with warning)

### External vs catalog labeling
- Different card styling to distinguish from catalog (not badge-based)
- Accent color border (e.g., blue) to signal "different source"
- External and catalog results can appear mixed together (distinguished only by styling)
- No disclaimer about data accuracy — styling is sufficient signal

### Query triggering
- Explicit request only — user must ask for "alternatives" or "search the web"
- Never auto-trigger web search (not even when catalog has no matches)
- Must reference a catalog product ("find alternatives to [this product]")
- Brief confirmation before searching: "Searching the web for alternatives to [product]..."

### Claude's Discretion
- Exact accent color for external card borders
- How to handle Gemini grounding API specifics
- Search query formulation for EU medical device market
- Handling cases where grounding returns fewer than 3 results

</decisions>

<specifics>
## Specific Ideas

- This is about finding alternatives the procurement team might not know about
- Results should feel like "leads to investigate" not "verified products"
- The anchor to catalog products ensures relevant context for the search

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 11-external-web-search*
*Context gathered: 2026-02-05*
