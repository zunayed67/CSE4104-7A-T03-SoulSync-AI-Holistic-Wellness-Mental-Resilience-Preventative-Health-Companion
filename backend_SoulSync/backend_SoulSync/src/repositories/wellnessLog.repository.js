import { WellnessLog } from '../models/wellnessLog.model.js';
import { BaseRepository } from './base.repository.js';

class WellnessLogRepository extends BaseRepository {
  constructor() {
    super(WellnessLog);
  }

  findByDate(userId, date) {
    return this.model.findOne({ userId, date }).lean();
  }

  async existsForDate(userId, date) {
    return (await this.model.exists({ userId, date })) !== null;
  }

  /** All logs between two day stamps (inclusive), oldest first. Used by analytics and reports. */
  listRange(userId, from, to) {
    return this.model
      .find({ userId, date: { $gte: from, $lte: to } })
      .sort({ date: 1 })
      .lean();
  }

  /** Only the day stamps (cheap) for streak calculation. */
  async listDates(userId, from, to) {
    const rows = await this.model
      .find({ userId, date: { $gte: from, $lte: to } }, { date: 1, _id: 0 })
      .lean();
    return rows.map((row) => row.date);
  }

  async latest(userId, from, to) {
    return this.model
      .findOne({ userId, date: { $gte: from, $lte: to } })
      .sort({ date: -1 })
      .lean();
  }
}

export const wellnessLogRepository = new WellnessLogRepository();
