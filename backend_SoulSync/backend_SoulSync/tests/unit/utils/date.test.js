import { describe, expect, it } from 'vitest';
import {
  addDays,
  eachDateKey,
  getDayBounds,
  getIsoWeekId,
  getLocalTime,
  getMonthRange,
  getWeekRange,
  isLocalTimeDue,
  isValidDateKey,
  isValidTimeOfDay,
  isValidTimezone,
  toDateKey,
  todayKey,
} from '../../../src/utils/date.js';

describe('validation helpers', () => {
  it('validates IANA timezones', () => {
    expect(isValidTimezone('Asia/Dhaka')).toBe(true);
    expect(isValidTimezone('Mars/Phobos')).toBe(false);
    expect(isValidTimezone('')).toBe(false);
    expect(isValidTimezone(undefined)).toBe(false);
  });

  it('accepts only real calendar dates', () => {
    expect(isValidDateKey('2026-02-28')).toBe(true);
    expect(isValidDateKey('2026-02-30')).toBe(false);
    expect(isValidDateKey('26-1-1')).toBe(false);
    expect(isValidDateKey(20260101)).toBe(false);
  });

  it('accepts only 24h HH:mm times', () => {
    expect(isValidTimeOfDay('07:30')).toBe(true);
    expect(isValidTimeOfDay('24:00')).toBe(false);
    expect(isValidTimeOfDay('7:30')).toBe(false);
  });
});

describe('date keys', () => {
  it('resolves the calendar day in the user timezone, not the server zone', () => {
    const instant = new Date('2026-11-10T20:30:00Z');
    expect(toDateKey(instant, 'UTC')).toBe('2026-11-10');
    expect(toDateKey(instant, 'Asia/Dhaka')).toBe('2026-11-11');
    expect(todayKey('Asia/Dhaka', instant)).toBe('2026-11-11');
  });

  it('throws on unusable input', () => {
    expect(() => toDateKey(12345)).toThrow(RangeError);
    expect(() => addDays('nope', 1)).toThrow(RangeError);
  });

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('lists inclusive ranges, returns [] for reversed ones and caps huge ones', () => {
    expect(eachDateKey('2026-11-01', '2026-11-03')).toEqual([
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
    ]);
    expect(eachDateKey('2026-11-03', '2026-11-01')).toEqual([]);
    expect(() => eachDateKey('2024-01-01', '2026-01-01')).toThrow(RangeError);
  });
});

describe('periods', () => {
  it('returns the Monday–Sunday week', () => {
    expect(getWeekRange('2026-11-11')).toEqual({ startKey: '2026-11-09', endKey: '2026-11-15' });
  });

  it('returns the calendar month', () => {
    expect(getMonthRange('2026-02-10')).toEqual({ startKey: '2026-02-01', endKey: '2026-02-28' });
  });

  it('builds a stable ISO week id and handles year-boundary weeks', () => {
    expect(getIsoWeekId('2026-11-11')).toBe('2026-W46');
    expect(getIsoWeekId('2025-12-29')).toBe('2026-W01');
  });

  it('returns UTC bounds for a local day', () => {
    const { start, end } = getDayBounds('2026-11-11', 'Asia/Dhaka');
    expect(start.toISOString()).toBe('2026-11-10T18:00:00.000Z');
    expect(end.toISOString()).toBe('2026-11-11T18:00:00.000Z');
  });
});

describe('local time', () => {
  it('reports wall-clock time in a timezone', () => {
    expect(getLocalTime('Asia/Dhaka', new Date('2026-11-11T14:05:00Z'))).toEqual({
      dateKey: '2026-11-11',
      timeOfDay: '20:05',
      minutesSinceMidnight: 1205,
    });
  });

  it('marks a reminder due only inside its window', () => {
    const at = (iso) => new Date(iso);
    expect(isLocalTimeDue('20:00', 'Asia/Dhaka', at('2026-11-11T14:00:30Z'))).toBe(true);
    expect(isLocalTimeDue('20:00', 'Asia/Dhaka', at('2026-11-11T13:59:59Z'))).toBe(false);
    expect(isLocalTimeDue('20:00', 'Asia/Dhaka', at('2026-11-11T14:04:00Z'), 5)).toBe(true);
    expect(isLocalTimeDue('20:00', 'Asia/Dhaka', at('2026-11-11T14:05:00Z'), 5)).toBe(false);
  });

  it('handles windows that wrap past midnight', () => {
    expect(isLocalTimeDue('23:58', 'UTC', new Date('2026-11-12T00:01:00Z'), 5)).toBe(true);
  });

  it('rejects malformed reminder times', () => {
    expect(() => isLocalTimeDue('8pm', 'UTC')).toThrow(RangeError);
  });
});
