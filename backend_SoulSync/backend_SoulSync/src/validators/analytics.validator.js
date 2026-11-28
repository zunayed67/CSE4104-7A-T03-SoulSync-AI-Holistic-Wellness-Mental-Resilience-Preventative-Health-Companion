import { z } from 'zod';
import { dateKeySchema } from './common.validator.js';

/** week = last 7 days, month = last 30 days, custom = explicit from/to (max 90 days). */
export const trendsQuery = z
  .object({
    range: z.enum(['week', 'month', 'custom']).optional(),
    from: dateKeySchema.optional(),
    to: dateKeySchema.optional(),
  })
  .refine((q) => q.range !== 'custom' || Boolean(q.from), {
    message: 'A custom range needs "from"',
    path: ['from'],
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, '"from" must not be after "to"');
