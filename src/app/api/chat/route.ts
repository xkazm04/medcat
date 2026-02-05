import { streamText, UIMessage, convertToModelMessages, stepCountIs } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { SYSTEM_PROMPT, CHAT_MODEL } from '@/lib/chat/constants';
import { searchProducts, comparePrices, suggestCategories } from '@/lib/chat/tools';

// Initialize Google provider with existing GEMINI_API_KEY
const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

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
}
