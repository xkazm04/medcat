"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { productsToCSV, downloadCSV, getExportFilename } from "@/lib/utils/csv-export";
import type { ProductWithRelations } from "@/lib/types";
import type { ColumnVisibility } from "./column-visibility-toggle";

interface ExportMenuProps {
  products: ProductWithRelations[];
  columnVisibility: ColumnVisibility;
  totalCount: number;
}

export function ExportMenu({ products, columnVisibility, totalCount }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("export");

  const handleExportPageCSV = () => {
    const csv = productsToCSV(products, columnVisibility);
    downloadCSV(csv, getExportFilename() + '.csv');
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-muted transition-colors"
        aria-label={t("export")}
      >
        <Download className="h-3.5 w-3.5" />
        <span>{t("export")}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-1 z-50 bg-background border border-border rounded-lg shadow-lg py-1 min-w-[200px]"
            >
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border mb-1">
                {t("exportData")}
              </div>
              <button
                onClick={handleExportPageCSV}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors"
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div>{t("exportPageCSV")}</div>
                  <div className="text-xs text-muted-foreground">{t("exportPageDesc", { count: products.length })}</div>
                </div>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
