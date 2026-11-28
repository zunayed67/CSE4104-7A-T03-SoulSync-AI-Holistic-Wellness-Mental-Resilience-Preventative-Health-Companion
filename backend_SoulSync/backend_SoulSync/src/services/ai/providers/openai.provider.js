import { AI_LIMITS } from '../../../config/constants.js';
import { AppError } from '../../../utils/AppError.js';
import { AIProvider, postJson } from './provider.interface.js';

/** Used when AI_MODEL is not set. Model catalogues change often; override with AI_MODEL. */
export const OPENAI_DEFAULT_MODEL = 'gpt-5-mini';

/** GPT-5 and o-series models reason before answering and reject custom temperature. */
const isReasoningModel = (model) => /^(gpt-5|o\d)/.test(model);

export class OpenAIProvider extends AIProvider {
  constructor({ apiKey, model, timeoutMs, baseUrl = 'https://api.openai.com/v1' }) {
    super();
    this.apiKey = apiKey;
    this.model = model || OPENAI_DEFAULT_MODEL;
    this.timeoutMs = timeoutMs;
    this.baseUrl = baseUrl;
  }

  get name() {
    return 'openai';
  }

  async generate({
    system,
    messages,
    maxOutputTokens = AI_LIMITS.MAX_OUTPUT_TOKENS,
    json = false,
  }) {
    const reasoning = isReasoningModel(this.model);
    const body = {
      model: this.model,
      messages: [{ role: 'system', content: system }, ...messages],
      // Reasoning tokens count against this cap, so reasoning models get headroom.
      max_completion_tokens: reasoning ? maxOutputTokens * 4 : maxOutputTokens,
    };
    if (reasoning) body.reasoning_effort = 'low';
    else body.temperature = 0.6;
    if (json) body.response_format = { type: 'json_object' };

    const data = await postJson({
      url: `${this.baseUrl}/chat/completions`,
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body,
      timeoutMs: this.timeoutMs,
      providerName: this.name,
    });

    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || text.trim() === '') {
      throw new AppError(
        'The AI assistant returned an empty answer. Please try again.',
        502,
        'AI_EMPTY_RESPONSE',
      );
    }
    return {
      text: text.trim(),
      usage: {
        inputTokens: data.usage?.prompt_tokens,
        outputTokens: data.usage?.completion_tokens,
      },
    };
  }
}
