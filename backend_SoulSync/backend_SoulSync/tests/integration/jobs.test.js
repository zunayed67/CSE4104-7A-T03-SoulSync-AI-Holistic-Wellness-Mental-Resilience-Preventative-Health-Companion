import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// The weekly job only asks the AI for a summary when a provider key is configured.
vi.hoisted(() => {
  process.env.AI_PROVIDER = 'openai';
  process.env.OPENAI_API_KEY = 'test-key-not-real';
});

vi.mock('../../src/services/ai/providers/provider.factory.js', () => ({
  getProvider: vi.fn(),
  resetProviderCache: vi.fn(),
}));

import { Goal } from '../../src/models/goal.model.js';
import { Notification } from '../../src/models/notification.model.js';
import { WellnessReport } from '../../src/models/wellnessReport.model.js';
import { listJobs, registerAllJobs } from '../../src/jobs/scheduler.js';
import { runReminders } from '../../src/jobs/reminder.job.js';
import { runRecovery } from '../../src/jobs/recovery.job.js';
import { runWeeklyReports } from '../../src/jobs/weeklyReport.job.js';
import { getProvider } from '../../src/services/ai/providers/provider.factory.js';
import { AppError } from '../../src/utils/AppError.js';
import { dateKeyToUtcDate } from '../../src/utils/date.js';
import { createGoal, createUser, createWellnessLog } from '../helpers/factories.js';
import { clearTestDb, startTestDb, stopTestDb } from '../setup/testDb.js';

const provider = { name: 'mock', generate: vi.fn() };

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => {
  await clearTestDb();
  provider.generate.mockReset();
  provider.generate.mockResolvedValue({ text: 'A calm, steady week. Keep logging.' });
  getProvider.mockReset();
  getProvider.mockReturnValue(provider);
});

const notificationsOf = (userId) => Notification.find({ userId }).lean();

describe('daily reminders (FR-41, UC-21)', () => {
  // 20:01 in Dhaka (UTC+6) is 14:01 UTC.
  const now = new Date('2026-11-11T14:01:00Z');

  it("creates a reminder at the user's local reminder time, using their timezone", async () => {
    const dhaka = await createUser({ timezone: 'Asia/Dhaka' });
    const utc = await createUser({ timezone: 'UTC' });

    const result = await runReminders({ now });
    expect(result.created).toBe(1);
    const [notification] = await notificationsOf(dhaka._id);
    expect(notification).toMatchObject({
      type: 'reminder',
      dedupeKey: 'daily:2026-11-11',
      isRead: false,
    });
    expect(await notificationsOf(utc._id)).toHaveLength(0);
  });

  it('never creates duplicates, even when runs repeat or overlap (NFR-20)', async () => {
    const user = await createUser({ timezone: 'Asia/Dhaka' });
    await runReminders({ now });
    await runReminders({ now });
    await Promise.all([runReminders({ now }), runReminders({ now }), runReminders({ now })]);
    expect(await notificationsOf(user._id)).toHaveLength(1);
  });

  it('only fires inside the tick window', async () => {
    const user = await createUser({ timezone: 'Asia/Dhaka' });
    await runReminders({ now: new Date('2026-11-11T13:59:00Z') }); // 19:59
    await runReminders({ now: new Date('2026-11-11T14:05:00Z') }); // 20:05, next tick
    expect(await notificationsOf(user._id)).toHaveLength(0);
    await runReminders({ now: new Date('2026-11-11T14:04:59Z') }); // still inside [20:00, 20:05)
    expect(await notificationsOf(user._id)).toHaveLength(1);
  });

  it('skips users who disabled the reminder or already logged today', async () => {
    const disabled = await createUser({
      timezone: 'Asia/Dhaka',
      reminderPrefs: { daily: { enabled: false, time: '20:00' }, goal: { enabled: false } },
    });
    const logged = await createUser({ timezone: 'Asia/Dhaka' });
    await createWellnessLog(logged._id, '2026-11-11');
    const pending = await createUser({ timezone: 'Asia/Dhaka' });

    await runReminders({ now });
    expect(await notificationsOf(disabled._id)).toHaveLength(0);
    expect(await notificationsOf(logged._id)).toHaveLength(0);
    expect(await notificationsOf(pending._id)).toHaveLength(1);
  });

  it('respects a custom reminder time and ignores suspended users', async () => {
    const custom = await createUser({
      timezone: 'UTC',
      reminderPrefs: {
        daily: { enabled: true, time: '08:30' },
        goal: { enabled: true, time: '09:00' },
      },
    });
    const suspended = await createUser({
      timezone: 'UTC',
      status: 'suspended',
      reminderPrefs: { daily: { enabled: true, time: '08:30' } },
    });
    await runReminders({ now: new Date('2026-11-11T08:31:00Z') });
    expect(await notificationsOf(custom._id)).toHaveLength(1);
    expect(await notificationsOf(suspended._id)).toHaveLength(0);
  });

  it('puts a new notification per day for the same user', async () => {
    const user = await createUser({ timezone: 'Asia/Dhaka' });
    await runReminders({ now });
    await runReminders({ now: new Date('2026-11-12T14:01:00Z') });
    const keys = (await notificationsOf(user._id)).map((n) => n.dedupeKey).sort();
    expect(keys).toEqual(['daily:2026-11-11', 'daily:2026-11-12']);
  });
});

