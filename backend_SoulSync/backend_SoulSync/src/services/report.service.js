import { METRIC_KEYS } from '../config/constants.js';
import { wellnessLogRepository } from '../repositories/wellnessLog.repository.js';
import { wellnessReportRepository } from '../repositories/wellnessReport.repository.js';
import { AppError } from '../utils/AppError.js';
import {
  addDays,
  dateKeyToUtcDate,
  getIsoWeekId,
  getWeekRange,
  todayKey,
  utcDateToDateKey,
} from '../utils/date.js';
import { serialize } from '../utils/serialize.js';
import { buildTrends } from './analytics.service.js';

const NOT_FOUND = () => AppError.notFound('Report not found', 'REPORT_NOT_FOUND');

export function presentReport(report) {
  const { weekStart, weekEnd, ...rest } = serialize(report);
  return { ...rest, weekStart: utcDateToDateKey(weekStart), weekEnd: utcDateToDateKey(weekEnd) };
}

/**
 * Calculated weekly report data (FR-34, FR-42). Only days up to today are expected, so a week in
 * progress is not penalised for days that have not happened yet.
 * @param {{ logs: object[], anyDayInWeek: string, today: string }} input
 */
export function buildWeekReportData({ logs, anyDayInWeek, today }) {
  const { startKey, endKey } = getWeekRange(anyDayInWeek);
  if (startKey > today) {
    throw AppError.badRequest('Reports cannot be generated for a future week.', 'FUTURE_WEEK');
  }
  // Days that already ended are expected. Today only counts once it has a record, so a user who
  // has not logged yet today is not marked as missing a day that is still open.
  const hasToday = logs.some((log) => utcDateToDateKey(log.date) === today);
  const expectedEnd = endKey < today ? endKey : hasToday ? today : addDays(today, -1);
  const trends = buildTrends({ logs, startKey, endKey: expectedEnd });

  const metrics = {};
  for (const key of METRIC_KEYS) {
    const { count, average, min, max, latest, trend } = trends.metrics[key];
    metrics[key] = { count, average, min, max, latest, trend };
  }
  return {
    weekId: getIsoWeekId(startKey),
    weekStart: dateKeyToUtcDate(startKey),
    weekEnd: dateKeyToUtcDate(endKey),
    metrics,
    recordedDays: trends.completeness.recorded,
    missingDays: trends.completeness.missing.length,
    missingDates: trends.completeness.missing,
  };
}

/**
 * Create or refresh the calculated report for the week containing `anyDayInWeek` (default: this
 * week). Idempotent on (user, ISO week); an existing AI summary is preserved. Returns the raw doc.
 * @param {{ id: string, timezone: string }} user
 */
export async function ensureReportRaw(user, anyDayInWeek) {
  const today = todayKey(user.timezone);
  const data = buildWeekReportData({
    logs: await loadWeekLogs(user, anyDayInWeek ?? today),
    anyDayInWeek: anyDayInWeek ?? today,
    today,
  });
  const { weekId, ...fields } = data;
  return wellnessReportRepository.upsertForWeek(user.id, weekId, fields);
}

async function loadWeekLogs(user, anyDayInWeek) {
  const { startKey, endKey } = getWeekRange(anyDayInWeek);
  return wellnessLogRepository.listRange(
    user.id,
    dateKeyToUtcDate(startKey),
    dateKeyToUtcDate(endKey),
  );
}

export async function ensureReport(user, anyDayInWeek) {
  return presentReport(await ensureReportRaw(user, anyDayInWeek));
}

export async function listReports(user, { skip, limit }) {
  const { items, total } = await wellnessReportRepository.listOwned(user.id, {
    sort: { weekStart: -1 },
    skip,
    limit,
  });
  return { items: items.map(presentReport), total };
}

export async function getReport(user, id) {
  const report = await wellnessReportRepository.findOwned(user.id, id);
  if (!report) throw NOT_FOUND();
  return presentReport(report);
}
