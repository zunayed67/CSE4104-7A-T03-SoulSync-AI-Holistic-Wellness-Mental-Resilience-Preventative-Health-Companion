import http from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { GeminiProvider } from '../../../src/services/ai/providers/gemini.provider.js';
import { OpenAIProvider } from '../../../src/services/ai/providers/openai.provider.js';
import {
  getProvider,
  resetProviderCache,
} from '../../../src/services/ai/providers/provider.factory.js';
import { AIProvider } from '../../../src/services/ai/providers/provider.interface.js';

let server;
let baseUrl;
let received;
let respond;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      received = { url: req.url, headers: req.headers, body: body ? JSON.parse(body) : null };
      respond(res);
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => new Promise((resolve) => {
  server.closeAllConnections();
  server.close(resolve);
}));
beforeEach(() => {
  received = null;
  respond = (res) => res.writeHead(500).end();
});

const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};
const request = {
  system: 'SYSTEM RULES',
  messages: [
    { role: 'user', content: 'hello' },
    { role: 'assistant', content: 'hi' },
    { role: 'user', content: 'plan my day' },
  ],
};

describe('OpenAIProvider', () => {
  const make = (extra = {}) =>
    new OpenAIProvider({ apiKey: 'sk-test', timeoutMs: 2000, baseUrl, ...extra });

  it('sends the key in the Authorization header and returns trimmed text with usage', async () => {
    respond = (res) =>
      json(res, 200, {
        choices: [{ message: { content: '  Sure!  ' } }],
        usage: { prompt_tokens: 12, completion_tokens: 3 },
      });
    const result = await make({ model: 'gpt-4.1-mini' }).generate(request);

    expect(result).toEqual({ text: 'Sure!', usage: { inputTokens: 12, outputTokens: 3 } });
    expect(received.url).toBe('/chat/completions');
    expect(received.headers.authorization).toBe('Bearer sk-test');
    expect(received.body.model).toBe('gpt-4.1-mini');
    expect(received.body.messages[0]).toEqual({ role: 'system', content: 'SYSTEM RULES' });
    expect(received.body.messages).toHaveLength(4);
    expect(received.body.temperature).toBe(0.6);
    expect(received.body.reasoning_effort).toBeUndefined();
    expect(JSON.stringify(received.body)).not.toContain('sk-test');
  });

  it('adapts parameters for reasoning models and asks for JSON when requested', async () => {
    respond = (res) => json(res, 200, { choices: [{ message: { content: '{"a":1}' } }] });
    await make().generate({ ...request, json: true, maxOutputTokens: 500 });
    expect(received.body.model).toBe('gpt-5-mini');
    expect(received.body.temperature).toBeUndefined();
    expect(received.body.reasoning_effort).toBe('low');
    expect(received.body.max_completion_tokens).toBe(2000);
    expect(received.body.response_format).toEqual({ type: 'json_object' });
  });

  it.each([
    [429, 'AI_PROVIDER_RATE_LIMITED', 429],
    [401, 'AI_UNAVAILABLE', 503],
    [500, 'AI_UNAVAILABLE', 503],
  ])('maps HTTP %i to %s without leaking provider details', async (status, code, mapped) => {
    respond = (res) => json(res, status, { error: { message: 'secret provider detail sk-test' } });
    const error = await make()
      .generate(request)
      .catch((e) => e);
    expect(error).toMatchObject({ code, statusCode: mapped, isOperational: true });
    expect(error.message).not.toMatch(/secret|sk-test/);
  });

  it('maps empty answers and unreadable bodies to 502', async () => {
    respond = (res) => json(res, 200, { choices: [{ message: { content: '   ' } }] });
    expect(
      await make()
        .generate(request)
        .catch((e) => e),
    ).toMatchObject({ code: 'AI_EMPTY_RESPONSE', statusCode: 502 });
    respond = (res) => res.writeHead(200).end('<html>not json</html>');
    expect(
      await make()
        .generate(request)
        .catch((e) => e),
    ).toMatchObject({ code: 'AI_BAD_RESPONSE', statusCode: 502 });
  });

  it('times out slow providers with a friendly 504', async () => {
    respond = () => {}; // never answers
    const started = Date.now();
    const error = await make({ timeoutMs: 150 })
      .generate(request)
      .catch((e) => e);
    expect(error).toMatchObject({ code: 'AI_TIMEOUT', statusCode: 504 });
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('reports an unreachable provider as unavailable', async () => {
    const error = await make({ baseUrl: 'http://127.0.0.1:1' })
      .generate(request)
      .catch((e) => e);
    expect(error).toMatchObject({ code: 'AI_UNAVAILABLE', statusCode: 503 });
  });
});

describe('GeminiProvider', () => {
  const make = (extra = {}) =>
    new GeminiProvider({ apiKey: 'gm-test', timeoutMs: 2000, baseUrl, ...extra });

  it('sends the key in a header (never the URL), maps roles and joins the answer parts', async () => {
    respond = (res) =>
      json(res, 200, {
        candidates: [{ content: { parts: [{ text: 'Part one. ' }, { text: 'Part two.' }] } }],
        usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 8 },
      });
    const result = await make({ model: 'gemini-test' }).generate({ ...request, json: true });

    expect(result).toEqual({
      text: 'Part one. Part two.',
      usage: { inputTokens: 20, outputTokens: 8 },
    });
    expect(received.url).toBe('/v1beta/models/gemini-test:generateContent');
    expect(received.headers['x-goog-api-key']).toBe('gm-test');
    expect(received.url).not.toContain('gm-test');
    expect(received.body.systemInstruction.parts[0].text).toBe('SYSTEM RULES');
    expect(received.body.contents.map((c) => c.role)).toEqual(['user', 'model', 'user']);
    expect(received.body.generationConfig.responseMimeType).toBe('application/json');
  });

  it('uses the "latest" Flash alias by default', async () => {
    respond = (res) => json(res, 200, { candidates: [{ content: { parts: [{ text: 'ok' }] } }] });
    await make().generate(request);
    expect(received.url).toBe('/v1beta/models/gemini-3.5-flash-lite:generateContent');
  });

  it('maps blocked prompts, empty candidates, rate limits and outages', async () => {
    respond = (res) => json(res, 200, { promptFeedback: { blockReason: 'SAFETY' } });
    expect(
      await make()
        .generate(request)
        .catch((e) => e),
    ).toMatchObject({ code: 'AI_BLOCKED', statusCode: 502 });
    respond = (res) => json(res, 200, { candidates: [{ content: { parts: [] } }] });
    expect(
      await make()
        .generate(request)
        .catch((e) => e),
    ).toMatchObject({ code: 'AI_EMPTY_RESPONSE' });
    respond = (res) => json(res, 429, {});
    expect(
      await make()
        .generate(request)
        .catch((e) => e),
    ).toMatchObject({ code: 'AI_PROVIDER_RATE_LIMITED', statusCode: 429 });
    respond = (res) => json(res, 503, {});
    expect(
      await make()
        .generate(request)
        .catch((e) => e),
    ).toMatchObject({ code: 'AI_UNAVAILABLE', statusCode: 503 });
  });

  it.each([
    ['QUOTA_EXHAUSTED', 'AI_PROVIDER_QUOTA_EXHAUSTED'],
    ['GenerateRequestsPerMinutePerProjectPerModel', 'AI_PROVIDER_RPM_LIMITED'],
    ['GenerateContentInputTokensPerMinutePerModel', 'AI_PROVIDER_TPM_LIMITED'],
  ])('distinguishes Gemini quota category %s without retrying', async (quotaId, code) => {
    let calls = 0;
    respond = (res) => {
      calls += 1;
      json(res, 429, { error: { status: 'RESOURCE_EXHAUSTED', message: 'Resource exhausted', details: [{ quotaId }] } });
    };
    const error = await make().generate(request).catch((e) => e);
    expect(error).toMatchObject({ code, statusCode: 429 });
    expect(calls).toBe(1);
    expect(error.message).not.toContain(quotaId);
  });

  it('retries one transient provider outage and then succeeds', async () => {
    let calls = 0;
    respond = (res) => {
      calls += 1;
      if (calls === 1) return json(res, 503, { error: { message: 'internal service detail' } });
      json(res, 200, { candidates: [{ content: { parts: [{ text: 'ready' }] } }] });
    };
    await expect(make().generate(request)).resolves.toMatchObject({ text: 'ready' });
    expect(calls).toBe(2);
  });

  it('maps invalid credentials and unknown models to safe setup errors', async () => {
    respond = (res) => json(res, 400, { error: { status: 'INVALID_ARGUMENT', message: 'API_KEY_INVALID' } });
    await expect(make().generate(request)).rejects.toMatchObject({ code: 'AI_PROVIDER_INVALID_KEY' });
    respond = (res) => json(res, 404, { error: { message: 'Model not found' } });
    await expect(make().generate(request)).rejects.toMatchObject({ code: 'AI_MODEL_UNAVAILABLE' });
  });
});

describe('provider contract and factory', () => {
  it('both adapters implement the common interface', () => {
    for (const provider of [
      new OpenAIProvider({ apiKey: 'k' }),
      new GeminiProvider({ apiKey: 'k' }),
    ]) {
      expect(provider).toBeInstanceOf(AIProvider);
      expect(typeof provider.generate).toBe('function');
    }
    expect(new OpenAIProvider({ apiKey: 'k' }).name).toBe('openai');
    expect(new GeminiProvider({ apiKey: 'k' }).name).toBe('gemini');
  });

  it('the abstract base class refuses direct use', async () => {
    await expect(new AIProvider().generate({})).rejects.toThrow(/must be implemented/);
  });

  it('the factory reports a missing key as a friendly 503 instead of crashing', () => {
    resetProviderCache();
    expect(() => getProvider()).toThrowError(
      expect.objectContaining({ code: 'AI_NOT_CONFIGURED', statusCode: 503 }),
    );
  });
});
