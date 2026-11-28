import * as analyticsService from '../services/analytics.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export async function overview(req, res) {
  return sendSuccess(res, { data: await analyticsService.getOverview(req.user) });
}

export async function trends(req, res) {
  return sendSuccess(res, {
    data: await analyticsService.getTrends(req.user, req.validated.query),
  });
}
