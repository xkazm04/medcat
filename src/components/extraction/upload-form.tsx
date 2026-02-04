'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
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
  const t = useTranslations('extraction')
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
    startTestTransition(async () => {
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
          {t('fileUpload')}
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
          {t('url')}
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
            {isPending ? (
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
      )}

      {/* URL Input Mode */}
      {inputMode === 'url' && (
        <form onSubmit={handleUrlSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="url-input" className="text-sm font-medium text-foreground">
              {t('productPageUrl')}
            </label>
            <input
              id="url-input"
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(null) }}
              placeholder={t('urlPlaceholder')}
              className="w-full border border-border rounded-md px-3 py-2.5 focus:ring-2 focus:ring-accent focus:outline-none bg-background text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {t('urlHelp')}
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="w-full bg-button text-button-foreground py-2.5 px-4 rounded-md font-medium disabled:opacity-50 hover:bg-button-hover transition-colors"
          >
            {isPending ? (
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

      {/* Error/Info Messages */}
      {error && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}
      {testInfo && <p className="text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">{testInfo}</p>}

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">{t('orTest')}</span>
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
    </div>
  )
}
