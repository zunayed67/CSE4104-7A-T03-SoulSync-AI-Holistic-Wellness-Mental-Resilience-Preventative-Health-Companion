import helmet from 'helmet';

/**
 * Security headers for a JSON API. The CSP denies everything because this server never serves
 * HTML, scripts or frames. (helmet also removes X-Powered-By and sets HSTS, nosniff, etc.)
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
  },
  referrerPolicy: { policy: 'no-referrer' },
});

/** Responses contain private wellness data: forbid browser and proxy caching. */
export function noStore(_req, res, next) {
  res.set('Cache-Control', 'no-store');
  next();
}