describe('goal reminders and deadlines', () => {
  const now = new Date('2026-11-11T09:02:00Z');

  it('reminds about goals due today or tomorrow once, and not about finished or distant ones', async () => {
    const user = await createUser({ timezone: 'UTC' });
    const tomorrow = await createGoal(user._id, {
      title: 'Due tomorrow',
      deadline: dateKeyToUtcDate('2026-11-12'),
    });
    const today = await createGoal(user._id, {
      title: 'Due today',
      deadline: dateKeyToUtcDate('2026-11-11'),
    });
    await createGoal(user._id, { title: 'Far away', deadline: dateKeyToUtcDate('2026-11-20') });
    await createGoal(user._id, {
      title: 'Already done',
      status: 'done',
      deadline: dateKeyToUtcDate('2026-11-12'),
    });

    await runReminders({ now });
    await runReminders({ now });
    const goalNotices = (await notificationsOf(user._id)).filter((n) => n.type === 'goal');
    expect(goalNotices).toHaveLength(2);
    expect(goalNotices.find((n) => String(n.goalId) === String(tomorrow._id)).message).toMatch(
      /tomorrow/,
    );
    expect(goalNotices.find((n) => String(n.goalId) === String(today._id)).message).toMatch(
      /today/,
    );
  });

  it('marks goals whose deadline has passed as missed', async () => {
    const user = await createUser();
    const overdue = await createGoal(user._id, { deadline: dateKeyToUtcDate('2026-11-01') });
    const open = await createGoal(user._id, { deadline: dateKeyToUtcDate('2026-11-30') });
    const result = await runReminders({ now });
    expect(result.missed).toBe(1);
    expect((await Goal.findById(overdue._id).lean()).status).toBe('missed');
    expect((await Goal.findById(open._id).lean()).status).toBe('active');
  });
});

