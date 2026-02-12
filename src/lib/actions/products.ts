"use server";

import { createClient } from "@/lib/supabase/server";
import { checkCircuit } from "@/lib/supabase/circuit-breaker";
import { revalidatePath, revalidateTag } from "next/cache";
import { productSchema, offeringSchema } from "@/lib/schemas/product";

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
  input: Record<string, unknown>
): Promise<ActionResult> {
  const validatedData = productSchema.safeParse(input);

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
  revalidateTag("categories", "default");
  return { success: true };
}

export async function createProduct(
  input: Record<string, unknown>
): Promise<ActionResult> {
  const validatedData = productSchema.safeParse(input);

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
  revalidateTag("categories", "default");
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
  revalidateTag("categories", "default");
  return { success: true };
}

// --- Offering CRUD ---

interface OfferingResult {
  success: boolean;
  offeringId?: string;
  error?: string;
}

export async function createOffering(
  productId: string,
  data: { vendor_id: string; vendor_sku?: string | null; vendor_price?: number | null; currency?: string; is_primary?: boolean }
): Promise<OfferingResult> {
  const validated = offeringSchema.safeParse(data);
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0]?.message || "Invalid offering data" };
  }

  checkCircuit();
  const supabase = await createClient();

  const { data: created, error } = await supabase
    .from("product_offerings")
    .insert({ product_id: productId, ...validated.data })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true, offeringId: created?.id };
}

export async function updateOffering(
  offeringId: string,
  data: { vendor_sku?: string | null; vendor_price?: number | null; currency?: string; is_primary?: boolean }
): Promise<OfferingResult> {
  checkCircuit();
  const supabase = await createClient();

  const { error } = await supabase
    .from("product_offerings")
    .update(data)
    .eq("id", offeringId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true, offeringId };
}

export async function deleteOffering(offeringId: string): Promise<OfferingResult> {
  checkCircuit();
  const supabase = await createClient();

  const { error } = await supabase
    .from("product_offerings")
    .delete()
    .eq("id", offeringId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}
