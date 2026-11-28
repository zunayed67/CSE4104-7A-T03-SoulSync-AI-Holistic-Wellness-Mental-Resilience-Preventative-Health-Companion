import { z } from 'zod';
import { SYSTEM_PROMPT, extractJsonObject, wrapUntrusted } from './system.prompt.js';
import { isTextSafe } from '../safety/outputValidator.js';
import { AppError } from '../../../utils/AppError.js';

const itemSchema = z.object({
  title: z.string().trim().min(3).max(80),
  action: z.string().trim().min(5).max(200),
  why: z.string().trim().min(5).max(240),
});
const outputSchema = z.object({ recommendations: z.array(itemSchema).min(1).max(6) });

/** @param {{ recentDays: object[], goals: object[] }} data minimised, consented data */
export function buildRecommendationPrompt(data) {
  return {
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Using only the tracked data below, suggest 3 to 5 small, realistic habits the user could try this week.
Mention patterns only as associations. Do not diagnose or mention medication.
Return ONLY a JSON object in exactly this form, with no other text:
{"recommendations":[{"title":"short name, max 60 characters","action":"one concrete step, max 140 characters","why":"the association in the data that motivates it, max 160 characters"}]}

${wrapUntrusted('user_data', JSON.stringify(data))}`,
      },
    ],
  };
}

/**
 * Validate the model's JSON and drop any item whose text the output filter rejects.
 * @returns {{ title: string, action: string, why: string }[]}
 */
export function parseRecommendationOutput(text) {
  const parsed = outputSchema.safeParse(extractJsonObject(text));
  if (!parsed.success) {
    throw new AppError(
      'The AI assistant returned an unexpected answer. Please try again.',
      502,
      'AI_BAD_RESPONSE',
    );
  }
  const safe = parsed.data.recommendations.filter((item) =>
    isTextSafe(`${item.title}. ${item.action}. ${item.why}`),
  );
  if (safe.length === 0) {
    throw new AppError(
      'The AI assistant could not produce safe suggestions. Please try again.',
      502,
      'AI_BAD_RESPONSE',
    );
  }
  return safe;
}
