import { Router } from 'express';
import * as controller from '../controllers/wellness.controller.js';
import { validate } from '../middlewares/validate.js';
import {
  createWellnessBody,
  listWellnessQuery,
  updateWellnessBody,
  wellnessDateParams,
  wellnessIdParams,
} from '../validators/wellness.validator.js';

const router = Router();

router.get('/', validate({ query: listWellnessQuery }), controller.list);
router.post('/', validate({ body: createWellnessBody }), controller.create);
// Must be declared before '/:id' so "date" is not read as an id.
router.get('/date/:date', validate({ params: wellnessDateParams }), controller.getByDate);
router.get('/:id', validate({ params: wellnessIdParams }), controller.getById);
router.patch(
  '/:id',
  validate({ params: wellnessIdParams, body: updateWellnessBody }),
  controller.update,
);
router.delete('/:id', validate({ params: wellnessIdParams }), controller.remove);

export default router;
