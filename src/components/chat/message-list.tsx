'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { ArrowDown } from 'lucide-react';
import { MessageBubble } from './message-bubble';
import { ProductCard } from './product-card';
import { ExternalProductCard } from './external-product-card';
import { ComparisonTable } from './comparison-table';
import { ReferencePriceTable } from './reference-price-table';
import { PriceSummaryCard } from './price-summary-card';
import { CategoryChips } from './category-chips';
import { LoadingSpinner } from './loading-spinner';
import { StarterPrompts } from './starter-prompts';
import { QuickActions } from './quick-actions';
import { MessageActions } from './message-actions';
import type { UIMessage } from 'ai';
import type { ProductWithRelations, ReferencePrice } from '@/lib/types';
import type { ProductPriceComparison } from '@/lib/actions/similarity';

interface MessageListProps {
  messages: UIMessage[];
  isStreaming: boolean;
  onComparePrice: (productId: string) => void;
  onCategorySelect: (categoryId: string, categoryName: string) => void;
  onViewInCatalog: (product: ProductWithRelations) => void;
  onSendMessage: (text: string) => void;
  onCompareResults: () => void;
  onShowMore: () => void;
  onFilterVendor: () => void;
  onRegenerate?: () => void;
  activeSearch?: string;
  activeVendor?: string;
  activeCategory?: string;
}

// Type guards for tool parts
interface ToolPartBase {
  type: string;
  toolCallId: string;
  state: 'input-streaming' | 'input-available' | 'output-available';
}

interface SearchProductsOutput {
  products: ProductWithRelations[];
  totalCount: number;
  showing: number;
}

interface ComparePricesOutput {
  products: ProductPriceComparison[];
  count: number;
  error?: string;
}

interface CategorySuggestion {
  id: string;
  code: string;
  name: string;
  count: number;
}

interface SuggestCategoriesOutput {
  suggestions: CategorySuggestion[];
  totalProducts: number;
}

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

interface PriceSummary {
  totalPrices: number;
  productMatchCount: number;
  categoryMatchCount: number;
  bestMatchRange: { min: number; max: number } | null;
  allRange: { min: number; max: number };
  scopeBreakdown: { set: number; component: number; procedure: number };
  componentEstimate?: { min: number; max: number; label: string; fractionRange: string } | null;
  hint: string;
}

interface LookupReferencePricesOutput {
  prices: ReferencePrice[];
  count: number;
  summary?: PriceSummary | null;
  error?: string;
}

