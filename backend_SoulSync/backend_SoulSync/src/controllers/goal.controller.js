import * as goalService from '../services/goal.service.js';
import { sendCreated, sendNoContent, sendPaginated, sendSuccess } from '../utils/apiResponse.js';
import { toSkipLimit } from '../validators/common.validator.js';

export async function create(req, res) {
  return sendCreated(res, {
    data: await goalService.createGoal(req.user, req.validated.body),
    message: 'Goal created',
  });
}

export async function list(req, res) {
  const { status, page, limit } = req.validated.query;
  const { items, total } = await goalService.listGoals(req.user, {
    status,
    ...toSkipLimit({ page, limit }),
  });
  return sendPaginated(res, { items, total, page, limit });
}

export async function getById(req, res) {
  return sendSuccess(res, { data: await goalService.getGoal(req.user, req.validated.params.id) });
}

export async function update(req, res) {
  const goal = await goalService.updateGoal(req.user, req.validated.params.id, req.validated.body);
  return sendSuccess(res, { data: goal, message: 'Goal updated' });
}

export async function progress(req, res) {
  const goal = await goalService.updateProgress(
    req.user,
    req.validated.params.id,
    req.validated.body,
  );
  return sendSuccess(res, { data: goal, message: 'Progress saved' });
}

export async function remove(req, res) {
  await goalService.deleteGoal(req.user, req.validated.params.id);
  return sendNoContent(res);
}
