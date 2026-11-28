import { METRIC_KEYS } from '../config/constants.js';
import { wellnessLogRepository } from '../repositories/wellnessLog.repository.js';
import { AppError } from '../utils/AppError.js';
import { addDays, dateKeyToUtcDate, todayKey, utcDateToDateKey } from '../utils/date.js';

const LIST_DEFAULT_DAYS = 30;

export function presentLog(log) {
  const out = { id: String(log._id), date: utcDateToDateKey(log.date) };
  for (const key of METRIC_KEYS) out[key] = log[key] ?? null;
  out.createdAt = log.createdAt;
  out.updatedAt = log.updatedAt;
  return out;
}

function pickMetrics(input) {
  const picked = {};
  for (const key of METRIC_KEYS) if (input[key] !== undefined) picked[key] = input[key];
  return picked;
}

function existsConflict(existing) {
  return AppError.conflict(
    'A record for this date already exists. Edit it instead of creating a new one.',
    'WELLNESS_LOG_EXISTS',
    { existingLogId: String(existing._id), date: utcDateToDateKey(existing.date) },
  );
}

/**
 * Create the day's record (FR-09/10). The day is resolved in the user's timezone; a second record
 * for the same day is rejected with a pointer to the existing one so the client can offer an edit.
 */
export async function createLog(user, input) {
  const dateKey = input.date ?? todayKey(user.timezone);
  if (dateKey > todayKey(user.timezone)) {
    throw AppError.badRequest('You cannot record wellness data for a future date.', 'FUTURE_DATE');
  }
  const date = dateKeyToUtcDate(dateKey);

  const existing = await wellnessLogRepository.findByDate(user.id, date);
  if (existing) throw existsConflict(existing);

  try {
    const log = await wellnessLogRepository.create({
      userId: user.id,
      date,
      ...pickMetrics(input),
    });
    return presentLog(log);
  } catch (err) {
    if (err?.code === 11000) {
      throw existsConflict(await wellnessLogRepository.findByDate(user.id, date));
    }
    throw err;
  }
}

export async function getLog(user, id) {
  const log = await wellnessLogRepository.findOwned(user.id, id);
  if (!log) throw AppError.notFound('Wellness record not found', 'WELLNESS_LOG_NOT_FOUND');
  return presentLog(log);
}

export async function getLogByDate(user, dateKey) {
  const log = await wellnessLogRepository.findByDate(user.id, dateKeyToUtcDate(dateKey));
  if (!log) throw AppError.notFound('No record for this date', 'WELLNESS_LOG_NOT_FOUND');
  return presentLog(log);
}

/** History list filtered by date range (FR-11); defaults to the last 30 days, newest first. */
export async function listLogs(user, { from, to, skip, limit }) {
  const toKey = to ?? todayKey(user.timezone);
  const fromKey = from ?? addDays(toKey, -(LIST_DEFAULT_DAYS - 1));
  const { items, total } = await wellnessLogRepository.listOwned(user.id, {
    filter: { date: { $gte: dateKeyToUtcDate(fromKey), $lte: dateKeyToUtcDate(toKey) } },
    sort: { date: -1 },
    skip,
    limit,
  });
  return { items: items.map(presentLog), total, range: { from: fromKey, to: toKey } };
}

/** Edit metrics of an existing record (FR-12). `null` clears a metric; at least one must remain. */
export async function updateLog(user, id, patch) {
  const existing = await wellnessLogRepository.findOwned(user.id, id);
  if (!existing) throw AppError.notFound('Wellness record not found', 'WELLNESS_LOG_NOT_FOUND');

  const changes = pickMetrics(patch);
  const merged = { ...existing, ...changes };
  if (METRIC_KEYS.every((key) => merged[key] === null || merged[key] === undefined)) {
    throw AppError.badRequest('A record must keep at least one metric.', 'AT_LEAST_ONE_METRIC');
  }
  const updated = await wellnessLogRepository.updateOwned(user.id, id, { $set: changes });
  return presentLog(updated);
}

export async function deleteLog(user, id) {
  const deleted = await wellnessLogRepository.deleteOwned(user.id, id);
  if (!deleted) throw AppError.notFound('Wellness record not found', 'WELLNESS_LOG_NOT_FOUND');
}
