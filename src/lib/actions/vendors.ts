"use server";

import { createClient } from "@/lib/supabase/server";
import { checkCircuit } from "@/lib/supabase/circuit-breaker";
import { revalidatePath } from "next/cache";

interface CreateVendorResult {
  success: boolean;
  vendorId?: string;
  error?: string;
}

/**
 * Create a new vendor in the database.
 * Returns the new vendor's ID on success.
 */
export async function createVendor(name: string): Promise<CreateVendorResult> {
  if (!name || name.trim().length === 0) {
    return { success: false, error: "Vendor name is required" };
  }

  const trimmedName = name.trim();

  checkCircuit();
  const supabase = await createClient();

  // Check if vendor already exists (case-insensitive)
  const { data: existing } = await supabase
    .from("vendors")
    .select("id")
    .ilike("name", trimmedName)
    .maybeSingle();

  if (existing) {
    return { success: true, vendorId: existing.id };
  }

  // Create new vendor
  const { data: created, error } = await supabase
    .from("vendors")
    .insert({ name: trimmedName })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true, vendorId: created.id };
}
