/**
 * Filters AI output before it reaches the user (FR-37, NFR-29). Sentences that diagnose,
 * prescribe, give dosages, predict disease or claim clinical effectiveness are removed. If too
 * little remains, a safe fallback is returned instead.
 */
export const OUTPUT_FALLBACK =
  "I'm not able to give a useful answer to that safely. For health concerns, please speak to a " +
  'qualified professional. I can help with general habits like sleep, hydration, movement and ' +
  'stress relief if you would like.';

/** Always unsafe, whatever the surrounding words. */
const HARD_RULES = [
  /\byou\s+(?:probably\s+|likely\s+|may\s+|might\s+|seem\s+to\s+)?(?:have|are\s+suffering\s+from|suffer\s+from)\s+(?:a\s+|an\s+)?(?:clinical\s+)?(?:depression|anxiety\s+disorder|bipolar|adhd|ptsd|ocd|autism|diabetes|illness|disease|disorder|syndrome)\b/i,
  /\b(take|taking|start|increase|decrease|double|stop)\s+(about\s+)?\d+(\.\d+)?\s*(mg|milligrams?|mcg|micrograms?|ml|iu|pills?|tablets?|capsules?)\b/i,
  /\b(stop|quit|skip)\s+(taking\s+)?(your\s+)?(medication|meds|medicine|antidepressants?)\b/i,
  /\b(cures?|will\s+cure|guaranteed\s+to|clinically\s+(proven|effective|shown|tested)|proven\s+to\s+(treat|cure))\b/i,
  /\b(predict|predicts|prediction\s+of)\b.*\b(disease|illness|disorder|depression)\b/i,
  /\bhow\s+to\s+(kill|harm|hurt)\s+(yourself|oneself)\b/i,
];

/** Unsafe unless the sentence is clearly negated ("I can't diagnose", "this is not a diagnosis"). */
const SOFT_RULES = [/\b(diagnos(e|ed|is|ing)|prescrib(e|ed|ing)|prescription)\b/i];
const NEGATION = /\b(not|cannot|never|without|unable)\b|n't\b/i;

/** @returns {boolean} true if the text contains nothing the filter would remove. */
export function isTextSafe(text) {
  if (HARD_RULES.some((rule) => rule.test(text))) return false;
  if (SOFT_RULES.some((rule) => rule.test(text)) && !NEGATION.test(text)) return false;
  return true;
}

function splitSentences(line) {
  return line.match(/[^.!?]+[.!?]*\s*/g) ?? [line];
}

/** Cut at the last sentence end before `maxLength` (or hard-cut when there is none). */
function limitLength(text, maxLength) {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastEnd = Math.max(
    cut.lastIndexOf('. '),
    cut.lastIndexOf('! '),
    cut.lastIndexOf('? '),
    cut.lastIndexOf('\n'),
  );
  return (lastEnd > maxLength * 0.5 ? cut.slice(0, lastEnd + 1) : cut).trim();
}

/**
 * @param {unknown} rawText
 * @param {{ maxLength?: number }} [options]
 * @returns {{ ok: boolean, text: string, flagged: boolean, removed: number }}
 *   ok=false means the text was unusable and `text` is the safe fallback.
 */
export function validateOutput(rawText, { maxLength = 2500 } = {}) {
  if (typeof rawText !== 'string' || rawText.trim() === '') {
    return { ok: false, text: OUTPUT_FALLBACK, flagged: false, removed: 0 };
  }

  let removed = 0;
  const keptLines = [];
  for (const line of rawText.replace(/\r/g, '').split('\n')) {
    const kept = splitSentences(line).filter((sentence) => {
      const safe = isTextSafe(sentence);
      if (!safe) removed += 1;
      return safe;
    });
    const joined = kept.join('').trim();
    if (joined) keptLines.push(joined);
  }

  const text = limitLength(
    keptLines
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
    maxLength,
  );
  if (removed > 0 && text.length < 20) {
    return { ok: false, text: OUTPUT_FALLBACK, flagged: true, removed };
  }
  return { ok: text.length > 0, text: text || OUTPUT_FALLBACK, flagged: removed > 0, removed };
}
