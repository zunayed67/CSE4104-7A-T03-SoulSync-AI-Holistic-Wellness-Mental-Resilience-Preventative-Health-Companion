import { Router } from 'express';
import * as controller from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authLimiter } from '../middlewares/rateLimiters.js';
import { validate } from '../middlewares/validate.js';
import { emailOnlyBody, loginBody, registerBody, resetPasswordBody, verifyEmailBody } from '../validators/auth.validator.js';

const router = Router();

router.post('/register', authLimiter, validate({ body: registerBody }), controller.register);
router.post('/login', authLimiter, validate({ body: loginBody }), controller.login);
router.post('/verify-email', authLimiter, validate({ body: verifyEmailBody }), controller.verifyEmail);
router.post('/resend-verification', authLimiter, validate({ body: emailOnlyBody }), controller.resendVerification);
router.post('/forgot-password', authLimiter, validate({ body: emailOnlyBody }), controller.forgotPassword);
router.post('/reset-password', authLimiter, validate({ body: resetPasswordBody }), controller.resetPassword);
router.post('/logout', controller.logout);
router.get('/me', authenticate, controller.me);

export default router;
