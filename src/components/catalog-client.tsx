'use client'

import { useState, useCallback, useDeferredValue, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { DataTable, useColumnVisibility } from './table/data-table'
import { useColumnSizing } from './table/use-column-sizing'
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
  refPricePaths: string[]
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
  refPricePaths,
  pageCount,
  totalCount,
  currentPage,
  pageSize,
}: CatalogClientProps) {
  const t = useTranslations()
  const [selectedProduct, setSelectedProduct] = useState<ProductWithRelations | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [extractionSheetOpen, setExtractionSheetOpen] = useState(false)
  const searchParams = useSearchParams()

  // Column visibility state with localStorage persistence
  const { visibility: columnVisibility, setVisibility: setColumnVisibility } = useColumnVisibility()
  // Column sizing state with localStorage persistence
  const { columnSizing, setColumnSizing, resetColumnSizing } = useColumnSizing()

  // Use deferred value for smooth transitions - shows stale data while loading
  const deferredProducts = useDeferredValue(products)
  const isTransitioning = deferredProducts !== products

  // Memoized callback for opening product sheet (handles view, edit, and delete)
  const handleOpenProduct = useCallback((product: ProductWithRelations) => {
    setSelectedProduct(product)
    setSheetOpen(true)
  }, [])

  // Stabilize references that change identity on every server navigation
  // Stabilize references — use cheap string key instead of JSON.stringify
  const categoriesKey = useMemo(() => emdnCategories.map(c => c.id).join(','), [emdnCategories])
  const stableCategories = useMemo(() => emdnCategories, [categoriesKey])
  const manufacturersKey = useMemo(() => manufacturers.join(','), [manufacturers])
  const stableManufacturers = useMemo(() => manufacturers, [manufacturersKey])
  const refPricePathsKey = useMemo(() => refPricePaths.join(','), [refPricePaths])
  const stableRefPricePaths = useMemo(() => refPricePaths, [refPricePathsKey])

  // Use memoized columns hook
  const columns = useColumns(
    handleOpenProduct,
    handleOpenProduct,
    handleOpenProduct,
    stableCategories,
    columnVisibility,
    stableManufacturers,
    stableRefPricePaths
  )

  return (
    <>
      {/* Screen reader announcement for filter changes */}
      <div aria-live="polite" className="sr-only">
        {t('accessibility.showingProducts', { count: deferredProducts.length, total: totalCount })}
      </div>

      {/* Header with title and add button */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('catalog.products')}</h2>
          <p className="text-sm text-muted-foreground" data-testid="product-count">
            {t('catalog.productsFound', { count: totalCount })}
          </p>
        </div>
        <button
          onClick={() => setExtractionSheetOpen(true)}
          className="flex items-center gap-2 bg-button text-button-foreground py-2 px-4 rounded-md font-medium hover:bg-button-hover transition-all duration-150 shadow-md hover:shadow-lg active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          {t('catalog.addProduct')}
        </button>
      </div>

      {/* Active filters bar */}
      <ActiveFilters
        categories={categories}
      />

      {/* Data table with shimmer loading overlay */}
      <div className={`relative ${isTransitioning ? 'table-shimmer' : ''}`} data-table-container data-testid="product-table">
        <div
          className="transition-opacity duration-200"
          style={{ opacity: isTransitioning ? 0.7 : 1 }}
        >
          <DataTable
            columns={columns}
            data={deferredProducts}
            pageCount={pageCount}
            totalCount={totalCount}
            currentPage={currentPage}
            pageSize={pageSize}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
            columnSizing={columnSizing}
            onColumnSizingChange={setColumnSizing}
            onResetColumnSizing={resetColumnSizing}
          />
        </div>
      </div>
      <ProductSheet
        product={selectedProduct}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
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
