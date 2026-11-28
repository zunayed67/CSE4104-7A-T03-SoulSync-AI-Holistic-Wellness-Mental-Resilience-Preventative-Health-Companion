import mongoose from 'mongoose';
import { config } from './index.js';
import { logger } from './logger.js';

let listenersAttached = false;

function attachConnectionListeners() {
  if (listenersAttached) return;
  listenersAttached = true;
  const { connection } = mongoose;
  connection.on('error', (err) => logger.error({ err }, 'MongoDB connection error'));
  connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  connection.on('reconnected', () => logger.info('MongoDB reconnected'));
}

/**
 * Connect to MongoDB. Fails fast (10 s) when the server is unreachable so a bad URI or an
 * Atlas IP-allowlist problem surfaces at startup instead of as hanging requests. After the
 * first successful connect the driver reconnects automatically.
 * The URI contains credentials and is never logged.
 */
export async function connectDatabase() {
  attachConnectionListeners();
  mongoose.set('strictQuery', true);
  await mongoose.connect(config.db.uri, {
    serverSelectionTimeoutMS: 10_000,
    socketTimeoutMS: 45_000,
    maxPoolSize: 10,
  });
  logger.info({ database: mongoose.connection.name }, 'MongoDB connected');
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info('MongoDB connection closed');
  }
}

/** True when the driver reports an open connection (readyState 1). Used by the readiness probe. */
export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}
