"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, FolderTree, Check, Loader2 } from "lucide-react";
import { useCategories, useCategoryAncestors } from "@/lib/query/hooks";
import type { CategoryNode } from "@/lib/queries";
import { simplifyChildName } from "@/lib/utils/format-category";

interface CategoryTreeProps {
  /** Initial categories for hydration (optional - will fetch if not provided) */
  initialCategories?: CategoryNode[];
}

interface CategoryItemProps {
  category: CategoryNode;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  depth?: number;
  parentName?: string;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
}

// Find category by ID
function findCategoryById(categories: CategoryNode[], id: string): CategoryNode | null {
  for (const cat of categories) {
    if (cat.id === id) return cat;
    if (cat.children?.length > 0) {
      const found = findCategoryById(cat.children, id);
      if (found) return found;
    }
  }
  return null;
}

function CategoryItem({
  category,
  selectedId,
  onSelect,
  depth = 0,
  parentName,
  expandedIds,
  onToggleExpand,
}: CategoryItemProps) {
  const hasChildren = category.children && category.children.length > 0;
  const isSelected = selectedId === category.id;
  const isExpanded = expandedIds.has(category.id);

  // Format the display name - remove redundant parent context
  const displayName = useMemo(() => {
    return simplifyChildName(category.name, parentName);
  }, [category.name, parentName]);

  const handleClick = () => {
    if (isSelected) {
      onSelect(null);
    } else {
      onSelect(category.id);
    }
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand(category.id);
  };

  return (
    <div className="select-none">
      <div
        className={`
          group flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer
          transition-all duration-150
          ${isSelected
            ? "bg-accent text-accent-foreground"
            : "hover:bg-muted text-foreground"
          }
        `}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
      >
        {/* Expand/collapse button */}
        {hasChildren ? (
          <button
            onClick={handleExpandClick}
            className={`
              p-0.5 rounded transition-colors
              ${isSelected ? "hover:bg-accent-foreground/20" : "hover:bg-muted-foreground/20"}
            `}
          >
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.15 }}
            >
              <ChevronRight className="h-3.5 w-3.5 opacity-60" />
            </motion.div>
          </button>
        ) : (
          <span className="w-[18px]" />
        )}

        {/* Category name */}
        <span className={`text-sm flex-1 truncate ${isSelected ? "font-medium" : ""}`}>
          {displayName}
        </span>

        {/* Product count */}
        {category.productCount > 0 && (
          <span className={`text-xs shrink-0 ${isSelected ? "text-accent-foreground/80" : "text-muted-foreground"}`}>
            {category.productCount}
          </span>
        )}

        {/* Selection indicator */}
        {isSelected && (
          <Check className="h-3.5 w-3.5 shrink-0" />
        )}
      </div>

      {/* Children */}
      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {category.children.map((child) => (
              <CategoryItem
                key={child.id}
                category={child}
                selectedId={selectedId}
                onSelect={onSelect}
                depth={depth + 1}
                parentName={category.name}
                expandedIds={expandedIds}
                onToggleExpand={onToggleExpand}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function CategoryTree({ initialCategories }: CategoryTreeProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("category");

  // Fetch categories with TanStack Query (with optional hydration)
  const { data: categories = [], isLoading, error } = useCategories(initialCategories);

  // Get ancestors for auto-expansion using cached data
  const ancestors = useCategoryAncestors(selectedId);
  // Create stable string key for dependency tracking
  const ancestorsKey = ancestors.join(',');

  // Track expanded categories - auto-expand to show selected
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Auto-expand when selection changes
  useEffect(() => {
    if (selectedId && ancestors.length > 0) {
      setExpandedIds((prev) => new Set([...prev, ...ancestors]));
    }
  }, [selectedId, ancestorsKey]); // Use stable string key instead of array

  const handleSelect = (id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set("category", id);
    } else {
      params.delete("category");
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  const handleToggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Expand all / collapse all
  const allCategoryIds = useMemo(() => {
    if (!categories || categories.length === 0) return [];
    const ids: string[] = [];
    function collect(nodes: CategoryNode[]) {
      if (!nodes) return;
      for (const node of nodes) {
        if (node.children?.length > 0) {
          ids.push(node.id);
          collect(node.children);
        }
      }
    }
    collect(categories);
    return ids;
  }, [categories]);

  const isAllExpanded = allCategoryIds.every((id) => expandedIds.has(id));

  const toggleAllExpanded = () => {
    if (isAllExpanded) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(allCategoryIds));
    }
  };

  // Loading state (only shows if no initial data provided)
  if (isLoading && categories.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading categories...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center px-4">
        <FolderTree className="h-8 w-8 text-destructive/40 mb-2" />
        <p className="text-sm text-destructive">Failed to load categories</p>
        <p className="text-xs text-muted-foreground mt-1">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    );
  }

  // Empty state
  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center px-4">
        <FolderTree className="h-8 w-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">No categorized products</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Products need EMDN categories assigned to enable filtering
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Expand/collapse toggle */}
      <div className="flex justify-end px-1">
        <button
          onClick={toggleAllExpanded}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {isAllExpanded ? "Collapse all" : "Expand all"}
        </button>
      </div>

      {/* Category tree */}
      <div className="space-y-0.5 max-h-[calc(100vh-350px)] overflow-y-auto scrollbar-thin">
        {categories.map((category) => (
          <CategoryItem
            key={category.id}
            category={category}
            selectedId={selectedId}
            onSelect={handleSelect}
            expandedIds={expandedIds}
            onToggleExpand={handleToggleExpand}
          />
        ))}
      </div>
    </div>
  );
}

// Export helper for use in other components
export { findCategoryById };
