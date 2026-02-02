'use client'

import type { ProductPriceComparison } from '@/lib/actions/similarity'

interface PriceComparisonTableProps {
  products: ProductPriceComparison[]
  currentProductId: string
  isLoading: boolean
}

function formatPrice(price: number | null): string {
  if (price === null) return 'N/A'
  return `${price.toLocaleString('cs-CZ')} CZK`
}

export function PriceComparisonTable({
  products,
  currentProductId,
  isLoading,
}: PriceComparisonTableProps) {
  // Loading state with skeleton rows
  if (isLoading) {
    return (
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-4 py-2 text-sm font-medium">Vendor</th>
              <th className="text-left px-4 py-2 text-sm font-medium">SKU</th>
              <th className="text-right px-4 py-2 text-sm font-medium">Price</th>
              <th className="text-right px-4 py-2 text-sm font-medium">Match %</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map((i) => (
              <tr key={i}>
                <td className="px-4 py-2">
                  <div className="h-4 bg-muted animate-pulse rounded w-24" />
                </td>
                <td className="px-4 py-2">
                  <div className="h-4 bg-muted animate-pulse rounded w-20" />
                </td>
                <td className="px-4 py-2">
                  <div className="h-4 bg-muted animate-pulse rounded w-16 ml-auto" />
                </td>
                <td className="px-4 py-2">
                  <div className="h-4 bg-muted animate-pulse rounded w-10 ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // No comparison available (only one vendor has this product)
  if (products.length <= 1) {
    return (
      <div className="text-muted-foreground text-sm py-4 text-center border border-border rounded-lg bg-muted/30">
        No price comparison available
      </div>
    )
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted">
          <tr>
            <th className="text-left px-4 py-2 text-sm font-medium">Vendor</th>
            <th className="text-left px-4 py-2 text-sm font-medium">SKU</th>
            <th className="text-right px-4 py-2 text-sm font-medium">Price</th>
            <th className="text-right px-4 py-2 text-sm font-medium">Match %</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const isCurrent = p.id === currentProductId
            return (
              <tr
                key={p.id}
                className={isCurrent ? 'bg-accent/10' : ''}
              >
                <td className="px-4 py-2 text-sm">
                  {p.vendor_name ?? 'Unknown'}
                  {isCurrent && (
                    <span className="ml-2 text-xs text-muted-foreground">(current)</span>
                  )}
                </td>
                <td className="px-4 py-2 text-sm font-mono">{p.sku}</td>
                <td className="px-4 py-2 text-sm text-right font-medium">
                  {formatPrice(p.price)}
                </td>
                <td className="px-4 py-2 text-sm text-right text-muted-foreground">
                  {Math.round(p.similarity * 100)}%
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
