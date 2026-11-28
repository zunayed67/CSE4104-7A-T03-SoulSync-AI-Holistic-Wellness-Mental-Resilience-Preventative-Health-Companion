import * as wellnessService from '../services/wellness.service.js';
import { sendCreated, sendNoContent, sendPaginated, sendSuccess } from '../utils/apiResponse.js';
import { toSkipLimit } from '../validators/common.validator.js';

export async function create(req, res) {
  const log = await wellnessService.createLog(req.user, req.validated.body);
  return sendCreated(res, { data: log, message: 'Wellness record saved' });
}

export async function list(req, res) {
  const { from, to, page, limit } = req.validated.query;
  const { items, total, range } = await wellnessService.listLogs(req.user, {
    from,
    to,
    ...toSkipLimit({ page, limit }),
  });
  return sendPaginated(res, { items, total, page, limit, extraMeta: { range } });
}

export async function getById(req, res) {
  return sendSuccess(res, {
    data: await wellnessService.getLog(req.user, req.validated.params.id),
  });
}

export async function getByDate(req, res) {
  return sendSuccess(res, {
    data: await wellnessService.getLogByDate(req.user, req.validated.params.date),
  });
}

export async function update(req, res) {
  const log = await wellnessService.updateLog(
    req.user,
    req.validated.params.id,
    req.validated.body,
  );
  return sendSuccess(res, { data: log, message: 'Wellness record updated' });
}

export async function remove(req, res) {
  await wellnessService.deleteLog(req.user, req.validated.params.id);
  return sendNoContent(res);
}
