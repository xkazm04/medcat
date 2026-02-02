'use client'

import { useState, useEffect } from 'react'
import { ProductWithRelations } from '@/lib/types'
import { EMDNBreadcrumb } from './emdn-breadcrumb'
import { RegulatoryInfo } from './regulatory-info'
import {
  getProductPriceComparison,
  type ProductPriceComparison,
} from '@/lib/actions/similarity'
import { PriceComparisonTable } from '@/components/comparison/price-comparison-table'

interface ProductDetailProps {
  product: ProductWithRelations
}

export function ProductDetail({ product }: ProductDetailProps) {
  const [comparisonProducts, setComparisonProducts] = useState<
    ProductPriceComparison[]
  >([])
  const [comparisonLoading, setComparisonLoading] = useState(true)

  useEffect(() => {
    async function fetchComparison() {
      setComparisonLoading(true)
      const result = await getProductPriceComparison(product.id)
      if (result.success && result.data) {
        setComparisonProducts(result.data)
      }
      setComparisonLoading(false)
    }
    fetchComparison()
  }, [product.id])

  return (
    <div className="space-y-6 px-6 py-4 overflow-y-auto">
      {/* Section 1: Basic Info */}
      <div className="pb-6 border-b border-border">
        <h2 className="text-xl font-semibold">{product.name}</h2>
        <p className="text-muted-foreground">{product.sku}</p>
        {product.description && (
          <p className="mt-3 text-base">{product.description}</p>
        )}
      </div>

      {/* Section 2: Vendor & Pricing */}
      <div className="pb-6 border-b border-border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Vendor
            </p>
            <p className="text-base mt-1">
              {product.vendor?.name || 'No vendor'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Price
            </p>
            <p className="text-base mt-1">
              {product.price !== null
                ? `${product.price.toLocaleString('cs-CZ')} CZK`
                : 'Price not set'}
            </p>
          </div>
        </div>
      </div>

      {/* Section 3: Material */}
      <div className="pb-6 border-b border-border">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Material
        </p>
        <p className="text-base mt-1">
          {product.material?.name || 'Not specified'}
        </p>
      </div>

      {/* Section 4: EMDN Classification */}
      <div className="pb-6 border-b border-border">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
          EMDN Classification
        </p>
        <EMDNBreadcrumb
          path={product.emdn_category?.path ?? null}
          categoryName={product.emdn_category?.name || 'Unknown'}
        />
      </div>

      {/* Section 5: Regulatory Information */}
      <div className="pb-6 border-b border-border">
        <RegulatoryInfo
          udiDi={product.udi_di ?? null}
          ceMarked={product.ce_marked ?? false}
          mdrClass={product.mdr_class ?? null}
        />
      </div>

      {/* Section 6: Price Comparison */}
      <div className="pt-2 border-t-2 border-green-border">
        <p className="text-sm font-medium text-green-subtle uppercase tracking-wide mb-1">
          Price Comparison
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Same or similar product from other vendors
        </p>
        <PriceComparisonTable
          products={comparisonProducts}
          currentProductId={product.id}
          isLoading={comparisonLoading}
        />
      </div>
    </div>
  )
}
