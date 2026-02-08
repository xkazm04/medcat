'use client';

import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { STARTER_PROMPTS } from '@/lib/chat/constants';

interface StarterPromptsProps {
  onSelect: (prompt: string) => void;
  activeSearch?: string;
  activeVendor?: string;
  activeCategory?: string;
}

function getContextualPrompts(
  search?: string,
  vendor?: string,
  category?: string
): string[] {
  const prompts: string[] = [];

  if (vendor) {
    prompts.push(`Compare prices from ${vendor}`);
    prompts.push(`Find alternatives to ${vendor} products`);
  }
  if (category) {
    prompts.push(`Search for ${category} products`);
    prompts.push(`Compare options in ${category}`);
  }
  if (search) {
    prompts.push(`Tell me more about ${search}`);
    prompts.push(`Compare prices for ${search}`);
  }

  // Fill remaining slots with defaults
  const remaining = 3 - prompts.length;
  if (remaining > 0) {
    prompts.push(...STARTER_PROMPTS.slice(0, remaining));
  }

  return prompts.slice(0, 3);
}

export function StarterPrompts({ onSelect, activeSearch, activeVendor, activeCategory }: StarterPromptsProps) {
  const prompts = useMemo(
    () => getContextualPrompts(activeSearch, activeVendor, activeCategory),
    [activeSearch, activeVendor, activeCategory]
  );

  const hasContext = activeSearch || activeVendor || activeCategory;

  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 px-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Sparkles className="w-4 h-4 text-accent" />
        <p className="text-sm">
          {hasContext ? 'Ask about your current selection' : 'Try asking about medical devices'}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onSelect(prompt)}
            className="px-3.5 py-2 text-sm bg-muted hover:bg-muted/70 hover:border-accent/30 rounded-lg border border-border transition-colors text-left leading-snug"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
