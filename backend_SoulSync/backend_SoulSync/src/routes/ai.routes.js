import { Router } from 'express';
import * as controller from '../controllers/ai.controller.js';
import { aiLimiter } from '../middlewares/rateLimiters.js';
import { requireAiConsent } from '../middlewares/requireAiConsent.js';
import { validate } from '../middlewares/validate.js';
import {
  chatBody,
  listConversationsQuery,
  routineBody,
  weeklySummaryBody,
} from '../validators/ai.validator.js';
import { idParams } from '../validators/common.validator.js';

const router = Router();

/*
 * Chat is allowed without consent but then carries no tracked data. Everything that reads wellness
 * data (recommendations, routine, weekly summary) additionally requires consent.
 * Order: authenticate (in routes/index) -> burst limiter -> consent -> validation -> controller.
 */
router.post('/chat', aiLimiter, validate({ body: chatBody }), controller.chat);
router.post('/recommendations', aiLimiter, requireAiConsent, controller.recommendations);
router.post(
  '/routine',
  aiLimiter,
  requireAiConsent,
  validate({ body: routineBody }),
  controller.routine,
);
router.post(
  '/weekly-summary',
  aiLimiter,
  requireAiConsent,
  validate({ body: weeklySummaryBody }),
  controller.weeklySummary,
);

router.get('/usage', controller.usage);
router.get(
  '/conversations',
  validate({ query: listConversationsQuery }),
  controller.listConversations,
);
router.get('/conversations/:id', validate({ params: idParams }), controller.getConversation);
router.delete('/conversations/:id', validate({ params: idParams }), controller.deleteConversation);

export default router;
