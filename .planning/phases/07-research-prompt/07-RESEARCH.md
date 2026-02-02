# Phase 7: Research Prompt - Research

**Researched:** 2026-02-02
**Domain:** Clipboard API, external URL opening, prompt template generation, UI patterns
**Confidence:** HIGH

## Summary

This phase implements a structured research prompt generator that helps users find EU vendor pricing for products in their catalog via Perplexity AI. The feature is purely client-side: generate a prompt from product data, copy it to clipboard, and open Perplexity in a new tab.

The research confirms that `navigator.clipboard.writeText()` has excellent browser support and the project already has `usehooks-ts` which provides the `useCopyToClipboard` hook. For opening Perplexity, the URL format `https://www.perplexity.ai/search/?q={query}` allows pre-filling the search query, though URL-encoding is needed for complex prompts. The prompt template should be structured with product specs and follow Perplexity's guidance on specific, focused queries.

The existing project patterns (client components, Tailwind buttons, lucide icons) provide clear templates to follow. No new libraries are needed.

**Primary recommendation:** Use the existing `useCopyToClipboard` hook from usehooks-ts for clipboard operations, open Perplexity via `window.open()` with a pre-encoded query URL, and add a "Research Pricing" button section to the ProductDetail component.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| usehooks-ts | ^3.1.1 | useCopyToClipboard hook | Already in project, provides Clipboard API wrapper with fallback |
| lucide-react | ^0.563.0 | Icons for buttons | Already in project - Copy, ExternalLink, Check icons available |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| N/A - native | - | navigator.clipboard.writeText | Fallback if hook fails (99%+ browser support) |
| N/A - native | - | window.open() | Open Perplexity in new tab |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| usehooks-ts | react-copy-to-clipboard | Not needed - already have usehooks-ts installed |
| Visual copy feedback | sonner toast | Could add sonner for toast notifications, but inline state change sufficient for single button feedback |
| Pre-filled Perplexity URL | Copy only, user navigates manually | Pre-fill provides better UX, one less step |

**Installation:**
```bash
# No additional packages needed - using existing dependencies
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── product/
│       ├── product-detail.tsx      # Add "Research Pricing" section
│       └── research-prompt.tsx     # New component for prompt generation
├── lib/
│   └── utils/
│       └── prompt-template.ts      # Prompt template generation function
```

### Pattern 1: Copy Button with Visual Feedback
**What:** Button that shows "Copied!" state briefly after successful copy
**When to use:** Single-action copy operations with inline feedback
**Example:**
```typescript
// Source: usehooks-ts documentation + project patterns
'use client'

import { useState, useEffect } from 'react'
import { useCopyToClipboard } from 'usehooks-ts'
import { Copy, Check } from 'lucide-react'

interface CopyButtonProps {
  text: string
  label?: string
}

export function CopyButton({ text, label = 'Copy' }: CopyButtonProps) {
  const [, copy] = useCopyToClipboard()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [copied])

  const handleCopy = async () => {
    const success = await copy(text)
    if (success) {
      setCopied(true)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          {label}
        </>
      )}
    </button>
  )
}
```

### Pattern 2: Open External URL with Pre-filled Query
**What:** Open Perplexity in new tab with search query pre-filled
**When to use:** Linking to external AI search with context
**Example:**
```typescript
// Source: Perplexity URL format research + MDN window.open
const PERPLEXITY_SEARCH_URL = 'https://www.perplexity.ai/search/'

function openPerplexitySearch(query: string) {
  const encodedQuery = encodeURIComponent(query)
  const url = `${PERPLEXITY_SEARCH_URL}?q=${encodedQuery}`

  // window.open with 'noopener' for security
  window.open(url, '_blank', 'noopener,noreferrer')
}
```

### Pattern 3: Structured Prompt Template
**What:** Generate focused, specific prompts with product context
**When to use:** Creating AI search prompts from product data
**Example:**
```typescript
// Source: Perplexity prompt guide + product schema
import type { ProductWithRelations } from '@/lib/types'

export function generateResearchPrompt(product: ProductWithRelations): string {
  const parts: string[] = []

  // Header with clear task
  parts.push(`Find EU vendors and pricing for this medical device:`)
  parts.push('')

  // Product identification
  parts.push(`**Product:** ${product.name}`)
  if (product.manufacturer_name) {
    parts.push(`**Manufacturer:** ${product.manufacturer_name}`)
  }
  if (product.manufacturer_sku) {
    parts.push(`**Manufacturer SKU:** ${product.manufacturer_sku}`)
  }
  if (product.sku) {
    parts.push(`**Current Vendor SKU:** ${product.sku}`)
  }

  // Category context
  if (product.emdn_category?.name) {
    parts.push(`**Category:** ${product.emdn_category.name}`)
  }
  if (product.material?.name) {
    parts.push(`**Material:** ${product.material.name}`)
  }

  // Regulatory info
  if (product.mdr_class) {
    parts.push(`**MDR Class:** ${product.mdr_class}`)
  }

  parts.push('')
  parts.push(`Please provide:`)
  parts.push(`1. EU medical device distributors that carry this product`)
  parts.push(`2. Current pricing in EUR (with vendor name and contact)`)
  parts.push(`3. Alternative comparable products from other manufacturers`)

  return parts.join('\n')
}
```

