import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

/**
 * Get the Gemini AI client (lazy initialization).
 * Only throws an error when actually called, not at module load time.
 * This prevents errors when other server actions are used but Gemini isn't configured.
 */
export function getAIClient(): GoogleGenAI {
  if (aiClient) {
    return aiClient;
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY environment variable is required for AI extraction features"
    );
  }

  aiClient = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  return aiClient;
}

/**
 * Reset the cached AI client, forcing re-initialization on next getAIClient() call.
 * Useful for recovering from bad connection states or after API key rotation.
 */
export function resetAIClient(): void {
  aiClient = null;
}

export const EXTRACTION_MODEL = "gemini-3-flash-preview";

/**
 * Check if an error is transient (rate limit, timeout, server error) and worth retrying.
 */
function isTransientError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes("rate limit") ||
      msg.includes("429") ||
      msg.includes("timeout") ||
      msg.includes("503") ||
      msg.includes("500") ||
      msg.includes("internal server error") ||
      msg.includes("service unavailable") ||
      msg.includes("resource exhausted")
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Retry a function with exponential backoff for transient errors.
 * Retries up to `maxRetries` times (default 2) with delays of 1s, 2s.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries && isTransientError(error)) {
        const delayMs = 1000 * Math.pow(2, attempt); // 1s, 2s
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw error;
    }
  }
  throw lastError; // unreachable, but satisfies TypeScript
}
