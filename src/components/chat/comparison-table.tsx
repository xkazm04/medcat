'use client';

import { formatPrice } from '@/lib/utils/format-price';
import type { ProductPriceComparison } from '@/lib/actions/similarity';

interface ComparisonTableProps {
  products: ProductPriceComparison[];
}

export function ComparisonTable({ products }: ComparisonTableProps) {
  // No products case
  if (products.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No price comparison data available.
      </p>
    );
  }

  // Single vendor: show as text per CONTEXT.md
  if (products.length === 1) {
    const p = products[0];
    return (
      <p className="text-sm text-muted-foreground">
        Available from <strong>{p.vendor_name || 'Unknown'}</strong> at{' '}
        <strong>{p.price !== null ? formatPrice(p.price, 'en') : 'Price N/A'}</strong>
      </p>
    );
  }

  // Multiple vendors: show as table, sorted by price low to high
  const sorted = [...products].sort((a, b) => (a.price || 0) - (b.price || 0));

  return (
    <div className="overflow-x-auto my-2">
      <table className="min-w-full text-xs border-collapse">
        <thead>
          <tr className="bg-muted">
            <th className="px-3 py-2 text-left font-medium border">Vendor</th>
            <th className="px-3 py-2 text-left font-medium border">Price</th>
            <th className="px-3 py-2 text-left font-medium border">SKU</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr key={p.id} className="hover:bg-muted/50">
              <td className="px-3 py-2 border">{p.vendor_name || 'Unknown'}</td>
              <td className="px-3 py-2 border">{p.price !== null ? formatPrice(p.price, 'en') : 'N/A'}</td>
              <td className="px-3 py-2 border font-mono">{p.sku}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
