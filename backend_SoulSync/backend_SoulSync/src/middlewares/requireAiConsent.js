import { AppError } from '../utils/AppError.js';

/**
 * Blocks any AI feature that processes wellness data unless the user has explicitly consented
 * (FR-30, NFR-12, UC "Verify AI Consent"). Mount after `authenticate`, which loads the current
 * consent flag from the database on every request, so withdrawing consent takes effect at once.
 */
export function requireAiConsent(req, _res, next) {
  if (!req.user?.aiConsent) {
    return next(
      new AppError(
        'Turn on AI consent in your privacy settings to use this feature. Your data is only shared with the AI provider after you agree.',
        403,
        'AI_CONSENT_REQUIRED',
      ),
    );
  }
  return next();
}
