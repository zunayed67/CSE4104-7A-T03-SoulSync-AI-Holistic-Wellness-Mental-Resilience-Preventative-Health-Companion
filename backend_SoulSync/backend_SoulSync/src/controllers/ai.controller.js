import * as aiService from '../services/ai/ai.service.js';
import * as conversationService from '../services/ai/conversation.service.js';
import { sendNoContent, sendPaginated, sendSuccess } from '../utils/apiResponse.js';
import { toSkipLimit } from '../validators/common.validator.js';

export async function chat(req, res) {
  return sendSuccess(res, { data: await aiService.chat(req.user, req.validated.body) });
}

export async function recommendations(req, res) {
  return sendSuccess(res, { data: await aiService.recommendations(req.user) });
}

export async function routine(req, res) {
  return sendSuccess(res, { data: await aiService.routine(req.user, req.validated.body) });
}

export async function weeklySummary(req, res) {
  return sendSuccess(res, { data: await aiService.weeklySummary(req.user, req.validated.body) });
}

export async function usage(req, res) {
  return sendSuccess(res, { data: await aiService.getUsage(req.user) });
}

export async function listConversations(req, res) {
  const { page, limit } = req.validated.query;
  const { items, total } = await conversationService.listConversations(
    req.user.id,
    toSkipLimit({ page, limit }),
  );
  return sendPaginated(res, { items, total, page, limit });
}

export async function getConversation(req, res) {
  return sendSuccess(res, {
    data: await conversationService.getConversation(req.user.id, req.validated.params.id),
  });
}

export async function deleteConversation(req, res) {
  await conversationService.deleteConversation(req.user.id, req.validated.params.id);
  return sendNoContent(res);
}
