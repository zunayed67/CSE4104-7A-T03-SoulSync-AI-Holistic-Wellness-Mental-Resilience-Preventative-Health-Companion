import * as reportService from '../services/report.service.js';
import { sendPaginated, sendSuccess } from '../utils/apiResponse.js';
import { toSkipLimit } from '../validators/common.validator.js';

export async function list(req, res) {
  const { page, limit } = req.validated.query;
  const { items, total } = await reportService.listReports(req.user, toSkipLimit({ page, limit }));
  return sendPaginated(res, { items, total, page, limit });
}

export async function getById(req, res) {
  return sendSuccess(res, {
    data: await reportService.getReport(req.user, req.validated.params.id),
  });
}

/** Calculate (or refresh) the report for a week: metrics only, no AI involved. */
export async function generate(req, res) {
  const report = await reportService.ensureReport(req.user, req.validated.body.weekStart);
  return sendSuccess(res, { data: report, message: 'Report generated' });
}
