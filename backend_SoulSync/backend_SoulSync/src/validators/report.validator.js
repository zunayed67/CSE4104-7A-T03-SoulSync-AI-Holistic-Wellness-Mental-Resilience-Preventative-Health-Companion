import { z } from 'zod';
import { dateKeySchema, paginationQuery } from './common.validator.js';

export const listReportsQuery = paginationQuery;

/** `weekStart` can be any date inside the wanted week; default is the current week. */
export const generateReportBody = z.object({ weekStart: dateKeySchema.optional() });
