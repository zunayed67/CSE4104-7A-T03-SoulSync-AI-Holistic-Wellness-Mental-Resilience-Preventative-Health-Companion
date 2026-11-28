import { z } from 'zod';
import { METRIC_KEYS, METRIC_RANGES } from '../config/constants.js';
import {
  AT_LEAST_ONE_FIELD,
  atLeastOneField,
  dateKeySchema,
  idParams,
  paginationQuery,
} from './common.validator.js';

/** One metric, bounded by METRIC_RANGES (FR-14). */
function metric(key) {
  const { min, max, integer } = METRIC_RANGES[key];
  let schema = z.number({ message: 'must be a number' });
  if (integer) schema = schema.int('must be a whole number');
  return schema
    .min(min, `must be between ${min} and ${max}`)
    .max(max, `must be between ${min} and ${max}`);
}

const metricFields = Object.fromEntries(METRIC_KEYS.map((key) => [key, metric(key)]));
const optionalMetrics = Object.fromEntries(
  METRIC_KEYS.map((key) => [key, metricFields[key].optional()]),
);
const nullableMetrics = Object.fromEntries(
  METRIC_KEYS.map((key) => [key, metricFields[key].nullable().optional()]),
);

const hasMetric = (value) => METRIC_KEYS.some((key) => typeof value[key] === 'number');

export const createWellnessBody = z
  .object({ date: dateKeySchema.optional(), ...optionalMetrics })
  .refine(hasMetric, 'Provide at least one metric');

/** PATCH: `null` clears a metric. The record's date cannot change. */
export const updateWellnessBody = z
  .object(nullableMetrics)
  .refine(atLeastOneField, AT_LEAST_ONE_FIELD);

export const listWellnessQuery = paginationQuery
  .extend({ from: dateKeySchema.optional(), to: dateKeySchema.optional() })
  .refine((q) => !q.from || !q.to || q.from <= q.to, '"from" must not be after "to"');

export const wellnessIdParams = idParams;
export const wellnessDateParams = z.object({ date: dateKeySchema });
