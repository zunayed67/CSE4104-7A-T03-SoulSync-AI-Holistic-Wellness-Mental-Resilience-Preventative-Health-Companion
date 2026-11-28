import * as userService from '../services/user.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { clearAuthCookie, setAuthCookie, signAuthToken } from '../utils/jwt.js';

export async function getMe(req, res) {
  return sendSuccess(res, { data: { user: await userService.getProfile(req.user.id) } });
}

export async function updateMe(req, res) {
  const user = await userService.updateProfile(req.user.id, req.validated.body);
  return sendSuccess(res, { data: { user }, message: 'Profile updated' });
}

export async function changePassword(req, res) {
  const user = await userService.changePassword(req.user.id, req.validated.body);
  // Older sessions are now revoked; give this device a fresh one.
  setAuthCookie(res, signAuthToken({ userId: user.id, role: user.role }));
  return sendSuccess(res, { message: 'Password changed' });
}

export async function setAiConsent(req, res) {
  const user = await userService.setAiConsent(req.user.id, req.validated.body.consent);
  return sendSuccess(res, {
    data: { aiConsent: user.aiConsent, aiConsentAt: user.aiConsentAt },
    message: user.aiConsent ? 'AI consent granted' : 'AI consent withdrawn',
  });
}

export async function deleteMe(req, res) {
  await userService.deleteAccount(req.user.id, req.validated.body.password);
  clearAuthCookie(res);
  return sendSuccess(res, { message: 'Your account and all associated data were deleted' });
}
