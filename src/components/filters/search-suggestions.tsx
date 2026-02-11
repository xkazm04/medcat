"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { FolderTree, Clock, Search, MessageSquare } from "lucide-react";
import { useCategoryLookups } from "@/lib/query/hooks";
import { useChatContextOptional } from "@/lib/hooks/use-chat-context";
import { getRecentSearches } from "@/lib/utils/recent-searches";
import type { CategoryNode } from "@/lib/queries";

export interface CategoryMatch {
  id: string;
  code: string;
  name: string;
  productCount: number;
}

/** Match categories by EMDN code prefix or name substring */
export function matchCategories(
  query: string,
  byCode: Map<string, CategoryNode>,
  byId: Map<string, CategoryNode>,
  max: number = 5
): CategoryMatch[] {
  if (!query || query.length < 2) return [];

  const lower = query.toLowerCase();
  const isCodePattern = /^p\d{2,}/i.test(query);
  const results: CategoryMatch[] = [];

  if (isCodePattern) {
    // EMDN code prefix match — startsWith on code
    const upperQuery = query.toUpperCase();
    for (const [code, node] of byCode) {
      if (code.toUpperCase().startsWith(upperQuery)) {
        results.push({ id: node.id, code: node.code, name: node.name, productCount: node.productCount });
        if (results.length >= max) break;
      }
    }
  } else {
    // Text match on name/name_cs, sorted by productCount
    const matches: CategoryMatch[] = [];
    for (const [, node] of byId) {
      const nameMatch = node.name.toLowerCase().includes(lower) ||
        (node.name_cs && node.name_cs.toLowerCase().includes(lower));
      if (nameMatch) {
        matches.push({ id: node.id, code: node.code, name: node.name, productCount: node.productCount });
      }
    }
    matches.sort((a, b) => b.productCount - a.productCount);
    return matches.slice(0, max);
  }

  return results;
}

interface SearchSuggestionsProps {
  query: string;
  visible: boolean;
  onSelectCategory: (categoryId: string) => void;
  onSelectRecent: (search: string) => void;
  onSearchCatalog: () => void;
  onAskAI: () => void;
  onClose: () => void;
  selectedIndex: number;
  totalItems: number;
}

export function SearchSuggestions({
  query,
  visible,
  onSelectCategory,
  onSelectRecent,
  onSearchCatalog,
  onAskAI,
  onClose,
  selectedIndex,
  totalItems,
}: SearchSuggestionsProps) {
  const t = useTranslations("searchSuggestions");
  const { byCode, byId } = useCategoryLookups();
  const chatContext = useChatContextOptional();

  if (!visible || query.length < 2) return null;

  const categoryMatches = matchCategories(query, byCode, byId, 5);
  const recentSearches = getRecentSearches()
    .filter(s => s.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5);

  if (categoryMatches.length === 0 && recentSearches.length === 0) return null;

  let itemIndex = 0;

  return (
    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden">
      {/* Category matches */}
      {categoryMatches.length > 0 && (
        <>
          <div className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            {t("categories")}
          </div>
          {categoryMatches.map((cat) => {
            const idx = itemIndex++;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`flex items-center gap-2.5 w-full px-3 py-1.5 text-sm text-left transition-colors ${
                  selectedIndex === idx ? "bg-accent/10 text-accent" : "hover:bg-muted"
                }`}
              >
                <FolderTree className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-mono text-xs text-muted-foreground shrink-0">{cat.code}</span>
                <span className="truncate">{cat.name}</span>
                {cat.productCount > 0 && (
                  <span className="ml-auto text-xs text-muted-foreground shrink-0">
                    {cat.productCount}
                  </span>
                )}
              </button>
            );
          })}
        </>
      )}

      {/* Recent searches */}
      {recentSearches.length > 0 && (
        <>
          <div className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            {t("recentSearches")}
          </div>
          {recentSearches.map((search) => {
            const idx = itemIndex++;
            return (
              <button
                key={`recent-${search}`}
                onClick={() => onSelectRecent(search)}
                className={`flex items-center gap-2.5 w-full px-3 py-1.5 text-sm text-left transition-colors ${
                  selectedIndex === idx ? "bg-accent/10 text-accent" : "hover:bg-muted"
                }`}
              >
                <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{search}</span>
              </button>
            );
          })}
        </>
      )}

      {/* Quick actions */}
      <div className="border-t border-border px-3 py-1.5 flex gap-2">
        <button
          onClick={onSearchCatalog}
          className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors ${
            selectedIndex === itemIndex ? "bg-accent/10 text-accent" : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Search className="h-3 w-3" />
          {t("searchCatalog", { query })}
        </button>
        {chatContext && (
          <button
            onClick={onAskAI}
            className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors ${
              selectedIndex === itemIndex + 1 ? "bg-accent/10 text-accent" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <MessageSquare className="h-3 w-3" />
            {t("askAI", { query })}
          </button>
        )}
      </div>
    </div>
  );
}

/** Hook to compute total suggestion items for keyboard navigation */
export function useSuggestionCount(query: string): number {
  const { byCode, byId } = useCategoryLookups();
  const chatContext = useChatContextOptional();

  if (!query || query.length < 2) return 0;

  const categoryMatches = matchCategories(query, byCode, byId, 5);
  const recentSearches = getRecentSearches()
    .filter(s => s.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5);

  // categories + recent + "search catalog" + (optional "ask AI")
  return categoryMatches.length + recentSearches.length + 1 + (chatContext ? 1 : 0);
}
