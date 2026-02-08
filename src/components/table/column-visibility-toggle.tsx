"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Settings2, Check, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

export interface ColumnVisibility {
  product: boolean;
  sku: boolean;
  vendor: boolean;
  manufacturer: boolean;
  price: boolean;
  regulatory: boolean;
  category: boolean;
}

const DEFAULT_VISIBILITY: ColumnVisibility = {
  product: true,
  sku: true,
  vendor: true,
  manufacturer: true,
  price: false,
  regulatory: false,
  category: true,
};

const STORAGE_KEY = "medcatalog-column-visibility";

interface ColumnVisibilityToggleProps {
  visibility: ColumnVisibility;
  onChange: (visibility: ColumnVisibility) => void;
  onResetColumnSizing?: () => void;
}

export function useColumnVisibility() {
  const [visibility, setVisibility] = useState<ColumnVisibility>(DEFAULT_VISIBILITY);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setVisibility({ ...DEFAULT_VISIBILITY, ...parsed });
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Save to localStorage on change
  const updateVisibility = useCallback((newVisibility: ColumnVisibility) => {
    setVisibility(newVisibility);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newVisibility));
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  return { visibility, setVisibility: updateVisibility };
}

export function ColumnVisibilityToggle({
  visibility,
  onChange,
  onResetColumnSizing,
}: ColumnVisibilityToggleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("table");
  const tCol = useTranslations("columnVisibility");

  const toggleColumn = (column: keyof ColumnVisibility) => {
    // Don't allow hiding product column
    if (column === "product") return;

    onChange({
      ...visibility,
      [column]: !visibility[column],
    });
  };

  // Count visible columns
  const visibleCount = Object.values(visibility).filter(Boolean).length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-muted transition-colors"
        title={t("toggleColumnVisibility")}
      >
        <Settings2 className="h-3.5 w-3.5" />
        <span>{t("columns")}</span>
        <span className="text-[10px] bg-muted px-1 rounded">
          {visibleCount}/{Object.keys(visibility).length}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-1 z-50 bg-background border border-border rounded-lg shadow-lg py-1 min-w-[160px]"
            >
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border mb-1">
                {t("toggleColumns")}
              </div>
              {(Object.keys(visibility) as Array<keyof ColumnVisibility>).map(
                (column) => {
                  const isVisible = visibility[column];
                  const isRequired = column === "product";

                  return (
                    <button
                      key={column}
                      onClick={() => toggleColumn(column)}
                      disabled={isRequired}
                      className={`
                        flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left transition-colors
                        ${isRequired
                          ? "text-muted-foreground/50 cursor-not-allowed"
                          : "hover:bg-muted"
                        }
                      `}
                    >
                      <div
                        className={`
                          w-4 h-4 rounded border flex items-center justify-center transition-colors
                          ${isVisible
                            ? "bg-accent border-accent"
                            : "border-border"
                          }
                        `}
                      >
                        {isVisible && <Check className="h-3 w-3 text-accent-foreground" />}
                      </div>
                      <span>{tCol(column)}</span>
                    </button>
                  );
                }
              )}
              {onResetColumnSizing && (
                <>
                  <div className="border-t border-border my-1" />
                  <button
                    onClick={() => {
                      onResetColumnSizing();
                      setIsOpen(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left hover:bg-muted transition-colors text-muted-foreground"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>{tCol("resetWidths")}</span>
                  </button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
