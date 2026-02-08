'use client';

import { useChatContextOptional } from '@/lib/hooks/use-chat-context';

interface ChatInsertCellProps {
  value: string;
  prefix?: string; // e.g., "Show me products from vendor: "
  className?: string;
}

export function ChatInsertCell({ value, prefix = '', className }: ChatInsertCellProps) {
  const chatContext = useChatContextOptional();

  if (!chatContext || !value) {
    // Fallback: just render the value without interactivity
    return <span className={className || ''}>{value}</span>;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click handlers from firing
    const textToInsert = prefix ? `${prefix}${value}` : value;
    chatContext.askAbout(textToInsert);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`text-left hover:text-accent hover:underline cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-1 rounded transition-colors ${className || ''}`}
      title={`Click to ask about "${value}"`}
    >
      {value}
    </button>
  );
}
