import { z } from 'zod';
import {
  AT_LEAST_ONE_FIELD,
  atLeastOneField,
  paginationQuery,
  timeOfDaySchema,
  trimmed,
} from './common.validator.js';

const item = z.object({ time: timeOfDaySchema, activity: trimmed(2, 160) });
const items = z.array(item).min(1).max(20);

export const createRoutineBody = z.object({
  title: trimmed(2, 100),
  items,
  isActive: z.boolean().optional().default(false),
});

export const updateRoutineBody = z
  .object({
    title: trimmed(2, 100).optional(),
    items: items.optional(),
    isActive: z.boolean().optional(),
  })
  .refine(atLeastOneField, AT_LEAST_ONE_FIELD);

export const listRoutinesQuery = paginationQuery;
