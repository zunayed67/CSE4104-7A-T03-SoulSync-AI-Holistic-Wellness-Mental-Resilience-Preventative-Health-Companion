import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config/index.js';
import { ROLES } from '../../src/config/constants.js';
import { authorize } from '../../src/middlewares/authorize.js';
import { errorHandler } from '../../src/middlewares/errorHandler.js';
import { notFound } from '../../src/middlewares/notFound.js';
import { createRateLimiter } from '../../src/middlewares/rateLimiters.js';
import { validate } from '../../src/middlewares/validate.js';
import { listJobs, registerJob, runJobNow } from '../../src/jobs/scheduler.js';
import { AppError } from '../../src/utils/AppError.js';
import { buildPaginationMeta, normalizePagination } from '../../src/utils/pagination.js';

const ORIGIN = 'http://localhost:5173';

/** Tiny app wired with the real 404 + error handler, for exercising one middleware at a time. */
function miniApp(mount) {
  const app = express();
  app.use(express.json());
  mount(app);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

describe('app: health, headers and fallbacks', () => {
  const app = createApp();

  it('answers the liveness probe with the success envelope and a request id', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: { status: 'ok' } });
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('echoes a safe client request id but replaces an unsafe one', async () => {
    const safe = await request(app).get('/api/v1/health').set('X-Request-Id', 'abc-12345678');
    expect(safe.headers['x-request-id']).toBe('abc-12345678');
    const unsafe = await request(app)
      .get('/api/v1/health')
      .set('X-Request-Id', 'bad id\twith spaces');
    expect(unsafe.headers['x-request-id']).not.toBe('bad id\twith spaces');
  });

  it('sets security headers and forbids caching', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('reports not-ready (503) while MongoDB is disconnected', async () => {
    const res = await request(app).get('/api/v1/health/ready');
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('DB_UNAVAILABLE');
  });

  it('returns the 404 envelope for unknown routes', async () => {
    const res = await request(app).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, error: { code: 'ROUTE_NOT_FOUND' } });
    expect(res.body.error.requestId).toBeTruthy();
  });

  it('rejects malformed JSON with 400', async () => {
    const res = await request(app)
      .post('/api/v1/anything')
      .set('Content-Type', 'application/json')
      .send('{"broken":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  it('rejects oversized bodies with 413', async () => {
    const res = await request(app)
      .post('/api/v1/anything')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ blob: 'x'.repeat(150 * 1024) }));
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});

describe('app: CORS', () => {
  const app = createApp();

  it('allows the configured origin with credentials', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', ORIGIN);
    expect(res.headers['access-control-allow-origin']).toBe(ORIGIN);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('answers preflight requests', async () => {
    const res = await request(app)
      .options('/api/v1/health')
      .set('Origin', ORIGIN)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-methods']).toContain('PATCH');
  });

  it('rejects other origins for any method', async () => {
    const attempts = [
      request(app).get('/api/v1/health').set('Origin', 'https://evil.example'),
      request(app).post('/api/v1/health').set('Origin', 'https://evil.example').send({}),
    ];
    for (const res of await Promise.all(attempts)) {
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CORS_ORIGIN_DENIED');
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    }
  });
});

describe('rate limiting', () => {
  it('returns the standard 429 envelope once the limit is exceeded', async () => {
    const limiter = createRateLimiter({ windowMs: 60_000, limit: 2, message: 'slow down' });
    const app = miniApp((a) => a.get('/ping', limiter, (_req, res) => res.json({ ok: true })));

    expect((await request(app).get('/ping')).status).toBe(200);
    expect((await request(app).get('/ping')).status).toBe(200);
    const blocked = await request(app).get('/ping');
    expect(blocked.status).toBe(429);
    expect(blocked.body).toMatchObject({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'slow down' },
    });
    expect(blocked.headers['ratelimit']).toBeTruthy();
  });
});