export function MessageList({
  messages,
  isStreaming,
  onComparePrice,
  onCategorySelect,
  onViewInCatalog,
  onSendMessage,
  onCompareResults,
  onShowMore,
  onFilterVendor,
  onRegenerate,
  activeSearch,
  activeVendor,
  activeCategory,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [userScrolled, setUserScrolled] = useState(false);
  const scrollFrameRef = useRef<number>(0);
  // Track initial message count to skip entrance animations for pre-loaded messages
  const [initialMessageCount] = useState(messages.length);

  // Detect user scrolling away from bottom
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const threshold = 80;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    setUserScrolled(!atBottom);
  }, []);

  // Debounced auto-scroll (RAF batching) when not manually scrolled up
  useEffect(() => {
    if (userScrolled) return;
    cancelAnimationFrame(scrollFrameRef.current);
    scrollFrameRef.current = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(scrollFrameRef.current);
  }, [messages, isStreaming, userScrolled]);

  const scrollToBottom = useCallback(() => {
    setUserScrolled(false);
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Helper to check if a message has a completed tool output of the same type
  // Used to hide loading spinners when a later tool call has output
  const hasCompletedToolOfType = (parts: UIMessage['parts'], toolType: string): boolean => {
    return parts.some(p => {
      if (p.type !== toolType) return false;
      const tp = p as ToolPartBase & { output?: unknown };
      return tp.state === 'output-available' && tp.output !== undefined;
    });
  };

  // Find the last assistant message index for regenerate button placement
  const lastAssistantIndex = messages.reduce((acc, msg, idx) =>
    msg.role === 'assistant' ? idx : acc, -1
  );

  // Render a single message part based on its type
  const renderPart = (
    part: UIMessage['parts'][number],
    partIndex: number,
    messageRole: UIMessage['role'],
    allParts: UIMessage['parts'],
    messageIndex: number
  ) => {
    // Type guard to check for tool parts
    const isToolPart = (p: unknown): p is ToolPartBase =>
      typeof p === 'object' && p !== null && 'toolCallId' in p && 'state' in p;

    switch (part.type) {
      case 'text': {
        const isAssistant = messageRole === 'assistant';
        const isLast = messageIndex === lastAssistantIndex;
        const isPreloaded = messageIndex < initialMessageCount;
        return (
          <div key={partIndex} className={isAssistant ? 'group' : ''}>
            <MessageBubble
              content={part.text}
              role={messageRole as 'user' | 'assistant'}
              skipAnimation={isPreloaded}
            />
            {isAssistant && (
              <div className="flex justify-start pl-1">
                <MessageActions
                  text={part.text}
                  isLastAssistant={isLast}
                  onRegenerate={onRegenerate}
                />
              </div>
            )}
          </div>
        );
      }

      case 'tool-searchProducts': {
        if (!isToolPart(part)) return null;
        const toolPart = part as ToolPartBase & { output?: SearchProductsOutput };
        if (toolPart.state === 'output-available' && toolPart.output) {
          return (
            <div key={toolPart.toolCallId} className="space-y-2">
              {toolPart.output.products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onCompare={onComparePrice}
                  onViewInCatalog={onViewInCatalog}
                />
              ))}
              {toolPart.output.products.length === 0 && (
                <p className="text-sm text-muted-foreground">No products found.</p>
              )}
              {toolPart.output.products.length > 0 && (
                <QuickActions
                  productCount={toolPart.output.products.length}
                  onCompare={onCompareResults}
                  onShowMore={onShowMore}
                  onFilterVendor={onFilterVendor}
                />
              )}
            </div>
          );
        }
        // Hide loading spinner if another tool call of same type has output
        if (hasCompletedToolOfType(allParts, 'tool-searchProducts')) {
          return null;
        }
        return <LoadingSpinner key={toolPart.toolCallId} text="Searching catalog..." />;
      }

      case 'tool-comparePrices': {
        if (!isToolPart(part)) return null;
        const toolPart = part as ToolPartBase & { output?: ComparePricesOutput };
        if (toolPart.state === 'output-available' && toolPart.output) {
          return <ComparisonTable key={toolPart.toolCallId} products={toolPart.output.products} />;
        }
        if (hasCompletedToolOfType(allParts, 'tool-comparePrices')) {
          return null;
        }
        return <LoadingSpinner key={toolPart.toolCallId} text="Comparing prices..." />;
      }

      case 'tool-suggestCategories': {
        if (!isToolPart(part)) return null;
        const toolPart = part as ToolPartBase & { output?: SuggestCategoriesOutput };
        if (toolPart.state === 'output-available' && toolPart.output) {
          return (
            <CategoryChips
              key={toolPart.toolCallId}
              suggestions={toolPart.output.suggestions}
              onSelect={onCategorySelect}
            />
          );
        }
        if (hasCompletedToolOfType(allParts, 'tool-suggestCategories')) {
          return null;
        }
        return <LoadingSpinner key={toolPart.toolCallId} text="Finding categories..." />;
      }

      case 'tool-searchExternalProducts': {
        if (!isToolPart(part)) return null;
        const toolPart = part as ToolPartBase & { output?: ExternalSearchOutput };

        // Loading state
        if (toolPart.state !== 'output-available' || !toolPart.output) {
          if (hasCompletedToolOfType(allParts, 'tool-searchExternalProducts')) {
            return null;
          }
          return (
            <LoadingSpinner
              key={toolPart.toolCallId}
              text="Searching the web for alternatives..."
            />
          );
        }

        // No results
        if (!toolPart.output.hasResults) {
          return (
            <p key={toolPart.toolCallId} className="text-sm text-muted-foreground">
              No external alternatives found. Try a different product or broader category.
            </p>
          );
        }

        // Filter out sources with invalid URLs (broken link handling per CONTEXT.md line 26)
        const validSources = toolPart.output.sources.filter((source) => {
          if (!source.url || source.url.trim() === '') return false;
          try {
            new URL(source.url);
            return true;
          } catch {
            return false;
          }
        });

        // If all sources were invalid, show no-results state
        if (validSources.length === 0) {
          return (
            <p key={toolPart.toolCallId} className="text-sm text-muted-foreground">
              No external alternatives found. Try a different product or broader category.
            </p>
          );
        }

        // Results with cards
        return (
          <div key={toolPart.toolCallId} className="space-y-2">
            {validSources.map((source, idx) => (
              <ExternalProductCard
                key={`${toolPart.toolCallId}-${idx}`}
                name={source.title}
                sourceUrl={source.url}
                sourceDomain={source.domain}
              />
            ))}
          </div>
        );
      }

      case 'tool-lookupReferencePrices': {
        if (!isToolPart(part)) return null;
        const toolPart = part as ToolPartBase & { output?: LookupReferencePricesOutput };
        if (toolPart.state === 'output-available' && toolPart.output) {
          const countrySet = new Set(toolPart.output.prices.map(p => p.source_country));
          return (
            <div key={toolPart.toolCallId}>
              {toolPart.output.summary && (
                <PriceSummaryCard
                  summary={toolPart.output.summary}
                  countryCount={countrySet.size}
                />
              )}
              <ReferencePriceTable prices={toolPart.output.prices} />
            </div>
          );
        }
        if (hasCompletedToolOfType(allParts, 'tool-lookupReferencePrices')) {
          return null;
        }
        return <LoadingSpinner key={toolPart.toolCallId} text="Looking up reference prices..." />;
      }

      default:
        return null;
    }
  };

  return (
    <div className="relative flex-1 overflow-hidden">
    <div ref={containerRef} onScroll={handleScroll} className="h-full overflow-y-auto px-4 py-4">
      {messages.length === 0 ? (
        <StarterPrompts
          onSelect={onSendMessage}
          activeSearch={activeSearch}
          activeVendor={activeVendor}
          activeCategory={activeCategory}
        />
      ) : (
        messages.map((message, messageIndex) => (
          <div key={message.id}>
            {message.parts.map((part, partIndex) =>
              renderPart(part, partIndex, message.role, message.parts, messageIndex)
            )}
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
    {/* Scroll to bottom button */}
    {userScrolled && messages.length > 0 && (
      <button
        onClick={scrollToBottom}
        className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-accent text-accent-foreground rounded-full shadow-lg hover:bg-green-hover transition-colors z-10"
      >
        <ArrowDown className="w-3 h-3" />
        New messages
      </button>
    )}
    </div>
  );
}
