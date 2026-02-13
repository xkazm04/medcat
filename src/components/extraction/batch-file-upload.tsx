'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Upload, FileSpreadsheet, Loader2, FlaskConical, Globe } from 'lucide-react'
import { parseSpreadsheet } from '@/lib/utils/spreadsheet-parser'
import { TEST_BATCH_PRODUCTS } from '@/lib/constants/test-batch-products'
import type { ParsedSpreadsheet } from '@/lib/types/batch-import'

interface BatchFileUploadProps {
  onReady: (spreadsheet: ParsedSpreadsheet) => void
}

export function BatchFileUpload({ onReady }: BatchFileUploadProps) {
  const t = useTranslations('extraction')
  const [fileName, setFileName] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ParsedSpreadsheet | null>(null)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [webSearch, setWebSearch] = useState(true)

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setParsing(true)
    setFileName(file.name)
    try {
      const result = await parseSpreadsheet(file)
      if (result.totalRows === 0) {
        setError(t('noRowsToProcess'))
        setParsed(null)
      } else {
        setParsed(result)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('fileParseError'))
      setParsed(null)
    } finally {
      setParsing(false)
    }
  }, [t])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleSubmit() {
    if (!parsed) return
    onReady({ ...parsed, webSearch })
  }

  function handleTestBatch() {
    const headers = Object.keys(TEST_BATCH_PRODUCTS[0])
    const rows = TEST_BATCH_PRODUCTS.map((p) => ({ ...p }))
    onReady({
      headers,
      rows,
      fileName: 'test-batch-3-products.csv',
      totalRows: rows.length,
    })
  }

  return (
    <div className="space-y-5 px-6">
      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragOver ? 'border-accent bg-accent/5' : 'border-border hover:border-accent'
        }`}
      >
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
          id="batch-file-upload"
        />
        <label htmlFor="batch-file-upload" className="cursor-pointer">
          {parsing ? (
            <Loader2 className="mx-auto h-10 w-10 text-muted-foreground animate-spin" />
          ) : fileName ? (
            <FileSpreadsheet className="mx-auto h-10 w-10 text-accent" />
          ) : (
            <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
          )}
          <p className="mt-2 text-sm font-medium text-foreground">
            {parsing ? t('parsingFile') : fileName ?? t('dropSpreadsheet')}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('acceptedFormats')}
          </p>
        </label>
      </div>

      {/* File Stats */}
      {parsed && (
        <div className="text-sm text-muted-foreground bg-muted/30 rounded-md px-3 py-2">
          {parsed.totalRows} {parsed.totalRows === 1 ? 'row' : 'rows'} &middot; {parsed.headers.length} columns
        </div>
      )}

      {/* Web Search toggle */}
      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={webSearch}
          onChange={(e) => setWebSearch(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border text-accent focus:ring-accent"
        />
        <div>
          <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            {t('webSearchLabel')}
          </span>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('webSearchDesc')}
          </p>
        </div>
      </label>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {/* Start Button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!parsed || parsing}
        className="w-full bg-button text-button-foreground py-2.5 px-4 rounded-md font-medium disabled:opacity-50 hover:bg-button-hover transition-colors"
      >
        {t('startProcessing')}
      </button>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">{t('or')}</span>
        </div>
      </div>

      {/* Test Batch */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleTestBatch}
          disabled={parsing}
          className="w-full border border-border text-foreground py-2 px-4 rounded-md font-medium disabled:opacity-50 hover:bg-muted transition-colors"
        >
          <FlaskConical className="inline mr-2 h-4 w-4" />
          {t('testBatchImport')}
        </button>
        <p className="text-xs text-muted-foreground text-center">
          {t('testBatchDesc')}
        </p>
      </div>
    </div>
  )
}
