'use client'

import { useState, useTransition, useEffect } from 'react'
import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { Check, Plus } from 'lucide-react'
import { createProductSchema } from '@/lib/schemas/product'
import { createProduct, createOffering } from '@/lib/actions/products'
import { createVendor } from '@/lib/actions/vendors'
import { formatServerError } from '@/lib/utils/format-server-error'
import { findSimilarProducts, type SimilarProduct } from '@/lib/actions/similarity'
import { SimilarProductsWarning } from './similar-products-warning'
import { toTitleCase } from '@/lib/utils/format-category'
import { useToast } from '@/components/ui/toast'
import type { ExtractedProduct } from '@/lib/schemas/extraction'

// Define input/output types from the schema factory (shape is always the same)
type ProductFormInput = z.input<ReturnType<typeof createProductSchema>>
type ProductFormOutput = z.output<ReturnType<typeof createProductSchema>>

interface ExtractionPreviewProps {
  extractedData: ExtractedProduct
  vendors: { id: string; name: string }[]
  emdnCategories: { id: string; code: string; name: string }[]
  onSuccess: () => void
  onSkip?: () => void
}

// Badge component to show match status for catalog fields
function StatusBadge({ matched }: { matched: boolean }) {
  const t = useTranslations('extraction')
  if (matched) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ml-2 bg-green-100 text-green-700">
        <Check className="h-2.5 w-2.5" />
        {t('matched')}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ml-2 bg-amber-100 text-amber-700">
      <Plus className="h-2.5 w-2.5" />
      {t('new')}
    </span>
  )
}

