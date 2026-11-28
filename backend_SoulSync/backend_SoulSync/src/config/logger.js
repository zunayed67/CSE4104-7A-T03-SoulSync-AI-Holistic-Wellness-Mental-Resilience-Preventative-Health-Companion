import pino from 'pino';
import { config } from './index.js';

/**
 * Fields that must never reach the logs. fast-redact wildcards cover one nesting level,
 * so each key is listed at the top level and one level down (e.g. `body.password`).
 * Request bodies are not logged at all; this is defence in depth for ad-hoc log calls.
 */
const SENSITIVE_KEYS = [
  'password',
  'currentPassword',
  'newPassword',
  'token',
  'accessToken',
  'apiKey',
  'authorization',
  'cookie',
  'email',
  'content',
  'text',
  'journalText',
  'prompt',
];

export const REDACT_PATHS = [
  ...SENSITIVE_KEYS,
  ...SENSITIVE_KEYS.map((key) => `*.${key}`),
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
];

export const logger = pino({
  level: config.log.level,
  base: { service: 'soulsync-api', env: config.env },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
  serializers: { err: pino.stdSerializers.err },
  transport: config.isDevelopment
    ? {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
      }
    : undefined,
});
