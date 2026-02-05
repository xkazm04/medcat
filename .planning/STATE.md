# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-05)

**Core value:** Procurement can quickly compare prices for identical orthopedic products across multiple vendors
**Current focus:** Milestone v1.2 - Chatbot Interface (Phase 10: Context and Error Handling)

## Current Position

Phase: 10 of 12 (Context and Error Handling) ✓ COMPLETE
Plan: 2 of 2 complete
Status: Phase complete, verified
Last activity: 2026-02-05 - Phase 10 verified (10-VERIFICATION.md)

Progress: [##########] 100% (2/2 plans complete in Phase 10)

## Milestone History

| Version | Phases | Plans | Shipped |
|---------|--------|-------|---------|
| v1.0    | 4      | 14    | 2026-02-02 |
| v1.1    | 3      | 7     | 2026-02-02 |
| v1.2    | 5      | TBD   | In progress |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Key decisions still applicable:

- Tailwind v4 with @theme CSS config (no tailwind.config.js)
- Next.js 15 async cookies() API for Supabase server client
- Use pg_trgm extension for trigram similarity
- Default threshold 0.3 for duplicate warning, 0.5 for price comparison

v1.2 decisions (implemented in 08-01):

- Vercel AI SDK (`ai`, `@ai-sdk/react`, `@ai-sdk/google`) for streaming and tool calling
- Keep existing `@google/genai` extraction client separate from chat
- Read-only chat design (no mutations via chatbot)
- SSE with proper AbortController cleanup via req.signal passthrough
- Use existing GEMINI_API_KEY env var (not GOOGLE_GENERATIVE_AI_API_KEY)

v1.2 decisions (implemented in 08-02):

- Motion layoutId for button-to-panel animation (not separate animated components)
- TWO cleanup effects in ChatPanel - both isOpen change and unmount call stop()
- UIMessage.parts array extraction (AI SDK v6 uses parts not content string)
- sendMessage({ text }) signature (not { content })

v1.2 decisions (implemented in 09-01):

- Import from 'zod/v4' for AI SDK tool inputSchema (AI SDK 6.x uses zod/v4 internally)
- Server-side tool execute for read-only operations
- stepCountIs(3) for multi-step execution (search -> compare -> synthesize)

v1.2 decisions (implemented in 09-02):

- Part-based rendering in MessageList: switch on part.type for text vs tools
- Single-vendor comparison as text, multi-vendor as table (CONTEXT.md)
- "View in catalog" button is placeholder, full integration deferred to Phase 12

v1.2 decisions (implemented in 10-01):

- classifyError utility using APICallError.isInstance for error classification
- HTTP status codes: 429 (rate limit), 503 (retryable), 500 (generic)
- MAX_MESSAGES = 50 as hard cap per CONTEXT.md

v1.2 decisions (implemented in 10-02):

- AI SDK v6 uses regenerate() with clearError() for retry (not reload())
- Auto-retry: one silent retry for retryable errors before showing ErrorBubble
- Chat full state renders alternative UI instead of input field

### Technical Debt

- Permissive RLS policies need tightening when auth is added
- Manual migration execution required (no automated migration runner)

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-05T13:45:00Z
Stopped at: Phase 10 complete and verified
Resume file: None
Next action: Plan Phase 11 (External Web Search)
