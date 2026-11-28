import * as contentReportService from '../services/contentReport.service.js';
import { sendCreated } from '../utils/apiResponse.js';

export async function create(req, res) {
  const report = await contentReportService.createReport(req.user, req.validated.body);
  return sendCreated(res, {
    data: report,
    message: 'Thank you. Your report was sent to the moderators.',
  });
}
