'use client'

import { useState, useMemo, useCallback } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import {
  ChevronRight,
  Package,
  Users,
  Hash,
  Filter,
  FlaskConical,
  CheckCircle2,
  Clock,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { formatPriceWithCurrency } from '@/lib/utils/format-price'
import { acceptDecomposition } from '@/lib/actions/sets'
import { ResearchModal } from './research-modal'
import type { SetGroupEntry, SetMatchedProduct } from '@/lib/types'
import type { ComponentDecomposition } from '@/lib/cli/types'

interface SetsExplorerProps {
  entries: SetGroupEntry[]
  matchedProducts: SetMatchedProduct[]
}

interface SetGroup {
  code: string
  entries: SetGroupEntry[]
  manufacturers: string[]
  priceRange: { min: number; max: number }
  description: string | null
  emdnCode: string | null
  matchedProducts: SetMatchedProduct[]
  scope: 'set' | 'procedure' | 'mixed'
  isDecomposed: boolean
}

type ScopeFilter = 'all' | 'set' | 'procedure'
type StatusFilter = 'all' | 'pending' | 'decomposed'
type SortKey = 'code' | 'description' | 'count' | 'priceMin' | 'matched' | 'scope' | 'status'
type SortDir = 'asc' | 'desc'

export function SetsExplorer({ entries, matchedProducts }: SetsExplorerProps) {
  const locale = useLocale()
  const t = useTranslations()
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [manufacturerFilter, setManufacturerFilter] = useState<string>('')
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('code')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  // Research modal state
  const [researchGroup, setResearchGroup] = useState<SetGroup | null>(null)
  const [decomposedGroups, setDecomposedGroups] = useState<Set<string>>(new Set())

  // Build matched products lookup
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

  // Filter entries
  const filteredEntries = useMemo(() => {
    if (!manufacturerFilter) return entries
    return entries.filter((e) => e.manufacturer_name === manufacturerFilter)
  }, [entries, manufacturerFilter])

  // Group by xc_subcode
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

      const scopes = new Set(groupEntries.map((e) => e.price_scope || 'set'))
      const scope: SetGroup['scope'] = scopes.size > 1 ? 'mixed' : (scopes.values().next().value as 'set' | 'procedure')

      const isDecomposed =
        decomposedGroups.has(code) ||
        groupEntries.some((e) => e.notes?.includes('[decomposed]') || e.extraction_method === 'ai_decomposition')

      result.push({
        code,
        entries: groupEntries,
        manufacturers: mfrs,
        priceRange: { min: Math.min(...prices), max: Math.max(...prices) },
        description: desc,
        emdnCode: emdn,
        matchedProducts: groupMatches.sort((a, b) => b.match_score - a.match_score),
        scope,
        isDecomposed,
      })
    }

    return result
  }, [filteredEntries, matchesByPriceId, decomposedGroups])

  // Apply scope + status filters, then sort
  const displayGroups = useMemo(() => {
    let result = groups

    if (scopeFilter !== 'all') {
      result = result.filter((g) => g.scope === scopeFilter || g.scope === 'mixed')
    }
    if (statusFilter === 'pending') {
      result = result.filter((g) => !g.isDecomposed)
    } else if (statusFilter === 'decomposed') {
      result = result.filter((g) => g.isDecomposed)
    }

    // Sort
    const dir = sortDir === 'asc' ? 1 : -1
    result = [...result].sort((a, b) => {
      switch (sortKey) {
        case 'code':
          return dir * a.code.localeCompare(b.code)
        case 'description':
          return dir * (a.description || '').localeCompare(b.description || '')
        case 'count':
          return dir * (a.entries.length - b.entries.length)
        case 'priceMin':
          return dir * (a.priceRange.min - b.priceRange.min)
        case 'matched':
          return dir * (a.matchedProducts.length - b.matchedProducts.length)
        case 'scope':
          return dir * a.scope.localeCompare(b.scope)
        case 'status':
          return dir * (Number(a.isDecomposed) - Number(b.isDecomposed))
        default:
          return 0
      }
    })

    return result
  }, [groups, scopeFilter, statusFilter, sortKey, sortDir])

  // Stats
  const totalEntries = filteredEntries.length
  const totalGroups = groups.length
  const totalMatched = new Set(matchedProducts.map((m) => m.product_id)).size
  const procedureCount = groups.filter((g) => g.scope === 'procedure').length
  const decomposedCount = groups.filter((g) => g.isDecomposed).length

  const toggleGroup = (code: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  // Handle accept from research modal
  const handleAccept = useCallback(
    async (result: ComponentDecomposition) => {
      if (!researchGroup) return

      const primary = [...researchGroup.entries].sort((a, b) => b.price_eur - a.price_eur)[0]

      const { success, error } = await acceptDecomposition({
        sourceEntryIds: researchGroup.entries.map((e) => e.id),
        components: result.components,
        procedureCost: result.procedure_cost,
        sourceEntry: {
          source_country: primary.source_country,
          source_name: primary.source_name,
          valid_from: primary.valid_from,
          source_code: primary.source_code,
          price_eur: primary.price_eur,
          price_original: primary.price_original,
          currency_original: primary.currency_original,
          xc_subcode: primary.xc_subcode,
        },
      })

      if (success) {
        setDecomposedGroups((prev) => new Set([...prev, researchGroup.code]))
      } else {
        console.error('Failed to accept decomposition:', error)
      }

      setResearchGroup(null)
    },
    [researchGroup]
  )

  return (
    <div className="space-y-5">
      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-5 text-sm">
        <StatItem icon={<Package className="w-4 h-4 text-purple-600" />} value={totalEntries} label={t('sets.stats.prices')} />
        <StatItem icon={<Hash className="w-4 h-4 text-purple-600" />} value={totalGroups} label={t('sets.stats.xcCodes')} />
        <StatItem icon={<Users className="w-4 h-4 text-purple-600" />} value={allManufacturers.length} label={t('sets.stats.manufacturers')} />
        <StatItem value={totalMatched} label={t('sets.stats.matchedProducts')} />
        {procedureCount > 0 && <StatItem value={procedureCount} label={t('sets.stats.procedure')} />}
        {decomposedCount > 0 && (
          <div className="flex items-center gap-1.5 text-green-600">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="text-sm"><strong>{decomposedCount}</strong> {t('sets.stats.decomposed')}</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Manufacturer filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={manufacturerFilter}
            onChange={(e) => setManufacturerFilter(e.target.value)}
            className="text-sm border border-border rounded-lg px-2.5 py-1.5 bg-background hover:border-border/80 transition-colors"
          >
            <option value="">{t('sets.filters.allManufacturers', { count: allManufacturers.length })}</option>
            {allManufacturers.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          {manufacturerFilter && (
            <button
              onClick={() => setManufacturerFilter('')}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              {t('sets.filters.clear')}
            </button>
          )}
        </div>

        {/* Scope filter tabs */}
        <FilterTabs
          options={['all', 'set', 'procedure'] as ScopeFilter[]}
          value={scopeFilter}
          onChange={(v) => setScopeFilter(v as ScopeFilter)}
        />

        {/* Status filter tabs */}
        <FilterTabs
          options={['all', 'pending', 'decomposed'] as StatusFilter[]}
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as StatusFilter)}
        />

        {/* Showing count */}
        <span className="text-xs text-muted-foreground ml-auto">
          {t('sets.filters.showing', { count: displayGroups.length, total: totalGroups })}
        </span>
      </div>

      {/* Table */}
      <div className="bg-background border border-border/60 rounded-lg shadow-md overflow-hidden ring-1 ring-border/10">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-muted/70 border-b-2 border-border/60 table-header-depth">
            <tr>
              <th className="w-[32px] px-2 py-2.5" />
              <SortableHeader label={t('sets.table.code')} sortKey="code" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} width="w-[100px]" />
              <SortableHeader label={t('sets.table.description')} sortKey="description" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
              <th className="w-[80px] px-3 py-2.5 text-left font-semibold text-[11px] uppercase tracking-wide text-muted-foreground">{t('sets.table.emdn')}</th>
              <th className="w-[100px] px-3 py-2.5 text-left font-semibold text-[11px] uppercase tracking-wide text-muted-foreground">{t('sets.table.mfrs')}</th>
              <SortableHeader label={t('sets.table.count')} sortKey="count" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} width="w-[50px]" align="text-center" />
              <SortableHeader label={t('sets.table.priceRange')} sortKey="priceMin" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} width="w-[140px]" align="text-right" />
              <SortableHeader label={t('sets.table.match')} sortKey="matched" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} width="w-[60px]" align="text-center" />
              <SortableHeader label={t('sets.table.scope')} sortKey="scope" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} width="w-[80px]" align="text-center" />
              <SortableHeader label={t('sets.table.status')} sortKey="status" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} width="w-[85px]" align="text-center" />
              <th className="w-[90px] px-3 py-2.5 text-center font-semibold text-[11px] uppercase tracking-wide text-muted-foreground">{t('sets.table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {displayGroups.map((group, idx) => {
              const isExpanded = expandedGroups.has(group.code)
              return (
                <GroupRow
                  key={group.code}
                  group={group}
                  index={idx}
                  isExpanded={isExpanded}
                  locale={locale}
                  t={t}
                  onToggle={() => toggleGroup(group.code)}
                  onResearch={() => setResearchGroup(group)}
                />
              )
            })}
          </tbody>
        </table>

        {displayGroups.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Package className="w-8 h-8 mx-auto mb-2.5 opacity-30" />
            <p className="text-sm">{t('sets.table.noSetPricesFound')}</p>
          </div>
        )}
      </div>

      {/* Research Modal */}
      {researchGroup && (
        <ResearchModal
          groupCode={researchGroup.code}
          entries={researchGroup.entries}
          matchedProducts={researchGroup.matchedProducts}
          onAccept={handleAccept}
          onClose={() => setResearchGroup(null)}
        />
      )}
    </div>
  )
}

