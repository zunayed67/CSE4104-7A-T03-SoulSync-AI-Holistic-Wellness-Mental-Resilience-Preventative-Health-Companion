import { SYSTEM_PROMPT, wrapUntrusted } from './system.prompt.js';

/** @param {object} report minimised weekly report (dataMinimizer.minimizeReport) */
export function buildWeeklySummaryPrompt(report) {
  return {
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Write a plain-language weekly summary of 120 to 180 words for the user from the statistics below.
Cover: overall progress, one or two patterns (as associations only), the days with no record, and two or three small next steps.
Use only the numbers provided; do not recalculate or invent any. Write in the second person, in short paragraphs, with no headings or lists.

${wrapUntrusted('user_data', JSON.stringify(report))}`,
      },
    ],
  };
}