describe('weekly reports (FR-42, UC-22)', () => {
  const now = new Date('2026-11-11T10:00:00Z'); // week 46; the report is for week 45 (2-8 Nov)
  const logWeek45 = (userId) =>
    Promise.all(
      ['2026-11-02', '2026-11-03', '2026-11-05'].map((d) =>
        createWellnessLog(userId, d, { mood: 4, sleepHours: 6 }),
      ),
    );

  it('creates the previous week’s calculated report and a notification', async () => {
    const user = await createUser({ createdAt: new Date('2026-10-01') });
    await logWeek45(user._id);

    const result = await runWeeklyReports({ now });
    expect(result).toEqual({ generated: 1, notified: 1 });

    const report = await WellnessReport.findOne({ userId: user._id }).lean();
    expect(report).toMatchObject({
      weekId: '2026-W45',
      recordedDays: 3,
      missingDays: 4,
      aiSummary: null,
    });
    expect(report.missingDates).toEqual(['2026-11-04', '2026-11-06', '2026-11-07', '2026-11-08']);
    expect(report.metrics.sleepHours.average).toBe(6);

    const [notice] = await notificationsOf(user._id);
    expect(notice).toMatchObject({ type: 'report', dedupeKey: 'weekly:2026-W45' });
    expect(notice.message).toMatch(/3 of 7/);
    expect(provider.generate).not.toHaveBeenCalled(); // no consent, so no AI
  });

  it('is idempotent across repeats, overlapping runs and the recovery pass (NFR-20)', async () => {
    const user = await createUser({ createdAt: new Date('2026-10-01') });
    await logWeek45(user._id);
    await runWeeklyReports({ now });
    expect(await runWeeklyReports({ now })).toEqual({ generated: 0, notified: 0 });
    await Promise.all([runWeeklyReports({ now }), runWeeklyReports({ now }), runRecovery({ now })]);
    expect(await WellnessReport.countDocuments({ userId: user._id })).toBe(1);
    expect(await notificationsOf(user._id)).toHaveLength(1);
  });

  it('adds an AI summary only with consent, sending minimised data', async () => {
    const consenting = await createUser({ createdAt: new Date('2026-10-01'), aiConsent: true });
    const private_ = await createUser({ createdAt: new Date('2026-10-01'), aiConsent: false });
    await logWeek45(consenting._id);
    await logWeek45(private_._id);

    await runWeeklyReports({ now });
    expect((await WellnessReport.findOne({ userId: consenting._id }).lean()).aiSummary).toBe(
      'A calm, steady week. Keep logging.',
    );
    expect((await WellnessReport.findOne({ userId: private_._id }).lean()).aiSummary).toBeNull();
    expect(provider.generate).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(provider.generate.mock.calls[0][0])).not.toMatch(/userId|_id|@example/);
  });

  it('falls back to metrics only when the provider fails (alternative flow)', async () => {
    const user = await createUser({ createdAt: new Date('2026-10-01'), aiConsent: true });
    await logWeek45(user._id);
    provider.generate.mockRejectedValue(AppError.serviceUnavailable('down', 'AI_UNAVAILABLE'));

    const result = await runWeeklyReports({ now });
    expect(result.generated).toBe(1);
    const report = await WellnessReport.findOne({ userId: user._id }).lean();
    expect(report).toMatchObject({ recordedDays: 3, aiSummary: null });
    expect(await notificationsOf(user._id)).toHaveLength(1);
  });

  it('skips accounts created after the week ended and respects the weekly-notification preference', async () => {
    const newcomer = await createUser({ createdAt: new Date('2026-11-10') });
    const quiet = await createUser({
      createdAt: new Date('2026-10-01'),
      reminderPrefs: {
        weekly: { enabled: false },
        daily: { enabled: true, time: '20:00' },
        goal: { enabled: true, time: '09:00' },
      },
    });
    await runWeeklyReports({ now });
    expect(await WellnessReport.countDocuments({ userId: newcomer._id })).toBe(0);
    expect(await WellnessReport.countDocuments({ userId: quiet._id })).toBe(1);
    expect(await notificationsOf(quiet._id)).toHaveLength(0);
  });

  it('uses each user’s own timezone to decide which week just ended', async () => {
    // Sun 8 Nov 19:00 UTC is already Monday 9 Nov 01:00 in Dhaka.
    const moment = new Date('2026-11-08T19:00:00Z');
    const utcUser = await createUser({ timezone: 'UTC', createdAt: new Date('2026-09-01') });
    const dhakaUser = await createUser({
      timezone: 'Asia/Dhaka',
      createdAt: new Date('2026-09-01'),
    });
    await runWeeklyReports({ now: moment });
    expect((await WellnessReport.findOne({ userId: utcUser._id }).lean()).weekId).toBe('2026-W44');
    expect((await WellnessReport.findOne({ userId: dhakaUser._id }).lean()).weekId).toBe(
      '2026-W45',
    );
  });
});

describe('startup recovery (NFR-20)', () => {
  it('creates reports that were missed while the server was asleep and closes overdue goals', async () => {
    const user = await createUser({ createdAt: new Date('2026-10-01') });
    await createWellnessLog(user._id, '2026-11-03');
    const overdue = await createGoal(user._id, { deadline: dateKeyToUtcDate('2026-11-01') });

    const result = await runRecovery({ now: new Date('2026-11-11T10:00:00Z') });
    expect(result).toMatchObject({ missed: 1, generated: 1 });
    expect(await WellnessReport.countDocuments({ userId: user._id, weekId: '2026-W45' })).toBe(1);
    expect((await Goal.findById(overdue._id).lean()).status).toBe('missed');
  });
});

describe('scheduler registration', () => {
  it('registers the three application jobs once, with the recovery pass flagged to run on start', () => {
    registerAllJobs();
    registerAllJobs();
    const jobs = listJobs();
    expect(jobs.map((j) => j.name).sort()).toEqual(['recovery', 'reminders', 'weekly-report']);
    expect(jobs.find((j) => j.name === 'reminders').schedule).toBe('*/5 * * * *');
  });
});