### Anti-Patterns to Avoid
- **Opening URL without user gesture:** Browser will block popups not triggered by click
- **Long prompts in URL:** Keep URL under 2000 chars; use clipboard for full prompt
- **No copy feedback:** Users need visual confirmation that copy worked
- **Generic prompts:** Per Perplexity docs, specific prompts get better results

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Clipboard copy | Custom navigator.clipboard wrapper | useCopyToClipboard from usehooks-ts | Handles fallback, async, edge cases |
| URL encoding | Manual string replacement | encodeURIComponent() | Built-in, handles Unicode, special chars |
| Copy feedback timing | setInterval logic | setTimeout with useEffect cleanup | Simpler, React-idiomatic |
| Security for external links | Nothing | rel="noopener noreferrer" or window.open with 'noopener' | Prevents reverse tabnabbing |

**Key insight:** Clipboard and URL operations have browser APIs that handle edge cases. Use existing hooks and native functions rather than reimplementing.

## Common Pitfalls

### Pitfall 1: Clipboard API Requires User Gesture
**What goes wrong:** Copy fails silently or throws permission error
**Why it happens:** Clipboard API requires transient user activation (click, etc.)
**How to avoid:** Only call copy() in onClick handler, never in useEffect or setTimeout
**Warning signs:** "NotAllowedError: Clipboard write was blocked" in console

### Pitfall 2: Popup Blocked for External URL
**What goes wrong:** Perplexity tab doesn't open, no error shown
**Why it happens:** window.open() called outside synchronous click handler
**How to avoid:** Call window.open() directly in onClick, not in async callback
**Warning signs:** Browser shows popup blocked icon, no error in console

### Pitfall 3: URL Too Long for Pre-fill
**What goes wrong:** Perplexity URL gets truncated or rejected
**Why it happens:** URLs have practical limits (~2000 chars in most browsers)
**How to avoid:** For complex prompts, use clipboard copy + plain Perplexity URL
**Warning signs:** Query appears cut off in Perplexity search box

### Pitfall 4: Missing URL Encoding
**What goes wrong:** Special characters break the URL, query malformed
**Why it happens:** Spaces, ampersands, etc. not encoded
**How to avoid:** Always use encodeURIComponent() for query parameter values
**Warning signs:** URL has unencoded spaces, Perplexity shows wrong query

### Pitfall 5: No Visual Feedback on Copy
**What goes wrong:** User clicks button repeatedly, unsure if it worked
**Why it happens:** No state change after copy action
**How to avoid:** Show "Copied!" text/icon for 1.5-2 seconds after copy
**Warning signs:** Users reporting "copy doesn't work" when it actually does

## Code Examples

Verified patterns from official sources:

### Research Prompt Component
```typescript
// Source: Project patterns + usehooks-ts docs
'use client'

import { useState, useEffect } from 'react'
import { useCopyToClipboard } from 'usehooks-ts'
import { Copy, Check, ExternalLink, Search } from 'lucide-react'
import type { ProductWithRelations } from '@/lib/types'
import { generateResearchPrompt } from '@/lib/utils/prompt-template'

interface ResearchPromptProps {
  product: ProductWithRelations
}

export function ResearchPrompt({ product }: ResearchPromptProps) {
  const [, copy] = useCopyToClipboard()
  const [copied, setCopied] = useState(false)

  const prompt = generateResearchPrompt(product)

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [copied])

  const handleCopy = async () => {
    const success = await copy(prompt)
    if (success) {
      setCopied(true)
    }
  }

  const handleOpenPerplexity = () => {
    // Open base Perplexity URL (user will paste prompt)
    window.open('https://www.perplexity.ai/', '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-4">
      <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
        {prompt}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy Prompt
            </>
          )}
        </button>

        <button
          onClick={handleOpenPerplexity}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          Open Perplexity
        </button>
      </div>
    </div>
  )
}
```

