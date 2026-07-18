import { prisma } from '../../integrations/prisma.js';
import type { Role } from '@prisma/client';

export class AuthRepository {
  async findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  async findUserById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  async createUser(data: {
    email: string;
    passwordHash: string;
    role: Role;
    emailVerified?: boolean;
  }) {
    return prisma.user.create({ data });
  }

  async createCandidate(data: {
    userId: string;
    name: string;
  }) {
    return prisma.candidate.create({
      data: {
        userId: data.userId,
        name: data.name,
      },
    });
  }

  async createRecruiter(data: {
    userId: string;
    companyName: string;
    department: string;
  }) {
    return prisma.recruiter.create({ data });
  }

  // ---- Refresh token operations ----

  async createRefreshToken(data: {
    tokenHash: string;
    userId: string;
    expiresAt: Date;
  }) {
    return prisma.refreshToken.create({ data });
  }

  async findRefreshTokenByHash(tokenHash: string) {
    return prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null },
      include: { user: true },
    });
  }

  async revokeRefreshToken(id: string) {
    return prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Revokes ALL refresh tokens for a user — used when a revoked
   * token is reused (potential theft detection).
   */
  async revokeAllUserRefreshTokens(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async deleteExpiredRefreshTokens() {
    return prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}
