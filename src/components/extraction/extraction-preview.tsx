'use client'

import { useState, useTransition, useEffect } from 'react'
import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { Check, Plus } from 'lucide-react'
import { productSchema } from '@/lib/schemas/product'
import { createProduct } from '@/lib/actions/products'
import { createVendor } from '@/lib/actions/vendors'
import { findSimilarProducts, type SimilarProduct } from '@/lib/actions/similarity'
import { SimilarProductsWarning } from './similar-products-warning'
import type { ExtractedProduct } from '@/lib/schemas/extraction'

// Define input type for the form (before Zod transforms)
type ProductFormInput = z.input<typeof productSchema>
// Define output type after validation
type ProductFormOutput = z.output<typeof productSchema>

// Special value to indicate a new vendor should be created
const NEW_VENDOR_PREFIX = '__new__:'

interface ExtractionPreviewProps {
  extractedData: ExtractedProduct
  vendors: { id: string; name: string }[]
  emdnCategories: { id: string; code: string; name: string }[]
  onSuccess: () => void
  onCancel: () => void
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
  onCancel,
}: ExtractionPreviewProps) {
  const t = useTranslations('extraction')
  const tp = useTranslations('product')
  const tr = useTranslations('regulatory')
  const tc = useTranslations('common')
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [similarProducts, setSimilarProducts] = useState<SimilarProduct[]>([])
  const [similarityLoading, setSimilarityLoading] = useState(true)

  // Match extracted names to database IDs (case-insensitive partial match)
  const matchedVendor = vendors.find(
    (v) =>
      extractedData.vendor_name &&
      v.name.toLowerCase().includes(extractedData.vendor_name.toLowerCase())
  )

  // Improvement 5: Better EMDN matching - try exact match first, then partial
  const matchedEmdn = emdnCategories.find(
    (c) => extractedData.suggested_emdn && c.code === extractedData.suggested_emdn
  ) || emdnCategories.find(
    (c) => extractedData.suggested_emdn && c.code.startsWith(extractedData.suggested_emdn)
  )

  // Check for similar products when component mounts or extracted data changes
  useEffect(() => {
    async function checkSimilarity() {
      setSimilarityLoading(true)
      const result = await findSimilarProducts(
        extractedData.name,
        extractedData.sku
      )
      if (result.success && result.data) {
        setSimilarProducts(result.data)
      }
      setSimilarityLoading(false)
    }
    checkSimilarity()
  }, [extractedData.name, extractedData.sku])

  // Determine default vendor value: matched ID, or new vendor prefix if extracted but not matched
  const defaultVendorId = matchedVendor?.id
    ?? (extractedData.vendor_name ? `${NEW_VENDOR_PREFIX}${extractedData.vendor_name}` : undefined)

  const form = useForm<ProductFormInput, unknown, ProductFormOutput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: extractedData.name,
      sku: extractedData.sku,
      description: extractedData.description ?? undefined,
      price: extractedData.price ?? undefined,
      vendor_id: defaultVendorId,
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
      let vendorId = data.vendor_id || ''

      // Check if we need to create a new vendor
      if (vendorId.startsWith(NEW_VENDOR_PREFIX)) {
        const newVendorName = vendorId.slice(NEW_VENDOR_PREFIX.length)
        const vendorResult = await createVendor(newVendorName)
        if (!vendorResult.success || !vendorResult.vendorId) {
          setServerError(vendorResult.error || 'Failed to create vendor')
          return
        }
        vendorId = vendorResult.vendorId
      }

      const formData = new FormData()
      formData.append('name', data.name)
      formData.append('sku', data.sku)
      formData.append('description', data.description || '')
      formData.append('price', data.price?.toString() || '')
      formData.append('vendor_id', vendorId)
      formData.append('emdn_category_id', data.emdn_category_id || '')
      formData.append('material_id', data.material_id || '')
      formData.append('udi_di', data.udi_di || '')
      formData.append('ce_marked', data.ce_marked ? 'true' : 'false')
      formData.append('mdr_class', data.mdr_class || '')
      formData.append('manufacturer_name', data.manufacturer_name || '')

      const result = await createProduct(formData)

      if (result.success) {
        onSuccess()
      } else if (result.error) {
        const errorMessage =
          result.error.formErrors?.[0] ||
          Object.values(result.error.fieldErrors || {})
            .flat()
            .join(', ') ||
          'An error occurred'
        setServerError(errorMessage)
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

          {/* Price */}
          <div>
            <label htmlFor="price" className={labelClass}>
              {tp('priceCZK')}
            </label>
            <input
              id="price"
              type="number"
              step="0.01"
              {...form.register('price')}
              className={inputClass}
            />
            {form.formState.errors.price && (
              <p className={errorClass}>{form.formState.errors.price.message}</p>
            )}
          </div>
        </div>

        {/* Right Column - Classification & Compliance */}
        <div className="flex flex-col space-y-5">
          {/* Vendor & Manufacturer Section */}
          <div className="space-y-3">
            <h3 className={sectionTitleClass}>{t('vendorManufacturer')}</h3>

            {/* Vendor */}
            <div>
              <label htmlFor="vendor_id" className={labelClass}>
                {tp('vendor')}
                {extractedData.vendor_name && <StatusBadge matched={!!matchedVendor} />}
              </label>
              <select
                id="vendor_id"
                {...form.register('vendor_id')}
                className={inputClass}
              >
                <option value="">{tp('selectVendor')}</option>
                {/* Show extracted vendor as "Add new" option if not matched */}
                {extractedData.vendor_name && !matchedVendor && (
                  <option
                    value={`${NEW_VENDOR_PREFIX}${extractedData.vendor_name}`}
                    className="font-medium"
                  >
                    + {t('addNewVendor', { name: extractedData.vendor_name })}
                  </option>
                )}
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Manufacturer Name */}
            <div>
              <label htmlFor="manufacturer_name" className={labelClass}>
                {tp('manufacturer')}
              </label>
              <input
                id="manufacturer_name"
                type="text"
                {...form.register('manufacturer_name')}
                className={inputClass}
                placeholder={tp('manufacturer')}
              />
            </div>
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
                    {category.code} - {category.name}
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
                  {matchedEmdn.name}
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
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border border-border text-foreground py-2.5 px-4 rounded-md font-medium hover:bg-muted transition-colors"
        >
          {tc('cancel')}
        </button>
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
