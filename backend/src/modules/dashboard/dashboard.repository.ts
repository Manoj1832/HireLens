import { prisma } from '../../integrations/prisma.js';

export class DashboardRepository {
  async getCandidateCount() {
    return prisma.candidate.count();
  }

  async getJobCount(status?: 'OPEN' | 'CLOSED' | 'ARCHIVED') {
    return prisma.job.count(status ? { where: { status } } : undefined);
  }

  async getApplicationCountByStage() {
    const stages = await prisma.application.groupBy({
      by: ['stage'],
      _count: { id: true },
    });
    return stages.map((s) => ({ stage: s.stage, count: s._count.id }));
  }

  async getRecentApplications(limit = 10) {
    return prisma.application.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        candidate: { select: { name: true, skills: true } },
        job: { select: { title: true } },
      },
    });
  }

  async getResumeStatusBreakdown() {
    const statuses = await prisma.resume.groupBy({
      by: ['parseStatus'],
      _count: { id: true },
    });
    return statuses.map((s) => ({ status: s.parseStatus, count: s._count.id }));
  }
}
