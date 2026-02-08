'use client'

import { useState, useMemo } from 'react'
import { useLocale } from 'next-intl'
import { ChevronRight, Package, Users, Hash, Filter } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { formatPriceWithCurrency } from '@/lib/utils/format-price'
import type { SetGroupEntry, SetMatchedProduct } from '@/lib/types'

interface SetsExplorerProps {
  entries: SetGroupEntry[]
  matchedProducts: SetMatchedProduct[]
}

// Group entries by xc_subcode
interface SetGroup {
  code: string
  entries: SetGroupEntry[]
  manufacturers: string[]
  priceRange: { min: number; max: number }
  description: string | null
  emdnCode: string | null
  matchedProducts: SetMatchedProduct[]
}

export function SetsExplorer({ entries, matchedProducts }: SetsExplorerProps) {
  const locale = useLocale()
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [manufacturerFilter, setManufacturerFilter] = useState<string>('')

  // Build matched products lookup: reference_price_id -> products[]
  const matchesByPriceId = useMemo(() => {
    const map = new Map<string, SetMatchedProduct[]>()
    for (const mp of matchedProducts) {
      const list = map.get(mp.reference_price_id) || []
      list.push(mp)
      map.set(mp.reference_price_id, list)
    }
    return map
  }, [matchedProducts])

  // All unique manufacturers
  const allManufacturers = useMemo(() => {
    const mfrs = new Set<string>()
    for (const e of entries) {
      if (e.manufacturer_name) mfrs.add(e.manufacturer_name)
    }
    return [...mfrs].sort()
  }, [entries])

  // Filter entries by manufacturer
  const filteredEntries = useMemo(() => {
    if (!manufacturerFilter) return entries
    return entries.filter((e) => e.manufacturer_name === manufacturerFilter)
  }, [entries, manufacturerFilter])

  // Group filtered entries by xc_subcode
  const groups = useMemo(() => {
    const map = new Map<string, SetGroupEntry[]>()
    for (const e of filteredEntries) {
      const key = e.xc_subcode || e.source_code || 'unknown'
      const list = map.get(key) || []
      list.push(e)
      map.set(key, list)
    }

    const result: SetGroup[] = []
    for (const [code, groupEntries] of map) {
      const mfrs = [...new Set(groupEntries.map((e) => e.manufacturer_name).filter(Boolean))] as string[]
      const prices = groupEntries.map((e) => e.price_eur)
      const desc = groupEntries.find((e) => e.component_description)?.component_description ?? null
      const emdn = groupEntries.find((e) => e.emdn_code)?.emdn_code ?? null

      // Collect matched products for all entries in this group
      const groupMatches: SetMatchedProduct[] = []
      const seenProducts = new Set<string>()
      for (const e of groupEntries) {
        const matches = matchesByPriceId.get(e.id) || []
        for (const m of matches) {
          if (!seenProducts.has(m.product_id)) {
            seenProducts.add(m.product_id)
            groupMatches.push(m)
          }
        }
      }

      result.push({
        code,
        entries: groupEntries,
        manufacturers: mfrs,
        priceRange: { min: Math.min(...prices), max: Math.max(...prices) },
        description: desc,
        emdnCode: emdn,
        matchedProducts: groupMatches.sort((a, b) => b.match_score - a.match_score),
      })
    }

    return result.sort((a, b) => a.code.localeCompare(b.code))
  }, [filteredEntries, matchesByPriceId])

  // Stats
  const totalSets = filteredEntries.length
  const totalGroups = groups.length
  const totalMatched = new Set(matchedProducts.map((m) => m.product_id)).size

  const toggleGroup = (code: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Package className="w-4 h-4 text-purple-600" />
          <span><strong className="text-foreground">{totalSets}</strong> set prices</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Hash className="w-4 h-4 text-purple-600" />
          <span><strong className="text-foreground">{totalGroups}</strong> XC codes</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Users className="w-4 h-4 text-purple-600" />
          <span><strong className="text-foreground">{allManufacturers.length}</strong> manufacturers</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span><strong className="text-foreground">{totalMatched}</strong> matched products</span>
        </div>
      </div>

      {/* Manufacturer filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <select
          value={manufacturerFilter}
          onChange={(e) => setManufacturerFilter(e.target.value)}
          className="text-sm border border-border rounded-md px-2 py-1.5 bg-background"
        >
          <option value="">All manufacturers ({allManufacturers.length})</option>
          {allManufacturers.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        {manufacturerFilter && (
          <button
            onClick={() => setManufacturerFilter('')}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* Groups */}
      <div className="space-y-2">
        {groups.map((group) => {
          const isExpanded = expandedGroups.has(group.code)
          return (
            <div
              key={group.code}
              className="border border-border/60 rounded-lg overflow-hidden"
            >
              {/* Group header */}
              <button
                onClick={() => toggleGroup(group.code)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
              >
                <ChevronRight
                  className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-sm text-purple-700">{group.code}</span>
                    {group.emdnCode && (
                      <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {group.emdnCode}
                      </span>
                    )}
                    {group.description && (
                      <span className="text-xs text-muted-foreground truncate">{group.description}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                    <span>{group.entries.length} prices</span>
                    <span>{group.manufacturers.join(', ')}</span>
                    <span className="tabular-nums">
                      {formatPriceWithCurrency(group.priceRange.min, 'EUR', locale)}
                      {group.priceRange.min !== group.priceRange.max && (
                        <> – {formatPriceWithCurrency(group.priceRange.max, 'EUR', locale)}</>
                      )}
                    </span>
                    {group.matchedProducts.length > 0 && (
                      <span className="text-green-600">{group.matchedProducts.length} matched</span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full shrink-0">
                  {group.entries.length}
                </span>
              </button>

              {/* Expanded content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border/60">
                      {/* Reference prices table */}
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-muted/40">
                            <th className="px-3 py-1.5 text-left font-medium">Manufacturer</th>
                            <th className="px-3 py-1.5 text-right font-medium">Price (EUR)</th>
                            <th className="px-3 py-1.5 text-right font-medium">Original</th>
                            <th className="px-3 py-1.5 text-left font-medium">Type</th>
                            <th className="px-3 py-1.5 text-left font-medium">EMDN</th>
                            <th className="px-3 py-1.5 text-left font-medium">Description</th>
                            <th className="px-3 py-1.5 text-left font-medium">Valid from</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {group.entries.map((e) => (
                            <tr key={e.id} className="hover:bg-muted/20">
                              <td className="px-3 py-1.5 font-medium">{e.manufacturer_name || '—'}</td>
                              <td className="px-3 py-1.5 text-right tabular-nums font-semibold">
                                {formatPriceWithCurrency(e.price_eur, 'EUR', locale)}
                              </td>
                              <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                                {formatPriceWithCurrency(e.price_original, e.currency_original, locale)}
                              </td>
                              <td className="px-3 py-1.5">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-700">
                                  {e.component_type || e.price_scope || 'set'}
                                </span>
                              </td>
                              <td className="px-3 py-1.5 font-mono text-muted-foreground">
                                {e.emdn_code || '—'}
                              </td>
                              <td className="px-3 py-1.5 text-muted-foreground truncate max-w-[200px]" title={e.component_description || ''}>
                                {e.component_description || '—'}
                              </td>
                              <td className="px-3 py-1.5 text-muted-foreground tabular-nums">
                                {e.valid_from ? new Date(e.valid_from).getFullYear() : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Matched catalog products */}
                      {group.matchedProducts.length > 0 && (
                        <div className="border-t border-border/60 bg-green-50/30 px-4 py-3">
                          <h4 className="text-xs font-medium text-green-700 mb-2">
                            Matched catalog products ({group.matchedProducts.length})
                          </h4>
                          <div className="space-y-1">
                            {group.matchedProducts.map((mp) => (
                              <div
                                key={`${mp.reference_price_id}-${mp.product_id}`}
                                className="flex items-center gap-3 text-xs"
                              >
                                <span className="font-medium truncate max-w-[250px]">{mp.product_name}</span>
                                {mp.product_manufacturer && (
                                  <span className="text-muted-foreground">{mp.product_manufacturer}</span>
                                )}
                                {mp.sku && (
                                  <span className="font-mono text-[10px] text-muted-foreground">{mp.sku}</span>
                                )}
                                {mp.product_price != null && (
                                  <span className="tabular-nums text-muted-foreground">
                                    {formatPriceWithCurrency(mp.product_price, 'CZK', locale)}
                                  </span>
                                )}
                                <span className="text-[10px] text-green-600 ml-auto">
                                  {Math.round(mp.match_score * 100)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {groups.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>No set prices found</p>
        </div>
      )}
    </div>
  )
}
