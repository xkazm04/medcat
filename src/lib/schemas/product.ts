import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  sku: z.string().min(1, "SKU is required").max(50, "SKU too long"),
  description: z.string().max(2000, "Description too long").nullable().optional(),
  emdn_category_id: z.string().uuid("Invalid category ID").nullable().optional(),
  material_id: z.string().uuid("Invalid material ID").nullable().optional(),
  udi_di: z.string().max(14, "UDI-DI max 14 characters").nullable().optional(),
  ce_marked: z.boolean().default(false),
  mdr_class: z.enum(["I", "IIa", "IIb", "III"]).nullable().optional(),
  manufacturer_name: z.string().min(1, "Manufacturer is required").max(255, "Manufacturer name too long"),
  manufacturer_sku: z.string().max(100, "Manufacturer SKU too long").nullable().optional(),
});

export type ProductFormData = z.infer<typeof productSchema>;

/** Schema for creating/updating a product offering */
export const offeringSchema = z.object({
  vendor_id: z.string().uuid("Invalid vendor ID"),
  vendor_sku: z.string().max(100, "SKU too long").nullable().optional(),
  vendor_price: z.coerce.number().positive("Price must be positive").nullable().optional(),
  currency: z.string().default("EUR"),
  is_primary: z.boolean().default(false),
});

export type OfferingFormData = z.infer<typeof offeringSchema>;
