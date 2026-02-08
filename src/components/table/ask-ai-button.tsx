'use client';

import { MessageCircle } from 'lucide-react';
import { useChatContextOptional } from '@/lib/hooks/use-chat-context';

interface AskAIButtonProps {
  productName: string;
  className?: string;
}

export function AskAIButton({ productName, className }: AskAIButtonProps) {
  const chatContext = useChatContextOptional();

  if (!chatContext) {
    return null; // Don't render if outside provider
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Don't trigger row selection
    chatContext.sendMessage(`Tell me about ${productName}`);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent/50 ${className || ''}`}
      title={`Ask AI about ${productName}`}
    >
      <MessageCircle className="h-4 w-4" />
    </button>
  );
}
