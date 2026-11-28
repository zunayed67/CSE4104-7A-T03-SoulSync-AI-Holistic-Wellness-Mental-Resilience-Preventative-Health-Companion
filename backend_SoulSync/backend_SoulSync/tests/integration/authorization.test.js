import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { Conversation } from '../../src/models/conversation.model.js';
import { Goal } from '../../src/models/goal.model.js';
import { JournalEntry } from '../../src/models/journalEntry.model.js';
import { Notification } from '../../src/models/notification.model.js';
import { Routine } from '../../src/models/routine.model.js';
import { User } from '../../src/models/user.model.js';
import { WellnessLog } from '../../src/models/wellnessLog.model.js';
import { WellnessReport } from '../../src/models/wellnessReport.model.js';
import { dateKeyToUtcDate } from '../../src/utils/date.js';
import { createLoggedInUser, loginAgent } from '../helpers/authAgent.js';
import {
  createAdmin,
  createGoal,
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

describe('authentication is required everywhere except register, login, logout and health', () => {
  it.each([
    ['get', '/users/me'],
    ['patch', '/users/me'],
    ['put', '/users/me/ai-consent'],
    ['get', '/wellness'],
    ['post', '/wellness'],
    ['get', '/wellness/date/2026-11-10'],
    ['get', '/journal'],
    ['post', '/journal'],
    ['get', '/analytics/overview'],
    ['get', '/analytics/trends'],
    ['post', '/ai/chat'],
    ['post', '/ai/recommendations'],
    ['post', '/ai/routine'],
    ['post', '/ai/weekly-summary'],
    ['get', '/ai/conversations'],
    ['get', '/goals'],
    ['post', '/goals'],
    ['get', '/routines'],
    ['get', '/notifications'],
    ['patch', '/notifications/read-all'],
    ['get', '/reports'],
    ['post', '/reports/generate'],
    ['get', '/resources'],
    ['post', '/content-reports'],
    ['get', '/admin/stats'],
    ['get', '/admin/users'],
    ['post', '/admin/resources'],
    ['get', '/admin/content-reports'],
  ])('%s %s returns 401 without a session', async (method, path) => {
    const res = await request(app)[method](`${api}${path}`).send({});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('keeps the public endpoints public', async () => {
    expect((await request(app).get(`${api}/health`)).status).toBe(200);
    expect((await request(app).post(`${api}/auth/logout`)).status).toBe(200);
  });
});

describe("a user cannot reach another user's private data (NFR-10)", () => {
  async function seedOwnerData() {
    const owner = await createUser();
    const log = await createWellnessLog(owner._id, '2026-11-10');
    const entry = await createJournalEntry(owner._id, { content: 'owner-only secret' });
    const goal = await createGoal(owner._id);
    const routine = await Routine.create({
      userId: owner._id,
      title: 'Morning',
      items: [{ time: '07:00', activity: 'Stretch' }],
    });
    const conversation = await Conversation.create({
      userId: owner._id,
      title: 'Chat',
      messages: [{ role: 'user', content: 'owner-only message' }],
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    const notification = await Notification.create({
      userId: owner._id,
      type: 'system',
      title: 'Hello',
      message: 'owner-only notice',
    });
    const report = await WellnessReport.create({
      userId: owner._id,
      weekId: '2026-W45',
      weekStart: dateKeyToUtcDate('2026-11-02'),
      weekEnd: dateKeyToUtcDate('2026-11-08'),
    });
    return { owner, log, entry, goal, routine, conversation, notification, report };
  }

  it('returns 404 (not 403, so ids are not confirmed) for every read, edit and delete', async () => {
    const data = await seedOwnerData();
    const { agent: intruder } = await createLoggedInUser(app);

    const targets = [
      ['wellness', `/wellness/${data.log._id}`, { mood: 1 }],
      ['journal', `/journal/${data.entry._id}`, { content: 'hijacked' }],
      ['goals', `/goals/${data.goal._id}`, { title: 'hijacked' }],
      ['routines', `/routines/${data.routine._id}`, { title: 'hijacked' }],
      ['conversations', `/ai/conversations/${data.conversation._id}`, null],
      ['reports', `/reports/${data.report._id}`, null],
    ];

    for (const [label, path, patch] of targets) {
      expect((await intruder.get(`${api}${path}`)).status, `GET ${label}`).toBe(404);
      if (patch)
        expect((await intruder.patch(`${api}${path}`).send(patch)).status, `PATCH ${label}`).toBe(
          404,
        );
      expect((await intruder.delete(`${api}${path}`)).status, `DELETE ${label}`).toBe(
        label === 'reports' ? 404 : 404,
      );
    }
    expect(
      (await intruder.patch(`${api}/goals/${data.goal._id}/progress`).send({ value: 5 })).status,
    ).toBe(404);
    expect(
      (await intruder.patch(`${api}/notifications/${data.notification._id}/read`)).status,
    ).toBe(404);
    expect((await intruder.get(`${api}/wellness/date/2026-11-10`)).status).toBe(404);

    // Nothing was changed or removed.
    expect((await WellnessLog.findById(data.log._id).lean()).mood).toBe(4);
    expect((await JournalEntry.findById(data.entry._id).lean()).content).toBe('owner-only secret');
    expect((await Goal.findById(data.goal._id).lean()).title).toBe('Drink water');
    expect(await Routine.countDocuments({ _id: data.routine._id })).toBe(1);
    expect(await Conversation.countDocuments({ _id: data.conversation._id })).toBe(1);
    expect((await Notification.findById(data.notification._id).lean()).isRead).toBe(false);
  });

  it('shows list endpoints only the requester’s own records', async () => {
    await seedOwnerData();
    const { agent: other } = await createLoggedInUser(app);
    for (const path of [
      '/wellness',
      '/journal',
      '/goals',
      '/routines',
      '/notifications',
      '/reports',
      '/ai/conversations',
    ]) {
      const res = await other.get(`${api}${path}`);
      expect(res.status, path).toBe(200);
      expect(res.body.data, path).toEqual([]);
      expect(res.body.meta.total, path).toBe(0);
    }
    const overview = await other.get(`${api}/analytics/overview`);
    expect(overview.body.data.hasTodayLog).toBe(false);
    expect((await other.get(`${api}/analytics/trends`)).body.data.completeness.recorded).toBe(0);
  });

  it('never leaks the private text in another user’s responses', async () => {
    await seedOwnerData();
    const { agent: other } = await createLoggedInUser(app);
    for (const path of [
      '/journal',
      '/ai/conversations',
      '/notifications',
      '/wellness',
      '/users/me',
    ]) {
      const res = await other.get(`${api}${path}`);
      expect(JSON.stringify(res.body)).not.toMatch(/owner-only/);
    }
  });

  it('cannot create records on behalf of someone else by sending a userId', async () => {
    const victim = await createUser();
    const { agent, user } = await createLoggedInUser(app);
    const res = await agent
      .post(`${api}/journal`)
      .send({ content: 'mine', userId: String(victim._id) });
    expect(res.status).toBe(201);
    expect(await JournalEntry.countDocuments({ userId: victim._id })).toBe(0);
    expect(await JournalEntry.countDocuments({ userId: user._id })).toBe(1);
  });
});

describe('role-based access (FR-07, FR-47 to FR-50)', () => {
  it('blocks non-admins from every admin route with 403', async () => {
    const { agent } = await createLoggedInUser(app);
    for (const [method, path] of [
      ['get', '/admin/stats'],
      ['get', '/admin/users'],
      ['patch', `/admin/users/${'a'.repeat(24)}/status`],
      ['delete', `/admin/users/${'a'.repeat(24)}`],
      ['get', '/admin/resources'],
      ['post', '/admin/resources'],
      ['patch', `/admin/resources/${'a'.repeat(24)}`],
      ['delete', `/admin/resources/${'a'.repeat(24)}`],
      ['get', '/admin/content-reports'],
      ['patch', `/admin/content-reports/${'a'.repeat(24)}`],
    ]) {
      const res = await agent[method](`${api}${path}`).send({});
      expect(res.status, `${method} ${path}`).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    }
  });

  it('lets admins list users with non-sensitive fields only', async () => {
    const admin = await createAdmin();
    const member = await createUser({ name: 'Member One' });
    const { agent } = await loginAgent(app, admin);
    const res = await agent.get(`${api}/admin/users?search=member`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(Object.keys(res.body.data[0]).sort()).toEqual([
      'createdAt',
      'email',
      'id',
      'name',
      'role',
      'status',
    ]);
    expect(res.body.data[0].email).toBe(member.email);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });

  it('gives admins no way to read other users’ wellness data, journals, goals or chats (FR-50)', async () => {
    const admin = await createAdmin();
    const member = await createUser();
    const log = await createWellnessLog(member._id, '2026-11-10');
    const entry = await createJournalEntry(member._id, { content: 'member private journal' });
    const goal = await createGoal(member._id);
    const { agent } = await loginAgent(app, admin);

    expect((await agent.get(`${api}/wellness/${log._id}`)).status).toBe(404);
    expect((await agent.get(`${api}/journal/${entry._id}`)).status).toBe(404);
    expect((await agent.get(`${api}/goals/${goal._id}`)).status).toBe(404);
    for (const path of ['/wellness', '/journal', '/goals', '/ai/conversations']) {
      expect((await agent.get(`${api}${path}`)).body.data, path).toEqual([]);
    }
    // There is no admin endpoint exposing private data at all.
    for (const path of [
      `/admin/users/${member._id}/wellness`,
      `/admin/users/${member._id}/journal`,
      `/admin/users/${member._id}`,
    ]) {
      expect((await agent.get(`${api}${path}`)).status, path).toBe(404);
    }
  });

  it('applies role changes immediately (role is read from the database, not the token)', async () => {
    const admin = await createAdmin();
    const { agent } = await loginAgent(app, admin);
    expect((await agent.get(`${api}/admin/stats`)).status).toBe(200);
    await User.updateOne({ _id: admin._id }, { $set: { role: 'user' } });
    expect((await agent.get(`${api}/admin/stats`)).status).toBe(403);
  });
});

describe('suspension and account management', () => {
  it('suspending a user blocks their existing session at once; reactivating restores it', async () => {
    const admin = await createAdmin();
    const member = await createUser();
    const { agent: adminAgent } = await loginAgent(app, admin);
    const { agent: memberAgent } = await loginAgent(app, member);
    expect((await memberAgent.get(`${api}/users/me`)).status).toBe(200);

    const suspend = await adminAgent
      .patch(`${api}/admin/users/${member._id}/status`)
      .send({ status: 'suspended' });
    expect(suspend.status).toBe(200);
    expect(suspend.body.data.status).toBe('suspended');
    const blocked = await memberAgent.get(`${api}/users/me`);
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('ACCOUNT_SUSPENDED');

    await adminAgent.patch(`${api}/admin/users/${member._id}/status`).send({ status: 'active' });
    expect((await memberAgent.get(`${api}/users/me`)).status).toBe(200);
  });

  it('deletes a user together with their data, and leaves others untouched', async () => {
    const admin = await createAdmin();
    const member = await createUser();
    const bystander = await createUser();
    await createWellnessLog(member._id, '2026-11-10');
    await createJournalEntry(member._id);
    await createWellnessLog(bystander._id, '2026-11-10');
    const { agent } = await loginAgent(app, admin);

    expect((await agent.delete(`${api}/admin/users/${member._id}`)).status).toBe(204);
    expect(await User.countDocuments({ _id: member._id })).toBe(0);
    expect(await WellnessLog.countDocuments({ userId: member._id })).toBe(0);
    expect(await JournalEntry.countDocuments({ userId: member._id })).toBe(0);
    expect(await WellnessLog.countDocuments({ userId: bystander._id })).toBe(1);
  });

  it('refuses to act on yourself or on other administrators, and 404s unknown users', async () => {
    const admin = await createAdmin();
    const otherAdmin = await createAdmin();
    const { agent } = await loginAgent(app, admin);

    const self = await agent
      .patch(`${api}/admin/users/${admin._id}/status`)
      .send({ status: 'suspended' });
    expect(self.body.error.code).toBe('CANNOT_TARGET_SELF');
    const peer = await agent.delete(`${api}/admin/users/${otherAdmin._id}`);
    expect(peer.status).toBe(403);
    expect(peer.body.error.code).toBe('CANNOT_MODIFY_ADMIN');
    expect((await agent.delete(`${api}/admin/users/${'a'.repeat(24)}`)).status).toBe(404);
    expect(
      (await agent.patch(`${api}/admin/users/${admin._id}/status`).send({ status: 'banned' }))
        .status,
    ).toBe(400);
    expect(await User.countDocuments({ role: 'admin' })).toBe(2);
  });

  it('reports basic platform counts', async () => {
    const admin = await createAdmin();
    await createUser();
    await createUser({ status: 'suspended' });
    const { agent } = await loginAgent(app, admin);
    const res = await agent.get(`${api}/admin/stats`);
    expect(res.body.data.users).toEqual({ total: 3, active: 2, suspended: 1, admins: 1 });
  });
});
