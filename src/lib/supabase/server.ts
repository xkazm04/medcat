import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { checkCircuit, CircuitBreakerError } from "./circuit-breaker";

// Cache the client creation per request to avoid multiple auth calls
// This prevents rate limiting when multiple queries run in parallel
export const createClient = cache(async () => {
  // Check circuit breaker before creating client
  // This prevents infinite loops from overwhelming the database
  try {
    checkCircuit();
  } catch (error) {
    if (error instanceof CircuitBreakerError) {
      console.error("[Supabase Server]", error.message);
      throw error;
    }
    throw error;
  }

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
});

export { CircuitBreakerError } from "./circuit-breaker";
