"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";

interface MobileFilterTriggerProps {
  children: React.ReactNode;
}

export function MobileFilterTrigger({ children }: MobileFilterTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("filters");
  const searchParams = useSearchParams();

  const filterCount = useMemo(() => {
    let count = 0;
    if (searchParams.has("search")) count++;
    if (searchParams.has("vendor")) count++;
    if (searchParams.has("category")) count++;
    if (searchParams.has("material")) count++;
    if (searchParams.has("ceMarked")) count++;
    if (searchParams.has("mdrClass")) count++;
    if (searchParams.has("manufacturer")) count++;
    if (searchParams.has("minPrice") || searchParams.has("maxPrice")) count++;
    return count;
  }, [searchParams]);

  return (
    <>
      {/* Floating filter button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 left-4 z-40 flex items-center gap-2 px-4 py-2.5 bg-accent text-accent-foreground rounded-full shadow-lg hover:bg-green-hover transition-colors md:hidden"
      >
        <SlidersHorizontal className="w-4 h-4" />
        <span className="font-medium text-sm">{t("title")}</span>
        {filterCount > 0 && (
          <span className="flex items-center justify-center min-w-[20px] h-5 text-xs font-bold bg-accent-foreground text-accent px-1 rounded-full">
            {filterCount}
          </span>
        )}
      </button>

      {/* Bottom sheet drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-foreground/40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-2xl shadow-lg max-h-[85vh] flex flex-col safe-area-top"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>
              {/* Header */}
              <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
                <h2 className="text-base font-semibold">{t("title")}</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  aria-label="Close filters"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* Filter content */}
              <div className="flex-1 overflow-y-auto p-4">
                {children}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
