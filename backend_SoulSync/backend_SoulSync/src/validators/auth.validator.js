import { z } from 'zod';
import { timezoneSchema, trimmed } from './common.validator.js';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('must be a valid email address')
  .max(254);

/** Strength rules (FR-01). bcrypt only reads the first 72 bytes, so longer passwords are rejected. */
export const passwordSchema = z
  .string()
  .min(8, 'must be at least 8 characters')
  .max(128, 'must be at most 128 characters')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'must be at most 72 bytes')
  .refine(
    (value) => /[A-Za-z]/.test(value) && /\d/.test(value),
    'must contain a letter and a number',
  );

export const registerBody = z.object({
  name: trimmed(2, 80),
  email: emailSchema,
  password: passwordSchema,
  timezone: timezoneSchema.optional(),
});

export const loginBody = z.object({
  email: emailSchema,
  password: z.string().min(1, 'is required').max(200),
});

const oneTimeToken = z.string().min(20).max(200);
export const emailOnlyBody = z.object({ email: emailSchema });
export const verifyEmailBody = z.object({ token: oneTimeToken });
export const resetPasswordBody = z.object({ token: oneTimeToken, password: passwordSchema });
