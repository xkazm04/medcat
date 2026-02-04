import { createBrowserClient } from "@supabase/ssr";
import { checkCircuit, CircuitBreakerError } from "./circuit-breaker";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  // Check circuit breaker to prevent infinite loops
  try {
    checkCircuit();
  } catch (error) {
    if (error instanceof CircuitBreakerError) {
      console.error("[Supabase Client]", error.message);
      throw error;
    }
    throw error;
  }

  if (client) return client;

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return client;
}

export { CircuitBreakerError } from "./circuit-breaker";
