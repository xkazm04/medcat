# Phase 12: UI Polish and Integration - Research

**Researched:** 2026-02-05
**Domain:** Chat UX Polish, Typing Indicators, Starter Prompts, Quick Actions, Catalog Integration
**Confidence:** HIGH

## Summary

This phase adds four production-ready UX features to the existing chat widget: typing indicator, starter prompts, quick action buttons, and "Open in catalog" integration. The existing codebase already has the Vercel AI SDK (`ai@6.0.71`, `@ai-sdk/react@3.0.73`) with `useChat` hook providing `status` values that enable typing indicators. The chat components (`chat-panel.tsx`, `message-list.tsx`, `product-card.tsx`) and URL-based filtering (`useUrlFilter` hook) are already implemented.

The key insight is that `status === 'submitted'` indicates the exact moment to show "Generating response..." (before first token arrives), while `status === 'streaming'` means tokens are flowing and the indicator should hide. For catalog integration, the existing `useUrlFilter` hook and URL param system (vendor, category, search params) provide the mechanism to apply filters from chat to the main table.

**Primary recommendation:** Add a `TypingIndicator` component keyed on `status === 'submitted'`, render `StarterPrompts` component conditionally when `messages.length === 0` (hiding after first message), add context-aware quick action buttons below product results in `message-list.tsx`, and implement `onOpenInCatalog` with URL params and `scrollIntoView` to the table container.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@ai-sdk/react` | 3.0.73 | `useChat` with `status` for typing indicator state | Already used, provides `submitted`/`streaming` states |
| `motion` | 12.29.3 | Subtle animations for typing indicator and chip transitions | Already used for chat panel animations |
| `lucide-react` | 0.563.0 | Icons for quick action buttons | Already used throughout app |
| `next/navigation` | 16.x | `useRouter`, `useSearchParams` for URL param updates | Already used in `useUrlFilter` hook |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind CSS | 3.x | Pulse animation, ghost button styling | CSS animations, button styles |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS pulse animation | Motion animate | CSS is simpler, no JS overhead for subtle pulse |
| URL params for filter transfer | Context/state | URL params are shareable, bookmarkable per CONTEXT.md |
| Custom scroll logic | `scrollIntoView` API | Native API is simpler and sufficient |

**No new installations required.** All dependencies are already present.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── chat/
│       ├── chat-panel.tsx       # Add typing indicator rendering, starter prompts state
│       ├── chat-input.tsx       # Add typing indicator above input field
│       ├── message-list.tsx     # Add quick action buttons after tool results
│       ├── product-card.tsx     # Update "Open in catalog" to use URL params + scroll
│       ├── typing-indicator.tsx # NEW: Animated "Generating response..." component
│       ├── starter-prompts.tsx  # NEW: Clickable prompt chips component
│       └── quick-actions.tsx    # NEW: Context-aware action buttons component
└── lib/
    └── chat/
        └── constants.ts         # Add STARTER_PROMPTS array
```

### Pattern 1: Typing Indicator with Status Check
**What:** Show "Generating response..." only when `status === 'submitted'` (before first token)
**When to use:** In chat-panel or chat-input, fixed above input field
**Example:**
```typescript
// Source: https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat
// status: "submitted" = request sent, awaiting stream start
// status: "streaming" = receiving tokens, hide indicator

const { status } = useChat();
const showTypingIndicator = status === 'submitted';

// In render:
{showTypingIndicator && <TypingIndicator />}
```

### Pattern 2: Starter Prompts with Message Count Check
**What:** Show clickable prompt chips when no messages exist, hide after first message
**When to use:** In message-list when `messages.length === 0`
**Example:**
```typescript
// Source: CONTEXT.md decision - disappear after first message, do not reappear
const hasMessages = messages.length > 0;

// In render - replace empty state with starter prompts
{!hasMessages ? (
  <StarterPrompts onSelect={(prompt) => sendMessage({ text: prompt })} />
) : (
  // Normal message rendering
)}
```