// ─── Stat Item ───

function StatItem({ icon, value, label }: { icon?: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      {icon}
      <span className="text-sm">
        <strong className="text-foreground">{value}</strong> {label}
      </span>
    </div>
  )
}

// ─── Filter Tabs ───

function FilterTabs<T extends string>({ options, value, onChange }: { options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex items-center rounded-lg border border-border overflow-hidden text-xs">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-3 py-1.5 capitalize transition-colors border-r border-border last:border-r-0 ${
            value === opt
              ? 'bg-purple-100 text-purple-700 font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

// ─── Sortable Header ───

function SortableHeader({
  label,
  sortKey: key,
  currentKey,
  currentDir,
  onSort,
  width,
  align = 'text-left',
}: {
  label: string
  sortKey: SortKey
  currentKey: SortKey
  currentDir: SortDir
  onSort: (key: SortKey) => void
  width?: string
  align?: string
}) {
  const isActive = currentKey === key
  return (
    <th className={`${width || ''} px-3 py-2.5 ${align}`}>
      <button
        onClick={() => onSort(key)}
        className={`inline-flex items-center gap-1 text-[11px] uppercase tracking-wide transition-colors ${
          isActive ? 'font-bold text-purple-700' : 'font-semibold text-muted-foreground hover:text-foreground'
        }`}
      >
        {label}
        {isActive && currentDir === 'asc' ? (
          <ArrowUp className="w-3 h-3" />
        ) : isActive && currentDir === 'desc' ? (
          <ArrowDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-40" />
        )}
      </button>
    </th>
  )
}

// ─── Group Row ───

function GroupRow({
  group,
  index,
  isExpanded,
  locale,
  t,
  onToggle,
  onResearch,
}: {
  group: SetGroup
  index: number
  isExpanded: boolean
  locale: string
  t: ReturnType<typeof useTranslations>
  onToggle: () => void
  onResearch: () => void
}) {
  return (
    <>
      <tr
        className={`table-row-hover cursor-pointer transition-colors duration-150 hover:bg-green-light/30 ${
          isExpanded ? 'bg-purple-50/40' : index % 2 === 1 ? 'bg-gray-100/80' : 'bg-white'
        }`}
        onClick={onToggle}
      >
        <td className="px-2 py-3">
          <ChevronRight
            className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
          />
        </td>
        <td className="px-3 py-3">
          <span className="font-mono font-bold text-purple-700 text-[12px]">{group.code}</span>
        </td>
        <td className="px-3 py-3 text-muted-foreground truncate max-w-[260px]" title={group.description || ''}>
          {group.description || '—'}
        </td>
        <td className="px-3 py-3">
          {group.emdnCode ? (
            <span className="font-mono text-[10px] text-muted-foreground bg-muted/70 px-1.5 py-0.5 rounded">
              {group.emdnCode}
            </span>
          ) : (
            <span className="text-muted-foreground/40">—</span>
          )}
        </td>
        <td className="px-3 py-3 text-[10px] text-muted-foreground max-w-[100px] truncate" title={group.manufacturers.join(', ')}>
          {group.manufacturers.join(', ') || '—'}
        </td>
        <td className="px-3 py-3 text-center tabular-nums font-medium">{group.entries.length}</td>
        <td className="px-3 py-3 text-right tabular-nums">
          <span className="font-semibold">{formatPriceWithCurrency(group.priceRange.min, 'EUR', locale)}</span>
          {group.priceRange.min !== group.priceRange.max && (
            <span className="text-muted-foreground">
              {' – '}
              {formatPriceWithCurrency(group.priceRange.max, 'EUR', locale)}
            </span>
          )}
        </td>
        <td className="px-3 py-3 text-center">
          {group.matchedProducts.length > 0 ? (
            <span className="inline-flex items-center justify-center w-6 h-5 rounded-full bg-green-100 text-green-700 font-semibold text-[10px]">
              {group.matchedProducts.length}
            </span>
          ) : (
            <span className="text-muted-foreground/40">0</span>
          )}
        </td>
        <td className="px-3 py-3 text-center">
          <ScopeBadge scope={group.scope} />
        </td>
        <td className="px-3 py-3 text-center">
          <StatusBadge isDecomposed={group.isDecomposed} />
        </td>
        <td className="px-3 py-3 text-center">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onResearch()
            }}
            disabled={group.isDecomposed}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              group.isDecomposed
                ? 'bg-muted/60 text-muted-foreground/50 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm hover:shadow-md active:scale-[0.97]'
            }`}
          >
            <FlaskConical className="w-3 h-3" />
            {t('sets.actions.research')}
          </button>
        </td>
      </tr>

      {/* Expanded detail row */}
      <AnimatePresence>
        {isExpanded && (
          <tr>
            <td colSpan={11} className="p-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <ExpandedDetail group={group} locale={locale} t={t} />
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Expanded Detail ───

function ExpandedDetail({ group, locale, t }: { group: SetGroup; locale: string; t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="border-t-2 border-purple-200/60 bg-purple-50/20">
      {/* Reference prices sub-table */}
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-purple-100/30">
            <th className="px-3 py-2 text-left font-semibold text-[11px] uppercase tracking-wide text-purple-700/70 w-0 whitespace-nowrap">{t('sets.table.manufacturer')}</th>
            <th className="px-3 py-2 text-right font-semibold text-[11px] uppercase tracking-wide text-purple-700/70 w-0 whitespace-nowrap">{t('sets.table.priceEUR')}</th>
            <th className="px-3 py-2 text-left font-semibold text-[11px] uppercase tracking-wide text-purple-700/70 w-0 whitespace-nowrap">{t('sets.table.emdn')}</th>
            <th className="px-3 py-2 text-left font-semibold text-[11px] uppercase tracking-wide text-purple-700/70">{t('sets.table.description')}</th>
            <th className="px-3 py-2 text-left font-semibold text-[11px] uppercase tracking-wide text-purple-700/70 w-0 whitespace-nowrap">{t('sets.table.valid')}</th>
          </tr>
        </thead>
        <tbody>
          {group.entries.map((e, i) => (
            <tr key={e.id} className={`border-b border-purple-200/30 hover:bg-purple-100/20 transition-colors ${i % 2 === 1 ? 'bg-purple-50/40' : 'bg-white/60'}`}>
              <td className="px-3 py-2 font-medium whitespace-nowrap">{e.manufacturer_name || '—'}</td>
              <td className="px-3 py-2 text-right whitespace-nowrap">
                <div className="tabular-nums font-semibold">
                  {formatPriceWithCurrency(e.price_eur, 'EUR', locale)}
                </div>
                {e.currency_original?.toUpperCase() !== 'EUR' && e.price_original > 0 && (
                  <div className="tabular-nums text-[10px] text-muted-foreground">
                    {formatPriceWithCurrency(e.price_original, e.currency_original, locale)}
                  </div>
                )}
              </td>
              <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground whitespace-nowrap">{e.emdn_code || '—'}</td>
              <td className="px-3 py-2 text-muted-foreground truncate" title={e.component_description || ''}>
                {e.component_description || '—'}
              </td>
              <td className="px-3 py-2 text-muted-foreground tabular-nums">
                {e.valid_from ? new Date(e.valid_from).getFullYear() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Matched catalog products */}
      {group.matchedProducts.length > 0 && (
        <div className="border-t border-purple-200/40 bg-green-50/30 px-5 py-3">
          <h4 className="text-xs font-semibold text-green-700 mb-2">
            {t('sets.matchedProducts', { count: group.matchedProducts.length })}
          </h4>
          <div className="space-y-1.5">
            {group.matchedProducts.map((mp) => (
              <div key={`${mp.reference_price_id}-${mp.product_id}`} className="flex items-center gap-3 text-xs">
                <span className="font-medium truncate max-w-[260px]">{mp.product_name}</span>
                {mp.product_manufacturer && <span className="text-muted-foreground text-[11px]">{mp.product_manufacturer}</span>}
                {mp.sku && <span className="font-mono text-[10px] text-muted-foreground bg-muted/40 px-1 py-0.5 rounded">{mp.sku}</span>}
                {mp.product_min_price != null && (
                  <span className="tabular-nums text-muted-foreground">
                    {formatPriceWithCurrency(mp.product_min_price, 'EUR', locale)}
                  </span>
                )}
                {mp.product_offering_count > 0 && (
                  <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                    {mp.product_offering_count} {mp.product_offering_count === 1 ? 'offer' : 'offers'}
                  </span>
                )}
                <span className="inline-flex items-center justify-center w-8 h-4 rounded text-[10px] font-semibold text-green-700 bg-green-100 ml-auto">
                  {Math.round(mp.match_score * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Badge Components ───

function ScopeBadge({ scope }: { scope: SetGroup['scope'] }) {
  const t = useTranslations()
  const styles = {
    procedure: 'bg-blue-100 text-blue-700 ring-blue-200/60',
    mixed: 'bg-amber-100 text-amber-700 ring-amber-200/60',
    set: 'bg-purple-100 text-purple-700 ring-purple-200/60',
  }
  const labels = {
    procedure: t('sets.badges.procedure'),
    mixed: t('sets.badges.mixed'),
    set: t('sets.badges.set')
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ${styles[scope]}`}>
      {labels[scope]}
    </span>
  )
}

function StatusBadge({ isDecomposed }: { isDecomposed: boolean }) {
  const t = useTranslations()
  if (isDecomposed) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700 ring-1 ring-green-200/60">
        <CheckCircle2 className="w-3 h-3" />
        {t('sets.badges.done')}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted/70 text-muted-foreground ring-1 ring-border/40">
      <Clock className="w-3 h-3" />
      {t('sets.badges.pending')}
    </span>
  )
}
