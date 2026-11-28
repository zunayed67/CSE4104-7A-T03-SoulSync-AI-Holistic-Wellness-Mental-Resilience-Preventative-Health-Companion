import { ContentReport } from '../models/contentReport.model.js';

export const contentReportRepository = {
  create(data) {
    return ContentReport.create(data).then((doc) => doc.toObject());
  },

  findById(id) {
    return ContentReport.findById(id).lean();
  },

  async list({ status, skip, limit }) {
    const filter = status ? { status } : {};
    const [items, total] = await Promise.all([
      ContentReport.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('resourceId', 'title type category isPublished')
        .lean(),
      ContentReport.countDocuments(filter),
    ]);
    return { items, total };
  },

  update(id, update) {
    return ContentReport.findByIdAndUpdate(id, update, { returnDocument: 'after' }).lean();
  },

  /** Close every open report for a resource (used when it is unpublished or deleted). */
  async resolveOpenForResource(resourceId, { status, reviewedBy }) {
    const result = await ContentReport.updateMany(
      { resourceId, status: 'open' },
      { $set: { status, reviewedBy, reviewedAt: new Date() } },
    );
    return result.modifiedCount;
  },

  async deleteByReporter(reporterId) {
    const result = await ContentReport.deleteMany({ reporterId });
    return result.deletedCount;
  },

  count(filter = {}) {
    return ContentReport.countDocuments(filter);
  },
};
