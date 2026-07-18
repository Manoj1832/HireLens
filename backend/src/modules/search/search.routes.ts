import { Router } from 'express';
import { SearchController } from './search.controller.js';
import { authGuard, requireRole } from '../../middleware/auth.guard.js';

const router = Router();
const controller = new SearchController();

// Semantic search — accessible without auth for dashboard integration
// In production, re-enable: authGuard, requireRole('RECRUITER', 'ADMIN')
router.get(
  '/',
  (req, res, next) => controller.search(req, res, next)
);

export { router as searchRoutes };
