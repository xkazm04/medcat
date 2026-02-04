'use client'

import { useTranslations, useLocale } from 'next-intl'
import type { ProductPriceComparison } from '@/lib/actions/similarity'

interface PriceComparisonTableProps {
  products: ProductPriceComparison[]
  currentProductId: string
  isLoading: boolean
}

export function PriceComparisonTable({
  products,
  currentProductId,
  isLoading,
}: PriceComparisonTableProps) {
  const t = useTranslations('comparison')
  const locale = useLocale()

  const formatPrice = (price: number | null): string => {
    if (price === null) return t('notAvailable')
    return `${price.toLocaleString(locale === 'cs' ? 'cs-CZ' : 'en-US')} CZK`
  }

  // Loading state with skeleton rows
  if (isLoading) {
    return (
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-4 py-2 text-sm font-medium">{t('product')}</th>
              <th className="text-left px-4 py-2 text-sm font-medium">{t('vendor')}</th>
              <th className="text-right px-4 py-2 text-sm font-medium">{t('price')}</th>
              <th className="text-right px-4 py-2 text-sm font-medium">{t('match')}</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map((i) => (
              <tr key={i}>
                <td className="px-4 py-2">
                  <div className="h-4 bg-muted animate-pulse rounded w-32 mb-1" />
                  <div className="h-3 bg-muted animate-pulse rounded w-20" />
                </td>
                <td className="px-4 py-2">
                  <div className="h-4 bg-muted animate-pulse rounded w-24" />
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
        {t('noComparison')}
      </div>
    )
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted">
          <tr>
            <th className="text-left px-4 py-2 text-sm font-medium">{t('product')}</th>
            <th className="text-left px-4 py-2 text-sm font-medium">{t('vendor')}</th>
            <th className="text-right px-4 py-2 text-sm font-medium">{t('price')}</th>
            <th className="text-right px-4 py-2 text-sm font-medium">{t('match')}</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const isCurrent = p.id === currentProductId
            return (
              <tr
                key={p.id}
                className={isCurrent ? 'bg-accent/10' : 'hover:bg-muted/30'}
              >
                <td className="px-4 py-2">
                  <div className="text-sm font-medium">
                    {p.name}
                    {isCurrent && (
                      <span className="ml-2 text-xs text-accent font-normal">({t('current')})</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">{p.sku}</div>
                </td>
                <td className="px-4 py-2 text-sm">
                  {p.vendor_name ?? t('unknown')}
                </td>
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
