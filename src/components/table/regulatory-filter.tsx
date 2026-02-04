"use client";

import { useState, useCallback, memo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Check, X } from "lucide-react";

interface RegulatoryFilterProps {
  className?: string;
}

const CE_OPTIONS = [
  { value: "true", label: "CE Marked" },
  { value: "false", label: "Not CE Marked" },
] as const;

const MDR_OPTIONS = [
  { value: "I", label: "Class I", color: "bg-green-100 text-green-700" },
  { value: "IIa", label: "Class IIa", color: "bg-yellow-100 text-yellow-700" },
  { value: "IIb", label: "Class IIb", color: "bg-orange-100 text-orange-700" },
  { value: "III", label: "Class III", color: "bg-red-100 text-red-700" },
] as const;

export const RegulatoryFilter = memo(function RegulatoryFilter({
  className = "",
}: RegulatoryFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentCeMarked = searchParams.get("ceMarked");
  const currentMdrClass = searchParams.get("mdrClass");
  const hasFilters = currentCeMarked !== null || currentMdrClass !== null;

  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
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
      updateFilter("ceMarked", currentCeMarked === value ? null : value);
    },
    [currentCeMarked, updateFilter]
  );

  const toggleMdrClass = useCallback(
    (value: string) => {
      updateFilter("mdrClass", currentMdrClass === value ? null : value);
    },
    [currentMdrClass, updateFilter]
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
          <span>Regulatory</span>
          <ChevronDown
            className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="p-0.5 rounded hover:bg-muted transition-colors"
            title="Clear regulatory filters"
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
              {/* CE Marked section */}
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border">
                CE Status
              </div>
              {CE_OPTIONS.map((option) => {
                const isSelected = currentCeMarked === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => toggleCeMarked(option.value)}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left hover:bg-muted transition-colors"
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
                    <span>{option.label}</span>
                  </button>
                );
              })}

              {/* MDR Class section */}
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-t border-border mt-1">
                MDR Class
              </div>
              {MDR_OPTIONS.map((option) => {
                const isSelected = currentMdrClass === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => toggleMdrClass(option.value)}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left hover:bg-muted transition-colors"
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
                      className={`px-1.5 py-0.5 rounded text-xs font-medium ${option.color}`}
                    >
                      {option.value}
                    </span>
                    <span className="text-muted-foreground">{option.label.replace("Class ", "")}</span>
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
