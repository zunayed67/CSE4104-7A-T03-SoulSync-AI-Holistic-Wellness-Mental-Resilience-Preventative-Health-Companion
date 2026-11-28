import * as notificationService from '../services/notification.service.js';
import { sendPaginated, sendSuccess } from '../utils/apiResponse.js';
import { toSkipLimit } from '../validators/common.validator.js';

export async function list(req, res) {
  const { unreadOnly, page, limit } = req.validated.query;
  const { items, total, unread } = await notificationService.listNotifications(req.user, {
    unreadOnly,
    ...toSkipLimit({ page, limit }),
  });
  return sendPaginated(res, { items, total, page, limit, extraMeta: { unread } });
}

export async function unreadCount(req, res) {
  return sendSuccess(res, { data: await notificationService.unreadCount(req.user) });
}

export async function markRead(req, res) {
  return sendSuccess(res, {
    data: await notificationService.markRead(req.user, req.validated.params.id),
  });
}

export async function markAllRead(req, res) {
  return sendSuccess(res, {
    data: await notificationService.markAllRead(req.user),
    message: 'All notifications marked as read',
  });
}
