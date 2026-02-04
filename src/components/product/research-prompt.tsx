'use client'

import { useState, useEffect } from 'react'
import { useCopyToClipboard } from 'usehooks-ts'
import { Copy, Check, ExternalLink, Search, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import type { ProductWithRelations } from '@/lib/types'
import { generateResearchPrompt, generateQuickSearchPrompt } from '@/lib/utils/prompt-template'

interface ResearchPromptProps {
  product: ProductWithRelations
}

export function ResearchPrompt({ product }: ResearchPromptProps) {
  const [, copy] = useCopyToClipboard()
  const [copied, setCopied] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [promptType, setPromptType] = useState<'full' | 'quick'>('full')

  const prompt = promptType === 'full'
    ? generateResearchPrompt(product)
    : generateQuickSearchPrompt(product)

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

  const handleOpenEudamed = () => {
    window.open('https://search.eudamed.com/', '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-4">
      {/* Prompt Type Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPromptType('full')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            promptType === 'full'
              ? 'bg-blue-subtle/20 text-blue-subtle border border-blue-subtle/30'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
        >
          Full Research
        </button>
        <button
          onClick={() => setPromptType('quick')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            promptType === 'quick'
              ? 'bg-blue-subtle/20 text-blue-subtle border border-blue-subtle/30'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
        >
          Quick Search
        </button>
      </div>

      {/* Expandable Prompt Preview */}
      <div className="bg-muted/50 rounded-lg overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-muted/70 transition-colors"
        >
          <span className="text-sm font-medium text-muted-foreground">
            {promptType === 'full' ? 'Comprehensive Research Prompt' : 'Quick Search Prompt'}
          </span>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              key="prompt-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4">
                <pre className="font-mono text-xs whitespace-pre-wrap max-h-80 overflow-y-auto bg-background/50 rounded p-3 border border-border">
                  {prompt}
                </pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
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
          Perplexity AI
        </button>

        <button
          onClick={handleOpenEudamed}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
        >
          <Search className="h-4 w-4" />
          EUDAMED
        </button>
      </div>

      {/* Quick Tips */}
      <p className="text-xs text-muted-foreground">
        Copy the prompt and paste into Perplexity AI for best results.
        Use EUDAMED to search manufacturers by EMDN code directly.
      </p>
    </div>
  )
}
