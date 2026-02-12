'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { motion, AnimatePresence } from 'motion/react'
import { Pencil, Trash2, Eye, DollarSign, Globe, X, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ProductDetail } from './product-detail'
import { ProductForm } from './product-form'
import { DeleteDialog } from './delete-dialog'
import { ReferencePricesPanel } from './reference-prices'
import { PriceComparisonTable } from '@/components/comparison/price-comparison-table'
import {
  getProductPriceComparison,
  type OfferingComparison,
} from '@/lib/actions/similarity'
import { getReferencePricesForProduct } from '@/lib/actions/reference-prices'
import { formatPriceWithCurrency } from '@/lib/utils/format-price'
import type { ProductWithRelations, EMDNCategory, ReferencePrice } from '@/lib/types'

interface ProductSheetProps {
  product: ProductWithRelations | null
  open: boolean
  onOpenChange: (open: boolean) => void
  emdnCategories: EMDNCategory[]
}

export function ProductSheet({
  product,
  open,
  onOpenChange,
  emdnCategories,
}: ProductSheetProps) {
  const t = useTranslations('product')
  const tRef = useTranslations('referencePricing')
  const tComp = useTranslations('comparison')
  const tActions = useTranslations('actions')
  const locale = useLocale()
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Price comparison state
  const [comparisonProducts, setComparisonProducts] = useState<OfferingComparison[]>([])
  const [comparisonLoading, setComparisonLoading] = useState(true)
  const [comparisonError, setComparisonError] = useState(false)

  // Reference prices state
  const [referencePrices, setReferencePrices] = useState<ReferencePrice[]>([])
  const [referencePricesLoading, setReferencePricesLoading] = useState(true)

  // Unified pricing panel state
  const [isPricingOpen, setIsPricingOpen] = useState(false)

  // Reset mode and panel when sheet opens
  useEffect(() => {
    if (open) {
      setMode('view')
      setIsPricingOpen(false)
    }
  }, [open])

  // Fetch price comparison when product changes
  useEffect(() => {
    if (!product?.id || !open) {
      setComparisonProducts([])
      setComparisonLoading(false)
      return
    }

    async function fetchComparison() {
      setComparisonLoading(true)
      setComparisonError(false)
      const result = await getProductPriceComparison(product!.id)
      if (result.success && result.data) {
        setComparisonProducts(result.data)
      } else {
        setComparisonError(true)
      }
      setComparisonLoading(false)
    }
    fetchComparison()
  }, [product?.id, open])

  // Fetch reference prices when product changes
  useEffect(() => {
    if (!product?.id || !open) {
      setReferencePrices([])
      setReferencePricesLoading(false)
      return
    }

    async function fetchRefPrices() {
      setReferencePricesLoading(true)
      const result = await getReferencePricesForProduct(product!.id)
      if (result.success && result.data) {
        setReferencePrices(result.data)
      }
      setReferencePricesLoading(false)
    }
    fetchRefPrices()
  }, [product?.id, open])

  // Derived counts
  const comparisonCount = comparisonProducts.length
  const hasOfferings = !comparisonLoading && !comparisonError && comparisonCount > 0
  const hasRefPrices = !referencePricesLoading && referencePrices.length > 0
  const totalPricingCount = comparisonCount + referencePrices.length
  const showPricingButton = hasOfferings || hasRefPrices || comparisonError

  // Pricing verdict computation
  const verdict = useMemo(() => {
    if (!hasOfferings || !hasRefPrices) return null

    // Get offering prices
    const offeringPrices = comparisonProducts
      .map(o => o.vendor_price)
      .filter((p): p is number => p !== null)
    if (offeringPrices.length === 0) return null

    // Get component-scope reference prices (most comparable)
    const componentRefPrices = referencePrices
      .filter(p => p.price_scope === 'component')
      .map(p => p.price_eur)

    // Fall back to all reference prices if no component-scope
    const refPricesToUse = componentRefPrices.length > 0
      ? componentRefPrices
      : referencePrices.map(p => p.price_eur)

    if (refPricesToUse.length === 0) return null

    const offeringMin = Math.min(...offeringPrices)
    const offeringMax = Math.max(...offeringPrices)
    const refMin = Math.min(...refPricesToUse)
    const refMax = Math.max(...refPricesToUse)

    if (offeringMin > refMax) {
      const pct = Math.round(((offeringMin - refMax) / refMax) * 100)
      return { type: 'above' as const, pct, offeringMin, offeringMax, refMin, refMax, isComponentScope: componentRefPrices.length > 0 }
    }
    if (offeringMax < refMin) {
      const pct = Math.round(((refMin - offeringMax) / refMin) * 100)
      return { type: 'below' as const, pct, offeringMin, offeringMax, refMin, refMax, isComponentScope: componentRefPrices.length > 0 }
    }
    return { type: 'within' as const, pct: 0, offeringMin, offeringMax, refMin, refMax, isComponentScope: componentRefPrices.length > 0 }
  }, [hasOfferings, hasRefPrices, comparisonProducts, referencePrices])

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="!w-auto !max-w-none p-0">
          <div className="flex h-full">
            {/* Unified Pricing Overview Panel */}
            <AnimatePresence>
              {isPricingOpen && (
                <motion.div
                  key="pricing-panel"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 800, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="h-full border-r border-border bg-background overflow-hidden"
                >
                  <div className="w-[800px] h-full flex flex-col">
                    {/* Panel header */}
                    <div className="px-4 py-4 border-b-2 border-green-border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <h3 className="font-semibold text-sm">{t('pricingOverview')}</h3>
                        {hasOfferings && (
                          <span className="text-[10px] font-medium bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                            {comparisonCount} {comparisonCount === 1 ? tComp('offering') : tComp('offerings')}
                          </span>
                        )}
                        {hasRefPrices && (
                          <span className="text-[10px] font-medium bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">
                            {referencePrices.length} {tRef('refLabel')}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => setIsPricingOpen(false)}
                        className="p-1 rounded hover:bg-muted transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto">
                      {/* Section 1: Distributor Offerings */}
                      {(hasOfferings || comparisonError) && (
                        <div className="p-4 border-b border-border">
                          <div className="flex items-center gap-2 mb-3">
                            <DollarSign className="h-3.5 w-3.5 text-green-600" />
                            <h4 className="font-semibold text-xs uppercase tracking-wide text-green-700">{t('priceComparison')}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {t('comparisonDesc')}
                          </p>
                          {comparisonError ? (
                            <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                              <AlertTriangle className="h-4 w-4 shrink-0" />
                              {tComp('loadError')}
                            </div>
                          ) : (
                            <PriceComparisonTable
                              products={comparisonProducts}
                              currentProductId={product?.id || ''}
                              isLoading={false}
                            />
                          )}
                        </div>
                      )}

                      {/* Section 2: Pricing Verdict */}
                      {verdict && (
                        <div className={`px-4 py-3 border-b border-border ${
                          verdict.type === 'above' ? 'bg-red-50' :
                          verdict.type === 'below' ? 'bg-green-50' :
                          'bg-blue-50'
                        }`}>
                          <div className="flex items-center gap-2">
                            {verdict.type === 'above' && <TrendingUp className="h-4 w-4 text-red-600" />}
                            {verdict.type === 'below' && <TrendingDown className="h-4 w-4 text-green-600" />}
                            {verdict.type === 'within' && <Minus className="h-4 w-4 text-blue-600" />}
                            <span className={`text-sm font-semibold ${
                              verdict.type === 'above' ? 'text-red-700' :
                              verdict.type === 'below' ? 'text-green-700' :
                              'text-blue-700'
                            }`}>
                              {verdict.type === 'above' && `${t('verdictAbove')} (+${verdict.pct}%)`}
                              {verdict.type === 'below' && `${t('verdictBelow')} (-${verdict.pct}%)`}
                              {verdict.type === 'within' && t('verdictWithin')}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {t('verdictDetail', {
                              offerRange: verdict.offeringMin === verdict.offeringMax
                                ? formatPriceWithCurrency(verdict.offeringMin, 'EUR', locale)
                                : `${formatPriceWithCurrency(verdict.offeringMin, 'EUR', locale)} – ${formatPriceWithCurrency(verdict.offeringMax, 'EUR', locale)}`,
                              refRange: verdict.refMin === verdict.refMax
                                ? formatPriceWithCurrency(verdict.refMin, 'EUR', locale)
                                : `${formatPriceWithCurrency(verdict.refMin, 'EUR', locale)} – ${formatPriceWithCurrency(verdict.refMax, 'EUR', locale)}`,
                            })}
                            {!verdict.isComponentScope && (
                              <span className="ml-1 italic">({t('verdictMixedScope')})</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Section 3: EU Reference Prices */}
                      {hasRefPrices && (
                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Globe className="h-3.5 w-3.5 text-purple-600" />
                            <h4 className="font-semibold text-xs uppercase tracking-wide text-purple-700">{tRef('title')}</h4>
                            <span className="text-xs text-muted-foreground">
                              {referencePrices.length} {referencePrices.length === 1 ? tRef('price') : tRef('prices')}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {tRef('description')}
                          </p>
                          <ReferencePricesPanel
                            prices={referencePrices}
                            offerings={product?.offerings}
                            productEmdnCode={product?.emdn_category?.code}
                          />
                        </div>
                      )}

                      {/* Empty state if nothing to show */}
                      {!hasOfferings && !comparisonError && !hasRefPrices && (
                        <div className="p-8 text-center text-muted-foreground">
                          <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">{t('noPricingData')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Product Detail Panel */}
            <div className="w-[500px] h-full flex flex-col relative">
              <SheetHeader className="px-6 py-4 border-b-2 border-green-border">
                <div className="flex items-start justify-between pr-8">
                  <SheetTitle className="text-lg font-semibold">
                    {product?.name || t('name')}
                  </SheetTitle>
                  <div className="flex items-center gap-2">
                    {mode === 'edit' && (
                      <button
                        onClick={() => setMode('view')}
                        className="p-2 rounded-md hover:bg-muted transition-colors"
                        title={tActions('viewMode')}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    {mode === 'view' && (
                      <button
                        onClick={() => setMode('edit')}
                        className="p-2 rounded-md hover:bg-muted transition-colors"
                        title={tActions('editMode')}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteDialogOpen(true)}
                      className="p-2 rounded-md hover:bg-muted transition-colors text-red-600"
                      title={tActions('deleteProduct')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </SheetHeader>

              {/* Content area */}
              <div className="flex-1 overflow-y-auto">
                {!product ? (
                  <div className="px-6 py-4 text-muted-foreground">
                    {t('noProductSelected')}
                  </div>
                ) : mode === 'view' ? (
                  <ProductDetail product={product} />
                ) : (
                  <ProductForm
                    product={product}
                    emdnCategories={emdnCategories.map((c) => ({
                      id: c.id,
                      code: c.code,
                      name: c.name,
                    }))}
                    onSuccess={() => {
                      setMode('view')
                    }}
                  />
                )}
              </div>

              {/* Floating Pricing Toggle Button (left edge) */}
              {mode === 'view' && showPricingButton && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full">
                  <button
                    onClick={() => setIsPricingOpen(!isPricingOpen)}
                    className={`
                      flex items-center gap-1 px-2 py-3 rounded-l-lg
                      border border-r-0 border-border
                      transition-colors
                      ${isPricingOpen
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-background hover:bg-muted'
                      }
                    `}
                    title={isPricingOpen ? t('closePricing') : t('openPricing')}
                  >
                    <DollarSign className={`h-4 w-4 ${isPricingOpen ? 'text-white' : 'text-green-600'}`} />
                    <span className={`text-sm font-medium ${isPricingOpen ? 'text-white' : 'text-green-600'}`}>
                      {totalPricingCount}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation dialog */}
      <DeleteDialog
        productId={product?.id || ''}
        productName={product?.name || ''}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onDeleted={() => {
          onOpenChange(false)
        }}
      />
    </>
  )
}
