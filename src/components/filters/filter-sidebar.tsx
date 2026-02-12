"use client";

import { ReactNode, useState, useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "motion/react";
import { X, ChevronDown, Loader2 } from "lucide-react";

interface FilterSidebarProps {
  children: ReactNode;
}

export function FilterSidebar({ children }: FilterSidebarProps) {
  const t = useTranslations('filters');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Memoize filter state to avoid recalculating on every render
  const hasActiveFilters = useMemo(() => {
    const filterKeys = ["search", "vendor", "category", "material", "minPrice", "maxPrice"];
    return filterKeys.some(key => searchParams.has(key));
  }, [searchParams]);

  const clearAllFilters = () => {
    const params = new URLSearchParams();
    if (searchParams.has("sortBy")) {
      params.set("sortBy", searchParams.get("sortBy")!);
    }
    if (searchParams.has("sortOrder")) {
      params.set("sortOrder", searchParams.get("sortOrder")!);
    }
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  return (
    <motion.aside
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="w-[280px] shrink-0 border-r border-border/60 bg-background/50 backdrop-blur-sm overflow-y-auto h-[calc(100vh-56px)] sticky top-14"
    >
      <div className="p-4">
        <div className="space-y-1">
          {children}
        </div>

        {/* Clear all button */}
        <AnimatePresence>
          {hasActiveFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-border"
            >
              <button
                onClick={clearAllFilters}
                disabled={isPending}
                data-testid="sidebar-clear-all"
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-muted transition-colors duration-150 disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <X className="h-3.5 w-3.5" />
                )}
                {t('clearAllFilters')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}

interface FilterSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: number;
}

export function FilterSection({ title, children, defaultOpen = true, badge }: FilterSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-3 text-left group"
      >
        <span className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">
          {title}
        </span>
        <div className="flex items-center gap-2">
          {badge !== undefined && badge > 0 && (
            <span className="text-xs text-accent font-medium">
              {badge}
            </span>
          )}
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pb-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
