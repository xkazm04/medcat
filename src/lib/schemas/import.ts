import { z } from "zod";

/**
 * Mappable fields for CSV import.
 * Defines which product fields can be mapped from CSV columns.
 */
export const MAPPABLE_FIELDS = [
  { key: "name", label: "Product Name", required: true },
  { key: "sku", label: "SKU", required: true },
  { key: "description", label: "Description", required: false },
  { key: "price", label: "Price", required: false },
  { key: "vendor_id", label: "Vendor", required: false },
  { key: "manufacturer_name", label: "Manufacturer", required: false },
  { key: "manufacturer_sku", label: "Manufacturer SKU", required: false },
  { key: "emdn_code", label: "EMDN Code", required: false },
] as const;

/**
 * Type for a single mappable field definition.
 */
export type MappableField = (typeof MAPPABLE_FIELDS)[number];

/**
 * Schema for validating column mapping configuration.
 * Maps CSV column names to product fields.
 */
export const columnMappingSchema = z.object({
  name: z.string().min(1, "Name column is required"),
  sku: z.string().min(1, "SKU column is required"),
  description: z.string().optional(),
  price: z.string().optional(),
  vendor_id: z.string().optional(),
  manufacturer_name: z.string().optional(),
  manufacturer_sku: z.string().optional(),
  emdn_code: z.string().optional(),
});

/**
 * Type inferred from column mapping schema.
 */
export type ColumnMapping = z.infer<typeof columnMappingSchema>;

/**
 * Schema for validating a single import row.
 * Based on productSchema but adapted for import context:
 * - Adds _rowIndex for error reporting
 * - Makes vendor_id optional (set at import time)
 * - Makes emdn_category_id, material_id, udi_di, mdr_class optional (not in CSV)
 */
export const importRowSchema = z.object({
  _rowIndex: z.number(),
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  sku: z.string().min(1, "SKU is required").max(50, "SKU too long"),
  description: z.string().max(2000, "Description too long").nullable().optional(),
  price: z.coerce.number().positive("Price must be positive").nullable().optional(),
  vendor_id: z.string().uuid("Invalid vendor ID").nullable().optional(),
  emdn_category_id: z.string().uuid("Invalid category ID").nullable().optional(),
  emdn_code: z.string().max(20, "EMDN code too long").nullable().optional(),
  material_id: z.string().uuid("Invalid material ID").nullable().optional(),
  udi_di: z.string().max(14, "UDI-DI max 14 characters").nullable().optional(),
  ce_marked: z.boolean().default(false),
  mdr_class: z.enum(["I", "IIa", "IIb", "III"]).nullable().optional(),
  manufacturer_name: z.string().max(255, "Manufacturer name too long").nullable().optional(),
  manufacturer_sku: z.string().max(100, "Manufacturer SKU too long").nullable().optional(),
});

/**
 * Type for a validated import row.
 */
export type ImportRow = z.infer<typeof importRowSchema>;
