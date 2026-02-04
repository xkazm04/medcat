'use client'

import { useState, useTransition } from 'react'
import { Upload, FileText, Loader2, FlaskConical } from 'lucide-react'
import { extractFromProductSheet } from '@/lib/actions/extraction'
import { runTestExtraction } from '@/lib/actions/test-extraction'
import { TEST_PRODUCT_NAME } from '@/lib/constants/test-product'
import type { ExtractedProduct } from '@/lib/schemas/extraction'

interface UploadFormProps {
  onExtracted: (data: ExtractedProduct) => void
}

export function UploadForm({ onExtracted }: UploadFormProps) {
  const [isPending, startTransition] = useTransition()
  const [isTestPending, startTestTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [testInfo, setTestInfo] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setFileName(file?.name ?? null)
    setError(null)
    setTestInfo(null)
  }

  function handleSubmit(formData: FormData) {
    setError(null)
    setTestInfo(null)
    startTransition(async () => {
      const result = await extractFromProductSheet(formData)
      if (result.success && result.data) {
        onExtracted(result.data)
      } else {
        setError(result.error ?? 'Extraction failed')
      }
    })
  }

  function handleTestExtraction() {
    setError(null)
    setTestInfo(null)
    startTestTransition(async () => {
      const result = await runTestExtraction()
      if (result.success && result.data) {
        if (result.deletedExisting) {
          setTestInfo('Deleted existing test product')
        }
        onExtracted(result.data)
      } else {
        setError(result.error ?? 'Test extraction failed')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* File Upload Form */}
      <form action={handleSubmit} className="space-y-4">
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-accent transition-colors">
          <input
            type="file"
            name="file"
            accept=".txt,.md"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            {fileName ? (
              <FileText className="mx-auto h-12 w-12 text-accent" />
            ) : (
              <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
            )}
            <p className="mt-2 text-sm text-muted-foreground">
              {fileName ?? 'Click to upload .txt or .md file'}
            </p>
          </label>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        {testInfo && <p className="text-sm text-blue-500">{testInfo}</p>}

        <button
          type="submit"
          disabled={isPending || isTestPending || !fileName}
          className="w-full bg-accent text-accent-foreground py-2 px-4 rounded-md font-medium disabled:opacity-50 hover:bg-accent/90 transition-colors"
        >
          {isPending ? (
            <>
              <Loader2 className="inline mr-2 h-4 w-4 animate-spin" />
              Extracting...
            </>
          ) : (
            <>
              <FileText className="inline mr-2 h-4 w-4" />
              Extract Product Data
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or</span>
        </div>
      </div>

      {/* Test Extraction Button */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleTestExtraction}
          disabled={isPending || isTestPending}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
        >
          {isTestPending ? (
            <>
              <Loader2 className="inline mr-2 h-4 w-4 animate-spin" />
              Running Test...
            </>
          ) : (
            <>
              <FlaskConical className="inline mr-2 h-4 w-4" />
              Test Extraction
            </>
          )}
        </button>
        <p className="text-xs text-muted-foreground text-center">
          Runs extraction on hardcoded spec: <strong>{TEST_PRODUCT_NAME}</strong>
        </p>
        <p className="text-xs text-muted-foreground text-center">
          (Deletes existing test product before extraction)
        </p>
      </div>
    </div>
  )
}
