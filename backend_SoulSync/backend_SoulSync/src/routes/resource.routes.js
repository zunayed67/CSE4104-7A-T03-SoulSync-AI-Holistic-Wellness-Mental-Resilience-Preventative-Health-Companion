import { Router } from 'express';
import * as controller from '../controllers/resource.controller.js';
import { validate } from '../middlewares/validate.js';
import { idParams } from '../validators/common.validator.js';
import { listResourcesQuery } from '../validators/resource.validator.js';

const router = Router();

router.get('/', validate({ query: listResourcesQuery }), controller.list);
router.get('/categories', controller.categories);
router.get('/:id', validate({ params: idParams }), controller.getById);

export default router;
