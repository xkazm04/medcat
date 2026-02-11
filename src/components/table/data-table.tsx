"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  Row,
  RowSelectionState,
  ColumnSizingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useState, useCallback, useRef, useMemo, useTransition, useEffect } from "react";
import { useTranslations } from "next-intl";
// Removed motion for performance - row animations caused jank with virtual scrolling
import { PackageX, SearchX, FilterX } from "lucide-react";
import { TablePagination } from "./table-pagination";
import {
  ColumnVisibilityToggle,
  useColumnVisibility,
  type ColumnVisibility,
} from "./column-visibility-toggle";
import { ExportMenu } from "./export-menu";
import { ImportMenu } from "./import-menu";
import { BulkActionsBar } from "./bulk-actions-bar";
import { SearchInput } from "@/components/filters/search-input";
import type { ProductWithRelations } from "@/lib/types";
import type { ExportFilters } from "@/lib/actions/export";

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  pageCount: number;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  columnVisibility: ColumnVisibility;
  onColumnVisibilityChange: (visibility: ColumnVisibility) => void;
  columnSizing?: ColumnSizingState;
  onColumnSizingChange?: (updater: ColumnSizingState | ((prev: ColumnSizingState) => ColumnSizingState)) => void;
  onResetColumnSizing?: () => void;
}

// Row height for virtual scrolling calculations
const ROW_HEIGHT = 52;

