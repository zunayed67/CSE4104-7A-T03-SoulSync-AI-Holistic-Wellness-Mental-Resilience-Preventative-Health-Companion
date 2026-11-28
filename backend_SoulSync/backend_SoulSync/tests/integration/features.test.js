import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { ContentReport } from '../../src/models/contentReport.model.js';
import { Notification } from '../../src/models/notification.model.js';
import { Resource } from '../../src/models/resource.model.js';
import { Routine } from '../../src/models/routine.model.js';
import { notifyOnce } from '../../src/services/notification.service.js';
import { addDays, getWeekRange, todayKey } from '../../src/utils/date.js';
import { createLoggedInUser, loginAgent } from '../helpers/authAgent.js';
import {
  createAdmin,
  createResource,
  createUser,
  createWellnessLog,
} from '../helpers/factories.js';
import { clearTestDb, startTestDb, stopTestDb } from '../setup/testDb.js';

const app = createApp();
const api = '/api/v1';
const today = () => todayKey('UTC');

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearTestDb);

describe('goals and habits (FR-26 to FR-29)', () => {
  const dailyWater = { title: 'Drink water', type: 'daily', targetValue: 2000, unit: 'ml' };

  it('creates a goal with zeroed progress and validates input', async () => {
    const { agent } = await createLoggedInUser(app);
    const res = await agent
      .post(`${api}/goals`)
      .send({ ...dailyWater, deadline: addDays(today(), 7) });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      ...dailyWater,
      status: 'active',
      currentValue: 0,
      progressPercent: 0,
      streak: 0,
      deadline: addDays(today(), 7),
    });
    expect(res.body.data.history).toBeUndefined();

    for (const bad of [
      { ...dailyWater, targetValue: 0 },
      { ...dailyWater, type: 'monthly' },
      { ...dailyWater, title: 'x' },
      { ...dailyWater, deadline: '2026-13-01' },
    ]) {
      expect((await agent.post(`${api}/goals`).send(bad)).status).toBe(400);
    }
    const past = await agent
      .post(`${api}/goals`)
      .send({ ...dailyWater, deadline: addDays(today(), -1) });
    expect(past.body.error.code).toBe('DEADLINE_IN_PAST');
  });

  it('records progress by increment or absolute value and reports percent', async () => {
    const { agent } = await createLoggedInUser(app);
    const { body } = await agent.post(`${api}/goals`).send(dailyWater);
    const url = `${api}/goals/${body.data.id}/progress`;

    await agent.patch(url).send({ increment: 500 });
    const second = await agent.patch(url).send({ increment: 500 });
    expect(second.body.data).toMatchObject({ currentValue: 1000, progressPercent: 50 });

    const set = await agent.patch(url).send({ value: 2000 });
    expect(set.body.data).toMatchObject({ currentValue: 2000, progressPercent: 100, streak: 1 });

    const negative = await agent.patch(url).send({ increment: -5000 });
    expect(negative.body.data.currentValue).toBe(0);
  });

  it('tracks a streak and completion rate from past days, and validates the progress body', async () => {
    const { agent } = await createLoggedInUser(app);
    const { body } = await agent.post(`${api}/goals`).send(dailyWater);
    const url = `${api}/goals/${body.data.id}/progress`;
    await agent.patch(url).send({ value: 2500, date: addDays(today(), -2) });
    await agent.patch(url).send({ value: 2000, date: addDays(today(), -1) });
    const res = await agent.patch(url).send({ value: 2100 });
    expect(res.body.data.streak).toBe(3);
    expect(res.body.data.completionRate).toBe(100);

    expect((await agent.patch(url).send({})).status).toBe(400);
    expect((await agent.patch(url).send({ value: 1, increment: 1 })).status).toBe(400);
    expect((await agent.patch(url).send({ value: -1 })).status).toBe(400);
    const future = await agent.patch(url).send({ value: 1, date: addDays(today(), 1) });
    expect(future.body.error.code).toBe('FUTURE_DATE');
  });

  it('tracks weekly goals per ISO week', async () => {
    const { agent } = await createLoggedInUser(app);
    const { body } = await agent
      .post(`${api}/goals`)
      .send({ title: 'Exercise', type: 'weekly', targetValue: 150, unit: 'min' });
    const url = `${api}/goals/${body.data.id}/progress`;

    const first = await agent.patch(url).send({ value: 60 });
    expect(first.body.data).toMatchObject({ currentValue: 60, progressPercent: 40, streak: 0 });
    const second = await agent.patch(url).send({ increment: 90 });
    expect(second.body.data).toMatchObject({ currentValue: 150, progressPercent: 100, streak: 1 });
  });

  it('edits, completes, filters, lists and deletes goals', async () => {
    const { agent } = await createLoggedInUser(app);
    const a = (await agent.post(`${api}/goals`).send(dailyWater)).body.data;
    const b = (await agent.post(`${api}/goals`).send({ ...dailyWater, title: 'Walk' })).body.data;

    const renamed = await agent
      .patch(`${api}/goals/${a.id}`)
      .send({ title: 'Water goal', deadline: null });
    expect(renamed.body.data).toMatchObject({ title: 'Water goal', deadline: null });
    const done = await agent.patch(`${api}/goals/${b.id}`).send({ status: 'done' });
    expect(done.body.data.status).toBe('done');
    expect((await agent.patch(`${api}/goals/${b.id}`).send({ status: 'missed' })).status).toBe(400);
    expect((await agent.patch(`${api}/goals/${b.id}`).send({})).status).toBe(400);

    expect((await agent.get(`${api}/goals?status=active`)).body.data.map((g) => g.id)).toEqual([
      a.id,
    ]);
    expect((await agent.get(`${api}/goals`)).body.meta.total).toBe(2);
    expect((await agent.delete(`${api}/goals/${a.id}`)).status).toBe(204);
    expect((await agent.get(`${api}/goals/${a.id}`)).status).toBe(404);
  });

  it('shows active goals with progress on the dashboard', async () => {
    const { agent } = await createLoggedInUser(app);
    const goal = (await agent.post(`${api}/goals`).send(dailyWater)).body.data;
    await agent.patch(`${api}/goals/${goal.id}/progress`).send({ value: 1000 });
    const overview = await agent.get(`${api}/analytics/overview`);
    expect(overview.body.data.goals).toMatchObject({ active: 1 });
    expect(overview.body.data.goals.items[0]).toMatchObject({
      title: 'Drink water',
      progressPercent: 50,
    });
  });
});

