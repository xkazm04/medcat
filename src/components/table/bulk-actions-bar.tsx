"use client";

import { motion, AnimatePresence } from "motion/react";
import { Download, MessageSquare, X, GitCompare } from "lucide-react";
import { useTranslations } from "next-intl";
import { productsToCSV, downloadCSV, getExportFilename } from "@/lib/utils/csv-export";
import { useChatContextOptional } from "@/lib/hooks/use-chat-context";
import type { ProductWithRelations } from "@/lib/types";
import type { ColumnVisibility } from "./column-visibility-toggle";

interface BulkActionsBarProps {
  selectedProducts: ProductWithRelations[];
  columnVisibility: ColumnVisibility;
  onClear: () => void;
}

export function BulkActionsBar({ selectedProducts, columnVisibility, onClear }: BulkActionsBarProps) {
  const t = useTranslations("bulkActions");
  const chatContext = useChatContextOptional();
  const count = selectedProducts.length;

  const handleExport = () => {
    const csv = productsToCSV(selectedProducts, columnVisibility);
    downloadCSV(csv, getExportFilename('selected') + '.csv');
  };

  const handleAskAI = () => {
    if (chatContext && count > 0) {
      const names = selectedProducts.slice(0, 5).map(p => p.name).join(', ');
      chatContext.sendMessage(`Tell me about these products: ${names}`);
    }
  };

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 bg-foreground text-background rounded-full shadow-lg"
        >
          <span className="text-sm font-medium">
            {t("selected", { count })}
          </span>
          <div className="w-px h-5 bg-background/20" />
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 text-sm hover:text-accent-foreground transition-colors px-2 py-1 rounded-md hover:bg-background/10"
          >
            <Download className="h-3.5 w-3.5" />
            {t("exportSelected")}
          </button>
          {chatContext && (
            <button
              onClick={handleAskAI}
              className="flex items-center gap-1.5 text-sm hover:text-accent-foreground transition-colors px-2 py-1 rounded-md hover:bg-background/10"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {t("askAI")}
            </button>
          )}
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-sm text-background/60 hover:text-background transition-colors px-2 py-1 rounded-md hover:bg-background/10"
          >
            <X className="h-3.5 w-3.5" />
            {t("clear")}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