export function DataTable<TData>({
  columns,
  data,
  pageCount,
  totalCount,
  currentPage,
  pageSize,
  columnVisibility,
  onColumnVisibilityChange,
  columnSizing: columnSizingProp,
  onColumnSizingChange,
  onResetColumnSizing,
}: DataTableProps<TData>) {
  const t = useTranslations("table");
  const router = useRouter();
  const searchParams = useSearchParams();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();

  // Derive sorting state from URL
  const sortBy = searchParams.get("sortBy") || "name";
  const sortOrder = searchParams.get("sortOrder") || "asc";
  const [sorting, setSorting] = useState<SortingState>([
    { id: sortBy, desc: sortOrder === "desc" },
  ]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const updateURL = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      // Use startTransition to keep UI responsive during navigation
      startTransition(() => {
        router.push(`?${params.toString()}`);
      });
    },
    [router, searchParams, startTransition]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount,
    enableRowSelection: true,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    state: {
      sorting,
      rowSelection,
      columnSizing: columnSizingProp ?? {},
      pagination: {
        pageIndex: currentPage - 1,
        pageSize,
      },
    },
    onRowSelectionChange: setRowSelection,
    onColumnSizingChange: onColumnSizingChange as never,
    onSortingChange: (updater) => {
      const newSorting = typeof updater === "function" ? updater(sorting) : updater;
      setSorting(newSorting);
      if (newSorting.length > 0) {
        updateURL({
          sortBy: newSorting[0].id,
          sortOrder: newSorting[0].desc ? "desc" : "asc",
          page: "1",
        });
      }
    },
  });

  const { rows } = table.getRowModel();
  const isResizing = !!table.getState().columnSizingInfo.isResizingColumn;

  // Apply col-resize cursor to body during drag for consistent UX
  useEffect(() => {
    if (isResizing) {
      document.body.classList.add('col-resizing');
    } else {
      document.body.classList.remove('col-resizing');
    }
    return () => document.body.classList.remove('col-resizing');
  }, [isResizing]);

  // Compute selected products for bulk actions
  const selectedProducts = useMemo(() => {
    return Object.keys(rowSelection)
      .map(idx => data[parseInt(idx)] as unknown as ProductWithRelations)
      .filter(Boolean);
  }, [rowSelection, data]);

  const clearSelection = useCallback(() => setRowSelection({}), []);

  // Virtual scrolling for performance with large datasets
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12, // Render 12 extra rows above/below viewport for smoother scrolling
  });

  const virtualRows = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  // Calculate padding for virtual scroll
  const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start || 0 : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - (virtualRows[virtualRows.length - 1]?.end || 0)
      : 0;

  const handlePageChange = useCallback(
    (newPage: number) => {
      updateURL({ page: String(newPage) });
      // Scroll to top when page changes
      tableContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    },
    [updateURL]
  );

  // Check if any filters are active (for contextual empty state + export)
  const hasActiveFilters = useMemo(() => {
    const filterKeys = ['search', 'vendor', 'category', 'material', 'ceMarked', 'mdrClass', 'manufacturer', 'minPrice', 'maxPrice'];
    return filterKeys.some(key => searchParams.has(key));
  }, [searchParams]);

  // Build export filters from URL search params
  const exportFilters = useMemo((): ExportFilters => {
    const f: ExportFilters = {};
    const s = searchParams.get('search');
    const v = searchParams.get('vendor');
    const c = searchParams.get('category');
    const mat = searchParams.get('material');
    const ce = searchParams.get('ceMarked');
    const mdr = searchParams.get('mdrClass');
    const mfr = searchParams.get('manufacturer');
    const minP = searchParams.get('minPrice');
    const maxP = searchParams.get('maxPrice');
    if (s) f.search = s;
    if (v) f.vendor = v;
    if (c) f.category = c;
    if (mat) f.material = mat;
    if (ce) f.ceMarked = ce;
    if (mdr) f.mdrClass = mdr;
    if (mfr) f.manufacturer = mfr;
    if (minP) f.minPrice = Number(minP);
    if (maxP) f.maxPrice = Number(maxP);
    return f;
  }, [searchParams]);

  const handleClearFilters = useCallback(() => {
    const params = new URLSearchParams();
    // Preserve sort settings only
    const sortByParam = searchParams.get('sortBy');
    const sortOrderParam = searchParams.get('sortOrder');
    if (sortByParam) params.set('sortBy', sortByParam);
    if (sortOrderParam) params.set('sortOrder', sortOrderParam);
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  }, [router, searchParams, startTransition]);

  // Keyboard navigation for table rows
  const [focusedRowIndex, setFocusedRowIndex] = useState(-1);

  const handleTableKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (rows.length === 0) return;
    if (e.key === 'ArrowDown' || e.key === 'j') {
      e.preventDefault();
      setFocusedRowIndex(prev => Math.min(prev + 1, rows.length - 1));
    } else if (e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault();
      setFocusedRowIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && focusedRowIndex >= 0) {
      e.preventDefault();
      const row = rows[focusedRowIndex];
      if (row) {
        const firstCell = row.getVisibleCells()[0];
        if (firstCell) {
          const btn = document.querySelector(`[data-index="${focusedRowIndex}"] button`) as HTMLButtonElement;
          btn?.click();
        }
      }
    }
  }, [rows, focusedRowIndex]);

  // Scroll focused row into view
  useEffect(() => {
    if (focusedRowIndex >= 0) {
      virtualizer.scrollToIndex(focusedRowIndex, { align: 'auto' });
      const rowEl = tableContainerRef.current?.querySelector(`[data-index="${focusedRowIndex}"]`) as HTMLElement;
      rowEl?.focus();
    }
  }, [focusedRowIndex, virtualizer]);

  if (data.length === 0) {
    return (
      <div className="space-y-3">
        {/* Header with search and column toggle */}
        <div className="flex items-center gap-3">
          <div className="w-[32rem] max-w-full">
            <SearchInput />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <ColumnVisibilityToggle
              visibility={columnVisibility}
              onChange={onColumnVisibilityChange}
              onResetColumnSizing={onResetColumnSizing}
            />
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-24 text-center bg-background border border-border/60 rounded-lg shadow-md">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 ${
            hasActiveFilters ? 'bg-amber-50 border border-amber-200' : 'bg-muted'
          }`}>
            {hasActiveFilters ? (
              <SearchX className="h-7 w-7 text-amber-600" />
            ) : (
              <PackageX className="h-7 w-7 text-muted-foreground" />
            )}
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {hasActiveFilters ? t("noProductsFound") : t("noProductsYet")}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-5">
            {hasActiveFilters ? t("adjustFilters") : t("addFirstProduct")}
          </p>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-accent border border-accent/30 rounded-md hover:bg-green-light/50 transition-colors"
            >
              <FilterX className="h-4 w-4" />
              {t("clearFilters")}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with search, total count, export, and column toggle */}
      <div className="flex items-center gap-3">
        <div className="w-[32rem] max-w-full">
          <SearchInput />
        </div>
        <div className="text-sm text-muted-foreground">
          {t("showingTotal", { count: data.length, total: totalCount.toLocaleString() })}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <ImportMenu />
          <ExportMenu
            products={data as unknown as ProductWithRelations[]}
            selectedProducts={selectedProducts}
            columnVisibility={columnVisibility}
            totalCount={totalCount}
            filteredCount={totalCount}
            filters={exportFilters}
            hasActiveFilters={hasActiveFilters}
          />
          <ColumnVisibilityToggle
            visibility={columnVisibility}
            onChange={onColumnVisibilityChange}
            onResetColumnSizing={onResetColumnSizing}
          />
        </div>
      </div>

      {/* Table container */}
      <div className="flex flex-col bg-background border border-border/60 rounded-lg shadow-md overflow-hidden ring-1 ring-green-border/20">
        {/* Scrollable table area with virtual scrolling */}
        <div
          ref={tableContainerRef}
          className="overflow-auto"
          style={{ maxHeight: "calc(100vh - 320px)", minHeight: "400px" }}
        >
          <table className={`w-full table-fixed ${isResizing ? 'select-none' : ''}`} role="grid" aria-rowcount={totalCount} onKeyDown={handleTableKeyDown}>
            <thead className="sticky top-0 z-10 bg-table-header border-b-2 border-green-border table-header-depth">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left first:pl-4 last:pr-4 relative"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      {header.column.getCanResize() && (
                        <div
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          className="absolute right-0 top-0 h-full w-[8px] cursor-col-resize flex items-center justify-center select-none touch-none group/resize z-10"
                        >
                          <div
                            className={`w-[2px] rounded-full transition-all duration-150 ${
                              header.column.getIsResizing()
                                ? 'h-full bg-accent'
                                : 'h-4 bg-border/50 group-hover/resize:bg-border group-hover/resize:h-6'
                            }`}
                          />
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border">
              {/* Top padding for virtual scroll */}
              {paddingTop > 0 && (
                <tr>
                  <td style={{ height: `${paddingTop}px` }} colSpan={columns.length} />
                </tr>
              )}

              {/* Virtualized rows - no animation for performance */}
              {virtualRows.map((virtualRow) => {
                const row = rows[virtualRow.index] as Row<TData>;

                return (
                  <tr
                    key={row.id}
                    data-index={virtualRow.index}
                    tabIndex={0}
                    className={`group table-row-hover transition-colors duration-150 hover:bg-green-light/30 focus:bg-green-light/40 focus:outline-none ${
                      virtualRow.index % 2 === 1 ? 'bg-table-row-alt/30' : ''
                    } ${focusedRowIndex === virtualRow.index ? 'ring-2 ring-accent/40 ring-inset' : ''}`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-4 py-3 first:pl-4 last:pr-4 align-top"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })}

              {/* Bottom padding for virtual scroll */}
              {paddingBottom > 0 && (
                <tr>
                  <td style={{ height: `${paddingBottom}px` }} colSpan={columns.length} />
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <TablePagination
          currentPage={currentPage}
          totalPages={pageCount}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={handlePageChange}
        />
      </div>

      {/* Bulk actions bar */}
      <BulkActionsBar
        selectedProducts={selectedProducts}
        columnVisibility={columnVisibility}
        onClear={clearSelection}
      />
    </div>
  );
}

// Export hook for external use
export { useColumnVisibility };
