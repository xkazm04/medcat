'use client';

import { useState } from 'react';
import { Copy, Check, RefreshCw } from 'lucide-react';
import { useCopyToClipboard } from 'usehooks-ts';

interface MessageActionsProps {
  text: string;
  isLastAssistant: boolean;
  onRegenerate?: () => void;
}

export function MessageActions({ text, isLastAssistant, onRegenerate }: MessageActionsProps) {
  const [, copy] = useCopyToClipboard();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await copy(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may fail in insecure contexts — silently ignore
    }
  };

  return (
    <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
      <button
        onClick={handleCopy}
        className="flex items-center gap-1 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
        title="Copy message"
      >
        {copied ? (
          <>
            <Check className="h-3 w-3 text-accent" />
            <span className="text-accent">Copied</span>
          </>
        ) : (
          <>
            <Copy className="h-3 w-3" />
            <span>Copy</span>
          </>
        )}
      </button>
      {isLastAssistant && onRegenerate && (
        <button
          onClick={onRegenerate}
          className="flex items-center gap-1 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          title="Regenerate response"
        >
          <RefreshCw className="h-3 w-3" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
}
