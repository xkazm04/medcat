'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { MessageList } from './message-list';
import { ChatInput } from './chat-input';
import { ErrorBubble } from './error-bubble';
import { TypingIndicator } from './typing-indicator';
import { classifyError } from '@/lib/chat/errors';
import { MAX_MESSAGES } from '@/lib/chat/constants';
import { useChatContextOptional } from '@/lib/hooks/use-chat-context';
import type { useChatPersistence } from '@/lib/hooks/use-chat-persistence';
import type { ProductWithRelations } from '@/lib/types';

interface ChatPanelProps {
  isOpen: boolean;
  persistence?: ReturnType<typeof useChatPersistence>;
}

// Extract last shown products from messages for context
function getLastSearchProducts(messages: ReturnType<typeof useChat>['messages']): ProductWithRelations[] {
  // Walk messages backwards to find the last searchProducts output
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    for (const part of message.parts) {
      if (part.type === 'tool-searchProducts') {
        const toolPart = part as { state: string; output?: { products: ProductWithRelations[] } };
        if (toolPart.state === 'output-available' && toolPart.output?.products) {
          return toolPart.output.products;
        }
      }
    }
  }
  return [];
}

export function ChatPanel({ isOpen, persistence }: ChatPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatContext = useChatContextOptional();
  // Ref for catalog context so transport closure reads latest value
  const catalogContextRef = useRef<string | undefined>(undefined);
  const catalogContext = useMemo(() => {
    const parts: string[] = [];
    const search = searchParams.get('search');
    const vendor = searchParams.get('vendor');
    const category = searchParams.get('category');
    const ceMarked = searchParams.get('ceMarked');
    const mdrClass = searchParams.get('mdrClass');
    const manufacturer = searchParams.get('manufacturer');
    if (search) parts.push(`Search query: "${search}"`);
    if (vendor) parts.push(`Vendor filter active (ID: ${vendor})`);
    if (category) parts.push(`Category filter active (ID: ${category})`);
    if (ceMarked) parts.push(`CE marked filter: ${ceMarked}`);
    if (mdrClass) parts.push(`MDR class filter: ${mdrClass}`);
    if (manufacturer) parts.push(`Manufacturer filter: ${decodeURIComponent(manufacturer)}`);
    return parts.length > 0 ? parts.join('\n') : undefined;
  }, [searchParams]);
  // Sync computed value to ref (read by transport closure at request time)
  useEffect(() => { catalogContextRef.current = catalogContext; }, [catalogContext]);

  // Stable transport that reads catalog context at request time via ref.
  // The body function is called during API requests, not during render — ref access is safe.
  // eslint-disable-next-line react-hooks/refs
  const transport = useMemo(() => new DefaultChatTransport({
    api: '/api/chat',
    body: () => {
      const ctx = catalogContextRef.current;
      return ctx ? { catalogContext: ctx } : {};
    },
  }), []);

  const { messages, sendMessage, status, stop, error, setMessages, regenerate, clearError } = useChat({
    transport,
    id: persistence?.activeSessionId || 'default',
  });
  const [retryAttempted, setRetryAttempted] = useState(false);

  // Extract context from last search for quick actions
  const lastProducts = useMemo(() => getLastSearchProducts(messages), [messages]);

  // Load persisted messages when switching sessions
  const prevSessionRef = useRef(persistence?.activeSessionId);
  useEffect(() => {
    if (!persistence) return;
    const currentId = persistence.activeSessionId;
    if (currentId !== prevSessionRef.current) {
      prevSessionRef.current = currentId;
      setMessages(persistence.getInitialMessages());
    }
  }, [persistence, persistence?.activeSessionId, setMessages]);

  // Register sendMessage with context so other components can send messages
  useEffect(() => {
    if (chatContext) {
      chatContext.registerSendMessage((text: string) => {
        if (text.trim()) {
          sendMessage({ text });
        }
      });
    }
  }, [chatContext, sendMessage]);

  const isStreaming = status === 'streaming';
  const showTypingIndicator = status === 'submitted';
  const isChatFull = messages.length >= MAX_MESSAGES;

  // Persist messages after each assistant response
  const prevStatusRef = useRef(status);
  useEffect(() => {
    if (prevStatusRef.current === 'streaming' && status === 'ready' && persistence) {
      persistence.saveMessages(messages);
    }
    prevStatusRef.current = status;
  }, [status, messages, persistence]);

  // CRITICAL: Cleanup on close - abort any active streaming
  // This prevents memory leaks and orphan server processes
  useEffect(() => {
    if (!isOpen && isStreaming) {
      stop();
    }
  }, [isOpen, isStreaming, stop]);

  // Also cleanup on unmount (safety net) — use ref to avoid stale closure
  const statusRef = useRef(status);
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => {
    return () => {
      if (statusRef.current === 'streaming') {
        stop();
      }
    };
  }, [stop]);

  // Auto-retry on retryable errors (once, silently)
  useEffect(() => {
    if (status === 'error' && error && !retryAttempted) {
      const classified = classifyError(error);
      if (classified.isRetryable) {
        setRetryAttempted(true);
        clearError();
        regenerate(); // Silent auto-retry
      }
    }
    // Reset retry flag when not in error state
    if (status !== 'error') {
      setRetryAttempted(false);
    }
  }, [status, error, retryAttempted, regenerate, clearError]);

  // Compute error state for display (only show after retry attempted)
  const showError = status === 'error' && error && retryAttempted;
  const classifiedError = showError ? classifyError(error) : null;

  const handleSubmit = (text: string) => {
    if (isChatFull) return; // Blocked - UI shows chat full message
    if (text.trim()) {
      sendMessage({ text });
    }
  };

  const handleRetry = () => {
    clearError();
    regenerate();
  };

  const handleClearChat = () => {
    setMessages([]);
    clearError();
    setRetryAttempted(false);
  };

  const handleComparePrice = (productId: string) => {
    sendMessage({ text: `Compare prices for product ${productId}` });
  };

  const handleCategorySelect = (categoryId: string, categoryName: string) => {
    sendMessage({ text: `Search in category: ${categoryName}` });
  };

  const handleViewInCatalog = (product: ProductWithRelations) => {
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

    // Smooth scroll to table after short delay for URL change
    setTimeout(() => {
      document.querySelector('[data-table-container]')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100);
  };

  const handleCompareResults = () => {
    // Include product names for context
    if (lastProducts.length > 0) {
      const productNames = lastProducts.slice(0, 3).map(p => p.name).join(', ');
      sendMessage({ text: `Compare prices for these products: ${productNames}` });
    } else {
      sendMessage({ text: 'Compare prices for the products shown above' });
    }
  };

  const handleShowMore = () => {
    sendMessage({ text: 'Show more results from the previous search' });
  };

  const handleFilterVendor = () => {
    // Include vendor names from last products for context
    if (lastProducts.length > 0) {
      const vendors = [...new Set(lastProducts.map(p => p.vendor?.name).filter(Boolean))];
      if (vendors.length > 0) {
        sendMessage({ text: `Filter by vendor. The previous results included: ${vendors.join(', ')}. Which vendor do you want?` });
      } else {
        sendMessage({ text: 'Filter the previous results by vendor' });
      }
    } else {
      sendMessage({ text: 'Filter by vendor' });
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <MessageList
        messages={messages}
        isStreaming={isStreaming}
        onComparePrice={handleComparePrice}
        onCategorySelect={handleCategorySelect}
        onViewInCatalog={handleViewInCatalog}
        onSendMessage={handleSubmit}
        onCompareResults={handleCompareResults}
        onShowMore={handleShowMore}
        onFilterVendor={handleFilterVendor}
        onRegenerate={regenerate}
        activeSearch={searchParams.get('search') || undefined}
        activeVendor={searchParams.get('vendor') ? 'selected vendor' : undefined}
        activeCategory={searchParams.get('category') ? 'selected category' : undefined}
      />
      {showTypingIndicator && <TypingIndicator />}
      {showError && classifiedError && (
        <ErrorBubble
          message={classifiedError.userMessage}
          isRetryable={classifiedError.isRetryable}
          onRetry={classifiedError.isRetryable ? handleRetry : undefined}
          errorType={classifiedError.errorType}
        />
      )}
      <ChatInput
        onSubmit={handleSubmit}
        disabled={isStreaming || isChatFull}
        isChatFull={isChatFull}
        onClearChat={handleClearChat}
      />
    </div>
  );
}
