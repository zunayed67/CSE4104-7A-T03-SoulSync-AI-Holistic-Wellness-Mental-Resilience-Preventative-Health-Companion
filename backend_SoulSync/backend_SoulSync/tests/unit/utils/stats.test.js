import { describe, expect, it } from 'vitest';
import {
  average,
  currentStreak,
  describeTrend,
  linearTrend,
  maximum,
  minimum,
  percentage,
  summarizeCompleteness,
  summarizeSeries,
} from '../../../src/utils/stats.js';

const series = (values, start = '2026-11-01') =>
  values.map((value, i) => ({
    date: `2026-11-${String(Number(start.slice(-2)) + i).padStart(2, '0')}`,
    value,
  }));

describe('basic aggregates', () => {
  it('averages valid numbers and ignores gaps instead of counting them as zero', () => {
    expect(average([4, 5, null, undefined, NaN, 3])).toBe(4);
    expect(average([1, 2, 2], 1)).toBe(1.7);
  });

  it('returns null when there is no data', () => {
    expect(average([])).toBeNull();
    expect(average(undefined)).toBeNull();
    expect(minimum([null])).toBeNull();
    expect(maximum([])).toBeNull();
  });

  it('computes min, max and percentages safely', () => {
    expect(minimum([3, 1, 2])).toBe(1);
    expect(maximum([3, 1, 2])).toBe(3);
    expect(percentage(5, 7)).toBe(71);
    expect(percentage(1, 0)).toBeNull();
  });
});

describe('completeness', () => {
  it('reports missing days for the period', () => {
    const expected = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12'];
    expect(summarizeCompleteness(['2026-11-09', '2026-11-11'], expected)).toEqual({
      expected: 4,
      recorded: 2,
      missing: ['2026-11-10', '2026-11-12'],
      completionRate: 50,
    });
  });
});

describe('trends', () => {
  it('fits a line through points', () => {
    const fit = linearTrend([
      { x: 0, y: 1 },
      { x: 1, y: 3 },
      { x: 2, y: 5 },
    ]);
    expect(fit.slope).toBeCloseTo(2);
    expect(fit.intercept).toBeCloseTo(1);
    expect(
      linearTrend([
        { x: 1, y: 1 },
        { x: 1, y: 2 },
      ]),
    ).toBeNull();
  });

  it('classifies increasing, decreasing and stable series', () => {
    expect(describeTrend(series([1, 2, 3, 4, 5])).direction).toBe('increasing');
    expect(describeTrend(series([5, 4, 3, 2, 1])).direction).toBe('decreasing');
    expect(describeTrend(series([3, 3, 3, 3])).direction).toBe('stable');
  });

  it('refuses to describe a trend from too little data', () => {
    expect(describeTrend(series([1, 5]))).toEqual({
      direction: 'insufficient_data',
      slopePerDay: null,
    });
  });

  it('uses real day gaps, not array positions', () => {
    const gapped = [
      { date: '2026-11-01', value: 2 },
      { date: '2026-11-03', value: 3 },
      { date: '2026-11-09', value: 5 },
    ];
    // x = 0, 2, 8 days -> slope 38/104. Treating the points as consecutive (x = 0, 1, 2) would give 1.5.
    expect(describeTrend(gapped).slopePerDay).toBeCloseTo(0.365, 2);
  });

  it('summarises a series', () => {
    const summary = summarizeSeries(series([2, 4, 3]));
    expect(summary).toMatchObject({ count: 3, average: 3, min: 2, max: 4, latest: 3 });
  });
});

describe('streaks', () => {
  const keys = ['2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11'];

  it('counts consecutive days ending today', () => {
    expect(currentStreak(keys, '2026-11-11')).toBe(4);
  });

  it('keeps the streak alive when today is not logged yet', () => {
    expect(currentStreak(keys, '2026-11-12')).toBe(4);
  });

  it('breaks after a missed day', () => {
    expect(currentStreak(keys, '2026-11-13')).toBe(0);
    expect(currentStreak(['2026-11-09', '2026-11-11'], '2026-11-11')).toBe(1);
  });
});