describe('private journal (FR-15, FR-16)', () => {
  it('creates, reads, filters, edits and deletes entries', async () => {
    const { agent } = await createLoggedInUser(app);
    const first = await agent
      .post(`${api}/journal`)
      .send({ content: 'A calm day', title: 'Monday', mood: 4, tags: ['Calm', ' study '] });
    expect(first.status).toBe(201);
    expect(first.body.data).toMatchObject({
      title: 'Monday',
      type: 'entry',
      mood: 4,
      tags: ['calm', 'study'],
    });
    await agent
      .post(`${api}/journal`)
      .send({ content: 'Feeling tense', type: 'checkin', tags: ['stress'] });

    expect((await agent.get(`${api}/journal`)).body.meta.total).toBe(2);
    expect((await agent.get(`${api}/journal?type=checkin`)).body.data).toHaveLength(1);
    expect((await agent.get(`${api}/journal?tag=CALM`)).body.data).toHaveLength(1);
    expect(
      (await agent.get(`${api}/journal?from=${today()}&to=${today()}`)).body.data,
    ).toHaveLength(2);
    expect((await agent.get(`${api}/journal?from=${addDays(today(), 1)}`)).body.data).toHaveLength(
      0,
    );

    const id = first.body.data.id;
    const edited = await agent
      .patch(`${api}/journal/${id}`)
      .send({ content: 'Edited', mood: null });
    expect(edited.body.data).toMatchObject({ content: 'Edited', mood: null });
    expect((await agent.delete(`${api}/journal/${id}`)).status).toBe(204);
    expect((await agent.get(`${api}/journal/${id}`)).status).toBe(404);
  });

  it('validates entries', async () => {
    const { agent } = await createLoggedInUser(app);
    for (const bad of [
      { content: '' },
      { content: '   ' },
      {},
      { content: 'x', mood: 6 },
      { content: 'x', type: 'poem' },
      { content: 'x', tags: Array.from({ length: 11 }, (_, i) => `t${i}`) },
      { content: 'x'.repeat(10001) },
    ]) {
      expect(
        (await agent.post(`${api}/journal`).send(bad)).status,
        JSON.stringify(bad).slice(0, 40),
      ).toBe(400);
    }
  });
});

