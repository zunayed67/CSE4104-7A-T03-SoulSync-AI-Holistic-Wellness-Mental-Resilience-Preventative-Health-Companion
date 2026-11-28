import { Router } from 'express';
import { ROLES } from '../config/constants.js';
import { isDatabaseConnected } from '../config/database.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';
import adminRoutes from './admin.routes.js';
import aiRoutes from './ai.routes.js';
import analyticsRoutes from './analytics.routes.js';
import authRoutes from './auth.routes.js';
import contentReportRoutes from './contentReport.routes.js';
import goalRoutes from './goal.routes.js';
import journalRoutes from './journal.routes.js';
import notificationRoutes from './notification.routes.js';
import reportRoutes from './report.routes.js';
import resourceRoutes from './resource.routes.js';
import routineRoutes from './routine.routes.js';
import userRoutes from './user.routes.js';
import wellnessRoutes from './wellness.routes.js';

const router = Router();

/** Liveness probe: the process is up and routing. Never touches the database. */
router.get('/health', (_req, res) =>
  sendSuccess(res, {
    data: {
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  }),
);

/** Readiness probe: 503 until MongoDB is connected. */
router.get('/health/ready', (_req, res) => {
  if (!isDatabaseConnected()) {
    throw AppError.serviceUnavailable('Database is not connected', 'DB_UNAVAILABLE');
  }
  return sendSuccess(res, { data: { status: 'ready' } });
});

// Public: registration, login and logout (the router authenticates /auth/me itself).
router.use('/auth', authRoutes);

// Everything below requires a valid session.
router.use('/users', authenticate, userRoutes);
router.use('/wellness', authenticate, wellnessRoutes);
router.use('/journal', authenticate, journalRoutes);
router.use('/analytics', authenticate, analyticsRoutes);
router.use('/ai', authenticate, aiRoutes);
router.use('/goals', authenticate, goalRoutes);
router.use('/routines', authenticate, routineRoutes);
router.use('/notifications', authenticate, notificationRoutes);
router.use('/reports', authenticate, reportRoutes);
router.use('/resources', authenticate, resourceRoutes);
router.use('/content-reports', authenticate, contentReportRoutes);

// Administrators only.
router.use('/admin', authenticate, authorize(ROLES.ADMIN), adminRoutes);

export default router;
