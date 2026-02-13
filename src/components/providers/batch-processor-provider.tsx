'use client'

import { createContext, useContext, useRef, useState, useEffect, useCallback, type ReactNode } from 'react'
import { getActiveBatch, updateBatchStatus } from '@/lib/actions/batch-imports'

export interface ActiveBatch {
  id: string
  fileName: string
  progress: { current: number; total: number }
  status: 'processing' | 'completed' | 'cancelled'
}

interface BatchProcessorContextValue {
  activeBatch: ActiveBatch | null
  startBatch: (batchId: string, fileName: string, totalRows: number, webSearch?: boolean) => void
  cancelBatch: () => void
  dismissBatch: () => void
  /** Signal that the batch sheet should be opened (e.g. badge click in header) */
  openBatchSheetRequested: boolean
  requestOpenBatchSheet: () => void
  clearOpenBatchSheetRequest: () => void
}

const BatchProcessorContext = createContext<BatchProcessorContextValue>({
  activeBatch: null,
  startBatch: () => {},
  cancelBatch: () => {},
  dismissBatch: () => {},
  openBatchSheetRequested: false,
  requestOpenBatchSheet: () => {},
  clearOpenBatchSheetRequest: () => {},
})

export function useBatchProcessor() {
  return useContext(BatchProcessorContext)
}

export function BatchProcessorProvider({ children }: { children: ReactNode }) {
  const [activeBatch, setActiveBatch] = useState<ActiveBatch | null>(null)
  const [openBatchSheetRequested, setOpenBatchSheetRequested] = useState(false)
  const cancelledRef = useRef(false)
  const processingRef = useRef(false)

  const webSearchRef = useRef(true)

  // Process rows one at a time via API route
  const processLoop = useCallback(async (batchId: string, fileName: string, totalRows: number, startFrom: number) => {
    if (processingRef.current) return
    processingRef.current = true
    cancelledRef.current = false

    setActiveBatch({
      id: batchId,
      fileName,
      progress: { current: startFrom, total: totalRows },
      status: 'processing',
    })

    let current = startFrom

    while (!cancelledRef.current) {
      try {
        const res = await fetch('/api/batch/process-next', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batchId, webSearch: webSearchRef.current }),
        })

        if (!res.ok) {
          // API error — wait and retry
          await new Promise(r => setTimeout(r, 2000))
          continue
        }

        const data = await res.json()

        if (data.cancelled) {
          setActiveBatch(prev => prev ? { ...prev, status: 'cancelled' } : null)
          break
        }

        current = data.processed
        setActiveBatch(prev => prev ? {
          ...prev,
          progress: { current, total: data.total },
        } : null)

        if (data.done) {
          setActiveBatch(prev => prev ? { ...prev, status: 'completed' } : null)
          break
        }

        // Brief gap between rows (Gemini Flash handles sustained requests well)
        await new Promise(r => setTimeout(r, 100))
      } catch {
        // Network error — wait longer and retry
        await new Promise(r => setTimeout(r, 3000))
      }
    }

    processingRef.current = false
  }, [])

  // On mount: check for active batches in DB and resume
  useEffect(() => {
    let mounted = true
    async function checkActive() {
      const batch = await getActiveBatch()
      if (batch && mounted) {
        processLoop(batch.id, batch.file_name, batch.total_rows, batch.processed)
      }
    }
    checkActive()
    return () => { mounted = false }
  }, [processLoop])

  const startBatch = useCallback((batchId: string, fileName: string, totalRows: number, webSearch = true) => {
    webSearchRef.current = webSearch
    processLoop(batchId, fileName, totalRows, 0)
  }, [processLoop])

  const cancelBatch = useCallback(async () => {
    cancelledRef.current = true
    if (activeBatch) {
      await updateBatchStatus(activeBatch.id, 'cancelled')
      setActiveBatch(prev => prev ? { ...prev, status: 'cancelled' } : null)
    }
  }, [activeBatch])

  const dismissBatch = useCallback(() => {
    setActiveBatch(null)
  }, [])

  const requestOpenBatchSheet = useCallback(() => {
    setOpenBatchSheetRequested(true)
  }, [])

  const clearOpenBatchSheetRequest = useCallback(() => {
    setOpenBatchSheetRequested(false)
  }, [])

  return (
    <BatchProcessorContext.Provider value={{ activeBatch, startBatch, cancelBatch, dismissBatch, openBatchSheetRequested, requestOpenBatchSheet, clearOpenBatchSheetRequest }}>
      {children}
    </BatchProcessorContext.Provider>
  )
}
