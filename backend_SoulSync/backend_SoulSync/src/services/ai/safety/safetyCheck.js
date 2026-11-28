import { AI_LIMITS } from '../../../config/constants.js';

/**
 * Rule-based pre-call screening (FR-35, NFR-29/30). It runs BEFORE any text reaches the AI
 * provider and is deliberately simple and deterministic, so its behaviour can be unit-tested and
 * audited. Precedence: invalid input > crisis > medical > prompt injection > allow.
 * It errs on the side of caution: a false positive only means a safe canned reply.
 */
export const SAFETY_ACTIONS = Object.freeze({
  ALLOW: 'allow',
  CRISIS: 'crisis',
  MEDICAL: 'medical',
  INJECTION: 'injection',
  INVALID: 'invalid',
});

const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', $: 's', '@': 'a' };

/** Lowercase, strip accents and simple leetspeak, drop punctuation and collapse whitespace. */
export function normalizeForSafety(text) {
  return String(text)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/(?<=[a-z])[01345$@](?=[a-z])/g, (ch) => LEET[ch])
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const CRISIS_RULES = [
  [
    'self-harm-verb',
    /\b(kill|killing|hurt|hurting|harm|harming|cut|cutting|injure|injuring)\s+(my\s?self|myself)\b/,
  ],
  ['suicide-word', /\bsuicid(e|al)\b/],
  [
    'want-to-die',
    /\b(want|wanna|going|plan|planning|thinking of|thinking about|ready|decided)\s+(to\s+)?(die|end it all|end my life|end things|be dead)\b/,
  ],
  ['end-life', /\b(end|ending|take|taking)\s+(my|this)\s+(own\s+)?life\b/],
  ['dont-want-to-live', /\bdon'?t\s+want\s+to\s+(be\s+alive|live|exist|wake up)\b/],
  ['better-without-me', /\b(better|world)\s+(off\s+)?without\s+me\b/],
  ['no-reason-to-live', /\bno\s+(reason|point)\s+(to|in)\s+(live|living|go on|going on|be here)\b/],
  ['self-harm-phrase', /\bself\s?harm\b/],
  ['wish-dead', /\bwish\s+(i|that i)\s+(was|were)\s+dead\b/],
  ['overdose-intent', /\boverdos(e|ing)\s+(on purpose|myself|deliberately)\b/],
  ['cant-go-on', /\b(can'?t|cannot)\s+go\s+on\b/],
];

const MEDICAL_RULES = [
  ['diagnose-request', /\b(diagnos(e|is|ing)|prescrib(e|ed|ing)|prescription)\b/],
  [
    'do-i-have',
    /\bdo\s+i\s+have\s+(an?\s+)?(depression|anxiety|adhd|add|bipolar|ptsd|ocd|autism|diabetes|cancer|disorder|illness|disease|condition|syndrome)\b/,
  ],
  [
    'am-i-disordered',
    /\bam\s+i\s+(clinically\s+)?(depressed|bipolar|schizophrenic|psychotic|suicidal)\b/,
  ],
  [
    'medication-question',
    /\b(how\s+(much|many)|what|which)\b.*\b(mg|milligrams?|dosage|antidepressants?|medication|medicine|painkillers?|sleeping\s+pills?|pills|tablets|melatonin|ssri|xanax|valium|ibuprofen|paracetamol|antibiotics?)\b/,
  ],
  [
    'stop-medication',
    /\b(should|can|could)\s+i\s+(stop|quit|skip|change)\s+(taking\s+)?(my\s+)?(meds|medication|medicine|pills|antidepressants?)\b/,
  ],
  [
    'cure-treat-condition',
    /\b(cure|treat|treatment\s+for)\b.*\b(depression|anxiety|cancer|diabetes|adhd|bipolar|disorder|insomnia|ptsd)\b/,
  ],
  [
    'pretend-doctor',
    /\bpretend\s+(you\s+(are|re)|to\s+be)\s+(my\s+|a\s+)?(doctor|psychiatrist|physician|therapist)\b/,
  ],
];

const INJECTION_RULES = [
  [
    'ignore-instructions',
    /\b(ignore|disregard|forget|override|bypass)\s+(all\s+|any\s+|your\s+|the\s+)?(previous|prior|above|earlier|system|safety)?\s*(instructions?|rules?|prompts?|guidelines?|restrictions?|safeguards?)\b/,
  ],
  [
    'reveal-prompt',
    /\b(reveal|show|print|repeat|display|leak|tell me)\s+(me\s+)?(your|the)\s+(system\s+|hidden\s+|initial\s+)?(prompt|instructions?|rules)\b/,
  ],
  ['system-prompt', /\bsystem\s+prompt\b/],
  ['role-hijack', /\byou\s+are\s+now\b/],
  [
    'unrestricted-persona',
    /\bact\s+as\s+(if\s+you\s+(are|were)\s+)?(an?\s+)?(unrestricted|jailbroken|uncensored|dan|developer)\b/,
  ],
  ['jailbreak', /\b(jailbreak|developer\s+mode|do\s+anything\s+now)\b/],
];

/** Patterns run on the raw text: fake role markers and prompt delimiters. */
const RAW_INJECTION_RULES = [
  [
    'fake-role-tag',
    /<\/?\s*(system|assistant|user_message|user_data|user_preferences|instructions?)\s*>/i,
  ],
  ['fake-role-line', /^\s*(system|assistant)\s*:/im],
];

function firstMatch(rules, text) {
  return rules.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}

/**
 * @param {unknown} input Free text supplied by the user.
 * @returns {{ action: string, rule: string|null, reason?: string }}
 */
export function runSafetyCheck(input) {
  if (typeof input !== 'string' || input.trim() === '') {
    return { action: SAFETY_ACTIONS.INVALID, rule: 'empty', reason: 'Please enter a message.' };
  }
  if (input.length > AI_LIMITS.MAX_CHAT_MESSAGE_LENGTH) {
    return {
      action: SAFETY_ACTIONS.INVALID,
      rule: 'too-long',
      reason: `Messages can be at most ${AI_LIMITS.MAX_CHAT_MESSAGE_LENGTH} characters.`,
    };
  }

  const normalized = normalizeForSafety(input);

  const crisis = firstMatch(CRISIS_RULES, normalized);
  if (crisis) return { action: SAFETY_ACTIONS.CRISIS, rule: crisis };

  const medical = firstMatch(MEDICAL_RULES, normalized);
  if (medical) return { action: SAFETY_ACTIONS.MEDICAL, rule: medical };

  const injection =
    firstMatch(INJECTION_RULES, normalized) ?? firstMatch(RAW_INJECTION_RULES, input);
  if (injection) return { action: SAFETY_ACTIONS.INJECTION, rule: injection };

  return { action: SAFETY_ACTIONS.ALLOW, rule: null };
}
