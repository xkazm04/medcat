'use client'

import { useTranslations, useLocale } from 'next-intl'
import { Trophy, PackageX } from 'lucide-react'
import type { OfferingComparison } from '@/lib/actions/similarity'
import { formatPrice as formatPriceUtil } from '@/lib/utils/format-price'

interface PriceComparisonTableProps {
  products: OfferingComparison[]
  currentProductId: string
  isLoading: boolean
}

export function PriceComparisonTable({
  products: offerings,
  currentProductId,
  isLoading,
}: PriceComparisonTableProps) {
  const t = useTranslations('comparison')
  const locale = useLocale()

  const formatPrice = (price: number | null): string => {
    if (price === null) return t('notAvailable')
    return formatPriceUtil(price, locale)
  }

  // Loading state with skeleton rows
  if (isLoading) {
    return (
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-4 py-2 text-sm font-medium">{t('distributor')}</th>
              <th className="text-right px-4 py-2 text-sm font-medium">{t('price')}</th>
              <th className="text-left px-4 py-2 text-sm font-medium">SKU</th>
              <th className="text-right px-4 py-2 text-sm font-medium">{t('diff')}</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map((i) => (
              <tr key={i}>
                <td className="px-4 py-2">
                  <div className="h-4 bg-muted animate-pulse rounded w-32 mb-1" />
                </td>
                <td className="px-4 py-2">
                  <div className="h-4 bg-muted animate-pulse rounded w-16 ml-auto" />
                </td>
                <td className="px-4 py-2">
                  <div className="h-4 bg-muted animate-pulse rounded w-24" />
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

  // No offerings
  if (offerings.length === 0) {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <PackageX className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{t('noComparison')}</span>
        </div>
      </div>
    )
  }

  // Sort by price ascending, null prices go last
  const withPrices = offerings.filter(o => o.vendor_price !== null)
  const withoutPrices = offerings.filter(o => o.vendor_price === null)
  const sortedWithPrices = [...withPrices].sort((a, b) => (a.vendor_price ?? 0) - (b.vendor_price ?? 0))
  const allSorted = [...sortedWithPrices, ...withoutPrices]
  const lowestPrice = sortedWithPrices[0]?.vendor_price ?? 0

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted">
          <tr>
            <th className="text-left px-4 py-2 text-sm font-medium">{t('distributor')}</th>
            <th className="text-right px-4 py-2 text-sm font-medium">{t('price')}</th>
            <th className="text-left px-4 py-2 text-sm font-medium">SKU</th>
            <th className="text-right px-4 py-2 text-sm font-medium">{t('diff')}</th>
          </tr>
        </thead>
        <tbody>
          {allSorted.map((o, idx) => {
            const isBest = idx === 0 && o.vendor_price !== null
            const hasPrice = o.vendor_price !== null
            const diff = isBest ? null
              : lowestPrice > 0 && hasPrice
                ? Math.round(((o.vendor_price! - lowestPrice) / lowestPrice) * 100)
                : null

            return (
              <tr
                key={o.offering_id}
                className={isBest ? 'bg-green-light/60' : 'hover:bg-muted/30'}
              >
                <td className="px-4 py-2">
                  <div className="flex items-center gap-1.5">
                    {isBest && <Trophy className="w-3 h-3 text-accent shrink-0" />}
                    <span className={`text-sm ${isBest ? 'font-semibold text-accent' : ''}`}>
                      {o.vendor_name || 'Unknown'}
                    </span>
                    {isBest && (
                      <span className="text-[10px] font-medium bg-accent/10 text-accent px-1.5 py-0.5 rounded-full">
                        Best
                      </span>
                    )}
                    {o.is_primary && !isBest && (
                      <span className="text-[10px] font-medium bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                        Primary
                      </span>
                    )}
                  </div>
                </td>
                <td className={`px-4 py-2 text-right tabular-nums text-sm ${
                  isBest ? 'font-semibold text-accent'
                    : hasPrice ? 'font-medium'
                    : 'text-muted-foreground'
                }`}>
                  {formatPrice(o.vendor_price)}
                </td>
                <td className="px-4 py-2 text-sm font-mono text-muted-foreground">
                  {o.vendor_sku || '—'}
                </td>
                <td className="px-4 py-2 text-sm text-right tabular-nums text-muted-foreground">
                  {isBest ? '—' : diff !== null ? `+${diff}%` : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
