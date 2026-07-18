import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/index.js';
import { logger } from '../utils/logger.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const correlationId = (req as any).correlationId || 'unknown';

  if (err instanceof AppError) {
    logger.warn(`Operational error: ${err.message}`, {
      service: 'error',
      statusCode: err.statusCode,
      correlationId,
      path: req.path,
    });

    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      data: null,
      meta: {
        requestId: correlationId,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  // Unexpected / programmer errors
  logger.error(`Unhandled error: ${err.message}`, {
    service: 'error',
    correlationId,
    path: req.path,
    stack: err.stack,
  });

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    data: null,
    meta: {
      requestId: correlationId,
      timestamp: new Date().toISOString(),
    },
  });
}
