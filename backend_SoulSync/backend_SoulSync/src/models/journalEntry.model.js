import mongoose from 'mongoose';
import { JOURNAL_TYPES, METRIC_RANGES } from '../config/constants.js';

const journalEntrySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, trim: true, maxlength: 120, default: '' },
    /** Private text. Never sent to the AI provider and never logged. */
    content: { type: String, required: true, trim: true, minlength: 1, maxlength: 10000 },
    type: { type: String, enum: JOURNAL_TYPES, default: 'entry' },
    mood: { type: Number, min: METRIC_RANGES.mood.min, max: METRIC_RANGES.mood.max, default: null },
    tags: {
      type: [{ type: String, trim: true, lowercase: true, maxlength: 30 }],
      default: [],
      validate: { validator: (v) => v.length <= 10, message: 'at most 10 tags' },
    },
  },
  { timestamps: true },
);

journalEntrySchema.index({ userId: 1, createdAt: -1 });
journalEntrySchema.index({ userId: 1, tags: 1 });

export const JournalEntry = mongoose.model('JournalEntry', journalEntrySchema);
