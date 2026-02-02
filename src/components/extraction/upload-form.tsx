'use client'

import { useState, useTransition } from 'react'
import { Upload, FileText, Loader2 } from 'lucide-react'
import { extractFromProductSheet } from '@/lib/actions/extraction'
import type { ExtractedProduct } from '@/lib/schemas/extraction'

interface UploadFormProps {
  onExtracted: (data: ExtractedProduct) => void
}

export function UploadForm({ onExtracted }: UploadFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setFileName(file?.name ?? null)
    setError(null)
  }

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await extractFromProductSheet(formData)
      if (result.success && result.data) {
        onExtracted(result.data)
      } else {
        setError(result.error ?? 'Extraction failed')
      }
    })
  }

  return (
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

      <button
        type="submit"
        disabled={isPending || !fileName}
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
  )
}
