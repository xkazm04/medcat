'use client';

import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, X, Loader2 } from 'lucide-react';
import { parseCSVPreview, type CSVRow } from '@/lib/utils/csv-parser';
import { useTranslations } from 'next-intl';

interface FileUploadStepProps {
  onFileSelect: (file: File, headers: string[], preview: CSVRow[]) => void;
  onClear: () => void;
  selectedFile: File | null;
}

/**
 * File upload step for CSV import wizard.
 * Handles drag-drop and click-to-upload for CSV files.
 * Parses preview on selection and passes data to parent.
 */
export function FileUploadStep({
  onFileSelect,
  onClear,
  selectedFile,
}: FileUploadStepProps) {
  const t = useTranslations("import");
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      // Validate file type
      if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
        setError(t("pleaseSelectFile"));
        return;
      }

      setError(null);
      setIsParsing(true);

      try {
        const result = await parseCSVPreview(file);

        if (result.errors.length > 0) {
          setError(t("parseError", { error: result.errors[0].message }));
          setIsParsing(false);
          return;
        }

        if (result.headers.length === 0) {
          setError(t("emptyFile"));
          setIsParsing(false);
          return;
        }

        onFileSelect(file, result.headers, result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("parseFailed"));
      } finally {
        setIsParsing(false);
      }
    },
    [onFileSelect, t]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleClear = () => {
    setError(null);
    onClear();
  };

  // Show selected file state
  if (selectedFile) {
    return (
      <div className="border border-border rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-10 w-10 text-accent" />
            <div>
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-2 hover:bg-muted rounded-md transition-colors"
            aria-label={t("removeFile")}
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </div>
    );
  }

  // Show upload zone
  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-accent bg-accent/5'
            : 'border-border hover:border-accent'
        }`}
      >
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleInputChange}
          className="hidden"
          id="csv-file-upload"
          disabled={isParsing}
        />
        <label htmlFor="csv-file-upload" className="cursor-pointer block">
          {isParsing ? (
            <Loader2 className="mx-auto h-12 w-12 text-accent animate-spin" />
          ) : (
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
          )}
          <p className="mt-4 text-sm font-medium">
            {isParsing
              ? t("parsingCsv")
              : t("dropCsv")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("csvOnly")}
          </p>
        </label>
      </div>

      {error && (
        <p className="text-sm text-red-500 flex items-center gap-2">
          <X className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  );
}