### Prompt Template Generator
```typescript
// Source: Product schema + Perplexity prompt best practices
import type { ProductWithRelations } from '@/lib/types'

export function generateResearchPrompt(product: ProductWithRelations): string {
  const lines: string[] = []

  lines.push('Find EU medical device distributors and pricing for:')
  lines.push('')
  lines.push(`Product: ${product.name}`)

  if (product.manufacturer_name) {
    lines.push(`Manufacturer: ${product.manufacturer_name}`)
  }
  if (product.manufacturer_sku) {
    lines.push(`Manufacturer Part Number: ${product.manufacturer_sku}`)
  }
  if (product.sku && product.vendor?.name) {
    lines.push(`Known as SKU "${product.sku}" at ${product.vendor.name}`)
  }
  if (product.description) {
    lines.push(`Description: ${product.description}`)
  }
  if (product.emdn_category?.name) {
    lines.push(`EMDN Category: ${product.emdn_category.name}`)
  }
  if (product.material?.name) {
    lines.push(`Material: ${product.material.name}`)
  }
  if (product.mdr_class) {
    lines.push(`MDR Classification: Class ${product.mdr_class}`)
  }
  if (product.ce_marked) {
    lines.push(`CE Marked: Yes`)
  }
  if (product.udi_di) {
    lines.push(`UDI-DI: ${product.udi_di}`)
  }

  lines.push('')
  lines.push('Please provide:')
  lines.push('1. EU distributors/vendors that sell this exact product')
  lines.push('2. Current pricing in EUR with vendor contact details')
  lines.push('3. Alternative equivalent products if exact match unavailable')
  lines.push('')
  lines.push('Focus on Czech Republic and surrounding EU countries.')

  return lines.join('\n')
}
```

### Integration in ProductDetail
```typescript
// Addition to existing ProductDetail component
// After the Price Comparison section

{/* Section 7: Research Pricing */}
<div className="pt-2 border-t-2 border-blue-border">
  <p className="text-sm font-medium text-blue-subtle uppercase tracking-wide mb-1">
    Research EU Pricing
  </p>
  <p className="text-sm text-muted-foreground mb-3">
    Generate a prompt to find EU vendors and pricing via Perplexity AI
  </p>
  <ResearchPrompt product={product} />
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| document.execCommand('copy') | navigator.clipboard.writeText() | ~2020 | Async, more secure, better error handling |
| target="_blank" without rel | rel="noopener noreferrer" or noopener in window.open | 2018 | Security: prevents reverse tabnabbing |
| Manual query string building | URLSearchParams or encodeURIComponent | Standard | Handles encoding edge cases |

**Deprecated/outdated:**
- `document.execCommand('copy')`: Deprecated, still works but navigator.clipboard preferred
- Opening links without noopener: Security risk, allows opened page to control opener

## Open Questions

Things that couldn't be fully resolved:

1. **Perplexity URL Query Length Limit**
   - What we know: The URL format `?q=query` works for pre-filling
   - What's unclear: Practical max length before Perplexity truncates or rejects
   - Recommendation: Use clipboard copy as primary, URL pre-fill only for short queries

2. **Prompt Format Optimization**
   - What we know: Perplexity recommends specific, focused prompts
   - What's unclear: Optimal format for medical device vendor search specifically
   - Recommendation: Start with structured template, iterate based on result quality

3. **Output Format Documentation**
   - What we know: Requirement RSRCH-05 asks for documented prompt output format
   - What's unclear: Where this documentation should live (in-app? separate doc?)
   - Recommendation: Add help text in UI explaining expected response format for data entry

## Sources

### Primary (HIGH confidence)
- [MDN - Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API) - writeText() API reference
- [MDN - Window.open()](https://developer.mozilla.org/en-US/docs/Web/API/Window/open) - Security and noopener
- [usehooks-ts useCopyToClipboard](https://usehooks-ts.com/react-hook/use-copy-to-clipboard) - Hook API
- [Can I Use - Clipboard writeText](https://caniuse.com/mdn-api_clipboard_writetext) - 96%+ browser support

### Secondary (MEDIUM confidence)
- [Perplexity Prompt Guide](https://docs.perplexity.ai/guides/prompt-guide) - Prompt best practices
- [GitHub qutebrowser discussion](https://github.com/qutebrowser/qutebrowser/discussions/8435) - Perplexity URL format `?q=`

### Tertiary (LOW confidence)
- WebSearch results for prompt template patterns - general best practices

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - using existing project dependencies, native APIs well documented
- Architecture: HIGH - following existing project patterns, simple client-side operations
- Pitfalls: HIGH - well-documented browser API behaviors and security requirements

**Research date:** 2026-02-02
**Valid until:** 2026-03-02 (30 days - stable APIs, simple feature)
