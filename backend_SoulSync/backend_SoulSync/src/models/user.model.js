import mongoose from 'mongoose';
import { config } from '../config/index.js';
import { ROLES, ROLE_VALUES, USER_STATUS, USER_STATUS_VALUES } from '../config/constants.js';
import { isValidTimeOfDay, isValidTimezone } from '../utils/date.js';

const timeField = (defaultValue) => ({
  type: String,
  default: defaultValue,
  validate: { validator: isValidTimeOfDay, message: '{PATH} must be a time in HH:mm format' },
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    /** bcrypt hash. `select: false` keeps it out of every query unless explicitly requested. */
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLE_VALUES, default: ROLES.USER },
    status: { type: String, enum: USER_STATUS_VALUES, default: USER_STATUS.ACTIVE },
    timezone: {
      type: String,
      default: () => config.defaultTimezone,
      validate: { validator: isValidTimezone, message: 'timezone must be a valid IANA zone' },
    },
    reminderPrefs: {
      daily: { enabled: { type: Boolean, default: true }, time: timeField('20:00') },
      goal: { enabled: { type: Boolean, default: true }, time: timeField('09:00') },
      weekly: { enabled: { type: Boolean, default: true } },
      emailEnabled: { type: Boolean, default: false },
    },
    goalsOfInterest: {
      type: [{ type: String, trim: true, maxlength: 60 }],
      default: [],
      validate: { validator: (v) => v.length <= 10, message: 'at most 10 goals of interest' },
    },
    /** Explicit consent for sending selected wellness data to the external AI provider. Off by default. */
    aiConsent: { type: Boolean, default: false },
    aiConsentAt: { type: Date, default: null },
    emailVerifiedAt: { type: Date, default: null },
    emailVerificationTokenHash: { type: String, select: false, default: null },
    emailVerificationExpiresAt: { type: Date, select: false, default: null },
    passwordResetTokenHash: { type: String, select: false, default: null },
    passwordResetExpiresAt: { type: Date, select: false, default: null },
    onboardingDone: { type: Boolean, default: false },
    /** Sessions issued before this instant are rejected (set on password change). */
    passwordChangedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.index({ role: 1, status: 1 });
userSchema.index({ name: 1 });

export const User = mongoose.model('User', userSchema);
