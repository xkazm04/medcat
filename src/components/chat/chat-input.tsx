'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { ArrowUp, Trash2 } from 'lucide-react';
import { CHAT_FULL_MESSAGE } from '@/lib/chat/constants';
import { useChatContextOptional } from '@/lib/hooks/use-chat-context';

interface ChatInputProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  isChatFull?: boolean;
  onClearChat?: () => void;
}

export function ChatInput({ onSubmit, disabled, isChatFull, onClearChat }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContext = useChatContextOptional();

  // Register input setter with context so other components can insert text
  useEffect(() => {
    if (chatContext) {
      chatContext.registerInputSetter((text: string) => {
        // Append with space if input already has content, otherwise just set
        setValue(prev => prev.trim() ? `${prev} ${text}` : text);
        // Focus the textarea after insertion
        textareaRef.current?.focus();
      });
    }
  }, [chatContext]);

  // Auto-expand textarea as user types
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get correct scrollHeight
      textarea.style.height = 'auto';
      // Set to scrollHeight, capped at 150px
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [value]);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed && !disabled) {
      onSubmit(trimmed);
      setValue('');
      // Reset height after clearing
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [value, disabled, onSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    // Shift+Enter allows newline (default behavior)
  }, [handleSubmit]);

  const showSendButton = value.trim().length > 0;

  // When chat is full, show message and clear button instead of input
  if (isChatFull) {
    return (
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">{CHAT_FULL_MESSAGE}</span>
          {onClearChat && (
            <button
              onClick={onClearChat}
              className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Clear chat
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-border px-4 py-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about products..."
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none overflow-hidden bg-muted rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50"
          style={{ maxHeight: '150px' }}
        />
        {onClearChat && (
          <button
            type="button"
            onClick={onClearChat}
            className="p-2.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors shrink-0"
            title="Clear chat"
            aria-label="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        {showSendButton && (
          <button
            onClick={handleSubmit}
            disabled={disabled}
            className="p-2.5 bg-accent text-accent-foreground rounded-lg hover:bg-green-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            aria-label="Send message"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
