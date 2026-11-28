import { z } from 'zod';
import { AI_LIMITS } from '../config/constants.js';
import {
  dateKeySchema,
  objectIdSchema,
  paginationQuery,
  timeOfDaySchema,
} from './common.validator.js';

export const chatBody = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'is required')
    .max(
      AI_LIMITS.MAX_CHAT_MESSAGE_LENGTH,
      `must be at most ${AI_LIMITS.MAX_CHAT_MESSAGE_LENGTH} characters`,
    ),
  conversationId: objectIdSchema.optional(),
});

export const routineBody = z.object({
  preferences: z.string().trim().max(500).optional(),
  availableMinutes: z.number().int().min(10).max(960).optional(),
  wakeTime: timeOfDaySchema.optional(),
  sleepTime: timeOfDaySchema.optional(),
});

export const weeklySummaryBody = z.object({ weekStart: dateKeySchema.optional() });

export const listConversationsQuery = paginationQuery;
