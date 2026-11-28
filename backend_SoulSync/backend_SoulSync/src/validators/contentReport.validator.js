import { z } from 'zod';
import { CONTENT_REPORT_STATUSES } from '../config/constants.js';
import { objectIdSchema, paginationQuery, trimmed } from './common.validator.js';

export const createContentReportBody = z.object({
  resourceId: objectIdSchema,
  reason: trimmed(3, 500),
});

export const listContentReportsQuery = paginationQuery.extend({
  status: z.enum(CONTENT_REPORT_STATUSES).optional(),
});

export const reviewContentReportBody = z.object({ action: z.enum(['dismiss', 'unpublish']) });
