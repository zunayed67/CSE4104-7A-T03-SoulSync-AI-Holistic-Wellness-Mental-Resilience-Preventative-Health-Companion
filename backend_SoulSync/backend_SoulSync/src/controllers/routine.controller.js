import * as routineService from '../services/routine.service.js';
import { sendCreated, sendNoContent, sendPaginated, sendSuccess } from '../utils/apiResponse.js';
import { toSkipLimit } from '../validators/common.validator.js';

export async function create(req, res) {
  const routine = await routineService.createRoutine(req.user, req.validated.body);
  return sendCreated(res, { data: routine, message: 'Routine saved' });
}

export async function list(req, res) {
  const { page, limit } = req.validated.query;
  const { items, total } = await routineService.listRoutines(
    req.user,
    toSkipLimit({ page, limit }),
  );
  return sendPaginated(res, { items, total, page, limit });
}

export async function getById(req, res) {
  return sendSuccess(res, {
    data: await routineService.getRoutine(req.user, req.validated.params.id),
  });
}

export async function update(req, res) {
  const routine = await routineService.updateRoutine(
    req.user,
    req.validated.params.id,
    req.validated.body,
  );
  return sendSuccess(res, { data: routine, message: 'Routine updated' });
}

export async function remove(req, res) {
  await routineService.deleteRoutine(req.user, req.validated.params.id);
  return sendNoContent(res);
}
