---
phase: 12-ui-polish-and-integration
plan: 03
status: complete
completed_at: 2024-01-XX
---

# Plan 12-03 Summary: Table-Chat Integration

## Overview

Connected the catalog table with the chat widget for seamless UX. Users can now click product names or vendor names to insert them into chat, and use the "Ask AI" button for quick queries.

## Completed Tasks

### Task 1: ChatContext for cross-component communication
- Created `src/lib/hooks/use-chat-context.tsx`
- Provides React Context with:
  - `insertText()` - Insert text into chat input
  - `openChat()` - Open chat panel
  - `askAbout()` - Combined: open chat and insert text
  - `sendMessage()` - Send a complete message to chat
  - Registration callbacks for components to register their handlers

### Task 2: Integrated ChatContext into chat components
- **chat-widget.tsx**: Registers `openChat` callback via `registerOpenChat`
- **chat-input.tsx**: Registers input setter via `registerInputSetter`
  - Appends text with space if input already has content
  - Focuses textarea after insertion
- **chat-panel.tsx**: Registers `sendMessage` via `registerSendMessage`

### Task 3: ChatInsertCell component
- Created `src/components/table/chat-insert-cell.tsx`
- Renders clickable button that inserts value into chat
- Supports optional prefix text (e.g., "Show me products from ")
- Falls back to plain span if outside ChatContext or no value

### Task 4: AskAIButton component
- Created `src/components/table/ask-ai-button.tsx`
- Shows MessageCircle icon button on each row
- Sends "Tell me about [productName]" directly to chat
- Stops propagation to avoid triggering row selection

### Task 5: Updated table columns
- **Product name**: Now uses ChatInsertCell - click to ask about product
- **Vendor name**: Uses ChatInsertCell with prefix "Show me products from "
- **Ask AI column**: Added before actions column with AskAIButton

### Task 6: ChatContextProvider wrapper
- Created `src/components/chat-context-wrapper.tsx`
- Updated `src/app/page.tsx` to wrap main content with ChatContextWrapper
- Both table and ChatWidget now share the same context

## Design Decisions

### Category column kept as-is
The ExpandableCategory component provides useful table filtering (clicking a category filters by it). This behavior is more valuable for table navigation than chat insertion. Users can still ask about categories via:
- Typing in chat
- Using the AskAI button
- Starter prompts

### Hover styles
- Product/vendor names: Hover shows accent color and underline
- AskAI button: Hover shows muted background and accent color
- Clear visual indication that elements are interactive

## Files Modified

- `src/lib/hooks/use-chat-context.tsx` (created)
- `src/components/chat-context-wrapper.tsx` (created)
- `src/components/table/chat-insert-cell.tsx` (created)
- `src/components/table/ask-ai-button.tsx` (created)
- `src/components/table/columns.tsx` (modified)
- `src/components/chat/chat-widget.tsx` (modified)
- `src/components/chat/chat-input.tsx` (modified)
- `src/components/chat/chat-panel.tsx` (modified)
- `src/app/page.tsx` (modified)

## Verification

- [x] TypeScript compiles without errors
- [x] ChatContext created with all required functions
- [x] ChatWidget registers openChat callback
- [x] ChatInput registers text setter callback
- [x] ChatPanel registers sendMessage callback
- [x] ChatInsertCell renders clickable product/vendor names
- [x] AskAIButton sends queries to chat
- [x] CatalogClient wrapped with ChatContextProvider
- [x] Dev server runs without errors

## User Experience

1. **Click product name** → Chat opens, product name appears in input
2. **Click vendor name** → Chat opens, "Show me products from [vendor]" appears in input
3. **Click Ask AI button** → Chat opens, sends "Tell me about [product]" immediately
4. **Multiple clicks** → Text appends with space (doesn't replace)
5. **Visual feedback** → Hover states clearly show clickable elements
