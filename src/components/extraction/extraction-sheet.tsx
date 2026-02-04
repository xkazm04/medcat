'use client'

import { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { UploadForm } from './upload-form'
import { ExtractionPreview } from './extraction-preview'
import type { ExtractedProduct } from '@/lib/schemas/extraction'
import type { Vendor, EMDNCategory } from '@/lib/types'

interface ExtractionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vendors: Vendor[]
  emdnCategories: EMDNCategory[]
}

export function ExtractionSheet({
  open,
  onOpenChange,
  vendors,
  emdnCategories,
}: ExtractionSheetProps) {
  const [step, setStep] = useState<'upload' | 'preview'>('upload')
  const [extractedData, setExtractedData] = useState<ExtractedProduct | null>(null)

  // Reset state when sheet opens
  useEffect(() => {
    if (open) {
      setStep('upload')
      setExtractedData(null)
    }
  }, [open])

  function handleExtracted(data: ExtractedProduct) {
    setExtractedData(data)
    setStep('preview')
  }

  function handleSuccess() {
    onOpenChange(false) // Close sheet, data revalidates automatically
  }

  function handleCancel() {
    setStep('upload')
    setExtractedData(null)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>
            {step === 'upload' ? 'Extract Product from File' : 'Review Extracted Data'}
          </SheetTitle>
        </SheetHeader>

        <div className="py-4">
          {step === 'upload' ? (
            <div className="px-6">
              <UploadForm onExtracted={handleExtracted} />
            </div>
          ) : extractedData ? (
            <ExtractionPreview
              extractedData={extractedData}
              vendors={vendors.map((v) => ({ id: v.id, name: v.name }))}
              emdnCategories={emdnCategories.map((c) => ({
                id: c.id,
                code: c.code,
                name: c.name,
              }))}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