### Pattern 3: Context-Aware Quick Actions
**What:** Render different action buttons based on result context
**When to use:** After product search results in message-list
**Example:**
```typescript
// Source: CONTEXT.md - no "compare" for single result
function getQuickActions(products: ProductWithRelations[]): QuickAction[] {
  const actions: QuickAction[] = [];

  if (products.length > 1) {
    actions.push({ label: 'Compare prices', action: 'compare' });
  }
  if (products.length >= 5) {
    actions.push({ label: 'Show more', action: 'showMore' });
  }
  if (products.length > 0) {
    actions.push({ label: 'Filter by vendor', action: 'filterVendor' });
  }

  return actions;
}
```

### Pattern 4: Open in Catalog with URL Params + Scroll
**What:** Apply chat filters to main table via URL params, scroll table into view
**When to use:** On product card "Open in catalog" button click
**Example:**
```typescript
// Source: Existing useUrlFilter pattern + scrollIntoView API
import { useRouter, useSearchParams } from 'next/navigation';

function handleOpenInCatalog(product: ProductWithRelations) {
  const params = new URLSearchParams(searchParams.toString());

  // Apply filters based on product attributes
  if (product.vendor?.id) {
    params.set('vendor', product.vendor.id);
  }
  if (product.emdn_category?.id) {
    params.set('category', product.emdn_category.id);
  }
  params.set('page', '1');

  // Update URL (triggers table re-filter)
  router.push(`?${params.toString()}`);

  // Smooth scroll to table area
  // Chat stays open per CONTEXT.md
  document.querySelector('[data-table-container]')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
}
```

### Anti-Patterns to Avoid
- **Showing typing indicator during streaming:** Indicator should hide once tokens start flowing
- **Hardcoding prompt text in multiple places:** Keep STARTER_PROMPTS in constants.ts
- **Closing chat on "Open in catalog":** Per CONTEXT.md, chat stays open for continued conversation
- **Showing "Compare prices" for single product:** Context-aware - no compare action if only one result

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Status detection | Manual flag tracking | `useChat` status property | Already provides 'submitted'/'streaming'/'ready'/'error' |
| URL filter updates | Manual param building | Existing `useUrlFilter` pattern | Handles page reset, encoding, router.push |
| Scroll animation | Custom JS animation | `scrollIntoView({ behavior: 'smooth' })` | Native API, GPU-accelerated |
| Pulse animation | Motion keyframes | Tailwind `animate-pulse` | Zero JS, CSS-only |
| Message count tracking | useState for "hasShownPrompts" | `messages.length === 0` check | Simpler, derives from existing state |

**Key insight:** The existing useChat hook and URL filter infrastructure handle most complexity. New components are thin UI wrappers that read existing state.

## Common Pitfalls

### Pitfall 1: Showing Typing Indicator During Streaming
**What goes wrong:** "Generating response..." persists while tokens are already visible
**Why it happens:** Checking `status !== 'ready'` instead of `status === 'submitted'`
**How to avoid:** Only show indicator when `status === 'submitted'`; hide when `status === 'streaming'`
**Warning signs:** Indicator overlaps with streaming text, visual noise

### Pitfall 2: Starter Prompts Reappearing After Clear Chat
**What goes wrong:** Prompts show again after user clears chat (messages become empty)
**Why it happens:** Checking only `messages.length === 0` without tracking if prompts were used
**How to avoid:** Per CONTEXT.md, prompts "do not reappear" - but simplest implementation allows reappear on clear (acceptable UX since user explicitly cleared)
**Warning signs:** None if behavior is documented as intended

### Pitfall 3: Quick Actions Not Context-Aware
**What goes wrong:** "Compare prices" button appears for single-product result
**Why it happens:** Showing all actions regardless of result count
**How to avoid:** Conditionally render actions: no compare for single result, no "show more" if showing all
**Warning signs:** Compare action leads to confusing single-item comparison

