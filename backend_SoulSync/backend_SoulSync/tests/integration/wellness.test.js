import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { addDays, todayKey } from '../../src/utils/date.js';
import { createLoggedInUser } from '../helpers/authAgent.js';
import { createWellnessLog } from '../helpers/factories.js';
import { clearTestDb, startTestDb, stopTestDb } from '../setup/testDb.js';

const app = createApp();
const api = '/api/v1';
const TZ = 'Asia/Dhaka';

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearTestDb);

const full = {
  mood: 4,
  stressLevel: 6,
  sleepHours: 7.5,
  waterIntakeMl: 1800,
  activityMinutes: 30,
  energyLevel: 3,
};

describe('POST /wellness', () => {
  it("defaults the date to today in the user's timezone and returns all metrics", async () => {
    const { agent } = await createLoggedInUser(app, { timezone: TZ });
    const res = await agent.post(`${api}/wellness`).send(full);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ date: todayKey(TZ), ...full });
    expect(res.body.data.id).toBeTruthy();
    expect(res.body.data.userId).toBeUndefined();
  });

  it('accepts a past date and partial metrics (missing values stay null, not zero)', async () => {
    const { agent } = await createLoggedInUser(app);
    const date = addDays(todayKey('UTC'), -3);
    const res = await agent.post(`${api}/wellness`).send({ date, mood: 2, sleepHours: 5 });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      date,
      mood: 2,
      sleepHours: 5,
      stressLevel: null,
      waterIntakeMl: null,
    });
  });

  it('allows only one record per day and points to the existing one (FR-10)', async () => {
    const { agent } = await createLoggedInUser(app);
    const first = await agent.post(`${api}/wellness`).send(full);
    const second = await agent.post(`${api}/wellness`).send(full);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('WELLNESS_LOG_EXISTS');
    expect(second.body.error.details.existingLogId).toBe(first.body.data.id);
  });

  it('enforces the one-per-day rule even under concurrent requests', async () => {
    const { agent } = await createLoggedInUser(app);
    const results = await Promise.all(
      Array.from({ length: 5 }, () => agent.post(`${api}/wellness`).send(full)),
    );
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409, 409, 409, 409]);
  });

  it('lets different users record the same day', async () => {
    const a = await createLoggedInUser(app);
    const b = await createLoggedInUser(app);
    expect((await a.agent.post(`${api}/wellness`).send(full)).status).toBe(201);
    expect((await b.agent.post(`${api}/wellness`).send(full)).status).toBe(201);
  });

  it.each([
    ['mood above range', { mood: 6 }],
    ['mood below range', { mood: 0 }],
    ['fractional mood', { mood: 3.5 }],
    ['stress above 10', { stressLevel: 11 }],
    ['sleep above 24', { sleepHours: 25 }],
    ['negative water', { waterIntakeMl: -5 }],
    ['energy above range', { energyLevel: 6 }],
    ['activity above a day', { activityMinutes: 1441 }],
    ['text instead of number', { mood: 'high' }],
    ['no metrics at all', {}],
    ['impossible date', { mood: 3, date: '2026-02-30' }],
    ['malformed date', { mood: 3, date: '10/11/2026' }],
  ])('rejects %s', async (_label, body) => {
    const { agent } = await createLoggedInUser(app);
    const res = await agent.post(`${api}/wellness`).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('accepts the boundary values (stress 10, sleep 24, mood 1)', async () => {
    const { agent } = await createLoggedInUser(app);
    const res = await agent
      .post(`${api}/wellness`)
      .send({ mood: 1, stressLevel: 10, sleepHours: 24, waterIntakeMl: 0 });
    expect(res.status).toBe(201);
  });

  it('rejects a future date in the user timezone', async () => {
    const { agent } = await createLoggedInUser(app, { timezone: TZ });
    const res = await agent
      .post(`${api}/wellness`)
      .send({ mood: 3, date: addDays(todayKey(TZ), 1) });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FUTURE_DATE');
  });
});