export function ExtractionPreview({
  extractedData,
  vendors,
  emdnCategories,
  onSuccess,
  onSkip,
}: ExtractionPreviewProps) {
  const t = useTranslations('extraction')
  const tp = useTranslations('product')
  const tr = useTranslations('regulatory')
  const tc = useTranslations('common')
  const { showToast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [similarProducts, setSimilarProducts] = useState<SimilarProduct[]>([])
  const [similarityLoading, setSimilarityLoading] = useState(false)

  // Match extracted vendor name to existing vendor
  const matchedVendor = vendors.find(
    (v) =>
      extractedData.vendor_name &&
      v.name.toLowerCase().includes(extractedData.vendor_name.toLowerCase())
  )

  // Better EMDN matching - try exact match first, then partial
  const matchedEmdn = emdnCategories.find(
    (c) => extractedData.suggested_emdn && c.code === extractedData.suggested_emdn
  ) || emdnCategories.find(
    (c) => extractedData.suggested_emdn && c.code.startsWith(extractedData.suggested_emdn)
  )

  // Check for similar products when extracted data changes
  useEffect(() => {
    // Skip if no meaningful data to search with
    if (!extractedData.name?.trim() && !extractedData.sku?.trim()) {
      setSimilarProducts([])
      setSimilarityLoading(false)
      return
    }

    let cancelled = false
    async function checkSimilarity() {
      setSimilarityLoading(true)
      const result = await findSimilarProducts(
        extractedData.name,
        extractedData.sku
      )
      if (!cancelled) {
        if (result.success && result.data) {
          setSimilarProducts(result.data)
        }
        setSimilarityLoading(false)
      }
    }
    checkSimilarity()
    return () => { cancelled = true }
  }, [extractedData.name, extractedData.sku])

  const tValidation = useTranslations('product.validation')
  const schema = createProductSchema({
    nameRequired: tValidation('nameRequired'),
    nameTooLong: tValidation('nameTooLong'),
    skuRequired: tValidation('skuRequired'),
    skuTooLong: tValidation('skuTooLong'),
    descriptionTooLong: tValidation('descriptionTooLong'),
    invalidCategoryId: tValidation('invalidCategoryId'),
    invalidMaterialId: tValidation('invalidMaterialId'),
    udiDiMaxLength: tValidation('udiDiMaxLength'),
    manufacturerRequired: tValidation('manufacturerRequired'),
    manufacturerNameTooLong: tValidation('manufacturerNameTooLong'),
    manufacturerSkuTooLong: tValidation('manufacturerSkuTooLong'),
  })

  const form = useForm<ProductFormInput, unknown, ProductFormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: extractedData.name,
      sku: extractedData.sku,
      description: extractedData.description ?? undefined,
      emdn_category_id: matchedEmdn?.id ?? undefined,
      udi_di: extractedData.udi_di ?? undefined,
      ce_marked: extractedData.ce_marked ?? false,
      mdr_class: extractedData.mdr_class ?? undefined,
      manufacturer_name: extractedData.manufacturer_name ?? undefined,
    },
  })

  const onSubmit: SubmitHandler<ProductFormOutput> = (data) => {
    setServerError(null)
    startTransition(async () => {
      const result = await createProduct(data)

      if (result.success && result.productId) {
        // Create offering from extracted vendor/price data if available
        const vendorName = extractedData.vendor_name
        const extractedPrice = extractedData.price
        if (vendorName) {
          // Resolve vendor: use matched or create new
          let vendorId = matchedVendor?.id
          if (!vendorId) {
            const vendorResult = await createVendor(vendorName)
            if (vendorResult.success && vendorResult.vendorId) {
              vendorId = vendorResult.vendorId
            }
          }
          if (vendorId) {
            await createOffering(result.productId, {
              vendor_id: vendorId,
              vendor_price: extractedPrice ?? undefined,
              currency: extractedData.price_currency ?? 'EUR',
              is_primary: true,
            })
          }
        }
        showToast(t('productSaved'), 'success')
        onSuccess()
      } else if (result.error) {
        setServerError(formatServerError(result.error))
      }
    })
  }

  const inputClass =
    'w-full border border-border rounded-md px-3 py-2 focus:ring-2 focus:ring-accent focus:outline-none bg-background text-sm'
  const labelClass = 'text-sm font-medium text-foreground flex items-center'
  const errorClass = 'text-xs text-red-500 mt-1'
  const sectionTitleClass = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b border-border pb-2 mb-3'

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="px-6 py-4 h-full overflow-y-auto"
    >
      {serverError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
          {serverError}
        </div>
      )}

      <SimilarProductsWarning
        products={similarProducts}
        isLoading={similarityLoading}
      />

      {/* Two-column layout with equal height */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left Column - Product Info */}
        <div className="flex flex-col space-y-3">
          <h3 className={sectionTitleClass}>{t('productInfo')}</h3>

          {/* Name */}
          <div>
            <label htmlFor="name" className={labelClass}>
              {tp('name')} <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              id="name"
              type="text"
              {...form.register('name')}
              className={inputClass}
            />
            {form.formState.errors.name && (
              <p className={errorClass}>{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* SKU */}
          <div>
            <label htmlFor="sku" className={labelClass}>
              {tp('sku')} <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              id="sku"
              type="text"
              {...form.register('sku')}
              className={inputClass}
            />
            {form.formState.errors.sku && (
              <p className={errorClass}>{form.formState.errors.sku.message}</p>
            )}
          </div>

          {/* Description with flex-grow to fill space */}
          <div className="flex-1 flex flex-col min-h-[180px]">
            <label htmlFor="description" className={labelClass}>
              {tp('description')}
            </label>
            <textarea
              id="description"
              {...form.register('description')}
              className={`${inputClass} flex-1 min-h-[140px] resize-none`}
            />
            {form.formState.errors.description && (
              <p className={errorClass}>
                {form.formState.errors.description.message}
              </p>
            )}
          </div>
        </div>

        {/* Right Column - Classification & Compliance */}
        <div className="flex flex-col space-y-5">
          {/* Manufacturer Section */}
          <div className="space-y-3">
            <h3 className={sectionTitleClass}>{tp('manufacturer')}</h3>

            {/* Manufacturer Name */}
            <div>
              <label htmlFor="manufacturer_name" className={labelClass}>
                {tp('manufacturer')} <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                id="manufacturer_name"
                type="text"
                {...form.register('manufacturer_name')}
                className={inputClass}
                placeholder={tp('manufacturer')}
              />
              {form.formState.errors.manufacturer_name && (
                <p className={errorClass}>
                  {form.formState.errors.manufacturer_name.message}
                </p>
              )}
            </div>

            {/* Manufacturer SKU */}
            <div>
              <label htmlFor="manufacturer_sku" className={labelClass}>
                {tp('manufacturerSku')}
              </label>
              <input
                id="manufacturer_sku"
                type="text"
                {...form.register('manufacturer_sku')}
                className={inputClass}
              />
            </div>

            {/* Extracted distributor info (read-only) */}
            {extractedData.vendor_name && (
              <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                <p className="text-xs font-medium text-blue-700 mb-1">{t('distributorInfo')}</p>
                <p className="text-sm text-blue-900">
                  {extractedData.vendor_name}
                  {matchedVendor && <StatusBadge matched={true} />}
                  {!matchedVendor && <StatusBadge matched={false} />}
                </p>
                {extractedData.price != null && (
                  <p className="text-xs text-blue-700 mt-0.5">
                    {t('price')}: {extractedData.price} {extractedData.price_currency ?? 'EUR'}
                  </p>
                )}
                <p className="text-[10px] text-blue-600 mt-1 italic">
                  {t('offeringCreatedAutomatically')}
                </p>
              </div>
            )}
          </div>

          {/* EMDN Classification Section */}
          <div className="space-y-3">
            <h3 className={sectionTitleClass}>{t('emdnClassificationTitle')}</h3>

            <div>
              <label htmlFor="emdn_category_id" className={labelClass}>
                {tp('emdnCategory')}
                {extractedData.suggested_emdn && <StatusBadge matched={!!matchedEmdn} />}
              </label>
              <select
                id="emdn_category_id"
                {...form.register('emdn_category_id')}
                className={inputClass}
              >
                <option value="">{tp('selectCategory')}</option>
                {emdnCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.code} - {toTitleCase(category.name)}
                  </option>
                ))}
              </select>
              {/* Show suggested code if no match */}
              {extractedData.suggested_emdn && !matchedEmdn && (
                <p className="text-xs text-amber-600 mt-1">
                  {t('suggestedCode', { code: extractedData.suggested_emdn })}
                </p>
              )}
              {/* Show matched category name for confirmation */}
              {matchedEmdn && (
                <p className="text-xs text-green-600 mt-1">
                  {toTitleCase(matchedEmdn.name)}
                </p>
              )}
            </div>
          </div>

          {/* Regulatory Section with consistent heights */}
          <div className="space-y-3">
            <h3 className={sectionTitleClass}>{t('regulatoryCompliance')}</h3>

            <div className="grid grid-cols-2 gap-3">
              {/* CE Marked */}
              <div>
                <label htmlFor="ce_marked" className={`${labelClass} mb-2`}>
                  {tr('ceMarked')}
                </label>
                <div className="flex items-center gap-3 h-[38px] px-3 border border-border rounded-md bg-muted/30">
                  <input
                    id="ce_marked"
                    type="checkbox"
                    {...form.register('ce_marked')}
                    className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                  />
                  <span className="text-sm text-muted-foreground">
                    {form.watch('ce_marked') ? tp('yes') : tp('no')}
                  </span>
                </div>
              </div>

              {/* MDR Class */}
              <div>
                <label htmlFor="mdr_class" className={`${labelClass} mb-2`}>
                  {tr('mdrClass')}
                </label>
                <select
                  id="mdr_class"
                  {...form.register('mdr_class')}
                  className={`${inputClass} h-[38px]`}
                >
                  <option value="">{tp('selectClass')}</option>
                  <option value="I">I</option>
                  <option value="IIa">IIa</option>
                  <option value="IIb">IIb</option>
                  <option value="III">III</option>
                </select>
              </div>
            </div>

            {/* UDI-DI */}
            <div>
              <label htmlFor="udi_di" className={labelClass}>
                {tp('udiDi')}
              </label>
              <input
                id="udi_di"
                type="text"
                maxLength={14}
                {...form.register('udi_di')}
                className={inputClass}
                placeholder={tp('udiDiPlaceholder')}
              />
              {form.formState.errors.udi_di && (
                <p className={errorClass}>{form.formState.errors.udi_di.message}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Buttons - Full width at bottom */}
      <div className="flex gap-3 pt-6 mt-6 border-t border-border">
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="flex-1 border border-border text-muted-foreground py-2.5 px-4 rounded-md font-medium hover:bg-muted transition-colors"
          >
            {t('skip')}
          </button>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 bg-button text-button-foreground py-2.5 px-4 rounded-md font-medium hover:bg-button-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? tc('saving') : t('saveToCatalog')}
        </button>
      </div>

      {/* Classification Rationale */}
      {extractedData.emdn_rationale && (
        <div className="mt-6 p-4 bg-muted/30 border border-border rounded-lg">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            {t('emdnRationaleTitle')}
          </h4>
          <p className="text-sm text-foreground leading-relaxed">
            {extractedData.emdn_rationale}
          </p>
          {extractedData.suggested_emdn && (
            <p className="text-xs text-muted-foreground mt-2">
              {t('suggestedCode', { code: extractedData.suggested_emdn })}
            </p>
          )}
        </div>
      )}
    </form>
  )
}
