import { ROLES } from '../config/constants.js';
import { userRepository } from '../repositories/user.repository.js';
import { wellnessLogRepository } from '../repositories/wellnessLog.repository.js';
import { journalEntryRepository } from '../repositories/journalEntry.repository.js';
import { goalRepository } from '../repositories/goal.repository.js';
import { conversationRepository } from '../repositories/conversation.repository.js';
import { routineRepository } from '../repositories/routine.repository.js';
import { notificationRepository } from '../repositories/notification.repository.js';
import { wellnessReportRepository } from '../repositories/wellnessReport.repository.js';
import { aiUsageRepository } from '../repositories/aiUsage.repository.js';
import { contentReportRepository } from '../repositories/contentReport.repository.js';
import { AppError } from '../utils/AppError.js';
import { comparePassword, hashPassword } from '../utils/password.js';

/** The only shape in which a user ever leaves the API: no hash, no internals. */
export function toPublicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    emailVerified: Boolean(user.emailVerifiedAt),
    role: user.role,
    status: user.status,
    timezone: user.timezone,
    reminderPrefs: user.reminderPrefs,
    goalsOfInterest: user.goalsOfInterest ?? [],
    aiConsent: user.aiConsent,
    aiConsentAt: user.aiConsentAt,
    onboardingDone: user.onboardingDone,
    createdAt: user.createdAt,
  };
}

/** { a: { b: 1 } } -> { 'prefix.a.b': 1 } so partial nested updates do not wipe sibling fields. */
function flatten(prefix, value, out = {}) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, inner] of Object.entries(value)) flatten(`${prefix}.${key}`, inner, out);
  } else {
    out[prefix] = value;
  }
  return out;
}

export async function getProfile(userId) {
  const user = await userRepository.findById(userId);
  if (!user) throw AppError.notFound('User not found', 'USER_NOT_FOUND');
  return toPublicUser(user);
}

/** @param {{ name?: string, timezone?: string, reminderPrefs?: object, goalsOfInterest?: string[], onboardingDone?: boolean }} input */
export async function updateProfile(userId, input) {
  const $set = {};
  for (const key of ['name', 'timezone', 'goalsOfInterest', 'onboardingDone']) {
    if (input[key] !== undefined) $set[key] = input[key];
  }
  if (input.reminderPrefs) flatten('reminderPrefs', input.reminderPrefs, $set);

  const user = await userRepository.updateById(userId, { $set });
  if (!user) throw AppError.notFound('User not found', 'USER_NOT_FOUND');
  return toPublicUser(user);
}

/**
 * Change the password after confirming the current one (FR-06). `passwordChangedAt` invalidates
 * every session issued earlier; the controller then issues a fresh cookie for this device.
 */
export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await userRepository.findWithPassword({ _id: userId });
  if (!user) throw AppError.notFound('User not found', 'USER_NOT_FOUND');

  if (!(await comparePassword(currentPassword, user.passwordHash))) {
    throw AppError.badRequest('The current password is incorrect.', 'INVALID_CURRENT_PASSWORD');
  }
  if (currentPassword === newPassword) {
    throw AppError.badRequest(
      'Choose a password different from your current one.',
      'PASSWORD_UNCHANGED',
    );
  }

  const passwordHash = await hashPassword(newPassword);
  const updated = await userRepository.updateById(userId, {
    $set: { passwordHash, passwordChangedAt: new Date() },
  });
  return toPublicUser(updated);
}

/** Grant or withdraw consent for sending wellness data to the AI provider (FR-30). Timestamped on every change. */
export async function setAiConsent(userId, consent) {
  const user = await userRepository.updateById(userId, {
    $set: { aiConsent: consent, aiConsentAt: new Date() },
  });
  if (!user) throw AppError.notFound('User not found', 'USER_NOT_FOUND');
  return toPublicUser(user);
}

/**
 * Permanently remove a user and everything they own (FR-08, NFR-14). Used by self-service
 * deletion and by admin deletion. Refuses to remove the last active administrator.
 */
export async function deleteUserAndData(user) {
  const userId = user._id ?? user.id;
  if (user.role === ROLES.ADMIN && (await userRepository.countAdmins()) <= 1) {
    throw AppError.conflict('The last administrator account cannot be deleted.', 'LAST_ADMIN');
  }
  await Promise.all([
    wellnessLogRepository.deleteAllForOwner(userId),
    journalEntryRepository.deleteAllForOwner(userId),
    goalRepository.deleteAllForOwner(userId),
    conversationRepository.deleteAllForOwner(userId),
    routineRepository.deleteAllForOwner(userId),
    notificationRepository.deleteAllForOwner(userId),
    wellnessReportRepository.deleteAllForOwner(userId),
    aiUsageRepository.deleteAllForOwner(userId),
    contentReportRepository.deleteByReporter(userId),
  ]);
  await userRepository.deleteById(userId);
}

/** Self-service deletion, confirmed with the account password (UC-17). */
export async function deleteAccount(userId, password) {
  const user = await userRepository.findWithPassword({ _id: userId });
  if (!user) throw AppError.notFound('User not found', 'USER_NOT_FOUND');
  if (!(await comparePassword(password, user.passwordHash))) {
    throw AppError.badRequest(
      'The password is incorrect. Your account was not deleted.',
      'INVALID_PASSWORD',
    );
  }
  await deleteUserAndData(user);
}
