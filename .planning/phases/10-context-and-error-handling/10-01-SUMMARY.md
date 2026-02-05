---
phase: 10-context-and-error-handling
plan: 01
subsystem: chat-error-handling
tags: [error-handling, ai-sdk, api, constants]
dependency-graph:
  requires: [08-01, 09-01]
  provides: [classifyError, ClassifiedError, MAX_MESSAGES, error-status-codes]
  affects: [10-02]
tech-stack:
  added: []
  patterns: [error-classification, try-catch-api, http-status-codes]
key-files:
  created:
    - src/lib/chat/errors.ts
  modified:
    - src/lib/chat/constants.ts
    - src/app/api/chat/route.ts
decisions:
  - id: error-classification
    choice: "classifyError utility using APICallError.isInstance"
    why: "AI SDK provides typed error detection for rate limits and retryable errors"
  - id: status-codes
    choice: "429 rate limit, 503 retryable, 500 generic"
    why: "Standard HTTP codes that client can use for retry logic"
metrics:
  duration: ~2 minutes
  completed: 2026-02-05
---

# Phase 10 Plan 01: Error Classification Infrastructure Summary

**One-liner:** Error classification utilities with APICallError detection, conversational messages, and HTTP status code mapping in API route.

## What Was Built

### Error Classification Module (`src/lib/chat/errors.ts`)

Created error classification infrastructure:

- **ClassifiedError interface**: `userMessage` (conversational) + `isRetryable` (boolean)
- **classifyError function**: Handles rate limits (429), retryable errors, network errors, generic fallback
- **Error message templates**: `ERROR_RATE_LIMIT`, `ERROR_NETWORK`, `ERROR_RETRYABLE`, `ERROR_GENERIC`

Error classification logic:
1. Check `APICallError.isInstance(error)` first (AI SDK typed errors)
2. If statusCode === 429: not retryable (rate limit)
3. If `error.isRetryable`: retryable (5xx, temporary)
4. Check error.message for network/timeout/abort strings
5. Default: generic retryable error

### Constants Update (`src/lib/chat/constants.ts`)

Added message limit constants:
- `MAX_MESSAGES = 50` - Hard cap per CONTEXT.md
- `CHAT_FULL_MESSAGE = "Chat full. Clear to continue."` - Blocking message

### API Route Error Handling (`src/app/api/chat/route.ts`)

Added try-catch with proper status codes:
- `429` for rate limits (client should NOT retry)
- `503` for retryable errors (client CAN retry)
- `500` for generic errors (client CAN retry)
- `console.error('[Chat API Error]', error)` for debugging

## Key Changes

| File | Change |
|------|--------|
| `src/lib/chat/errors.ts` | New file - classifyError utility, ClassifiedError interface, error message templates |
| `src/lib/chat/constants.ts` | Added MAX_MESSAGES, CHAT_FULL_MESSAGE |
| `src/app/api/chat/route.ts` | Added APICallError import, try-catch block, status code returns |

## Commits

1. `83b8c04` - feat(10-01): create error classification utilities and update constants
2. `18523e4` - feat(10-01): add error handling to chat API route

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- [x] `npm run build` succeeds
- [x] `classifyError` function exported from errors.ts
- [x] `MAX_MESSAGES = 50` in constants.ts
- [x] API route has `APICallError.isInstance` in try-catch
- [x] Status codes: 429 (rate limit), 503 (retryable), 500 (generic)

## Next Phase Readiness

**Ready for 10-02:** Client-side error handling can now:
- Use `classifyError` to display appropriate messages
- Check `isRetryable` to show/hide retry button
- Use `MAX_MESSAGES` constant for message limit enforcement
