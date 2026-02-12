"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useDebounceValue } from "usehooks-ts";
import { Search, X, Loader2 } from "lucide-react";
import { useUrlFilter } from "@/lib/hooks/use-url-filter";
import { useChatContextOptional } from "@/lib/hooks/use-chat-context";
import { addRecentSearch } from "@/lib/utils/recent-searches";
import { SearchSuggestions, useSuggestionCount } from "./search-suggestions";

export function SearchInput() {
  const t = useTranslations('filters');
  const tCommon = useTranslations('common');
  const searchParams = useSearchParams();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentSearch, setSearch] = useUrlFilter("search");
  const [, setCategory] = useUrlFilter("category");
  const [value, setValue] = useState(currentSearch);
  const [debouncedValue] = useDebounceValue(value, 300);
  const [isSearching, setIsSearching] = useState(false);
  const isInitialMount = useRef(true);
  const [isPending, startTransition] = useTransition();
  const chatContext = useChatContextOptional();

  // Suggestion dropdown state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggIndex, setSelectedSuggIndex] = useState(0);
  const suggestionCount = useSuggestionCount(value);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (currentSearch === debouncedValue) {
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setSearch(debouncedValue || null);

    // Reset loading after navigation
    const timeout = setTimeout(() => setIsSearching(false), 500);
    return () => clearTimeout(timeout);
  }, [debouncedValue, currentSearch, setSearch]);

  const handleClear = () => {
    setValue("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    if (value && value.length >= 2) {
      setShowSuggestions(true);
      setSelectedSuggIndex(0);
    }
  };

  const handleBlur = () => {
    // Delay to allow click on suggestion items
    blurTimeoutRef.current = setTimeout(() => setShowSuggestions(false), 200);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    if (newValue.length >= 2) {
      setShowSuggestions(true);
      setSelectedSuggIndex(0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectCategory = useCallback((categoryId: string) => {
    setShowSuggestions(false);
    setValue("");
    startTransition(() => {
      setCategory(categoryId);
    });
  }, [startTransition, setCategory]);

  const handleSelectRecent = useCallback((search: string) => {
    setShowSuggestions(false);
    setValue(search);
    addRecentSearch(search);
    startTransition(() => {
      setSearch(search);
    });
  }, [startTransition, setSearch]);

  const handleSearchCatalog = useCallback(() => {
    setShowSuggestions(false);
    if (value.trim()) {
      addRecentSearch(value.trim());
    }
  }, [value]);

  const handleAskAI = useCallback(() => {
    setShowSuggestions(false);
    if (value.trim() && chatContext) {
      chatContext.sendMessage(value.trim());
    }
  }, [value, chatContext]);

  // Keyboard shortcut: Cmd/Ctrl + K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      // Escape to clear and blur
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        if (showSuggestions) {
          setShowSuggestions(false);
        } else if (value) {
          handleClear();
        } else {
          inputRef.current?.blur();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [value, showSuggestions]);

  // Handle keyboard navigation in suggestions
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestionCount === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedSuggIndex((prev) => Math.min(prev + 1, suggestionCount - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSuggIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && showSuggestions) {
      // Let the suggestion component handle the selection via index
      // For now, just close suggestions and let default search behavior work
      setShowSuggestions(false);
    }
  };

  // Cleanup blur timeout
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  return (
    <div className="relative group">
      {/* Search icon or loading spinner */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2">
        {isSearching ? (
          <Loader2 className="h-4 w-4 text-accent animate-spin" />
        ) : (
          <Search className="h-4 w-4 text-muted-foreground group-focus-within:text-accent transition-colors" />
        )}
      </div>

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleInputKeyDown}
        placeholder={t('search')}
        data-testid="search-input"
        className="w-full pl-9 pr-20 py-1.5 text-sm border border-border rounded-md bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
      />

      {/* Clear button and keyboard hint */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {value && (
          <button
            onClick={handleClear}
            className="p-1 rounded hover:bg-muted transition-colors"
            aria-label={tCommon('clear')}
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted rounded border border-border">
          <span className="text-xs">⌘</span>K
        </kbd>
      </div>

      {/* Suggestion dropdown */}
      <SearchSuggestions
        query={value}
        visible={showSuggestions}
        onSelectCategory={handleSelectCategory}
        onSelectRecent={handleSelectRecent}
        onSearchCatalog={handleSearchCatalog}
        onAskAI={handleAskAI}
        onClose={() => setShowSuggestions(false)}
        selectedIndex={selectedSuggIndex}
        totalItems={suggestionCount}
      />
    </div>
  );
}
