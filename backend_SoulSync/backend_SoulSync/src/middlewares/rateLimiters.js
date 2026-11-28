import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { config } from '../config/index.js';
import { AppError } from '../utils/AppError.js';

/**
 * Build a limiter that reports through the central error handler (standard JSON envelope).
 * Counters live in process memory, which is correct for a single Render instance; scaling to
 * several instances would need a shared store (e.g. Redis).
 *
 * @param {{ windowMs: number, limit: number, message: string, code?: string,
 *           keyGenerator?: (req: import('express').Request) => string }} options
 */
export function createRateLimiter({
  windowMs,
  limit,
  message,
  code = 'RATE_LIMITED',
  keyGenerator,
}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    ...(keyGenerator && { keyGenerator }),
    handler: (_req, _res, next) => next(AppError.tooManyRequests(message, code)),
  });
}

/** Baseline protection for every route, keyed by client IP. */
export const globalLimiter = createRateLimiter({
  windowMs: config.rateLimit.windowMs,
  limit: config.rateLimit.max,
  message: 'Too many requests. Please slow down and try again shortly.',
});

/** Brute-force protection for login and registration, keyed by client IP. */
export const authLimiter = createRateLimiter({
  windowMs: config.rateLimit.windowMs,
  limit: config.rateLimit.authMax,
  message: 'Too many authentication attempts. Please try again later.',
  code: 'AUTH_RATE_LIMITED',
});

/**
 * Burst limiter for AI endpoints. Mount it AFTER `authenticate` so it is keyed per user;
 * it falls back to the client IP if no user is attached. This is separate from the
 * persistent per-user daily quota stored in the aiUsage collection.
 */
export const aiLimiter = createRateLimiter({
  windowMs: 60_000,
  limit: config.rateLimit.aiMax,
  message: 'You are sending AI requests too quickly. Please wait a moment.',
  code: 'AI_RATE_LIMITED',
  keyGenerator: (req) => (req.user?.id ? `user:${req.user.id}` : ipKeyGenerator(req.ip)),
});