describe('validate middleware', () => {
  const schemas = {
    params: z.object({ id: z.string().regex(/^[a-f0-9]{24}$/) }),
    query: z.object({ limit: z.coerce.number().int().min(1).max(50).default(10) }),
    body: z.object({ name: z.string().trim().min(2), age: z.number().int().min(13) }),
  };
  const app = miniApp((a) =>
    a.post('/things/:id', validate(schemas), (req, res) => res.json(req.validated)),
  );
  const id = 'a'.repeat(24);

  it('exposes typed data and strips unknown fields', async () => {
    const res = await request(app)
      .post(`/things/${id}?limit=5`)
      .send({ name: '  Ayesha ', age: 21, role: 'admin' });
    expect(res.status).toBe(200);
    expect(res.body.query.limit).toBe(5);
    expect(res.body.body).toEqual({ name: 'Ayesha', age: 21 });
  });

  it('applies defaults', async () => {
    const res = await request(app).post(`/things/${id}`).send({ name: 'Ayesha', age: 21 });
    expect(res.body.query.limit).toBe(10);
  });

  it('reports every problem with its location, without echoing submitted values', async () => {
    const res = await request(app)
      .post('/things/not-an-id?limit=999')
      .send({ name: 'x', age: 'secret-value' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const locations = res.body.error.details.map((d) => `${d.location}.${d.path}`);
    expect(locations).toEqual(
      expect.arrayContaining(['params.id', 'query.limit', 'body.name', 'body.age']),
    );
    expect(JSON.stringify(res.body)).not.toContain('secret-value');
  });
});

describe('authorize middleware', () => {
  const makeApp = (user) =>
    miniApp((a) => {
      a.use((req, _res, next) => {
        if (user) req.user = user;
        next();
      });
      a.get('/admin', authorize(ROLES.ADMIN), (_req, res) => res.json({ ok: true }));
    });

  it('returns 401 without a user, 403 for the wrong role and 200 for an allowed role', async () => {
    expect((await request(makeApp(null)).get('/admin')).status).toBe(401);
    const forbidden = await request(makeApp({ id: '1', role: ROLES.USER })).get('/admin');
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe('FORBIDDEN');
    expect((await request(makeApp({ id: '2', role: ROLES.ADMIN })).get('/admin')).status).toBe(200);
  });

  it('fails fast on a misconfigured route', () => {
    expect(() => authorize()).toThrow(TypeError);
    expect(() => authorize('superuser')).toThrow(/unknown role/);
  });
});

describe('error handler', () => {
  const failWith = (error) =>
    miniApp((a) =>
      a.get('/boom', () => {
        throw error;
      }),
    );

  it('hides internals of unexpected errors', async () => {
    const res = await request(failWith(new Error('db password is hunter2'))).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(res.body)).not.toContain('hunter2');
    expect(JSON.stringify(res.body)).not.toContain('stack');
  });

  it('passes AppError details through', async () => {
    const res = await request(
      failWith(AppError.conflict('Email already registered', 'EMAIL_TAKEN')),
    ).get('/boom');
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({
      code: 'EMAIL_TAKEN',
      message: 'Email already registered',
    });
  });

  it('maps Mongoose cast errors to 400 without leaking the value', async () => {
    const cast = new mongoose.Error.CastError('ObjectId', 'secret-input', '_id');
    const res = await request(failWith(cast)).get('/boom');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_VALUE');
    expect(JSON.stringify(res.body)).not.toContain('secret-input');
  });

  it('maps duplicate-key errors to 409', async () => {
    const duplicate = Object.assign(new Error('E11000 duplicate key'), {
      code: 11000,
      keyPattern: { userId: 1, date: 1 },
    });
    const res = await request(failWith(duplicate)).get('/boom');
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({
      code: 'DUPLICATE_RESOURCE',
      details: { fields: ['userId', 'date'] },
    });
  });
});

describe('scheduler registry', () => {
  it('validates job definitions', () => {
    expect(() => registerJob({ name: '', schedule: '* * * * *', handler: () => {} })).toThrow(
      TypeError,
    );
    expect(() =>
      registerJob({ name: 'bad-cron', schedule: 'not a cron', handler: () => {} }),
    ).toThrow(/invalid cron/);
    expect(() => registerJob({ name: 'no-handler', schedule: '* * * * *' })).toThrow(/handler/);
  });

  it('isolates failures, prevents duplicates and skips overlapping runs', async () => {
    let calls = 0;
    let release;
    registerJob({
      name: 'test-job',
      schedule: '0 0 * * *',
      handler: () => {
        calls += 1;
        return new Promise((resolve) => (release = resolve));
      },
    });
    expect(() =>
      registerJob({ name: 'test-job', schedule: '0 0 * * *', handler: () => {} }),
    ).toThrow(/already registered/);
    expect(listJobs()).toContainEqual(
      expect.objectContaining({ name: 'test-job', schedule: '0 0 * * *' }),
    );

    const first = runJobNow('test-job');
    await runJobNow('test-job'); // overlapping call returns immediately without running
    expect(calls).toBe(1);
    release();
    await first;

    registerJob({
      name: 'failing-job',
      schedule: '0 0 * * *',
      handler: () => {
        throw new Error('boom');
      },
    });
    await expect(runJobNow('failing-job')).resolves.toBeUndefined();
    await expect(runJobNow('missing-job')).rejects.toThrow(/Unknown job/);
  });
});

describe('pagination helpers', () => {
  it('clamps untrusted values', () => {
    expect(normalizePagination({ page: '3', limit: '10' })).toEqual({
      page: 3,
      limit: 10,
      skip: 20,
    });
    expect(normalizePagination({ page: -4, limit: 5000 })).toEqual({
      page: 1,
      limit: 100,
      skip: 0,
    });
    expect(normalizePagination({ page: 'x', limit: 'y' })).toEqual({ page: 1, limit: 20, skip: 0 });
    expect(normalizePagination()).toEqual({ page: 1, limit: 20, skip: 0 });
  });

  it('builds list metadata', () => {
    expect(buildPaginationMeta({ page: 2, limit: 10, total: 25 })).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNext: true,
      hasPrev: true,
    });
    expect(buildPaginationMeta({ page: 1, limit: 10, total: 0 }).totalPages).toBe(1);
  });
});

