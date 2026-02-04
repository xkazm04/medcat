"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { X, FolderTree, Building2, Search, Shield } from "lucide-react";
import { toTitleCase } from "@/lib/utils/format-category";
import type { Vendor, EMDNCategory } from "@/lib/types";
import type { CategoryNode } from "@/lib/queries";

interface ActiveFiltersProps {
  vendors: Vendor[];
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
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.15 }}
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm
        ${variant === "category"
          ? "bg-accent/10 text-accent border border-accent/20"
          : "bg-muted text-foreground border border-border"
        }
      `}
    >
      {icon && <span className="opacity-60">{icon}</span>}
      <span className="font-medium text-xs uppercase tracking-wide opacity-60">{label}:</span>
      <span className="truncate max-w-[200px]">{value}</span>
      <button
        onClick={onRemove}
        className="ml-1 p-0.5 rounded-full hover:bg-foreground/10 transition-colors"
        aria-label={`Remove ${label} filter`}
      >
        <X className="h-3 w-3" />
      </button>
    </motion.div>
  );
}

export function ActiveFilters({ vendors, categories }: ActiveFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract active filters
  const search = searchParams.get("search");
  const vendorIds = searchParams.get("vendor")?.split(",").filter(Boolean) || [];
  const categoryId = searchParams.get("category");
  const ceMarked = searchParams.get("ceMarked");
  const mdrClass = searchParams.get("mdrClass");

  // Map IDs to names
  const selectedVendors = vendorIds
    .map((id) => vendors.find((v) => v.id === id))
    .filter(Boolean) as Vendor[];
  const categoryPath = categoryId ? getCategoryPath(categories, categoryId) : [];

  const hasFilters = search || vendorIds.length > 0 || categoryId || ceMarked || mdrClass;

  if (!hasFilters) {
    return null;
  }

  const removeFilter = (key: string, value?: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (key === "vendor" && value) {
      const newVendors = vendorIds.filter((id) => id !== value);
      if (newVendors.length > 0) {
        params.set("vendor", newVendors.join(","));
      } else {
        params.delete("vendor");
      }
    } else {
      params.delete(key);
    }

    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  const clearAll = () => {
    const params = new URLSearchParams();
    if (searchParams.has("sortBy")) {
      params.set("sortBy", searchParams.get("sortBy")!);
    }
    if (searchParams.has("sortOrder")) {
      params.set("sortOrder", searchParams.get("sortOrder")!);
    }
    router.push(`?${params.toString()}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 p-3 bg-muted/30 border border-border rounded-lg"
    >
      {/* Category breadcrumb - prominent display */}
      {categoryPath.length > 0 && (
        <div className="mb-3 pb-3 border-b border-border">
          <div className="flex items-center gap-2 text-sm">
            <FolderTree className="h-4 w-4 text-accent shrink-0" />
            <span className="text-muted-foreground">Category:</span>
            <div className="flex items-center gap-1 flex-wrap">
              {categoryPath.map((cat, index) => (
                <span key={cat.id} className="flex items-center">
                  {index > 0 && <span className="mx-1 text-muted-foreground">/</span>}
                  <span
                    className={
                      index === categoryPath.length - 1
                        ? "font-medium text-accent"
                        : "text-muted-foreground"
                    }
                  >
                    {toTitleCase(cat.name)}
                  </span>
                </span>
              ))}
            </div>
            <button
              onClick={() => removeFilter("category")}
              className="ml-auto p-1 rounded hover:bg-muted transition-colors"
              aria-label="Remove category filter"
            >
              <X className="h-4 w-4 text-muted-foreground" />
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
              label="Search"
              value={search}
              icon={<Search className="h-3 w-3" />}
              onRemove={() => removeFilter("search")}
            />
          )}

          {/* Vendors */}
          {selectedVendors.map((vendor) => (
            <FilterChip
              key={`vendor-${vendor.id}`}
              label="Vendor"
              value={vendor.name}
              icon={<Building2 className="h-3 w-3" />}
              onRemove={() => removeFilter("vendor", vendor.id)}
            />
          ))}

          {/* CE Marked */}
          {ceMarked && (
            <FilterChip
              key="ceMarked"
              label="CE"
              value={ceMarked === "true" ? "Marked" : "Not Marked"}
              icon={<Shield className="h-3 w-3" />}
              onRemove={() => removeFilter("ceMarked")}
            />
          )}

          {/* MDR Class */}
          {mdrClass && (
            <FilterChip
              key="mdrClass"
              label="MDR"
              value={`Class ${mdrClass}`}
              icon={<Shield className="h-3 w-3" />}
              onRemove={() => removeFilter("mdrClass")}
            />
          )}
        </AnimatePresence>

        {/* Clear all button */}
        {(search || selectedVendors.length > 0 || ceMarked || mdrClass) && (
          <button
            onClick={clearAll}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear all
          </button>
        )}
      </div>
    </motion.div>
  );
}
