'use client'

import { useState, useEffect } from 'react'
import { useCopyToClipboard } from 'usehooks-ts'
import { Copy, Check, ExternalLink } from 'lucide-react'
import type { ProductWithRelations } from '@/lib/types'
import { generateResearchPrompt } from '@/lib/utils/prompt-template'

interface ResearchPromptProps {
  product: ProductWithRelations
}

export function ResearchPrompt({ product }: ResearchPromptProps) {
  const [, copy] = useCopyToClipboard()
  const [copied, setCopied] = useState(false)

  const prompt = generateResearchPrompt(product)

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [copied])

  const handleCopy = async () => {
    const success = await copy(prompt)
    if (success) {
      setCopied(true)
    }
  }

  const handleOpenPerplexity = () => {
    window.open('https://www.perplexity.ai/', '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-4">
      <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
        {prompt}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy Prompt
            </>
          )}
        </button>

        <button
          onClick={handleOpenPerplexity}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          Open Perplexity
        </button>
      </div>
    </div>
  )
}
