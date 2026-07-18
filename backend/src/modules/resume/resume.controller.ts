import type { Request, Response, NextFunction } from 'express';
import { ResumeService } from './resume.service.js';
import { resumeUploadParamsSchema } from './resume.schema.js';
import { BadRequestError } from '../../errors/index.js';

const resumeService = new ResumeService();

function success(
  res: Response,
  data: unknown,
  message: string,
  statusCode = 200
) {
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

export class ResumeController {
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = resumeUploadParamsSchema.safeParse(req.params);
      if (!parsed.success) {
        throw new BadRequestError(
          parsed.error.issues.map((e: { message: string }) => e.message).join(', ')
        );
      }

      const file = req.file;
      if (!file) {
        throw new BadRequestError('Resume file is required');
      }

      const result = await resumeService.uploadResume(
        parsed.data.candidateId,
        file,
        req.correlationId || ''
      );
      success(res, result, 'Resume uploaded successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const resumeId = req.params.resumeId as string;
      if (!resumeId) {
        throw new BadRequestError('Resume ID is required');
      }
      const result = await resumeService.getResumeStatus(resumeId);
      success(res, result, 'Resume status retrieved');
    } catch (error) {
      next(error);
    }
  }

  async listByCandidate(req: Request, res: Response, next: NextFunction) {
    try {
      const candidateId = req.params.candidateId as string;
      if (!candidateId) {
        throw new BadRequestError('Candidate ID is required');
      }
      const result =
        await resumeService.listResumesForCandidate(candidateId);
      success(res, result, 'Resumes retrieved');
    } catch (error) {
      next(error);
    }
  }
}