describe('loadConfig', () => {
  const valid = {
    NODE_ENV: 'development',
    MONGODB_URI: 'mongodb://localhost:27017/x',
    JWT_SECRET: 'a'.repeat(40),
  };

  it('builds a frozen config with safe defaults', () => {
    const cfg = loadConfig(valid);
    expect(Object.isFrozen(cfg)).toBe(true);
    expect(Object.isFrozen(cfg.jwt)).toBe(true);
    expect(cfg).toMatchObject({ port: 5000, trustProxy: 0, defaultTimezone: 'Asia/Dhaka' });
    expect(cfg.cors.origins).toEqual(['http://localhost:5173']);
    expect(cfg.cookie).toMatchObject({ secure: false, sameSite: 'lax' });
  });

  it('treats empty strings as unset', () => {
    const cfg = loadConfig({ ...valid, PORT: '', TRUST_PROXY: '', COOKIE_SAME_SITE: '' });
    expect(cfg.port).toBe(5000);
    expect(cfg.cookie.sameSite).toBe('lax');
  });

  it('lists every invalid variable at once', () => {
    expect(() => loadConfig({ NODE_ENV: 'development', JWT_SECRET: 'short' })).toThrow(
      /MONGODB_URI[\s\S]*JWT_SECRET/,
    );
  });

  it('normalises origins and rejects paths and wildcards', () => {
    const cfg = loadConfig({
      ...valid,
      CLIENT_ORIGINS: 'https://a.vercel.app/, https://b.example.com',
    });
    expect(cfg.cors.origins).toEqual(['https://a.vercel.app', 'https://b.example.com']);
    expect(() => loadConfig({ ...valid, CLIENT_ORIGINS: 'https://a.example.com/app' })).toThrow(
      /without a path/,
    );
    expect(() => loadConfig({ ...valid, CLIENT_ORIGINS: '*' })).toThrow(/not a valid URL/);
  });

  it('applies cross-site cookie defaults in production and requires origins', () => {
    expect(() => loadConfig({ ...valid, NODE_ENV: 'production' })).toThrow(/CLIENT_ORIGINS/);
    const cfg = loadConfig({
      ...valid,
      NODE_ENV: 'production',
      CLIENT_ORIGINS: 'https://app.example.com',
    });
    expect(cfg).toMatchObject({ trustProxy: 1, log: { level: 'info' } });
    expect(cfg.cookie).toMatchObject({ secure: true, sameSite: 'none' });
  });

  it('rejects SameSite=None without secure cookies', () => {
    expect(() => loadConfig({ ...valid, COOKIE_SAME_SITE: 'none' })).toThrow(/requires secure/);
  });

  it('requires SMTP settings when email is enabled', () => {
    expect(() => loadConfig({ ...valid, EMAIL_ENABLED: 'true' })).toThrow(
      /SMTP_HOST[\s\S]*EMAIL_FROM/,
    );
  });

  it('reports whether the selected AI provider has a key', () => {
    expect(loadConfig({ ...valid, AI_PROVIDER: 'gemini' }).ai.isConfigured).toBe(false);
    expect(
      loadConfig({ ...valid, AI_PROVIDER: 'gemini', GEMINI_API_KEY: 'k' }).ai.isConfigured,
    ).toBe(true);
  });
});