describe('saved routines (FR-33)', () => {
  const items = [
    { time: '07:00', activity: 'Stretch and drink water' },
    { time: '13:00', activity: 'Short walk' },
  ];

  it('keeps one active routine at a time', async () => {
    const { agent, user } = await createLoggedInUser(app);
    const first = (
      await agent.post(`${api}/routines`).send({ title: 'Weekday', items, isActive: true })
    ).body.data;
    const second = (
      await agent.post(`${api}/routines`).send({ title: 'Weekend', items, isActive: true })
    ).body.data;
    expect((await Routine.findById(first.id).lean()).isActive).toBe(false);
    expect((await Routine.findById(second.id).lean()).isActive).toBe(true);

    await agent.patch(`${api}/routines/${first.id}`).send({ isActive: true });
    expect(await Routine.countDocuments({ userId: user._id, isActive: true })).toBe(1);
    expect((await Routine.findById(first.id).lean()).isActive).toBe(true);
  });

  it('edits, lists and deletes routines and validates them', async () => {
    const { agent } = await createLoggedInUser(app);
    const routine = (await agent.post(`${api}/routines`).send({ title: 'Plan', items })).body.data;
    expect(routine.isActive).toBe(false);

    const edited = await agent
      .patch(`${api}/routines/${routine.id}`)
      .send({ title: 'Better plan', items: [{ time: '08:15', activity: 'Breakfast' }] });
    expect(edited.body.data).toMatchObject({
      title: 'Better plan',
      items: [{ time: '08:15', activity: 'Breakfast' }],
    });
    expect((await agent.get(`${api}/routines`)).body.meta.total).toBe(1);

    for (const bad of [
      { title: 'x', items },
      { title: 'Plan', items: [] },
      { title: 'Plan', items: [{ time: '25:00', activity: 'Stretch' }] },
      { title: 'Plan', items: [{ time: '07:00', activity: '' }] },
    ]) {
      expect((await agent.post(`${api}/routines`).send(bad)).status).toBe(400);
    }
    expect((await agent.delete(`${api}/routines/${routine.id}`)).status).toBe(204);
    expect((await agent.get(`${api}/routines/${routine.id}`)).status).toBe(404);
  });
});

