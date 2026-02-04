"use server";

import { createClient } from "@/lib/supabase/server";
import { checkCircuit } from "@/lib/supabase/circuit-breaker";
import { revalidatePath, revalidateTag } from "next/cache";
import { productSchema } from "@/lib/schemas/product";

interface ActionResult {
  success?: boolean;
  productId?: string;
  error?: {
    formErrors?: string[];
    fieldErrors?: Record<string, string[]>;
  };
}

export async function updateProduct(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  // Convert FormData to object
  const rawData = Object.fromEntries(formData.entries());

  // Handle boolean conversion (FormData sends strings)
  const data = {
    ...rawData,
    ce_marked: rawData.ce_marked === "true",
    // Convert empty strings to null for nullable fields
    description: rawData.description || null,
    price: rawData.price || null,
    vendor_id: rawData.vendor_id || null,
    emdn_category_id: rawData.emdn_category_id || null,
    material_id: rawData.material_id || null,
    udi_di: rawData.udi_di || null,
    mdr_class: rawData.mdr_class || null,
    manufacturer_name: rawData.manufacturer_name || null,
    manufacturer_sku: rawData.manufacturer_sku || null,
  };

  // Validate with Zod
  const validatedData = productSchema.safeParse(data);

  if (!validatedData.success) {
    return {
      error: validatedData.error.flatten(),
    };
  }

  checkCircuit();
  const supabase = await createClient();

  const { error } = await supabase
    .from("products")
    .update(validatedData.data)
    .eq("id", id);

  if (error) {
    return {
      error: {
        formErrors: [error.message],
      },
    };
  }

  revalidatePath("/");
  revalidateTag("categories", "default"); // Invalidate category counts cache
  return { success: true };
}

/**
 * Create a new product in the database.
 *
 * @param formData - FormData containing product fields
 * @returns ActionResult with success/productId or error
 */
export async function createProduct(
  formData: FormData
): Promise<ActionResult> {
  // Convert FormData to object
  const rawData = Object.fromEntries(formData.entries());

  // Handle boolean conversion (FormData sends strings)
  const data = {
    ...rawData,
    ce_marked: rawData.ce_marked === "true",
    // Convert empty strings to null for nullable fields
    description: rawData.description || null,
    price: rawData.price || null,
    vendor_id: rawData.vendor_id || null,
    emdn_category_id: rawData.emdn_category_id || null,
    material_id: rawData.material_id || null,
    udi_di: rawData.udi_di || null,
    mdr_class: rawData.mdr_class || null,
    manufacturer_name: rawData.manufacturer_name || null,
    manufacturer_sku: rawData.manufacturer_sku || null,
  };

  // Validate with Zod
  const validatedData = productSchema.safeParse(data);

  if (!validatedData.success) {
    return {
      error: validatedData.error.flatten(),
    };
  }

  checkCircuit();
  const supabase = await createClient();

  const { data: created, error } = await supabase
    .from("products")
    .insert(validatedData.data)
    .select("id")
    .single();

  if (error) {
    return {
      error: {
        formErrors: [error.message],
      },
    };
  }

  revalidatePath("/");
  revalidateTag("categories", "default"); // Invalidate category counts cache
  return { success: true, productId: created?.id };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  checkCircuit();
  const supabase = await createClient();

  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    return {
      error: {
        formErrors: [error.message],
      },
    };
  }

  revalidatePath("/");
  revalidateTag("categories", "default"); // Invalidate category counts cache
  return { success: true };
}
