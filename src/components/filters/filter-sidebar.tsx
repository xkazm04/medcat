"use client";

import { ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { X, Filter } from "lucide-react";

interface FilterSidebarProps {
  children: ReactNode;
}

export function FilterSidebar({ children }: FilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const hasActiveFilters =
    searchParams.has("search") ||
    searchParams.has("vendor") ||
    searchParams.has("category") ||
    searchParams.has("material") ||
    searchParams.has("minPrice") ||
    searchParams.has("maxPrice");

  const clearAllFilters = () => {
    const params = new URLSearchParams();
    // Keep only sort params
    if (searchParams.has("sortBy")) {
      params.set("sortBy", searchParams.get("sortBy")!);
    }
    if (searchParams.has("sortOrder")) {
      params.set("sortOrder", searchParams.get("sortOrder")!);
    }
    router.push(`?${params.toString()}`);
  };

  return (
    <motion.aside
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="w-[280px] shrink-0 border-r border-border bg-background overflow-y-auto h-[calc(100vh-1px)]"
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-green-border">
          <Filter className="h-4 w-4 text-green-subtle" />
          <h2 className="text-sm font-semibold text-foreground">Filters</h2>
          {hasActiveFilters && (
            <span className="ml-auto text-xs bg-green-light text-green-subtle px-2 py-0.5 rounded-full">
              Active
            </span>
          )}
        </div>

        <div className="space-y-6">
          {children}

          {hasActiveFilters && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={clearAllFilters}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-muted transition-colors duration-150"
            >
              <X className="h-4 w-4" />
              Clear all filters
            </motion.button>
          )}
        </div>
      </div>
    </motion.aside>
  );
}

interface FilterSectionProps {
  title: string;
  children: ReactNode;
}

export function FilterSection({ title, children }: FilterSectionProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide pl-2 border-l-2 border-green-border">
        {title}
      </h3>
      {children}
    </div>
  );
}
