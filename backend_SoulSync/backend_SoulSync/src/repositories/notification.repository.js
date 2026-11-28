import { Notification } from '../models/notification.model.js';
import { BaseRepository } from './base.repository.js';

class NotificationRepository extends BaseRepository {
  constructor() {
    super(Notification);
  }

  /**
   * Insert a notification unless one with the same (userId, dedupeKey) exists.
   * Atomic (a single upsert), so concurrent job runs cannot create duplicates.
   * @returns {Promise<boolean>} true if a new notification was created
   */
  async createIfAbsent(userId, { dedupeKey, ...data }) {
    const result = await this.model.updateOne(
      { userId, dedupeKey },
      { $setOnInsert: { ...data, userId, dedupeKey, isRead: false } },
      { upsert: true },
    );
    return result.upsertedCount === 1;
  }

  countUnread(userId) {
    return this.model.countDocuments({ userId, isRead: false });
  }

  markRead(userId, id) {
    return this.model
      .findOneAndUpdate(
        this.ownedFilter(userId, id),
        { $set: { isRead: true } },
        { returnDocument: 'after' },
      )
      .lean();
  }

  async markAllRead(userId) {
    const result = await this.model.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true } },
    );
    return result.modifiedCount;
  }
}

export const notificationRepository = new NotificationRepository();
