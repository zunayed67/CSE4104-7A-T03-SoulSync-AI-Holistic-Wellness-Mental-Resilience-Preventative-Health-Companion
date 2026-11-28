import cron from 'node-cron';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';
import { JobLease } from '../models/jobLease.model.js';
import { recoveryJob } from './recovery.job.js';
import { reminderJob } from './reminder.job.js';
import { weeklyReportJob } from './weeklyReport.job.js';

/**
 * Central node-cron registry. Individual jobs (reminders, weekly report, recovery) register
 * themselves here; the scheduler guarantees that:
 *   - a job never overlaps with its own previous run (slow runs are skipped, not stacked),
 *   - a failing job is logged and never crashes the process or stops its schedule,
 *   - shutdown waits (bounded) for in-flight runs.
 * Because free hosting can sleep, every registered handler must be idempotent.
 */

/** @type {Map<string, { name: string, schedule: string, timezone: string, runOnStart: boolean, handler: () => Promise<unknown> | unknown, task: any, current: Promise<void> | null }>} */
const registry = new Map();
const LEASE_MS = 5 * 60 * 1000;

/** Cross-process lease: MongoDB atomically elects a single instance to run each scheduled job. */
async function acquireDistributedLease(name) {
  // Manual unit-test runs without a database retain the local overlap guard.
  if (mongoose.connection.readyState !== 1) return { release: async () => {}, stopRenewal: () => {} };
  const owner = `${process.pid}:${randomUUID()}`;
  const now = new Date();
  try {
    const acquired = await JobLease.findOneAndUpdate(
      { _id: name, $or: [{ leaseUntil: { $lte: now } }, { owner }] },
      { $set: { owner, leaseUntil: new Date(now.getTime() + LEASE_MS) } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
    if (acquired?.owner !== owner) return null;
  } catch (err) {
    if (err?.code !== 11000) logger.error({ code: err?.code, job: name }, 'Could not acquire job lease');
    return null;
  }

  const renewal = setInterval(() => {
    JobLease.updateOne(
      { _id: name, owner },
      { $set: { leaseUntil: new Date(Date.now() + LEASE_MS) } },
    ).catch((err) => logger.error({ code: err?.code, job: name }, 'Could not renew job lease'));
  }, Math.floor(LEASE_MS / 3));
  renewal.unref();
  return {
    stopRenewal: () => clearInterval(renewal),
    release: async () => {
      clearInterval(renewal);
      await JobLease.deleteOne({ _id: name, owner }).catch((err) => {
        logger.error({ code: err?.code, job: name }, 'Could not release job lease');
      });
    },
  };
}

/**
 * @param {{ name: string, schedule: string, handler: () => Promise<unknown> | unknown, timezone?: string, runOnStart?: boolean }} definition
 */
export function registerJob({
  name,
  schedule,
  handler,
  timezone = config.defaultTimezone,
  runOnStart = false,
}) {
  if (typeof name !== 'string' || name.trim() === '') throw new TypeError('Job name is required');
  if (registry.has(name)) throw new Error(`Job "${name}" is already registered`);
  if (typeof handler !== 'function') throw new TypeError(`Job "${name}" needs a handler function`);
  if (!cron.validate(schedule))
    throw new TypeError(`Job "${name}" has an invalid cron expression: ${schedule}`);
  registry.set(name, { name, schedule, timezone, runOnStart, handler, task: null, current: null });
}

/** Run a job once with overlap protection and error isolation. Never rejects. */
export async function runJobNow(name) {
  const job = registry.get(name);
  if (!job) throw new Error(`Unknown job "${name}"`);
  if (job.current) {
    logger.warn({ job: name }, 'Skipping job run: previous run still in progress');
    return;
  }

  job.current = (async () => {
    const lease = await acquireDistributedLease(name);
    if (!lease) {
      logger.info({ job: name }, 'Skipping job run: another instance holds the lease');
      return;
    }
    const startedAt = Date.now();
    try {
      await job.handler();
      logger.info({ job: name, durationMs: Date.now() - startedAt }, 'Job completed');
    } catch (err) {
      logger.error({ err, job: name }, 'Job failed');
    } finally {
      lease.stopRenewal();
      await lease.release();
    }
  })();

  try {
    await job.current;
  } finally {
    job.current = null;
  }
}

/** Register the application's jobs (reminders, weekly report, recovery). Safe to call repeatedly. */
export function registerAllJobs() {
  for (const job of [reminderJob, weeklyReportJob, recoveryJob]) {
    if (!registry.has(job.name)) registerJob(job);
  }
}

/** Start every cron schedule; jobs flagged `runOnStart` also run once immediately (missed-run check). */
export function startScheduler() {
  if (!config.jobs.enabled) {
    logger.info('Scheduler is disabled by ENABLE_JOBS=false');
    return;
  }
  registerAllJobs();
  for (const job of registry.values()) {
    if (job.task) continue;
    job.task = cron.schedule(job.schedule, () => runJobNow(job.name), { timezone: job.timezone });
    if (job.runOnStart) setImmediate(() => runJobNow(job.name));
  }
  logger.info({ jobs: [...registry.keys()] }, 'Scheduler started');
}

/** Stop all schedules and wait up to `timeoutMs` for runs that are still executing. */
export async function stopScheduler(timeoutMs = 5000) {
  const running = [];
  for (const job of registry.values()) {
    job.task?.stop();
    job.task = null;
    if (job.current) running.push(job.current);
  }
  if (running.length === 0) return;

  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(resolve, timeoutMs);
  });
  await Promise.race([Promise.allSettled(running), timeout]);
  clearTimeout(timer);
}

export function listJobs() {
  return [...registry.values()].map(({ name, schedule, timezone }) => ({
    name,
    schedule,
    timezone,
  }));
}
