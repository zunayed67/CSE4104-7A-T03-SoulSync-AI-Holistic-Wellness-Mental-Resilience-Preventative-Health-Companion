import mongoose from 'mongoose';
import { METRIC_KEYS, METRIC_RANGES } from '../config/constants.js';

const metric = (key) => {
  const { min, max, integer } = METRIC_RANGES[key];
  const field = { type: Number, default: null, min, max };
  if (integer) {
    field.validate = {
      validator: (v) => v === null || Number.isInteger(v),
      message: '{PATH} must be a whole number',
    };
  }
  return field;
};

const wellnessLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    /** Calendar day in the user's timezone, stored as 00:00 UTC (see utils/date.js). */
    date: { type: Date, required: true },
    mood: metric('mood'),
    stressLevel: metric('stressLevel'),
    sleepHours: metric('sleepHours'),
    waterIntakeMl: metric('waterIntakeMl'),
    activityMinutes: metric('activityMinutes'),
    energyLevel: metric('energyLevel'),
  },
  { timestamps: true },
);

// One record per user per day (FR-10); also serves every range query by user and date.
wellnessLogSchema.index({ userId: 1, date: 1 }, { unique: true });

wellnessLogSchema.pre('validate', function requireOneMetric() {
  if (METRIC_KEYS.every((key) => this[key] === null || this[key] === undefined)) {
    this.invalidate('mood', 'at least one metric is required');
  }
});

export const WellnessLog = mongoose.model('WellnessLog', wellnessLogSchema);
