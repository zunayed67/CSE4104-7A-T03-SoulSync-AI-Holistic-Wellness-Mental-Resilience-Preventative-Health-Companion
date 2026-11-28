import { describe, expect, it } from 'vitest';
import { buildTrends, resolveRange } from '../../../src/services/analytics.service.js';
import { buildWeekReportData } from '../../../src/services/report.service.js';
import { computeGoalProgress } from '../../../src/services/goal.service.js';

const day = (key, metrics = {}) => ({
  date: new Date(`${key}T00:00:00Z`),
  mood: 4,
  stressLevel: 5,
  sleepHours: 7,
  waterIntakeMl: 1500,
  activityMinutes: 30,
  energyLevel: 3,
  ...metrics,
});

describe('buildTrends', () => {
  const logs = [
    day('2026-11-09', { mood: 2 }),
    day('2026-11-10', { mood: 3 }),
    day('2026-11-12', { mood: 5 }),
  ];
  const trends = buildTrends({ logs, startKey: '2026-11-09', endKey: '2026-11-13' });

  it('marks days without a record as missing instead of zero (FR-25)', () => {
    const missing = trends.days.find((d) => d.date === '2026-11-11');
    expect(missing).toMatchObject({ recorded: false, mood: null, sleepHours: null });
    expect(trends.days).toHaveLength(5);
  });

  it('calculates statistics only from recorded days', () => {
    expect(trends.metrics.mood).toMatchObject({ count: 3, min: 2, max: 5, latest: 5 });
    expect(trends.metrics.mood.average).toBe(3.33);
    expect(trends.metrics.mood.trend.direction).toBe('increasing');
  });

  it('reports completeness and the missing dates', () => {
    expect(trends.completeness).toMatchObject({
      expected: 5,
      recorded: 3,
      missing: ['2026-11-11', '2026-11-13'],
      completionRate: 60,
    });
  });

  it('handles a range with no data', () => {
    const empty = buildTrends({ logs: [], startKey: '2026-11-09', endKey: '2026-11-11' });
    expect(empty.metrics.mood).toMatchObject({ count: 0, average: null, latest: null });
    expect(empty.metrics.mood.trend.direction).toBe('insufficient_data');
    expect(empty.completeness.recorded).toBe(0);
  });
});

describe('resolveRange', () => {
  const today = '2026-11-15';

  it('uses rolling windows ending today', () => {
    expect(resolveRange({}, today)).toEqual({ startKey: '2026-11-09', endKey: today });
    expect(resolveRange({ range: 'week' }, today)).toEqual({
      startKey: '2026-11-09',
      endKey: today,
    });
    expect(resolveRange({ range: 'month' }, today)).toEqual({
      startKey: '2026-10-17',
      endKey: today,
    });
  });

  it('accepts custom ranges, clamping "to" at today', () => {
    expect(resolveRange({ range: 'custom', from: '2026-11-01', to: '2026-11-10' }, today)).toEqual({
      startKey: '2026-11-01',
      endKey: '2026-11-10',
    });
    expect(resolveRange({ from: '2026-11-01', to: '2026-12-31' }, today).endKey).toBe(today);
  });

  it('rejects reversed, oversized and incomplete ranges', () => {
    expect(() => resolveRange({ from: '2026-11-10', to: '2026-11-01' }, today)).toThrowError(
      expect.objectContaining({ code: 'INVALID_RANGE' }),
    );
    expect(() => resolveRange({ from: '2026-01-01', to: '2026-11-01' }, today)).toThrowError(
      expect.objectContaining({ code: 'RANGE_TOO_LARGE' }),
    );
    expect(() => resolveRange({ range: 'custom' }, today)).toThrowError(
      expect.objectContaining({ code: 'INVALID_RANGE' }),
    );
  });
});

describe('buildWeekReportData', () => {
  it('builds metrics and missing days for a completed week', () => {
    const logs = ['2026-11-09', '2026-11-10', '2026-11-12'].map((k) => day(k));
    const data = buildWeekReportData({ logs, anyDayInWeek: '2026-11-11', today: '2026-11-20' });
    expect(data).toMatchObject({ weekId: '2026-W46', recordedDays: 3, missingDays: 4 });
    expect(data.missingDates).toEqual(['2026-11-11', '2026-11-13', '2026-11-14', '2026-11-15']);
    expect(data.metrics.sleepHours.average).toBe(7);
  });

  it('does not count future days of the current week as missing', () => {
    const logs = [day('2026-11-09'), day('2026-11-10')];
    const data = buildWeekReportData({ logs, anyDayInWeek: '2026-11-10', today: '2026-11-11' });
    expect(data.recordedDays).toBe(2);
    expect(data.missingDays).toBe(0);
  });

  it('rejects a future week', () => {
    expect(() =>
      buildWeekReportData({ logs: [], anyDayInWeek: '2026-12-01', today: '2026-11-15' }),
    ).toThrowError(expect.objectContaining({ code: 'FUTURE_WEEK' }));
  });
});

describe('computeGoalProgress', () => {
  const entry = (key, value) => ({ date: new Date(`${key}T00:00:00Z`), value });
  const base = { type: 'daily', targetValue: 10, createdAt: new Date('2026-11-01T08:00:00Z') };

  it('computes today progress, streak and completion rate for a daily goal', () => {
    const goal = {
      ...base,
      history: [
        entry('2026-11-10', 10),
        entry('2026-11-11', 12),
        entry('2026-11-12', 4),
        entry('2026-11-13', 10),
        entry('2026-11-14', 10),
        entry('2026-11-15', 5),
      ],
    };
    const progress = computeGoalProgress(goal, '2026-11-15', 'UTC');
    expect(progress.currentValue).toBe(5);
    expect(progress.progressPercent).toBe(50);
    expect(progress.streak).toBe(2); // today unfinished, so the streak counts back from yesterday
    expect(progress.completedPeriods).toBe(4);
    expect(progress.elapsedPeriods).toBe(14); // Nov 1-14; today is still in progress
    expect(progress.completionRate).toBe(29);
  });

  it('includes today in the streak once it is completed', () => {
    const goal = { ...base, history: [entry('2026-11-14', 10), entry('2026-11-15', 10)] };
    expect(computeGoalProgress(goal, '2026-11-15', 'UTC').streak).toBe(2);
  });

  it('sums a weekly goal across the ISO week', () => {
    const goal = {
      type: 'weekly',
      targetValue: 150,
      createdAt: new Date('2026-11-02T08:00:00Z'),
      history: [entry('2026-11-09', 60), entry('2026-11-11', 50), entry('2026-11-14', 45)],
    };
    const progress = computeGoalProgress(goal, '2026-11-15', 'UTC');
    expect(progress.currentValue).toBe(155);
    expect(progress.progressPercent).toBe(100);
    expect(progress.streak).toBe(1);
  });

  it('reports no completion rate before any period has elapsed', () => {
    const goal = { ...base, createdAt: new Date('2026-11-15T01:00:00Z'), history: [] };
    expect(computeGoalProgress(goal, '2026-11-15', 'UTC')).toMatchObject({
      completionRate: null,
      streak: 0,
      currentValue: 0,
    });
  });
});
