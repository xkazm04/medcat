"use client";

import { useState, useEffect, useMemo, useTransition, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronRight, FolderTree, Check, Loader2, Search, X } from "lucide-react";
import { useDebounceValue } from "usehooks-ts";
import { useCategories, useCategoryAncestors, useCategoryLookups } from "@/lib/query/hooks";
import type { CategoryNode } from "@/lib/queries";
import { simplifyChildName } from "@/lib/utils/format-category";
import { useLocalizedCategoryName } from "@/lib/utils/use-localized-category";
import { useUrlFilter } from "@/lib/hooks/use-url-filter";

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

  // Get localized name based on current locale
  const localizedName = useLocalizedCategoryName(category);
  const localizedParentName = parentName;

  // Format the display name - remove redundant parent context
  const displayName = useMemo(() => {
    return simplifyChildName(localizedName, localizedParentName);
  }, [localizedName, localizedParentName]);

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

  // Cap indent at depth 4: max 64px. For depth > 4, use border accent.
  const indent = Math.min(depth, 4) * 14 + 8;
  const isDeep = depth > 4;

  return (
    <div className="select-none">
      <div
        className={`
          group flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer
          transition-all duration-150
          focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-1
          ${isSelected
            ? "bg-accent text-accent-foreground shadow-sm hover:shadow-md"
            : "hover:bg-green-light/30 text-foreground hover:shadow-sm active:scale-[0.99]"
          }
          ${isDeep && !isSelected ? "border-l-2 border-accent/20" : ""}
        `}
        style={{ paddingLeft: `${indent}px` }}
        onClick={handleClick}
        title={`${category.code} - ${localizedName}`}
      >
        {/* Expand/collapse button — CSS transition instead of Framer Motion */}
        {hasChildren ? (
          <button
            onClick={handleExpandClick}
            className={`
              p-0.5 rounded transition-all duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1
              ${isSelected ? "hover:bg-accent-foreground/20 active:scale-90" : "hover:bg-muted-foreground/20 active:scale-90"}
            `}
          >
            <ChevronRight
              className={`h-3.5 w-3.5 opacity-60 transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
            />
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
          <span className={`text-xs shrink-0 font-medium transition-colors ${isSelected ? "text-accent-foreground/80" : "text-muted-foreground"}`}>
            {category.productCount}
          </span>
        )}

        {/* Selection indicator */}
        {isSelected && (
          <Check className="h-3.5 w-3.5 shrink-0 animate-in zoom-in-50 duration-200" />
        )}
      </div>

      {/* Children — always mounted, CSS grid expand/collapse */}
      {hasChildren && (
        <div
          className={`tree-children ${isExpanded ? "expanded" : ""}`}
        >
          <div>
            {category.children.map((child) => (
              <CategoryItem
                key={child.id}
                category={child}
                selectedId={selectedId}
                onSelect={onSelect}
                depth={depth + 1}
                parentName={localizedName}
                expandedIds={expandedIds}
                onToggleExpand={onToggleExpand}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Recursively filter tree and collect ancestor IDs to expand
function filterCategories(
  nodes: CategoryNode[],
  query: string
): { filtered: CategoryNode[]; matchAncestorIds: string[] } {
  const lowerQuery = query.toLowerCase();
  const ancestorIds: string[] = [];

  function matches(node: CategoryNode): CategoryNode | null {
    const nameMatch = node.name.toLowerCase().includes(lowerQuery) ||
      (node.name_cs && node.name_cs.toLowerCase().includes(lowerQuery)) ||
      node.code.toLowerCase().includes(lowerQuery);

    // Recursively check children
    const matchingChildren: CategoryNode[] = [];
    if (node.children?.length > 0) {
      for (const child of node.children) {
        const childMatch = matches(child);
        if (childMatch) matchingChildren.push(childMatch);
      }
    }

    if (nameMatch || matchingChildren.length > 0) {
      if (matchingChildren.length > 0) {
        ancestorIds.push(node.id);
      }
      return {
        ...node,
        children: matchingChildren.length > 0 ? matchingChildren : node.children || [],
      };
    }
    return null;
  }

  const filtered: CategoryNode[] = [];
  for (const node of nodes) {
    const result = matches(node);
    if (result) filtered.push(result);
  }
  return { filtered, matchAncestorIds: ancestorIds };
}

/** Breadcrumb for selected deep category */
function CategoryBreadcrumb({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string | null) => void;
}) {
  const { byId, ancestorsById } = useCategoryLookups();
  const ancestors = ancestorsById.get(selectedId) || [];
  const selected = byId.get(selectedId);

  if (ancestors.length < 2 || !selected) return null;

  // Build path: ancestors + selected node
  const pathNodes = [...ancestors.map((id: string) => byId.get(id)).filter(Boolean), selected];
  // Show last 4 segments max for compact display
  const visible = pathNodes.slice(-4);
  const truncated = pathNodes.length > 4;

  return (
    <div className="flex items-center gap-0.5 px-1 py-1 text-[11px] text-muted-foreground overflow-x-auto scrollbar-thin">
      {truncated && <span className="shrink-0">...</span>}
      {visible.map((node, i) => (
        <span key={node!.id} className="flex items-center gap-0.5 shrink-0">
          {(i > 0 || truncated) && <ChevronRight className="h-2.5 w-2.5 opacity-40" />}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(node!.id === selectedId ? null : node!.id);
            }}
            className={`hover:text-accent transition-colors truncate max-w-[80px] ${
              node!.id === selectedId ? "font-medium text-accent" : "hover:underline"
            }`}
            title={`${node!.code} - ${node!.name}`}
          >
            {node!.code}
          </button>
        </span>
      ))}
    </div>
  );
}

export function CategoryTree({ initialCategories }: CategoryTreeProps) {
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [selectedId, setCategory] = useUrlFilter("category");

  // Fetch categories with TanStack Query (with optional hydration)
  const { data: categories = [], isLoading, error } = useCategories(initialCategories);

  // Get ancestors for auto-expansion using cached data (now O(1) with lookup maps)
  const ancestors = useCategoryAncestors(selectedId);
  // Create stable string key for dependency tracking
  const ancestorsKey = ancestors.join(',');

  // Category search
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch] = useDebounceValue(searchInput, 200);

  const { filteredCategories, searchExpandIds } = useMemo(() => {
    if (!debouncedSearch.trim() || categories.length === 0) {
      return { filteredCategories: categories, searchExpandIds: [] as string[] };
    }
    const { filtered, matchAncestorIds } = filterCategories(categories, debouncedSearch);
    return { filteredCategories: filtered, searchExpandIds: matchAncestorIds };
  }, [categories, debouncedSearch]);

  // Track expanded categories - auto-expand to show selected
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Auto-expand when selection changes
  useEffect(() => {
    if (selectedId && ancestors.length > 0) {
      setExpandedIds((prev) => new Set([...prev, ...ancestors]));
    }
  }, [selectedId, ancestorsKey]); // Use stable string key instead of array

  // Auto-expand to show search matches
  useEffect(() => {
    if (searchExpandIds.length > 0) {
      setExpandedIds((prev) => new Set([...prev, ...searchExpandIds]));
    }
  }, [searchExpandIds]);

  const handleSelect = useCallback((id: string | null) => {
    startTransition(() => {
      setCategory(id);
    });
  }, [startTransition, setCategory]);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

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
      <div className="flex items-center justify-center py-8 animate-in fade-in duration-300">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading categories...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center px-4 animate-in fade-in duration-300">
        <FolderTree className="h-8 w-8 text-red-500/40 mb-2 transition-colors" />
        <p className="text-sm text-red-600 font-medium">Failed to load categories</p>
        <p className="text-xs text-muted-foreground mt-1 transition-colors">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    );
  }

  // Empty state
  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center px-4 animate-in fade-in duration-300">
        <FolderTree className="h-8 w-8 text-muted-foreground/40 mb-2 transition-opacity" />
        <p className="text-sm text-muted-foreground font-medium">No categorized products</p>
        <p className="text-xs text-muted-foreground/70 mt-1 transition-colors">
          Products need EMDN categories assigned to enable filtering
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Search input for categories */}
      {categories.length > 5 && (
        <div className="relative px-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search categories..."
            className="w-full pl-8 pr-8 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-colors"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Breadcrumb for deep selected category */}
      {selectedId && (
        <CategoryBreadcrumb selectedId={selectedId} onSelect={handleSelect} />
      )}

      {/* Expand/collapse toggle */}
      <div className="flex items-center justify-between px-1">
        {debouncedSearch && (
          <span className="text-xs text-muted-foreground">
            {filteredCategories.length === 0
              ? "No matches"
              : `${filteredCategories.length} found`}
          </span>
        )}
        <div className="ml-auto">
          <button
            onClick={toggleAllExpanded}
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-all duration-150 px-2 py-1 rounded-md hover:bg-muted/50 hover:shadow-sm active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
          >
            {isAllExpanded ? "Collapse all" : "Expand all"}
          </button>
        </div>
      </div>

      {/* Category tree */}
      <div className="space-y-0.5 max-h-[calc(100vh-400px)] overflow-y-auto scrollbar-thin animate-in fade-in slide-in-from-top-2 duration-300">
        {filteredCategories.map((category) => (
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
