import { prisma } from '../integrations/prisma.js';
import { ensureOllamaModel, getEmbedding } from '../integrations/ollama.js';
import { qdrantClient, ensureCollection } from '../integrations/qdrant.js';
import { indexResumeInQdrant } from '../modules/resume/resume.vector.js';
import { SearchService } from '../modules/search/search.service.js';
import { logger } from '../utils/logger.js';
import bcrypt from 'bcrypt';

async function testAll() {
  logger.info('🚀 Starting Semantic Search & Integration Test Suite...');

  // 1. Verify Ollama Connection & Pull Model
  logger.info('Checking Ollama connection and ensuring model...');
  const ollamaOk = await ensureOllamaModel('all-minilm');
  if (!ollamaOk) {
    logger.error('❌ Ollama is offline or unable to pull the model. Start Ollama and try again.');
    process.exit(1);
  }
  logger.info('✅ Ollama connection verified.');

  // 2. Verify Qdrant Cloud Collection
  if (!qdrantClient) {
    logger.error('❌ Qdrant credentials missing. Set QDRANT_URL and QDRANT_API_KEY.');
    process.exit(1);
  }
  logger.info('Ensuring Qdrant collection is ready...');
  await ensureCollection('resumes', 384);
  logger.info('✅ Qdrant cloud collection verified.');

  // 3. Setup Mock Data in database
  logger.info('Creating mock candidate in database...');
  const testEmail = `candidate.${Date.now()}@hirelens.test`;
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const user = await prisma.user.create({
    data: {
      email: testEmail,
      passwordHash,
      role: 'CANDIDATE',
      candidate: {
        create: {
          name: 'Jane Doe',
          phone: '+15550199',
          location: 'San Francisco, CA',
          skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'GraphQL', 'Next.js'],
        },
      },
    },
    include: {
      candidate: true,
    },
  });

  const candidate = user.candidate!;
  logger.info(`✅ Created candidate ${candidate.name} (ID: ${candidate.id}) with skills: ${candidate.skills.join(', ')}`);

  // Create a Resume record for the candidate
  const resume = await prisma.resume.create({
    data: {
      candidateId: candidate.id,
      storageUrl: '/uploads/resumes/mock-resume-jane-doe.pdf',
      parseStatus: 'READY',
      parsedJson: {
        skills: candidate.skills,
        experienceSummary: 'Senior Software Engineer with 5+ years of full stack web development experience.',
      },
      atsResult: {
        atsScore: 92,
        missingKeywords: ['Docker', 'AWS'],
        suggestions: ['Include cloud deployment experience.'],
      },
    },
  });
  logger.info(`✅ Created resume record (ID: ${resume.id})`);

  // 4. Index Resume in Qdrant Cloud
  logger.info('Indexing resume vector in Qdrant...');
  await indexResumeInQdrant(
    resume.id,
    candidate.id,
    candidate.skills,
    'Senior Software Engineer with 5+ years of full stack web development experience specializing in TypeScript, React and Node.js.'
  );
  logger.info('✅ Resume vector indexed.');

  // 5. Test Semantic Search Query
  logger.info('Performing semantic search test queries...');
  const searchService = new SearchService();

  const queries = [
    'Need a Senior Web Engineer skilled in React & TypeScript',
    'Java spring boot developer',
  ];

  for (const query of queries) {
    logger.info(`🔍 Searching: "${query}"`);
    const results = await searchService.searchCandidates(query, 3);
    logger.info(`Results for "${query}":`);
    console.dir(results, { depth: null, colors: true });

    if (query.includes('React') && results.length > 0) {
      logger.info('🎉 Semantic Match succeeded!');
    }
  }

  logger.info('🎉 Test suite completed successfully!');
  process.exit(0);
}

testAll().catch((err) => {
  logger.error('❌ Integration test failed', { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
