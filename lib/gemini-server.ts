import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Fast, highly available flash models supported by @google/genai
const MODELS_SEQUENCE = [
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
];

interface GenerateOptions {
  contents: any;
  config?: any;
}

export async function generateContentWithRetryAndFallback(options: GenerateOptions) {
  let lastError: any = null;

  for (const model of MODELS_SEQUENCE) {
    try {
      // 25 second timeout per attempt to allow structured JSON generation ample time
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Model ${model} request timed out after 25s`)), 25000);
      });

      const generatePromise = ai.models.generateContent({
        model,
        contents: options.contents,
        config: options.config,
      });

      const response = await Promise.race([generatePromise, timeoutPromise]);

      if (response && response.text) {
        return response;
      }
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      console.warn(`Gemini model ${model} failed: ${errMsg.slice(0, 150)}. Trying next available model...`);
      // Brief pause before trying next model
      await new Promise((r) => setTimeout(r, 500));
      continue;
    }
  }

  // Parse clean message from error if possible
  let friendlyMessage = 'The AI service is currently busy. Please try again or use the offline generator.';
  if (lastError?.message) {
    try {
      const parsed = JSON.parse(lastError.message);
      if (parsed?.error?.message) {
        friendlyMessage = parsed.error.message;
      }
    } catch {
      friendlyMessage = lastError.message;
    }
  }

  throw new Error(friendlyMessage);
}
