import { goalRepository } from '../repositories/goal.repository.js';
import { AppError } from '../utils/AppError.js';
import {
  addDays,
  dateKeyToUtcDate,
  getWeekRange,
  toDateKey,
  todayKey,
  utcDateToDateKey,
} from '../utils/date.js';
import { round } from '../utils/stats.js';
import { serialize } from '../utils/serialize.js';

const MAX_HISTORY = 400;
const NOT_FOUND = () => AppError.notFound('Goal not found', 'GOAL_NOT_FOUND');

/**
 * Progress and consistency for one goal (FR-24, FR-29). A daily goal is judged per day and a weekly
 * goal per ISO week; a period is "completed" when its summed progress reaches the target. The
 * completion rate covers up to the last 30 days / 12 weeks since the goal was created, and the
 * period in progress only counts once completed. All numbers come from stored progress history.
 *
 * @param {object} goal lean goal document
 * @param {string} today date key in the user's timezone
 * @param {string} timezone IANA zone (used to place `createdAt` on a calendar day)
 */
export function computeGoalProgress(goal, today, timezone) {
  const daily = goal.type === 'daily';
  const step = daily ? 1 : 7;
  const periodOf = (key) => (daily ? key : getWeekRange(key).startKey);

  const totals = new Map();
  for (const entry of goal.history ?? []) {
    const period = periodOf(utcDateToDateKey(entry.date));
    totals.set(period, (totals.get(period) ?? 0) + entry.value);
  }
  const reached = (period) => (totals.get(period) ?? 0) >= goal.targetValue;

  const currentPeriod = periodOf(today);
  const currentValue = round(totals.get(currentPeriod) ?? 0, 2);
  const maxPeriods = daily ? 30 : 12;
  const createdPeriod = periodOf(toDateKey(goal.createdAt, timezone));
  const oldestAllowed = addDays(currentPeriod, -(maxPeriods - 1) * step);
  const start = createdPeriod > oldestAllowed ? createdPeriod : oldestAllowed;

  let elapsed = 0;
  let completed = 0;
  for (let period = start; period <= currentPeriod; period = addDays(period, step)) {
    const done = reached(period);
    if (period === currentPeriod && !done) continue;
    elapsed += 1;
    if (done) completed += 1;
  }

  let streak = 0;
  let cursor = reached(currentPeriod) ? currentPeriod : addDays(currentPeriod, -step);
  while (reached(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -step);
  }

  return {
    currentValue,
    progressPercent: Math.min(100, round((currentValue / goal.targetValue) * 100, 0)),
    completionRate: elapsed > 0 ? round((completed / elapsed) * 100, 0) : null,
    streak,
    completedPeriods: completed,
    elapsedPeriods: elapsed,
  };
}

export function presentGoal(goal, timezone) {
  const { history: _history, ...rest } = serialize(goal);
  const progress = computeGoalProgress(goal, todayKey(timezone), timezone);
  return {
    ...rest,
    deadline: goal.deadline ? utcDateToDateKey(goal.deadline) : null,
    ...progress,
  };
}

export async function createGoal(user, input) {
  const { deadline, ...rest } = input;
  if (deadline && deadline < todayKey(user.timezone)) {
    throw AppError.badRequest('The deadline cannot be in the past.', 'DEADLINE_IN_PAST');
  }
  const goal = await goalRepository.create({
    userId: user.id,
    ...rest,
    deadline: deadline ? dateKeyToUtcDate(deadline) : null,
  });
  return presentGoal(goal, user.timezone);
}

export async function listGoals(user, { status, skip, limit }) {
  const { items, total } = await goalRepository.listOwned(user.id, {
    filter: status ? { status } : {},
    skip,
    limit,
  });
  return { items: items.map((g) => presentGoal(g, user.timezone)), total };
}

/** Active goals with progress for the dashboard and AI input. */
export async function listActiveWithProgress(user, limit = 5) {
  const goals = await goalRepository.listActive(user.id, limit);
  return goals.map((g) => presentGoal(g, user.timezone));
}

export async function getGoal(user, id) {
  const goal = await goalRepository.findOwned(user.id, id);
  if (!goal) throw NOT_FOUND();
  return presentGoal(goal, user.timezone);
}

export async function updateGoal(user, id, patch) {
  const { deadline, ...rest } = patch;
  const $set = { ...rest };
  if (deadline !== undefined) $set.deadline = deadline ? dateKeyToUtcDate(deadline) : null;
  const goal = await goalRepository.updateOwned(user.id, id, { $set });
  if (!goal) throw NOT_FOUND();
  return presentGoal(goal, user.timezone);
}

/**
 * Record progress for a day (FR-27): `value` sets the day's total, `increment` adds to it.
 * The per-day history drives the completion rate and streak.
 */
export async function updateProgress(user, id, { value, increment, date }) {
  const goal = await goalRepository.findOwned(user.id, id);
  if (!goal) throw NOT_FOUND();

  const today = todayKey(user.timezone);
  const dayKey = date ?? today;
  if (dayKey > today)
    throw AppError.badRequest('Progress cannot be recorded for a future date.', 'FUTURE_DATE');

  const dayStamp = dateKeyToUtcDate(dayKey);
  const history = (goal.history ?? []).filter((h) => h.date.getTime() !== dayStamp.getTime());
  const previous =
    (goal.history ?? []).find((h) => h.date.getTime() === dayStamp.getTime())?.value ?? 0;
  const next = Math.max(0, value !== undefined ? value : previous + increment);
  history.push({ date: dayStamp, value: next });
  history.sort((a, b) => a.date - b.date);

  const trimmed = history.slice(-MAX_HISTORY);
  const progress = computeGoalProgress({ ...goal, history: trimmed }, today, user.timezone);
  const updated = await goalRepository.updateOwned(user.id, id, {
    $set: { history: trimmed, currentValue: progress.currentValue },
  });
  return presentGoal(updated, user.timezone);
}

export async function deleteGoal(user, id) {
  if (!(await goalRepository.deleteOwned(user.id, id))) throw NOT_FOUND();
}
