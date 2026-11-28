import { logger } from '../config/logger.js';
import { userRepository } from '../repositories/user.repository.js';
import { wellnessReportRepository } from '../repositories/wellnessReport.repository.js';
import { trySummarizeForJob } from '../services/ai/ai.service.js';
import { isEmailEnabled, sendEmail } from '../services/email.service.js';
import { notifyOnce } from '../services/notification.service.js';
import { ensureReportRaw } from '../services/report.service.js';
import { addDays, getIsoWeekId, getWeekRange, toDateKey, todayKey } from '../utils/date.js';

/** Minimal user shape the services expect (cursor documents use `_id`). */
const toJobUser = (doc) => ({
  id: String(doc._id),
  timezone: doc.timezone,
  aiConsent: doc.aiConsent,
});

/**
 * Generate the report for each active user's most recently completed week (FR-42, UC-22).
 * Idempotent: the report is unique per (user, ISO week) and the notification per week id, so
 * re-running, overlapping runs and the startup recovery pass can never create duplicates.
 * The AI summary is attempted only when a report is first created; without consent, or if the
 * provider fails, the report simply contains the calculated metrics.
 * @param {{ now?: Date }} [options]
 */
export async function runWeeklyReports({ now = new Date() } = {}) {
  let generated = 0;
  let notified = 0;

  for await (const doc of userRepository.cursorActive()) {
    try {
      const user = toJobUser(doc);
      const previousWeekStart = addDays(getWeekRange(todayKey(user.timezone, now)).startKey, -7);
      const { endKey } = getWeekRange(previousWeekStart);

      // Accounts created after that week ended have nothing to report.
      if (doc.createdAt && toDateKey(doc.createdAt, user.timezone) > endKey) continue;

      const weekId = getIsoWeekId(previousWeekStart);
      let report = await wellnessReportRepository.findByWeek(user.id, weekId);
      if (!report) {
        report = await ensureReportRaw(user, previousWeekStart);
        generated += 1;
        await trySummarizeForJob(user, report);
      }

      if (doc.reminderPrefs?.weekly?.enabled) {
        const created = await notifyOnce(user.id, {
          dedupeKey: `weekly:${weekId}`,
          type: 'report',
          title: 'Your weekly wellness report is ready',
          message: `You logged ${report.recordedDays} of ${report.recordedDays + report.missingDays} days last week. Open your report to see the details.`,
        });
        if (created) {
          notified += 1;
          if (doc.reminderPrefs.emailEnabled && isEmailEnabled()) {
            await sendEmail({
              to: doc.email,
              subject: 'Your SoulSync weekly report is ready',
              text: 'Your weekly wellness report is ready. Log in to SoulSync to read it.',
            });
          }
        }
      }
    } catch (err) {
      logger.error({ err, userId: String(doc._id) }, 'Weekly report failed for a user');
    }
  }
  return { generated, notified };
}

export const weeklyReportJob = {
  name: 'weekly-report',
  // Hourly, because each user's week ends at midnight in their own timezone.
  schedule: '10 * * * *',
  timezone: 'UTC',
  handler: () => runWeeklyReports(),
};
