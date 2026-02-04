"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebounceValue } from "usehooks-ts";
import { Search, X, Loader2 } from "lucide-react";

export function SearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(searchParams.get("search") || "");
  const [debouncedValue] = useDebounceValue(value, 300);
  const [isSearching, setIsSearching] = useState(false);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    const currentSearch = params.get("search") || "";

    if (currentSearch === debouncedValue) {
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    if (debouncedValue) {
      params.set("search", debouncedValue);
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`);

    // Reset loading after navigation
    const timeout = setTimeout(() => setIsSearching(false), 500);
    return () => clearTimeout(timeout);
  }, [debouncedValue, router, searchParams]);

  const handleClear = () => {
    setValue("");
    inputRef.current?.focus();
  };

  // Keyboard shortcut: Cmd/Ctrl + K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      // Escape to clear and blur
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        if (value) {
          handleClear();
        } else {
          inputRef.current?.blur();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [value]);

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
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search products..."
        className="w-full pl-9 pr-20 py-2.5 text-sm border border-border rounded-lg bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
      />

      {/* Clear button and keyboard hint */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {value && (
          <button
            onClick={handleClear}
            className="p-1 rounded hover:bg-muted transition-colors"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted rounded border border-border">
          <span className="text-xs">⌘</span>K
        </kbd>
      </div>
    </div>
  );
}
