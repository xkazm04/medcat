'use client'

import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, FolderOpen } from 'lucide-react'
import { BatchFileUpload } from './batch-file-upload'
import { BatchProcessing } from './batch-processing'
import { BatchResultsTable } from './batch-results-table'
import {
  createBatchImport,
  updateBatchRow,
  getOpenBatchImports,
  getBatchImportWithRows,
  deleteBatchImport,
  type SavedBatchImport,
} from '@/lib/actions/batch-imports'
import { useBatchProcessor } from '@/components/providers/batch-processor-provider'
import type { BatchRow, ParsedSpreadsheet } from '@/lib/types/batch-import'

type Step = 'loading' | 'upload' | 'processing' | 'results'

export interface BatchImportFlowHandle {
  updateRowStatus: (rowId: string, status: 'accepted' | 'skipped') => void
}

interface BatchImportFlowProps {
  onReviewRow: (row: BatchRow) => void
}

export const BatchImportFlow = forwardRef<BatchImportFlowHandle, BatchImportFlowProps>(
  function BatchImportFlow({ onReviewRow }, ref) {
    const t = useTranslations('extraction')
    const { activeBatch, startBatch, cancelBatch } = useBatchProcessor()
    const [step, setStep] = useState<Step>('loading')
    const [rows, setRows] = useState<BatchRow[]>([])
    const [openBatches, setOpenBatches] = useState<SavedBatchImport[]>([])
    const batchIdRef = useRef<string | null>(null)

    // Load open batches on mount; if there's an active processing batch, show it
    useEffect(() => {
      let mounted = true
      async function load() {
        // If context has an active batch, show its state
        if (activeBatch) {
          batchIdRef.current = activeBatch.id
          if (activeBatch.status === 'processing') {
            setStep('processing')
            if (mounted) return
          }
          // If completed, load results
          if (activeBatch.status === 'completed') {
            const result = await getBatchImportWithRows(activeBatch.id)
            if (result && mounted) {
              setRows(result.rows)
              setStep('results')
              return
            }
          }
        }

        const batches = await getOpenBatchImports()
        if (mounted) {
          setOpenBatches(batches)
          setStep('upload')
        }
      }
      load()
      return () => { mounted = false }
    }, [activeBatch])

    // When context batch completes, load results from DB
    useEffect(() => {
      if (activeBatch?.status === 'completed' && batchIdRef.current === activeBatch.id && step === 'processing') {
        async function loadResults() {
          const result = await getBatchImportWithRows(activeBatch!.id)
          if (result) {
            setRows(result.rows)
            setStep('results')
          }
        }
        loadResults()
      }
    }, [activeBatch?.status, activeBatch?.id, step])

    // Keep a ref to rows for imperative handle (avoid stale closure)
    const rowsRef = useRef(rows)
    rowsRef.current = rows

    useImperativeHandle(ref, () => ({
      updateRowStatus(rowId: string, status: 'accepted' | 'skipped') {
        setRows((prev) => prev.map((r) =>
          r.id === rowId ? { ...r, status } : r
        ))
        // Persist to DB
        const row = rowsRef.current.find((r) => r.id === rowId)
        if (batchIdRef.current && row) {
          updateBatchRow(batchIdRef.current, row.rowIndex, { status })
        }
      },
    }))

    // Resume a saved batch
    const handleResumeBatch = useCallback(async (batchId: string) => {
      setStep('loading')
      const result = await getBatchImportWithRows(batchId)
      if (result) {
        batchIdRef.current = batchId
        setRows(result.rows)

        // Check if there are pending rows — if so, resume processing via context
        const hasPending = result.rows.some(r => r.status === 'pending' || r.status === 'processing')
        if (hasPending && result.batch.status === 'processing') {
          startBatch(batchId, result.batch.file_name, result.batch.total_rows)
          setStep('processing')
        } else {
          setStep('results')
        }
      } else {
        setStep('upload')
      }
    }, [startBatch])

    // Start new batch processing
    const handleReady = useCallback(async (spreadsheet: ParsedSpreadsheet) => {
      const initialRows: BatchRow[] = spreadsheet.rows.map((raw, i) => ({
        id: `row-${i}`,
        rowIndex: i,
        rawData: raw,
        extracted: null,
        status: 'pending',
      }))

      setRows(initialRows)
      setStep('processing')

      // Create batch in DB (with headers for server-side processing)
      const { batchId } = await createBatchImport(
        spreadsheet.fileName,
        initialRows.map((r) => ({ rawData: r.rawData, rowIndex: r.rowIndex })),
        spreadsheet.headers
      )
      batchIdRef.current = batchId ?? null

      // Start processing via global context (survives dialog close)
      if (batchId) {
        startBatch(batchId, spreadsheet.fileName, initialRows.length)
      }
    }, [startBatch])

    const handleCancel = useCallback(() => {
      cancelBatch()
      setStep('results')
    }, [cancelBatch])

    const handleDeleteBatch = useCallback(async () => {
      if (batchIdRef.current) {
        await deleteBatchImport(batchIdRef.current)
        batchIdRef.current = null
      }
      setRows([])
      setStep('upload')
      // Reload open batches
      const batches = await getOpenBatchImports()
      setOpenBatches(batches)
    }, [])

    if (step === 'loading') {
      return (
        <div className="px-6 py-8 flex justify-center">
          <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
        </div>
      )
    }

    if (step === 'upload') {
      return (
        <div>
          {/* Show open batches if any */}
          {openBatches.length > 0 && (
            <div className="px-6 mb-5 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t('openBatches')}
              </p>
              {openBatches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleResumeBatch(b.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md border border-border hover:bg-muted/50 transition-colors text-left"
                >
                  <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{b.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.total_rows} rows &middot; {new Date(b.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </button>
              ))}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">{t('or')}</span>
                </div>
              </div>
            </div>
          )}
          <BatchFileUpload onReady={handleReady} />
        </div>
      )
    }

    if (step === 'processing') {
      const progress = activeBatch?.progress ?? { current: 0, total: 0 }
      return (
        <BatchProcessing
          current={progress.current}
          total={progress.total}
          onCancel={handleCancel}
        />
      )
    }

    return (
      <BatchResultsTable
        rows={rows}
        onReviewRow={onReviewRow}
        onDelete={batchIdRef.current ? handleDeleteBatch : undefined}
      />
    )
  }
)
