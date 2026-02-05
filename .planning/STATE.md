# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-05)

**Core value:** Procurement can quickly compare prices for identical orthopedic products across multiple vendors
**Current focus:** Milestone v1.2 - Chatbot Interface (Phase 8: Streaming Foundation)

## Current Position

Phase: 8 of 12 (Streaming Foundation)
Plan: 2 of TBD complete
Status: In progress
Last activity: 2026-02-05 - Completed 08-02-PLAN.md (Chat Widget UI)

Progress: [####      ] 40% (2/5 plans complete in Phase 8)

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

### Technical Debt

- Permissive RLS policies need tightening when auth is added
- Manual migration execution required (no automated migration runner)

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-05T10:15:58Z
Stopped at: Completed 08-02-PLAN.md
Resume file: None
Next action: Execute 08-03-PLAN.md (Tool Calling) or plan remaining Phase 8 plans
