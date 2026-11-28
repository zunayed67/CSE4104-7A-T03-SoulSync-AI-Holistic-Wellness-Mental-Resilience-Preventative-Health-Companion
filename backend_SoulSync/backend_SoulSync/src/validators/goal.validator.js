import { z } from 'zod';
import { GOAL_STATUSES, GOAL_TYPES } from '../config/constants.js';
import {
  AT_LEAST_ONE_FIELD,
  atLeastOneField,
  dateKeySchema,
  paginationQuery,
  trimmed,
} from './common.validator.js';

const target = z.number().positive('must be greater than 0').max(1_000_000);

export const createGoalBody = z.object({
  title: trimmed(2, 120),
  type: z.enum(GOAL_TYPES),
  targetValue: target,
  unit: z.string().trim().max(30).optional().default(''),
  deadline: dateKeySchema.nullable().optional(),
});

export const updateGoalBody = z
  .object({
    title: trimmed(2, 120).optional(),
    type: z.enum(GOAL_TYPES).optional(),
    targetValue: target.optional(),
    unit: z.string().trim().max(30).optional(),
    deadline: dateKeySchema.nullable().optional(),
    // `missed` is set by the system when a deadline passes; users can only complete or reopen.
    status: z.enum(['active', 'done']).optional(),
  })
  .refine(atLeastOneField, AT_LEAST_ONE_FIELD);

/** Set the day's total with `value`, or add to it with `increment`: exactly one of the two. */
export const progressBody = z
  .object({
    value: z.number().min(0).max(1_000_000).optional(),
    increment: z.number().min(-1_000_000).max(1_000_000).optional(),
    date: dateKeySchema.optional(),
  })
  .refine((b) => (b.value === undefined) !== (b.increment === undefined), {
    message: 'Provide either "value" or "increment"',
  });

export const listGoalsQuery = paginationQuery.extend({ status: z.enum(GOAL_STATUSES).optional() });
