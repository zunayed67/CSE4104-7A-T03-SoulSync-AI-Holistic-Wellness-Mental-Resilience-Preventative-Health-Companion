import { AI_DISCLAIMER, MIN_DAYS_FOR_RECOMMENDATIONS } from '../../config/constants.js';
import { config } from '../../config/index.js';
import { logger } from '../../config/logger.js';
import { aiUsageRepository } from '../../repositories/aiUsage.repository.js';
import { goalRepository } from '../../repositories/goal.repository.js';
import { wellnessLogRepository } from '../../repositories/wellnessLog.repository.js';
import { wellnessReportRepository } from '../../repositories/wellnessReport.repository.js';
import { AppError } from '../../utils/AppError.js';
import { addDays, dateKeyToUtcDate, todayKey } from '../../utils/date.js';
import { listActiveWithProgress } from '../goal.service.js';
import { ensureReportRaw, presentReport } from '../report.service.js';
import * as conversations from './conversation.service.js';
import {
  assertMinimized,
  minimizeGoals,
  minimizeLogs,
  minimizeReport,
  minimizeRoutineInput,
} from './dataMinimizer.js';
import { buildChatPrompt } from './prompts/chat.prompt.js';
import {
  buildRecommendationPrompt,
  parseRecommendationOutput,
} from './prompts/recommendation.prompt.js';
import { buildRoutinePrompt, parseRoutineOutput } from './prompts/routine.prompt.js';
import { buildWeeklySummaryPrompt } from './prompts/weeklySummary.prompt.js';
import { getProvider } from './providers/provider.factory.js';
import { getSafetyResponse } from './safety/crisisResponse.js';
import { validateOutput } from './safety/outputValidator.js';
import { SAFETY_ACTIONS, runSafetyCheck } from './safety/safetyCheck.js';

/**
 * Orchestrates every AI feature. Order of operations for each request:
 *   1. rule-based safety check on user-typed text (no provider call if it intercepts);
 *   2. consent (enforced by requireAiConsent on the route) and the daily quota;
 *   3. data minimisation + assertMinimized on the payload;
 *   4. provider call with a timeout (quota is refunded if it fails);
 *   5. output validation/filtering, then persistence and the disclaimer.
 */

const QUOTA_RECORD_TTL_MS = 3 * 24 * 60 * 60 * 1000;

async function takeQuota(user) {
  const dateKey = todayKey(user.timezone);
  const limit = config.ai.dailyRequestLimit;
  const ok = await aiUsageRepository.tryConsume(
    user.id,
    dateKey,
    limit,
    new Date(Date.now() + QUOTA_RECORD_TTL_MS),
  );
  if (!ok) {
    throw new AppError(
      `You have reached today's AI limit of ${limit} requests. It resets tomorrow.`,
      429,
      'AI_QUOTA_EXCEEDED',
      { limit },
    );
  }
  return dateKey;
}

/** Run `fn` with one unit of quota; give it back if the provider call fails. */
async function withQuota(user, fn) {
  const dateKey = await takeQuota(user);
  try {
    return await fn();
  } catch (err) {
    await aiUsageRepository.release(user.id, dateKey).catch(() => {});
    throw err;
  }
}

async function callProvider(prompt, { json = false } = {}) {
  const provider = getProvider();
  const startedAt = Date.now();
  const result = await provider.generate({
    system: prompt.system,
    messages: prompt.messages,
    json,
  });
  logger.info(
    {
      provider: provider.name,
      durationMs: Date.now() - startedAt,
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
    },
    'AI request completed',
  );
  return result.text;
}

async function recentContext(user, days) {
  const today = todayKey(user.timezone);
  const [logs, goals] = await Promise.all([
    wellnessLogRepository.listRange(
      user.id,
      dateKeyToUtcDate(addDays(today, -(days - 1))),
      dateKeyToUtcDate(today),
    ),
    listActiveWithProgress(user, 5),
  ]);
  return { logs, goals };
}

/** Block free text that the safety check does not allow (used for routine preferences). */
function assertFreeTextAllowed(text) {
  if (!text) return;
  const check = runSafetyCheck(text);
  if (check.action === SAFETY_ACTIONS.ALLOW) return;
  if (check.action === SAFETY_ACTIONS.INVALID)
    throw AppError.badRequest(check.reason, 'INVALID_AI_INPUT');
  throw new AppError(getSafetyResponse(check.action), 422, 'AI_INPUT_NOT_SUPPORTED', {
    action: check.action,
  });
}

/* ------------------------------------------------------------------ chat (FR-31, UC-12) */

