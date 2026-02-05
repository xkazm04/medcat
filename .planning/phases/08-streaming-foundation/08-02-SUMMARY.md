---
phase: 08-streaming-foundation
plan: 02
subsystem: ui
tags: [chat-widget, motion, useChat, streaming, react-markdown]

# Dependency graph
requires: [08-01]
provides:
  - "Chat widget with floating button and 450x600px panel"
  - "Streaming message display with markdown rendering"
  - "Auto-expanding chat input with keyboard shortcuts"
affects: [08-03-tool-calling, 08-04-product-search]

# Tech tracking
tech-stack:
  added: []
  patterns: [Motion layoutId animation, useChat hook integration, UIMessage parts extraction]

key-files:
  created:
    - src/components/chat/chat-widget.tsx
    - src/components/chat/chat-panel.tsx
    - src/components/chat/chat-input.tsx
    - src/components/chat/message-list.tsx
    - src/components/chat/message-bubble.tsx
  modified:
    - src/app/page.tsx

key-decisions:
  - "Use Motion layoutId for smooth button-to-panel transformation"
  - "TWO cleanup effects in ChatPanel (close + unmount) for abort safety"
  - "Extract text from UIMessage.parts array for AI SDK v6 compatibility"
  - "Wrap Markdown in div for className styling (react-markdown v10+ change)"

patterns-established:
  - "Motion: AnimatePresence mode='wait' with conditional INSIDE"
  - "Chat: useChat hook with sendMessage({ text }) signature"
  - "UIMessage: Filter parts by type='text' to extract content string"

# Metrics
duration: 5min
completed: 2026-02-05
---

# Phase 8 Plan 2: Chat Widget UI Summary

**Floating chat widget with Motion animation, streaming message display, and AI SDK v6 useChat integration**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-05T10:10:41Z
- **Completed:** 2026-02-05T10:15:58Z
- **Tasks:** 3
- **Files created:** 5
- **Files modified:** 1

## Accomplishments

- Created ChatWidget with Motion layoutId animation for button-to-panel transformation
- Built MessageBubble with react-markdown and remarkGfm for table/list/code rendering
- Implemented MessageList with auto-scroll and UIMessage.parts text extraction
- Created ChatInput with auto-expanding textarea, Enter sends, Shift+Enter newlines
- Created ChatPanel with useChat hook integration and dual cleanup effects
- Integrated ChatWidget into main catalog page

## Task Commits

Each task was committed atomically:

1. **Task 1: Create message display components** - `14d3e9b` (feat)
2. **Task 2: Create chat input and panel components** - `520a05b` (feat)
3. **Task 3: Create chat widget and integrate into page** - `00b6f1a` (feat)

## Files Created/Modified

- `src/components/chat/message-bubble.tsx` - Markdown rendering for AI, plain text for user
- `src/components/chat/message-list.tsx` - Auto-scrolling message container with parts extraction
- `src/components/chat/chat-input.tsx` - Auto-expanding textarea with conditional send button
- `src/components/chat/chat-panel.tsx` - useChat integration with abort cleanup
- `src/components/chat/chat-widget.tsx` - Motion animated button/panel toggle
- `src/app/page.tsx` - Added ChatWidget import and render

## Decisions Made

- **Motion layoutId:** Used for smooth button-to-panel animation (not separate components)
- **Dual cleanup effects:** Both isOpen change and unmount call stop() for belt-and-suspenders abort
- **UIMessage parts extraction:** AI SDK v6 uses parts array not content string - added getMessageText helper
- **Markdown wrapper div:** react-markdown v10+ removed className prop, wrapped in styled div

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] sendMessage signature mismatch**
- **Found during:** Task 3 (build verification)
- **Issue:** AI SDK v6 uses `{ text }` not `{ content }` for sendMessage
- **Fix:** Changed `sendMessage({ content: text })` to `sendMessage({ text })`
- **Files modified:** src/components/chat/chat-panel.tsx
- **Commit:** 00b6f1a

**2. [Rule 1 - Bug] react-markdown className prop removed**
- **Found during:** Task 3 (build verification)
- **Issue:** react-markdown v10+ removed className prop from Markdown component
- **Fix:** Wrapped Markdown in div with className instead
- **Files modified:** src/components/chat/message-bubble.tsx
- **Commit:** 00b6f1a

**3. [Rule 1 - Bug] UIMessage content property missing**
- **Found during:** Task 3 (build verification)
- **Issue:** AI SDK v6 UIMessage uses parts array, not content string
- **Fix:** Added getMessageText() helper to extract text from parts array
- **Files modified:** src/components/chat/message-list.tsx
- **Commit:** 00b6f1a

## Issues Encountered

AI SDK v6 API changes from documentation examples:
- `sendMessage` expects `{ text: string }` not `{ content: string }`
- `UIMessage` uses `parts: Array<{ type: 'text', text: string } | ...>` not `content: string`
- react-markdown v10 removed `className` prop

All fixed inline with deviation Rule 1 (bug fixes).

## User Setup Required

None - uses existing GEMINI_API_KEY from environment and /api/chat endpoint from Phase 8 Plan 1.

## Next Phase Readiness

- Chat widget renders and animates correctly
- Messages display with markdown formatting
- Streaming works via useChat hook integration with /api/chat
- Foundation ready for tool calling integration (Plan 3)

---
*Phase: 08-streaming-foundation*
*Completed: 2026-02-05*
