import { Router } from 'express';
import * as controller from '../controllers/notification.controller.js';
import { validate } from '../middlewares/validate.js';
import { idParams } from '../validators/common.validator.js';
import { listNotificationsQuery } from '../validators/notification.validator.js';

const router = Router();

router.get('/', validate({ query: listNotificationsQuery }), controller.list);
router.get('/unread-count', controller.unreadCount);
router.patch('/read-all', controller.markAllRead);
router.patch('/:id/read', validate({ params: idParams }), controller.markRead);

export default router;
