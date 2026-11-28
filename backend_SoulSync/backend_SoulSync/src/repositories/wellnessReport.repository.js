import { WellnessReport } from '../models/wellnessReport.model.js';
import { BaseRepository } from './base.repository.js';

class WellnessReportRepository extends BaseRepository {
  constructor() {
    super(WellnessReport);
  }

  findByWeek(userId, weekId) {
    return this.model.findOne({ userId, weekId }).lean();
  }

  /**
   * Create or refresh the report for a week. Idempotent on (userId, weekId): re-running only
   * refreshes the calculated fields and never touches an existing AI summary.
   */
  upsertForWeek(userId, weekId, data) {
    return this.model
      .findOneAndUpdate(
        { userId, weekId },
        { $set: data, $setOnInsert: { userId, weekId, generatedAt: new Date() } },
        { upsert: true, returnDocument: 'after', runValidators: true },
      )
      .lean();
  }

  setAiSummary(userId, weekId, aiSummary) {
    return this.model
      .findOneAndUpdate({ userId, weekId }, { $set: { aiSummary } }, { returnDocument: 'after' })
      .lean();
  }
}

export const wellnessReportRepository = new WellnessReportRepository();
