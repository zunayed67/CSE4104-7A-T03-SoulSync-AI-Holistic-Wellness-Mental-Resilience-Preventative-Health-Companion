import { booleanQuery, paginationQuery } from './common.validator.js';

export const listNotificationsQuery = paginationQuery.extend({
  unreadOnly: booleanQuery.optional(),
});
