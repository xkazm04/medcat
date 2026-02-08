'use client';

import { useLocale } from 'next-intl';
import { ExternalLink, Star, Package, Puzzle, Activity } from 'lucide-react';
import { formatPriceWithCurrency } from '@/lib/utils/format-price';
import { ConfidenceDots } from '@/components/ui/confidence-dots';
import type { ReferencePrice } from '@/lib/types';

// Country flag emoji from ISO 3166 alpha-2
const countryFlag = (code: string): string => {
  try {
    const codePoints = code
      .toUpperCase()
      .split('')
      .map((c) => 0x1f1e6 + c.charCodeAt(0) - 65);
    return String.fromCodePoint(...codePoints);
  } catch {
    return code;
  }
};

const COUNTRY_NAMES: Record<string, string> = {
  FR: 'France',
  SK: 'Slovakia',
  CZ: 'Czechia',
  HU: 'Hungary',
  DE: 'Germany',
  GB: 'UK',
  EU: 'EU',
  PL: 'Poland',
  IT: 'Italy',
  ES: 'Spain',
};

const PRICE_TYPE_LABELS: Record<string, string> = {
  reimbursement_ceiling: 'Reimbursement',
  tender_unit: 'Tender',
  catalog_list: 'Catalog',
  reference: 'Reference',
};

function isProductMatch(p: ReferencePrice): boolean {
  return p.match_type === 'product_match' || p.match_type === 'product_direct';
}

function scopeBadgeClass(scope: ReferencePrice['price_scope']): string {
  switch (scope) {
    case 'set': return 'bg-purple-100 text-purple-700';
    case 'component': return 'bg-teal-100 text-teal-700';
    case 'procedure': return 'bg-orange-100 text-orange-700';
    default: return '';
  }
}

function scopeLabel(scope: ReferencePrice['price_scope']): string {
  switch (scope) {
    case 'set': return 'Set';
    case 'component': return 'Part';
    case 'procedure': return 'Proc.';
    default: return '';
  }
}

function ScopeIcon({ scope }: { scope: ReferencePrice['price_scope'] }) {
  switch (scope) {
    case 'set': return <Package className="w-2.5 h-2.5" />;
    case 'component': return <Puzzle className="w-2.5 h-2.5" />;
    case 'procedure': return <Activity className="w-2.5 h-2.5" />;
    default: return null;
  }
}

interface ReferencePriceTableProps {
  prices: ReferencePrice[];
}

export function ReferencePriceTable({ prices }: ReferencePriceTableProps) {
  const locale = useLocale();

  if (prices.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No reference prices available for this product or category.
      </p>
    );
  }

  // Sort: product matches first, then by score desc, then price asc
  const sorted = [...prices].sort((a, b) => {
    const aProduct = isProductMatch(a) ? 1 : 0;
    const bProduct = isProductMatch(b) ? 1 : 0;
    if (aProduct !== bProduct) return bProduct - aProduct;
    const aScore = a.match_score ?? 0;
    const bScore = b.match_score ?? 0;
    if (aScore !== bScore) return bScore - aScore;
    return a.price_eur - b.price_eur;
  });

  const productMatchCount = prices.filter(isProductMatch).length;

  return (
    <div className="overflow-hidden rounded-lg border border-border/60 my-2">
      {productMatchCount > 0 && (
        <div className="px-3 py-1.5 bg-green-50/50 border-b border-border/40 text-[10px] text-green-700 flex items-center gap-1">
          <Star className="w-3 h-3 fill-green-600 text-green-600" />
          {productMatchCount} manufacturer-matched price{productMatchCount !== 1 ? 's' : ''}
        </div>
      )}
      <table className="min-w-full text-xs">
        <thead>
          <tr className="bg-table-header">
            <th className="px-3 py-2 text-left font-medium border-b border-border/60">Country</th>
            <th className="px-3 py-2 text-right font-medium border-b border-border/60">Price (EUR)</th>
            <th className="px-3 py-2 text-left font-medium border-b border-border/60">Scope</th>
            <th className="px-3 py-2 text-left font-medium border-b border-border/60">Match</th>
            <th className="px-3 py-2 text-left font-medium border-b border-border/60">Source</th>
            <th className="px-3 py-2 text-left font-medium border-b border-border/60">Component</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {sorted.map((p) => (
            <tr
              key={p.id}
              className={`hover:bg-muted/40 ${isProductMatch(p) ? 'bg-green-50/30' : ''}`}
            >
              <td className="px-3 py-2 whitespace-nowrap">
                <span className="mr-1">{countryFlag(p.source_country)}</span>
                {COUNTRY_NAMES[p.source_country] || p.source_country}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-semibold">
                {formatPriceWithCurrency(p.price_eur, 'EUR', locale)}
              </td>
              <td className="px-3 py-2">
                {p.price_scope && (
                  <span className={`text-[10px] px-1 py-0.5 rounded inline-flex items-center gap-0.5 ${scopeBadgeClass(p.price_scope)}`}>
                    <ScopeIcon scope={p.price_scope} />
                    {scopeLabel(p.price_scope)}
                  </span>
                )}
              </td>
              <td className="px-3 py-2">
                {p.match_type && (
                  <ConfidenceDots matchType={p.match_type} showLabel />
                )}
              </td>
              <td className="px-3 py-2">
                {p.source_url ? (
                  <a
                    href={p.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-subtle hover:underline inline-flex items-center gap-1"
                  >
                    {p.source_name}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span>{p.source_name}</span>
                )}
              </td>
              <td className="px-3 py-2 text-muted-foreground max-w-[180px] truncate">
                {p.component_description || p.product_family || ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