export async function chat(user, { message, conversationId }) {
  const text = message.trim();
  const check = runSafetyCheck(text);
  if (check.action === SAFETY_ACTIONS.INVALID) {
    throw AppError.badRequest(check.reason, 'INVALID_AI_INPUT');
  }

  const conversation = await conversations.startOrGet(user.id, conversationId, text);

  if (check.action !== SAFETY_ACTIONS.ALLOW) {
    const reply = getSafetyResponse(check.action);
    await conversations.appendExchange(user.id, conversation._id, text, reply, { flagged: true });
    return {
      conversationId: String(conversation._id),
      reply,
      disclaimer: AI_DISCLAIMER,
      safety: { action: check.action },
    };
  }

  const reply = await withQuota(user, async () => {
    let context = null;
    if (user.aiConsent) {
      const { logs, goals } = await recentContext(user, 7);
      if (logs.length || goals.length) {
        context = assertMinimized({ recentDays: minimizeLogs(logs), goals: minimizeGoals(goals) });
      }
    }
    const prompt = buildChatPrompt({
      history: conversations.buildHistory(conversation),
      message: text,
      context,
    });
    return validateOutput(await callProvider(prompt)).text;
  });

  await conversations.appendExchange(user.id, conversation._id, text, reply);
  return {
    conversationId: String(conversation._id),
    reply,
    disclaimer: AI_DISCLAIMER,
    safety: { action: SAFETY_ACTIONS.ALLOW },
  };
}

/* ------------------------------------------------- recommendations (FR-32, UC-13) */

export async function recommendations(user) {
  const { logs, goals } = await recentContext(user, 14);
  if (logs.length < MIN_DAYS_FOR_RECOMMENDATIONS) {
    throw AppError.badRequest(
      `Log at least ${MIN_DAYS_FOR_RECOMMENDATIONS} days of data to get personalised suggestions.`,
      'INSUFFICIENT_DATA',
    );
  }
  const payload = assertMinimized({ recentDays: minimizeLogs(logs), goals: minimizeGoals(goals) });

  const items = await withQuota(user, async () =>
    parseRecommendationOutput(
      await callProvider(buildRecommendationPrompt(payload), { json: true }),
    ),
  );
  return { recommendations: items, basedOnDays: logs.length, disclaimer: AI_DISCLAIMER };
}

/* ------------------------------------------------------------ routine (FR-33, UC-14) */

export async function routine(user, input) {
  assertFreeTextAllowed(input.preferences);
  const goals = await goalRepository.listActive(user.id, 5);
  const payload = assertMinimized(minimizeRoutineInput(input, goals));

  const draft = await withQuota(user, async () =>
    parseRoutineOutput(await callProvider(buildRoutinePrompt(payload), { json: true })),
  );
  return { routine: draft, saved: false, disclaimer: AI_DISCLAIMER };
}

/* ------------------------------------------------- weekly summary (FR-34, UC-15) */

async function summarizeReport(user, rawReport) {
  const payload = assertMinimized(minimizeReport(rawReport));
  const text = await withQuota(
    user,
    async () => validateOutput(await callProvider(buildWeeklySummaryPrompt(payload))).text,
  );
  return wellnessReportRepository.setAiSummary(user.id, rawReport.weekId, text);
}

export async function weeklySummary(user, { weekStart } = {}) {
  const report = await ensureReportRaw(user, weekStart);
  if (report.recordedDays < 1) {
    throw AppError.badRequest(
      'There is no data for that week yet, so there is nothing to summarise.',
      'INSUFFICIENT_DATA',
    );
  }
  const updated = await summarizeReport(user, report);
  return { report: presentReport(updated), disclaimer: AI_DISCLAIMER };
}

/**
 * Used by the weekly job: add an AI summary to a calculated report when the user consented, the
 * provider is configured and the quota allows. Never throws; on any problem the report simply
 * stays "metrics only" (UC-22 alternative flow).
 * @returns {Promise<boolean>} whether a summary was added
 */
export async function trySummarizeForJob(user, rawReport) {
  if (!user.aiConsent || !config.ai.isConfigured || rawReport.recordedDays < 1) return false;
  try {
    await summarizeReport(user, rawReport);
    return true;
  } catch (err) {
    logger.warn({ code: err?.code }, 'Weekly AI summary skipped');
    return false;
  }
}

/* ---------------------------------------------------------------------- usage info */

export async function getUsage(user) {
  const dateKey = todayKey(user.timezone);
  const used = await aiUsageRepository.getCount(user.id, dateKey);
  const limit = config.ai.dailyRequestLimit;
  return {
    date: dateKey,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    consent: Boolean(user.aiConsent),
  };
}
