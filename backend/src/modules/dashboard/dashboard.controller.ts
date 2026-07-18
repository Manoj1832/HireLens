import type { Request, Response, NextFunction } from 'express';
import { DashboardService } from './dashboard.service.js';

const dashboardService = new DashboardService();

export class DashboardController {
  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const recruiterId = req.user?.userId || 'anonymous';
      const summary = await dashboardService.getSummary(recruiterId);

      res.json({
        success: true,
        message: 'Dashboard summary retrieved',
        data: summary,
        meta: {
          requestId: req.correlationId || '',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
