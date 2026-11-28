import { z } from 'zod';
import { ROLE_VALUES, USER_STATUS_VALUES } from '../config/constants.js';
import { paginationQuery, trimmed } from './common.validator.js';

export const listUsersQuery = paginationQuery.extend({
  search: trimmed(1, 80).optional(),
  role: z.enum(ROLE_VALUES).optional(),
  status: z.enum(USER_STATUS_VALUES).optional(),
});

export const setUserStatusBody = z.object({ status: z.enum(USER_STATUS_VALUES) });
