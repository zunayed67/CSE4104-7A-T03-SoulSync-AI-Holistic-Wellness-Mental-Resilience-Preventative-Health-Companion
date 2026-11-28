import * as journalService from '../services/journal.service.js';
import { sendCreated, sendNoContent, sendPaginated, sendSuccess } from '../utils/apiResponse.js';
import { toSkipLimit } from '../validators/common.validator.js';

export async function create(req, res) {
  const entry = await journalService.createEntry(req.user, req.validated.body);
  return sendCreated(res, { data: entry, message: 'Journal entry saved' });
}

export async function list(req, res) {
  const { page, limit, ...filters } = req.validated.query;
  const { items, total } = await journalService.listEntries(req.user, {
    ...filters,
    ...toSkipLimit({ page, limit }),
  });
  return sendPaginated(res, { items, total, page, limit });
}

export async function getById(req, res) {
  return sendSuccess(res, {
    data: await journalService.getEntry(req.user, req.validated.params.id),
  });
}

export async function update(req, res) {
  const entry = await journalService.updateEntry(
    req.user,
    req.validated.params.id,
    req.validated.body,
  );
  return sendSuccess(res, { data: entry, message: 'Journal entry updated' });
}

export async function remove(req, res) {
  await journalService.deleteEntry(req.user, req.validated.params.id);
  return sendNoContent(res);
}
