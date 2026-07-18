import type { Request, Response, NextFunction } from 'express';
import { SearchService } from './search.service.js';
import { semanticSearchQuerySchema } from './search.schema.js';
import { BadRequestError } from '../../errors/index.js';

const searchService = new SearchService();

export class SearchController {
  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = semanticSearchQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new BadRequestError(
          parsed.error.issues.map((e: { message: string }) => e.message).join(', ')
        );
      }

      const results = await searchService.searchCandidates(
        parsed.data.query,
        parsed.data.limit
      );

      res.json({
        success: true,
        message: 'Semantic search completed successfully',
        data: results,
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
