"use client";

import { useState, useEffect, useCallback } from "react";
import type { ColumnSizingState } from "@tanstack/react-table";

const STORAGE_KEY = "medcatalog-column-sizing";

export function useColumnSizing() {
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed === "object" && parsed !== null) {
          setColumnSizing(parsed); // eslint-disable-line react-hooks/set-state-in-effect -- hydrating from localStorage
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Save to localStorage on change
  const updateColumnSizing = useCallback(
    (
      updaterOrValue:
        | ColumnSizingState
        | ((prev: ColumnSizingState) => ColumnSizingState)
    ) => {
      setColumnSizing((prev) => {
        const next =
          typeof updaterOrValue === "function"
            ? updaterOrValue(prev)
            : updaterOrValue;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignore
        }
        return next;
      });
    },
    []
  );

  // Reset to defaults (clear persisted widths)
  const resetColumnSizing = useCallback(() => {
    setColumnSizing({});
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  return { columnSizing, setColumnSizing: updateColumnSizing, resetColumnSizing };
}
