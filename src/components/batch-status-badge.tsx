'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, CheckCircle2, X } from 'lucide-react'
import { useBatchProcessor } from './providers/batch-processor-provider'

export function BatchStatusBadge() {
  const t = useTranslations('batch')
  const { activeBatch, dismissBatch, requestOpenBatchSheet } = useBatchProcessor()
  const [autoDismiss, setAutoDismiss] = useState(false)

  // Auto-dismiss completed batches after 15s
  useEffect(() => {
    if (activeBatch?.status === 'completed') {
      const timer = setTimeout(() => setAutoDismiss(true), 15000)
      return () => clearTimeout(timer)
    }
    setAutoDismiss(false)
  }, [activeBatch?.status])

  if (!activeBatch || autoDismiss) return null

  const { progress, status, fileName } = activeBatch
  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0

  if (status === 'processing') {
    return (
      <button
        onClick={requestOpenBatchSheet}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
        title={fileName}
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span className="tabular-nums">{progress.current}/{progress.total}</span>
        <span className="text-xs text-blue-500">{pct}%</span>
      </button>
    )
  }

  if (status === 'completed') {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={requestOpenBatchSheet}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
          title={fileName}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>{t('completed', { total: progress.total })}</span>
        </button>
        <button
          onClick={dismissBatch}
          className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    )
  }

  return null
}
