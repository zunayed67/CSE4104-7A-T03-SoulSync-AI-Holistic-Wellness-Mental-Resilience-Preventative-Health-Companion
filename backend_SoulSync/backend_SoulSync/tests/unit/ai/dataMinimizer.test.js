import { describe, expect, it } from 'vitest';
import {
  assertMinimized,
  cleanText,
  minimizeGoals,
  minimizeLogs,
  minimizeReport,
  minimizeRoutineInput,
} from '../../../src/services/ai/dataMinimizer.js';

const log = {
  _id: 'abc',
  userId: 'user-1',
  date: new Date('2026-11-10T00:00:00Z'),
  mood: 4,
  stressLevel: 6,
  sleepHours: 6.5,
  waterIntakeMl: 1500,
  activityMinutes: 20,
  energyLevel: 3,
  createdAt: new Date(),
  notes: 'private note that must never leave the server',
};

describe('minimizeLogs', () => {
  it('keeps the date and six numeric metrics only', () => {
    const [row] = minimizeLogs([log]);
    expect(row).toEqual({
      date: '2026-11-10',
      mood: 4,
      stress: 6,
      sleepHours: 6.5,
      waterMl: 1500,
      activityMinutes: 20,
      energy: 3,
    });
    expect(JSON.stringify(row)).not.toMatch(/user-1|abc|private/);
  });

  it('turns missing values into null instead of zero', () => {
    const [row] = minimizeLogs([{ ...log, mood: undefined, sleepHours: null }]);
    expect(row.mood).toBeNull();
    expect(row.sleepHours).toBeNull();
  });
});

describe('minimizeGoals', () => {
  it('sends title, cadence, target, unit and progress only', () => {
    const [goal] = minimizeGoals([
      {
        _id: 'g1',
        userId: 'u1',
        title: 'Walk\n  daily',
        type: 'daily',
        targetValue: 30,
        unit: 'min',
        progressPercent: 50,
        history: [1, 2],
      },
    ]);
    expect(goal).toEqual({
      title: 'Walk daily',
      cadence: 'daily',
      target: 30,
      unit: 'min',
      progressPercent: 50,
    });
  });
});

describe('minimizeReport', () => {
  it('keeps calculated statistics and drops everything else', () => {
    const minimized = minimizeReport({
      _id: 'r1',
      userId: 'u1',
      weekStart: new Date('2026-11-09T00:00:00Z'),
      weekEnd: new Date('2026-11-15T00:00:00Z'),
      recordedDays: 5,
      missingDays: 2,
      metrics: {
        mood: {
          average: 3.8,
          min: 2,
          max: 5,
          count: 5,
          latest: 4,
          trend: { direction: 'increasing', slopePerDay: 0.2 },
        },
      },
      aiSummary: 'old summary',
    });
    expect(minimized).toEqual({
      weekStart: '2026-11-09',
      weekEnd: '2026-11-15',
      recordedDays: 5,
      missingDays: 2,
      metrics: { mood: { average: 3.8, min: 2, max: 5, daysRecorded: 5, trend: 'increasing' } },
    });
  });
});

describe('minimizeRoutineInput', () => {
  it('cleans preferences and reduces goals to title and cadence', () => {
    const input = minimizeRoutineInput(
      {
        preferences: '  morning   person\u0000 ',
        availableMinutes: 45,
        wakeTime: '06:30',
        sleepTime: '22:30',
      },
      [{ title: 'Read', type: 'daily', targetValue: 20, unit: 'pages' }],
    );
    expect(input).toEqual({
      preferences: 'morning person',
      availableMinutes: 45,
      wakeTime: '06:30',
      sleepTime: '22:30',
      goals: [{ title: 'Read', cadence: 'daily' }],
    });
  });
});

describe('assertMinimized', () => {
  it('accepts a clean payload', () => {
    const payload = { recentDays: minimizeLogs([log]), goals: [] };
    expect(assertMinimized(payload)).toBe(payload);
  });

  it.each(['content', 'journalText', 'email', 'name', 'userId', '_id', 'notes', 'tags'])(
    'throws when "%s" appears anywhere in the payload',
    (key) => {
      expect(() => assertMinimized({ recentDays: [{ date: '2026-11-10', [key]: 'x' }] })).toThrow(
        /Forbidden field/,
      );
    },
  );
});

describe('cleanText', () => {
  it('removes control characters, collapses whitespace and truncates', () => {
    expect(cleanText('a\u0007b\n\n c', 80)).toBe('a b c');
    expect(cleanText('x'.repeat(100), 10)).toHaveLength(10);
    expect(cleanText(null)).toBe('');
  });
});
