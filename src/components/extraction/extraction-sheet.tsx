'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { FileType, TableProperties, ArrowLeft } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { UploadForm } from './upload-form'
import { ExtractionPreview } from './extraction-preview'
import { BatchImportFlow } from './batch-import-flow'
import type { BatchImportFlowHandle } from './batch-import-flow'
import type { ExtractedProduct } from '@/lib/schemas/extraction'
import type { Vendor, EMDNCategory } from '@/lib/types'
import type { BatchRow } from '@/lib/types/batch-import'

type Mode = 'single' | 'batch'

interface ExtractionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialMode?: Mode
  vendors: Vendor[]
  emdnCategories: EMDNCategory[]
}

export function ExtractionSheet({
  open,
  onOpenChange,
  initialMode = 'single',
  vendors,
  emdnCategories,
}: ExtractionSheetProps) {
  const t = useTranslations('extraction')
  const [mode, setMode] = useState<Mode>(initialMode)

  // Single product state
  const [step, setStep] = useState<'upload' | 'preview'>('upload')
  const [extractedData, setExtractedData] = useState<ExtractedProduct | null>(null)

  // Batch review state
  const [batchReviewRow, setBatchReviewRow] = useState<BatchRow | null>(null)
  const batchFlowRef = useRef<BatchImportFlowHandle>(null)

  // Reset state when sheet opens
  useEffect(() => {
    if (open) {
      setMode(initialMode)
      setStep('upload')
      setExtractedData(null)
      setBatchReviewRow(null)
    }
  }, [open, initialMode])

  // Single product handlers
  function handleExtracted(data: ExtractedProduct) {
    setExtractedData(data)
    setStep('preview')
  }

  function handleSuccess() {
    onOpenChange(false)
  }

  function handleBackToUpload() {
    setStep('upload')
    setExtractedData(null)
  }

  // Batch review handlers
  const handleReviewRow = useCallback((row: BatchRow) => {
    setBatchReviewRow(row)
  }, [])

  function handleBatchReviewSuccess() {
    if (batchReviewRow) {
      batchFlowRef.current?.updateRowStatus(batchReviewRow.id, 'accepted')
    }
    setBatchReviewRow(null)
  }

  function handleBatchReviewSkip() {
    if (batchReviewRow) {
      batchFlowRef.current?.updateRowStatus(batchReviewRow.id, 'skipped')
    }
    setBatchReviewRow(null)
  }

  function handleBackToResults() {
    setBatchReviewRow(null)
  }

  // Whether we're in a detail/review view (hide tabs, show back)
  const isReviewing = (mode === 'single' && step === 'preview') || (mode === 'batch' && batchReviewRow !== null)

  // Derive sheet title
  function getTitle() {
    if (mode === 'single') {
      return step === 'upload' ? t('title') : t('titleReview')
    }
    if (batchReviewRow) return t('titleReview')
    return t('batchTitle')
  }

  const vendorList = vendors.map((v) => ({ id: v.id, name: v.name }))
  const categoryList = emdnCategories.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
  }))

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader className="shrink-0">
          <SheetTitle className="flex items-center gap-2">
            {isReviewing && (
              <button
                type="button"
                onClick={mode === 'batch' ? handleBackToResults : handleBackToUpload}
                className="p-1 -ml-1 rounded-md hover:bg-muted transition-colors"
                title={t('backToList')}
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            {getTitle()}
          </SheetTitle>
        </SheetHeader>

        <div className="py-4 flex-1 overflow-y-auto min-h-0">
          {/* Mode tabs — hide when reviewing a product */}
          {!isReviewing && (
            <div className="px-6 mb-4">
              <div className="flex rounded-lg border border-border p-1 bg-muted/30">
                <button
                  type="button"
                  onClick={() => setMode('single')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    mode === 'single'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <FileType className="h-4 w-4" />
                  {t('singleProduct')}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('batch')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    mode === 'batch'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <TableProperties className="h-4 w-4" />
                  {t('batchImport')}
                </button>
              </div>
            </div>
          )}

          {/* Single product mode */}
          {mode === 'single' && (
            <>
              {step === 'upload' ? (
                <div className="px-6">
                  <UploadForm onExtracted={handleExtracted} />
                </div>
              ) : extractedData ? (
                <ExtractionPreview
                  extractedData={extractedData}
                  vendors={vendorList}
                  emdnCategories={categoryList}
                  onSuccess={handleSuccess}
                />
              ) : null}
            </>
          )}

          {/* Batch mode */}
          {mode === 'batch' && !batchReviewRow && (
            <BatchImportFlow
              ref={batchFlowRef}
              onReviewRow={handleReviewRow}
            />
          )}

          {/* Batch review mode — reuse ExtractionPreview */}
          {mode === 'batch' && batchReviewRow && batchReviewRow.extracted && (
            <ExtractionPreview
              extractedData={batchReviewRow.extracted}
              vendors={vendorList}
              emdnCategories={categoryList}
              onSuccess={handleBatchReviewSuccess}
              onSkip={handleBatchReviewSkip}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
