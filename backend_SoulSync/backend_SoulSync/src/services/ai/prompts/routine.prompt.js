import { z } from 'zod';
import { SYSTEM_PROMPT, extractJsonObject, wrapUntrusted } from './system.prompt.js';
import { isTextSafe } from '../safety/outputValidator.js';
import { isValidTimeOfDay } from '../../../utils/date.js';
import { AppError } from '../../../utils/AppError.js';

const outputSchema = z.object({
  title: z.string().trim().min(2).max(100),
  items: z
    .array(
      z.object({
        time: z.string().refine(isValidTimeOfDay, 'time must be HH:mm'),
        activity: z.string().trim().min(2).max(160),
      }),
    )
    .min(3)
    .max(14),
});

/** @param {{ preferences: string, availableMinutes: number|null, wakeTime: string|null, sleepTime: string|null, goals: object[] }} input */
export function buildRoutinePrompt(input) {
  return {
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Draft a realistic one-day wellness routine for the user, based on their goals and preferences below.
Keep activities small and general (sleep, hydration, movement, breaks, breathing, planning, winding down). No medical advice, no supplements or medication.
Use 24-hour HH:mm times in ascending order, between the wake and sleep times when given, and respect the free time available.
Return ONLY a JSON object in exactly this form, with no other text:
{"title":"short routine name","items":[{"time":"07:30","activity":"what to do, max 120 characters"}]}

${wrapUntrusted('user_preferences', JSON.stringify(input))}`,
      },
    ],
  };
}

/** @returns {{ title: string, items: { time: string, activity: string }[] }} */
export function parseRoutineOutput(text) {
  const parsed = outputSchema.safeParse(extractJsonObject(text));
  if (!parsed.success) {
    throw new AppError(
      'The AI assistant returned an unexpected answer. Please try again.',
      502,
      'AI_BAD_RESPONSE',
    );
  }
  const { title, items } = parsed.data;
  const safeItems = items
    .filter((item) => isTextSafe(item.activity))
    .sort((a, b) => a.time.localeCompare(b.time));
  if (!isTextSafe(title) || safeItems.length < 3) {
    throw new AppError(
      'The AI assistant could not produce a safe routine. Please try again.',
      502,
      'AI_BAD_RESPONSE',
    );
  }
  return { title, items: safeItems };
}
