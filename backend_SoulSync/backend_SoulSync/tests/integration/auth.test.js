import jsonwebtoken from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { config } from '../../src/config/index.js';
import { JournalEntry } from '../../src/models/journalEntry.model.js';
import { User } from '../../src/models/user.model.js';
import { WellnessLog } from '../../src/models/wellnessLog.model.js';
import { loginAgent } from '../helpers/authAgent.js';
import {
  TEST_PASSWORD,
  createAdmin,
  createJournalEntry,
  createUser,
  createWellnessLog,
} from '../helpers/factories.js';
import { clearTestDb, startTestDb, stopTestDb } from '../setup/testDb.js';

const app = createApp();
const api = '/api/v1';

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearTestDb);

const validRegistration = {
  name: 'Ayesha Rahman',
  email: 'ayesha@example.com',
  password: 'Sunrise-2026',
};

describe('POST /auth/register', () => {
  it('creates a user, signs them in with an HTTP-only cookie and never returns the hash', async () => {
    const res = await request(app).post(`${api}/auth/register`).send(validRegistration);

    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({
      name: 'Ayesha Rahman',
      email: 'ayesha@example.com',
      role: 'user',
      status: 'active',
      aiConsent: false,
      onboardingDone: false,
    });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|Sunrise-2026/);

    const cookie = res.headers['set-cookie'].find((c) => c.startsWith('soulsync_token='));
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Path=\//);
    expect(cookie).toMatch(/SameSite=Lax/i);

    const stored = await User.findOne({ email: 'ayesha@example.com' })
      .select('+passwordHash')
      .lean();
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(stored.passwordHash).not.toContain('Sunrise-2026');
  });

  it('ignores attempts to choose a role or status', async () => {
    const res = await request(app)
      .post(`${api}/auth/register`)
      .send({ ...validRegistration, role: 'admin', status: 'active', aiConsent: true });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('user');
    expect(res.body.data.user.aiConsent).toBe(false);
  });

  it('rejects weak passwords, bad emails and short names with field-level details', async () => {
    const res = await request(app)
      .post(`${api}/auth/register`)
      .send({ name: 'A', email: 'not-an-email', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const paths = res.body.error.details.map((d) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['name', 'email', 'password']));
    expect(JSON.stringify(res.body)).not.toContain('not-an-email');
  });

  it('requires a letter and a number in the password', async () => {
    const res = await request(app)
      .post(`${api}/auth/register`)
      .send({ ...validRegistration, password: 'onlyletters' });
    expect(res.status).toBe(400);
  });

  it('rejects a duplicate email regardless of case', async () => {
    await request(app).post(`${api}/auth/register`).send(validRegistration);
    const res = await request(app)
      .post(`${api}/auth/register`)
      .send({ ...validRegistration, email: 'AYESHA@Example.com' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('accepts a valid timezone and rejects an unknown one', async () => {
    const ok = await request(app)
      .post(`${api}/auth/register`)
      .send({ ...validRegistration, timezone: 'Asia/Dhaka' });
    expect(ok.body.data.user.timezone).toBe('Asia/Dhaka');
    const bad = await request(app)
      .post(`${api}/auth/register`)
      .send({ ...validRegistration, email: 'b@example.com', timezone: 'Mars/Phobos' });
    expect(bad.status).toBe(400);
  });
});

describe('POST /auth/login', () => {
  it('logs in and the cookie authorises /auth/me', async () => {
    const user = await createUser();
    const { agent } = await loginAgent(app, user);
    const me = await agent.get(`${api}/auth/me`);
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe(user.email);
  });

  it('gives the same error for a wrong password and an unknown email', async () => {
    const user = await createUser();
    const wrongPassword = await request(app)
      .post(`${api}/auth/login`)
      .send({ email: user.email, password: 'Wrong-pass-1' });
    const unknownEmail = await request(app)
      .post(`${api}/auth/login`)
      .send({ email: 'nobody@example.com', password: 'Wrong-pass-1' });
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
    expect(wrongPassword.headers['set-cookie']).toBeUndefined();
  });

  it('blocks suspended accounts only after the password is proven correct', async () => {
    const user = await createUser({ status: 'suspended' });
    const good = await request(app)
      .post(`${api}/auth/login`)
      .send({ email: user.email, password: TEST_PASSWORD });
    expect(good.status).toBe(403);
    expect(good.body.error.code).toBe('ACCOUNT_SUSPENDED');
    const bad = await request(app)
      .post(`${api}/auth/login`)
      .send({ email: user.email, password: 'Wrong-pass-1' });
    expect(bad.status).toBe(401);
  });
});

describe('session handling', () => {
  it('rejects requests with no cookie, a garbage cookie, or a bearer header', async () => {
    const none = await request(app).get(`${api}/auth/me`);
    expect(none.status).toBe(401);
    expect(none.body.error.code).toBe('UNAUTHORIZED');

    const garbage = await request(app)
      .get(`${api}/auth/me`)
      .set('Cookie', 'soulsync_token=abc.def.ghi');
    expect(garbage.status).toBe(401);
    expect(garbage.body.error.code).toBe('INVALID_TOKEN');

    // Tokens are accepted from the cookie only, never from headers (NFR-06).
    const user = await createUser();
    const token = jsonwebtoken.sign({ role: 'user' }, config.jwt.secret, {
      subject: String(user._id),
      issuer: 'soulsync-api',
      audience: 'soulsync-web',
    });
    const bearer = await request(app).get(`${api}/auth/me`).set('Authorization', `Bearer ${token}`);
    expect(bearer.status).toBe(401);
  });

  it('logout clears the cookie', async () => {
    const { agent } = await loginAgent(app, await createUser());
    const res = await agent.post(`${api}/auth/logout`);
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie'].join(';')).toMatch(/soulsync_token=;/);
    expect((await agent.get(`${api}/auth/me`)).status).toBe(401);
  });

  it('rejects a token whose account no longer exists', async () => {
    const user = await createUser();
    const { agent } = await loginAgent(app, user);
    await User.deleteOne({ _id: user._id });
    const res = await agent.get(`${api}/auth/me`);
    expect(res.status).toBe(401);
  });
});

describe('PATCH /users/me/password', () => {
  it('requires the current password', async () => {
    const { agent } = await loginAgent(app, await createUser());
    const res = await agent
      .patch(`${api}/users/me/password`)
      .send({ currentPassword: 'Wrong-pass-1', newPassword: 'Brand-new-pass-9' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_CURRENT_PASSWORD');
  });

  it('changes the password, keeps this device signed in and revokes older sessions', async () => {
    const user = await createUser();
    const { agent } = await loginAgent(app, user);

    // A session issued earlier, as if from another device.
    const oldToken = jsonwebtoken.sign({ role: 'user' }, config.jwt.secret, {
      subject: String(user._id),
      issuer: 'soulsync-api',
      audience: 'soulsync-web',
      expiresIn: 3600,
      noTimestamp: true,
    });
    const stale = jsonwebtoken.decode(oldToken);
    expect(stale.iat).toBeUndefined();
    const oldSession = jsonwebtoken.sign(
      { role: 'user', iat: Math.floor(Date.now() / 1000) - 600 },
      config.jwt.secret,
      {
        subject: String(user._id),
        issuer: 'soulsync-api',
        audience: 'soulsync-web',
        expiresIn: 3600,
      },
    );
    expect(
      (await request(app).get(`${api}/auth/me`).set('Cookie', `soulsync_token=${oldSession}`))
        .status,
    ).toBe(200);

    const res = await agent
      .patch(`${api}/users/me/password`)
      .send({ currentPassword: TEST_PASSWORD, newPassword: 'Brand-new-pass-9' });
    expect(res.status).toBe(200);

    expect((await agent.get(`${api}/auth/me`)).status).toBe(200);
    const revoked = await request(app)
      .get(`${api}/auth/me`)
      .set('Cookie', `soulsync_token=${oldSession}`);
    expect(revoked.status).toBe(401);
    expect(revoked.body.error.code).toBe('SESSION_REVOKED');

    const oldLogin = await request(app)
      .post(`${api}/auth/login`)
      .send({ email: user.email, password: TEST_PASSWORD });
    expect(oldLogin.status).toBe(401);
    const newLogin = await request(app)
      .post(`${api}/auth/login`)
      .send({ email: user.email, password: 'Brand-new-pass-9' });
    expect(newLogin.status).toBe(200);
  });

  it('rejects reusing the same password', async () => {
    const { agent } = await loginAgent(app, await createUser());
    const res = await agent
      .patch(`${api}/users/me/password`)
      .send({ currentPassword: TEST_PASSWORD, newPassword: TEST_PASSWORD });
    expect(res.body.error.code).toBe('PASSWORD_UNCHANGED');
  });
});

describe('profile', () => {
  it('updates fields and merges nested reminder preferences without wiping siblings', async () => {
    const { agent } = await loginAgent(app, await createUser());
    const res = await agent.patch(`${api}/users/me`).send({
      name: 'New Name',
      timezone: 'Asia/Dhaka',
      goalsOfInterest: ['sleep', 'hydration'],
      reminderPrefs: { daily: { time: '07:45' }, emailEnabled: true },
      onboardingDone: true,
    });
    expect(res.status).toBe(200);
    const { user } = res.body.data;
    expect(user).toMatchObject({ name: 'New Name', timezone: 'Asia/Dhaka', onboardingDone: true });
    expect(user.reminderPrefs.daily).toEqual({ enabled: true, time: '07:45' });
    expect(user.reminderPrefs.goal).toEqual({ enabled: true, time: '09:00' });
    expect(user.reminderPrefs.emailEnabled).toBe(true);
  });

  it('lets users disable one reminder type', async () => {
    const { agent } = await loginAgent(app, await createUser());
    const res = await agent
      .patch(`${api}/users/me`)
      .send({ reminderPrefs: { weekly: { enabled: false } } });
    expect(res.body.data.user.reminderPrefs.weekly.enabled).toBe(false);
    expect(res.body.data.user.reminderPrefs.daily.enabled).toBe(true);
  });

  it('rejects invalid input and empty updates', async () => {
    const { agent } = await loginAgent(app, await createUser());
    expect(
      (await agent.patch(`${api}/users/me`).send({ reminderPrefs: { daily: { time: '25:61' } } }))
        .status,
    ).toBe(400);
    expect((await agent.patch(`${api}/users/me`).send({ timezone: 'Nope/Zone' })).status).toBe(400);
    expect((await agent.patch(`${api}/users/me`).send({})).status).toBe(400);
  });

  it('cannot be used to change role, status or consent (mass assignment)', async () => {
    const { agent, user } = await loginAgent(app, await createUser());
    const res = await agent.patch(`${api}/users/me`).send({
      name: 'Still A User',
      role: 'admin',
      status: 'suspended',
      aiConsent: true,
      email: 'x@y.com',
    });
    expect(res.status).toBe(200);
    const stored = await User.findById(user._id).lean();
    expect(stored).toMatchObject({
      name: 'Still A User',
      role: 'user',
      status: 'active',
      aiConsent: false,
      email: user.email,
    });
  });
});

describe('AI consent (FR-30)', () => {
  it('is off by default, can be granted and withdrawn, and is timestamped', async () => {
    const { agent } = await loginAgent(app, await createUser());
    expect((await agent.get(`${api}/users/me`)).body.data.user.aiConsent).toBe(false);

    const granted = await agent.put(`${api}/users/me/ai-consent`).send({ consent: true });
    expect(granted.body.data.aiConsent).toBe(true);
    expect(new Date(granted.body.data.aiConsentAt).getTime()).toBeGreaterThan(Date.now() - 5000);

    const withdrawn = await agent.put(`${api}/users/me/ai-consent`).send({ consent: false });
    expect(withdrawn.body.data.aiConsent).toBe(false);
    expect((await agent.put(`${api}/users/me/ai-consent`).send({ consent: 'yes' })).status).toBe(
      400,
    );
  });
});

describe('DELETE /users/me', () => {
  it('requires the password, then removes the account and everything it owns', async () => {
    const user = await createUser();
    await createWellnessLog(user._id, '2026-11-10');
    await createJournalEntry(user._id);
    const other = await createUser();
    await createWellnessLog(other._id, '2026-11-10');
    const { agent } = await loginAgent(app, user);

    const wrong = await agent.delete(`${api}/users/me`).send({ password: 'Wrong-pass-1' });
    expect(wrong.status).toBe(400);
    expect(await User.countDocuments({ _id: user._id })).toBe(1);

    const res = await agent.delete(`${api}/users/me`).send({ password: TEST_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie'].join(';')).toMatch(/soulsync_token=;/);

    expect(await User.countDocuments({ _id: user._id })).toBe(0);
    expect(await WellnessLog.countDocuments({ userId: user._id })).toBe(0);
    expect(await JournalEntry.countDocuments({ userId: user._id })).toBe(0);
    expect(await WellnessLog.countDocuments({ userId: other._id })).toBe(1);
  });

  it('refuses to delete the last administrator', async () => {
    const admin = await createAdmin();
    const { agent } = await loginAgent(app, admin);
    const res = await agent.delete(`${api}/users/me`).send({ password: TEST_PASSWORD });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('LAST_ADMIN');
  });
});
