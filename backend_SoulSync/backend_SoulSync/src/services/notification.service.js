import { notificationRepository } from '../repositories/notification.repository.js';
import { AppError } from '../utils/AppError.js';
import { serialize } from '../utils/serialize.js';

/** In-app notification centre (FR-43): newest first, with unread counter. */
export async function listNotifications(user, { unreadOnly, skip, limit }) {
  const { items, total } = await notificationRepository.listOwned(user.id, {
    filter: unreadOnly ? { isRead: false } : {},
    skip,
    limit,
  });
  const unread = await notificationRepository.countUnread(user.id);
  return { items: serialize(items), total, unread };
}

export async function unreadCount(user) {
  return { unread: await notificationRepository.countUnread(user.id) };
}

export async function markRead(user, id) {
  const notification = await notificationRepository.markRead(user.id, id);
  if (!notification) throw AppError.notFound('Notification not found', 'NOTIFICATION_NOT_FOUND');
  return serialize(notification);
}

export async function markAllRead(user) {
  return { updated: await notificationRepository.markAllRead(user.id) };
}

/**
 * Create a notification exactly once per `dedupeKey` (reminders and report notices are retried by
 * jobs, and must never duplicate: NFR-20).
 * @returns {Promise<boolean>} whether a new notification was created
 */
export function notifyOnce(userId, { dedupeKey, type, title, message, goalId = null }) {
  return notificationRepository.createIfAbsent(userId, { dedupeKey, type, title, message, goalId });
}
