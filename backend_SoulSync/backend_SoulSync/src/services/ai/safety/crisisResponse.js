import { SAFETY_ACTIONS } from './safetyCheck.js';

/**
 * Canned replies for messages the safety check intercepts. They are shown instead of calling the
 * AI provider. SoulSync AI is never presented as a crisis service (NFR-30).
 */
export const CRISIS_RESPONSE =
  "I'm really sorry you're going through something this painful, and I'm glad you told me. " +
  'You deserve support from a real person right now. If you might act on these thoughts or you ' +
  'are in immediate danger, please contact your local emergency number now (in Bangladesh, call ' +
  '999) or go to the nearest emergency room. If you can, reach out to someone you trust, such as ' +
  "a friend, a family member, or your university's counselling or student support service, and " +
  'tell them how you are feeling. SoulSync AI is a wellness companion, not a crisis service, so I ' +
  "can't offer the help a trained professional can, but you do not have to go through this alone.";

export const MEDICAL_REDIRECT_RESPONSE =
  "That's a question for a qualified health professional. I can't diagnose conditions, " +
  'recommend or comment on medication, or suggest treatments. A doctor, pharmacist or counsellor ' +
  'can give you safe, personal advice. I am happy to help with everyday wellness habits instead, ' +
  'such as sleep routines, hydration, movement, stress-relief techniques or planning your day.';

export const INJECTION_REFUSAL_RESPONSE =
  'I can only help with general wellness topics such as sleep, hydration, movement, stress and ' +
  'daily routines, and I cannot change how I work. What would you like to talk about?';

/** @param {string} action One of SAFETY_ACTIONS (other than ALLOW). */
export function getSafetyResponse(action) {
  switch (action) {
    case SAFETY_ACTIONS.CRISIS:
      return CRISIS_RESPONSE;
    case SAFETY_ACTIONS.MEDICAL:
      return MEDICAL_REDIRECT_RESPONSE;
    case SAFETY_ACTIONS.INJECTION:
      return INJECTION_REFUSAL_RESPONSE;
    default:
      throw new Error(`No safety response for action "${action}"`);
  }
}
