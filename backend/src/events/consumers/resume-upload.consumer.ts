import { createConsumer } from '../../integrations/kafka.js';
import { redis } from '../../integrations/redis.js';
import { prisma } from '../../integrations/prisma.js';
import { logger } from '../../utils/logger.js';
import { indexResumeInQdrant } from '../../modules/resume/resume.vector.js';


/**
 * Kafka consumer for the 'resume-upload' topic.
 *
 * In the walking skeleton this simulates what the ML service (FastAPI) would do:
 * 1. Receive the ResumeUploadedEvent
 * 2. Check idempotency (skip if already processed)
 * 3. Update resume status through PARSING → ANALYZING → READY
 * 4. Persist mock parsed results
 *
 * In production, the FastAPI service consumes this topic instead,
 * does real NLP parsing, and publishes a ResumeAnalyzedEvent back.
 */
export async function startResumeUploadConsumer(): Promise<void> {
  const consumer = createConsumer('hirelens-resume-processor');

  try {
    await consumer.connect();
    await consumer.subscribe({ topic: 'resume-upload', fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ message }) => {
        const raw = message.value?.toString();
        if (!raw) return;

        let event: any;
        try {
          event = JSON.parse(raw);
        } catch {
          logger.error('Failed to parse resume-upload message', { service: 'kafka' });
          return;
        }

        const { eventId, resumeId, correlationId } = event;

        // Idempotency check via Redis
        const alreadyProcessed = await redis.sismember('processed-events:resume-upload', eventId);
        if (alreadyProcessed) {
          logger.info(`Skipping already-processed event ${eventId}`, {
            service: 'kafka',
            correlationId,
          });
          return;
        }

        logger.info(`Processing resume upload event for resume ${resumeId}`, {
          service: 'kafka',
          correlationId,
          eventId,
        });

        try {
          // Stage 1: PARSING
          await prisma.resume.update({
            where: { id: resumeId },
            data: { parseStatus: 'PARSING' },
          });

          // Simulate ML parsing delay
          await new Promise((r) => setTimeout(r, 1500));

          // Stage 2: ANALYZING
          await prisma.resume.update({
            where: { id: resumeId },
            data: { parseStatus: 'ANALYZING' },
          });

          await new Promise((r) => setTimeout(r, 1000));

          // Stage 3: READY with mock parsed results
          const mockParsedJson = {
            skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Kafka'],
            experience: [
              { title: 'Senior Backend Engineer', years: 4 },
              { title: 'Full Stack Developer', years: 2 },
            ],
            education: ['B.Tech Computer Science — PSG College of Technology'],
          };

          await prisma.resume.update({
            where: { id: resumeId },
            data: {
              parseStatus: 'READY',
              parsedJson: mockParsedJson,
              atsResult: {
                atsScore: 87,
                missingKeywords: ['Kubernetes', 'gRPC'],
                suggestions: [
                  'Add containerization experience',
                  'Mention CI/CD pipeline ownership',
                ],
              },
            },
          });

          // Index in Qdrant Vector DB for Semantic Search (Non-blocking but logged)
          try {
            await indexResumeInQdrant(
              resumeId,
              event.candidateId,
              mockParsedJson.skills,
              'Senior Backend Engineer (4 years) and Full Stack Developer (2 years)'
            );
          } catch (qdrantErr) {
            logger.warn('Skipping Qdrant indexing due to error (semantic search will be unavailable for this resume)', {
              service: 'kafka',
              resumeId,
            });
          }

          // Mark as processed
          await redis.sadd('processed-events:resume-upload', eventId);
          await redis.expire('processed-events:resume-upload', 86400); // 24h TTL

          logger.info(`Resume ${resumeId} processing complete → READY`, {
            service: 'kafka',
            correlationId,
            eventId,
          });
        } catch (error) {
          // Mark resume as FAILED
          try {
            await prisma.resume.update({
              where: { id: resumeId },
              data: { parseStatus: 'FAILED' },
            });
          } catch {
            // resume might not exist
          }

          logger.error(`Resume processing failed for ${resumeId}`, {
            service: 'kafka',
            correlationId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
    });

    logger.info('Resume upload consumer started', { service: 'kafka' });
  } catch (error) {
    logger.warn('Resume upload consumer failed to start — Kafka may not be running', {
      service: 'kafka',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