describe('notifications (FR-43)', () => {
  it('lists newest first with the unread counter, and marks one or all as read', async () => {
    const { agent, user } = await createLoggedInUser(app);
    for (const n of [1, 2, 3]) {
      await Notification.create({
        userId: user._id,
        type: 'reminder',
        title: `Title ${n}`,
        message: 'Hi',
        createdAt: new Date(Date.now() + n * 1000),
      });
    }
    const list = await agent.get(`${api}/notifications`);
    expect(list.body.data.map((n) => n.title)).toEqual(['Title 3', 'Title 2', 'Title 1']);
    expect(list.body.meta).toMatchObject({ total: 3, unread: 3 });
    expect((await agent.get(`${api}/notifications/unread-count`)).body.data.unread).toBe(3);

    const read = await agent.patch(`${api}/notifications/${list.body.data[0].id}/read`);
    expect(read.body.data.isRead).toBe(true);
    expect((await agent.get(`${api}/notifications?unreadOnly=true`)).body.data).toHaveLength(2);

    const all = await agent.patch(`${api}/notifications/read-all`);
    expect(all.body.data.updated).toBe(2);
    expect((await agent.get(`${api}/notifications/unread-count`)).body.data.unread).toBe(0);
    expect((await agent.patch(`${api}/notifications/${'a'.repeat(24)}/read`)).status).toBe(404);
  });

  it('creates a keyed notification exactly once', async () => {
    const user = await createUser();
    const spec = {
      dedupeKey: 'daily:2026-11-11',
      type: 'reminder',
      title: 'Log',
      message: 'Please log',
    };
    const results = await Promise.all([
      notifyOnce(user._id, spec),
      notifyOnce(user._id, spec),
      notifyOnce(user._id, spec),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await Notification.countDocuments({ userId: user._id })).toBe(1);
    expect(await notifyOnce(user._id, { ...spec, dedupeKey: 'daily:2026-11-12' })).toBe(true);
  });
});

describe('weekly reports (FR-45)', () => {
  const previousWeekDay = () => addDays(getWeekRange(today()).startKey, -5);

  it('generates a calculated report, refreshes it idempotently and lists it', async () => {
    const { agent, user } = await createLoggedInUser(app);
    const lastMonday = addDays(getWeekRange(today()).startKey, -7);
    await createWellnessLog(user._id, lastMonday, { mood: 5 });
    await createWellnessLog(user._id, addDays(lastMonday, 1), { mood: 3 });

    const first = await agent
      .post(`${api}/reports/generate`)
      .send({ weekStart: previousWeekDay() });
    expect(first.status).toBe(200);
    expect(first.body.data).toMatchObject({
      weekStart: lastMonday,
      recordedDays: 2,
      missingDays: 5,
      aiSummary: null,
    });
    expect(first.body.data.metrics.mood).toMatchObject({ average: 4, count: 2 });

    const again = await agent.post(`${api}/reports/generate`).send({ weekStart: lastMonday });
    expect(again.body.data.id).toBe(first.body.data.id);

    const list = await agent.get(`${api}/reports`);
    expect(list.body.meta.total).toBe(1);
    expect((await agent.get(`${api}/reports/${first.body.data.id}`)).body.data.weekId).toBe(
      first.body.data.weekId,
    );
  });

  it('defaults to the current week and refuses future weeks', async () => {
    const { agent } = await createLoggedInUser(app);
    const current = await agent.post(`${api}/reports/generate`).send({});
    expect(current.status).toBe(200);
    expect(current.body.data.weekStart).toBe(getWeekRange(today()).startKey);
    const future = await agent
      .post(`${api}/reports/generate`)
      .send({ weekStart: addDays(today(), 21) });
    expect(future.body.error.code).toBe('FUTURE_WEEK');
  });
});

describe('resource library (FR-18)', () => {
  it('shows only published resources, without bodies in lists or admin fields', async () => {
    const admin = await createAdmin();
    await createResource(admin._id, { title: 'Sleep basics', category: 'sleep' });
    await createResource(admin._id, { title: 'Hidden draft', isPublished: false });
    await createResource(admin._id, {
      title: 'Box breathing',
      type: 'breathing',
      category: 'stress relief',
      breathingPattern: { inhale: 4, hold: 4, exhale: 4, holdAfter: 4, cycles: 5 },
    });
    const { agent } = await createLoggedInUser(app);

    const list = await agent.get(`${api}/resources`);
    expect(list.body.meta.total).toBe(2);
    expect(list.body.data.map((r) => r.title).sort()).toEqual(['Box breathing', 'Sleep basics']);
    expect(list.body.data[0].content).toBeUndefined();
    expect(list.body.data[0].createdBy).toBeUndefined();
    expect(list.body.data[0].isPublished).toBeUndefined();

    expect((await agent.get(`${api}/resources?type=breathing`)).body.data).toHaveLength(1);
    expect((await agent.get(`${api}/resources?category=sleep`)).body.data).toHaveLength(1);
    expect((await agent.get(`${api}/resources?search=BREATH`)).body.data[0].title).toBe(
      'Box breathing',
    );
    expect(
      (await agent.get(`${api}/resources?search=${encodeURIComponent('.*')}`)).body.data,
    ).toEqual([]);
    expect((await agent.get(`${api}/resources/categories`)).body.data).toEqual([
      'sleep',
      'stress relief',
    ]);
  });

  it('returns full content for a published item and 404 for unpublished or unknown ones', async () => {
    const admin = await createAdmin();
    const published = await createResource(admin._id, { content: 'Full article body' });
    const draft = await createResource(admin._id, { isPublished: false });
    const { agent } = await createLoggedInUser(app);
    expect((await agent.get(`${api}/resources/${published._id}`)).body.data.content).toBe(
      'Full article body',
    );
    expect((await agent.get(`${api}/resources/${draft._id}`)).status).toBe(404);
    expect((await agent.get(`${api}/resources/${'a'.repeat(24)}`)).status).toBe(404);
  });
});

describe('reporting and moderating content (FR-19, FR-49)', () => {
  async function setup() {
    const admin = await createAdmin();
    const resource = await createResource(admin._id, { title: 'Questionable article' });
    const { agent: adminAgent } = await loginAgent(app, admin);
    const reporter = await createLoggedInUser(app);
    return { admin, resource, adminAgent, reporter: reporter.agent, reporterUser: reporter.user };
  }

  it('lets a user report once per resource', async () => {
    const { resource, reporter } = await setup();
    const res = await reporter
      .post(`${api}/content-reports`)
      .send({ resourceId: String(resource._id), reason: 'Inaccurate advice' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ status: 'open', reason: 'Inaccurate advice' });

    const dup = await reporter
      .post(`${api}/content-reports`)
      .send({ resourceId: String(resource._id), reason: 'Again' });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('ALREADY_REPORTED');
  });

  it('validates reports and only accepts published resources', async () => {
    const { admin, resource, reporter } = await setup();
    const draft = await createResource(admin._id, { isPublished: false });
    expect(
      (
        await reporter
          .post(`${api}/content-reports`)
          .send({ resourceId: String(resource._id), reason: '' })
      ).status,
    ).toBe(400);
    expect(
      (await reporter.post(`${api}/content-reports`).send({ resourceId: 'nope', reason: 'Bad' }))
        .status,
    ).toBe(400);
    expect(
      (
        await reporter
          .post(`${api}/content-reports`)
          .send({ resourceId: String(draft._id), reason: 'Bad one' })
      ).status,
    ).toBe(404);
    expect(
      (
        await reporter
          .post(`${api}/content-reports`)
          .send({ resourceId: 'a'.repeat(24), reason: 'Bad one' })
      ).status,
    ).toBe(404);
  });

  it('lets admins dismiss a report', async () => {
    const { resource, adminAgent, reporter } = await setup();
    await reporter
      .post(`${api}/content-reports`)
      .send({ resourceId: String(resource._id), reason: 'Seems off' });

    const queue = await adminAgent.get(`${api}/admin/content-reports?status=open`);
    expect(queue.body.data).toHaveLength(1);
    expect(queue.body.data[0].resource).toMatchObject({
      title: 'Questionable article',
      isPublished: true,
    });

    const reviewed = await adminAgent
      .patch(`${api}/admin/content-reports/${queue.body.data[0].id}`)
      .send({ action: 'dismiss' });
    expect(reviewed.body.data.status).toBe('dismissed');
    expect((await Resource.findById(resource._id).lean()).isPublished).toBe(true);

    const again = await adminAgent
      .patch(`${api}/admin/content-reports/${queue.body.data[0].id}`)
      .send({ action: 'dismiss' });
    expect(again.body.error.code).toBe('REPORT_ALREADY_REVIEWED');
    expect(
      (await adminAgent.get(`${api}/admin/content-reports?status=open`)).body.data,
    ).toHaveLength(0);
  });

  it('unpublishes the resource and closes every open report about it', async () => {
    const { resource, adminAgent, reporter } = await setup();
    const other = await createLoggedInUser(app);
    await reporter
      .post(`${api}/content-reports`)
      .send({ resourceId: String(resource._id), reason: 'First report' });
    await other.agent
      .post(`${api}/content-reports`)
      .send({ resourceId: String(resource._id), reason: 'Second report' });
    const queue = await adminAgent.get(`${api}/admin/content-reports`);

    await adminAgent
      .patch(`${api}/admin/content-reports/${queue.body.data[0].id}`)
      .send({ action: 'unpublish' });
    expect((await Resource.findById(resource._id).lean()).isPublished).toBe(false);
    expect(await ContentReport.countDocuments({ status: 'open' })).toBe(0);
    expect(await ContentReport.countDocuments({ status: 'reviewed' })).toBe(2);
    expect((await reporter.get(`${api}/resources/${resource._id}`)).status).toBe(404);
    expect(
      (
        await adminAgent
          .patch(`${api}/admin/content-reports/${queue.body.data[0].id}`)
          .send({ action: 'explode' })
      ).status,
    ).toBe(400);
  });
});

describe('admin content management (FR-48)', () => {
  const article = {
    title: 'Mindful pauses',
    type: 'article',
    category: 'Stress',
    content: 'Take a pause.',
  };

  it('creates unpublished content, publishes and unpublishes it, edits and deletes it', async () => {
    const admin = await createAdmin();
    const { agent: adminAgent } = await loginAgent(app, admin);
    const { agent: userAgent } = await createLoggedInUser(app);

    const created = await adminAgent.post(`${api}/admin/resources`).send(article);
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      isPublished: false,
      category: 'stress',
      createdBy: String(admin._id),
    });
    const id = created.body.data.id;
    expect((await userAgent.get(`${api}/resources`)).body.data).toHaveLength(0);

    expect(
      (await adminAgent.patch(`${api}/admin/resources/${id}/publish`).send({ isPublished: true }))
        .body.data.isPublished,
    ).toBe(true);
    expect((await userAgent.get(`${api}/resources`)).body.data).toHaveLength(1);

    const edited = await adminAgent
      .patch(`${api}/admin/resources/${id}`)
      .send({ title: 'Mindful pauses (updated)' });
    expect(edited.body.data.title).toBe('Mindful pauses (updated)');
    expect((await adminAgent.get(`${api}/admin/resources/${id}`)).body.data.content).toBe(
      'Take a pause.',
    );
    expect((await adminAgent.get(`${api}/admin/resources?search=mindful`)).body.data).toHaveLength(
      1,
    );

    await adminAgent.patch(`${api}/admin/resources/${id}/publish`).send({ isPublished: false });
    expect((await userAgent.get(`${api}/resources`)).body.data).toHaveLength(0);
    expect((await adminAgent.delete(`${api}/admin/resources/${id}`)).status).toBe(204);
    expect((await adminAgent.get(`${api}/admin/resources/${id}`)).status).toBe(404);
  });

  it('requires a breathing pattern for breathing exercises and fills sensible defaults', async () => {
    const { agent } = await loginAgent(app, await createAdmin());
    const missing = await agent
      .post(`${api}/admin/resources`)
      .send({ ...article, type: 'breathing' });
    expect(missing.status).toBe(400);
    expect(missing.body.error.details.map((d) => d.path)).toContain('breathingPattern');

    const ok = await agent
      .post(`${api}/admin/resources`)
      .send({ ...article, type: 'breathing', breathingPattern: { inhale: 4, exhale: 6 } });
    expect(ok.body.data.breathingPattern).toEqual({
      inhale: 4,
      hold: 0,
      exhale: 6,
      holdAfter: 0,
      cycles: 5,
    });
    expect(
      (
        await agent
          .post(`${api}/admin/resources`)
          .send({ ...article, breathingPattern: { inhale: 99, exhale: 6 } })
      ).status,
    ).toBe(400);
  });

  it('validates resource input', async () => {
    const { agent } = await loginAgent(app, await createAdmin());
    for (const bad of [
      { ...article, title: 'x' },
      { ...article, type: 'video' },
      { ...article, content: '' },
      {},
    ]) {
      expect((await agent.post(`${api}/admin/resources`).send(bad)).status).toBe(400);
    }
    expect(
      (await agent.patch(`${api}/admin/resources/${'a'.repeat(24)}`).send({ title: 'Valid title' }))
        .status,
    ).toBe(404);
  });
});
