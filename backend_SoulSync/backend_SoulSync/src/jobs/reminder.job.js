import { logger } from '../config/logger.js';
import { goalRepository } from '../repositories/goal.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { wellnessLogRepository } from '../repositories/wellnessLog.repository.js';
import { isEmailEnabled, sendEmail } from '../services/email.service.js';
import { notifyOnce } from '../services/notification.service.js';
import { addDays, dateKeyToUtcDate, getLocalTime, isLocalTimeDue } from '../utils/date.js';

/** The job runs every 5 minutes; a reminder is due in the one tick whose window contains its time. */
export const REMINDER_TICK_MINUTES = 5;

async function maybeEmail(user, subject, text) {
  if (user.reminderPrefs?.emailEnabled && isEmailEnabled()) {
    await sendEmail({ to: user.email, subject, text });
  }
}

/** Daily logging reminder (FR-41): skipped if disabled, not yet due, or today's log already exists. */
async function dailyReminder(user, now) {
  const prefs = user.reminderPrefs?.daily;
  if (!prefs?.enabled || !isLocalTimeDue(prefs.time, user.timezone, now, REMINDER_TICK_MINUTES))
    return 0;

  const { dateKey } = getLocalTime(user.timezone, now);
  if (await wellnessLogRepository.existsForDate(user._id, dateKeyToUtcDate(dateKey))) return 0;

  const created = await notifyOnce(user._id, {
    dedupeKey: `daily:${dateKey}`,
    type: 'reminder',
    title: 'Time to log your day',
    message: "Take a minute to record how you're feeling today.",
  });
  if (created)
    await maybeEmail(user, 'SoulSync reminder', "It's time to log your day in SoulSync.");
  return created ? 1 : 0;
}

/** Goal-deadline reminder: active goals due today or tomorrow in the user's timezone. */
async function goalReminders(user, now) {
  const prefs = user.reminderPrefs?.goal;
  if (!prefs?.enabled || !isLocalTimeDue(prefs.time, user.timezone, now, REMINDER_TICK_MINUTES))
    return 0;

  const { dateKey } = getLocalTime(user.timezone, now);
  const goals = await goalRepository.listDueBetween(
    user._id,
    dateKeyToUtcDate(dateKey),
    dateKeyToUtcDate(addDays(dateKey, 1)),
  );

  let count = 0;
  for (const goal of goals) {
    const dueToday = goal.deadline.getTime() === dateKeyToUtcDate(dateKey).getTime();
    const created = await notifyOnce(user._id, {
      dedupeKey: `goal:${goal._id}:${dateKey}`,
      type: 'goal',
      goalId: goal._id,
      title: 'Goal deadline approaching',
      message: `"${goal.title}" is due ${dueToday ? 'today' : 'tomorrow'}.`,
    });
    if (created) {
      count += 1;
      await maybeEmail(user, 'SoulSync goal reminder', 'A goal deadline is coming up in SoulSync.');
    }
  }
  return count;
}

/**
 * Create due reminders for every active user. Idempotent (NFR-20): each notification carries a
 * per-day dedupe key, so overlapping or repeated runs never create duplicates. One user's failure
 * is logged (without personal content) and does not stop the others. Also closes goals whose
 * deadline has passed.
 * @param {{ now?: Date }} [options]
 */
export async function runReminders({ now = new Date() } = {}) {
  let created = 0;
  const cursor = userRepository.cursorActive({
    $or: [{ 'reminderPrefs.daily.enabled': true }, { 'reminderPrefs.goal.enabled': true }],
  });

  for await (const user of cursor) {
    try {
      created += await dailyReminder(user, now);
      created += await goalReminders(user, now);
    } catch (err) {
      logger.error({ err, userId: String(user._id) }, 'Reminder processing failed for a user');
    }
  }

  // Deadlines are day stamps; a one-day margin keeps users in later timezones from being marked early.
  const margin = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  const missed = await goalRepository.markOverdueMissed(margin);
  return { created, missed };
}

export const reminderJob = {
  name: 'reminders',
  schedule: `*/${REMINDER_TICK_MINUTES} * * * *`,
  timezone: 'UTC',
  handler: () => runReminders(),
};
