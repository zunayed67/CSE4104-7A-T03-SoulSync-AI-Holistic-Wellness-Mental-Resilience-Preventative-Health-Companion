import { addDays, daysBetween } from './date.js';

/**
 * Pure statistics helpers. The application (never the AI model) computes every
 * number shown to users or passed to the AI. Missing or invalid values are
 * ignored rather than treated as zero, and results are `null` when there is
 * not enough data, so "no data" is never mistaken for "zero".
 */

const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);

export function round(value, decimals = 2) {
  if (!isNumber(value)) return null;
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** Arithmetic mean of the valid numbers, or null when there are none. */
export function average(values, decimals = 2) {
  const valid = (values ?? []).filter(isNumber);
  if (valid.length === 0) return null;
  return round(valid.reduce((total, v) => total + v, 0) / valid.length, decimals);
}

export function minimum(values) {
  const valid = (values ?? []).filter(isNumber);
  return valid.length ? Math.min(...valid) : null;
}

export function maximum(values) {
  const valid = (values ?? []).filter(isNumber);
  return valid.length ? Math.max(...valid) : null;
}

/** part / whole as a percentage, or null when `whole` is not positive. */
export function percentage(part, whole, decimals = 0) {
  if (!isNumber(part) || !isNumber(whole) || whole <= 0) return null;
  return round((part / whole) * 100, decimals);
}

/**
 * Missing-data indicator for a period: which expected days have no record.
 * @param {string[]} recordedKeys Date keys that have a record.
 * @param {string[]} expectedKeys Every date key in the period.
 */
export function summarizeCompleteness(recordedKeys, expectedKeys) {
  const recorded = new Set(recordedKeys);
  const missing = expectedKeys.filter((key) => !recorded.has(key));
  const recordedCount = expectedKeys.length - missing.length;
  return {
    expected: expectedKeys.length,
    recorded: recordedCount,
    missing,
    completionRate: percentage(recordedCount, expectedKeys.length),
  };
}

/**
 * Ordinary least-squares line through `{ x, y }` points.
 * @returns {{ slope: number, intercept: number } | null} null if fewer than 2 distinct x values.
 */
export function linearTrend(points) {
  const valid = (points ?? []).filter((p) => isNumber(p?.x) && isNumber(p?.y));
  const n = valid.length;
  if (n < 2) return null;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (const { x, y } of valid) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / denominator;
  return { slope, intercept: (sumY - slope * sumX) / n };
}

/**
 * Describe the direction of a metric over time. Days without a record are simply
 * absent from the regression, so gaps do not distort the slope.
 * This describes an observed pattern only; it says nothing about causes.
 *
 * @param {{ date: string, value: number }[]} series Entries keyed by date key.
 * @param {{ flatThreshold?: number, minPoints?: number }} [options]
 *   flatThreshold: |slope| (units per day) at or below which the trend is "stable".
 * @returns {{ direction: 'increasing'|'decreasing'|'stable'|'insufficient_data', slopePerDay: number|null }}
 */
export function describeTrend(series, { flatThreshold = 0.02, minPoints = 3 } = {}) {
  const sorted = (series ?? [])
    .filter((entry) => entry && isNumber(entry.value))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < minPoints) return { direction: 'insufficient_data', slopePerDay: null };

  const origin = sorted[0].date;
  const fit = linearTrend(sorted.map((e) => ({ x: daysBetween(origin, e.date), y: e.value })));
  if (!fit) return { direction: 'insufficient_data', slopePerDay: null };

  const slopePerDay = round(fit.slope, 3);
  let direction = 'stable';
  if (fit.slope > flatThreshold) direction = 'increasing';
  else if (fit.slope < -flatThreshold) direction = 'decreasing';
  return { direction, slopePerDay };
}

/** Count, average, range, latest value and trend for one metric. */
export function summarizeSeries(series, options = {}) {
  const sorted = (series ?? [])
    .filter((entry) => entry && isNumber(entry.value))
    .sort((a, b) => a.date.localeCompare(b.date));
  const values = sorted.map((e) => e.value);
  return {
    count: values.length,
    average: average(values),
    min: minimum(values),
    max: maximum(values),
    latest: sorted.length ? sorted[sorted.length - 1].value : null,
    trend: describeTrend(sorted, options),
  };
}

/**
 * Consecutive days with a record, counting back from `endKey`. A streak is still
 * alive if today has no record yet (the user has until midnight), so counting
 * starts from yesterday in that case.
 */
export function currentStreak(dateKeys, endKey) {
  const recorded = new Set(dateKeys);
  let cursor = recorded.has(endKey) ? endKey : addDays(endKey, -1);
  let streak = 0;
  while (recorded.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
