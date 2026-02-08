'use client'

import { useLocale } from 'next-intl'
import { Star, Package, Puzzle, Activity, Globe } from 'lucide-react'
import { formatPriceWithCurrency } from '@/lib/utils/format-price'

interface PriceSummary {
  totalPrices: number
  productMatchCount: number
  categoryMatchCount: number
  bestMatchRange: { min: number; max: number } | null
  allRange: { min: number; max: number }
  scopeBreakdown: { set: number; component: number; procedure: number }
  componentEstimate?: { min: number; max: number; label: string; fractionRange: string } | null
  hint: string
}

interface PriceSummaryCardProps {
  summary: PriceSummary
  countryCount: number
}

export function PriceSummaryCard({ summary, countryCount }: PriceSummaryCardProps) {
  const locale = useLocale()

  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 my-2 space-y-2">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">{summary.totalPrices} reference prices</span>
          <span className="text-[10px] text-muted-foreground">
            from {countryCount} {countryCount === 1 ? 'country' : 'countries'}
          </span>
        </div>
      </div>

      {/* Price range */}
      {summary.bestMatchRange ? (
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] text-green-600 flex items-center gap-1">
            <Star className="w-3 h-3 fill-green-600 text-green-600" />
            Best match ({summary.productMatchCount})
          </span>
          <span className="text-sm font-semibold tabular-nums">
            {formatPriceWithCurrency(summary.bestMatchRange.min, 'EUR', locale)}
            {summary.bestMatchRange.min !== summary.bestMatchRange.max && (
              <> – {formatPriceWithCurrency(summary.bestMatchRange.max, 'EUR', locale)}</>
            )}
          </span>
        </div>
      ) : (
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] text-muted-foreground">Range</span>
          <span className="text-sm font-semibold tabular-nums">
            {formatPriceWithCurrency(summary.allRange.min, 'EUR', locale)} – {formatPriceWithCurrency(summary.allRange.max, 'EUR', locale)}
          </span>
        </div>
      )}

      {/* Scope breakdown pills */}
      <div className="flex flex-wrap gap-1.5">
        {summary.scopeBreakdown.component > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-teal-100 text-teal-700">
            <Puzzle className="w-2.5 h-2.5" />
            {summary.scopeBreakdown.component} component
          </span>
        )}
        {summary.scopeBreakdown.set > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
            <Package className="w-2.5 h-2.5" />
            {summary.scopeBreakdown.set} set
          </span>
        )}
        {summary.scopeBreakdown.procedure > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">
            <Activity className="w-2.5 h-2.5" />
            {summary.scopeBreakdown.procedure} procedure
          </span>
        )}
        {summary.productMatchCount > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700">
            <Star className="w-2.5 h-2.5 fill-green-600" />
            {summary.productMatchCount} matched
          </span>
        )}
      </div>

      {/* Component estimate highlight */}
      {summary.componentEstimate && (
        <div className="bg-teal-50 border border-teal-200 rounded px-2 py-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] text-teal-700 flex items-center gap-1">
              <Puzzle className="w-2.5 h-2.5" />
              Est. {summary.componentEstimate.label}
            </span>
            <span className="text-xs font-semibold tabular-nums text-teal-800">
              {formatPriceWithCurrency(summary.componentEstimate.min, 'EUR', locale)} – {formatPriceWithCurrency(summary.componentEstimate.max, 'EUR', locale)}
            </span>
          </div>
          <div className="text-[9px] text-teal-600 mt-0.5">
            {summary.componentEstimate.fractionRange} of set price
          </div>
        </div>
      )}
    </div>
  )
}
