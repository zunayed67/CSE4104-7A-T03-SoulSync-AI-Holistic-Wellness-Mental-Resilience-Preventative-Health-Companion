import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true, maxlength: 6000 },
    ts: { type: Date, default: Date.now },
    flagged: { type: Boolean, default: false },
  },
  { _id: false },
);

const conversationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, trim: true, maxlength: 80, default: 'New conversation' },
    messages: { type: [messageSchema], default: [] },
    safetyFlagged: { type: Boolean, default: false },
    /** Retention control (FR-40): MongoDB's TTL monitor deletes the conversation after this instant. */
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

conversationSchema.index({ userId: 1, updatedAt: -1 });
conversationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Conversation = mongoose.model('Conversation', conversationSchema);
