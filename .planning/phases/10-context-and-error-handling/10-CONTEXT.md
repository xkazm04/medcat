# Phase 10: Context and Error Handling - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Conversations maintain context across turns and handle errors gracefully. This phase improves conversation quality by enabling multi-turn references ("show me more like that") and presenting failures in a user-friendly way. Does not add new features — makes existing chat more robust.

</domain>

<decisions>
## Implementation Decisions

### Context memory behavior
- Reference scope: entire conversation (within token limits)
- AI silently uses context without acknowledging it (feels magical, not verbose)
- Session persistence: messages persist within browser session (until page refresh)
- "Clear chat" option available in settings/overflow menu (not always visible in header)

### Token limit handling
- Silent truncation when approaching token limit (no warning to user)
- Truncation priority: oldest messages first (FIFO)
- Hard message cap: 50 messages maximum
- At message limit: block until cleared ("Chat full. Clear to continue.")

### Error message presentation
- Tone: conversational ("Hmm, something went wrong on my end. Let me try again?")
- Detail level: specific when helpful (rate limits get specific, others stay generic)
- Visual style: red/warning bubble (distinct from normal chat bubbles)
- Rate limit info: simple message ("Too many requests. Please wait and try again.") without countdown

### Recovery actions
- Retry button: yes, for retryable errors only (network/timeout get retry, rate limits don't)
- Auto-retry: 1 automatic silent retry before showing error to user
- Partial failure: show what worked + error bubble for failed part
- No "Report issue" option — keep error handling self-contained

### Claude's Discretion
- Exact wording of error messages (within conversational tone)
- Token threshold for triggering truncation
- How to detect retryable vs non-retryable errors
- Backoff timing for auto-retry

</decisions>

<specifics>
## Specific Ideas

- Silent context usage makes the AI feel smart without being verbose
- Blocking at 50 messages is explicit — user knows what to do
- 1 auto-retry reduces user friction for transient failures
- Partial failures still provide value (don't throw away successful parts)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 10-context-and-error-handling*
*Context gathered: 2026-02-05*
