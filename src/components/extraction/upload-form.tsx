'use client'

import { useState, useTransition } from 'react'
import { Upload, FileText, Loader2, FlaskConical, Link, FileType } from 'lucide-react'
import { extractFromProductSheet, extractFromUrl } from '@/lib/actions/extraction'
import { runTestExtraction } from '@/lib/actions/test-extraction'
import { TEST_PRODUCT_NAME } from '@/lib/constants/test-product'
import type { ExtractedProduct } from '@/lib/schemas/extraction'

interface UploadFormProps {
  onExtracted: (data: ExtractedProduct) => void
}

type InputMode = 'file' | 'url'

export function UploadForm({ onExtracted }: UploadFormProps) {
  const [isPending, startTransition] = useTransition()
  const [isTestPending, startTestTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [testInfo, setTestInfo] = useState<string | null>(null)
  const [inputMode, setInputMode] = useState<InputMode>('file')
  const [url, setUrl] = useState('')

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setFileName(file?.name ?? null)
    setError(null)
    setTestInfo(null)
  }

  function handleFileSubmit(formData: FormData) {
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

  function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) {
      setError('Please enter a URL')
      return
    }
    setError(null)
    setTestInfo(null)
    startTransition(async () => {
      const result = await extractFromUrl(url.trim())
      if (result.success && result.data) {
        onExtracted(result.data)
      } else {
        setError(result.error ?? 'URL extraction failed')
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

  const isLoading = isPending || isTestPending

  return (
    <div className="space-y-6">
      {/* Input Mode Toggle */}
      <div className="flex rounded-lg border border-border p-1 bg-muted/30">
        <button
          type="button"
          onClick={() => { setInputMode('file'); setError(null) }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            inputMode === 'file'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileType className="h-4 w-4" />
          File Upload
        </button>
        <button
          type="button"
          onClick={() => { setInputMode('url'); setError(null) }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            inputMode === 'url'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Link className="h-4 w-4" />
          URL
        </button>
      </div>

      {/* File Upload Mode */}
      {inputMode === 'file' && (
        <form action={handleFileSubmit} className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-accent transition-colors">
            <input
              type="file"
              name="file"
              accept=".txt,.md,.pdf"
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
              <p className="mt-2 text-sm font-medium text-foreground">
                {fileName ?? 'Click to upload file'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Supported: .txt, .md, .pdf
              </p>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading || !fileName}
            className="w-full bg-accent text-accent-foreground py-2.5 px-4 rounded-md font-medium disabled:opacity-50 hover:bg-accent/90 transition-colors"
          >
            {isPending ? (
              <>
                <Loader2 className="inline mr-2 h-4 w-4 animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <FileText className="inline mr-2 h-4 w-4" />
                Extract from File
              </>
            )}
          </button>
        </form>
      )}

      {/* URL Input Mode */}
      {inputMode === 'url' && (
        <form onSubmit={handleUrlSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="url-input" className="text-sm font-medium text-foreground">
              Product Page URL
            </label>
            <input
              id="url-input"
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(null) }}
              placeholder="https://example.com/product/..."
              className="w-full border border-border rounded-md px-3 py-2.5 focus:ring-2 focus:ring-accent focus:outline-none bg-background text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Enter a product page URL from a manufacturer or vendor website
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="w-full bg-accent text-accent-foreground py-2.5 px-4 rounded-md font-medium disabled:opacity-50 hover:bg-accent/90 transition-colors"
          >
            {isPending ? (
              <>
                <Loader2 className="inline mr-2 h-4 w-4 animate-spin" />
                Fetching & Extracting...
              </>
            ) : (
              <>
                <Link className="inline mr-2 h-4 w-4" />
                Extract from URL
              </>
            )}
          </button>
        </form>
      )}

      {/* Error/Info Messages */}
      {error && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}
      {testInfo && <p className="text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">{testInfo}</p>}

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or test</span>
        </div>
      </div>

      {/* Test Extraction Button */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleTestExtraction}
          disabled={isLoading}
          className="w-full border border-border text-foreground py-2 px-4 rounded-md font-medium disabled:opacity-50 hover:bg-muted transition-colors"
        >
          {isTestPending ? (
            <>
              <Loader2 className="inline mr-2 h-4 w-4 animate-spin" />
              Running Test...
            </>
          ) : (
            <>
              <FlaskConical className="inline mr-2 h-4 w-4" />
              Test with Sample Data
            </>
          )}
        </button>
        <p className="text-xs text-muted-foreground text-center">
          Uses hardcoded spec: <strong>{TEST_PRODUCT_NAME}</strong>
        </p>
      </div>
    </div>
  )
}
