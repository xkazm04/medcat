'use client'

import { useState, useEffect } from 'react'
import { useCopyToClipboard } from 'usehooks-ts'
import { Check, ChevronDown, ExternalLink } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import type { ProductWithRelations } from '@/lib/types'
import { generateResearchPrompt } from '@/lib/utils/prompt-template'
import { useTranslations } from 'next-intl'

interface ResearchPromptProps {
  product: ProductWithRelations
}

export function ResearchPrompt({ product }: ResearchPromptProps) {
  const t = useTranslations('research')
  const [, copy] = useCopyToClipboard()
  const [copied, setCopied] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

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

  return (
    <div className="space-y-4">
      {/* Expandable Prompt Preview */}
      <div className="bg-muted/50 rounded-lg overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-muted/70 transition-colors"
        >
          <span className="text-sm font-medium text-muted-foreground">
            {t('promptLabel')}
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

      {/* Action Links as bullet list */}
      <ul className="space-y-2 text-sm">
        <li>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 text-blue-subtle hover:underline"
          >
            <span className="text-muted-foreground">•</span>
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>{t('copied')}</span>
              </>
            ) : (
              <span>{t('copyPrompt')}</span>
            )}
          </button>
        </li>
        <li>
          <a
            href="https://www.perplexity.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-subtle hover:underline"
          >
            <span className="text-muted-foreground">•</span>
            <span>{t('goToPerplexity')}</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </li>
        <li>
          <a
            href="https://gemini.google.com/app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-subtle hover:underline"
          >
            <span className="text-muted-foreground">•</span>
            <span>{t('goToGemini')}</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </li>
        <li>
          <a
            href="https://search.eudamed.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-subtle hover:underline"
          >
            <span className="text-muted-foreground">•</span>
            <span>{t('goToEudamed')}</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </li>
      </ul>
    </div>
  )
}
