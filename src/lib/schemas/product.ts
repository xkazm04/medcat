import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  sku: z.string().min(1, "SKU is required").max(50, "SKU too long"),
  description: z.string().max(2000, "Description too long").nullable().optional(),
  price: z.coerce.number().positive("Price must be positive").nullable().optional(),
  vendor_id: z.string().uuid("Invalid vendor ID").nullable().optional(),
  emdn_category_id: z.string().uuid("Invalid category ID").nullable().optional(),
  material_id: z.string().uuid("Invalid material ID").nullable().optional(),
  udi_di: z.string().max(14, "UDI-DI max 14 characters").nullable().optional(),
  ce_marked: z.boolean().default(false),
  mdr_class: z.enum(["I", "IIa", "IIb", "III"]).nullable().optional(),
});

export type ProductFormData = z.infer<typeof productSchema>;
