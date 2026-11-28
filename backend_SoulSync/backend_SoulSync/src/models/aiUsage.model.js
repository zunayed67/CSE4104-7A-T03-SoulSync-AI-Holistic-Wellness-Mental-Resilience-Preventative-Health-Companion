import mongoose from 'mongoose';

const aiUsageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    /** Calendar day (YYYY-MM-DD) in the user's timezone: the quota window. */
    dateKey: { type: String, required: true },
    count: { type: Number, default: 0, min: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

aiUsageSchema.index({ userId: 1, dateKey: 1 }, { unique: true });
aiUsageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AiUsage = mongoose.model('AiUsage', aiUsageSchema);
