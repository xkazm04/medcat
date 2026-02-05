'use client';

import { useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { MessageList } from './message-list';
import { ChatInput } from './chat-input';

interface ChatPanelProps {
  isOpen: boolean;
}

export function ChatPanel({ isOpen }: ChatPanelProps) {
  const { messages, sendMessage, status, stop } = useChat();

  const isStreaming = status === 'streaming';

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

  const handleSubmit = (text: string) => {
    if (text.trim()) {
      sendMessage({ text });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <MessageList messages={messages} isStreaming={isStreaming} />
      <ChatInput onSubmit={handleSubmit} disabled={isStreaming} />
    </div>
  );
}
