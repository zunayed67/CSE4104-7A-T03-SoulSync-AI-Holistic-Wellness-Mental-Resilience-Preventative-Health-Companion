import { z } from 'zod';
import { JOURNAL_TYPES, METRIC_RANGES } from '../config/constants.js';
import {
  AT_LEAST_ONE_FIELD,
  atLeastOneField,
  dateKeySchema,
  paginationQuery,
  trimmed,
} from './common.validator.js';

const mood = z.number().int().min(METRIC_RANGES.mood.min).max(METRIC_RANGES.mood.max);
const tags = z.array(z.string().trim().toLowerCase().min(1).max(30)).max(10);
const type = z.enum(JOURNAL_TYPES);

export const createJournalBody = z.object({
  title: z.string().trim().max(120).optional().default(''),
  content: trimmed(1, 10000),
  type: type.optional().default('entry'),
  mood: mood.nullable().optional(),
  tags: tags.optional().default([]),
});

export const updateJournalBody = z
  .object({
    title: z.string().trim().max(120).optional(),
    content: trimmed(1, 10000).optional(),
    type: type.optional(),
    mood: mood.nullable().optional(),
    tags: tags.optional(),
  })
  .refine(atLeastOneField, AT_LEAST_ONE_FIELD);

export const listJournalQuery = paginationQuery
  .extend({
    type: type.optional(),
    tag: trimmed(1, 30).optional(),
    from: dateKeySchema.optional(),
    to: dateKeySchema.optional(),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, '"from" must not be after "to"');
