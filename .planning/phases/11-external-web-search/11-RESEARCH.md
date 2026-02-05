# Phase 11: External Web Search - Research

**Researched:** 2026-02-05
**Domain:** Gemini Google Search Grounding with Vercel AI SDK
**Confidence:** MEDIUM

## Summary

This research investigates how to implement EU medical device market web search using Gemini's Google Search grounding feature within the existing Vercel AI SDK architecture. The project currently uses `@ai-sdk/google` v3.0.21 with `gemini-2.5-flash` and has an established tool-based chat system.

**Critical finding:** The Vercel AI SDK has a known limitation where Google Search grounding (provider-defined tools) cannot be combined with custom function tools in the same request. The recommended workaround is to wrap the search in a dedicated custom tool that makes a separate model call internally.

**Primary recommendation:** Create a `searchExternalProducts` custom tool that internally invokes a separate `generateText` call with `google.tools.googleSearch({})`. This isolates the grounding feature while maintaining compatibility with existing catalog tools.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@ai-sdk/google` | ^3.0.21 | Google AI provider | Already in use, provides `google.tools.googleSearch()` |
| `ai` | ^6.0.71 | Core AI SDK | Already in use, provides `generateText`, `streamText` |
| `zod` | ^4.3.6 | Schema validation | Already in use, for tool input validation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (no new libraries needed) | - | - | Leverage existing stack |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Gemini Search Grounding | Custom web scraping | Grounding is maintained by Google, includes citations |
| Separate tool wrapping | Direct multi-tool | Multi-tool not supported for custom + provider tools |
| `gemini-2.5-flash` | `gemini-3-pro-preview` | 2.5 is stable GA; 3 is preview-only, similar limitation |

**Installation:**
```bash
# No new packages required - use existing @ai-sdk/google and ai packages
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   └── chat/
│       ├── tools.ts              # Existing + new searchExternalProducts tool
│       └── constants.ts          # Updated system prompt
├── components/
│   └── chat/
│       ├── external-product-card.tsx  # New component for external results
│       └── message-list.tsx           # Extended to handle external results
```

### Pattern 1: Isolated Provider Tool Wrapper

**What:** Wrap Google Search grounding in a custom tool that makes a separate model call
**When to use:** When combining provider-defined tools with custom function tools
**Example:**
```typescript
// Source: https://github.com/vercel/ai/issues/8401
import { tool, generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod/v4';

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

export const searchExternalProducts = tool({
  description: 'Search the web for EU medical device alternatives. Use when user explicitly asks for "alternatives" or "search the web" for a catalog product.',
  inputSchema: z.object({
    productName: z.string().describe('Name of the catalog product to find alternatives for'),
    productCategory: z.string().optional().describe('EMDN category or product type'),
  }),
  execute: async ({ productName, productCategory }) => {
    const searchQuery = `${productName} ${productCategory || ''} EU medical device orthopedic alternative`;

    // Isolated call with provider tool
    const { text, providerMetadata } = await generateText({
      model: google('gemini-2.5-flash'),
      tools: {
        google_search: google.tools.googleSearch({}),
      },
      prompt: `Search for EU market alternatives to: ${productName}.
               Focus on orthopedic medical devices from European manufacturers.
               Return product names with source URLs.`,
    });

    // Extract grounding metadata
    const groundingMetadata = (providerMetadata?.google as any)?.groundingMetadata;

    return {
      summary: text,
      sources: groundingMetadata?.groundingChunks || [],
      searchQueries: groundingMetadata?.webSearchQueries || [],
    };
  },
});
```

### Pattern 2: Grounding Metadata Extraction

**What:** Extract citations from `providerMetadata.google.groundingMetadata`
**When to use:** For building citation UI from grounded responses
**Example:**
```typescript
// Source: https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai
import type { GoogleGenerativeAIProviderMetadata } from '@ai-sdk/google';

interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

interface GroundingSupport {
  segment: {
    startIndex: number;
    endIndex: number;
  };
  groundingChunkIndices: number[];
  confidenceScores?: number[];
}

interface GroundingMetadata {
  webSearchQueries?: string[];
  groundingChunks?: GroundingChunk[];
  groundingSupports?: GroundingSupport[];
  searchEntryPoint?: {
    renderedContent: string;
  };
}

// Access in response
const metadata = providerMetadata?.google as GoogleGenerativeAIProviderMetadata | undefined;
const groundingMetadata = metadata?.groundingMetadata as GroundingMetadata | undefined;

// Extract sources for UI
const sources = groundingMetadata?.groundingChunks
  ?.filter(chunk => chunk.web?.uri)
  .map(chunk => ({
    url: chunk.web!.uri,
    title: chunk.web!.title,
    domain: new URL(chunk.web!.uri).hostname.replace('www.', ''),
  }));
```

### Pattern 3: External Result UI Component

**What:** Card component with distinct styling for external results
**When to use:** Rendering web search results in chat
**Example:**
```typescript
// Based on existing ProductCard pattern with external styling
interface ExternalProductCardProps {
  name: string;
  sourceUrl: string;
  sourceDomain: string;
}

export function ExternalProductCard({ name, sourceUrl, sourceDomain }: ExternalProductCardProps) {
  return (
    <div className="border-2 border-blue-500 rounded-lg p-3 mb-2 bg-blue-50/10">
      <h4 className="font-medium text-sm">{name}</h4>
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blue-600 hover:underline"
      >
        {sourceDomain}
      </a>
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Mixing tools directly:** Do NOT pass `google.tools.googleSearch()` alongside custom tools in the same `streamText` call - will cause errors or silent failures
- **Using `useSearchGrounding: true`:** This model setting was for older implementation; use the tool approach instead
- **Auto-triggering search:** Never automatically search when catalog has no results - explicit user request only per CONTEXT.md

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Web search | Custom scraper/fetch | `google.tools.googleSearch({})` | Maintained by Google, legal, includes citations |
| Citation extraction | Manual URL parsing | `groundingMetadata.groundingChunks` | Structured, includes titles and confidence |
| Domain extraction | Regex URL parsing | `new URL(uri).hostname` | Built-in, handles edge cases |
| Search query formulation | Hardcoded queries | Let model generate via grounding | Model optimizes query for results |

**Key insight:** Google Search grounding handles the complexity of web search, rate limiting, and citation extraction. Focus implementation effort on the UI and tool integration pattern, not search mechanics.

## Common Pitfalls

### Pitfall 1: Tool Combination Error
**What goes wrong:** Error "Cannot mix function tools with provider-defined tools" or custom tools silently ignored
**Why it happens:** Gemini API (not just SDK) limitation - provider tools and custom tools cannot coexist in same request
**How to avoid:** Use isolated tool wrapper pattern (Pattern 1 above)
**Warning signs:** Custom tools never called when `google_search` is in tools object

### Pitfall 2: Missing groundingMetadata
**What goes wrong:** `providerMetadata?.google?.groundingMetadata` is undefined
**Why it happens:** Model decided not to use Google Search (valid behavior) or search returned no results
**How to avoid:** Check for existence before accessing; handle gracefully in UI
**Warning signs:** Works sometimes but not consistently

### Pitfall 3: Broken Source Links
**What goes wrong:** External links lead to 404 or unavailable pages
**Why it happens:** Web content changes; grounding results may be stale
**How to avoid:** Per CONTEXT.md - hide results with unavailable links (don't show with warning)
**Warning signs:** User complaints about broken links

### Pitfall 4: Billing Surprises
**What goes wrong:** Unexpected charges for grounding queries
**Why it happens:** Each search query is billed separately after free tier (1,500/day)
**How to avoid:** Monitor usage; consider rate limiting in production
**Warning signs:** Monthly bills higher than expected

### Pitfall 5: Non-Grounded Response
**What goes wrong:** Model returns response without using search even when asked
**Why it happens:** Model autonomously decides whether to use search tool
**How to avoid:** Explicit prompting; check for `searchEntryPoint` field in response
**Warning signs:** Responses without citation metadata

## Code Examples

Verified patterns from official sources:

### Complete Tool Implementation
```typescript
// Source: https://ai-sdk.dev/cookbook/node/web-search-agent + adaptation
import { tool, generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod/v4';

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

export const searchExternalProducts = tool({
  description: `Search the web for EU medical device market alternatives to a catalog product.
    Only use when user explicitly asks for "alternatives" or "search the web".
    Must reference a specific catalog product.`,
  inputSchema: z.object({
    productName: z.string().describe('Name of the catalog product'),
    productCategory: z.string().optional().describe('EMDN category or product type for context'),
    vendorName: z.string().optional().describe('Current vendor for exclusion context'),
  }),
  execute: async ({ productName, productCategory, vendorName }) => {
    // Build search context
    const context = [
      productName,
      productCategory,
      'orthopedic medical device',
      'EU CE marked',
      vendorName ? `alternative to ${vendorName}` : '',
    ].filter(Boolean).join(' ');

    const { text, providerMetadata } = await generateText({
      model: google('gemini-2.5-flash'),
      tools: {
        google_search: google.tools.googleSearch({}),
      },
      prompt: `Find 3-5 EU market alternatives to this orthopedic medical device: ${context}

        For each alternative found:
        1. Extract the product name
        2. Note the manufacturer
        3. Keep the source URL

        Focus on CE-marked devices from European manufacturers or distributors.`,
      temperature: 1.0, // Recommended for grounding
    });

    const metadata = providerMetadata?.google as any;
    const groundingMetadata = metadata?.groundingMetadata;

    // Extract and validate sources
    const sources = (groundingMetadata?.groundingChunks || [])
      .filter((chunk: any) => chunk.web?.uri)
      .map((chunk: any) => ({
        url: chunk.web.uri,
        title: chunk.web.title || 'External Source',
        domain: new URL(chunk.web.uri).hostname.replace('www.', ''),
      }))
      .slice(0, 5); // Limit per CONTEXT.md

    return {
      summary: text,
      sources,
      searchQueries: groundingMetadata?.webSearchQueries || [],
      hasResults: sources.length > 0,
    };
  },
});
```

### Message List Extension for External Results
```typescript
// Extension to existing message-list.tsx pattern
interface ExternalSearchOutput {
  summary: string;
  sources: Array<{
    url: string;
    title: string;
    domain: string;
  }>;
  searchQueries: string[];
  hasResults: boolean;
}

// In renderPart switch statement:
case 'tool-searchExternalProducts': {
  if (!isToolPart(part)) return null;
  const toolPart = part as ToolPartBase & { output?: ExternalSearchOutput };
  if (toolPart.state === 'output-available' && toolPart.output) {
    if (!toolPart.output.hasResults) {
      return (
        <p key={toolPart.toolCallId} className="text-sm text-muted-foreground">
          No external alternatives found. Try a different product or broader category.
        </p>
      );
    }
    return (
      <div key={toolPart.toolCallId} className="space-y-2">
        {/* AI Summary with numbered references */}
        <div className="text-sm mb-3">{toolPart.output.summary}</div>
        {/* External source cards */}
        {toolPart.output.sources.map((source, idx) => (
          <ExternalProductCard
            key={idx}
            name={source.title}
            sourceUrl={source.url}
            sourceDomain={source.domain}
          />
        ))}
      </div>
    );
  }
  return <LoadingSpinner key={toolPart.toolCallId} text="Searching the web for alternatives..." />;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useSearchGrounding: true` model setting | `google.tools.googleSearch({})` tool | 2024 | More explicit control, better metadata |
| Direct tool combination | Isolated wrapper pattern | Current limitation | Required workaround for custom tools |
| Per-prompt billing | Per-search-query billing (Gemini 3) | Dec 2025 | Cost scales with search usage |

**Deprecated/outdated:**
- `useSearchGrounding` setting: Replaced by explicit tool approach
- Gemini 2.0 Flash: Being retired March 2026, use 2.5 Flash

## Open Questions

Things that couldn't be fully resolved:

1. **Will tool combination limitation be fixed?**
   - What we know: Issue #8258 remains open; Google API itself has this limitation
   - What's unclear: Timeline for native support in standard (non-Live) API
   - Recommendation: Use isolated wrapper pattern; monitor issue for updates

2. **Exact rate limits for grounding queries**
   - What we know: 1,500/day free tier for paid accounts; $35/1K after
   - What's unclear: Exact daily limit for free tier API keys
   - Recommendation: Implement usage monitoring; consider rate limiting

3. **Link availability verification**
   - What we know: CONTEXT.md requires hiding broken links
   - What's unclear: Best method to verify links without slowing response
   - Recommendation: Client-side verification with fallback hiding; or accept some broken links

## Sources

### Primary (HIGH confidence)
- [AI SDK Google Provider Docs](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai) - googleSearch tool API, grounding metadata structure
- [Gemini API Google Search Grounding](https://ai.google.dev/gemini-api/docs/google-search) - Official grounding documentation, response format

### Secondary (MEDIUM confidence)
- [GitHub Issue #8401](https://github.com/vercel/ai/issues/8401) - Workaround for tool combination limitation
- [GitHub Issue #8258](https://github.com/vercel/ai/issues/8258) - Tool combination limitation details
- [AI SDK Changelog](https://ai.google.dev/gemini-api/docs/changelog) - Multi-tool support timeline (May 2025)

### Tertiary (LOW confidence)
- [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing) - Grounding costs (verify for current pricing)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Uses existing packages, no new dependencies
- Architecture: MEDIUM - Workaround pattern documented but evolving
- Pitfalls: HIGH - Well-documented in GitHub issues
- Pricing/quotas: MEDIUM - Verified from official docs but subject to change

**Research date:** 2026-02-05
**Valid until:** 2026-03-05 (30 days - monitor GitHub issues for tool combination fix)
