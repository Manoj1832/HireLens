// packages/shared-types/src/index.ts

export type Role = 'RECRUITER' | 'CANDIDATE' | 'ADMIN';
export type JobStatus = 'OPEN' | 'CLOSED' | 'ARCHIVED';
export type PipelineStage = 'APPLIED' | 'SCREENING' | 'ASSESSMENT' | 'INTERVIEW' | 'OFFER' | 'REJECTED';
export type ParseStatus = 'PENDING' | 'PARSING' | 'ANALYZING' | 'READY' | 'FAILED';
export type AssessmentStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
export type InterviewType = 'TECHNICAL' | 'PORTFOLIO' | 'SYSTEM_DESIGN' | 'SOFT_SKILLS';
export type InterviewStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

// DTO structures for standard API payloads

export interface UserDTO {
  id: string;
  email: string;
  role: Role;
  emailVerified: boolean;
  createdAt: string;
}

export interface RecruiterDTO {
  id: string;
  userId: string;
  companyName: string;
  department: string;
}

export interface CandidateDTO {
  id: string;
  userId: string;
  name: string;
  phone?: string;
  location?: string;
  skills: string[];
}

export interface JobDTO {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  recruiterId: string;
  status: JobStatus;
  createdAt: string;
}

export interface ApplicationDTO {
  id: string;
  jobId: string;
  candidateId: string;
  resumeId?: string;
  stage: PipelineStage;
  atsScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeDTO {
  id: string;
  candidateId: string;
  storageUrl: string;
  parseStatus: ParseStatus;
  parsedJson?: {
    skills: string[];
    experience: { title: string; years: number }[];
    education: string[];
  };
  atsResult?: {
    atsScore: number;
    missingKeywords: string[];
    suggestions: string[];
  };
  createdAt: string;
}

export interface AssessmentDTO {
  id: string;
  applicationId: string;
  status: AssessmentStatus;
  score?: number;
  proctoringScore?: number;
  tabSwitchesCount: number;
  cameraFlagsCount: number;
  audioFlagsCount: number;
  codeWritten?: string;
  testCasesPassed?: number;
  testCasesTotal?: number;
  createdAt: string;
}

export interface InterviewDTO {
  id: string;
  applicationId: string;
  scheduledTime: string;
  durationMinutes: number;
  type: InterviewType;
  status: InterviewStatus;
  evaluationReport?: {
    softSkills: string;
    technicalDepth: string;
    recommendation: string;
  };
  transcriptionExcerpt?: string;
  createdAt: string;
}

// Standard API Response envelope
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
  };
}
