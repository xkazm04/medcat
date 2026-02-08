"use client";

import { memo, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ColumnDef } from "@tanstack/react-table";
import { MoreVertical, ArrowUpDown, ArrowUp, ArrowDown, MessageCircle, Globe } from "lucide-react";
import { DropdownMenu, DropdownMenuItem, DropdownMenuDivider } from "@/components/ui/dropdown-menu";
import { useChatContextOptional } from "@/lib/hooks/use-chat-context";
import { ExpandableCategory } from "./expandable-category";
import { RegulatoryBadges } from "./regulatory-badges";
import { RegulatoryFilter } from "./regulatory-filter";
import { ManufacturerFilter } from "./manufacturer-filter";
import { ChatInsertCell } from "./chat-insert-cell";
import type { ProductWithRelations, EMDNCategory } from "@/lib/types";
import type { ColumnVisibility } from "./column-visibility-toggle";
import { getPriceFormatter } from "@/lib/utils/format-price";

interface ColumnLabels {
  product: string;
  price: string;
  category: string;
  viewDetails: string;
  edit: string;
  delete: string;
  askAI: string;
}

// Memoized cell components for performance
const ProductCell = memo(function ProductCell({
  product,
  showSku,
  showVendor,
  onView,
}: {
  product: ProductWithRelations;
  showSku: boolean;
  showVendor: boolean;
  onView: () => void;
}) {
  return (
    <div className="min-w-0">
      <button
        onClick={onView}
        className="text-sm font-medium text-foreground hover:text-accent transition-colors text-left truncate block max-w-full"
        title={product.name}
      >
        {product.name}
      </button>
      {(showSku || showVendor) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {showSku && product.sku && (
            <span className="font-mono truncate">{product.sku}</span>
          )}
          {showSku && showVendor && product.sku && product.vendor && (
            <span className="text-muted-foreground/40">·</span>
          )}
          {showVendor && product.vendor && (
            <ChatInsertCell
              value={product.vendor.name}
              prefix="Show me products from "
              className="truncate"
            />
          )}
        </div>
      )}
    </div>
  );
});


const ManufacturerCell = memo(function ManufacturerCell({
  name,
}: {
  name: string | null;
}) {
  return (
    <span className="text-sm text-muted-foreground truncate block">
      {name || "—"}
    </span>
  );
});

const PriceCell = memo(function PriceCell({
  price,
  hasRefPrices,
}: {
  price: number | null;
  hasRefPrices: boolean;
}) {
  const locale = useLocale();
  return (
    <div className="text-right">
      {price !== null && price !== undefined ? (
        <span className="text-sm font-medium tabular-nums text-foreground">
          {getPriceFormatter(locale).format(price)}
        </span>
      ) : (
        <span className="text-sm text-muted-foreground/40">—</span>
      )}
      {hasRefPrices && (
        <span className="flex items-center justify-end gap-0.5 mt-0.5">
          <Globe className="h-2.5 w-2.5 text-blue-subtle" />
          <span className="text-[10px] text-blue-subtle font-medium">EU Ref</span>
        </span>
      )}
    </div>
  );
});

// Actions cell with Ask AI integration
const ActionsCell = memo(function ActionsCell({
  product,
  onView,
  onEdit,
  onDelete,
  labels,
}: {
  product: ProductWithRelations;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  labels: { viewDetails: string; edit: string; delete: string; askAI: string };
}) {
  const chatContext = useChatContextOptional();

  return (
    <DropdownMenu
      trigger={
        <div className="p-1 rounded hover:bg-muted transition-colors">
          <MoreVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      }
      align="right"
    >
      <DropdownMenuItem onClick={onView}>
        {labels.viewDetails}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={onEdit}>
        {labels.edit}
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={onDelete}
        className="text-red-600"
      >
        {labels.delete}
      </DropdownMenuItem>
      {chatContext && (
        <>
          <DropdownMenuDivider />
          <DropdownMenuItem
            onClick={() => chatContext.sendMessage(`Tell me about ${product.name}`)}
          >
            <span className="flex items-center gap-2">
              <MessageCircle className="h-3.5 w-3.5 text-accent" />
              {labels.askAI}
            </span>
          </DropdownMenuItem>
        </>
      )}
    </DropdownMenu>
  );
});

/** Check if a product's EMDN category path matches any reference price path (exact or ancestor) */
function hasRefPriceCoverage(productPath: string | null | undefined, refPricePaths: string[]): boolean {
  if (!productPath || refPricePaths.length === 0) return false;
  return refPricePaths.some(rpp => productPath === rpp || productPath.startsWith(rpp + '/'));
}

