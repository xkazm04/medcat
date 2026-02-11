'use client';

import { useState, useEffect, useRef, useCallback, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Moon, Sun, Languages, FilterX, MessageSquare, Clock, X, ArrowRight, FolderTree } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useDebounceValue } from 'usehooks-ts';
import { useChatContextOptional } from '@/lib/hooks/use-chat-context';
import { useCategoryLookups } from '@/lib/query/hooks';
import { getRecentSearches, addRecentSearch } from '@/lib/utils/recent-searches';
import { matchCategories, type CategoryMatch } from '@/components/filters/search-suggestions';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  category: 'action' | 'recent' | 'emdn';
  onSelect: () => void;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery] = useDebounceValue(query, 200);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('commandPalette');
  const chatContext = useChatContextOptional();

  // Open on Cmd/Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      // Also open on 'c' for chat (when not in input)
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (e.key === 'c' && !e.metaKey && !e.ctrlKey) {
        chatContext?.openChat();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [chatContext]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
  }, []);

  // Build action items
  const actions: CommandItem[] = [];

  actions.push({
    id: 'toggle-dark',
    label: t('toggleDarkMode'),
    icon: <Moon className="h-4 w-4" />,
    category: 'action',
    onSelect: () => {
      document.documentElement.classList.toggle('dark');
      const isDark = document.documentElement.classList.contains('dark');
      try { localStorage.setItem('theme', isDark ? 'dark' : 'light'); } catch {}
      close();
    },
  });

  actions.push({
    id: 'open-chat',
    label: t('openChat'),
    icon: <MessageSquare className="h-4 w-4" />,
    category: 'action',
    onSelect: () => { chatContext?.openChat(); close(); },
  });

  actions.push({
    id: 'clear-filters',
    label: t('clearFilters'),
    icon: <FilterX className="h-4 w-4" />,
    category: 'action',
    onSelect: () => {
      const params = new URLSearchParams();
      const sortBy = searchParams.get('sortBy');
      const sortOrder = searchParams.get('sortOrder');
      if (sortBy) params.set('sortBy', sortBy);
      if (sortOrder) params.set('sortOrder', sortOrder);
      startTransition(() => { router.push(`?${params.toString()}`); });
      close();
    },
  });

  // Recent searches
  const recentItems: CommandItem[] = getRecentSearches()
    .filter(s => !debouncedQuery || s.toLowerCase().includes(debouncedQuery.toLowerCase()))
    .map(s => ({
      id: `recent-${s}`,
      label: s,
      icon: <Clock className="h-4 w-4" />,
      category: 'recent' as const,
      onSelect: () => {
        addRecentSearch(s);
        const params = new URLSearchParams(searchParams.toString());
        params.set('search', s);
        params.set('page', '1');
        startTransition(() => { router.push(`?${params.toString()}`); });
        close();
      },
    }));

  // Category matches from EMDN tree
  const { byCode, byId } = useCategoryLookups();
  const categoryItems: CommandItem[] = debouncedQuery
    ? matchCategories(debouncedQuery, byCode, byId, 5).map(cat => ({
        id: `cat-${cat.id}`,
        label: `${cat.code} - ${cat.name}`,
        description: cat.productCount > 0 ? `${cat.productCount} products` : undefined,
        icon: <FolderTree className="h-4 w-4" />,
        category: 'emdn' as const,
        onSelect: () => {
          const params = new URLSearchParams(searchParams.toString());
          params.set('category', cat.id);
          params.delete('search');
          params.set('page', '1');
          startTransition(() => { router.push(`?${params.toString()}`); });
          close();
        },
      }))
    : [];

  // Filter actions by query
  const filteredActions = debouncedQuery
    ? actions.filter(a => a.label.toLowerCase().includes(debouncedQuery.toLowerCase()))
    : actions;

  const allItems = [
    ...filteredActions,
    ...categoryItems,
    ...recentItems,
  ];

  // Handle search submission
  const handleSearch = () => {
    if (query.trim()) {
      addRecentSearch(query.trim());
      const params = new URLSearchParams(searchParams.toString());
      params.set('search', query.trim());
      params.set('page', '1');
      startTransition(() => { router.push(`?${params.toString()}`); });
      close();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, allItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        allItems[selectedIndex].onSelect();
      } else {
        handleSearch();
      }
    } else if (e.key === 'Escape') {
      close();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-foreground/40"
            onClick={close}
          />
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 z-[91] w-[520px] max-w-[90vw] bg-background border border-border rounded-xl shadow-lg overflow-hidden"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search className="h-5 w-5 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
                onKeyDown={handleKeyDown}
                placeholder={t('placeholder')}
                className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
              />
              <kbd className="hidden sm:inline px-2 py-0.5 text-xs font-mono bg-muted border border-border rounded">Esc</kbd>
            </div>

            {/* Results */}
            <div className="max-h-[300px] overflow-y-auto py-2">
              {allItems.length === 0 && debouncedQuery ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {t('noResults')}
                  <div className="mt-2">
                    <button
                      onClick={handleSearch}
                      className="text-accent hover:underline inline-flex items-center gap-1"
                    >
                      Search catalog for &quot;{query}&quot; <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Actions */}
                  {filteredActions.length > 0 && (
                    <>
                      <div className="px-4 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {t('actions')}
                      </div>
                      {filteredActions.map((item, idx) => (
                        <button
                          key={item.id}
                          onClick={item.onSelect}
                          className={`flex items-center gap-3 w-full px-4 py-2 text-sm text-left transition-colors ${
                            selectedIndex === idx ? 'bg-accent/10 text-accent' : 'hover:bg-muted'
                          }`}
                        >
                          <span className="text-muted-foreground">{item.icon}</span>
                          {item.label}
                        </button>
                      ))}
                    </>
                  )}

                  {/* Categories */}
                  {categoryItems.length > 0 && (
                    <>
                      <div className="px-4 py-1 mt-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Categories
                      </div>
                      {categoryItems.map((item, idx) => (
                        <button
                          key={item.id}
                          onClick={item.onSelect}
                          className={`flex items-center gap-3 w-full px-4 py-2 text-sm text-left transition-colors ${
                            selectedIndex === filteredActions.length + idx ? 'bg-accent/10 text-accent' : 'hover:bg-muted'
                          }`}
                        >
                          <span className="text-muted-foreground">{item.icon}</span>
                          <span className="truncate">{item.label}</span>
                          {item.description && (
                            <span className="ml-auto text-xs text-muted-foreground shrink-0">{item.description}</span>
                          )}
                        </button>
                      ))}
                    </>
                  )}

                  {/* Recent */}
                  {recentItems.length > 0 && (
                    <>
                      <div className="px-4 py-1 mt-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {t('recent')}
                      </div>
                      {recentItems.map((item, idx) => (
                        <button
                          key={item.id}
                          onClick={item.onSelect}
                          className={`flex items-center gap-3 w-full px-4 py-2 text-sm text-left transition-colors ${
                            selectedIndex === filteredActions.length + categoryItems.length + idx ? 'bg-accent/10 text-accent' : 'hover:bg-muted'
                          }`}
                        >
                          <span className="text-muted-foreground">{item.icon}</span>
                          {item.label}
                        </button>
                      ))}
                    </>
                  )}

                  {/* Search hint */}
                  {query.trim() && (
                    <div className="px-4 py-2 border-t border-border mt-1">
                      <button
                        onClick={handleSearch}
                        className="flex items-center gap-2 text-sm text-accent hover:underline"
                      >
                        <Search className="h-3.5 w-3.5" />
                        Search catalog for &quot;{query}&quot;
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
