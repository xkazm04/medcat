# Phase 10: Context and Error Handling - Research

**Researched:** 2026-02-05
**Domain:** Vercel AI SDK context management and error handling
**Confidence:** HIGH

## Summary

This phase enhances the existing chat implementation with proper context management (multi-turn conversations within token limits) and graceful error handling. The Vercel AI SDK (v6) provides built-in capabilities for both concerns through the `useChat` hook.

The existing codebase uses `useChat` with `streamText` and the Google Gemini provider. The hook already manages message state automatically. The key additions are: (1) message truncation logic to stay within limits, (2) `onError` callback for error handling, (3) error bubble UI component, and (4) retry functionality via the `regenerate()` method.

**Primary recommendation:** Implement client-side message truncation with FIFO removal when approaching limits, add `onError` callback to useChat, create an ErrorBubble component with retry button, and wrap streamText in try-catch for server-side error classification.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ai | ^6.0.71 | Core AI SDK with streamText | Already installed, provides error types and retry support |
| @ai-sdk/react | ^3.0.73 | useChat hook | Already installed, provides error/status/regenerate |
| @ai-sdk/google | ^3.0.21 | Gemini provider | Already installed, handles API communication |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none needed) | - | All functionality covered by AI SDK | - |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Client-side truncation | Server-side truncation | Server has better token counting, but adds latency and complexity for this use case |
| Hard message cap | Token-based cap | Token counting adds complexity; message cap (50) is simpler and sufficient for this UI |
| Custom retry logic | AI SDK regenerate() | regenerate() is built-in and handles state correctly |

**Installation:**
No additional packages needed. All required functionality exists in currently installed packages.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/chat/
│   ├── chat-panel.tsx       # Add onError, message limit check, error state
│   ├── message-list.tsx     # Add error bubble rendering
│   ├── message-bubble.tsx   # Existing, unchanged
│   └── error-bubble.tsx     # NEW: Error display with retry button
├── lib/chat/
│   ├── constants.ts         # Add MAX_MESSAGES, error message templates
│   ├── tools.ts             # Existing, unchanged
│   └── errors.ts            # NEW: Error classification utilities
└── app/api/chat/
    └── route.ts             # Add try-catch, error response handling
```

### Pattern 1: Message Truncation (Client-Side FIFO)

**What:** Remove oldest messages when approaching the limit, keeping system context intact.
**When to use:** Before sending new messages when `messages.length >= MAX_MESSAGES`.
**Example:**
```typescript
// Source: CONTEXT.md decision - 50 message cap, FIFO truncation
const MAX_MESSAGES = 50;

function truncateMessages(messages: UIMessage[]): UIMessage[] {
  if (messages.length <= MAX_MESSAGES) return messages;

  // Keep first message if it's system context, otherwise just truncate oldest
  const truncated = messages.slice(-MAX_MESSAGES);
  return truncated;
}

// In chat-panel.tsx, before sendMessage
if (messages.length >= MAX_MESSAGES) {
  // Block with "Chat full" message per CONTEXT.md
  return; // Show blocking UI instead
}
```

### Pattern 2: Error Handling with useChat

**What:** Use onError callback for error capture, error state for display, regenerate() for retry.
**When to use:** All chat error scenarios.
**Example:**
```typescript
// Source: https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat
const {
  messages,
  sendMessage,
  status,
  error,       // Error object when status === 'error'
  clearError,  // Reset error state
  regenerate,  // Retry last message
} = useChat({
  onError: (error) => {
    // Log for debugging, but don't expose raw errors to user
    console.error('[Chat Error]', error);
  },
});

// Detect error state
const hasError = status === 'error' && error !== null;
```

### Pattern 3: Server-Side Error Classification

**What:** Wrap streamText in try-catch, classify errors, return appropriate responses.
**When to use:** API route for all provider calls.
**Example:**
```typescript
// Source: https://ai-sdk.dev/docs/reference/ai-sdk-errors/ai-api-call-error
import { APICallError } from 'ai';

export async function POST(req: Request) {
  try {
    const result = streamText({ ... });
    return result.toUIMessageStreamResponse();
  } catch (error) {
    // Classify error type
    if (APICallError.isInstance(error)) {
      const statusCode = error.statusCode;

      if (statusCode === 429) {
        // Rate limit - not retryable per CONTEXT.md
        return new Response('Rate limited', { status: 429 });
      }

      if (error.isRetryable) {
        // Network/timeout - retryable
        return new Response('Retryable error', { status: 503 });
      }
    }

    // Generic error
    return new Response('Server error', { status: 500 });
  }
}
```

### Pattern 4: Auto-Retry with Silent First Attempt

**What:** Automatically retry once before showing error to user.
**When to use:** Network errors, timeouts (not rate limits).
**Example:**
```typescript
// In chat-panel.tsx
const [retryCount, setRetryCount] = useState(0);

