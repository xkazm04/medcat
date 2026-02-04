'use client'

import { ProductWithRelations } from '@/lib/types'
import { EMDNBreadcrumb } from './emdn-breadcrumb'
import { RegulatoryInfo } from './regulatory-info'
import { ResearchPrompt } from './research-prompt'

interface ProductDetailProps {
  product: ProductWithRelations
}

export function ProductDetail({ product }: ProductDetailProps) {
  return (
    <div className="space-y-6 px-6 py-4 overflow-y-auto">
      {/* Section 1: Basic Info (SKU and description only - title is in sheet header) */}
      <div className="pb-6 border-b border-border">
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

      {/* Section 2.5: Manufacturer (only show if data exists) */}
      {(product.manufacturer_name || product.manufacturer_sku) && (
        <div className="pb-6 border-b border-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Manufacturer
              </p>
              <p className="text-base mt-1">
                {product.manufacturer_name || 'Not specified'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Manufacturer SKU
              </p>
              <p className="text-base mt-1">
                {product.manufacturer_sku || 'Not specified'}
              </p>
            </div>
          </div>
        </div>
      )}

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

      {/* Section 6: Research EU Pricing */}
      <div className="pt-2 border-t-2 border-blue-border">
        <p className="text-sm font-medium text-blue-subtle uppercase tracking-wide mb-1">
          Research EU Pricing
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Generate a prompt to find EU vendors and pricing via Perplexity AI
        </p>
        <ResearchPrompt product={product} />
      </div>
    </div>
  )
}
