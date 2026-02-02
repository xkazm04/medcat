'use client'

import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { DataTable } from './table/data-table'
import { createColumns } from './table/columns'
import { ProductSheet } from './product/product-sheet'
import { ExtractionSheet } from './extraction/extraction-sheet'
import type { ProductWithRelations, Vendor, Material, EMDNCategory } from '@/lib/types'

interface CatalogClientProps {
  products: ProductWithRelations[]
  vendors: Vendor[]
  materials: Material[]
  emdnCategories: EMDNCategory[]
  pageCount: number
  totalCount: number
  currentPage: number
  pageSize: number
}

export function CatalogClient({
  products,
  vendors,
  materials,
  emdnCategories,
  pageCount,
  totalCount,
  currentPage,
  pageSize,
}: CatalogClientProps) {
  const [selectedProduct, setSelectedProduct] = useState<ProductWithRelations | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [extractionSheetOpen, setExtractionSheetOpen] = useState(false)

  const columns = useMemo(
    () =>
      createColumns(
        // onViewProduct
        (product) => {
          setSelectedProduct(product)
          setSheetOpen(true)
        },
        // onEditProduct - opens sheet, ProductSheet will handle the mode internally
        (product) => {
          setSelectedProduct(product)
          setSheetOpen(true)
        },
        // onDeleteProduct - opens sheet with product selected
        (product) => {
          setSelectedProduct(product)
          setSheetOpen(true)
        }
      ),
    []
  )

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setExtractionSheetOpen(true)}
          className="flex items-center gap-2 bg-accent text-accent-foreground py-2 px-4 rounded-md font-medium hover:bg-accent/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>
      <DataTable
        columns={columns}
        data={products}
        pageCount={pageCount}
        totalCount={totalCount}
        currentPage={currentPage}
        pageSize={pageSize}
      />
      <ProductSheet
        product={selectedProduct}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        vendors={vendors}
        materials={materials}
        emdnCategories={emdnCategories}
      />
      <ExtractionSheet
        open={extractionSheetOpen}
        onOpenChange={setExtractionSheetOpen}
        vendors={vendors}
        materials={materials}
        emdnCategories={emdnCategories}
      />
    </>
  )
}