useEffect(() => {
  if (status === 'error' && error && retryCount === 0) {
    // Check if retryable (not rate limit)
    const isRetryable = !error.message?.includes('rate') &&
                        !error.message?.includes('429');
    if (isRetryable) {
      setRetryCount(1);
      regenerate(); // Silent auto-retry
    }
  }
}, [status, error, retryCount, regenerate]);
```

### Anti-Patterns to Avoid

- **Exposing raw error messages:** Always show friendly messages, log raw errors server-side only.
- **Retrying rate limits:** Rate limits should NOT be auto-retried (wastes quota, extends wait).
- **Token counting on client:** Approximate with message count instead; exact token counting is complex and provider-specific.
- **Discarding partial responses:** When streaming fails mid-way, keep what was received (though AI SDK v6 may discard - known issue).

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Message state management | Custom useState/context | useChat hook | Handles streaming, optimistic updates, error states |
| Retry logic | setTimeout loops | regenerate() method | Properly resets state, handles abort signals |
| Error classification | Manual status code checks | APICallError.isInstance() + isRetryable | Consistent across providers |
| Stream abort | Manual cleanup | useChat stop() + abortSignal | Already integrated in existing code |

**Key insight:** The AI SDK v6 provides a complete error handling story through useChat's error/status/regenerate/clearError. The main work is: (1) wiring these to UI, (2) classifying errors for user-friendly messages, and (3) implementing the 50-message cap.

## Common Pitfalls

### Pitfall 1: Checking Wrong Error Properties

**What goes wrong:** Developers check `error.message` for status codes instead of using `statusCode` property.
**Why it happens:** Error message format varies by provider.
**How to avoid:** Use `APICallError.isInstance(error)` then check `error.statusCode` for HTTP status.
**Warning signs:** Rate limit handling works for one provider but not another.

### Pitfall 2: Message Count vs Token Count Confusion

**What goes wrong:** Implementing token counting logic when message counting is sufficient.
**Why it happens:** Token limits are the "real" constraint, so developers over-engineer.
**How to avoid:** Per CONTEXT.md, use 50-message hard cap. Silent truncation handles edge cases.
**Warning signs:** Complex token estimation code, counting varies by provider.

### Pitfall 3: Retrying Rate Limits

**What goes wrong:** Auto-retry logic triggers on rate limits, extending wait time.
**Why it happens:** Generic "retry all errors" approach.
**How to avoid:** Explicitly check for 429/rate limit before retry. Per CONTEXT.md: no auto-retry for rate limits.
**Warning signs:** User sees multiple "too many requests" errors in quick succession.

### Pitfall 4: Losing State on Error

**What goes wrong:** User's message disappears when error occurs.
**Why it happens:** useChat may discard messages on error in some scenarios.
**How to avoid:** The user's message is preserved in useChat; only the failed assistant response may be affected. Use regenerate() rather than resending.
**Warning signs:** User has to retype their question after error.

### Pitfall 5: Not Clearing Error State

**What goes wrong:** Error message persists after user takes action.
**Why it happens:** Forgetting to call clearError().
**How to avoid:** Call clearError() when user clicks retry or sends new message.
**Warning signs:** Red error bubble stays visible even after successful messages.

## Code Examples

Verified patterns from official sources:

### useChat Error Handling Setup
```typescript
// Source: https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat
'use client';

import { useChat } from '@ai-sdk/react';

export function ChatPanel() {
  const {
    messages,
    sendMessage,
    status,
    error,
    clearError,
    regenerate,
    stop,
  } = useChat({
    onError: (error) => {
      // Optional: log to error tracking service
      console.error('[Chat]', error);
    },
  });

  const isError = status === 'error';
  const isStreaming = status === 'streaming';

  const handleRetry = () => {
    clearError();
    regenerate();
  };

  // ... render logic
}
```

### Error Bubble Component
```typescript
// Source: Pattern derived from CONTEXT.md requirements
// Tone: conversational, Visual: red/warning, Retry: for retryable only

interface ErrorBubbleProps {
  message: string;
  isRetryable: boolean;
  onRetry?: () => void;
}

