import { Router } from 'express';
import { prisma } from '../../integrations/prisma.js';
import { redis } from '../../integrations/redis.js';
import { isKafkaAvailable } from '../../integrations/kafka.js';

const router = Router();

router.get('/health', async (_req, res) => {
  const checks: Record<string, string> = {
    api: 'ok',
    kafka: isKafkaAvailable ? 'connected' : 'unavailable',
  };

  // Postgres check
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.postgres = 'connected';
  } catch {
    checks.postgres = 'unavailable';
  }

  // Redis check
  try {
    await redis.set('health-check', 'ok', { ex: 10 });
    const val = await redis.get('health-check');
    checks.redis = val === 'ok' ? 'connected' : 'unavailable';
  } catch {
    checks.redis = 'unavailable';
  }

  const allHealthy = Object.values(checks).every(
    (v) => v === 'ok' || v === 'connected'
  );

  res.status(allHealthy ? 200 : 503).json({
    success: true,
    message: allHealthy ? 'All systems operational' : 'Degraded mode',
    data: checks,
    meta: {
      requestId: '',
      timestamp: new Date().toISOString(),
    },
  });
});

export { router as healthRoutes };
