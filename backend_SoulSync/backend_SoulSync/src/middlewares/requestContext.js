import { randomUUID } from 'node:crypto';
import pinoHttp from 'pino-http';
import { logger } from '../config/logger.js';
import { API_PREFIX } from '../config/constants.js';

const SAFE_REQUEST_ID = /^[\w-]{8,64}$/;

/**
 * Assigns every request an ID (echoed in `X-Request-Id` and in error bodies) and logs one
 * line per response. Only the method, path (query string removed), status and timing are
 * logged: never headers, cookies or bodies, so wellness data and credentials stay out of logs.
 * A client-supplied ID is accepted only if it is a short, URL-safe token.
 */
export const requestContext = pinoHttp({
  logger,
  genReqId(req, res) {
    const incoming = req.headers['x-request-id'];
    const id =
      typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, path: req.url.split('?')[0] }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
  customLogLevel(_req, res, err) {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  autoLogging: { ignore: (req) => req.url.startsWith(`${API_PREFIX}/health`) },
});