export function createColumns(
  onViewProduct: (product: ProductWithRelations) => void,
  onEditProduct: (product: ProductWithRelations) => void,
  onDeleteProduct: (product: ProductWithRelations) => void,
  allCategories: EMDNCategory[],
  columnVisibility: ColumnVisibility,
  manufacturers: string[] = [],
  labels: ColumnLabels,
  refPricePaths: string[] = []
): ColumnDef<ProductWithRelations>[] {
  const columns: ColumnDef<ProductWithRelations>[] = [];

  // Selection checkbox column
  columns.push({
    id: "select",
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllPageRowsSelected()}
        onChange={table.getToggleAllPageRowsSelectedHandler()}
        className="h-4 w-4 rounded"
        aria-label="Select all rows"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
        onClick={e => e.stopPropagation()}
        className="h-4 w-4 rounded"
        aria-label="Select row"
      />
    ),
    size: 40,
    minSize: 40,
    maxSize: 40,
    enableResizing: false,
  });

  // Product column (always visible) - includes SKU and Vendor info
  if (columnVisibility.product) {
    columns.push({
      id: "product",
      accessorKey: "name",
      header: ({ column }) => {
        const sorted = column.getIsSorted();
        return (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className={`flex items-center gap-1.5 text-xs uppercase tracking-wide hover:text-foreground transition-colors ${
              sorted ? 'font-semibold text-accent' : 'font-medium text-muted-foreground'
            }`}
          >
            {labels.product}
            {sorted === "asc" ? (
              <ArrowUp className="h-3 w-3" />
            ) : sorted === "desc" ? (
              <ArrowDown className="h-3 w-3" />
            ) : (
              <ArrowUpDown className="h-3 w-3 opacity-50" />
            )}
          </button>
        );
      },
      cell: ({ row }) => (
        <ProductCell
          product={row.original}
          showSku={columnVisibility.sku}
          showVendor={columnVisibility.vendor}
          onView={() => onViewProduct(row.original)}
        />
      ),
      size: 450,
      minSize: 200,
      maxSize: 1200,
      enableResizing: true,
    });
  }

  // Manufacturer column with filter dropdown
  if (columnVisibility.manufacturer) {
    columns.push({
      id: "manufacturer",
      accessorKey: "manufacturer_name",
      header: () => <ManufacturerFilter manufacturers={manufacturers} />,
      cell: ({ row }) => (
        <ManufacturerCell name={row.original.manufacturer_name} />
      ),
      size: 140,
      minSize: 80,
      maxSize: 400,
      enableResizing: true,
    });
  }

  // Price column
  if (columnVisibility.price) {
    columns.push({
      id: "price",
      accessorKey: "price",
      header: ({ column }) => {
        const sorted = column.getIsSorted();
        return (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className={`flex items-center gap-1.5 text-xs uppercase tracking-wide hover:text-foreground transition-colors justify-end w-full ${
              sorted ? 'font-semibold text-accent' : 'font-medium text-muted-foreground'
            }`}
          >
            {labels.price}
            {sorted === "asc" ? (
              <ArrowUp className="h-3 w-3" />
            ) : sorted === "desc" ? (
              <ArrowDown className="h-3 w-3" />
            ) : (
              <ArrowUpDown className="h-3 w-3 opacity-50" />
            )}
          </button>
        );
      },
      cell: ({ row }) => (
        <PriceCell
          price={row.original.price}
          hasRefPrices={hasRefPriceCoverage(row.original.emdn_category?.path, refPricePaths)}
        />
      ),
      size: 110,
      minSize: 80,
      maxSize: 300,
      enableResizing: true,
    });
  }

  // Regulatory column with filter dropdown
  if (columnVisibility.regulatory) {
    columns.push({
      id: "regulatory",
      header: () => <RegulatoryFilter />,
      cell: ({ row }) => (
        <RegulatoryBadges
          ceMarked={row.original.ce_marked}
          mdrClass={row.original.mdr_class}
        />
      ),
      size: 140,
      minSize: 80,
      maxSize: 300,
      enableResizing: true,
    });
  }

  // Category column with expandable hierarchy
  if (columnVisibility.category) {
    columns.push({
      id: "category",
      accessorKey: "emdn_category",
      header: () => (
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
          {labels.category}
        </span>
      ),
      cell: ({ row }) => (
        <ExpandableCategory
          category={row.original.emdn_category}
          allCategories={allCategories}
        />
      ),
      size: 340,
      minSize: 120,
      maxSize: 800,
      enableResizing: true,
    });
  }

  // Actions column (always visible) — includes "Ask AI" option
  columns.push({
    id: "actions",
    header: () => null,
    cell: ({ row }) => (
      <ActionsCell
        product={row.original}
        onView={() => onViewProduct(row.original)}
        onEdit={() => onEditProduct(row.original)}
        onDelete={() => onDeleteProduct(row.original)}
        labels={labels}
      />
    ),
    size: 48,
    minSize: 48,
    maxSize: 48,
    enableResizing: false,
  });

  return columns;
}

// Hook to memoize columns based on dependencies
export function useColumns(
  onViewProduct: (product: ProductWithRelations) => void,
  onEditProduct: (product: ProductWithRelations) => void,
  onDeleteProduct: (product: ProductWithRelations) => void,
  allCategories: EMDNCategory[],
  columnVisibility: ColumnVisibility,
  manufacturers: string[] = [],
  refPricePaths: string[] = []
) {
  const tTable = useTranslations('table');
  const tActions = useTranslations('actions');

  const labels: ColumnLabels = useMemo(() => ({
    product: tTable('product'),
    price: tTable('price'),
    category: tTable('category'),
    viewDetails: tActions('viewDetails'),
    edit: tActions('edit'),
    delete: tActions('delete'),
    askAI: tActions('askAI'),
  }), [tTable, tActions]);

  return useMemo(
    () =>
      createColumns(
        onViewProduct,
        onEditProduct,
        onDeleteProduct,
        allCategories,
        columnVisibility,
        manufacturers,
        labels,
        refPricePaths
      ),
    [onViewProduct, onEditProduct, onDeleteProduct, allCategories, columnVisibility, manufacturers, labels, refPricePaths]
  );
}
