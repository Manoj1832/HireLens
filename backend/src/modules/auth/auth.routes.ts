import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { authGuard } from '../../middleware/auth.guard.js';
import { authLimiter } from '../../middleware/rate-limit.js';

const router = Router();
const controller = new AuthController();

// Public endpoints (rate-limited)
router.post('/register', authLimiter, (req, res, next) => controller.register(req, res, next));
router.post('/login', authLimiter, (req, res, next) => controller.login(req, res, next));
router.post('/refresh', authLimiter, (req, res, next) => controller.refresh(req, res, next));
router.post('/logout', (req, res, next) => controller.logout(req, res, next));

// Google OAuth2 endpoints (publicly accessible)
router.get('/google/url', (req, res, next) => controller.googleUrl(req, res, next));
router.get('/google/callback', authLimiter, (req, res, next) => controller.googleCallback(req, res, next));
router.post('/google/callback', authLimiter, (req, res, next) => controller.googleCallback(req, res, next));

// Protected endpoint
router.get('/profile', authGuard, (req, res, next) => controller.profile(req, res, next));

export { router as authRoutes };
