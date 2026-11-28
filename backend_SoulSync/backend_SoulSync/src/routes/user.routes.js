import { Router } from 'express';
import * as controller from '../controllers/user.controller.js';
import { authLimiter } from '../middlewares/rateLimiters.js';
import { validate } from '../middlewares/validate.js';
import {
  aiConsentBody,
  changePasswordBody,
  deleteAccountBody,
  updateProfileBody,
} from '../validators/user.validator.js';

const router = Router();

router.get('/me', controller.getMe);
router.patch('/me', validate({ body: updateProfileBody }), controller.updateMe);
router.patch(
  '/me/password',
  authLimiter,
  validate({ body: changePasswordBody }),
  controller.changePassword,
);
router.put('/me/ai-consent', validate({ body: aiConsentBody }), controller.setAiConsent);
router.delete('/me', authLimiter, validate({ body: deleteAccountBody }), controller.deleteMe);

export default router;
