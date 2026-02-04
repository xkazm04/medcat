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

export const EXTRACTION_MODEL = "gemini-3-flash-preview";
