import { z } from 'zod';

export const semanticSearchQuerySchema = z.object({
  query: z.string().min(1, 'Search query cannot be empty'),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 5)),
});

export type SemanticSearchQuery = z.infer<typeof semanticSearchQuerySchema>;
