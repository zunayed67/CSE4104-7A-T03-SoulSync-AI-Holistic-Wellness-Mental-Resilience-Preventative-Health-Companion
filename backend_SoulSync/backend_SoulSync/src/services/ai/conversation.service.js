import { AI_LIMITS } from '../../config/constants.js';
import { conversationRepository } from '../../repositories/conversation.repository.js';
import { AppError } from '../../utils/AppError.js';
import { serialize } from '../../utils/serialize.js';
import { truncate } from '../../utils/text.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Retention (FR-40): conversations expire `CONVERSATION_RETENTION_DAYS` after their last message. */
export function retentionDate(now = new Date()) {
  return new Date(now.getTime() + AI_LIMITS.CONVERSATION_RETENTION_DAYS * DAY_MS);
}

/** Continue an existing conversation (owner-checked) or start a new one titled from the first message. */
export async function startOrGet(userId, conversationId, firstMessage) {
  if (conversationId) {
    const existing = await conversationRepository.findOwned(userId, conversationId);
    if (!existing) throw AppError.notFound('Conversation not found', 'CONVERSATION_NOT_FOUND');
    return existing;
  }
  return conversationRepository.create({
    userId,
    title: truncate(firstMessage, 50),
    messages: [],
    expiresAt: retentionDate(),
  });
}

/**
 * The limited context sent to the provider: the newest unflagged messages, starting with a user
 * turn. Safety-intercepted messages are never replayed to the provider.
 */
export function buildHistory(conversation) {
  const clean = conversation.messages
    .filter((m) => !m.flagged)
    .slice(-AI_LIMITS.MAX_HISTORY_MESSAGES)
    .map(({ role, content }) => ({ role, content }));
  while (clean.length && clean[0].role !== 'user') clean.shift();
  return clean;
}

export function appendExchange(
  userId,
  conversationId,
  userText,
  assistantText,
  { flagged = false } = {},
) {
  const ts = new Date();
  return conversationRepository.appendMessages(
    userId,
    conversationId,
    [
      { role: 'user', content: userText, ts, flagged },
      { role: 'assistant', content: assistantText, ts: new Date(ts.getTime() + 1), flagged },
    ],
    { expiresAt: retentionDate(ts), safetyFlagged: flagged },
  );
}

export async function listConversations(userId, { skip, limit }) {
  const { items, total } = await conversationRepository.listOwned(userId, {
    sort: { updatedAt: -1 },
    skip,
    limit,
    select: 'title safetyFlagged expiresAt createdAt updatedAt',
  });
  return { items: serialize(items), total };
}

export async function getConversation(userId, id) {
  const conversation = await conversationRepository.findOwned(userId, id);
  if (!conversation) throw AppError.notFound('Conversation not found', 'CONVERSATION_NOT_FOUND');
  return serialize(conversation);
}

export async function deleteConversation(userId, id) {
  const deleted = await conversationRepository.deleteOwned(userId, id);
  if (!deleted) throw AppError.notFound('Conversation not found', 'CONVERSATION_NOT_FOUND');
}
