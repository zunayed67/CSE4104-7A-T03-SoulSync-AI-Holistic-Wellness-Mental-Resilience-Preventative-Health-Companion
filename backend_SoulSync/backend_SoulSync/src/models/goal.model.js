import mongoose from 'mongoose';
import { GOAL_STATUSES, GOAL_TYPES } from '../config/constants.js';

const goalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    type: { type: String, enum: GOAL_TYPES, required: true },
    targetValue: { type: Number, required: true, min: 0.01, max: 1_000_000 },
    /** Progress in the current period (today for daily goals, this ISO week for weekly goals). */
    currentValue: { type: Number, default: 0, min: 0 },
    unit: { type: String, trim: true, maxlength: 30, default: '' },
    status: { type: String, enum: GOAL_STATUSES, default: 'active' },
    deadline: { type: Date, default: null },
    /** Per-day progress; feeds completion rate and streak (FR-29). Oldest entries are trimmed. */
    history: {
      type: [
        new mongoose.Schema(
          { date: { type: Date, required: true }, value: { type: Number, required: true, min: 0 } },
          { _id: false },
        ),
      ],
      default: [],
    },
  },
  { timestamps: true },
);

goalSchema.index({ userId: 1, status: 1, createdAt: -1 });
goalSchema.index({ status: 1, deadline: 1 });

export const Goal = mongoose.model('Goal', goalSchema);
