import bcrypt from 'bcryptjs';
import { config } from '../config/index.js';
import { AppError } from './AppError.js';

/** bcrypt silently ignores bytes after 72, so longer passwords are rejected instead of truncated. */
const BCRYPT_MAX_BYTES = 72;

let dummyHashPromise;

/** @param {string} plain */
export async function hashPassword(plain) {
  if (typeof plain !== 'string' || plain.length === 0) {
    throw AppError.badRequest('Password is required', 'INVALID_PASSWORD');
  }
  if (Buffer.byteLength(plain, 'utf8') > BCRYPT_MAX_BYTES) {
    throw AppError.badRequest('Password must be at most 72 bytes long', 'PASSWORD_TOO_LONG');
  }
  return bcrypt.hash(plain, config.security.bcryptRounds);
}

/**
 * Compare a password with a stored hash. When there is no hash (unknown email) a throwaway
 * comparison still runs, so response time does not reveal whether an account exists.
 * @param {string} plain
 * @param {string | null | undefined} hash
 * @returns {Promise<boolean>}
 */
export async function comparePassword(plain, hash) {
  if (typeof plain !== 'string') return false;
  if (!hash) {
    dummyHashPromise ??= bcrypt.hash('soulsync-dummy-password', config.security.bcryptRounds);
    await bcrypt.compare(plain, await dummyHashPromise);
    return false;
  }
  return bcrypt.compare(plain, hash);
}
