import { Router } from 'express';
import * as controller from '../controllers/report.controller.js';
import { validate } from '../middlewares/validate.js';
import { idParams } from '../validators/common.validator.js';
import { generateReportBody, listReportsQuery } from '../validators/report.validator.js';

const router = Router();

router.get('/', validate({ query: listReportsQuery }), controller.list);
router.post('/generate', validate({ body: generateReportBody }), controller.generate);
router.get('/:id', validate({ params: idParams }), controller.getById);

export default router;
