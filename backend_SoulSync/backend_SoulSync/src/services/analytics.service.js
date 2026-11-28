import { MAX_TREND_DAYS, METRIC_KEYS, STREAK_LOOKBACK_DAYS } from '../config/constants.js';
import { wellnessLogRepository } from '../repositories/wellnessLog.repository.js';
import { notificationRepository } from '../repositories/notification.repository.js';
import { AppError } from '../utils/AppError.js';
import {
  addDays,
  dateKeyToUtcDate,
  daysBetween,
  eachDateKey,
  todayKey,
  utcDateToDateKey,
} from '../utils/date.js';
import { average, currentStreak, summarizeCompleteness, summarizeSeries } from '../utils/stats.js';
import { listActiveWithProgress } from './goal.service.js';
import { presentLog } from './wellness.service.js';

/** |slope| per day below which a metric is reported as "stable" (units of each metric). */
export const TREND_FLAT_THRESHOLDS = Object.freeze({
  mood: 0.03,
  stressLevel: 0.05,
  sleepHours: 0.05,
  waterIntakeMl: 30,
  activityMinutes: 1.5,
  energyLevel: 0.03,
});

/**
 * Pure analytics (FR-21 to FR-25): every figure is calculated here from stored records, never by
 * the AI. Days without a record appear in `days` with `recorded: false` and null metrics, so charts
 * can mark them as missing instead of plotting zero (FR-25).
 *
 * @param {{ logs: object[], startKey: string, endKey: string }} input
 */
export function buildTrends({ logs, startKey, endKey }) {
  const keys = eachDateKey(startKey, endKey);
  const byKey = new Map(logs.map((log) => [utcDateToDateKey(log.date), log]));

  const days = keys.map((date) => {
    const log = byKey.get(date);
    const row = { date, recorded: Boolean(log) };
    for (const metric of METRIC_KEYS) {
      row[metric] = log && typeof log[metric] === 'number' ? log[metric] : null;
    }
    return row;
  });

  const metrics = {};
  for (const metric of METRIC_KEYS) {
    const series = days
      .filter((d) => d[metric] !== null)
      .map((d) => ({ date: d.date, value: d[metric] }));
    metrics[metric] = summarizeSeries(series, { flatThreshold: TREND_FLAT_THRESHOLDS[metric] });
  }

  const recordedKeys = days.filter((d) => d.recorded).map((d) => d.date);
  return {
    range: { startKey, endKey, days: keys.length },
    days,
    metrics,
    completeness: summarizeCompleteness(recordedKeys, keys),
  };
}

/**
 * Turn the query (`week` = last 7 days, `month` = last 30 days, or an explicit from/to) into
 * concrete date keys. Rolling windows ending today keep the chart useful on any weekday.
 * @returns {{ startKey: string, endKey: string }}
 */
export function resolveRange({ range, from, to } = {}, today) {
  if (range === 'month') return { startKey: addDays(today, -29), endKey: today };
  if (!from && (range === 'week' || !range)) return { startKey: addDays(today, -6), endKey: today };

  if (!from) throw AppError.badRequest('A custom range needs a "from" date.', 'INVALID_RANGE');
  const endKey = !to || to > today ? today : to;
  if (from > endKey) throw AppError.badRequest('"from" must not be after "to".', 'INVALID_RANGE');
  if (daysBetween(from, endKey) + 1 > MAX_TREND_DAYS) {
    throw AppError.badRequest(
      `A range can cover at most ${MAX_TREND_DAYS} days.`,
      'RANGE_TOO_LARGE',
    );
  }
  return { startKey: from, endKey };
}

async function loggingStreak(user, today) {
  const dates = await wellnessLogRepository.listDates(
    user.id,
    dateKeyToUtcDate(addDays(today, -(STREAK_LOOKBACK_DAYS - 1))),
    dateKeyToUtcDate(today),
  );
  return currentStreak(dates.map(utcDateToDateKey), today);
}

export async function getTrends(user, query) {
  const today = todayKey(user.timezone);
  const { startKey, endKey } = resolveRange(query, today);
  const logs = await wellnessLogRepository.listRange(
    user.id,
    dateKeyToUtcDate(startKey),
    dateKeyToUtcDate(endKey),
  );
  return { ...buildTrends({ logs, startKey, endKey }), streak: await loggingStreak(user, today) };
}

/** Today's overview for the dashboard (FR-20, FR-24). */
export async function getOverview(user) {
  const today = todayKey(user.timezone);
  const since = addDays(today, -29);
  const [logs, goals, unread, streak] = await Promise.all([
    wellnessLogRepository.listRange(user.id, dateKeyToUtcDate(since), dateKeyToUtcDate(today)),
    listActiveWithProgress(user, 5),
    notificationRepository.countUnread(user.id),
    loggingStreak(user, today),
  ]);

  const todayLog = logs.find((log) => utcDateToDateKey(log.date) === today);
  const latest = logs.length ? logs[logs.length - 1] : null;
  const weekStart = addDays(today, -6);
  const weekLogs = logs.filter((log) => utcDateToDateKey(log.date) >= weekStart);

  const last7Averages = {};
  for (const metric of METRIC_KEYS) last7Averages[metric] = average(weekLogs.map((l) => l[metric]));

  return {
    date: today,
    hasTodayLog: Boolean(todayLog),
    todayLog: todayLog ? presentLog(todayLog) : null,
    latestLog: latest ? presentLog(latest) : null,
    streak,
    last7Days: { recordedDays: weekLogs.length, averages: last7Averages },
    goals: { active: goals.length, items: goals },
    notifications: { unread },
  };
}
