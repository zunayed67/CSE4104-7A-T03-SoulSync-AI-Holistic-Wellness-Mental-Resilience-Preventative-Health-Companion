import mongoose from 'mongoose';

const wellnessReportSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    /** ISO week id such as 2026-W46; with userId it makes report generation idempotent. */
    weekId: { type: String, required: true },
    weekStart: { type: Date, required: true },
    weekEnd: { type: Date, required: true },
    /** Application-calculated per-metric statistics. The AI never computes numbers. */
    metrics: { type: mongoose.Schema.Types.Mixed, default: {} },
    recordedDays: { type: Number, default: 0 },
    missingDays: { type: Number, default: 0 },
    missingDates: { type: [String], default: [] },
    aiSummary: { type: String, default: null, maxlength: 4000 },
    generatedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true },
);

wellnessReportSchema.index({ userId: 1, weekId: 1 }, { unique: true });
wellnessReportSchema.index({ userId: 1, weekStart: -1 });

export const WellnessReport = mongoose.model('WellnessReport', wellnessReportSchema);
