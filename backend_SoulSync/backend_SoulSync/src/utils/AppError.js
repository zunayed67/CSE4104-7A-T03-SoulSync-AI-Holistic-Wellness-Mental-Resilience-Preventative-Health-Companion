/**
 * Operational error: a failure we expect and can describe to the client
 * (bad input, missing resource, auth failure...). The central error handler
 * turns these into the standard JSON error envelope. Anything that is NOT an
 * AppError is treated as a bug and reported as a generic 500.
 */
export class AppError extends Error {
  /**
   * @param {string} message Safe, client-facing message.
   * @param {number} [statusCode=500] HTTP status code.
   * @param {string} [code='INTERNAL_ERROR'] Stable machine-readable code.
   * @param {unknown} [details] Optional structured details (never raw user input).
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(message = 'Bad request', code = 'BAD_REQUEST', details) {
    return new AppError(message, 400, code, details);
  }

  static validation(message = 'Validation failed', details) {
    return new AppError(message, 400, 'VALIDATION_ERROR', details);
  }

  static unauthorized(message = 'Authentication required', code = 'UNAUTHORIZED') {
    return new AppError(message, 401, code);
  }

  static forbidden(
    message = 'You do not have permission to perform this action',
    code = 'FORBIDDEN',
  ) {
    return new AppError(message, 403, code);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND') {
    return new AppError(message, 404, code);
  }

  static conflict(message = 'Resource already exists', code = 'CONFLICT', details) {
    return new AppError(message, 409, code, details);
  }

  static tooManyRequests(
    message = 'Too many requests, please try again later',
    code = 'RATE_LIMITED',
  ) {
    return new AppError(message, 429, code);
  }

  static serviceUnavailable(
    message = 'Service temporarily unavailable',
    code = 'SERVICE_UNAVAILABLE',
  ) {
    return new AppError(message, 503, code);
  }
}
