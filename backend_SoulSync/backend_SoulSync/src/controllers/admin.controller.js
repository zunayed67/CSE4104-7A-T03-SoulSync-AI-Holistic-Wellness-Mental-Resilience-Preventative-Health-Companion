import * as adminService from '../services/admin.service.js';
import * as contentReportService from '../services/contentReport.service.js';
import * as resourceService from '../services/resource.service.js';
import { sendCreated, sendNoContent, sendPaginated, sendSuccess } from '../utils/apiResponse.js';
import { toSkipLimit } from '../validators/common.validator.js';

export async function stats(_req, res) {
  return sendSuccess(res, { data: await adminService.getStats() });
}

export async function listUsers(req, res) {
  const { page, limit, ...filters } = req.validated.query;
  const { items, total } = await adminService.listUsers({
    ...filters,
    ...toSkipLimit({ page, limit }),
  });
  return sendPaginated(res, { items, total, page, limit });
}

export async function setUserStatus(req, res) {
  const user = await adminService.setUserStatus(
    req.user.id,
    req.validated.params.id,
    req.validated.body.status,
  );
  return sendSuccess(res, { data: user, message: `Account ${user.status}` });
}

export async function deleteUser(req, res) {
  await adminService.deleteUser(req.user.id, req.validated.params.id);
  return sendNoContent(res);
}

export async function listResources(req, res) {
  const { page, limit, ...filters } = req.validated.query;
  const { items, total } = await resourceService.adminList({
    ...filters,
    ...toSkipLimit({ page, limit }),
  });
  return sendPaginated(res, { items, total, page, limit });
}

export async function getResource(req, res) {
  return sendSuccess(res, { data: await resourceService.adminGet(req.validated.params.id) });
}

export async function createResource(req, res) {
  const resource = await resourceService.adminCreate(req.user.id, req.validated.body);
  return sendCreated(res, { data: resource, message: 'Resource created' });
}

export async function updateResource(req, res) {
  const resource = await resourceService.adminUpdate(req.validated.params.id, req.validated.body);
  return sendSuccess(res, { data: resource, message: 'Resource updated' });
}

export async function setResourcePublished(req, res) {
  const resource = await resourceService.adminSetPublished(
    req.validated.params.id,
    req.validated.body.isPublished,
  );
  return sendSuccess(res, {
    data: resource,
    message: resource.isPublished ? 'Resource published' : 'Resource unpublished',
  });
}

export async function deleteResource(req, res) {
  await resourceService.adminDelete(req.validated.params.id);
  return sendNoContent(res);
}

export async function listContentReports(req, res) {
  const { page, limit, status } = req.validated.query;
  const { items, total } = await contentReportService.adminList({
    status,
    ...toSkipLimit({ page, limit }),
  });
  return sendPaginated(res, { items, total, page, limit });
}

export async function reviewContentReport(req, res) {
  const report = await contentReportService.adminReview(
    req.user.id,
    req.validated.params.id,
    req.validated.body.action,
  );
  return sendSuccess(res, { data: report, message: 'Report reviewed' });
}