describe('reading records', () => {
  it('lists newest first with pagination metadata and a default 30-day window', async () => {
    const { agent, user } = await createLoggedInUser(app);
    const today = todayKey('UTC');
    for (const offset of [0, 1, 2, 40]) await createWellnessLog(user._id, addDays(today, -offset));

    const res = await agent.get(`${api}/wellness?limit=2`);
    expect(res.status).toBe(200);
    expect(res.body.data.map((l) => l.date)).toEqual([today, addDays(today, -1)]);
    expect(res.body.meta).toMatchObject({
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2,
      hasNext: true,
    });

    const page2 = await agent.get(`${api}/wellness?limit=2&page=2`);
    expect(page2.body.data.map((l) => l.date)).toEqual([addDays(today, -2)]);
  });

  it('filters by date range (FR-11)', async () => {
    const { agent, user } = await createLoggedInUser(app);
    const today = todayKey('UTC');
    for (const offset of [0, 5, 10, 15]) await createWellnessLog(user._id, addDays(today, -offset));
    const res = await agent.get(
      `${api}/wellness?from=${addDays(today, -10)}&to=${addDays(today, -5)}`,
    );
    expect(res.body.data.map((l) => l.date)).toEqual([addDays(today, -5), addDays(today, -10)]);
  });

  it('rejects bad query values', async () => {
    const { agent } = await createLoggedInUser(app);
    expect((await agent.get(`${api}/wellness?from=2026-11-10&to=2026-11-01`)).status).toBe(400);
    expect((await agent.get(`${api}/wellness?limit=1000`)).status).toBe(400);
    expect((await agent.get(`${api}/wellness?page=0`)).status).toBe(400);
  });

  it('gets a record by id and by date, with 404 for unknown ones and 400 for malformed ids', async () => {
    const { agent, user } = await createLoggedInUser(app);
    const log = await createWellnessLog(user._id, '2026-11-10');
    expect((await agent.get(`${api}/wellness/${log._id}`)).body.data.date).toBe('2026-11-10');
    expect((await agent.get(`${api}/wellness/date/2026-11-10`)).body.data.id).toBe(String(log._id));
    expect((await agent.get(`${api}/wellness/date/2026-11-09`)).status).toBe(404);
    expect((await agent.get(`${api}/wellness/${'a'.repeat(24)}`)).status).toBe(404);
    expect((await agent.get(`${api}/wellness/not-an-id`)).status).toBe(400);
  });
});

describe('PATCH and DELETE', () => {
  it('edits metrics, and null clears one (FR-12)', async () => {
    const { agent } = await createLoggedInUser(app);
    const { body } = await agent.post(`${api}/wellness`).send(full);
    const res = await agent
      .patch(`${api}/wellness/${body.data.id}`)
      .send({ mood: 2, waterIntakeMl: null });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      mood: 2,
      waterIntakeMl: null,
      stressLevel: 6,
      date: body.data.date,
    });
  });

  it('refuses to clear the last remaining metric and invalid values', async () => {
    const { agent } = await createLoggedInUser(app);
    const { body } = await agent.post(`${api}/wellness`).send({ mood: 3 });
    const cleared = await agent.patch(`${api}/wellness/${body.data.id}`).send({ mood: null });
    expect(cleared.status).toBe(400);
    expect(cleared.body.error.code).toBe('AT_LEAST_ONE_METRIC');
    expect((await agent.patch(`${api}/wellness/${body.data.id}`).send({ mood: 9 })).status).toBe(
      400,
    );
    expect((await agent.patch(`${api}/wellness/${body.data.id}`).send({})).status).toBe(400);
  });

  it('does not allow changing the date through PATCH', async () => {
    const { agent } = await createLoggedInUser(app);
    const { body } = await agent.post(`${api}/wellness`).send(full);
    const res = await agent.patch(`${api}/wellness/${body.data.id}`).send({ date: '2020-01-01' });
    expect(res.status).toBe(400);
  });

  it('deletes a record (FR-13)', async () => {
    const { agent } = await createLoggedInUser(app);
    const { body } = await agent.post(`${api}/wellness`).send(full);
    expect((await agent.delete(`${api}/wellness/${body.data.id}`)).status).toBe(204);
    expect((await agent.get(`${api}/wellness/${body.data.id}`)).status).toBe(404);
    expect((await agent.delete(`${api}/wellness/${body.data.id}`)).status).toBe(404);
  });
});

