// Runs before every test file and before any application module is imported, so the config
// is built from this hermetic environment and never from a developer's real .env.
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.ENABLE_JOBS = 'false';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/soulsync_test';
process.env.JWT_SECRET = 'test-only-secret-that-is-at-least-32-characters-long';
process.env.CLIENT_ORIGINS = 'http://localhost:5173';
process.env.RATE_LIMIT_MAX = '1000';
process.env.AUTH_RATE_LIMIT_MAX = '1000';
process.env.AI_RATE_LIMIT_MAX = '1000';
process.env.EMAIL_ENABLED = 'false';
for (const key of ['COOKIE_SECURE', 'COOKIE_SAME_SITE', 'COOKIE_DOMAIN', 'TRUST_PROXY']) {
  delete process.env[key];
}
