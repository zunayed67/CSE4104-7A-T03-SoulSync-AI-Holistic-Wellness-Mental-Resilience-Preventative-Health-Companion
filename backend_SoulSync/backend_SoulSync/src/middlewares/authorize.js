import { ROLE_VALUES } from '../config/constants.js';
import { AppError } from '../utils/AppError.js';

/**
 * Role gate. Mount after `authenticate`, which sets `req.user = { id, role, ... }`.
 * Unknown role names throw when the route is defined, so a typo fails at startup, not in production.
 *
 * @param {...string} allowedRoles e.g. authorize(ROLES.ADMIN)
 * @returns {import('express').RequestHandler}
 */
export function authorize(...allowedRoles) {
  if (allowedRoles.length === 0) throw new TypeError('authorize() requires at least one role');
  const unknown = allowedRoles.filter((role) => !ROLE_VALUES.includes(role));
  if (unknown.length > 0)
    throw new TypeError(`authorize() received unknown role(s): ${unknown.join(', ')}`);

  return (req, _res, next) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!allowedRoles.includes(req.user.role)) return next(AppError.forbidden());
    return next();
  };
}
