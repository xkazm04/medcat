import { APICallError } from 'ai';

// Error message templates (conversational tone per CONTEXT.md)
export const ERROR_RATE_LIMIT =
  'Too many requests. Please wait a moment and try again.';
export const ERROR_NETWORK = 'Connection interrupted. Let me try again?';
export const ERROR_RETRYABLE =
  "Hmm, something went wrong on my end. Let me try again?";
export const ERROR_GENERIC = 'Something went wrong. Please try again.';

export type ErrorType = 'rate_limit' | 'network' | 'generic';

export interface ClassifiedError {
  /** User-friendly message in conversational tone */
  userMessage: string;
  /** True for network/timeout errors, false for rate limits */
  isRetryable: boolean;
  /** Error category for UI differentiation */
  errorType: ErrorType;
}

/**
 * Classify an error into a user-friendly category.
 * Used by both server (API route status codes) and client (error display).
 */
export function classifyError(error: unknown): ClassifiedError {
  // Handle AI SDK APICallError
  if (APICallError.isInstance(error)) {
    // Rate limit - retryable after cooldown (UI shows countdown)
    if (error.statusCode === 429) {
      return {
        userMessage: ERROR_RATE_LIMIT,
        isRetryable: true,
        errorType: 'rate_limit',
      };
    }

    // AI SDK marks some errors as retryable (5xx, network issues)
    if (error.isRetryable) {
      return {
        userMessage: ERROR_RETRYABLE,
        isRetryable: true,
        errorType: 'generic',
      };
    }
  }

  // Check for network-related errors in message
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('abort')
    ) {
      return {
        userMessage: ERROR_NETWORK,
        isRetryable: true,
        errorType: 'network',
      };
    }
  }

  // Default fallback - treat as retryable
  return {
    userMessage: ERROR_GENERIC,
    isRetryable: true,
    errorType: 'generic',
  };
}
