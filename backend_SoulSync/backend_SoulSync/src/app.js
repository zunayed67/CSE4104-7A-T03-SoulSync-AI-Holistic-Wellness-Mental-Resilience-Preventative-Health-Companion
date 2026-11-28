import express from 'express';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import { API_PREFIX, BODY_LIMIT } from './config/constants.js';
import { corsMiddleware } from './config/cors.js';
import { requestContext } from './middlewares/requestContext.js';
import { securityHeaders, noStore } from './middlewares/security.js';
import { globalLimiter } from './middlewares/rateLimiters.js';
import { notFound } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';
import routes from './routes/index.js';

/**
 * Express application factory. It never calls `listen`, so Supertest can drive it in-process.
 * Middleware order matters:
 *   1. request ID + logging, so every later failure is traceable;
 *   2. security headers and CORS, so even 429/4xx responses carry the right headers
 *      (the browser must be able to read a rate-limit error);
 *   3. rate limiting, before any body parsing so abusive requests are cheap to reject;
 *   4. body/cookie parsing, routes, then the 404 and error handlers.
 */
export function createApp() {
  const app = express();

  app.set('trust proxy', config.trustProxy);
  app.disable('x-powered-by');

  app.use(requestContext);
  app.use(securityHeaders);
  app.use(corsMiddleware);
  app.use(globalLimiter);
  app.use(noStore);

  app.use(express.json({ limit: BODY_LIMIT, strict: true }));
  app.use(cookieParser());

  app.use(API_PREFIX, routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
