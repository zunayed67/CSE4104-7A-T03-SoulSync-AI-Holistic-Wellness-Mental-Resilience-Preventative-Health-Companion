import { Router } from 'express';
import * as controller from '../controllers/contentReport.controller.js';
import { validate } from '../middlewares/validate.js';
import { createContentReportBody } from '../validators/contentReport.validator.js';

const router = Router();

router.post('/', validate({ body: createContentReportBody }), controller.create);

export default router;
