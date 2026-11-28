import { Router } from 'express';
import * as controller from '../controllers/goal.controller.js';
import { validate } from '../middlewares/validate.js';
import { idParams } from '../validators/common.validator.js';
import {
  createGoalBody,
  listGoalsQuery,
  progressBody,
  updateGoalBody,
} from '../validators/goal.validator.js';

const router = Router();

router.get('/', validate({ query: listGoalsQuery }), controller.list);
router.post('/', validate({ body: createGoalBody }), controller.create);
router.get('/:id', validate({ params: idParams }), controller.getById);
router.patch('/:id', validate({ params: idParams, body: updateGoalBody }), controller.update);
router.patch(
  '/:id/progress',
  validate({ params: idParams, body: progressBody }),
  controller.progress,
);
router.delete('/:id', validate({ params: idParams }), controller.remove);

export default router;