describe('analytics endpoints (FR-20 to FR-25)', () => {
  it('trends: marks missing days, calculates statistics from stored data and reports the streak', async () => {
    const { agent, user } = await createLoggedInUser(app);
    const today = todayKey('UTC');
    await createWellnessLog(user._id, today, { mood: 5, sleepHours: 8 });
    await createWellnessLog(user._id, addDays(today, -1), { mood: 3, sleepHours: 6 });
    await createWellnessLog(user._id, addDays(today, -4), { mood: 1, sleepHours: 4 });

    const res = await agent.get(`${api}/analytics/trends?range=week`);
    expect(res.status).toBe(200);
    const { days, metrics, completeness, streak, range } = res.body.data;
    expect(range.days).toBe(7);
    expect(days).toHaveLength(7);
    expect(days.filter((d) => !d.recorded)).toHaveLength(4);
    expect(days.find((d) => d.date === addDays(today, -2))).toMatchObject({
      recorded: false,
      mood: null,
    });
    expect(metrics.mood).toMatchObject({ count: 3, min: 1, max: 5, latest: 5, average: 3 });
    expect(metrics.sleepHours.average).toBe(6);
    expect(completeness).toMatchObject({ expected: 7, recorded: 3, completionRate: 43 });
    expect(streak).toBe(2);
  });

  it('trends: supports month and custom ranges and validates them', async () => {
    const { agent } = await createLoggedInUser(app);
    const today = todayKey('UTC');
    expect((await agent.get(`${api}/analytics/trends?range=month`)).body.data.range.days).toBe(30);
    const custom = await agent.get(
      `${api}/analytics/trends?range=custom&from=${addDays(today, -9)}&to=${today}`,
    );
    expect(custom.body.data.range.days).toBe(10);
    expect((await agent.get(`${api}/analytics/trends?range=custom`)).status).toBe(400);
    expect(
      (await agent.get(`${api}/analytics/trends?from=${addDays(today, -200)}`)).body.error.code,
    ).toBe('RANGE_TOO_LARGE');
    expect((await agent.get(`${api}/analytics/trends?range=year`)).status).toBe(400);
  });

  it('trends: handles a user with no data', async () => {
    const { agent } = await createLoggedInUser(app);
    const res = await agent.get(`${api}/analytics/trends`);
    expect(res.status).toBe(200);
    expect(res.body.data.metrics.mood).toMatchObject({ count: 0, average: null });
    expect(res.body.data.streak).toBe(0);
  });

  it("overview: shows today's state, latest metrics, goals and unread notifications", async () => {
    const { agent, user } = await createLoggedInUser(app);
    const empty = await agent.get(`${api}/analytics/overview`);
    expect(empty.body.data).toMatchObject({
      hasTodayLog: false,
      todayLog: null,
      latestLog: null,
      streak: 0,
    });

    await createWellnessLog(user._id, todayKey('UTC'), { mood: 5 });
    const res = await agent.get(`${api}/analytics/overview`);
    expect(res.body.data.hasTodayLog).toBe(true);
    expect(res.body.data.todayLog.mood).toBe(5);
    expect(res.body.data.streak).toBe(1);
    expect(res.body.data.goals).toMatchObject({ active: 0, items: [] });
    expect(res.body.data.notifications.unread).toBe(0);
  });
});
