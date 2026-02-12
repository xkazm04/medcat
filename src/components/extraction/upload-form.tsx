'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Upload, FileText, Loader2, FlaskConical, Link } from 'lucide-react'
import { extractFromProductSheet, extractFromUrl } from '@/lib/actions/extraction'
import { runTestExtraction } from '@/lib/actions/test-extraction'
import { TEST_PRODUCT_NAME } from '@/lib/constants/test-product'
import type { ExtractedProduct } from '@/lib/schemas/extraction'

interface UploadFormProps {
  onExtracted: (data: ExtractedProduct) => void
}

type ActionType = 'file' | 'url' | 'test' | null

export function UploadForm({ onExtracted }: UploadFormProps) {
  const t = useTranslations('extraction')
  const [isPending, startTransition] = useTransition()
  const [activeAction, setActiveAction] = useState<ActionType>(null)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [testInfo, setTestInfo] = useState<string | null>(null)
  const [showUrlInput, setShowUrlInput] = useState(false)
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
    setActiveAction('file')
    startTransition(async () => {
      const result = await extractFromProductSheet(formData)
      if (result.success && result.data) {
        onExtracted(result.data)
      } else {
        setError(result.error ?? t('failed'))
      }
    })
  }

  function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) {
      setError(t('pleaseEnterUrl'))
      return
    }
    setError(null)
    setTestInfo(null)
    setActiveAction('url')
    startTransition(async () => {
      const result = await extractFromUrl(url.trim())
      if (result.success && result.data) {
        onExtracted(result.data)
      } else {
        setError(result.error ?? t('urlExtractionFailed'))
      }
    })
  }

  function handleTestExtraction() {
    setError(null)
    setTestInfo(null)
    setActiveAction('test')
    startTransition(async () => {
      const result = await runTestExtraction()
      if (result.success && result.data) {
        if (result.deletedExisting) {
          setTestInfo(t('deletedTestProduct'))
        }
        onExtracted(result.data)
      } else {
        setError(result.error ?? t('testFailed'))
      }
    })
  }

  const isLoading = isPending

  return (
    <div className="space-y-5">
      {/* File Upload */}
      <form action={handleFileSubmit} className="space-y-3">
        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-accent transition-colors">
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
              <FileText className="mx-auto h-10 w-10 text-accent" />
            ) : (
              <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
            )}
            <p className="mt-2 text-sm font-medium text-foreground">
              {fileName ?? t('clickToUpload')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('supported')}
            </p>
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading || !fileName}
          className="w-full bg-button text-button-foreground py-2.5 px-4 rounded-md font-medium disabled:opacity-50 hover:bg-button-hover transition-colors"
        >
          {isPending && activeAction === 'file' ? (
            <>
              <Loader2 className="inline mr-2 h-4 w-4 animate-spin" />
              {t('extracting')}
            </>
          ) : (
            <>
              <FileText className="inline mr-2 h-4 w-4" />
              {t('extractFromFile')}
            </>
          )}
        </button>
      </form>

      {/* Divider — URL */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">{t('or')}</span>
        </div>
      </div>

      {/* URL extraction — collapsed by default */}
      {!showUrlInput ? (
        <button
          type="button"
          onClick={() => setShowUrlInput(true)}
          disabled={isLoading}
          className="w-full border border-border text-foreground py-2.5 px-4 rounded-md font-medium disabled:opacity-50 hover:bg-muted transition-colors"
        >
          <Link className="inline mr-2 h-4 w-4" />
          {t('extractFromUrl')}
        </button>
      ) : (
        <form onSubmit={handleUrlSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <input
              id="url-input"
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(null) }}
              placeholder={t('urlPlaceholder')}
              className="w-full border border-border rounded-md px-3 py-2.5 focus:ring-2 focus:ring-accent focus:outline-none bg-background text-sm"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">{t('urlHelp')}</p>
          </div>
          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="w-full bg-button text-button-foreground py-2.5 px-4 rounded-md font-medium disabled:opacity-50 hover:bg-button-hover transition-colors"
          >
            {isPending && activeAction === 'url' ? (
              <>
                <Loader2 className="inline mr-2 h-4 w-4 animate-spin" />
                {t('fetchingExtracting')}
              </>
            ) : (
              <>
                <Link className="inline mr-2 h-4 w-4" />
                {t('extractFromUrl')}
              </>
            )}
          </button>
        </form>
      )}

      {/* Divider — Test */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">{t('or')}</span>
        </div>
      </div>

      {/* Test Extraction */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleTestExtraction}
          disabled={isLoading}
          className="w-full border border-border text-foreground py-2 px-4 rounded-md font-medium disabled:opacity-50 hover:bg-muted transition-colors"
        >
          {isPending && activeAction === 'test' ? (
            <>
              <Loader2 className="inline mr-2 h-4 w-4 animate-spin" />
              {t('runningTest')}
            </>
          ) : (
            <>
              <FlaskConical className="inline mr-2 h-4 w-4" />
              {t('testWithSampleData')}
            </>
          )}
        </button>
        <p className="text-xs text-muted-foreground text-center">
          {t('testWithSampleData')}: <strong>{TEST_PRODUCT_NAME}</strong>
        </p>
      </div>

      {/* Error/Info Messages */}
      {error && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}
      {testInfo && <p className="text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">{testInfo}</p>}
    </div>
  )
}
