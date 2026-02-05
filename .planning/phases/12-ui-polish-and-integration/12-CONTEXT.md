# Phase 12: UI Polish and Integration - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Production-ready chat UX with visual feedback and catalog integration. Users see typing indicators while AI responds, get starter prompts on chat open, can use quick action buttons after results, and can click "Open in catalog" to apply chat filters to the main data table. Does not add new search capabilities or chat features.

</domain>

<decisions>
## Implementation Decisions

### Typing indicator
- Animated text style: "Generating response..." with subtle animation
- Position: Fixed above input field (always visible)
- Timing: Shows before first token only, disappears once streaming starts
- Does not change based on tool being used

### Starter prompts
- Layout: Clickable chips (horizontal row of pill-shaped buttons)
- Count: 3 prompts
- Content: Feature showcase (highlight capabilities: search, compare prices, find alternatives)
- Behavior: Disappear after first message sent, do not reappear

### Quick actions
- Actions: Context-dependent (different actions based on what's shown, e.g., no "compare" for single result)
- Style: Ghost buttons (outlined, subtle, don't compete with content)
- Position: Below results, as a row of buttons after product cards
- Behavior: Direct action (clicking sends immediately, not pre-fill input)

### Open in catalog
- Filter transfer: URL params (shareable, bookmarkable)
- Button placement: On each product card (individual button per product)
- Chat behavior: Chat stays open (user can continue conversation)
- Feedback: Smooth scroll to table when filters applied

### Claude's Discretion
- Exact animation timing for typing indicator
- Specific starter prompt wording (as long as they showcase features)
- Which quick actions appear for which contexts (compare/show more/filter logic)
- Ghost button styling details (border color, hover state)

</decisions>

<specifics>
## Specific Ideas

- Typing indicator as animated text feels more informative than dots
- Feature showcase prompts help users discover capabilities they didn't know existed
- Individual "Open in catalog" per card is more useful than bulk action for procurement workflows

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 12-ui-polish-and-integration*
*Context gathered: 2026-02-05*
