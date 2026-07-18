import { prisma } from '../../integrations/prisma.js';
import type { ParseStatus } from '@prisma/client';

export class ResumeRepository {
  async createResume(data: { candidateId: string; storageUrl: string }) {
    return prisma.resume.create({ data });
  }

  async findResumeById(id: string) {
    return prisma.resume.findUnique({ where: { id } });
  }

  async findResumesByCandidate(candidateId: string) {
    return prisma.resume.findMany({
      where: { candidateId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateParseStatus(id: string, status: ParseStatus) {
    return prisma.resume.update({
      where: { id },
      data: { parseStatus: status },
    });
  }

  async updateParsedResult(
    id: string,
    data: { parsedJson: object; parseStatus: ParseStatus }
  ) {
    return prisma.resume.update({
      where: { id },
      data,
    });
  }

  async updateAtsResult(id: string, atsResult: object) {
    return prisma.resume.update({
      where: { id },
      data: { atsResult, parseStatus: 'READY' },
    });
  }
}
