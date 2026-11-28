import { Router } from 'express';
import * as controller from '../controllers/routine.controller.js';
import { validate } from '../middlewares/validate.js';
import { idParams } from '../validators/common.validator.js';
import {
  createRoutineBody,
  listRoutinesQuery,
  updateRoutineBody,
} from '../validators/routine.validator.js';

const router = Router();

router.get('/', validate({ query: listRoutinesQuery }), controller.list);
router.post('/', validate({ body: createRoutineBody }), controller.create);
router.get('/:id', validate({ params: idParams }), controller.getById);
router.patch('/:id', validate({ params: idParams, body: updateRoutineBody }), controller.update);
router.delete('/:id', validate({ params: idParams }), controller.remove);

export default router;
