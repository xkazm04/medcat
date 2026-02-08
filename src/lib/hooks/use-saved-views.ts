import { useState, useEffect, useCallback } from 'react';

export interface SavedView {
  id: string;
  name: string;
  params: string; // URL search params string
  createdAt: number;
}

const STORAGE_KEY = 'medcatalog-saved-views';
const MAX_VIEWS = 20;

function loadViews(): SavedView[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function persistViews(views: SavedView[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
  } catch {
    // localStorage unavailable
  }
}

export function useSavedViews() {
  const [views, setViews] = useState<SavedView[]>([]);

  useEffect(() => {
    setViews(loadViews());
  }, []);

  const saveView = useCallback((name: string, params: string) => {
    setViews(prev => {
      if (prev.length >= MAX_VIEWS) return prev; // Enforce limit
      const newView: SavedView = {
        id: crypto.randomUUID(),
        name,
        params,
        createdAt: Date.now(),
      };
      const next = [newView, ...prev];
      persistViews(next);
      return next;
    });
  }, []);

  const deleteView = useCallback((id: string) => {
    setViews(prev => {
      const next = prev.filter(v => v.id !== id);
      persistViews(next);
      return next;
    });
  }, []);

  const renameView = useCallback((id: string, newName: string) => {
    setViews(prev => {
      const next = prev.map(v => v.id === id ? { ...v, name: newName } : v);
      persistViews(next);
      return next;
    });
  }, []);

  return { views, saveView, deleteView, renameView, isFull: views.length >= MAX_VIEWS };
}
