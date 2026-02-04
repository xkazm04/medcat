'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { DataTable, useColumnVisibility } from './table/data-table'
import { useColumns } from './table/columns'
import { ProductSheet } from './product/product-sheet'
import { ExtractionSheet } from './extraction/extraction-sheet'
import { ActiveFilters } from './filters/active-filters'
import type { ProductWithRelations, Vendor, EMDNCategory } from '@/lib/types'
import type { CategoryNode } from '@/lib/queries'

interface CatalogClientProps {
  products: ProductWithRelations[]
  vendors: Vendor[]
  emdnCategories: EMDNCategory[]
  categories: CategoryNode[]
  manufacturers: string[]
  pageCount: number
  totalCount: number
  currentPage: number
  pageSize: number
}

export function CatalogClient({
  products,
  vendors,
  emdnCategories,
  categories,
  manufacturers,
  pageCount,
  totalCount,
  currentPage,
  pageSize,
}: CatalogClientProps) {
  const t = useTranslations()
  const [selectedProduct, setSelectedProduct] = useState<ProductWithRelations | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [extractionSheetOpen, setExtractionSheetOpen] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const searchParams = useSearchParams()
  const prevParamsRef = useRef(searchParams.toString())

  // Column visibility state with localStorage persistence
  const { visibility: columnVisibility, setVisibility: setColumnVisibility } = useColumnVisibility()

  // Track filter changes for loading state
  useEffect(() => {
    const currentParams = searchParams.toString()
    if (prevParamsRef.current !== currentParams) {
      setIsTransitioning(true)
      prevParamsRef.current = currentParams
    }
  }, [searchParams])

  // Reset transition state when new data arrives
  useEffect(() => {
    if (isTransitioning) {
      const timer = setTimeout(() => setIsTransitioning(false), 100)
      return () => clearTimeout(timer)
    }
  }, [products, isTransitioning])

  // Memoized callbacks for product actions
  const handleViewProduct = useCallback((product: ProductWithRelations) => {
    setSelectedProduct(product)
    setSheetOpen(true)
  }, [])

  const handleEditProduct = useCallback((product: ProductWithRelations) => {
    setSelectedProduct(product)
    setSheetOpen(true)
  }, [])

  const handleDeleteProduct = useCallback((product: ProductWithRelations) => {
    setSelectedProduct(product)
    setSheetOpen(true)
  }, [])

  // Use memoized columns hook
  const columns = useColumns(
    handleViewProduct,
    handleEditProduct,
    handleDeleteProduct,
    emdnCategories,
    columnVisibility,
    manufacturers
  )

  return (
    <>
      {/* Header with title and add button */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('catalog.products')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('catalog.productsFound', { count: totalCount })}
          </p>
        </div>
        <button
          onClick={() => setExtractionSheetOpen(true)}
          className="flex items-center gap-2 bg-button text-button-foreground py-2 px-4 rounded-md font-medium hover:bg-button-hover transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          {t('catalog.addProduct')}
        </button>
      </div>

      {/* Active filters bar */}
      <ActiveFilters
        vendors={vendors}
        categories={categories}
      />

      <motion.div
        animate={{ opacity: isTransitioning ? 0.5 : 1 }}
        transition={{ duration: 0.15 }}
        className="relative"
      >
        <DataTable
          columns={columns}
          data={products}
          pageCount={pageCount}
          totalCount={totalCount}
          currentPage={currentPage}
          pageSize={pageSize}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
        />
        <AnimatePresence>
          {isTransitioning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[1px] rounded-lg"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full"
                />
                <span className="text-sm">{t('common.loading')}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <ProductSheet
        product={selectedProduct}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        vendors={vendors}
        emdnCategories={emdnCategories}
      />
      <ExtractionSheet
        open={extractionSheetOpen}
        onOpenChange={setExtractionSheetOpen}
        vendors={vendors}
        emdnCategories={emdnCategories}
      />
    </>
  )
}
