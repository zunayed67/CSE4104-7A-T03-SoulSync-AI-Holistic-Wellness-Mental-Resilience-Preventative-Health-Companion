import { GoogleGenAI } from '@google/genai';
import { AI_LIMITS } from '../../../config/constants.js';
import { logger } from '../../../config/logger.js';
import { AppError } from '../../../utils/AppError.js';
import { AIProvider } from './provider.interface.js';

/** Current stable, lower-cost Flash-Lite model. AI_MODEL can pin any supported text model. */
export const GEMINI_DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const TRANSIENT_STATUSES = new Set([500, 502, 503, 504]);
const TRANSIENT_RETRY_DELAY_MS = 180;

function errorPayload(error) {
  try {
    const parsed = JSON.parse(error?.message || '');
    return parsed?.error || parsed;
  } catch {
    return {};
  }
}

function errorText(payload) {
  const parts = [payload?.message, payload?.status];
  const visit = (value) => {
    if (typeof value === 'string') parts.push(value);
    else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') Object.values(value).forEach(visit);
  };
  visit(payload?.details);
  visit(payload?.error);
  return parts.filter(Boolean).join(' ').toLowerCase();
}

/** Turn SDK/provider errors into safe, actionable API errors. Never return Google's raw body. */
export function mapGeminiError(error) {
  const status = Number(error?.status);
  const payload = errorPayload(error);
  const details = errorText(payload);
  if (error?.name === 'AbortError' || error?.name === 'TimeoutError') {
    return new AppError('The AI assistant took too long to respond. Please try again.', 504, 'AI_TIMEOUT');
  }

  if (status === 401 || status === 403 || /api[_ ]key.{0,30}(invalid|not valid)|invalid[_ ]api[_ ]key|api key not valid|api_key_invalid/i.test(details)) {
    return AppError.serviceUnavailable(
      'Gemini is not configured correctly. Check the server-side API key and its access.',
      'AI_PROVIDER_INVALID_KEY',
    );
  }
  if (status === 404 || /model.{0,40}(not found|unsupported|does not exist)/i.test(details)) {
    return AppError.serviceUnavailable(
      'The configured Gemini model is unavailable. Check AI_MODEL in the backend environment.',
      'AI_MODEL_UNAVAILABLE',
    );
  }
  if (status === 429) {
    if (/quota[_ ]exhausted|requestsperday|tokensperday|per[_ ]day|daily quota|limit: 0/i.test(details)) {
      return AppError.tooManyRequests(
        'Gemini usage quota for this model is exhausted. Check the project’s model-specific limits before trying again.',
        'AI_PROVIDER_QUOTA_EXHAUSTED',
      );
    }
    if (/tokensperminute|inputtoken|outputtoken|token rate|\btpm\b/i.test(details)) {
      return AppError.tooManyRequests(
        'Gemini’s token rate limit was reached. Wait briefly, then try again.',
        'AI_PROVIDER_TPM_LIMITED',
      );
    }
    if (/requestsperminute|request rate|\brpm\b/i.test(details)) {
      return AppError.tooManyRequests(
        'Gemini’s request rate limit was reached. Wait briefly, then try again.',
        'AI_PROVIDER_RPM_LIMITED',
      );
    }
    return AppError.tooManyRequests(
      'Gemini is rate limiting requests. Wait briefly, then try again.',
      'AI_PROVIDER_RATE_LIMITED',
    );
  }
  if (status === 408 || error?.name === 'AbortError' || error?.name === 'TimeoutError') {
    return new AppError('The AI assistant took too long to respond. Please try again.', 504, 'AI_TIMEOUT');
  }
  if (error?.name === 'SyntaxError') {
    return new AppError('The AI assistant returned an unreadable response. Please try again.', 502, 'AI_BAD_RESPONSE');
  }
  if (status >= 500 || !status) {
    return AppError.serviceUnavailable(
      'The AI assistant is unavailable right now. Please try again later.',
      'AI_UNAVAILABLE',
    );
  }
  return new AppError(
    'The AI assistant could not process that request. Please try again.',
    502,
    'AI_PROVIDER_ERROR',
  );
}

export class GeminiProvider extends AIProvider {
  constructor({
    apiKey,
    model,
    timeoutMs = 20_000,
    baseUrl = 'https://generativelanguage.googleapis.com',
    fetch: fetchImpl,
  }) {
    super();
    this.model = model || GEMINI_DEFAULT_MODEL;
    this.timeoutMs = timeoutMs;
    this.client = new GoogleGenAI({
      apiKey,
      httpOptions: {
        apiVersion: 'v1beta',
        baseUrl,
        timeout: timeoutMs,
        // The SDK retries 429 by default. Disable SDK retries so quota exhaustion is never retried.
        retryOptions: { attempts: 1 },
        ...(fetchImpl ? { fetch: fetchImpl } : {}),
      },
    });
  }

  get name() {
    return 'gemini';
  }

  async generate({
    system,
    messages,
    maxOutputTokens = AI_LIMITS.MAX_OUTPUT_TOKENS,
    json = false,
  }) {
    const deadline = Date.now() + this.timeoutMs;
    let response;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) {
        throw new AppError('The AI assistant took too long to respond. Please try again.', 504, 'AI_TIMEOUT');
      }
      try {
        response = await this.client.models.generateContent({
          model: this.model,
          contents: messages.map((message) => ({
            role: message.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: message.content }],
          })),
          config: {
            systemInstruction: system,
            maxOutputTokens,
            temperature: 0.6,
            ...(json ? { responseMimeType: 'application/json' } : {}),
            httpOptions: {
              timeout: remainingMs,
              retryOptions: { attempts: 1 },
            },
          },
        });
        break;
      } catch (error) {
        const status = Number(error?.status);
        const transient = TRANSIENT_STATUSES.has(status);
        const canRetry = attempt === 0 && transient && Date.now() + TRANSIENT_RETRY_DELAY_MS < deadline;
        if (canRetry) {
          logger.warn({ provider: this.name, status }, 'Transient AI provider error; retrying once');
          await new Promise((resolve) => setTimeout(resolve, TRANSIENT_RETRY_DELAY_MS));
          continue;
        }
        const mapped = mapGeminiError(error);
        logger.warn({ provider: this.name, status: status || undefined, code: mapped.code }, 'Gemini request failed');
        throw mapped;
      }
    }

    const candidate = response?.candidates?.[0];
    if (response?.promptFeedback?.blockReason || ['SAFETY', 'BLOCKLIST', 'PROHIBITED_CONTENT'].includes(candidate?.finishReason)) {
      throw new AppError("The AI assistant couldn't answer that. Please try rephrasing.", 502, 'AI_BLOCKED');
    }
    const text = typeof response?.text === 'string' ? response.text.trim() : '';
    if (!text) {
      throw new AppError(
        'The AI assistant returned an empty answer. Please try again.',
        502,
        'AI_EMPTY_RESPONSE',
      );
    }
    return {
      text,
      usage: {
        inputTokens: response.usageMetadata?.promptTokenCount,
        outputTokens: response.usageMetadata?.candidatesTokenCount,
      },
    };
  }
}
