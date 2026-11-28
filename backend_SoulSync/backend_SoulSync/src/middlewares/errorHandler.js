import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError.js';
import { buildErrorBody } from '../utils/apiResponse.js';
import { logger } from '../config/logger.js';

const GENERIC_MESSAGE = 'Something went wrong on our side. Please try again later.';

/**
 * Map any thrown value to `{ statusCode, code, message, details? }`.
 * Messages for non-AppError cases are written here, never copied from the underlying error,
 * so internals (stack traces, query text, offending values) cannot leak to clients.
 */
export function normalizeError(err) {
  if (err instanceof AppError) {
    return {
      statusCode: err.statusCode,
      code: err.code,
      message: err.message,
      details: err.details,
    };
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({
      path: i.path.map(String).join('.'),
      message: i.message,
    }));
    return {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details,
    };
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
    return {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details,
    };
  }

  if (err instanceof mongoose.Error.CastError) {
    return { statusCode: 400, code: 'INVALID_VALUE', message: `Invalid value for "${err.path}"` };
  }

  // MongoDB duplicate-key violation (unique index, e.g. one wellness log per user per day).
  if (err?.code === 11000) {
    const fields = Object.keys(err.keyPattern ?? {});
    return {
      statusCode: 409,
      code: 'DUPLICATE_RESOURCE',
      message: 'A record with these values already exists',
      details: { fields },
    };
  }

  if (err?.name === 'TokenExpiredError') {
    return {
      statusCode: 401,
      code: 'TOKEN_EXPIRED',
      message: 'Your session has expired. Please log in again.',
    };
  }
  if (err?.name === 'JsonWebTokenError' || err?.name === 'NotBeforeError') {
    return { statusCode: 401, code: 'INVALID_TOKEN', message: 'Invalid authentication token.' };
  }

  // Errors raised by Express's body parser.
  switch (err?.type) {
    case 'entity.parse.failed':
      return { statusCode: 400, code: 'INVALID_JSON', message: 'Request body is not valid JSON' };
    case 'entity.too.large':
      return { statusCode: 413, code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' };
    case 'encoding.unsupported':
    case 'charset.unsupported':
      return {
        statusCode: 415,
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Unsupported content encoding',
      };
    default:
  }

  return { statusCode: 500, code: 'INTERNAL_ERROR', message: GENERIC_MESSAGE };
}

/**
 * The single place where errors become HTTP responses. 5xx errors are logged with the full
 * error (stack included) against the request ID; clients only ever see the safe envelope.
 * @type {import('express').ErrorRequestHandler}
 */
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const { statusCode, code, message, details } = normalizeError(err);

  if (statusCode >= 500) {
    (req.log ?? logger).error({ err, requestId: req.id }, 'Request failed');
  }

  return res.status(statusCode).json(buildErrorBody({ code, message, details, requestId: req.id }));
}
