'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'motion/react'
import { Pencil, Trash2, Eye, DollarSign, Globe, X } from 'lucide-react'
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
  const tActions = useTranslations('actions')
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Price comparison state
  const [comparisonProducts, setComparisonProducts] = useState<OfferingComparison[]>([])
  const [comparisonLoading, setComparisonLoading] = useState(true)
  const [comparisonError, setComparisonError] = useState(false)
  const [isPriceComparisonOpen, setIsPriceComparisonOpen] = useState(false)

  // Reference prices state
  const [referencePrices, setReferencePrices] = useState<ReferencePrice[]>([])
  const [referencePricesLoading, setReferencePricesLoading] = useState(true)
  const [isReferencePricesOpen, setIsReferencePricesOpen] = useState(false)

  // Reset mode and panels when sheet opens
  useEffect(() => {
    if (open) {
      setMode('view')
      setIsPriceComparisonOpen(false)
      setIsReferencePricesOpen(false)
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

  // Count of offerings (offerings are already for this product)
  const comparisonCount = comparisonProducts.length
  const showComparisonButton = !comparisonLoading && !comparisonError && comparisonCount > 0
  const showRefPricesButton = !referencePricesLoading && referencePrices.length > 0

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="!w-auto !max-w-none p-0">
          <div className="flex h-full">
            {/* Price Comparison Panel (slides in from left) */}
            <AnimatePresence>
              {isPriceComparisonOpen && (
                <motion.div
                  key="price-comparison-panel"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 800, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="h-full border-r border-border bg-background overflow-hidden"
                >
                  <div className="w-[800px] h-full flex flex-col">
                    <div className="px-4 py-4 border-b border-border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <h3 className="font-semibold text-sm">{t('priceComparison')}</h3>
                      </div>
                      <button
                        onClick={() => setIsPriceComparisonOpen(false)}
                        className="p-1 rounded hover:bg-muted transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                      <p className="text-sm text-muted-foreground mb-4">
                        {t('comparisonDesc')}
                      </p>
                      <PriceComparisonTable
                        products={comparisonProducts}
                        currentProductId={product?.id || ''}
                        isLoading={false}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* EU Reference Prices Panel (slides in from left) */}
            <AnimatePresence>
              {isReferencePricesOpen && (
                <motion.div
                  key="reference-prices-panel"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 800, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="h-full border-r border-border bg-background overflow-hidden"
                >
                  <div className="w-[800px] h-full flex flex-col">
                    <div className="px-4 py-4 border-b-2 border-purple-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-purple-600" />
                        <h3 className="font-semibold text-sm">{tRef('title')}</h3>
                        <span className="text-xs text-muted-foreground">
                          {referencePrices.length} {referencePrices.length === 1 ? tRef('price') : tRef('prices')}
                        </span>
                      </div>
                      <button
                        onClick={() => setIsReferencePricesOpen(false)}
                        className="p-1 rounded hover:bg-muted transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                      <p className="text-sm text-muted-foreground mb-4">
                        {tRef('description')}
                      </p>
                      <ReferencePricesPanel
                        prices={referencePrices}
                        offerings={product?.offerings}
                        productEmdnCode={product?.emdn_category?.code}
                      />
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

              {/* Floating Toggle Buttons (left edge) */}
              {mode === 'view' && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full flex flex-col gap-2">
                  {/* Price Comparison Toggle */}
                  {showComparisonButton && (
                    <button
                      onClick={() => {
                        setIsPriceComparisonOpen(!isPriceComparisonOpen)
                        if (!isPriceComparisonOpen) setIsReferencePricesOpen(false)
                      }}
                      className={`
                        flex items-center gap-1 px-2 py-3 rounded-l-lg
                        border border-r-0 border-border
                        transition-colors
                        ${isPriceComparisonOpen
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-background hover:bg-muted'
                        }
                      `}
                      title={isPriceComparisonOpen ? t('closeComparison') : t('openComparison')}
                    >
                      <DollarSign className={`h-4 w-4 ${isPriceComparisonOpen ? 'text-white' : 'text-green-600'}`} />
                      <span className={`text-sm font-medium ${isPriceComparisonOpen ? 'text-white' : 'text-green-600'}`}>
                        {comparisonCount}
                      </span>
                    </button>
                  )}

                  {/* EU Reference Prices Toggle */}
                  {showRefPricesButton && (
                    <button
                      onClick={() => {
                        setIsReferencePricesOpen(!isReferencePricesOpen)
                        if (!isReferencePricesOpen) setIsPriceComparisonOpen(false)
                      }}
                      className={`
                        flex items-center gap-1 px-2 py-3 rounded-l-lg
                        border border-r-0 border-border
                        transition-colors
                        ${isReferencePricesOpen
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-background hover:bg-muted'
                        }
                      `}
                      title={isReferencePricesOpen ? tRef('title') : tRef('title')}
                    >
                      <Globe className={`h-4 w-4 ${isReferencePricesOpen ? 'text-white' : 'text-purple-600'}`} />
                      <span className={`text-sm font-medium ${isReferencePricesOpen ? 'text-white' : 'text-purple-600'}`}>
                        {referencePrices.length}
                      </span>
                    </button>
                  )}
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
