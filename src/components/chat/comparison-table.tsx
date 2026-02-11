'use client';

import { useLocale } from 'next-intl';
import { Trophy, PackageX } from 'lucide-react';
import { formatPrice } from '@/lib/utils/format-price';
import type { OfferingComparison } from '@/lib/actions/similarity';

interface ComparisonTableProps {
  offerings: OfferingComparison[];
}

export function ComparisonTable({ offerings }: ComparisonTableProps) {
  const locale = useLocale();

  if (offerings.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No price comparison data available.
      </p>
    );
  }

  // Separate offerings with and without prices
  const withPrices = offerings.filter(o => o.vendor_price !== null);
  const withoutPrices = offerings.filter(o => o.vendor_price === null);

  // All offerings lack prices
  if (withPrices.length === 0) {
    const vendors = [...new Set(offerings.map(o => o.vendor_name).filter(Boolean))];
    return (
      <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 my-2">
        <div className="flex items-center gap-1.5 mb-1">
          <PackageX className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {offerings.length} distributor{offerings.length !== 1 ? 's' : ''} found, but none have catalog prices.
          </span>
        </div>
        {vendors.length > 0 && (
          <p className="text-xs text-muted-foreground/70 pl-5">
            Distributor{vendors.length !== 1 ? 's' : ''}: {vendors.join(', ')}
          </p>
        )}
      </div>
    );
  }

  // Single priced offering: show as text
  if (withPrices.length === 1 && withoutPrices.length === 0) {
    const o = withPrices[0];
    return (
      <p className="text-sm text-muted-foreground">
        Available from <strong>{o.vendor_name || 'Unknown'}</strong> at{' '}
        <strong>{formatPrice(o.vendor_price!, locale)}</strong>
      </p>
    );
  }

  // Sort priced offerings by price ascending
  const sorted = [...withPrices].sort((a, b) => (a.vendor_price ?? 0) - (b.vendor_price ?? 0));
  const lowestPrice = sorted[0]?.vendor_price ?? 0;

  return (
    <div className="overflow-hidden rounded-lg border border-border/60 my-2">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="bg-table-header">
            <th className="px-3 py-2 text-left font-medium border-b border-border/60">Distributor</th>
            <th className="px-3 py-2 text-right font-medium border-b border-border/60">Price</th>
            <th className="px-3 py-2 text-right font-medium border-b border-border/60">Diff</th>
            <th className="px-3 py-2 text-left font-medium border-b border-border/60">SKU</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {sorted.map((o, idx) => {
            const isBest = idx === 0;
            const diff = lowestPrice > 0 && o.vendor_price !== null
              ? Math.round(((o.vendor_price - lowestPrice) / lowestPrice) * 100)
              : null;

            return (
              <tr
                key={o.offering_id}
                className={isBest ? 'bg-green-light/60' : 'hover:bg-muted/40'}
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    {isBest && <Trophy className="w-3 h-3 text-accent shrink-0" />}
                    <span className={isBest ? 'font-semibold text-accent' : ''}>
                      {o.vendor_name || 'Unknown'}
                    </span>
                    {isBest && (
                      <span className="text-[10px] font-medium bg-accent/10 text-accent px-1.5 py-0.5 rounded-full">
                        Best
                      </span>
                    )}
                  </div>
                </td>
                <td className={`px-3 py-2 text-right tabular-nums ${isBest ? 'font-semibold text-accent' : ''}`}>
                  {formatPrice(o.vendor_price!, locale)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {isBest ? '—' : diff !== null ? `+${diff}%` : '—'}
                </td>
                <td className="px-3 py-2 font-mono text-muted-foreground">{o.vendor_sku || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {withoutPrices.length > 0 && (
        <div className="px-3 py-1.5 bg-muted/30 border-t border-border/40 text-[10px] text-muted-foreground">
          +{withoutPrices.length} more distributor{withoutPrices.length !== 1 ? 's' : ''} without catalog prices
        </div>
      )}
    </div>
  );
}
