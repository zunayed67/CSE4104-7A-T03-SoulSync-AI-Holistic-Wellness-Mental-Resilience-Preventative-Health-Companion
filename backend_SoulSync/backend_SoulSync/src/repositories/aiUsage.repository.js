import { AiUsage } from '../models/aiUsage.model.js';
import { BaseRepository } from './base.repository.js';

class AiUsageRepository extends BaseRepository {
  constructor() {
    super(AiUsage);
  }

  /**
   * Atomically take one unit of the user's daily AI quota.
   * The update only matches while `count < limit`; if the day's document exists and is full the
   * upsert tries to insert a duplicate (userId, dateKey) and fails with E11000, which means
   * "quota exhausted". No read-then-write race is possible.
   * @returns {Promise<boolean>} true if a unit was taken
   */
  async tryConsume(userId, dateKey, limit, expiresAt) {
    try {
      await this.model.updateOne(
        { userId, dateKey, count: { $lt: limit } },
        { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
        { upsert: true },
      );
      return true;
    } catch (err) {
      if (err?.code === 11000) return false;
      throw err;
    }
  }

  /** Give a unit back (used when the provider call failed, so the user is not charged). */
  async release(userId, dateKey) {
    await this.model.updateOne({ userId, dateKey, count: { $gt: 0 } }, { $inc: { count: -1 } });
  }

  async getCount(userId, dateKey) {
    const row = await this.model.findOne({ userId, dateKey }).lean();
    return row?.count ?? 0;
  }
}

export const aiUsageRepository = new AiUsageRepository();