### Pitfall 4: Chat Closing on Open in Catalog
**What goes wrong:** User loses chat context when clicking "Open in catalog"
**Why it happens:** Routing or state change closes chat panel
**How to avoid:** Only update URL params, don't change chat open/close state. Chat widget is independent
**Warning signs:** Chat closes, user has to reopen and loses conversation

### Pitfall 5: Scroll Target Not Found
**What goes wrong:** `scrollIntoView` does nothing or errors
**Why it happens:** No stable selector for table container
**How to avoid:** Add `data-table-container` attribute to main content area or use ref
**Warning signs:** No scroll happens, silent failure

### Pitfall 6: URL Params Not Applied Immediately
**What goes wrong:** Table doesn't filter until page refresh
**Why it happens:** Not using Next.js router properly with existing URL filter pattern
**How to avoid:** Use same pattern as existing filters: `router.push(`?${params.toString()}`)`
**Warning signs:** Filters show in URL but table content unchanged

## Code Examples

Verified patterns from official sources and existing codebase:

### Typing Indicator Component
```typescript
// Source: CONTEXT.md decisions - animated text, subtle animation
// src/components/chat/typing-indicator.tsx
'use client';

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
      <span className="animate-pulse">Generating response</span>
      <span className="flex gap-0.5">
        <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
        <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
        <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
      </span>
    </div>
  );
}
```

### Starter Prompts Component
```typescript
// Source: CONTEXT.md - clickable chips, feature showcase, 3 prompts
// src/components/chat/starter-prompts.tsx
'use client';

interface StarterPromptsProps {
  onSelect: (prompt: string) => void;
}

const PROMPTS = [
  'Search for titanium hip implants',
  'Compare prices for knee prostheses',
  'Find alternatives to DePuy products',
];

export function StarterPrompts({ onSelect }: StarterPromptsProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-4">
      <p className="text-sm text-muted-foreground text-center">
        Try asking about medical devices
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onSelect(prompt)}
            className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-full border border-border transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
```

### Quick Actions Component
```typescript
// Source: CONTEXT.md - ghost buttons, context-dependent, direct action
// src/components/chat/quick-actions.tsx
'use client';

interface QuickActionsProps {
  productCount: number;
  onCompare: () => void;
  onShowMore: () => void;
  onFilterVendor: () => void;
}

export function QuickActions({
  productCount,
  onCompare,
  onShowMore,
  onFilterVendor,
}: QuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/50">
      {productCount > 1 && (
        <button
          onClick={onCompare}
          className="px-3 py-1.5 text-xs border border-border rounded-md hover:bg-muted transition-colors"
        >
          Compare prices
        </button>
      )}
      {productCount >= 5 && (
        <button
          onClick={onShowMore}
          className="px-3 py-1.5 text-xs border border-border rounded-md hover:bg-muted transition-colors"
        >
          Show more
        </button>
      )}
      {productCount > 0 && (
        <button
          onClick={onFilterVendor}
          className="px-3 py-1.5 text-xs border border-border rounded-md hover:bg-muted transition-colors"
        >
          Filter by vendor
        </button>
      )}
    </div>
  );
}
```

### Open in Catalog Handler
```typescript
// Source: Existing useUrlFilter pattern + CONTEXT.md decisions
// In product-card.tsx or passed from chat-panel.tsx

import { useRouter, useSearchParams } from 'next/navigation';

function useOpenInCatalog() {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (product: ProductWithRelations) => {
    const params = new URLSearchParams(searchParams.toString());

    // Apply product-based filters
    if (product.vendor?.id) {
      params.set('vendor', product.vendor.id);
    }
    if (product.emdn_category?.id) {
      params.set('category', product.emdn_category.id);
    }
    // Could also add: params.set('search', product.name);

    params.set('page', '1');
    router.push(`?${params.toString()}`);

    // Smooth scroll to table - chat stays open
    setTimeout(() => {
      document.querySelector('[data-table-container]')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100); // Small delay for URL change to propagate
  };
}
```

