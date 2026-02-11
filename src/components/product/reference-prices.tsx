'use client'

import { useState, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { ExternalLink, Star, Package, Puzzle, Activity, Info, Eye } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { formatPriceWithCurrency } from '@/lib/utils/format-price'
import { estimateComponentPrice, formatFractionRange } from '@/lib/utils/component-fractions'
import { PriceRangeChart } from './price-range-chart'
import { ConfidenceDots } from '@/components/ui/confidence-dots'
import type { ReferencePrice, ProductOffering } from '@/lib/types'

// Country flag emoji from ISO 3166 alpha-2
const countryFlag = (code: string): string => {
  try {
    const codePoints = code
      .toUpperCase()
      .split('')
      .map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
    return String.fromCodePoint(...codePoints)
  } catch {
    return code
  }
}

const PRICE_TYPE_LABELS: Record<string, Record<string, string>> = {
  reimbursement_ceiling: { en: 'Reimbursement', cs: 'Úhrada' },
  tender_unit: { en: 'Tender', cs: 'Zakázka' },
  catalog_list: { en: 'Catalog', cs: 'Katalog' },
  reference: { en: 'Reference', cs: 'Reference' },
}

type ScopeTab = 'component' | 'set' | 'procedure'

function isProductMatch(p: ReferencePrice): boolean {
  return p.match_type === 'product_match' || p.match_type === 'product_direct'
}

function scopeBadgeClass(scope: ReferencePrice['price_scope']): string {
  switch (scope) {
    case 'set': return 'bg-purple-100 text-purple-700'
    case 'component': return 'bg-teal-100 text-teal-700'
    case 'procedure': return 'bg-orange-100 text-orange-700'
    default: return 'bg-muted text-muted-foreground'
  }
}

function ScopeIcon({ scope }: { scope: ReferencePrice['price_scope'] }) {
  switch (scope) {
    case 'set': return <Package className="w-2.5 h-2.5" />
    case 'component': return <Puzzle className="w-2.5 h-2.5" />
    case 'procedure': return <Activity className="w-2.5 h-2.5" />
    default: return null
  }
}

const SCOPE_DESCRIPTIONS: Record<string, Record<string, string>> = {
  set: {
    en: 'Complete surgical kit (stem + cup + head + liner). Your product is one component.',
    cs: 'Kompletní chirurgická sada (dřík + jamka + hlavice + vložka). Váš produkt je jednou součástí.',
  },
  component: {
    en: 'Single component — directly comparable to your product.',
    cs: 'Jednotlivá komponenta — přímo srovnatelná s vaším produktem.',
  },
  procedure: {
    en: 'Includes both implant and surgical procedure.',
    cs: 'Zahrnuje implantát i chirurgický výkon.',
  },
}

/** Format source date compactly: year if old, month+year if recent */
function formatSourceDate(validFrom: string | null, extractedAt: string): string {
  const date = validFrom || extractedAt
  const d = new Date(date)
  const now = new Date()
  const monthsDiff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
  if (monthsDiff > 12) return d.getFullYear().toString()
  return `${d.getMonth() + 1}/${d.getFullYear()}`
}

/** Check if date is stale (>2 years old) */
function isStaleDate(validFrom: string | null, extractedAt: string): boolean {
  const date = validFrom || extractedAt
  const d = new Date(date)
  const now = new Date()
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth()) > 24
}

const TAB_CONFIG: Record<ScopeTab, { icon: typeof Puzzle; activeClass: string; borderClass: string }> = {
  component: { icon: Puzzle, activeClass: 'bg-teal-600 text-white border-teal-600', borderClass: 'border-teal-600' },
  set: { icon: Package, activeClass: 'bg-purple-600 text-white border-purple-600', borderClass: 'border-purple-600' },
  procedure: { icon: Activity, activeClass: 'bg-orange-600 text-white border-orange-600', borderClass: 'border-orange-600' },
}

interface ReferencePricesPanelProps {
  prices: ReferencePrice[]
  /** @deprecated Use offerings prop instead */
  vendorPriceCzk?: number | null
  offerings?: ProductOffering[]
  productEmdnCode?: string | null
}

