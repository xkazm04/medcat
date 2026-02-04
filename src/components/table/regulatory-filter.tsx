"use client";

import { useState, useCallback, useMemo, memo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Check, X } from "lucide-react";

interface RegulatoryFilterProps {
  className?: string;
}

export const RegulatoryFilter = memo(function RegulatoryFilter({
  className = "",
}: RegulatoryFilterProps) {
  const t = useTranslations('regulatory');
  const tc = useTranslations('common');
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // CE options sorted by label name
  const CE_OPTIONS = useMemo(() => [
    { value: "true", label: t("ceMarked") },
    { value: "false", label: t("ceNotMarked") },
  ], [t]);

  // MDR options sorted by class name (I, IIa, IIb, III)
  const MDR_OPTIONS = useMemo(() => [
    { value: "I", label: t("mdrClassI"), color: "bg-green-100 text-green-700" },
    { value: "IIa", label: t("mdrClassIIa"), color: "bg-yellow-100 text-yellow-700" },
    { value: "IIb", label: t("mdrClassIIb"), color: "bg-orange-100 text-orange-700" },
    { value: "III", label: t("mdrClassIII"), color: "bg-red-100 text-red-700" },
  ], [t]);

  // Parse selected CE values (multiselect)
  const selectedCeMarked = useMemo(() => {
    const param = searchParams.get("ceMarked");
    if (!param) return [];
    return param.split(",").filter(Boolean);
  }, [searchParams]);

  // Parse selected MDR classes (multiselect)
  const selectedMdrClasses = useMemo(() => {
    const param = searchParams.get("mdrClass");
    if (!param) return [];
    return param.split(",").filter(Boolean);
  }, [searchParams]);

  const hasFilters = selectedCeMarked.length > 0 || selectedMdrClasses.length > 0;
  const totalSelected = selectedCeMarked.length + selectedMdrClasses.length;

  const updateFilter = useCallback(
    (key: string, values: string[]) => {
      const params = new URLSearchParams(searchParams.toString());
      if (values.length > 0) {
        params.set(key, values.join(","));
      } else {
        params.delete(key);
      }
      params.set("page", "1");
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  const clearFilters = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const params = new URLSearchParams(searchParams.toString());
      params.delete("ceMarked");
      params.delete("mdrClass");
      params.set("page", "1");
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  const toggleCeMarked = useCallback(
    (value: string) => {
      const isSelected = selectedCeMarked.includes(value);
      if (isSelected) {
        updateFilter("ceMarked", selectedCeMarked.filter((v) => v !== value));
      } else {
        updateFilter("ceMarked", [...selectedCeMarked, value]);
      }
    },
    [selectedCeMarked, updateFilter]
  );

  const toggleMdrClass = useCallback(
    (value: string) => {
      const isSelected = selectedMdrClasses.includes(value);
      if (isSelected) {
        updateFilter("mdrClass", selectedMdrClasses.filter((v) => v !== value));
      } else {
        updateFilter("mdrClass", [...selectedMdrClasses, value]);
      }
    },
    [selectedMdrClasses, updateFilter]
  );

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            flex items-center gap-1 font-medium text-xs uppercase tracking-wide transition-colors
            ${hasFilters ? "text-accent" : "text-muted-foreground hover:text-foreground"}
          `}
        >
          <span>{t('filterTitle')}</span>
          <ChevronDown
            className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="p-0.5 rounded hover:bg-muted transition-colors"
            title={t('clearFilters')}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

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
              className="absolute left-0 top-full mt-1 z-50 bg-background border border-border rounded-lg shadow-lg py-1 min-w-[180px]"
            >
              {/* Selection summary */}
              {totalSelected > 0 && (
                <div className="px-3 py-1.5 text-xs text-muted-foreground border-b border-border flex items-center justify-between">
                  <span>{t('selected', { count: totalSelected })}</span>
                  <button
                    onClick={clearFilters}
                    className="text-accent hover:underline"
                  >
                    {tc('clear')}
                  </button>
                </div>
              )}

              {/* CE Status section */}
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border">
                {t('ceStatus')}
              </div>
              {CE_OPTIONS.map((option) => {
                const isSelected = selectedCeMarked.includes(option.value);
                return (
                  <button
                    key={option.value}
                    onClick={() => toggleCeMarked(option.value)}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-sm font-normal text-left hover:bg-muted transition-colors"
                  >
                    <div
                      className={`
                        w-4 h-4 rounded border flex items-center justify-center transition-colors
                        ${isSelected ? "bg-accent border-accent" : "border-border"}
                      `}
                    >
                      {isSelected && (
                        <Check className="h-3 w-3 text-accent-foreground" />
                      )}
                    </div>
                    <span className="font-normal text-foreground">{option.label}</span>
                  </button>
                );
              })}

              {/* MDR Class section */}
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-t border-border mt-1">
                {t('mdrClass')}
              </div>
              {MDR_OPTIONS.map((option) => {
                const isSelected = selectedMdrClasses.includes(option.value);
                return (
                  <button
                    key={option.value}
                    onClick={() => toggleMdrClass(option.value)}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-sm font-normal text-left hover:bg-muted transition-colors"
                  >
                    <div
                      className={`
                        w-4 h-4 rounded border flex items-center justify-center transition-colors
                        ${isSelected ? "bg-accent border-accent" : "border-border"}
                      `}
                    >
                      {isSelected && (
                        <Check className="h-3 w-3 text-accent-foreground" />
                      )}
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs font-normal ${option.color}`}
                    >
                      {option.value}
                    </span>
                    <span className="font-normal text-muted-foreground">{option.label.replace(/^Třída |^Class /, "")}</span>
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
});