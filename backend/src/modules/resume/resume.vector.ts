import { qdrantClient, ensureCollection } from '../../integrations/qdrant.js';
import { getEmbedding } from '../../integrations/ollama.js';
import { logger } from '../../utils/logger.js';

export async function indexResumeInQdrant(
  resumeId: string,
  candidateId: string,
  skills: string[],
  experienceText: string
): Promise<void> {
  if (!qdrantClient) {
    logger.warn('Qdrant client not initialized, skipping semantic indexing.', {
      service: 'resume-vector',
      resumeId,
    });
    return;
  }

  const textToEmbed = `Skills: ${skills.join(', ')}. Experience: ${experienceText}`;
  
  try {
    // 1. Generate embedding vector via Ollama (defaults to 'all-minilm', size 384)
    logger.info('Generating embedding for resume...', { service: 'resume-vector', resumeId });
    const vector = await getEmbedding(textToEmbed);

    // 2. Ensure Qdrant collection exists
    await ensureCollection('resumes', 384);

    // Generate a deterministic valid UUID from the CUID resumeId (Qdrant requires UUID or integer ID)
    const crypto = await import('node:crypto');
    const qdrantPointId = crypto
      .createHash('md5')
      .update(resumeId)
      .digest('hex')
      .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');

    // 3. Upsert into Qdrant collection
    logger.info('Upserting vector to Qdrant cloud...', { service: 'resume-vector', resumeId, qdrantPointId });
    await qdrantClient.upsert('resumes', {
      wait: true,
      points: [
        {
          id: qdrantPointId,
          vector,
          payload: {
            resumeId,
            candidateId,
            skills,
            text: textToEmbed,
          },
        },
      ],
    });

    logger.info('Successfully indexed resume in Qdrant Cloud', {
      service: 'resume-vector',
      resumeId,
    });
  } catch (error) {
    logger.error('Failed to index resume in Qdrant', {
      service: 'resume-vector',
      resumeId,
      error: error instanceof Error ? error.message : String(error),
    });
    // We do not want to fail the whole flow if vector database is transiently down,
    // but we log it as an error.
  }
}
