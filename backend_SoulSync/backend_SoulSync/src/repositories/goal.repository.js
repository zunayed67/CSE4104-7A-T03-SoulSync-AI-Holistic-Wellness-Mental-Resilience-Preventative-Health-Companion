import { Goal } from '../models/goal.model.js';
import { BaseRepository } from './base.repository.js';

class GoalRepository extends BaseRepository {
  constructor() {
    super(Goal);
  }

  listActive(userId, limit = 50) {
    return this.model
      .find({ userId, status: 'active' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  /** Active goals whose deadline falls in [from, to] (day stamps). */
  listDueBetween(userId, from, to) {
    return this.model
      .find({ userId, status: 'active', deadline: { $gte: from, $lte: to } })
      .sort({ deadline: 1 })
      .lean();
  }

  /** Mark active goals whose deadline day has passed as missed. Returns how many changed. */
  async markOverdueMissed(beforeDayStamp) {
    const result = await this.model.updateMany(
      { status: 'active', deadline: { $lt: beforeDayStamp } },
      { $set: { status: 'missed' } },
    );
    return result.modifiedCount;
  }
}

export const goalRepository = new GoalRepository();
