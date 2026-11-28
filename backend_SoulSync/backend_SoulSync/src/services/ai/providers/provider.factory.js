import { config } from '../../../config/index.js';
import { AppError } from '../../../utils/AppError.js';
import { GeminiProvider } from './gemini.provider.js';
import { OpenAIProvider } from './openai.provider.js';

let cached;

/**
 * Return the provider chosen by AI_PROVIDER. Keys come only from server-side env (config.ai) and
 * are never sent to the browser. Throws a friendly 503 when no key is configured, so the rest of
 * the app keeps working (NFR-19).
 */
export function getProvider() {
  if (cached) return cached;
  const { provider, openaiApiKey, geminiApiKey, model, requestTimeoutMs } = config.ai;

  if (provider === 'gemini' && geminiApiKey) {
    cached = new GeminiProvider({ apiKey: geminiApiKey, model, timeoutMs: requestTimeoutMs });
  } else if (provider === 'openai' && openaiApiKey) {
    cached = new OpenAIProvider({ apiKey: openaiApiKey, model, timeoutMs: requestTimeoutMs });
  } else {
    throw AppError.serviceUnavailable(
      'The AI assistant is not available right now.',
      'AI_NOT_CONFIGURED',
    );
  }
  return cached;
}

export function resetProviderCache() {
  cached = undefined;
}
