import { createHash, randomBytes } from 'node:crypto';
import { USER_STATUS } from '../config/constants.js';
import { config } from '../config/index.js';
import { User } from '../models/user.model.js';
import { userRepository } from '../repositories/user.repository.js';
import { AppError } from '../utils/AppError.js';
import { signAuthToken } from '../utils/jwt.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import { sendEmail } from './email.service.js';
import { passwordResetEmail, verificationEmail } from './emailTemplates.js';
import { toPublicUser } from './user.service.js';

const hashToken = (token) => createHash('sha256').update(token).digest('hex');
const newToken = () => randomBytes(32).toString('base64url');
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 30 * 60 * 1000;

async function sendVerification(user) {
  const token = newToken();
  await userRepository.updateById(user._id, {
    $set: {
      emailVerificationTokenHash: hashToken(token),
      emailVerificationExpiresAt: new Date(Date.now() + VERIFY_TTL_MS),
    },
  });
  const mail = verificationEmail(token);
  return sendEmail({ to: user.email, ...mail });
}

/** New accounts always get the `user` role with AI consent off; privileged roles are never accepted from input. */
export async function register({ name, email, password, timezone }) {
  const passwordHash = await hashPassword(password);
  const emailVerifiedAt = config.email.enabled ? null : new Date();
  let user;
  try {
    user = await userRepository.create({
      name,
      email,
      passwordHash,
      emailVerifiedAt,
      ...(timezone && { timezone }),
    });
  } catch (err) {
    if (err?.code === 11000) {
      throw AppError.conflict('An account with this email already exists.', 'EMAIL_TAKEN');
    }
    throw err;
  }
  if (config.email.enabled) await sendVerification(user);
  return {
    user: toPublicUser(user),
    token: config.email.enabled ? null : signAuthToken({ userId: user._id, role: user.role }),
    verificationRequired: config.email.enabled,
  };
}

/**
 * Verify credentials. Unknown email and wrong password produce the same error (and take the same
 * time), so the response does not reveal which accounts exist. The suspended-account notice is
 * only shown after the password was proven correct.
 */
export async function login({ email, password }) {
  const user = await userRepository.findWithPassword({ email });
  const valid = await comparePassword(password, user?.passwordHash);
  if (!user || !valid) {
    throw AppError.unauthorized('Invalid email or password.', 'INVALID_CREDENTIALS');
  }
  if (user.status === USER_STATUS.SUSPENDED) {
    throw AppError.forbidden(
      'This account has been suspended. Please contact support.',
      'ACCOUNT_SUSPENDED',
    );
  }
  if (config.email.enabled && !user.emailVerifiedAt) {
    throw AppError.forbidden(
      'Verify your email address before signing in. You can request a new verification link.',
      'EMAIL_NOT_VERIFIED',
    );
  }
  return { user: toPublicUser(user), token: signAuthToken({ userId: user._id, role: user.role }) };
}

/** Generic response prevents email enumeration; delivery failures do not break auth routes. */
export async function resendVerification(email) {
  if (!config.email.enabled) return;
  const user = await userRepository.findByEmail(email);
  if (user && !user.emailVerifiedAt) await sendVerification(user);
}

export async function verifyEmail(token) {
  const user = await User.findOneAndUpdate(
    {
      emailVerificationTokenHash: hashToken(token),
      emailVerificationExpiresAt: { $gt: new Date() },
    },
    {
      $set: { emailVerifiedAt: new Date() },
      $unset: { emailVerificationTokenHash: 1, emailVerificationExpiresAt: 1 },
    },
    { new: true, runValidators: true },
  ).lean();
  if (!user) throw AppError.badRequest('This verification link is invalid or expired.', 'INVALID_VERIFICATION_TOKEN');
  return toPublicUser(user);
}

export async function requestPasswordReset(email) {
  if (!config.email.enabled) return;
  const user = await userRepository.findByEmail(email);
  if (!user || !user.emailVerifiedAt) return;
  const token = newToken();
  await userRepository.updateById(user._id, {
    $set: {
      passwordResetTokenHash: hashToken(token),
      passwordResetExpiresAt: new Date(Date.now() + RESET_TTL_MS),
    },
  });
  const mail = passwordResetEmail(token);
  await sendEmail({ to: user.email, ...mail });
}

export async function resetPassword(token, newPassword) {
  const passwordHash = await hashPassword(newPassword);
  const user = await User.findOneAndUpdate(
    {
      passwordResetTokenHash: hashToken(token),
      passwordResetExpiresAt: { $gt: new Date() },
    },
    {
      $set: { passwordHash, passwordChangedAt: new Date() },
      $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1 },
    },
    { new: true, runValidators: true },
  ).lean();
  if (!user) throw AppError.badRequest('This password reset link is invalid or expired.', 'INVALID_RESET_TOKEN');
  return true;
}
