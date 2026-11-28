import { PAGINATION } from '../config/constants.js';

/**
 * Clamp untrusted page/limit values into safe bounds and derive the skip offset.
 * @param {{ page?: unknown, limit?: unknown }} [input]
 * @returns {{ page: number, limit: number, skip: number }}
 */
export function normalizePagination({ page, limit } = {}) {
  const parsedPage = Math.floor(Number(page));
  const parsedLimit = Math.floor(Number(limit));
  const safePage = Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : 1;
  const safeLimit =
    Number.isFinite(parsedLimit) && parsedLimit >= 1
      ? Math.min(parsedLimit, PAGINATION.MAX_LIMIT)
      : PAGINATION.DEFAULT_LIMIT;
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
}

/**
 * Build the `meta` block for paginated list responses.
 * @param {{ page: number, limit: number, total: number }} input
 */
export function buildPaginationMeta({ page, limit, total }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
}
