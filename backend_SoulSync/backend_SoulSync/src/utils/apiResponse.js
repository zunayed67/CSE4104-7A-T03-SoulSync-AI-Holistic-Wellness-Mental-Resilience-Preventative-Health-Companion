import { buildPaginationMeta } from './pagination.js';

/**
 * Consistent response envelopes.
 *   success: { success: true, message?, data, meta? }
 *   error:   { success: false, error: { code, message, details?, requestId? } }
 */

/**
 * @param {import('express').Response} res
 * @param {{ data?: unknown, message?: string, meta?: object, statusCode?: number }} [options]
 */
export function sendSuccess(res, { data = null, message, meta, statusCode = 200 } = {}) {
  const body = { success: true };
  if (message) body.message = message;
  body.data = data;
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

export function sendCreated(res, options = {}) {
  return sendSuccess(res, { ...options, statusCode: 201 });
}

export function sendNoContent(res) {
  return res.status(204).end();
}

/**
 * @param {{ code: string, message: string, details?: unknown, requestId?: string }} input
 */
export function buildErrorBody({ code, message, details, requestId }) {
  const error = { code, message };
  if (details !== undefined) error.details = details;
  if (requestId) error.requestId = requestId;
  return { success: false, error };
}

/**
 * Standard paginated list response: `data` is the page of items and `meta` carries
 * page/limit/total/totalPages plus any extra metadata (e.g. the resolved date range).
 */
export function sendPaginated(res, { items, total, page, limit, extraMeta = {} }) {
  return sendSuccess(res, {
    data: items,
    meta: { ...buildPaginationMeta({ page, limit, total }), ...extraMeta },
  });
}
