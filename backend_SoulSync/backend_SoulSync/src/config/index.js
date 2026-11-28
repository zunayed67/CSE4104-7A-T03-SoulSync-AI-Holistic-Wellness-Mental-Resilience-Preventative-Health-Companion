import dotenv from 'dotenv';
import { z } from 'zod';
import { isValidTimezone } from '../utils/date.js';

// Tests set their own environment; a developer's local .env must never leak into them.
if (process.env.NODE_ENV !== 'test') dotenv.config({ quiet: true });

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'];

/** "true"/"false" string -> boolean. The default is applied BEFORE the transform. */
const flag = (defaultValue) =>
  z
    .enum(['true', 'false'])
    .default(defaultValue)
    .transform((value) => value === 'true');

/**
 * Parse a comma-separated origin list into normalised origins (no path, no trailing slash).
 * @returns {{ origins: string[] } | { error: string }}
 */
function parseOrigins(raw) {
  const origins = [];
  for (const item of raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)) {
    let url;
    try {
      url = new URL(item);
    } catch {
      return { error: `"${item}" is not a valid URL` };
    }
    const isBareOrigin = url.pathname === '/' && !url.search && !url.hash;
    if (!['http:', 'https:'].includes(url.protocol) || !isBareOrigin) {
      return {
        error: `"${item}" must be an http(s) origin without a path (e.g. https://app.example.com)`,
      };
    }
    origins.push(url.origin);
  }
  if (origins.length === 0) return { error: 'must contain at least one origin' };
  return { origins: [...new Set(origins)] };
}

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(5000),
    TRUST_PROXY: z.coerce.number().int().min(0).max(10).optional(),
    LOG_LEVEL: z.enum(LOG_LEVELS).optional(),
    DEFAULT_TIMEZONE: z
      .string()
      .default('Asia/Dhaka')
      .refine(isValidTimezone, 'must be a valid IANA timezone (e.g. Asia/Dhaka)'),
    ENABLE_JOBS: flag('true'),

    MONGODB_URI: z
      .string()
      .regex(/^mongodb(\+srv)?:\/\/.+/, 'must start with mongodb:// or mongodb+srv://'),

    JWT_SECRET: z.string().min(32, 'must be at least 32 characters'),
    JWT_EXPIRES_IN_DAYS: z.coerce.number().int().min(1).max(90).default(7),
    COOKIE_SECURE: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
    COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).optional(),
    COOKIE_DOMAIN: z.string().optional(),

    CLIENT_ORIGINS: z.string().optional(),

    RATE_LIMIT_WINDOW_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .default(15 * 60 * 1000),
    RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(300),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(20),
    AI_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(10),

    AI_PROVIDER: z.enum(['openai', 'gemini']).default('gemini'),
    OPENAI_API_KEY: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
    AI_MODEL: z.string().optional(),
    AI_DAILY_REQUEST_LIMIT: z.coerce.number().int().min(1).default(30),
    AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(20000),

    EMAIL_ENABLED: flag('false'),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    SMTP_SECURE: flag('false'),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    const fail = (path, message) => ctx.addIssue({ code: 'custom', path: [path], message });
    const isProduction = env.NODE_ENV === 'production';

    if (env.CLIENT_ORIGINS === undefined) {
      if (isProduction) fail('CLIENT_ORIGINS', 'is required in production');
    } else {
      const parsed = parseOrigins(env.CLIENT_ORIGINS);
      if (parsed.error) fail('CLIENT_ORIGINS', parsed.error);
    }

    const secure = env.COOKIE_SECURE ?? isProduction;
    const sameSite = env.COOKIE_SAME_SITE ?? (isProduction ? 'none' : 'lax');
    if (sameSite === 'none' && !secure) {
      fail('COOKIE_SAME_SITE', 'none requires secure cookies (set COOKIE_SECURE=true)');
    }

    if (env.EMAIL_ENABLED) {
      for (const key of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM']) {
        if (!env[key]) fail(key, 'is required when EMAIL_ENABLED=true');
      }
    }
  });

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

/**
 * Validate an environment object and build the immutable config.
 * Empty strings are treated as "unset" so `FOO=` lines in .env.example fall back to defaults.
 * @param {Record<string, string | undefined>} [env=process.env]
 * @throws {Error} listing every invalid variable at once.
 */
export function loadConfig(env = process.env) {
  const cleaned = Object.fromEntries(
    Object.entries(env).filter(([, value]) => typeof value === 'string' && value.trim() !== ''),
  );

  const result = envSchema.safeParse(cleaned);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  - ${i.path.join('.') || 'env'}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${lines.join('\n')}`);
  }

  const e = result.data;
  const isProduction = e.NODE_ENV === 'production';
  const isTest = e.NODE_ENV === 'test';
  const aiKeys = { openai: e.OPENAI_API_KEY, gemini: e.GEMINI_API_KEY };

  return deepFreeze({
    env: e.NODE_ENV,
    isProduction,
    isTest,
    isDevelopment: e.NODE_ENV === 'development',
    port: e.PORT,
    trustProxy: e.TRUST_PROXY ?? (isProduction ? 1 : 0),
    defaultTimezone: e.DEFAULT_TIMEZONE,
    jobs: { enabled: e.ENABLE_JOBS },
    log: { level: e.LOG_LEVEL ?? (isTest ? 'silent' : isProduction ? 'info' : 'debug') },
    db: { uri: e.MONGODB_URI },
    security: { bcryptRounds: isTest ? 4 : 12 },
    jwt: { secret: e.JWT_SECRET, expiresInDays: e.JWT_EXPIRES_IN_DAYS },
    cookie: {
      secure: e.COOKIE_SECURE ?? isProduction,
      sameSite: e.COOKIE_SAME_SITE ?? (isProduction ? 'none' : 'lax'),
      domain: e.COOKIE_DOMAIN,
      maxAgeMs: e.JWT_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000,
    },
    cors: { origins: parseOrigins(e.CLIENT_ORIGINS ?? 'http://localhost:5173').origins },
    rateLimit: {
      windowMs: e.RATE_LIMIT_WINDOW_MS,
      max: e.RATE_LIMIT_MAX,
      authMax: e.AUTH_RATE_LIMIT_MAX,
      aiMax: e.AI_RATE_LIMIT_MAX,
    },
    ai: {
      provider: e.AI_PROVIDER,
      openaiApiKey: e.OPENAI_API_KEY,
      geminiApiKey: e.GEMINI_API_KEY,
      model: e.AI_MODEL,
      dailyRequestLimit: e.AI_DAILY_REQUEST_LIMIT,
      requestTimeoutMs: e.AI_REQUEST_TIMEOUT_MS,
      isConfigured: Boolean(aiKeys[e.AI_PROVIDER]),
    },
    email: {
      enabled: e.EMAIL_ENABLED,
      host: e.SMTP_HOST,
      port: e.SMTP_PORT,
      secure: e.SMTP_SECURE,
      user: e.SMTP_USER,
      pass: e.SMTP_PASS,
      from: e.EMAIL_FROM,
    },
  });
}

export const config = loadConfig();
