import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../../config/index.js';
import { AuthRepository } from './auth.repository.js';
import {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
} from '../../errors/index.js';
import { logger } from '../../utils/logger.js';
import type { RegisterInput, LoginInput } from './auth.schema.js';
import type { Role } from '@prisma/client';

const BCRYPT_COST = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export class AuthService {
  private repo: AuthRepository;

  constructor() {
    this.repo = new AuthRepository();
  }

  async register(input: RegisterInput) {
    const existing = await this.repo.findUserByEmail(input.email);
    if (existing) {
      throw new ConflictError('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
    const user = await this.repo.createUser({
      email: input.email,
      passwordHash,
      role: (input.role as Role) || 'CANDIDATE',
    });

    // Create associated profile
    if (user.role === 'CANDIDATE') {
      await this.repo.createCandidate({
        userId: user.id,
        name: input.name || input.email.split('@')[0],
      });
    } else if (user.role === 'RECRUITER') {
      await this.repo.createRecruiter({
        userId: user.id,
        companyName: 'HireLens Enterprise',
        department: 'Engineering',
      });
    }

    const tokens = await this.generateTokenPair(user.id, user.role);

    logger.info(`User registered: ${user.email}`, {
      service: 'auth',
      userId: user.id,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      ...tokens,
    };
  }

  async login(input: LoginInput) {
    const user = await this.repo.findUserByEmail(input.email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const tokens = await this.generateTokenPair(user.id, user.role);

    logger.info(`User logged in: ${user.email}`, {
      service: 'auth',
      userId: user.id,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      ...tokens,
    };
  }

  async refreshAccessToken(rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);
    const storedToken = await this.repo.findRefreshTokenByHash(tokenHash);

    if (!storedToken) {
      // Possible token theft — the token was already revoked but someone is reusing it.
      // We can't identify the user from a hashed token that doesn't match,
      // so we log this as a security event.
      logger.warn('Refresh token reuse detected — potential token theft', {
        service: 'auth',
      });
      throw new UnauthorizedError('Invalid refresh token');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token expired');
    }

    // Rotate: revoke old, issue new
    await this.repo.revokeRefreshToken(storedToken.id);
    const tokens = await this.generateTokenPair(
      storedToken.userId,
      storedToken.user.role
    );

    logger.info('Refresh token rotated', {
      service: 'auth',
      userId: storedToken.userId,
    });

    return tokens;
  }

  async logout(rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);
    const storedToken = await this.repo.findRefreshTokenByHash(tokenHash);
    if (storedToken) {
      await this.repo.revokeRefreshToken(storedToken.id);
    }
  }

  async getProfile(userId: string) {
    const user = await this.repo.findUserById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt.toISOString(),
    };
  }

  // ---- Private helpers ----

  private async generateTokenPair(userId: string, role: Role) {
    const accessToken = jwt.sign(
      { userId, role },
      config.jwtSecret,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(
      Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    );

    await this.repo.createRefreshToken({ tokenHash, userId, expiresAt });

    return { accessToken, refreshToken: rawRefreshToken };
  }

  async getGoogleAuthUrl() {
    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const options = {
      redirect_uri: config.googleRedirectUri,
      client_id: config.googleClientId,
      access_type: 'offline',
      response_type: 'code',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ].join(' '),
    };

    const qs = new URLSearchParams(options);
    return `${rootUrl}?${qs.toString()}`;
  }

  async handleGoogleCallback(code: string) {
    let email = '';
    let name = '';

    // Graceful support for Mock Mode when using mock credentials
    if (config.googleClientId === 'mock-google-client-id' || code === 'mock-auth-code') {
      logger.info('Google OAuth running in Mock Mode', { service: 'auth' });
      email = 'mock.google.candidate@hirelens.test';
      name = 'Mock Google Candidate';
    } else {
      logger.info('Google OAuth exchanging code with Google API...', { service: 'auth' });
      try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: config.googleClientId,
            client_secret: config.googleClientSecret,
            redirect_uri: config.googleRedirectUri,
            grant_type: 'authorization_code',
          }),
        });

        if (!tokenRes.ok) {
          const errText = await tokenRes.text();
          throw new Error(`Google token exchange failed: ${tokenRes.statusText} - ${errText}`);
        }

        const tokens = (await tokenRes.json()) as { access_token: string };

        // Fetch User Info
        const userRes = await fetch(
          `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokens.access_token}`
        );
        if (!userRes.ok) {
          throw new Error('Failed to retrieve user profile from Google');
        }

        const profile = (await userRes.json()) as { email: string; name: string };
        email = profile.email;
        name = profile.name;
      } catch (err) {
        logger.error('Google OAuth callback error', {
          service: 'auth',
          error: err instanceof Error ? err.message : String(err),
        });
        throw new BadRequestError('Failed to authenticate with Google OAuth2');
      }
    }

    // Find or create User
    let user = await this.repo.findUserByEmail(email);
    if (!user) {
      // User signing up through Google gets CANDIDATE role by default
      const randomPassword = crypto.randomUUID();
      const passwordHash = await bcrypt.hash(randomPassword, BCRYPT_COST);
      
      user = await this.repo.createUser({
        email,
        passwordHash,
        role: 'CANDIDATE',
        emailVerified: true,
      });

      // Create associated Candidate profile
      await this.repo.createCandidate({
        userId: user.id,
        name,
      });

      logger.info(`New user registered via Google SSO: ${email}`, {
        service: 'auth',
        userId: user.id,
      });
    } else {
      logger.info(`Existing user logged in via Google SSO: ${email}`, {
        service: 'auth',
        userId: user.id,
      });
    }

    const tokens = await this.generateTokenPair(user.id, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      ...tokens,
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
