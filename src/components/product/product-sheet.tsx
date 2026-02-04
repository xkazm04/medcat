'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'motion/react'
import { Pencil, Trash2, Eye, DollarSign, X } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ProductDetail } from './product-detail'
import { ProductForm } from './product-form'
import { DeleteDialog } from './delete-dialog'
import { PriceComparisonTable } from '@/components/comparison/price-comparison-table'
import {
  getProductPriceComparison,
  type ProductPriceComparison,
} from '@/lib/actions/similarity'
import type { ProductWithRelations, Vendor, EMDNCategory } from '@/lib/types'

interface ProductSheetProps {
  product: ProductWithRelations | null
  open: boolean
  onOpenChange: (open: boolean) => void
  vendors: Vendor[]
  emdnCategories: EMDNCategory[]
}

export function ProductSheet({
  product,
  open,
  onOpenChange,
  vendors,
  emdnCategories,
}: ProductSheetProps) {
  const t = useTranslations('product')
  const tActions = useTranslations('actions')
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [comparisonProducts, setComparisonProducts] = useState<ProductPriceComparison[]>([])
  const [comparisonLoading, setComparisonLoading] = useState(true)
  const [comparisonError, setComparisonError] = useState(false)
  const [isPriceComparisonOpen, setIsPriceComparisonOpen] = useState(false)

  // Reset mode and comparison panel when sheet opens
  useEffect(() => {
    if (open) {
      setMode('view')
      setIsPriceComparisonOpen(false)
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

  // Count of comparable products (excluding current product)
  const comparisonCount = comparisonProducts.filter(p => p.id !== product?.id).length
  const showComparisonButton = !comparisonLoading && !comparisonError && comparisonCount > 0

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="!w-auto !max-w-none p-0">
          <div className="flex h-full">
            {/* Price Comparison Panel (slides in from right) */}
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
                    vendors={vendors.map((v) => ({ id: v.id, name: v.name }))}
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

              {/* Price Comparison Toggle Button (floating on left edge) */}
              {showComparisonButton && mode === 'view' && (
                <button
                  onClick={() => setIsPriceComparisonOpen(!isPriceComparisonOpen)}
                  className={`
                    absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full
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
