import mongoose from 'mongoose';
import { CONTENT_REPORT_STATUSES } from '../config/constants.js';

const contentReportSchema = new mongoose.Schema(
  {
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    resourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource', required: true },
    reason: { type: String, required: true, trim: true, minlength: 3, maxlength: 500 },
    status: { type: String, enum: CONTENT_REPORT_STATUSES, default: 'open' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// A user can have only one OPEN report per resource (stops report spam).
contentReportSchema.index(
  { reporterId: 1, resourceId: 1 },
  { unique: true, partialFilterExpression: { status: 'open' } },
);
contentReportSchema.index({ status: 1, createdAt: -1 });

export const ContentReport = mongoose.model('ContentReport', contentReportSchema);
