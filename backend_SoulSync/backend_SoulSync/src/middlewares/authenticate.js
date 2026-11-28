import { AUTH_COOKIE_NAME, USER_STATUS } from '../config/constants.js';
import { userRepository } from '../repositories/user.repository.js';
import { AppError } from '../utils/AppError.js';
import { verifyAuthToken } from '../utils/jwt.js';

/**
 * Authentication (FR-07, NFR-06): the JWT is read ONLY from the HTTP-only cookie, never from
 * headers or query strings, so scripts cannot supply or read it. The account is re-loaded on every
 * request, so a suspended or deleted account, a changed role or a password change takes effect
 * immediately instead of when the token expires.
 *
 * On success `req.user = { id, role, name, email, timezone, aiConsent }` (role from the database).
 */
export async function authenticate(req, _res, next) {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (!token) throw AppError.unauthorized();

  const session = verifyAuthToken(token);
  const user = await userRepository.findForAuth(session.userId);
  if (!user) throw AppError.unauthorized('This account no longer exists.', 'INVALID_TOKEN');

  if (user.status === USER_STATUS.SUSPENDED) {
    throw AppError.forbidden(
      'This account has been suspended. Please contact support.',
      'ACCOUNT_SUSPENDED',
    );
  }
  if (
    user.passwordChangedAt &&
    session.issuedAt < Math.floor(user.passwordChangedAt.getTime() / 1000)
  ) {
    throw AppError.unauthorized('Your password changed. Please log in again.', 'SESSION_REVOKED');
  }

  req.user = {
    id: String(user._id),
    role: user.role,
    name: user.name,
    email: user.email,
    timezone: user.timezone,
    aiConsent: user.aiConsent,
  };
  next();
}
