import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

/**
 * Attaches a correlation ID (from x-request-id header or generated)
 * to every request and logs the request/response cycle.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const correlationId =
    (req.headers['x-request-id'] as string) || crypto.randomUUID();

  req.correlationId = correlationId;
  res.setHeader('x-request-id', correlationId);

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      service: 'api',
      correlationId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    };

    if (res.statusCode >= 400) {
      logger.warn('Request completed with error', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });

  next();
}
