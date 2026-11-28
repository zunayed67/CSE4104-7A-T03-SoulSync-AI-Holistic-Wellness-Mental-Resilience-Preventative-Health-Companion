import { utcDateToDateKey } from '../../utils/date.js';
import { truncate } from '../../utils/text.js';

/**
 * Data minimisation for the AI provider (FR-32, FR-39, NFR-12). Every payload that leaves the
 * backend is assembled here from an explicit whitelist: no ids, names, emails, journal text or
 * free-form notes. Anything not listed below simply cannot be sent.
 */

const FORBIDDEN_KEYS = new Set([
  'id',
  '_id',
  'userid',
  'email',
  'name',
  'passwordhash',
  'password',
  'token',
  'journal',
  'journalentries',
  'journaltext',
  'content',
  'notes',
  'tags',
  'body',
]);

const control = /\p{Cc}/gu;

/** Strip control characters and collapse whitespace in short free text such as goal titles. */
export function cleanText(value, max = 80) {
  return truncate(
    String(value ?? '')
      .replace(control, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
    max,
  );
}

const num = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

/** Daily records reduced to date + the six numeric metrics. */
export function minimizeLogs(logs) {
  return logs.map((log) => ({
    date: utcDateToDateKey(log.date),
    mood: num(log.mood),
    stress: num(log.stressLevel),
    sleepHours: num(log.sleepHours),
    waterMl: num(log.waterIntakeMl),
    activityMinutes: num(log.activityMinutes),
    energy: num(log.energyLevel),
  }));
}

/** Goals reduced to title, cadence, target and progress. `progress` comes from goal.service. */
export function minimizeGoals(goals) {
  return goals.map((goal) => ({
    title: cleanText(goal.title, 80),
    cadence: goal.type,
    target: goal.targetValue,
    unit: cleanText(goal.unit, 20),
    progressPercent: num(goal.progressPercent) ?? 0,
  }));
}

/** A weekly report reduced to its calculated statistics. */
export function minimizeReport(report) {
  const metrics = {};
  for (const [key, stat] of Object.entries(report.metrics ?? {})) {
    metrics[key] = {
      average: num(stat.average),
      min: num(stat.min),
      max: num(stat.max),
      daysRecorded: num(stat.count),
      trend: typeof stat.trend?.direction === 'string' ? stat.trend.direction : 'insufficient_data',
    };
  }
  return {
    weekStart: utcDateToDateKey(report.weekStart),
    weekEnd: utcDateToDateKey(report.weekEnd),
    recordedDays: report.recordedDays,
    missingDays: report.missingDays,
    metrics,
  };
}

/** Routine-generator inputs: only what the user typed for this request plus goal titles. */
export function minimizeRoutineInput(
  { preferences, availableMinutes, wakeTime, sleepTime },
  goals,
) {
  return {
    preferences: cleanText(preferences, 500),
    availableMinutes: num(availableMinutes),
    wakeTime: wakeTime ?? null,
    sleepTime: sleepTime ?? null,
    goals: minimizeGoals(goals).map(({ title, cadence }) => ({ title, cadence })),
  };
}

/**
 * Last line of defence: throws if a forbidden key appears anywhere in the payload, so a future
 * code change cannot silently start leaking journal text or identifiers.
 */
export function assertMinimized(payload, path = 'payload') {
  if (Array.isArray(payload)) {
    payload.forEach((item, i) => assertMinimized(item, `${path}[${i}]`));
  } else if (payload && typeof payload === 'object') {
    for (const [key, value] of Object.entries(payload)) {
      if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
        throw new Error(`Forbidden field "${key}" in AI payload at ${path}`);
      }
      assertMinimized(value, `${path}.${key}`);
    }
  }
  return payload;
}
