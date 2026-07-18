import { qdrantClient } from '../../integrations/qdrant.js';
import { getEmbedding } from '../../integrations/ollama.js';
import { prisma } from '../../integrations/prisma.js';
import { logger } from '../../utils/logger.js';
import { BadRequestError } from '../../errors/index.js';

export class SearchService {
  async searchCandidates(query: string, limit = 5) {
    if (!qdrantClient) {
      throw new BadRequestError('Semantic search is currently disabled (Qdrant client not initialized).');
    }

    logger.info('Performing semantic search...', { service: 'search', query, limit });

    // 1. Generate embedding vector of the search query via Ollama
    const queryVector = await getEmbedding(query);

    // 2. Query Qdrant for nearest neighbors in the 'resumes' collection
    const matches = await qdrantClient.search('resumes', {
      vector: queryVector,
      limit,
      with_payload: true,
    });

    logger.info(`Qdrant returned ${matches.length} matches.`, { service: 'search' });

    if (matches.length === 0) {
      return [];
    }

    // 3. Extract IDs and scores
    const results = matches.map((match) => {
      const payload = match.payload as {
        resumeId: string;
        candidateId: string;
        skills: string[];
        text: string;
      };

      return {
        resumeId: payload.resumeId,
        candidateId: payload.candidateId,
        score: match.score,
        matchedText: payload.text,
      };
    });

    // 4. Resolve candidate and resume info from Prisma database
    const candidateIds = results.map((r) => r.candidateId);
    const candidates = await prisma.candidate.findMany({
      where: { id: { in: candidateIds } },
      include: {
        user: {
          select: {
            email: true,
          },
        },
        resumes: {
          select: {
            id: true,
            parseStatus: true,
            atsResult: true,
          },
        },
      },
    });

    // 5. Merge databases records and scores
    const candidatesMap = new Map(candidates.map((c) => [c.id, c]));

    return results
      .map((res) => {
        const candidate = candidatesMap.get(res.candidateId);
        if (!candidate) return null;

        return {
          candidateId: candidate.id,
          name: candidate.name,
          email: candidate.user.email,
          skills: candidate.skills,
          resumeId: res.resumeId,
          score: res.score,
          atsResult: candidate.resumes.find((r) => r.id === res.resumeId)?.atsResult || null,
        };
      })
      .filter((item) => item !== null);
  }
}
