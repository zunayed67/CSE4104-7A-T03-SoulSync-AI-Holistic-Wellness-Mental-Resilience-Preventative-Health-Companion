import { AppError } from '../utils/AppError.js';

const PARTS = ['params', 'query', 'body'];

/**
 * Validate and sanitise request input with zod schemas.
 *
 * - Parsed (typed, coerced, unknown keys stripped) data is exposed as `req.validated.{params,query,body}`.
 *   Controllers read ONLY from `req.validated`; this also prevents mass-assignment of unlisted fields.
 *   `req.body` is replaced with the parsed body. (`req.query` is read-only in Express 5.)
 * - On failure the client receives the field paths and zod's messages, never the submitted values.
 *
 * @param {{ params?: import('zod').ZodType, query?: import('zod').ZodType, body?: import('zod').ZodType }} schemas
 * @returns {import('express').RequestHandler}
 */
export function validate(schemas) {
  return (req, _res, next) => {
    const issues = [];
    const validated = {};

    for (const part of PARTS) {
      const schema = schemas[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part] ?? {});
      if (result.success) {
        validated[part] = result.data;
      } else {
        for (const issue of result.error.issues) {
          issues.push({
            location: part,
            path: issue.path.map(String).join('.'),
            message: issue.message,
          });
        }
      }
    }

    if (issues.length > 0) return next(AppError.validation('Request validation failed', issues));

    req.validated = { ...req.validated, ...validated };
    if (validated.body !== undefined) req.body = validated.body;
    return next();
  };
}
