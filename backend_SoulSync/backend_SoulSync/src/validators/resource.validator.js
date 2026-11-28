import { z } from 'zod';
import { RESOURCE_TYPES } from '../config/constants.js';
import {
  AT_LEAST_ONE_FIELD,
  atLeastOneField,
  paginationQuery,
  trimmed,
} from './common.validator.js';

const seconds = (min, max) => z.number().int().min(min).max(max);

export const breathingPattern = z.object({
  inhale: seconds(1, 30),
  hold: seconds(0, 30).optional().default(0),
  exhale: seconds(1, 30),
  holdAfter: seconds(0, 30).optional().default(0),
  cycles: seconds(1, 60).optional().default(5),
});

const category = z.string().trim().toLowerCase().min(1).max(40);

export const listResourcesQuery = paginationQuery.extend({
  search: trimmed(1, 80).optional(),
  type: z.enum(RESOURCE_TYPES).optional(),
  category: category.optional(),
});

export const adminListResourcesQuery = listResourcesQuery;

export const createResourceBody = z
  .object({
    title: trimmed(3, 140),
    type: z.enum(RESOURCE_TYPES),
    category,
    content: trimmed(1, 20000),
    breathingPattern: breathingPattern.optional(),
    isPublished: z.boolean().optional().default(false),
  })
  .refine((r) => r.type !== 'breathing' || Boolean(r.breathingPattern), {
    message: 'Breathing exercises need a breathingPattern',
    path: ['breathingPattern'],
  });

export const updateResourceBody = z
  .object({
    title: trimmed(3, 140).optional(),
    type: z.enum(RESOURCE_TYPES).optional(),
    category: category.optional(),
    content: trimmed(1, 20000).optional(),
    breathingPattern: breathingPattern.optional(),
    isPublished: z.boolean().optional(),
  })
  .refine(atLeastOneField, AT_LEAST_ONE_FIELD);

export const publishBody = z.object({ isPublished: z.boolean() });
