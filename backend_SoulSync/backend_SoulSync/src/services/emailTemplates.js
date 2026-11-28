import { config } from '../config/index.js';

function appLink(queryName, token) {
  const origin = config.cors.origins[0] || 'http://localhost:5173';
  const url = new URL('/', origin);
  url.searchParams.set(queryName, token);
  return url.toString();
}

export function verificationEmail(token) {
  const url = appLink('verifyEmail', token);
  return {
    subject: 'Verify your SoulSync email',
    text: `Welcome to SoulSync. Confirm your email address using this link:\n\n${url}\n\nThis link expires in 24 hours. If you did not create an account, you can ignore this email.`,
  };
}

export function passwordResetEmail(token) {
  const url = appLink('resetPassword', token);
  return {
    subject: 'Reset your SoulSync password',
    text: `Use this link to choose a new SoulSync password:\n\n${url}\n\nThis link expires in 30 minutes. If you did not request a reset, you can ignore this email.`,
  };
}
