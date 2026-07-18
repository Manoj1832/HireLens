import { QdrantClient } from '@qdrant/js-client-rest';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export let qdrantClient: QdrantClient | null = null;

if (config.qdrantUrl && config.qdrantApiKey) {
  try {
    qdrantClient = new QdrantClient({
      url: config.qdrantUrl,
      apiKey: config.qdrantApiKey,
    });
    logger.info('Qdrant client initialized successfully', { service: 'qdrant' });
  } catch (error) {
    logger.error('Failed to initialize Qdrant client', {
      service: 'qdrant',
      error: error instanceof Error ? error.message : String(error),
    });
  }
} else {
  logger.warn('Qdrant credentials missing. Semantic search will be disabled.', {
    service: 'qdrant',
  });
}

/**
 * Ensures a collection exists in Qdrant with the specified vector size.
 */
export async function ensureCollection(collectionName: string, vectorSize = 384) {
  if (!qdrantClient) {
    throw new Error('Qdrant client not initialized');
  }

  try {
    const collections = await qdrantClient.getCollections();
    const exists = collections.collections.some((c) => c.name === collectionName);

    if (!exists) {
      logger.info(`Creating collection ${collectionName} in Qdrant with vector size ${vectorSize}...`, {
        service: 'qdrant',
      });
      await qdrantClient.createCollection(collectionName, {
        vectors: {
          size: vectorSize,
          distance: 'Cosine',
        },
      });
      logger.info(`Collection ${collectionName} created successfully.`, { service: 'qdrant' });
    }
  } catch (error) {
    logger.error(`Error ensuring collection ${collectionName} exists`, {
      service: 'qdrant',
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