### Integration in Chat Panel
```typescript
// Source: Combining patterns in chat-panel.tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { TypingIndicator } from './typing-indicator';
import { StarterPrompts } from './starter-prompts';

export function ChatPanel({ isOpen }: { isOpen: boolean }) {
  const { messages, sendMessage, status, ... } = useChat();

  const showTypingIndicator = status === 'submitted';
  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full">
      {!hasMessages ? (
        <StarterPrompts onSelect={(prompt) => sendMessage({ text: prompt })} />
      ) : (
        <MessageList messages={messages} isStreaming={status === 'streaming'} ... />
      )}

      {/* Typing indicator fixed above input */}
      {showTypingIndicator && <TypingIndicator />}

      <ChatInput ... />
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `isLoading` boolean | `status` enum ('submitted', 'streaming', etc.) | AI SDK 5.0 | Finer-grained control for typing indicator |
| Custom state for prompts | Derive from `messages.length` | Best practice | Simpler, no state sync issues |
| window.scrollTo with offset | scrollIntoView({ behavior: 'smooth' }) | Modern browsers | Native, no calculations needed |
| Global CSS keyframes | Tailwind animate-* utilities | Tailwind 3.x | Consistent with existing styling |

**Deprecated/outdated:**
- Checking `isLoading` for typing indicator: Use `status === 'submitted'` instead
- Manual scroll offset calculations: Use `scrollIntoView` with `block: 'start'`

## Open Questions

Things that couldn't be fully resolved:

1. **Exact timing for scroll after URL change**
   - What we know: URL params trigger re-render, scroll should happen after
   - What's unclear: Whether 100ms setTimeout is optimal or if useEffect with params dependency is better
   - Recommendation: Start with setTimeout(100ms), adjust if scroll happens before table updates

2. **Starter prompts content**
   - What we know: Should showcase features (search, compare, alternatives)
   - What's unclear: Exact wording that resonates with procurement professionals
   - Recommendation: Use clear action-oriented prompts, iterate based on user feedback

3. **"Filter by vendor" quick action implementation**
   - What we know: Should be a direct action per CONTEXT.md
   - What's unclear: Should it filter to all vendors in results, or ask user to pick one?
   - Recommendation: If single vendor in results, apply directly; if multiple, could show vendor list or send chat message

## Sources

### Primary (HIGH confidence)
- [AI SDK useChat Reference](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat) - status values: 'submitted', 'streaming', 'ready', 'error'
- [AI SDK Chatbot Documentation](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot) - status lifecycle for loading states
- Existing codebase: `src/components/chat/chat-panel.tsx` - useChat integration pattern
- Existing codebase: `src/lib/hooks/use-url-filter.ts` - URL param update pattern

### Secondary (MEDIUM confidence)
- [Chat UX Best Practices](https://getstream.io/blog/chat-ux/) - Starter prompts as chips pattern
- [MDN scrollIntoView](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView) - Smooth scroll API
- [Next.js Scroll to Element](https://reacthustle.com/blog/nextjs-scroll-to-element) - Next.js-specific scroll patterns

### Tertiary (LOW confidence)
- WebSearch: CSS typing indicator patterns - animation timing may vary by implementation

## Metadata

**Confidence breakdown:**
- Typing indicator: HIGH - Official AI SDK docs confirm status values
- Starter prompts: HIGH - Simple conditional rendering based on existing messages array
- Quick actions: MEDIUM - Context logic straightforward, button styling is standard
- Open in catalog: HIGH - Uses existing URL filter pattern, scrollIntoView is native API

**Research date:** 2026-02-05
**Valid until:** 30 days (AI SDK stable, Next.js router API stable)
