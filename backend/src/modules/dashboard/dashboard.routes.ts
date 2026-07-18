import { Router } from 'express';
import { DashboardController } from './dashboard.controller.js';
import { authGuard, requireRole } from '../../middleware/auth.guard.js';

const router = Router();
const controller = new DashboardController();

// Dashboard is recruiter/admin only
router.get(
  '/summary',
  authGuard,
  requireRole('RECRUITER', 'ADMIN'),
  (req, res, next) => controller.getSummary(req, res, next)
);

export { router as dashboardRoutes };
