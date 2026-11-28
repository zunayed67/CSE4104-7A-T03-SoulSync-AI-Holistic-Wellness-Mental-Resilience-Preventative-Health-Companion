import { AppError } from '../../../utils/AppError.js';
import { logger } from '../../../config/logger.js';

/**
 * Common contract every AI provider adapter implements (NFR-23), so the provider can be switched
 * with one environment variable and the frontend never changes.
 *
 * @typedef {{ role: 'user' | 'assistant', content: string }} ChatMessage
 * @typedef {{ system: string, messages: ChatMessage[], maxOutputTokens?: number, json?: boolean }} GenerateRequest
 * @typedef {{ text: string, usage?: { inputTokens?: number, outputTokens?: number } }} GenerateResult
 */
export class AIProvider {
  /** @returns {string} short provider id, e.g. "openai" */
  get name() {
    throw new Error('AIProvider.name must be implemented');
  }

  /**
   * @param {GenerateRequest} _request
   * @returns {Promise<GenerateResult>}
   */
  async generate(_request) {
    throw new Error('AIProvider.generate() must be implemented');
  }
}

/**
 * POST JSON with a hard timeout and translate every failure into a friendly AppError, so provider
 * outages never surface raw provider errors, keys or payloads to the client (FR-37, NFR-19).
 * The request/response bodies are never logged.
 */
export async function postJson({ url, headers, body, timeoutMs, providerName }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err?.name === 'AbortError') {
      throw new AppError(
        'The AI assistant took too long to respond. Please try again.',
        504,
        'AI_TIMEOUT',
      );
    }
    logger.error(
      { provider: providerName, reason: err?.cause?.code ?? err?.code },
      'AI provider unreachable',
    );
    throw AppError.serviceUnavailable(
      'The AI assistant is unavailable right now. Please try again later.',
      'AI_UNAVAILABLE',
    );
  }
  clearTimeout(timer);

  if (response.status === 429) {
    logger.warn({ provider: providerName }, 'AI provider rate limited');
    throw new AppError(
      'The AI assistant is busy right now. Please try again shortly.',
      429,
      'AI_PROVIDER_RATE_LIMITED',
    );
  }
  if (!response.ok) {
    logger.error(
      { provider: providerName, status: response.status },
      'AI provider returned an error',
    );
    throw AppError.serviceUnavailable(
      'The AI assistant is unavailable right now. Please try again later.',
      'AI_UNAVAILABLE',
    );
  }
  try {
    return await response.json();
  } catch {
    throw new AppError(
      'The AI assistant returned an unreadable response. Please try again.',
      502,
      'AI_BAD_RESPONSE',
    );
  }
}
