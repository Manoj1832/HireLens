import { Redis } from '@upstash/redis';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

let redis: Redis;

try {
  redis = new Redis({
    url: config.upstashRedisUrl,
    token: config.upstashRedisToken,
  });
  logger.info('Upstash Redis client initialized', { service: 'redis' });
} catch (error) {
  logger.error('Failed to initialize Upstash Redis client', {
    service: 'redis',
    error: error instanceof Error ? error.message : String(error),
  });
  // Create a no-op fallback so the app doesn't crash if Redis is unavailable
  redis = {
    get: async () => null,
    set: async () => 'OK',
    del: async () => 0,
    sadd: async () => 0,
    sismember: async () => 0,
    expire: async () => 0,
    incr: async () => 0,
  } as unknown as Redis;
}

export { redis };
