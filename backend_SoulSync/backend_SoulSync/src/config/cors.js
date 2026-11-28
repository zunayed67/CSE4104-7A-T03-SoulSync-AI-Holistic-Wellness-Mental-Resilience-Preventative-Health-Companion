import cors from 'cors';
import { config } from './index.js';
import { AppError } from '../utils/AppError.js';

/**
 * Origin allowlist with credentials, required because auth uses an HTTP-only cookie.
 *
 * Browsers always send an Origin header on cross-origin requests. Requests whose Origin is not
 * allowlisted are rejected for every method, not only preflights. In production the cookie is
 * SameSite=None (frontend and API live on different sites), so this check is also what stops
 * other websites from making state-changing calls with a visitor's cookie (CSRF).
 * Requests with no Origin (curl, health checks, same-origin) carry no browser cookie risk.
 */
export function buildCorsOptions(origins = config.cors.origins) {
  const allowed = new Set(origins);
  return {
    origin(origin, callback) {
      if (!origin || allowed.has(origin)) return callback(null, true);
      return callback(new AppError('Origin not allowed', 403, 'CORS_ORIGIN_DENIED'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
    exposedHeaders: ['X-Request-Id', 'RateLimit', 'RateLimit-Policy', 'Retry-After'],
    maxAge: 600,
    optionsSuccessStatus: 204,
  };
}

export const corsMiddleware = cors(buildCorsOptions());
