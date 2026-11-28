import { Router } from 'express';
import * as controller from '../controllers/admin.controller.js';
import { validate } from '../middlewares/validate.js';
import { listUsersQuery, setUserStatusBody } from '../validators/admin.validator.js';
import { idParams } from '../validators/common.validator.js';
import {
  listContentReportsQuery,
  reviewContentReportBody,
} from '../validators/contentReport.validator.js';
import {
  adminListResourcesQuery,
  createResourceBody,
  publishBody,
  updateResourceBody,
} from '../validators/resource.validator.js';

/**
 * Administration. routes/index.js mounts this router behind `authenticate` and
 * `authorize(ROLES.ADMIN)`. There is deliberately no route here that reads wellness logs,
 * journal entries, goals or AI conversations (FR-50).
 */
const router = Router();

router.get('/stats', controller.stats);

router.get('/users', validate({ query: listUsersQuery }), controller.listUsers);
router.patch(
  '/users/:id/status',
  validate({ params: idParams, body: setUserStatusBody }),
  controller.setUserStatus,
);
router.delete('/users/:id', validate({ params: idParams }), controller.deleteUser);

router.get('/resources', validate({ query: adminListResourcesQuery }), controller.listResources);
router.post('/resources', validate({ body: createResourceBody }), controller.createResource);
router.get('/resources/:id', validate({ params: idParams }), controller.getResource);
router.patch(
  '/resources/:id',
  validate({ params: idParams, body: updateResourceBody }),
  controller.updateResource,
);
router.patch(
  '/resources/:id/publish',
  validate({ params: idParams, body: publishBody }),
  controller.setResourcePublished,
);
router.delete('/resources/:id', validate({ params: idParams }), controller.deleteResource);

router.get(
  '/content-reports',
  validate({ query: listContentReportsQuery }),
  controller.listContentReports,
);
router.patch(
  '/content-reports/:id',
  validate({ params: idParams, body: reviewContentReportBody }),
  controller.reviewContentReport,
);

export default router;
