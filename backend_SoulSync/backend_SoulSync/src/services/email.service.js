import nodemailer from 'nodemailer';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';

let transporter;

export function isEmailEnabled() {
  return config.email.enabled;
}

function getTransporter() {
  if (!isEmailEnabled()) return null;
  transporter ??= nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure,
    requireTLS: !config.email.secure,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    auth: { user: config.email.user, pass: config.email.pass },
  });
  return transporter;
}

/** Verify optional SMTP connectivity on demand; never called during API startup. */
export async function verifyEmailTransport() {
  try {
    const mailer = getTransporter();
    if (!mailer) return false;
    await mailer.verify();
    logger.info('SMTP transport verified');
    return true;
  } catch (err) {
    logger.error({ code: err?.code }, 'SMTP transport verification failed');
    return false;
  }
}

/**
 * Optional Nodemailer delivery (FR-46). Returns false (never throws) when email is disabled or
 * delivery fails, because email is a convenience on top of in-app notifications. Messages must not
 * contain wellness data; only the error code is logged, never recipients or content.
 * @returns {Promise<boolean>}
 */
export async function sendEmail({ to, subject, text }) {
  try {
    const mailer = getTransporter();
    if (!mailer) return false;
    await mailer.sendMail({ from: config.email.from, to, subject, text });
    return true;
  } catch (err) {
    logger.error({ code: err?.code }, 'Email delivery failed');
    return false;
  }
}
