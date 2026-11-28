import { config } from './config/index.js';
import { logger } from './config/logger.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { startScheduler, stopScheduler } from './jobs/scheduler.js';
import { createApp } from './app.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;

let server;
let shuttingDown = false;

/**
 * Graceful shutdown: stop accepting connections, let in-flight requests and jobs finish,
 * close MongoDB, then exit. A hard timeout guarantees the process cannot hang forever.
 */
async function shutdown(reason, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ reason }, 'Shutting down');

  const forceExit = setTimeout(() => {
    logger.error('Graceful shutdown timed out; forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  try {
    if (server?.listening) {
      await new Promise((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
    }
    await stopScheduler();
    await disconnectDatabase();
    logger.info('Shutdown complete');
    process.exit(exitCode);
  } catch (err) {
    logger.error({ err }, 'Error during shutdown');
    process.exit(1);
  }
}

/** Startup sequence: connect DB, then listen, then start jobs. */
async function main() {
  await connectDatabase();

  server = createApp().listen(config.port);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  // Keep-alive must outlive the reverse proxy's idle timeout, or the proxy reuses a socket
  // we already closed and the client sees sporadic 502s.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;

  logger.info(
    { port: config.port, env: config.env, ai: config.ai.provider },
    'SoulSync API listening',
  );

  if (config.jobs.enabled) startScheduler();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Unhandled promise rejection');
  shutdown('unhandledRejection', 1);
});
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  shutdown('uncaughtException', 1);
});

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  shutdown('startupFailure', 1);
});
