"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle, AlertTriangle, XCircle, X, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import type { XLSXImportResult } from "@/lib/actions/xlsx-import";

interface ImportResultDialogProps {
  result: XLSXImportResult;
  onClose: () => void;
}

export function ImportResultDialog({ result, onClose }: ImportResultDialogProps) {
  const t = useTranslations("xlsxImport");
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.2 }}
        className="relative bg-background border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-base font-semibold">{t("importComplete")}</h3>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-3">
          {/* Format error */}
          {result.formatError && (
            <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
              <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{result.formatError}</p>
            </div>
          )}

          {/* Imported count */}
          {result.imported > 0 && (
            <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                {t("importedCount", { count: result.imported })}
              </span>
            </div>
          )}

          {/* Updated count */}
          {result.updated > 0 && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <CheckCircle className="h-5 w-5 text-blue-500 shrink-0" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {t("updatedCount", { count: result.updated })}
              </span>
            </div>
          )}

          {/* Duplicates */}
          {result.duplicates.length > 0 && (
            <div className="border border-amber-200 dark:border-amber-800 rounded-lg overflow-hidden">
              <button
                onClick={() => setShowDuplicates(!showDuplicates)}
                className="flex items-center gap-3 w-full p-3 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
              >
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                <span className="text-sm font-medium text-amber-700 dark:text-amber-300 flex-1 text-left">
                  {t("skippedDuplicates", { count: result.duplicates.length })}
                </span>
                {showDuplicates ? (
                  <ChevronUp className="h-4 w-4 text-amber-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-amber-500" />
                )}
              </button>
              <AnimatePresence>
                {showDuplicates && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 py-2 max-h-40 overflow-y-auto divide-y divide-amber-100 dark:divide-amber-900">
                      {result.duplicates.map((dup, i) => (
                        <div key={i} className="py-1.5 text-xs text-amber-700 dark:text-amber-400">
                          <span className="text-muted-foreground">{t("rowNumber", { row: dup.row })}: </span>
                          <span className="font-medium">{dup.name}</span>
                          <span className="text-muted-foreground"> ({dup.sku})</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Errors */}
          {result.errors.length > 0 && (
            <div className="border border-red-200 dark:border-red-800 rounded-lg overflow-hidden">
              <button
                onClick={() => setShowErrors(!showErrors)}
                className="flex items-center gap-3 w-full p-3 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
              >
                <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                <span className="text-sm font-medium text-red-700 dark:text-red-300 flex-1 text-left">
                  {t("errorCount", { count: result.errors.length })}
                </span>
                {showErrors ? (
                  <ChevronUp className="h-4 w-4 text-red-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-red-500" />
                )}
              </button>
              <AnimatePresence>
                {showErrors && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 py-2 max-h-40 overflow-y-auto divide-y divide-red-100 dark:divide-red-900">
                      {result.errors.map((err, i) => (
                        <div key={i} className="py-1.5 text-xs text-red-700 dark:text-red-400">
                          <span className="text-muted-foreground">{t("rowNumber", { row: err.row })}: </span>
                          <span>{err.message}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Summary when nothing happened */}
          {!result.formatError && result.imported === 0 && result.updated === 0 && result.duplicates.length === 0 && result.errors.length === 0 && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">No products were processed.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-muted/30">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-lg hover:bg-muted transition-colors"
          >
            {t("close")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
