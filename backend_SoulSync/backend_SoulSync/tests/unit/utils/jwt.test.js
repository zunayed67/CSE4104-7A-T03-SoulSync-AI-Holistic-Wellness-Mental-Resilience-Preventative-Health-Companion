import jsonwebtoken from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { config } from '../../../src/config/index.js';
import {
  clearAuthCookie,
  getAuthCookieOptions,
  setAuthCookie,
  signAuthToken,
  verifyAuthToken,
} from '../../../src/utils/jwt.js';

const claims = { role: 'user' };
const base = { subject: 'user-1', issuer: 'soulsync-api', audience: 'soulsync-web' };

describe('auth tokens', () => {
  it('round-trips user id and role', () => {
    const token = signAuthToken({ userId: 'abc123', role: 'admin' });
    const result = verifyAuthToken(token);
    expect(result).toMatchObject({ userId: 'abc123', role: 'admin' });
    expect(result.expiresAt - result.issuedAt).toBe(config.jwt.expiresInDays * 86400);
  });

  it('rejects a tampered token', () => {
    const token = signAuthToken({ userId: 'abc123', role: 'user' });
    const tampered = `${token.slice(0, -2)}xx`;
    expect(() => verifyAuthToken(tampered)).toThrowError(
      expect.objectContaining({ code: 'INVALID_TOKEN', statusCode: 401 }),
    );
  });

  it('rejects tokens signed with another secret', () => {
    const forged = jsonwebtoken.sign(claims, 'x'.repeat(40), base);
    expect(() => verifyAuthToken(forged)).toThrowError(
      expect.objectContaining({ code: 'INVALID_TOKEN' }),
    );
  });

  it('reports expired tokens distinctly', () => {
    const expired = jsonwebtoken.sign(claims, config.jwt.secret, { ...base, expiresIn: -10 });
    expect(() => verifyAuthToken(expired)).toThrowError(
      expect.objectContaining({ code: 'TOKEN_EXPIRED' }),
    );
  });

  it('rejects unsigned "alg: none" tokens and wrong audiences', () => {
    const none = jsonwebtoken.sign(claims, '', { ...base, algorithm: 'none' });
    expect(() => verifyAuthToken(none)).toThrowError(
      expect.objectContaining({ code: 'INVALID_TOKEN' }),
    );
    const wrongAudience = jsonwebtoken.sign(claims, config.jwt.secret, {
      ...base,
      audience: 'other',
    });
    expect(() => verifyAuthToken(wrongAudience)).toThrowError(
      expect.objectContaining({ code: 'INVALID_TOKEN' }),
    );
  });

  it('rejects tokens carrying an unknown role', () => {
    const token = jsonwebtoken.sign({ role: 'superuser' }, config.jwt.secret, base);
    expect(() => verifyAuthToken(token)).toThrowError(
      expect.objectContaining({ code: 'INVALID_TOKEN' }),
    );
  });
});

describe('auth cookie', () => {
  it('is HttpOnly with the configured attributes', () => {
    expect(getAuthCookieOptions()).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: config.cookie.maxAgeMs,
    });
  });

  it('sets and clears the cookie with matching attributes', () => {
    const calls = [];
    const res = {
      cookie: (...args) => calls.push(['cookie', ...args]),
      clearCookie: (...args) => calls.push(['clear', ...args]),
    };
    setAuthCookie(res, 'tok');
    clearAuthCookie(res);
    expect(calls[0].slice(0, 3)).toEqual(['cookie', 'soulsync_token', 'tok']);
    expect(calls[1][1]).toBe('soulsync_token');
    expect(calls[1][2]).toMatchObject({ httpOnly: true, path: '/' });
    expect(calls[1][2]).not.toHaveProperty('maxAge');
  });
});