export function ReferencePricesPanel({ prices, vendorPriceCzk, offerings, productEmdnCode }: ReferencePricesPanelProps) {
  const t = useTranslations('referencePricing')
  const locale = useLocale()

  // Scope counts for tabs
  const scopeCounts = useMemo(() => {
    const sc = { component: 0, set: 0, procedure: 0 }
    for (const p of prices) {
      if (p.price_scope === 'component') sc.component++
      else if (p.price_scope === 'set') sc.set++
      else if (p.price_scope === 'procedure') sc.procedure++
    }
    return sc
  }, [prices])

  // Default tab: first scope that has data
  const defaultTab: ScopeTab = scopeCounts.component > 0 ? 'component' : scopeCounts.set > 0 ? 'set' : 'procedure'
  const [activeTab, setActiveTab] = useState<ScopeTab>(defaultTab)
  const [matchedOnly, setMatchedOnly] = useState(true)

  // Prices filtered by scope tab
  const scopeFiltered = useMemo(() =>
    prices.filter(p => p.price_scope === activeTab),
    [prices, activeTab]
  )

  // Count matched in current scope
  const matchedInScope = useMemo(() =>
    scopeFiltered.filter(isProductMatch).length,
    [scopeFiltered]
  )

  const hasMatchedInScope = matchedInScope > 0
  const unmatchedCount = scopeFiltered.length - matchedInScope

  // Final filtered + sorted list
  const filteredPrices = useMemo(() => {
    let list = scopeFiltered
    if (matchedOnly && hasMatchedInScope) {
      list = list.filter(isProductMatch)
    }
    return [...list].sort((a, b) => {
      const aProduct = isProductMatch(a) ? 1 : 0
      const bProduct = isProductMatch(b) ? 1 : 0
      if (aProduct !== bProduct) return bProduct - aProduct
      const aScore = a.match_score ?? 0
      const bScore = b.match_score ?? 0
      if (aScore !== bScore) return bScore - aScore
      return a.price_eur - b.price_eur
    })
  }, [scopeFiltered, matchedOnly, hasMatchedInScope])

  // Compute ranges for chart (from ALL prices)
  const allEurPrices = prices.map(p => p.price_eur)
  const productMatchPrices = prices.filter(isProductMatch).map(p => p.price_eur)
  const hasProductMatches = productMatchPrices.length > 0

  const bestMin = hasProductMatches ? Math.min(...productMatchPrices) : Math.min(...allEurPrices)
  const bestMax = hasProductMatches ? Math.max(...productMatchPrices) : Math.max(...allEurPrices)
  const allMin = Math.min(...allEurPrices)
  const allMax = Math.max(...allEurPrices)

  const EUR_TO_CZK = 25.2
  // Compute vendor price: prefer offerings min EUR price, fall back to legacy vendorPriceCzk
  const offeringPricesEur = (offerings ?? []).map(o => o.vendor_price).filter((p): p is number => p !== null)
  const vendorPriceEur = offeringPricesEur.length > 0
    ? Math.min(...offeringPricesEur)
    : vendorPriceCzk ? vendorPriceCzk / EUR_TO_CZK : null

  const hasSetPricesOnly = scopeCounts.set > 0 && scopeCounts.component === 0
  const componentEstimate = hasSetPricesOnly && productEmdnCode
    ? estimateComponentPrice(productEmdnCode, (bestMin + bestMax) / 2)
    : null

  if (prices.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">{t('noPrices')}</p>
  }

  // Available tabs (only show tabs with data)
  const availableTabs = (['component', 'set', 'procedure'] as ScopeTab[]).filter(s => scopeCounts[s] > 0)

  return (
    <div className="space-y-3">
      {/* Summary row */}
      <div className="bg-muted/40 rounded-lg px-3 py-2">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            {hasProductMatches ? (
              <>
                <Star className="w-3 h-3 text-green-600 fill-green-600" />
                {t('bestMatchRange')}
              </>
            ) : (
              t('rangeLabel')
            )}
          </span>
          <span className="text-sm font-semibold tabular-nums">
            {bestMin === bestMax
              ? formatPriceWithCurrency(bestMin, 'EUR', locale)
              : `${formatPriceWithCurrency(bestMin, 'EUR', locale)} – ${formatPriceWithCurrency(bestMax, 'EUR', locale)}`}
          </span>
        </div>
        {vendorPriceEur && (
          <div className="flex items-baseline justify-between mt-0.5">
            <span className="text-xs text-muted-foreground">{t('vendorPrice')}</span>
            <span className="text-xs tabular-nums text-muted-foreground">
              ~{formatPriceWithCurrency(Math.round(vendorPriceEur), 'EUR', locale)}
              {vendorPriceEur > bestMax && (
                <span className="ml-1 text-red-500">
                  (+{Math.round(((vendorPriceEur - bestMax) / bestMax) * 100)}%)
                </span>
              )}
              {vendorPriceEur < bestMin && (
                <span className="ml-1 text-green-600">
                  ({Math.round(((vendorPriceEur - bestMin) / bestMin) * 100)}%)
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Chart with dots (dev only) */}
      {process.env.NEXT_PUBLIC_DEVELOPMENT === 'true' && prices.length >= 2 && (
        <PriceRangeChart
          productMatchRange={hasProductMatches ? { min: bestMin, max: bestMax } : null}
          categoryRange={{ min: allMin, max: allMax }}
          componentEstimate={componentEstimate ? { min: componentEstimate.min, max: componentEstimate.max } : null}
          vendorPriceEur={vendorPriceEur}
          pricePoints={prices}
        />
      )}

      {/* Component estimate */}
      {componentEstimate && (
        <div className="bg-teal-50 border border-teal-200 rounded px-3 py-2">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] text-teal-700 flex items-center gap-1">
              <Puzzle className="w-3 h-3" />
              {t('estimatedComponent', { label: componentEstimate.label })}
            </span>
            <span className="text-sm font-semibold tabular-nums text-teal-800">
              {formatPriceWithCurrency(componentEstimate.min, 'EUR', locale)} – {formatPriceWithCurrency(componentEstimate.max, 'EUR', locale)}
            </span>
          </div>
          <div className="text-[10px] text-teal-600 mt-0.5">
            {t('fractionNote', { range: formatFractionRange(componentEstimate.fractionMin, componentEstimate.fractionMax) })}
          </div>
        </div>
      )}

      {/* Set-level note */}
      {hasSetPricesOnly && (
        <div className="flex items-start gap-1.5 bg-purple-50 border border-purple-200 rounded px-2 py-1.5 text-[11px] text-purple-700">
          <Package className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{t('scopeNote')}</span>
        </div>
      )}

      {/* Scope tab switcher */}
      <div className="flex gap-1.5">
        {availableTabs.map((scope) => {
          const cfg = TAB_CONFIG[scope]
          const Icon = cfg.icon
          const isActive = activeTab === scope
          return (
            <button
              key={scope}
              onClick={() => { setActiveTab(scope); setMatchedOnly(true) }}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                isActive
                  ? cfg.activeClass
                  : 'border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Icon className="w-3 h-3" />
              {scope === 'component' ? t('scopeComponentShort') : scope === 'set' ? t('scopeSetShort') : t('scopeProcedureShort')}
              <span className={`text-[10px] px-1 py-0.5 rounded-full ${
                isActive ? 'bg-white/20' : 'bg-muted'
              }`}>
                {scopeCounts[scope]}
              </span>
            </button>
          )
        })}
      </div>

      {/* Flat price table */}
      <div className="overflow-hidden rounded-lg border border-border/60">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-table-header">
              <th className="px-2 py-1.5 text-left font-medium border-b border-border/60 w-12">{t('country')}</th>
              <th className="px-2 py-1.5 text-right font-medium border-b border-border/60">{t('colPrice')}</th>
              <th className="px-2 py-1.5 text-left font-medium border-b border-border/60">{t('colCode')}</th>
              <th className="px-2 py-1.5 text-left font-medium border-b border-border/60 w-16">{t('colDate')}</th>
              <th className="px-2 py-1.5 text-center font-medium border-b border-border/60">{t('whyMatch')}</th>
              <th className="px-2 py-1.5 text-left font-medium border-b border-border/60">{t('colSource')}</th>
              <th className="px-1 py-1.5 w-6 border-b border-border/60"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {filteredPrices.map((p) => (
              <PriceTableRow key={p.id} price={p} locale={locale} t={t} />
            ))}
          </tbody>
        </table>

        {/* "Show all" button when matched-only is active and there are unmatched items */}
        {matchedOnly && hasMatchedInScope && unmatchedCount > 0 && (
          <button
            onClick={() => setMatchedOnly(false)}
            className="w-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 border-t border-border/40 transition-colors flex items-center justify-center gap-1.5"
          >
            <Eye className="w-3 h-3" />
            {t('showAllInScope', { count: unmatchedCount })}
          </button>
        )}
      </div>

      {/* Compact legend */}
      <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground/70 pt-1">
        <span className="flex items-center gap-1">
          <ConfidenceDots matchType="product_match" /> {t('legendMatchHigh')}
        </span>
        <span className="flex items-center gap-1">
          <ConfidenceDots matchType="category_leaf" /> {t('legendMatchMedium')}
        </span>
        <span className="flex items-center gap-1">
          <ConfidenceDots matchType="category_ancestor" /> {t('legendMatchLow')}
        </span>
      </div>
      <p className="text-[9px] text-muted-foreground/50 italic">{t('legendDisclaimer')}</p>
    </div>
  )
}

/** Single row in the flat price table */
function PriceTableRow({ price: p, locale, t }: { price: ReferencePrice; locale: string; t: ReturnType<typeof useTranslations> }) {
  const [showWhy, setShowWhy] = useState(false)

  return (
    <>
      <tr className={`hover:bg-muted/40 ${isProductMatch(p) ? 'bg-green-50/30' : ''}`}>
        <td className="px-2 py-1.5 whitespace-nowrap" title={p.source_country}>
          <span className="mr-0.5">{countryFlag(p.source_country)}</span>
          <span className="text-[10px] text-muted-foreground">{p.source_country}</span>
        </td>
        <td className="px-2 py-1.5 text-right tabular-nums font-semibold">
          {formatPriceWithCurrency(p.price_eur, 'EUR', locale)}
        </td>
        <td className="px-2 py-1.5 font-mono text-[10px] text-muted-foreground truncate max-w-[140px]" title={p.source_code || ''}>
          {p.source_code || '—'}
        </td>
        <td className={`px-2 py-1.5 text-[10px] tabular-nums whitespace-nowrap ${isStaleDate(p.valid_from, p.extracted_at) ? 'text-amber-600' : 'text-muted-foreground'}`}>
          {formatSourceDate(p.valid_from, p.extracted_at)}
        </td>
        <td className="px-2 py-1.5 text-center">
          {p.match_type && <ConfidenceDots matchType={p.match_type} />}
        </td>
        <td className="px-2 py-1.5">
          {p.source_url ? (
            <a
              href={p.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-subtle hover:underline inline-flex items-center gap-0.5"
            >
              {p.source_name}
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          ) : (
            <span className="text-muted-foreground">{p.source_name}</span>
          )}
        </td>
        <td className="px-1 py-1.5">
          <button
            onClick={() => setShowWhy(!showWhy)}
            className={`p-0.5 rounded hover:bg-muted transition-colors ${showWhy ? 'text-blue-500' : 'text-muted-foreground/40'}`}
            title={t('whyThisPrice')}
          >
            <Info className="w-3 h-3" />
          </button>
        </td>
      </tr>
      <AnimatePresence>
        {showWhy && (
          <tr>
            <td colSpan={7} className="p-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="px-3 py-2 space-y-0.5 text-[10px] text-muted-foreground bg-muted/30">
                  {p.match_reason && (
                    <div className="flex gap-1">
                      <span className="font-medium shrink-0">{t('whyMatch')}:</span>
                      <span>{p.match_reason}</span>
                    </div>
                  )}
                  {p.price_scope && SCOPE_DESCRIPTIONS[p.price_scope] && (
                    <div className="flex gap-1">
                      <span className="font-medium shrink-0">{t('whyScope')}:</span>
                      <span>{SCOPE_DESCRIPTIONS[p.price_scope][locale] || SCOPE_DESCRIPTIONS[p.price_scope].en}</span>
                    </div>
                  )}
                  {p.category_code && (
                    <div className="flex gap-1">
                      <span className="font-medium shrink-0">EMDN:</span>
                      <span className="font-mono">{p.category_code}</span>
                      {p.category_depth != null && <span>(depth {p.category_depth})</span>}
                    </div>
                  )}
                  {p.match_score != null && (
                    <div className="flex gap-1">
                      <span className="font-medium shrink-0">{t('confidence')}:</span>
                      <span>{Math.round(p.match_score * 100)}%</span>
                    </div>
                  )}
                  {p.component_description && (
                    <div className="flex gap-1">
                      <span className="font-medium shrink-0">Component:</span>
                      <span>{p.component_description}</span>
                    </div>
                  )}
                  {PRICE_TYPE_LABELS[p.price_type] && (
                    <div className="flex gap-1">
                      <span className="font-medium shrink-0">Type:</span>
                      <span>{PRICE_TYPE_LABELS[p.price_type][locale] || PRICE_TYPE_LABELS[p.price_type].en}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  )
}
