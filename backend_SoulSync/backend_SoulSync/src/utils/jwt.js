import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { AUTH_COOKIE_NAME, ROLE_VALUES } from '../config/constants.js';
import { AppError } from './AppError.js';

const ISSUER = 'soulsync-api';
const AUDIENCE = 'soulsync-web';
const ALGORITHM = 'HS256';

/**
 * Sign a session token. The payload holds only the user id (`sub`) and role; everything else
 * is looked up server-side. Lifetime is config.jwt.expiresInDays.
 * @param {{ userId: string, role: string }} input
 */
export function signAuthToken({ userId, role }) {
  return jwt.sign({ role }, config.jwt.secret, {
    algorithm: ALGORITHM,
    subject: String(userId),
    expiresIn: config.jwt.expiresInDays * 24 * 60 * 60,
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}

/**
 * Verify a session token. The algorithm is pinned to HS256 (blocks "alg: none" and key-confusion
 * attacks) and issuer/audience are checked.
 * @returns {{ userId: string, role: string, issuedAt: number, expiresAt: number }}
 * @throws {AppError} 401 TOKEN_EXPIRED or INVALID_TOKEN.
 */
export function verifyAuthToken(token) {
  try {
    const payload = jwt.verify(token, config.jwt.secret, {
      algorithms: [ALGORITHM],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (typeof payload.sub !== 'string' || !ROLE_VALUES.includes(payload.role)) {
      throw AppError.unauthorized('Invalid authentication token.', 'INVALID_TOKEN');
    }
    return {
      userId: payload.sub,
      role: payload.role,
      issuedAt: payload.iat,
      expiresAt: payload.exp,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err.name === 'TokenExpiredError') {
      throw AppError.unauthorized(
        'Your session has expired. Please log in again.',
        'TOKEN_EXPIRED',
      );
    }
    throw AppError.unauthorized('Invalid authentication token.', 'INVALID_TOKEN');
  }
}

/** Cookie attributes for the session cookie. HttpOnly keeps the token away from page scripts. */
export function getAuthCookieOptions() {
  const options = {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: '/',
    maxAge: config.cookie.maxAgeMs,
  };
  if (config.cookie.domain) options.domain = config.cookie.domain;
  return options;
}

export function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
}

/** Attributes must match those used when setting the cookie or browsers keep the old one. */
export function clearAuthCookie(res) {
  const { maxAge: _maxAge, ...options } = getAuthCookieOptions();
  res.clearCookie(AUTH_COOKIE_NAME, options);
}
