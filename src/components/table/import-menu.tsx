"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, Loader2, FileSpreadsheet } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useTranslations } from "next-intl";
import { parseXLSXFile, type XLSXParseResult } from "@/lib/utils/xlsx-import";
import { importFromXLSX, type XLSXImportResult } from "@/lib/actions/xlsx-import";
import { ImportResultDialog } from "./import-result-dialog";

export function ImportMenu() {
  const t = useTranslations("xlsxImport");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<XLSXParseResult | null>(null);
  const [result, setResult] = useState<XLSXImportResult | null>(null);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Read file as ArrayBuffer
    const buffer = await file.arrayBuffer();
    const parsed = parseXLSXFile(buffer);

    if (!parsed.success) {
      // Format error — show result dialog with the error
      setResult({
        success: false,
        imported: 0,
        skipped: 0,
        updated: 0,
        errors: [],
        duplicates: [],
        formatError: parsed.formatError,
      });
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setPreview(parsed);
  }, []);

  const handleImport = useCallback(async () => {
    if (!preview?.rows.length) return;

    setImporting(true);
    try {
      const importResult = await importFromXLSX(preview.rows);
      setResult(importResult);
      setPreview(null);
    } catch (err) {
      setResult({
        success: false,
        imported: 0,
        skipped: 0,
        updated: 0,
        errors: [{ row: 0, message: err instanceof Error ? err.message : "Import failed" }],
        duplicates: [],
      });
      setPreview(null);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [preview]);

  const handleCancel = useCallback(() => {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleCloseResult = useCallback(() => {
    setResult(null);
  }, []);

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Import button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={importing}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-muted transition-colors disabled:opacity-50"
        aria-label={t("import")}
      >
        {importing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="h-3.5 w-3.5" />
        )}
        <span>{importing ? t("importing") : t("import")}</span>
      </button>

      {/* Preview confirmation dialog */}
      <AnimatePresence>
        {preview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={handleCancel} />
            <div className="relative bg-background border border-border rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
              {/* Header */}
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-base font-semibold">{t("previewTitle")}</h3>
              </div>

              {/* Content */}
              <div className="px-5 py-4">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <FileSpreadsheet className="h-8 w-8 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">
                      {t("previewDesc", { count: preview.rows.length })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {preview.headers.length} columns
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 px-5 py-3 border-t border-border bg-muted/30">
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {importing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {t("importing")}
                    </>
                  ) : (
                    t("confirm", { count: preview.rows.length })
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Result dialog */}
      <AnimatePresence>
        {result && (
          <ImportResultDialog result={result} onClose={handleCloseResult} />
        )}
      </AnimatePresence>
    </>
  );
}
