import * as authService from '../services/auth.service.js';
import * as userService from '../services/user.service.js';
import { sendCreated, sendSuccess } from '../utils/apiResponse.js';
import { clearAuthCookie, setAuthCookie } from '../utils/jwt.js';

export async function register(req, res) {
  const { user, token } = await authService.register(req.validated.body);
  setAuthCookie(res, token);
  return sendCreated(res, { data: { user }, message: 'Account created' });
}

export async function login(req, res) {
  const { user, token } = await authService.login(req.validated.body);
  setAuthCookie(res, token);
  return sendSuccess(res, { data: { user }, message: 'Logged in' });
}

export async function verifyEmail(req, res) {
  const user = await authService.verifyEmail(req.validated.body.token);
  return sendSuccess(res, { data: { user }, message: 'Email verified' });
}

export async function resendVerification(req, res) {
  await authService.resendVerification(req.validated.body.email);
  return sendSuccess(res, { message: 'If verification is available, an email will be sent shortly.' });
}

export async function forgotPassword(req, res) {
  await authService.requestPasswordReset(req.validated.body.email);
  return sendSuccess(res, { message: 'If the account can receive a reset link, an email will be sent shortly.' });
}

export async function resetPassword(req, res) {
  await authService.resetPassword(req.validated.body.token, req.validated.body.password);
  return sendSuccess(res, { message: 'Password updated. Please sign in again.' });
}

export function logout(_req, res) {
  clearAuthCookie(res);
  return sendSuccess(res, { message: 'Logged out' });
}

export async function me(req, res) {
  return sendSuccess(res, { data: { user: await userService.getProfile(req.user.id) } });
}
