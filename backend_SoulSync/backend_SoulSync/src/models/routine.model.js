import mongoose from 'mongoose';
import { isValidTimeOfDay } from '../utils/date.js';

const itemSchema = new mongoose.Schema(
  {
    time: {
      type: String,
      required: true,
      validate: { validator: isValidTimeOfDay, message: 'time must be HH:mm' },
    },
    activity: { type: String, required: true, trim: true, minlength: 2, maxlength: 160 },
  },
  { _id: false },
);

const routineSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    items: {
      type: [itemSchema],
      validate: {
        validator: (v) => v.length >= 1 && v.length <= 20,
        message: 'a routine needs between 1 and 20 items',
      },
    },
    isActive: { type: Boolean, default: false },
    savedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true },
);

routineSchema.index({ userId: 1, savedAt: -1 });

export const Routine = mongoose.model('Routine', routineSchema);
