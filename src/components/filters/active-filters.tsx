"use client";

import { useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { X, Search, Shield, Factory } from "lucide-react";
import { toTitleCase } from "@/lib/utils/format-category";
import type { EMDNCategory } from "@/lib/types";
import type { CategoryNode } from "@/lib/queries";
import { useTranslations, useLocale } from "next-intl";
import { getLocalizedCategoryName } from "@/lib/utils/use-localized-category";

interface ActiveFiltersProps {
  categories: CategoryNode[];
}

// Build category path for breadcrumb display
function getCategoryPath(categories: CategoryNode[], id: string): EMDNCategory[] {
  const path: EMDNCategory[] = [];

  function search(nodes: CategoryNode[], currentPath: EMDNCategory[]): boolean {
    for (const node of nodes) {
      const newPath = [...currentPath, node];
      if (node.id === id) {
        path.push(...newPath);
        return true;
      }
      if (node.children?.length > 0) {
        if (search(node.children, newPath)) {
          return true;
        }
      }
    }
    return false;
  }

  search(categories, []);
  return path;
}

interface FilterChipProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  onRemove: () => void;
  variant?: "default" | "category";
}

function FilterChip({ label, value, icon, onRemove, variant = "default" }: FilterChipProps) {
  const t = useTranslations("activeFilters");
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.15 }}
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm shadow-sm
        ${variant === "category"
          ? "bg-green-light text-accent border border-green-border"
          : "bg-background text-foreground border border-border hover:border-green-border/50 transition-colors duration-150"
        }
      `}
    >
      {icon && <span className="opacity-60">{icon}</span>}
      <span className="font-medium text-xs uppercase tracking-wide opacity-60">{label}:</span>
      <span className="truncate max-w-[200px]">{value}</span>
      <button
        onClick={onRemove}
        className="ml-1 p-0.5 rounded-full hover:bg-foreground/10 transition-colors"
        aria-label={t("removeFilter", { label })}
      >
        <X className="h-3 w-3" />
      </button>
    </motion.div>
  );
}

export function ActiveFilters({ categories }: ActiveFiltersProps) {
  const t = useTranslations("activeFilters");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Memoize filter extraction to avoid recalculating on every render
  const {
    search,
    categoryId,
    ceMarkedValues,
    mdrClassValues,
    manufacturerValues,
  } = useMemo(() => ({
    search: searchParams.get("search"),
    categoryId: searchParams.get("category"),
    ceMarkedValues: searchParams.get("ceMarked")?.split(",").filter(Boolean) || [],
    mdrClassValues: searchParams.get("mdrClass")?.split(",").filter(Boolean) || [],
    manufacturerValues: searchParams.get("manufacturer")?.split(",").filter(Boolean).map(decodeURIComponent) || [],
  }), [searchParams]);

  // Memoize category path calculation (expensive tree traversal)
  const categoryPath = useMemo(() =>
    categoryId ? getCategoryPath(categories, categoryId) : [],
    [categoryId, categories]
  );

  const hasFilters = search || categoryId || ceMarkedValues.length > 0 || mdrClassValues.length > 0 || manufacturerValues.length > 0;

  if (!hasFilters) {
    return null;
  }

  const removeFilter = (key: string, value?: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (key === "ceMarked" && value) {
      const newValues = ceMarkedValues.filter((v) => v !== value);
      if (newValues.length > 0) {
        params.set("ceMarked", newValues.join(","));
      } else {
        params.delete("ceMarked");
      }
    } else if (key === "mdrClass" && value) {
      const newValues = mdrClassValues.filter((v) => v !== value);
      if (newValues.length > 0) {
        params.set("mdrClass", newValues.join(","));
      } else {
        params.delete("mdrClass");
      }
    } else if (key === "manufacturer" && value) {
      const newValues = manufacturerValues.filter((v) => v !== value);
      if (newValues.length > 0) {
        params.set("manufacturer", newValues.map(encodeURIComponent).join(","));
      } else {
        params.delete("manufacturer");
      }
    } else {
      params.delete(key);
    }

    params.set("page", "1");
    // Use startTransition to keep UI responsive
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  const clearAll = () => {
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
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 p-3 bg-green-light/30 border border-green-border/50 rounded-lg shadow-sm"
      data-testid="active-filters"
    >
      {/* Category hierarchy - indented bullet list */}
      {categoryPath.length > 0 && (
        <div className="mb-3 pb-3 border-b border-border">
          <div className="flex items-start justify-between gap-2">
            <ul className="text-sm space-y-0.5">
              {categoryPath.map((cat, index) => {
                const localizedName = getLocalizedCategoryName(cat, locale);
                const isLast = index === categoryPath.length - 1;
                return (
                  <li
                    key={cat.id}
                    className="flex items-center gap-1.5"
                    style={{ paddingLeft: `${index * 16}px` }}
                  >
                    <span className={`text-xs ${isLast ? 'text-accent' : 'text-muted-foreground/60'}`}>
                      {isLast ? '●' : '○'}
                    </span>
                    <span className={isLast ? "font-medium text-accent" : "text-muted-foreground"}>
                      {toTitleCase(localizedName)}
                    </span>
                  </li>
                );
              })}
            </ul>
            <button
              onClick={() => removeFilter("category")}
              className="shrink-0 p-1 rounded hover:bg-muted/80 transition-colors duration-150"
              aria-label={t("removeCategory")}
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
            </button>
          </div>
        </div>
      )}

      {/* Other active filters */}
      <div className="flex items-center flex-wrap gap-2">
        <AnimatePresence mode="popLayout">
          {/* Search */}
          {search && (
            <FilterChip
              key="search"
              label={t("search")}
              value={search}
              icon={<Search className="h-3 w-3" />}
              onRemove={() => removeFilter("search")}
            />
          )}

          {/* CE Marked */}
          {ceMarkedValues.map((value) => (
            <FilterChip
              key={`ceMarked-${value}`}
              label={t("ce")}
              value={value === "true" ? t("ceMarked") : t("ceNotMarked")}
              icon={<Shield className="h-3 w-3" />}
              onRemove={() => removeFilter("ceMarked", value)}
            />
          ))}

          {/* MDR Class */}
          {mdrClassValues.map((value) => (
            <FilterChip
              key={`mdrClass-${value}`}
              label={t("mdr")}
              value={t("mdrClass", { mdrClass: value })}
              icon={<Shield className="h-3 w-3" />}
              onRemove={() => removeFilter("mdrClass", value)}
            />
          ))}

          {/* Manufacturers */}
          {manufacturerValues.map((name) => (
            <FilterChip
              key={`manufacturer-${name}`}
              label={t("manufacturer")}
              value={name}
              icon={<Factory className="h-3 w-3" />}
              onRemove={() => removeFilter("manufacturer", name)}
            />
          ))}
        </AnimatePresence>

        {/* Clear all button */}
        {(search || ceMarkedValues.length > 0 || mdrClassValues.length > 0 || manufacturerValues.length > 0) && (
          <button
            onClick={clearAll}
            data-testid="clear-all-filters"
            className="ml-auto text-xs font-medium text-muted-foreground hover:text-foreground transition-colors duration-150 px-2 py-1 rounded hover:bg-muted/50"
          >
            {t("clearAll")}
          </button>
        )}
      </div>
    </motion.div>
  );
}
