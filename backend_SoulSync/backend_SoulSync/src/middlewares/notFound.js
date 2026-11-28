import { AppError } from '../utils/AppError.js';

/** Terminal handler for unmatched routes; produces the standard 404 envelope. */
export function notFound(req, _res, next) {
  next(AppError.notFound(`Route ${req.method} ${req.path} not found`, 'ROUTE_NOT_FOUND'));
}
