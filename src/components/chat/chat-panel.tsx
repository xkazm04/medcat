'use client';

import { useEffect, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { MessageList } from './message-list';
import { ChatInput } from './chat-input';
import { ErrorBubble } from './error-bubble';
import { classifyError } from '@/lib/chat/errors';
import { MAX_MESSAGES } from '@/lib/chat/constants';

interface ChatPanelProps {
  isOpen: boolean;
}

export function ChatPanel({ isOpen }: ChatPanelProps) {
  const { messages, sendMessage, status, stop, error, setMessages, regenerate, clearError } = useChat();
  const [retryAttempted, setRetryAttempted] = useState(false);

  const isStreaming = status === 'streaming';
  const isChatFull = messages.length >= MAX_MESSAGES;

  // CRITICAL: Cleanup on close - abort any active streaming
  // This prevents memory leaks and orphan server processes
  useEffect(() => {
    if (!isOpen && isStreaming) {
      stop();
    }
  }, [isOpen, isStreaming, stop]);

  // Also cleanup on unmount (safety net)
  useEffect(() => {
    return () => {
      if (status === 'streaming') {
        stop();
      }
    };
  }, [status, stop]);

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

  const handleViewInCatalog = (productId: string) => {
    // For now, just log - full catalog integration is Phase 12
    console.log('View in catalog:', productId);
    // Could open product detail modal or scroll to product in table
  };

  return (
    <div className="flex flex-col h-full">
      <MessageList
        messages={messages}
        isStreaming={isStreaming}
        onComparePrice={handleComparePrice}
        onCategorySelect={handleCategorySelect}
        onViewInCatalog={handleViewInCatalog}
      />
      {showError && classifiedError && (
        <ErrorBubble
          message={classifiedError.userMessage}
          isRetryable={classifiedError.isRetryable}
          onRetry={classifiedError.isRetryable ? handleRetry : undefined}
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
