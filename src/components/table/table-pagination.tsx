"use client";

import { useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function TablePagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
}: TablePaginationProps) {
  const t = useTranslations("table");
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefetchTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  const prefetchPage = useCallback(
    (page: number) => {
      if (page < 1 || page > totalPages) return;
      if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current);
      prefetchTimerRef.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", String(page));
        router.prefetch(`?${params.toString()}`);
      }, 200);
    },
    [router, searchParams, totalPages]
  );

  const cancelPrefetch = useCallback(() => {
    if (prefetchTimerRef.current) {
      clearTimeout(prefetchTimerRef.current);
      prefetchTimerRef.current = null;
    }
  }, []);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
      <div className="text-sm text-muted-foreground">
        {t("showingRange", { start: startItem, end: endItem, total: totalCount })}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          onMouseEnter={() => prefetchPage(currentPage - 1)}
          onMouseLeave={cancelPrefetch}
          disabled={currentPage <= 1}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md border border-border bg-background hover:bg-muted hover:border-green-border disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("pagination.previous")}
        </button>
        <span className="text-sm text-muted-foreground px-3 py-1 bg-green-light/50 rounded-md border border-green-border/50">
          {t("pagination.pageInfo", { current: currentPage, total: totalPages })}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          onMouseEnter={() => prefetchPage(currentPage + 1)}
          onMouseLeave={cancelPrefetch}
          disabled={currentPage >= totalPages}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md border border-border bg-background hover:bg-muted hover:border-green-border disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {t("pagination.next")}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
