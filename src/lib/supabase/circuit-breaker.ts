/**
 * Circuit breaker to prevent infinite loops from abusing the database.
 * Tracks request counts within a time window and stops requests if threshold is exceeded.
 */

interface CircuitState {
  requestCount: number;
  windowStart: number;
  isOpen: boolean;
  openedAt: number;
}

const DEFAULT_CONFIG = {
  maxRequests: 50,        // Max requests per window
  windowMs: 10_000,       // 10 second window
  cooldownMs: 30_000,     // 30 second cooldown when circuit opens
};

// Global state (works in both server and client)
const circuitState: CircuitState = {
  requestCount: 0,
  windowStart: Date.now(),
  isOpen: false,
  openedAt: 0,
};

export class CircuitBreakerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

/**
 * Check if a request should be allowed.
 * Throws CircuitBreakerError if circuit is open or threshold exceeded.
 */
export function checkCircuit(config = DEFAULT_CONFIG): void {
  const now = Date.now();

  // Check if circuit is open (in cooldown)
  if (circuitState.isOpen) {
    const elapsed = now - circuitState.openedAt;
    if (elapsed < config.cooldownMs) {
      const remainingSeconds = Math.ceil((config.cooldownMs - elapsed) / 1000);
      throw new CircuitBreakerError(
        `Too many database requests. Please wait ${remainingSeconds}s before retrying.`
      );
    }
    // Cooldown expired, reset circuit
    circuitState.isOpen = false;
    circuitState.requestCount = 0;
    circuitState.windowStart = now;
  }

  // Check if we need to start a new window
  if (now - circuitState.windowStart > config.windowMs) {
    circuitState.requestCount = 0;
    circuitState.windowStart = now;
  }

  // Increment and check threshold
  circuitState.requestCount++;

  if (circuitState.requestCount > config.maxRequests) {
    circuitState.isOpen = true;
    circuitState.openedAt = now;
    console.error(
      `[CircuitBreaker] Circuit opened: ${circuitState.requestCount} requests in ${config.windowMs}ms`
    );
    throw new CircuitBreakerError(
      `Too many database requests (${circuitState.requestCount} in ${config.windowMs / 1000}s). This may indicate an infinite loop.`
    );
  }
}

/**
 * Check circuit breaker and log any errors before rethrowing.
 * Combines circuit check and error handling in a single helper.
 * @param context - Context label for logging (e.g., "Supabase Client", "Supabase Server")
 */
export function checkCircuitOrThrow(context: string): void {
  try {
    checkCircuit();
  } catch (error) {
    if (error instanceof CircuitBreakerError) {
      console.error(`[${context}]`, error.message);
      throw error;
    }
    throw error;
  }
}
