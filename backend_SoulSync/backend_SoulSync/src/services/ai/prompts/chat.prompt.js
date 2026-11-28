import { SYSTEM_PROMPT, wrapUntrusted } from './system.prompt.js';

/**
 * Build the chat request. `context` (recent minimised metrics and goals) is included only when the
 * user has given AI consent; `history` is already limited by conversation.service.
 *
 * @param {{ history: { role: 'user'|'assistant', content: string }[], message: string, context?: object | null }} input
 */
export function buildChatPrompt({ history, message, context }) {
  const contextBlock = context
    ? `\n\nThe user has agreed to share their recent tracked data. Use it only when relevant:\n${wrapUntrusted(
        'user_data',
        JSON.stringify(context),
      )}`
    : "\n\nNo tracked data is available for this conversation; do not guess about the user's habits.";

  return {
    system: `${SYSTEM_PROMPT}${contextBlock}`,
    messages: [
      ...history.map((m) => ({
        role: m.role,
        content: m.role === 'user' ? wrapUntrusted('user_message', m.content) : m.content,
      })),
      { role: 'user', content: wrapUntrusted('user_message', message) },
    ],
  };
}
