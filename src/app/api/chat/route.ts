import {
  streamText,
  UIMessage,
  convertToModelMessages,
  stepCountIs,
  APICallError,
} from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { SYSTEM_PROMPT, CHAT_MODEL } from '@/lib/chat/constants';
import { searchProducts, comparePrices, suggestCategories } from '@/lib/chat/tools';

// Initialize Google provider with existing GEMINI_API_KEY
const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  try {
    const result = streamText({
      model: google(CHAT_MODEL),
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
      tools: {
        searchProducts,
        comparePrices,
        suggestCategories,
      },
      stopWhen: stepCountIs(3), // Allow up to 3 steps for complex queries (search -> compare -> synthesize)
      abortSignal: req.signal, // CRITICAL: Pass abort signal for cleanup
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('[Chat API Error]', error);

    // Classify error and return appropriate status code
    if (APICallError.isInstance(error)) {
      if (error.statusCode === 429) {
        return new Response('Rate limited', { status: 429 });
      }
      if (error.isRetryable) {
        return new Response('Retryable error', { status: 503 });
      }
    }

    return new Response('Server error', { status: 500 });
  }
}
