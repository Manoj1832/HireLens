import { z } from 'zod';

export const resumeUploadParamsSchema = z.object({
  candidateId: z.string().min(1, 'Candidate ID is required'),
});

export const resumeAtsRequestSchema = z.object({
  resumeId: z.string().min(1, 'Resume ID is required'),
  jobId: z.string().min(1, 'Job ID is required'),
});

export type ResumeUploadParams = z.infer<typeof resumeUploadParamsSchema>;
export type ResumeAtsRequest = z.infer<typeof resumeAtsRequestSchema>;
