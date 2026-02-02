'use client'

import { useState, useTransition, useEffect } from 'react'
import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { productSchema } from '@/lib/schemas/product'
import { createProduct } from '@/lib/actions/products'
import { findSimilarProducts, type SimilarProduct } from '@/lib/actions/similarity'
import { SimilarProductsWarning } from './similar-products-warning'
import type { ExtractedProduct } from '@/lib/schemas/extraction'

// Define input type for the form (before Zod transforms)
type ProductFormInput = z.input<typeof productSchema>
// Define output type after validation
type ProductFormOutput = z.output<typeof productSchema>

interface ExtractionPreviewProps {
  extractedData: ExtractedProduct
  vendors: { id: string; name: string }[]
  materials: { id: string; name: string }[]
  emdnCategories: { id: string; code: string; name: string }[]
  onSuccess: () => void
  onCancel: () => void
}

export function ExtractionPreview({
  extractedData,
  vendors,
  materials,
  emdnCategories,
  onSuccess,
  onCancel,
}: ExtractionPreviewProps) {
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
  const matchedMaterial = materials.find(
    (m) =>
      extractedData.material_name &&
      m.name.toLowerCase().includes(extractedData.material_name.toLowerCase())
  )
  const matchedEmdn = emdnCategories.find(
    (c) =>
      extractedData.suggested_emdn && c.code === extractedData.suggested_emdn
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

  const form = useForm<ProductFormInput, unknown, ProductFormOutput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: extractedData.name,
      sku: extractedData.sku,
      description: extractedData.description ?? undefined,
      price: extractedData.price ?? undefined,
      vendor_id: matchedVendor?.id ?? undefined,
      emdn_category_id: matchedEmdn?.id ?? undefined,
      material_id: matchedMaterial?.id ?? undefined,
      udi_di: extractedData.udi_di ?? undefined,
      ce_marked: extractedData.ce_marked ?? false,
      mdr_class: extractedData.mdr_class ?? undefined,
    },
  })

  const onSubmit: SubmitHandler<ProductFormOutput> = (data) => {
    setServerError(null)
    startTransition(async () => {
      const formData = new FormData()
      formData.append('name', data.name)
      formData.append('sku', data.sku)
      formData.append('description', data.description || '')
      formData.append('price', data.price?.toString() || '')
      formData.append('vendor_id', data.vendor_id || '')
      formData.append('emdn_category_id', data.emdn_category_id || '')
      formData.append('material_id', data.material_id || '')
      formData.append('udi_di', data.udi_di || '')
      formData.append('ce_marked', data.ce_marked ? 'true' : 'false')
      formData.append('mdr_class', data.mdr_class || '')

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
    'w-full border border-border rounded-md px-3 py-2 focus:ring-2 focus:ring-accent focus:outline-none bg-background'
  const labelClass = 'text-sm font-medium'
  const errorClass = 'text-sm text-red-500 mt-1'
  const extractedHintClass = 'text-xs text-muted-foreground mb-1'

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-4 px-6 py-4"
    >
      {serverError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {serverError}
        </div>
      )}

      <SimilarProductsWarning
        products={similarProducts}
        isLoading={similarityLoading}
      />

      {/* Name */}
      <div>
        <label htmlFor="name" className={labelClass}>
          Name <span className="text-red-500">*</span>
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
          SKU <span className="text-red-500">*</span>
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

      {/* Description */}
      <div>
        <label htmlFor="description" className={labelClass}>
          Description
        </label>
        <textarea
          id="description"
          rows={3}
          {...form.register('description')}
          className={inputClass}
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
          Price (CZK)
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

      {/* Vendor */}
      <div>
        {extractedData.vendor_name && (
          <p className={extractedHintClass}>
            Extracted vendor: {extractedData.vendor_name}
            {matchedVendor && ` (matched to ${matchedVendor.name})`}
          </p>
        )}
        <label htmlFor="vendor_id" className={labelClass}>
          Vendor
        </label>
        <select
          id="vendor_id"
          {...form.register('vendor_id')}
          className={inputClass}
        >
          <option value="">Select vendor</option>
          {vendors.map((vendor) => (
            <option key={vendor.id} value={vendor.id}>
              {vendor.name}
            </option>
          ))}
        </select>
        {form.formState.errors.vendor_id && (
          <p className={errorClass}>
            {form.formState.errors.vendor_id.message}
          </p>
        )}
      </div>

      {/* Material */}
      <div>
        {extractedData.material_name && (
          <p className={extractedHintClass}>
            Extracted material: {extractedData.material_name}
            {matchedMaterial && ` (matched to ${matchedMaterial.name})`}
          </p>
        )}
        <label htmlFor="material_id" className={labelClass}>
          Material
        </label>
        <select
          id="material_id"
          {...form.register('material_id')}
          className={inputClass}
        >
          <option value="">Select material</option>
          {materials.map((material) => (
            <option key={material.id} value={material.id}>
              {material.name}
            </option>
          ))}
        </select>
        {form.formState.errors.material_id && (
          <p className={errorClass}>
            {form.formState.errors.material_id.message}
          </p>
        )}
      </div>

      {/* EMDN Category */}
      <div>
        {extractedData.suggested_emdn && (
          <p className={extractedHintClass}>
            Suggested EMDN: {extractedData.suggested_emdn}
            {matchedEmdn && ` (matched to ${matchedEmdn.code} - ${matchedEmdn.name})`}
          </p>
        )}
        <label htmlFor="emdn_category_id" className={labelClass}>
          EMDN Category
        </label>
        <select
          id="emdn_category_id"
          {...form.register('emdn_category_id')}
          className={inputClass}
        >
          <option value="">Select category</option>
          {emdnCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.code} - {category.name}
            </option>
          ))}
        </select>
        {form.formState.errors.emdn_category_id && (
          <p className={errorClass}>
            {form.formState.errors.emdn_category_id.message}
          </p>
        )}
      </div>

      {/* UDI-DI */}
      <div>
        <label htmlFor="udi_di" className={labelClass}>
          UDI-DI
        </label>
        <input
          id="udi_di"
          type="text"
          maxLength={14}
          {...form.register('udi_di')}
          className={inputClass}
          placeholder="Max 14 characters"
        />
        {form.formState.errors.udi_di && (
          <p className={errorClass}>{form.formState.errors.udi_di.message}</p>
        )}
      </div>

      {/* CE Marked */}
      <div className="flex items-center gap-2">
        <input
          id="ce_marked"
          type="checkbox"
          {...form.register('ce_marked')}
          className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
        />
        <label htmlFor="ce_marked" className={labelClass}>
          CE Marked
        </label>
      </div>

      {/* MDR Class */}
      <div>
        <label htmlFor="mdr_class" className={labelClass}>
          MDR Class
        </label>
        <select
          id="mdr_class"
          {...form.register('mdr_class')}
          className={inputClass}
        >
          <option value="">Select class</option>
          <option value="I">I - Low risk</option>
          <option value="IIa">IIa - Low to medium risk</option>
          <option value="IIb">IIb - Medium to high risk</option>
          <option value="III">III - High risk</option>
        </select>
        {form.formState.errors.mdr_class && (
          <p className={errorClass}>
            {form.formState.errors.mdr_class.message}
          </p>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border border-border text-foreground py-2 px-4 rounded-md font-medium hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 bg-accent text-accent-foreground py-2 px-4 rounded-md font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Saving...' : 'Save to Catalog'}
        </button>
      </div>
    </form>
  )
}
