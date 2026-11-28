import mongoose from 'mongoose';
import { RESOURCE_TYPES } from '../config/constants.js';

const resourceSchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 140 },
    type: { type: String, enum: RESOURCE_TYPES, required: true },
    category: { type: String, required: true, trim: true, lowercase: true, maxlength: 40 },
    content: { type: String, required: true, trim: true, maxlength: 20000 },
    /** Seconds per phase for breathing exercises; `holdAfter` is the pause after the exhale. */
    breathingPattern: {
      inhale: { type: Number, min: 1, max: 30 },
      hold: { type: Number, min: 0, max: 30 },
      exhale: { type: Number, min: 1, max: 30 },
      holdAfter: { type: Number, min: 0, max: 30 },
      cycles: { type: Number, min: 1, max: 60 },
    },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true },
);

resourceSchema.index({ isPublished: 1, type: 1, category: 1 });
resourceSchema.index({ title: 1, type: 1 });

export const Resource = mongoose.model('Resource', resourceSchema);
