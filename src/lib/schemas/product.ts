import { z } from "zod";

/** Validation messages for productSchema — pass translated strings from next-intl */
export interface ProductValidationMessages {
  nameRequired?: string;
  nameTooLong?: string;
  skuRequired?: string;
  skuTooLong?: string;
  descriptionTooLong?: string;
  invalidCategoryId?: string;
  invalidMaterialId?: string;
  udiDiMaxLength?: string;
  manufacturerRequired?: string;
  manufacturerNameTooLong?: string;
  manufacturerSkuTooLong?: string;
}

/** Validation messages for offeringSchema */
export interface OfferingValidationMessages {
  invalidVendorId?: string;
  vendorSkuTooLong?: string;
  priceMustBePositive?: string;
}

const defaultProductMessages: Required<ProductValidationMessages> = {
  nameRequired: "Name is required",
  nameTooLong: "Name too long",
  skuRequired: "SKU is required",
  skuTooLong: "SKU too long",
  descriptionTooLong: "Description too long",
  invalidCategoryId: "Invalid category ID",
  invalidMaterialId: "Invalid material ID",
  udiDiMaxLength: "UDI-DI max 14 characters",
  manufacturerRequired: "Manufacturer is required",
  manufacturerNameTooLong: "Manufacturer name too long",
  manufacturerSkuTooLong: "Manufacturer SKU too long",
};

const defaultOfferingMessages: Required<OfferingValidationMessages> = {
  invalidVendorId: "Invalid vendor ID",
  vendorSkuTooLong: "SKU too long",
  priceMustBePositive: "Price must be positive",
};

/** Create a product schema with translated validation messages */
export function createProductSchema(messages: ProductValidationMessages = {}) {
  const m = { ...defaultProductMessages, ...messages };
  return z.object({
    name: z.string().min(1, m.nameRequired).max(255, m.nameTooLong),
    sku: z.string().min(1, m.skuRequired).max(50, m.skuTooLong),
    description: z.string().max(2000, m.descriptionTooLong).nullable().optional(),
    emdn_category_id: z.string().uuid(m.invalidCategoryId).nullable().optional(),
    material_id: z.string().uuid(m.invalidMaterialId).nullable().optional(),
    udi_di: z.string().max(14, m.udiDiMaxLength).nullable().optional(),
    ce_marked: z.boolean().default(false),
    mdr_class: z.enum(["I", "IIa", "IIb", "III"]).nullable().optional(),
    manufacturer_name: z.string().min(1, m.manufacturerRequired).max(255, m.manufacturerNameTooLong),
    manufacturer_sku: z.string().max(100, m.manufacturerSkuTooLong).nullable().optional(),
  });
}

/** Create an offering schema with translated validation messages */
export function createOfferingSchema(messages: OfferingValidationMessages = {}) {
  const m = { ...defaultOfferingMessages, ...messages };
  return z.object({
    vendor_id: z.string().uuid(m.invalidVendorId),
    vendor_sku: z.string().max(100, m.vendorSkuTooLong).nullable().optional(),
    vendor_price: z.coerce.number().positive(m.priceMustBePositive).nullable().optional(),
    currency: z.string().default("EUR"),
    is_primary: z.boolean().default(false),
  });
}

/** Default schema with English messages — for server-side validation */
export const productSchema = createProductSchema();
export type ProductFormData = z.infer<typeof productSchema>;

/** Default offering schema with English messages — for server-side validation */
export const offeringSchema = createOfferingSchema();
export type OfferingFormData = z.infer<typeof offeringSchema>;
