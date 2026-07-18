import crypto from 'crypto';
import { ResumeRepository } from './resume.repository.js';
import { publishEvent } from '../../integrations/kafka.js';
import { NotFoundError, BadRequestError } from '../../errors/index.js';
import { logger } from '../../utils/logger.js';

export class ResumeService {
  private repo: ResumeRepository;

  constructor() {
    this.repo = new ResumeRepository();
  }

  /**
   * Handles a resume file upload:
   * 1. Persist the resume record with PENDING status
   * 2. Publish a ResumeUploadedEvent to Kafka so the ML service picks it up
   * 3. Return the resume record for the client to poll status
   */
  async uploadResume(
    candidateId: string,
    file: Express.Multer.File,
    correlationId: string
  ) {
    if (!file) {
      throw new BadRequestError('No file uploaded');
    }

    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestError('Only PDF and DOCX files are accepted');
    }

    // In production this would be an S3/GCS presigned URL.
    // For the walking skeleton we store the local path.
    const storageUrl = `/uploads/resumes/${file.filename}`;

    const resume = await this.repo.createResume({ candidateId, storageUrl });

    // Publish Kafka event for async ML processing
    const eventId = crypto.randomUUID();
    await publishEvent(
      'resume-upload',
      {
        version: 1,
        eventId,
        resumeId: resume.id,
        candidateId,
        storageUrl,
        correlationId,
        timestamp: new Date().toISOString(),
      },
      correlationId
    );

    logger.info('Resume uploaded and event published', {
      service: 'resume',
      resumeId: resume.id,
      candidateId,
      correlationId,
    });

    return {
      id: resume.id,
      candidateId: resume.candidateId,
      storageUrl: resume.storageUrl,
      parseStatus: resume.parseStatus,
      createdAt: resume.createdAt.toISOString(),
    };
  }

  /**
   * Returns the current resume record, including parse status.
   * The frontend polls this to drive the multi-stage upload UI:
   * PENDING → PARSING → ANALYZING → READY
   */
  async getResumeStatus(resumeId: string) {
    const resume = await this.repo.findResumeById(resumeId);
    if (!resume) {
      throw new NotFoundError('Resume not found');
    }

    return {
      id: resume.id,
      candidateId: resume.candidateId,
      storageUrl: resume.storageUrl,
      parseStatus: resume.parseStatus,
      parsedJson: resume.parsedJson,
      atsResult: resume.atsResult,
      createdAt: resume.createdAt.toISOString(),
    };
  }

  async listResumesForCandidate(candidateId: string) {
    const resumes = await this.repo.findResumesByCandidate(candidateId);
    return resumes.map((r) => ({
      id: r.id,
      storageUrl: r.storageUrl,
      parseStatus: r.parseStatus,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}
