import { DateTime } from 'luxon';

/**
 * Timezone-aware date helpers.
 *
 * Convention: a calendar day is represented by a "date key" string, `YYYY-MM-DD`,
 * resolved in the USER's timezone. Wellness logs are unique on (userId, dateKey),
 * so "today" is always computed with {@link todayKey} and never from the server clock's zone.
 */

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_OF_DAY_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const MAX_RANGE_DAYS = 366;

/** @param {unknown} value */
export function isValidTimezone(value) {
  if (typeof value !== 'string' || value.trim() === '') return false;
  return DateTime.now().setZone(value).isValid;
}

/** True only for real calendar dates in `YYYY-MM-DD` form (rejects 2026-02-30). */
export function isValidDateKey(value) {
  if (typeof value !== 'string' || !DATE_KEY_RE.test(value)) return false;
  return DateTime.fromISO(value, { zone: 'utc' }).isValid;
}

/** True for 24-hour `HH:mm` strings such as "07:30". */
export function isValidTimeOfDay(value) {
  return typeof value === 'string' && TIME_OF_DAY_RE.test(value);
}

function parseKey(dateKey) {
  if (!isValidDateKey(dateKey)) throw new RangeError(`Invalid date key: ${String(dateKey)}`);
  return DateTime.fromISO(dateKey, { zone: 'utc' });
}

function toDateTime(input, timezone) {
  if (DateTime.isDateTime(input)) return input.setZone(timezone);
  if (input instanceof Date) return DateTime.fromJSDate(input, { zone: timezone });
  if (typeof input === 'string') return DateTime.fromISO(input, { zone: timezone });
  return DateTime.invalid('unsupported input');
}

/**
 * Convert an instant to the calendar day it falls on in `timezone`.
 * @param {Date|string|import('luxon').DateTime} input
 * @param {string} [timezone='UTC']
 * @returns {string} `YYYY-MM-DD`
 */
export function toDateKey(input, timezone = 'UTC') {
  const dt = toDateTime(input, timezone);
  if (!dt.isValid) throw new RangeError('Invalid date input');
  return dt.toISODate();
}

/** The current calendar day in `timezone`. `now` is injectable for tests. */
export function todayKey(timezone = 'UTC', now = new Date()) {
  return toDateKey(now, timezone);
}

/** Add (or subtract) whole days to a date key. DST-safe because keys are zone-less. */
export function addDays(dateKey, days) {
  return parseKey(dateKey).plus({ days }).toISODate();
}

/** Whole days from `startKey` to `endKey` (negative if end is earlier). */
export function daysBetween(startKey, endKey) {
  return Math.round(parseKey(endKey).diff(parseKey(startKey), 'days').days);
}

/**
 * Every date key from start to end, inclusive. Returns [] when end < start and
 * throws if the span exceeds one year (guards against accidental huge ranges).
 */
export function eachDateKey(startKey, endKey) {
  const span = daysBetween(startKey, endKey);
  if (span < 0) return [];
  if (span >= MAX_RANGE_DAYS)
    throw new RangeError(`Date range too large (max ${MAX_RANGE_DAYS} days)`);
  return Array.from({ length: span + 1 }, (_, i) => addDays(startKey, i));
}

/** ISO week (Monday–Sunday) containing `dateKey`. */
export function getWeekRange(dateKey) {
  const start = parseKey(dateKey).startOf('week');
  return { startKey: start.toISODate(), endKey: start.plus({ days: 6 }).toISODate() };
}

/** Calendar month containing `dateKey`. */
export function getMonthRange(dateKey) {
  const d = parseKey(dateKey);
  return { startKey: d.startOf('month').toISODate(), endKey: d.endOf('month').toISODate() };
}

/**
 * ISO week identifier such as `2026-W46`. Used as the idempotency key for the
 * weekly report job so a re-run never creates a duplicate report.
 */
export function getIsoWeekId(dateKey) {
  const d = parseKey(dateKey);
  return `${d.weekYear}-W${String(d.weekNumber).padStart(2, '0')}`;
}

/**
 * UTC instants bounding a local calendar day: [start, end) in `timezone`.
 * Use for querying timestamp fields (createdAt) by the user's local day.
 */
export function getDayBounds(dateKey, timezone) {
  parseKey(dateKey);
  const start = DateTime.fromISO(dateKey, { zone: timezone });
  if (!start.isValid) throw new RangeError(`Invalid timezone: ${String(timezone)}`);
  return { start: start.toUTC().toJSDate(), end: start.plus({ days: 1 }).toUTC().toJSDate() };
}

/** Wall-clock time in `timezone`: `{ dateKey, timeOfDay: 'HH:mm', minutesSinceMidnight }`. */
export function getLocalTime(timezone, now = new Date()) {
  const dt = DateTime.fromJSDate(now, { zone: timezone });
  if (!dt.isValid) throw new RangeError(`Invalid timezone: ${String(timezone)}`);
  return {
    dateKey: dt.toISODate(),
    timeOfDay: dt.toFormat('HH:mm'),
    minutesSinceMidnight: dt.hour * 60 + dt.minute,
  };
}

/**
 * Is the user's local clock inside `[timeOfDay, timeOfDay + windowMinutes)`?
 * A reminder job that ticks every N minutes passes `windowMinutes = N`, so each
 * reminder is due in exactly one tick. Handles windows that wrap past midnight.
 */
export function isLocalTimeDue(timeOfDay, timezone, now = new Date(), windowMinutes = 1) {
  if (!isValidTimeOfDay(timeOfDay))
    throw new RangeError(`Invalid time of day: ${String(timeOfDay)}`);
  const [hours, minutes] = timeOfDay.split(':').map(Number);
  const target = hours * 60 + minutes;
  const { minutesSinceMidnight } = getLocalTime(timezone, now);
  return (minutesSinceMidnight - target + 1440) % 1440 < windowMinutes;
}

/**
 * MongoDB `date` fields store a calendar day as a Date at 00:00 UTC (a "day stamp"). The day itself
 * was resolved in the user's timezone first, so unique (userId, date) indexes and range queries
 * behave identically for every timezone. `utcDateToDateKey` is the inverse.
 */
export function dateKeyToUtcDate(dateKey) {
  return parseKey(dateKey).toJSDate();
}

export function utcDateToDateKey(date) {
  return DateTime.fromJSDate(date, { zone: 'utc' }).toISODate();
}
