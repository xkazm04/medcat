'use client'

import { useTranslations, useLocale } from 'next-intl'
import { ProductWithRelations } from '@/lib/types'
import { EMDNBreadcrumb } from './emdn-breadcrumb'
import { RegulatoryInfo } from './regulatory-info'
import { ResearchPrompt } from './research-prompt'
import { formatPrice } from '@/lib/utils/format-price'

interface ProductDetailProps {
  product: ProductWithRelations
}

export function ProductDetail({ product }: ProductDetailProps) {
  const t = useTranslations('product')
  const tc = useTranslations('common')
  const tResearch = useTranslations('research')
  const locale = useLocale()

  // Build consolidated product info line
  const infoItems: string[] = []
  if (product.manufacturer_name) infoItems.push(product.manufacturer_name)
  const offeringCount = product.offerings?.length ?? 0
  if (offeringCount > 0) {
    const prices = product.offerings.map(o => o.vendor_price).filter((p): p is number => p !== null)
    if (prices.length > 0) {
      const minPrice = Math.min(...prices)
      const maxPrice = Math.max(...prices)
      if (minPrice === maxPrice) {
        infoItems.push(formatPrice(minPrice, locale))
      } else {
        infoItems.push(`${formatPrice(minPrice, locale)} – ${formatPrice(maxPrice, locale)}`)
      }
    }
    infoItems.push(`${offeringCount} distributor${offeringCount !== 1 ? 's' : ''}`)
  }

  return (
    <div className="space-y-6 px-6 py-4 overflow-y-auto">
      {/* Section 1: Product Info - consolidated */}
      <div className="pb-6 border-b border-border">
        <p className="text-sm text-muted-foreground font-mono">{product.sku}</p>
        {infoItems.length > 0 && (
          <p className="mt-1 text-base font-medium">
            {infoItems.join(' · ')}
          </p>
        )}
        {product.description && (
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{product.description}</p>
        )}
      </div>

      {/* Section 2: EMDN Classification */}
      <div className="pb-6 border-b border-border">
        <EMDNBreadcrumb
          path={product.emdn_category?.path ?? null}
          categoryName={product.emdn_category?.name || tc('unknown')}
        />
      </div>

      {/* Section 3: Regulatory Information */}
      <div className="pb-6 border-b border-border">
        <RegulatoryInfo
          udiDi={product.udi_di ?? null}
          ceMarked={product.ce_marked ?? false}
          mdrClass={product.mdr_class ?? null}
        />
      </div>

      {/* Section 4: Research EU Pricing */}
      <div className="pt-2 border-t-2 border-blue-border">
        <p className="text-sm font-medium text-blue-subtle uppercase tracking-wide mb-3">
          {tResearch('title')}
        </p>
        <ResearchPrompt product={product} />
      </div>
    </div>
  )
}
