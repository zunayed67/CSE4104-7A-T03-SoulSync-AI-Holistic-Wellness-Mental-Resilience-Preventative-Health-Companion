import * as resourceService from '../services/resource.service.js';
import { sendPaginated, sendSuccess } from '../utils/apiResponse.js';
import { toSkipLimit } from '../validators/common.validator.js';

export async function list(req, res) {
  const { page, limit, ...filters } = req.validated.query;
  const { items, total } = await resourceService.listPublished(req.user, {
    ...filters,
    ...toSkipLimit({ page, limit }),
  });
  return sendPaginated(res, { items, total, page, limit });
}

export async function categories(_req, res) {
  return sendSuccess(res, { data: await resourceService.listCategories() });
}

export async function getById(req, res) {
  return sendSuccess(res, {
    data: await resourceService.getPublished(req.user, req.validated.params.id),
  });
}
