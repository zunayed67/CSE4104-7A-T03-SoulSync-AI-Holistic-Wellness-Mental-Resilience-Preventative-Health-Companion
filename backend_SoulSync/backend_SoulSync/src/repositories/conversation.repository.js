import { Conversation } from '../models/conversation.model.js';
import { BaseRepository } from './base.repository.js';

const MAX_STORED_MESSAGES = 100;

class ConversationRepository extends BaseRepository {
  constructor() {
    super(Conversation);
  }

  /** Append messages, keep only the newest MAX_STORED_MESSAGES and push the retention date out. */
  appendMessages(userId, id, messages, { expiresAt, safetyFlagged = false }) {
    const update = {
      $push: { messages: { $each: messages, $slice: -MAX_STORED_MESSAGES } },
      $set: { expiresAt },
    };
    if (safetyFlagged) update.$set.safetyFlagged = true;
    return this.model
      .findOneAndUpdate(this.ownedFilter(userId, id), update, { returnDocument: 'after' })
      .lean();
  }
}

export const conversationRepository = new ConversationRepository();
