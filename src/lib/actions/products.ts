"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { productSchema } from "@/lib/schemas/product";

interface ActionResult {
  success?: boolean;
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
  };

  // Validate with Zod
  const validatedData = productSchema.safeParse(data);

  if (!validatedData.success) {
    return {
      error: validatedData.error.flatten(),
    };
  }

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
  return { success: true };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
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
  return { success: true };
}
