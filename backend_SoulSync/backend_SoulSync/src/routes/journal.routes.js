import { Router } from 'express';
import * as controller from '../controllers/journal.controller.js';
import { validate } from '../middlewares/validate.js';
import { idParams } from '../validators/common.validator.js';
import {
  createJournalBody,
  listJournalQuery,
  updateJournalBody,
} from '../validators/journal.validator.js';

const router = Router();

router.get('/', validate({ query: listJournalQuery }), controller.list);
router.post('/', validate({ body: createJournalBody }), controller.create);
router.get('/:id', validate({ params: idParams }), controller.getById);
router.patch('/:id', validate({ params: idParams, body: updateJournalBody }), controller.update);
router.delete('/:id', validate({ params: idParams }), controller.remove);

export default router;
