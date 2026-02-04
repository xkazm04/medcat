"use client";

import { memo, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { MoreVertical, ArrowUpDown } from "lucide-react";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ExpandableCategory } from "./expandable-category";
import { RegulatoryBadges } from "./regulatory-badges";
import { RegulatoryFilter } from "./regulatory-filter";
import type { ProductWithRelations, EMDNCategory } from "@/lib/types";
import type { ColumnVisibility } from "./column-visibility-toggle";

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
            <span className="truncate">{product.vendor.name}</span>
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

const PriceCell = memo(function PriceCell({ price }: { price: number | null }) {
  if (price === null || price === undefined) {
    return <span className="text-sm text-muted-foreground/40 text-right block">—</span>;
  }
  const formatted = new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
  return (
    <span className="text-sm font-medium tabular-nums text-right block text-foreground">
      {formatted}
    </span>
  );
});

export function createColumns(
  onViewProduct: (product: ProductWithRelations) => void,
  onEditProduct: (product: ProductWithRelations) => void,
  onDeleteProduct: (product: ProductWithRelations) => void,
  allCategories: EMDNCategory[],
  columnVisibility: ColumnVisibility
): ColumnDef<ProductWithRelations>[] {
  const columns: ColumnDef<ProductWithRelations>[] = [];

  // Product column (always visible) - includes SKU and Vendor info
  if (columnVisibility.product) {
    columns.push({
      id: "product",
      accessorKey: "name",
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wide hover:text-foreground transition-colors"
        >
          Product
          <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => (
        <ProductCell
          product={row.original}
          showSku={columnVisibility.sku}
          showVendor={columnVisibility.vendor}
          onView={() => onViewProduct(row.original)}
        />
      ),
      size: 260,
    });
  }

  // Manufacturer column
  if (columnVisibility.manufacturer) {
    columns.push({
      id: "manufacturer",
      accessorKey: "manufacturer_name",
      header: () => (
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
          Manufacturer
        </span>
      ),
      cell: ({ row }) => (
        <ManufacturerCell name={row.original.manufacturer_name} />
      ),
      size: 120,
    });
  }

  // Price column
  if (columnVisibility.price) {
    columns.push({
      id: "price",
      accessorKey: "price",
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wide hover:text-foreground transition-colors justify-end w-full"
        >
          Price
          <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => <PriceCell price={row.original.price} />,
      size: 70,
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
      size: 110,
    });
  }

  // Category column with expandable hierarchy
  if (columnVisibility.category) {
    columns.push({
      id: "category",
      accessorKey: "emdn_category",
      header: () => (
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
          Category
        </span>
      ),
      cell: ({ row }) => (
        <ExpandableCategory
          category={row.original.emdn_category}
          allCategories={allCategories}
        />
      ),
      size: 330,
    });
  }

  // Actions column (always visible)
  columns.push({
    id: "actions",
    header: () => null,
    cell: ({ row }) => (
      <DropdownMenu
        trigger={
          <div className="p-1 rounded hover:bg-muted transition-colors">
            <MoreVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        }
        align="right"
      >
        <DropdownMenuItem onClick={() => onViewProduct(row.original)}>
          View details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEditProduct(row.original)}>
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onDeleteProduct(row.original)}
          className="text-red-600"
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenu>
    ),
    size: 48,
  });

  return columns;
}

// Hook to memoize columns based on dependencies
export function useColumns(
  onViewProduct: (product: ProductWithRelations) => void,
  onEditProduct: (product: ProductWithRelations) => void,
  onDeleteProduct: (product: ProductWithRelations) => void,
  allCategories: EMDNCategory[],
  columnVisibility: ColumnVisibility
) {
  return useMemo(
    () =>
      createColumns(
        onViewProduct,
        onEditProduct,
        onDeleteProduct,
        allCategories,
        columnVisibility
      ),
    [onViewProduct, onEditProduct, onDeleteProduct, allCategories, columnVisibility]
  );
}
