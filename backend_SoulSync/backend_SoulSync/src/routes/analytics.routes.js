import { Router } from 'express';
import * as controller from '../controllers/analytics.controller.js';
import { validate } from '../middlewares/validate.js';
import { trendsQuery } from '../validators/analytics.validator.js';

const router = Router();

router.get('/overview', controller.overview);
router.get('/trends', validate({ query: trendsQuery }), controller.trends);

export default router;
