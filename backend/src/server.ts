import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { requestLogger } from './middleware/request-logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { generalLimiter } from './middleware/rate-limit.js';
import { connectProducer, disconnectProducer } from './integrations/kafka.js';
import { startResumeUploadConsumer } from './events/consumers/resume-upload.consumer.js';

// Route imports
import { healthRoutes } from './modules/health/health.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { resumeRoutes } from './modules/resume/resume.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { searchRoutes } from './modules/search/search.routes.js';
import { ensureOllamaModel } from './integrations/ollama.js';
import { ensureCollection } from './integrations/qdrant.js';


const app = express();

// ── Security ────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
    },
  },
}));

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

// ── Parsing ─────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Middleware ───────────────────────────────────────────
app.use(requestLogger);
app.use(generalLimiter);

// ── Static uploads (dev only) ───────────────────────────
app.use('/uploads', express.static('uploads'));

// ── Routes ──────────────────────────────────────────────
const API_PREFIX = '/api/v1';

app.use(API_PREFIX, healthRoutes);
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/resumes`, resumeRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);
app.use(`${API_PREFIX}/search`, searchRoutes);


// ── 404 catch-all ───────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    data: null,
    meta: { requestId: '', timestamp: new Date().toISOString() },
  });
});

// ── Error handler (must be last) ────────────────────────
app.use(errorHandler);

// ── Startup ─────────────────────────────────────────────
async function start() {
  // Connect Kafka producer (non-blocking — degrades gracefully)
  await connectProducer();

  // Start Kafka consumers (non-blocking)
  startResumeUploadConsumer().catch(() => {
    logger.warn('Resume consumer did not start — Kafka may be offline', {
      service: 'kafka',
    });
  });

  // Verify and seed vector resources (non-blocking)
  (async () => {
    try {
      const ollamaOk = await ensureOllamaModel('all-minilm');
      if (ollamaOk) {
        await ensureCollection('resumes', 384);
      }
    } catch (err) {
      logger.warn('Could not initialize semantic search dependencies on startup', {
        service: 'api',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  })();


  const port = Number(config.port);
  app.listen(port, () => {
    logger.info(`🚀 HireLens API running on http://localhost:${port}`, {
      service: 'api',
      environment: config.nodeEnv,
    });
    logger.info(`📋 Health check: http://localhost:${port}${API_PREFIX}/health`, {
      service: 'api',
    });
  });
}

// ── Graceful shutdown ───────────────────────────────────
async function shutdown(signal: string) {
  logger.info(`${signal} received — shutting down gracefully`, { service: 'api' });
  await disconnectProducer();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start().catch((err) => {
  logger.error('Fatal startup error', {
    service: 'api',
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  process.exit(1);
});

export { app };
