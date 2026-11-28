import { logger } from '../config/logger.js';
import { goalRepository } from '../repositories/goal.repository.js';
import { runWeeklyReports } from './weeklyReport.job.js';

/**
 * Catch-up pass (NFR-20). Free hosting can sleep through scheduled runs, so on every start (and
 * once a night as a safety net) we generate any weekly report that should already exist and close
 * overdue goals. Missed daily reminders are intentionally not replayed: a reminder for a past time
 * would only be noise. Everything here is idempotent.
 */
export async function runRecovery({ now = new Date() } = {}) {
  const margin = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  const missed = await goalRepository.markOverdueMissed(margin);
  const reports = await runWeeklyReports({ now });
  logger.info({ missedGoals: missed, ...reports }, 'Recovery pass finished');
  return { missed, ...reports };
}

export const recoveryJob = {
  name: 'recovery',
  schedule: '0 3 * * *',
  runOnStart: true,
  handler: () => runRecovery(),
};
