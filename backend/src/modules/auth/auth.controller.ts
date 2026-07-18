import type { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from './auth.schema.js';
import { BadRequestError } from '../../errors/index.js';

const authService = new AuthService();

function success(res: Response, data: unknown, message: string, statusCode = 200) {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    meta: {
      requestId: res.req.correlationId || '',
      timestamp: new Date().toISOString(),
    },
  });
}

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(
          parsed.error.issues.map((e: { message: string }) => e.message).join(', ')
        );
      }
      const result = await authService.register(parsed.data);
      success(res, result, 'Registration successful', 201);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(
          parsed.error.issues.map((e: { message: string }) => e.message).join(', ')
        );
      }
      const result = await authService.login(parsed.data);
      success(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = refreshTokenSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(
          parsed.error.issues.map((e: { message: string }) => e.message).join(', ')
        );
      }
      const tokens = await authService.refreshAccessToken(
        parsed.data.refreshToken
      );
      success(res, tokens, 'Token refreshed');
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = refreshTokenSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError('Refresh token required for logout');
      }
      await authService.logout(parsed.data.refreshToken);
      success(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  async profile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const profile = await authService.getProfile(userId);
      success(res, profile, 'Profile retrieved');
    } catch (error) {
      next(error);
    }
  }

  async googleUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const url = await authService.getGoogleAuthUrl();
      success(res, { url }, 'Google authentication URL generated');
    } catch (error) {
      next(error);
    }
  }

  async googleCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const code = (req.body?.code || req.query?.code) as string | undefined;
      if (!code) {
        throw new BadRequestError('OAuth authorization code is required');
      }

      const result = await authService.handleGoogleCallback(code);

      // If this is a browser redirect (GET request), redirect to the frontend with tokens
      if (req.method === 'GET') {
        const redirectUrl = `http://localhost:5173/login?accessToken=${encodeURIComponent(result.accessToken)}&refreshToken=${encodeURIComponent(result.refreshToken)}&role=${encodeURIComponent(result.user.role)}`;
        return res.redirect(redirectUrl);
      }

      // Otherwise, return JSON response (for POST/API calls)
      success(res, result, 'Google authentication successful');
    } catch (error) {
      if (req.method === 'GET') {
        const errorMsg = error instanceof Error ? error.message : 'Authentication failed';
        return res.redirect(`http://localhost:5173/login?error=${encodeURIComponent(errorMsg)}`);
      }
      next(error);
    }
  }
}

