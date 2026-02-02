import { z } from "zod";

/**
 * Schema for AI-extracted product data from vendor product sheets.
 *
 * Key difference from productSchema: This schema has vendor_name and material_name
 * as strings (extracted text), not UUIDs. The preview form will resolve these to IDs later.
 */
export const extractedProductSchema = z.object({
  name: z.string().describe("Product name as stated by vendor"),
  sku: z.string().describe("Vendor SKU, catalog number, or part number"),
  description: z.string().nullable().describe("Full product description"),
  price: z.number().nullable().describe("Unit price (numeric only, no currency)"),
  vendor_name: z.string().nullable().describe("Vendor or manufacturer name"),
  material_name: z.string().nullable().describe("Primary material (titanium, PEEK, etc.)"),
  ce_marked: z.boolean().describe("True if CE marking mentioned"),
  mdr_class: z.enum(["I", "IIa", "IIb", "III"]).nullable().describe("MDR classification if stated"),
  udi_di: z.string().nullable().describe("UDI-DI if provided (max 14 chars)"),
  suggested_emdn: z.string().nullable().describe("Suggested EMDN code (P09xx or P10xx)"),
});

export type ExtractedProduct = z.infer<typeof extractedProductSchema>;

/**
 * JSON Schema representation for Gemini structured output.
 * Uses Zod v4 native conversion with draft-2020-12 target.
 */
export const extractedProductJsonSchema = z.toJSONSchema(extractedProductSchema, {
  target: "draft-2020-12",
});
