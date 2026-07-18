import pg from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const connectionString = config.databaseUrl;

// pg Pool for the Prisma adapter
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

logger.info('Prisma client initialized with PG adapter', { service: 'db' });

export { prisma };
