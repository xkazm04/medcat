'use client'

import { useLocale } from 'next-intl'
import { formatPriceWithCurrency } from '@/lib/utils/format-price'
import type { ReferencePrice } from '@/lib/types'

interface PriceRange {
  min: number
  max: number
}

interface PriceRangeChartProps {
  /** Product-matched price range (high confidence) */
  productMatchRange?: PriceRange | null
  /** Full category range (all prices) */
  categoryRange: PriceRange
  /** Estimated component cost from set price */
  componentEstimate?: PriceRange | null
  /** Offering price range in EUR (min/max from distributor offerings) */
  offeringPriceRange?: { min: number; max: number } | null
  /** Individual price data points to render as dots */
  pricePoints?: ReferencePrice[]
}

/**
 * Horizontal price range visualization with individual price dots.
 * Shows overlapping bars for different price tiers with a vendor price marker.
 * Pure CSS — no charting library needed.
 */
export function PriceRangeChart({
  productMatchRange,
  categoryRange,
  componentEstimate,
  offeringPriceRange,
  pricePoints,
}: PriceRangeChartProps) {
  const locale = useLocale()

  // Compute the full scale from all data points
  const allValues: number[] = [categoryRange.min, categoryRange.max]
  if (productMatchRange) {
    allValues.push(productMatchRange.min, productMatchRange.max)
  }
  if (componentEstimate) {
    allValues.push(componentEstimate.min, componentEstimate.max)
  }
  if (offeringPriceRange) {
    allValues.push(offeringPriceRange.min, offeringPriceRange.max)
  }

  const scaleMin = Math.min(...allValues)
  const scaleMax = Math.max(...allValues)
  const range = scaleMax - scaleMin

  // Add 5% padding on each side
  const padded = range * 0.05 || 1
  const axisMin = Math.max(0, scaleMin - padded)
  const axisMax = scaleMax + padded
  const axisRange = axisMax - axisMin

  const toPercent = (val: number) => ((val - axisMin) / axisRange) * 100

  // Generate axis tick values (3-5 ticks)
  const ticks: number[] = []
  const step = niceStep(axisRange, 4)
  const tickStart = Math.ceil(axisMin / step) * step
  for (let v = tickStart; v <= axisMax; v += step) {
    ticks.push(v)
  }

  const barHeight = 10
  const rows: {
    key: string
    label: string
    color: string
    dotColor: string
    bgColor: string
    borderColor: string
    min: number
    max: number
    dashed?: boolean
  }[] = []

  // Category range (broadest, shown first as background)
  if (categoryRange.min !== categoryRange.max) {
    rows.push({
      key: 'category',
      label: 'Category',
      color: 'text-amber-600',
      dotColor: '#d97706', // amber-600
      bgColor: 'bg-amber-200/60',
      borderColor: 'border-amber-300',
      min: categoryRange.min,
      max: categoryRange.max,
    })
  }

  // Product match range
  if (productMatchRange) {
    rows.push({
      key: 'matched',
      label: 'Matched',
      color: 'text-green-600',
      dotColor: '#16a34a', // green-600
      bgColor: 'bg-green-300/70',
      borderColor: 'border-green-400',
      min: productMatchRange.min,
      max: productMatchRange.max,
    })
  }

  // Component estimate range (dashed style)
  if (componentEstimate) {
    rows.push({
      key: 'estimate',
      label: 'Est. part',
      color: 'text-teal-600',
      dotColor: '#0d9488', // teal-600
      bgColor: 'bg-teal-200/50',
      borderColor: 'border-teal-400',
      min: componentEstimate.min,
      max: componentEstimate.max,
      dashed: true,
    })
  }

  // Classify price point into a row
  const getRowForPrice = (p: ReferencePrice): string => {
    const isMatched = p.match_type === 'product_match' || p.match_type === 'product_direct'
    if (isMatched && productMatchRange) return 'matched'
    if (categoryRange.min !== categoryRange.max) return 'category'
    return ''
  }

  // Dot color based on match type
  const getDotColor = (p: ReferencePrice): string => {
    const isMatched = p.match_type === 'product_match' || p.match_type === 'product_direct'
    if (isMatched) return '#16a34a' // green-600
    return '#d97706' // amber-600
  }

  // Compute chart height — legend goes below bars, so add space for legend rows
  const legendRowHeight = 16
  const legendItems = rows.length
  const chartBarAreaHeight = rows.length * 24 + 24

  return (
    <div className="bg-muted/30 rounded-lg px-3 py-2.5 mb-3">
      {/* Chart area */}
      <div className="relative" style={{ height: chartBarAreaHeight + legendItems * legendRowHeight + 4 }}>
        {/* Axis ticks */}
        {ticks.map((tick) => (
          <div
            key={tick}
            className="absolute border-l border-border/30"
            style={{ left: `${toPercent(tick)}%`, top: 0, bottom: legendItems * legendRowHeight + 4 }}
          >
            <span
              className="absolute text-[9px] text-muted-foreground/60 tabular-nums"
              style={{ bottom: -1, transform: 'translateX(-50%)' }}
            >
              {formatCompactPrice(tick)}
            </span>
          </div>
        ))}

        {/* Bars */}
        {rows.map((row, i) => {
          const left = toPercent(row.min)
          const right = toPercent(row.max)
          const width = Math.max(right - left, 0.5)

          return (
            <div
              key={row.key}
              className="absolute flex items-center"
              style={{ top: i * 24 + 2, height: 20, left: 0, right: 0 }}
            >
              {/* Bar */}
              <div
                className={`absolute ${row.bgColor} ${row.dashed ? 'border border-dashed' : 'border'} ${row.borderColor} rounded-sm`}
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  height: barHeight,
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
              />
            </div>
          )
        })}

        {/* Individual price dots */}
        {pricePoints && pricePoints.map((p) => {
          const rowKey = getRowForPrice(p)
          const rowIndex = rows.findIndex(r => r.key === rowKey)
          if (rowIndex === -1) return null
          const x = toPercent(p.price_eur)
          const y = rowIndex * 24 + 2 + 10 // center of row

          return (
            <div
              key={p.id}
              className="absolute z-[5]"
              style={{
                left: `${x}%`,
                top: y - 3,
                width: 6,
                height: 6,
                marginLeft: -3,
                borderRadius: '50%',
                backgroundColor: getDotColor(p),
                border: '1px solid white',
              }}
              title={`${formatPriceWithCurrency(p.price_eur, 'EUR', locale)} — ${p.component_description || p.source_name}`}
            />
          )
        })}

        {/* Offering price marker(s) */}
        {offeringPriceRange && (
          offeringPriceRange.min === offeringPriceRange.max ? (
            // Single price — render as marker line
            <div
              className="absolute top-0 border-l-2 border-red-400 z-10"
              style={{
                left: `${toPercent(offeringPriceRange.min)}%`,
                height: rows.length * 24,
              }}
            >
              <div className="absolute -top-3.5 -translate-x-1/2 bg-red-50 border border-red-300 rounded px-1 text-[8px] text-red-600 font-medium tabular-nums whitespace-nowrap">
                {formatPriceWithCurrency(Math.round(offeringPriceRange.min), 'EUR', locale)}
              </div>
              <div className="absolute -left-[3px] -top-0.5 w-1.5 h-1.5 rounded-full bg-red-400" />
            </div>
          ) : (
            // Price range — render as shaded band with min/max labels
            <>
              <div
                className="absolute top-0 bg-red-200/40 border-l-2 border-r-2 border-red-300 z-10"
                style={{
                  left: `${toPercent(offeringPriceRange.min)}%`,
                  width: `${Math.max(toPercent(offeringPriceRange.max) - toPercent(offeringPriceRange.min), 0.5)}%`,
                  height: rows.length * 24,
                }}
              />
              <div
                className="absolute z-10"
                style={{ left: `${toPercent(offeringPriceRange.min)}%`, top: -14 }}
              >
                <span className="absolute -translate-x-1/2 bg-red-50 border border-red-300 rounded px-1 text-[8px] text-red-600 font-medium tabular-nums whitespace-nowrap">
                  {formatPriceWithCurrency(Math.round(offeringPriceRange.min), 'EUR', locale)}
                </span>
              </div>
              <div
                className="absolute z-10"
                style={{ left: `${toPercent(offeringPriceRange.max)}%`, top: -14 }}
              >
                <span className="absolute -translate-x-1/2 bg-red-50 border border-red-300 rounded px-1 text-[8px] text-red-600 font-medium tabular-nums whitespace-nowrap">
                  {formatPriceWithCurrency(Math.round(offeringPriceRange.max), 'EUR', locale)}
                </span>
              </div>
            </>
          )
        )}

        {/* Legend — inside chart, bottom-right */}
        <div
          className="absolute right-0 flex flex-col gap-0.5"
          style={{ top: rows.length * 24 + 20 }}
        >
          {rows.map((row) => (
            <div key={row.key} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: row.dotColor }}
              />
              <span className={`text-[9px] ${row.color} whitespace-nowrap`}>
                {row.label}
              </span>
            </div>
          ))}
          {offeringPriceRange && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-0.5 bg-red-400 shrink-0" />
              <span className="text-[9px] text-red-500 whitespace-nowrap">Your prices</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** Find a "nice" step value for axis ticks */
function niceStep(range: number, targetTicks: number): number {
  const rough = range / targetTicks
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)))
  const normalized = rough / magnitude

  let nice: number
  if (normalized <= 1.5) nice = 1
  else if (normalized <= 3.5) nice = 2
  else if (normalized <= 7.5) nice = 5
  else nice = 10

  return nice * magnitude
}

/** Format price as compact string (e.g., "1.2K", "647") */
function formatCompactPrice(value: number): string {
  if (value >= 10000) return `${(value / 1000).toFixed(0)}K`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return `${Math.round(value)}`
}
