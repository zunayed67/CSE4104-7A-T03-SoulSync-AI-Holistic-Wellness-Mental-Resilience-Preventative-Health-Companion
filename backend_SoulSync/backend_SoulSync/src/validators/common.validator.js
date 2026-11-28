import { z } from 'zod';
import { PAGINATION } from '../config/constants.js';
import { isValidDateKey, isValidTimeOfDay, isValidTimezone } from '../utils/date.js';

export const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'must be a valid id');
export const idParams = z.object({ id: objectIdSchema });

export const dateKeySchema = z
  .string()
  .refine(isValidDateKey, 'must be a valid date in YYYY-MM-DD format');
export const timeOfDaySchema = z
  .string()
  .refine(isValidTimeOfDay, 'must be a time in HH:mm format');
export const timezoneSchema = z
  .string()
  .refine(isValidTimezone, 'must be a valid IANA timezone (e.g. Asia/Dhaka)');

export const trimmed = (min, max) => z.string().trim().min(min).max(max);

/** Query-string booleans arrive as "true"/"false". */
export const booleanQuery = z.enum(['true', 'false']).transform((value) => value === 'true');

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT),
});

/** `{ page, limit }` -> `{ skip, limit }` for repositories. */
export function toSkipLimit({ page, limit }) {
  return { skip: (page - 1) * limit, limit };
}

/** PATCH bodies must change something. */
export const atLeastOneField = (value) => Object.values(value).some((v) => v !== undefined);
export const AT_LEAST_ONE_FIELD = 'Provide at least one field to update';
