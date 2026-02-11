'use client'

import { useState, useTransition } from 'react'
import { useForm, SubmitHandler } from 'react-hook-form'
import { useTranslations } from 'next-intl'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { productSchema } from '@/lib/schemas/product'
import { updateProduct } from '@/lib/actions/products'
import { ProductWithRelations } from '@/lib/types'

// Define input type for the form (before Zod transforms)
type ProductFormInput = z.input<typeof productSchema>
// Define output type after validation
type ProductFormOutput = z.output<typeof productSchema>

interface ProductFormProps {
  product: ProductWithRelations
  onSuccess?: () => void
  emdnCategories: { id: string; code: string; name: string }[]
}

export function ProductForm({
  product,
  onSuccess,
  emdnCategories,
}: ProductFormProps) {
  const t = useTranslations('product')
  const tRegulatory = useTranslations('regulatory')
  const tCommon = useTranslations('common')
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<ProductFormInput, unknown, ProductFormOutput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product.name,
      sku: product.sku,
      description: product.description ?? undefined,
      emdn_category_id: product.emdn_category_id ?? undefined,
      material_id: product.material_id ?? undefined,
      udi_di: product.udi_di ?? undefined,
      ce_marked: product.ce_marked ?? false,
      mdr_class: product.mdr_class ?? undefined,
      manufacturer_name: product.manufacturer_name ?? undefined,
      manufacturer_sku: product.manufacturer_sku ?? undefined,
    },
  })

  const onSubmit: SubmitHandler<ProductFormOutput> = (data) => {
    setServerError(null)
    startTransition(async () => {
      const formData = new FormData()
      formData.append('name', data.name)
      formData.append('sku', data.sku)
      formData.append('description', data.description || '')
      formData.append('emdn_category_id', data.emdn_category_id || '')
      formData.append('material_id', data.material_id || '')
      formData.append('udi_di', data.udi_di || '')
      formData.append('ce_marked', data.ce_marked ? 'true' : 'false')
      formData.append('mdr_class', data.mdr_class || '')
      formData.append('manufacturer_name', data.manufacturer_name || '')
      formData.append('manufacturer_sku', data.manufacturer_sku || '')

      const result = await updateProduct(product.id, formData)

      if (result.success) {
        onSuccess?.()
      } else if (result.error) {
        const errorMessage =
          result.error.formErrors?.[0] ||
          Object.values(result.error.fieldErrors || {})
            .flat()
            .join(', ') ||
          tCommon('error')
        setServerError(errorMessage)
      }
    })
  }

  const inputClass =
    'w-full border border-border rounded-md px-3 py-2 focus:ring-2 focus:ring-accent focus:outline-none bg-background'
  const labelClass = 'text-sm font-medium'
  const errorClass = 'text-sm text-red-500 mt-1'

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-6 py-4">
      {serverError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {serverError}
        </div>
      )}

      {/* Name */}
      <div>
        <label htmlFor="name" className={labelClass}>
          {t('name')} <span className="text-red-500">*</span>
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
          {t('sku')} <span className="text-red-500">*</span>
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
          {t('description')}
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

      {/* Manufacturer Name */}
      <div>
        <label htmlFor="manufacturer_name" className={labelClass}>
          {t('manufacturer')} <span className="text-red-500">*</span>
        </label>
        <input
          id="manufacturer_name"
          type="text"
          {...form.register('manufacturer_name')}
          className={inputClass}
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
          {t('manufacturerSku')}
        </label>
        <input
          id="manufacturer_sku"
          type="text"
          {...form.register('manufacturer_sku')}
          className={inputClass}
        />
        {form.formState.errors.manufacturer_sku && (
          <p className={errorClass}>
            {form.formState.errors.manufacturer_sku.message}
          </p>
        )}
      </div>

      {/* EMDN Category */}
      <div>
        <label htmlFor="emdn_category_id" className={labelClass}>
          {t('emdnCategory')}
        </label>
        <select
          id="emdn_category_id"
          {...form.register('emdn_category_id')}
          className={inputClass}
        >
          <option value="">{t('selectCategory')}</option>
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
          {t('udiDi')}
        </label>
        <input
          id="udi_di"
          type="text"
          maxLength={14}
          {...form.register('udi_di')}
          className={inputClass}
          placeholder={t('udiDiPlaceholder')}
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
          {tRegulatory('ceMarked')}
        </label>
      </div>

      {/* MDR Class */}
      <div>
        <label htmlFor="mdr_class" className={labelClass}>
          {tRegulatory('mdrClass')}
        </label>
        <select
          id="mdr_class"
          {...form.register('mdr_class')}
          className={inputClass}
        >
          <option value="">{t('selectClass')}</option>
          <option value="I">{tRegulatory('mdrClassI')}</option>
          <option value="IIa">{tRegulatory('mdrClassIIa')}</option>
          <option value="IIb">{tRegulatory('mdrClassIIb')}</option>
          <option value="III">{tRegulatory('mdrClassIII')}</option>
        </select>
        {form.formState.errors.mdr_class && (
          <p className={errorClass}>
            {form.formState.errors.mdr_class.message}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-button text-button-foreground py-2 px-4 rounded-md font-medium hover:bg-button-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? tCommon('saving') : tCommon('save')}
      </button>
    </form>
  )
}
