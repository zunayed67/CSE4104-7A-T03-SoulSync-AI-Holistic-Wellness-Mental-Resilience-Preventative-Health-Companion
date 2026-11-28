/** Static, non-secret application constants. Environment-driven values live in config/index.js. */

export const API_PREFIX = '/api/v1';

export const ROLES = Object.freeze({ USER: 'user', ADMIN: 'admin' });
export const ROLE_VALUES = Object.freeze(Object.values(ROLES));

export const AUTH_COOKIE_NAME = 'soulsync_token';

/**
 * Inclusive bounds for the daily wellness metrics. Field names and ranges follow the ER diagram
 * and SRS FR-14 (mood 1-5, stress 1-10, sleep 0-24 h, energy 1-5).
 */
export const METRIC_RANGES = Object.freeze({
  mood: Object.freeze({ min: 1, max: 5, integer: true }),
  stressLevel: Object.freeze({ min: 1, max: 10, integer: true }),
  sleepHours: Object.freeze({ min: 0, max: 24, integer: false }),
  waterIntakeMl: Object.freeze({ min: 0, max: 10000, integer: true }),
  activityMinutes: Object.freeze({ min: 0, max: 1440, integer: true }),
  energyLevel: Object.freeze({ min: 1, max: 5, integer: true }),
});
export const METRIC_KEYS = Object.freeze(Object.keys(METRIC_RANGES));

export const PAGINATION = Object.freeze({ DEFAULT_LIMIT: 20, MAX_LIMIT: 100 });

/** Request body size cap; wellness and journal payloads are small. */
export const BODY_LIMIT = '100kb';

/** Fixed limits for the AI layer. Per-user daily quota and timeout come from env (config.ai). */
export const AI_LIMITS = Object.freeze({
  MAX_CHAT_MESSAGE_LENGTH: 1000,
  MAX_HISTORY_MESSAGES: 10,
  MAX_OUTPUT_TOKENS: 700,
  CONVERSATION_RETENTION_DAYS: 30,
});

/** Shown next to all AI-generated content. */
export const AI_DISCLAIMER =
  'SoulSync AI provides general wellness information only. It is not medical advice and does not ' +
  'diagnose, treat, or replace a doctor, counsellor, or other qualified professional. If you are in ' +
  'crisis or in immediate danger, contact your local emergency services right away.';

export const USER_STATUS = Object.freeze({ ACTIVE: 'active', SUSPENDED: 'suspended' });
export const USER_STATUS_VALUES = Object.freeze(Object.values(USER_STATUS));
export const GOAL_TYPES = Object.freeze(['daily', 'weekly']);
export const GOAL_STATUSES = Object.freeze(['active', 'done', 'missed']);
export const NOTIFICATION_TYPES = Object.freeze(['reminder', 'goal', 'report', 'system']);
export const RESOURCE_TYPES = Object.freeze(['article', 'breathing']);
export const CONTENT_REPORT_STATUSES = Object.freeze(['open', 'reviewed', 'dismissed']);
export const JOURNAL_TYPES = Object.freeze(['entry', 'reflection', 'checkin']);

/** Longest date range the analytics endpoints will serve (NFR-03 targets 90 days). */
export const MAX_TREND_DAYS = 90;
/** Days of history used to compute the logging streak. */
export const STREAK_LOOKBACK_DAYS = 120;
/** Minimum recorded days before AI recommendations or summaries are worth generating. */
export const MIN_DAYS_FOR_RECOMMENDATIONS = 3;