export function ErrorBubble({ message, isRetryable, onRetry }: ErrorBubbleProps) {
  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[85%] px-4 py-2.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-2xl rounded-bl-md">
        <p className="text-sm">{message}</p>
        {isRetryable && onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 text-xs underline hover:no-underline"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
```

### Error Message Classification
```typescript
// Source: CONTEXT.md decisions + AI SDK error types
import { APICallError } from 'ai';

interface ClassifiedError {
  userMessage: string;
  isRetryable: boolean;
}

export function classifyError(error: unknown): ClassifiedError {
  // Rate limit (429)
  if (APICallError.isInstance(error) && error.statusCode === 429) {
    return {
      userMessage: "Too many requests. Please wait a moment and try again.",
      isRetryable: false, // Per CONTEXT.md: rate limits don't get retry button
    };
  }

  // Network/timeout errors
  if (APICallError.isInstance(error) && error.isRetryable) {
    return {
      userMessage: "Hmm, something went wrong on my end. Let me try again?",
      isRetryable: true,
    };
  }

  // Check for network-related error messages
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('network') || msg.includes('timeout') || msg.includes('abort')) {
      return {
        userMessage: "Connection interrupted. Let me try again?",
        isRetryable: true,
      };
    }
  }

  // Generic fallback
  return {
    userMessage: "Something went wrong. Please try again.",
    isRetryable: true,
  };
}
```

### Message Limit Check
```typescript
// Source: CONTEXT.md - 50 message cap, block when full
const MAX_MESSAGES = 50;

export function ChatPanel() {
  const { messages, sendMessage, ... } = useChat();

  const isChatFull = messages.length >= MAX_MESSAGES;

  const handleSubmit = (text: string) => {
    if (isChatFull) {
      // Don't send - show blocking message
      return;
    }
    if (text.trim()) {
      sendMessage({ text });
    }
  };

  // Render "Chat full. Clear to continue." when isChatFull
}
```

### Clear Chat Implementation
```typescript
// Source: useChat setMessages for clearing
import { useChat } from '@ai-sdk/react';

export function ChatPanel() {
  const { messages, setMessages, ... } = useChat();

  const handleClearChat = () => {
    setMessages([]); // Clear all messages
  };

  // Add to overflow menu or settings
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| useChat v4 reload() | useChat v6 regenerate() | AI SDK 5.0 | regenerate() is the new method name |
| error as string | error as Error object | AI SDK 5.0 | More structured error handling |
| isLoading boolean | status enum | AI SDK 5.0 | Finer-grained state ('ready', 'submitted', 'streaming', 'error') |
| Manual token counting | Provider handles limits | Ongoing | Providers return errors for token overflow, no client counting needed |

**Deprecated/outdated:**
- `reload()` method: Renamed to `regenerate()` in v5+
- `isLoading` boolean: Use `status === 'streaming'` or `status === 'submitted'` instead
- Manual error parsing from Response: Use `error` object from useChat directly

## Open Questions

Things that couldn't be fully resolved:

1. **Exact token threshold for Gemini 2.5 Flash**
   - What we know: 1,048,576 input tokens max, 65,536 output tokens
   - What's unclear: Exact threshold before 400 errors (approaching vs at limit)
   - Recommendation: 50-message cap is well under any realistic limit; no token counting needed

2. **Partial response preservation on error**
   - What we know: AI SDK v6 may discard partial streamed content on error (GitHub issue #7562)
   - What's unclear: Whether this is fixed in current version
   - Recommendation: Accept this limitation; CONTEXT.md specifies "show what worked + error bubble" but SDK behavior may override

3. **Gemini-specific rate limits**
   - What we know: 429 error returned, varies by tier (Free, Tier 1, Tier 2)
   - What's unclear: Exact RPM/TPM for this project's tier
   - Recommendation: Handle 429 generically; user message "wait and try again" is sufficient

## Sources

### Primary (HIGH confidence)
- [AI SDK useChat Reference](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat) - status, error, regenerate, clearError
- [AI SDK Error Handling](https://ai-sdk.dev/docs/ai-sdk-ui/error-handling) - onError callback, retry patterns
- [AI SDK APICallError](https://ai-sdk.dev/docs/reference/ai-sdk-errors/ai-api-call-error) - statusCode, isRetryable
- [AI SDK streamText Reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text) - timeout, onError, abortSignal

### Secondary (MEDIUM confidence)
- [Gemini Models Documentation](https://ai.google.dev/gemini-api/docs/models) - Token limits for gemini-2.5-flash
- [Gemini Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits) - General rate limit framework

### Tertiary (LOW confidence)
- GitHub Issues (#7562, #4099) - Partial response handling, error handling edge cases
- Community discussions - Rate limit handling nuances

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using already-installed AI SDK, no new dependencies
- Architecture: HIGH - Patterns directly from official docs and existing codebase
- Pitfalls: MEDIUM - Some based on GitHub issues, may be version-specific
- Error classification: MEDIUM - Provider-specific behavior varies

**Research date:** 2026-02-05
**Valid until:** 30 days (AI SDK stable, Gemini API may update rate limits)
