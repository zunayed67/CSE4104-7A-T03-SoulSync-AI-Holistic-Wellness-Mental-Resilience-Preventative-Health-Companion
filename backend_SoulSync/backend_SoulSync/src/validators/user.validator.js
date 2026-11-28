import { z } from 'zod';
import { passwordSchema } from './auth.validator.js';
import {
  AT_LEAST_ONE_FIELD,
  atLeastOneField,
  timeOfDaySchema,
  timezoneSchema,
  trimmed,
} from './common.validator.js';

const channel = z.object({ enabled: z.boolean().optional(), time: timeOfDaySchema.optional() });

/** Partial reminder preferences (FR-44): each reminder type can be toggled and given a time. */
const reminderPrefs = z
  .object({
    daily: channel.optional(),
    goal: channel.optional(),
    weekly: z.object({ enabled: z.boolean().optional() }).optional(),
    emailEnabled: z.boolean().optional(),
  })
  .refine(atLeastOneField, AT_LEAST_ONE_FIELD);

export const updateProfileBody = z
  .object({
    name: trimmed(2, 80).optional(),
    timezone: timezoneSchema.optional(),
    reminderPrefs: reminderPrefs.optional(),
    goalsOfInterest: z.array(trimmed(1, 60)).max(10).optional(),
    onboardingDone: z.boolean().optional(),
  })
  .refine(atLeastOneField, AT_LEAST_ONE_FIELD);

export const changePasswordBody = z.object({
  currentPassword: z.string().min(1, 'is required').max(200),
  newPassword: passwordSchema,
});

export const aiConsentBody = z.object({ consent: z.boolean() });

export const deleteAccountBody = z.object({ password: z.string().min(1, 'is required').max(200) });
