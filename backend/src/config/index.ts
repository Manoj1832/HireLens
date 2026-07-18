import dotenv from 'dotenv';
import path from 'path';

// Load env variables
dotenv.config();

export const config = {
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-key-12345',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-key-12345',
  upstashRedisUrl: process.env.UPSTASH_REDIS_REST_URL || '',
  upstashRedisToken: process.env.UPSTASH_REDIS_REST_TOKEN || '',
  kafkaBrokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  qdrantUrl: process.env.QDRANT_URL || '',
  qdrantApiKey: process.env.QDRANT_API_KEY || '',
  ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
  googleClientId: process.env.GOOGLE_CLIENT_ID || 'mock-google-client-id',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || 'mock-google-client-secret',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/v1/auth/google/callback',
};
