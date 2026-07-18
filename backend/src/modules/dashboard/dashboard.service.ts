import { DashboardRepository } from './dashboard.repository.js';
import { redis } from '../../integrations/redis.js';
import { logger } from '../../utils/logger.js';

const CACHE_TTL = 60; // seconds

export class DashboardService {
  private repo: DashboardRepository;

  constructor() {
    this.repo = new DashboardRepository();
  }

  async getSummary(recruiterId: string) {
    // Try cache first
    const cacheKey = `dashboard:recruiter:${recruiterId}:summary`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.debug('Dashboard summary cache hit', { service: 'dashboard', recruiterId });
        return typeof cached === 'string' ? JSON.parse(cached) : cached;
      }
    } catch (err) {
      logger.warn('Redis cache read failed, falling back to DB', { service: 'dashboard' });
    }

    // Build fresh from DB
    const [
      candidateCount,
      openJobCount,
      pipelineStages,
      recentApplications,
      resumeStatuses,
    ] = await Promise.all([
      this.repo.getCandidateCount(),
      this.repo.getJobCount('OPEN'),
      this.repo.getApplicationCountByStage(),
      this.repo.getRecentApplications(10),
      this.repo.getResumeStatusBreakdown(),
    ]);

    const summary = {
      kpis: {
        totalCandidates: candidateCount,
        openPositions: openJobCount,
        pipelineTotal: pipelineStages.reduce((acc, s) => acc + s.count, 0),
      },
      pipeline: pipelineStages,
      recentApplications: recentApplications.map((app) => ({
        id: app.id,
        candidateName: app.candidate.name,
        candidateSkills: app.candidate.skills,
        jobTitle: app.job.title,
        stage: app.stage,
        atsScore: app.atsScore,
        createdAt: app.createdAt.toISOString(),
      })),
      resumePipeline: resumeStatuses,
    };

    // Write to cache
    try {
      await redis.set(cacheKey, JSON.stringify(summary), { ex: CACHE_TTL });
    } catch (err) {
      logger.warn('Redis cache write failed', { service: 'dashboard' });
    }

    return summary;
  }
}
