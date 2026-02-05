---
phase: "09"
plan: "02"
title: "Tool Result Rendering"
subsystem: "chat-ui"
status: "complete"
completed: "2026-02-05"
duration: "3 minutes"
tags: ["product-cards", "comparison-table", "category-chips", "tool-ui"]
requires: ["09-01"]
provides: ["ProductCard", "ComparisonTable", "CategoryChips", "LoadingSpinner", "tool-part-rendering"]
affects: ["12-catalog-chat-integration"]
tech-stack:
  patterns: ["part-based-rendering", "expand-collapse-cards", "callback-props"]
key-files:
  created:
    - "src/components/chat/loading-spinner.tsx"
    - "src/components/chat/product-card.tsx"
    - "src/components/chat/comparison-table.tsx"
    - "src/components/chat/category-chips.tsx"
  modified:
    - "src/components/chat/message-list.tsx"
    - "src/components/chat/chat-panel.tsx"
decisions:
  - key: "single-vendor-text"
    choice: "Render single-vendor comparison as text, multi-vendor as table"
    rationale: "Per CONTEXT.md - tables with one row look silly"
  - key: "part-based-iteration"
    choice: "Switch on part.type instead of message-level rendering"
    rationale: "AI SDK v6 messages contain multiple parts (text + tools)"
metrics:
  tasks: "3/3"
  commits: 3
  files-changed: 6
---

# Phase 9 Plan 2: Tool Result Rendering Summary

**One-liner:** ProductCard with expand/collapse, ComparisonTable with smart text/table, CategoryChips for EMDN refinement, all wired to MessageList part-based rendering.

## What Was Built

### Loading Spinner (`loading-spinner.tsx`)
- Animated Loader2 icon with customizable text
- Muted foreground styling for non-intrusive loading state
- Used during all tool execution states

### Product Card (`product-card.tsx`)
- Compact view: name, price (formatted), vendor
- Expand button with chevron rotation animation
- Expanded view: SKU, material, EMDN code via Motion animate
- Action buttons: "Compare prices" and "View in catalog"
- Uses `motion/react` for smooth expand/collapse

### Comparison Table (`comparison-table.tsx`)
- Smart rendering based on vendor count:
  - Single vendor: plain text "Available from [Vendor] at [Price]"
  - Multiple vendors: full table with Vendor, Price, SKU columns
- Sorted by price ascending (procurement focus)
- Handles null prices gracefully

### Category Chips (`category-chips.tsx`)
- Intro text: "Your search is broad. Select a category to narrow results:"
- Rounded-full chip buttons with count in parentheses
- Hover transitions to accent colors
- Empty state: "No category suggestions available"

### Message List Updates (`message-list.tsx`)
- Part-based iteration: switch on `part.type`
- Three tool handlers: `tool-searchProducts`, `tool-comparePrices`, `tool-suggestCategories`
- State checking: only render output when `state === 'output-available'`
- Loading spinners during execution
- "No products found" message for empty search results

### Chat Panel Updates (`chat-panel.tsx`)
- `handleComparePrice`: sends "Compare prices for product {id}"
- `handleCategorySelect`: sends "Search in category: {name}"
- `handleViewInCatalog`: console.log placeholder (Phase 12)

## Commits

| Hash | Type | Description |
|------|------|-------------|
| bd6c07b | feat | Add tool result UI components |
| 12e2c3f | feat | Update MessageList to render tool parts |
| 523eb79 | feat | Wire tool callbacks from ChatPanel to MessageList |

## Integration Points

- **ProductCard** imports `ProductWithRelations` from `@/lib/types`
- **ComparisonTable** imports `ProductPriceComparison` from `@/lib/actions/similarity`
- **MessageList** uses typed tool parts from AI SDK v6 message structure
- **ChatPanel** uses `sendMessage` from `useChat` for action callbacks

## Deviations from Plan

None - plan executed exactly as written.

## Testing Notes

To test the full flow:
1. Start dev server: `npm run dev`
2. Open chat widget
3. Type "show me titanium implants"
4. Verify: Product cards appear with compact view
5. Click chevron on a card - verify expanded details
6. Click "Compare prices" - verify new message sent to AI
7. Type "implants" (broad query) - may trigger category chips
8. Click a chip - verify search message sent

## Next Phase Readiness

**Ready for Phase 10:** Web search tools (external)

**Phase 12 dependency:** The "View in catalog" button currently only logs. Full integration (applying filters to main table, scrolling to product) is deferred to Phase 12 Catalog-Chat Integration.
