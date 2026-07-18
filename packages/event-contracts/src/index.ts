// packages/event-contracts/src/index.ts

export interface BaseKafkaEvent {
  version: number;
  eventId: string;        // UUID - consumer's idempotency key
  correlationId: string;  // Ties back to the original HTTP request for tracing
  timestamp: string;      // ISO 8601 string
}

// 1. resume-upload topic
export interface ResumeUploadedEvent extends BaseKafkaEvent {
  version: 1;
  resumeId: string;
  candidateId: string;
  storageUrl: string;
}

// 2. resume-analysis topic
export interface ResumeAnalyzedEvent extends BaseKafkaEvent {
  version: 1;
  resumeId: string;
  atsScore: number;
  parsedFields: {
    skills: string[];
    experience: { title: string; years: number }[];
    education: string[];
  };
}

// 3. candidate-created topic
export interface CandidateCreatedEvent extends BaseKafkaEvent {
  version: 1;
  candidateId: string;
  userId: string;
  name: string;
  email: string;
}

// 4. assessment-created topic
export interface AssessmentCreatedEvent extends BaseKafkaEvent {
  version: 1;
  assessmentId: string;
  applicationId: string;
  candidateId: string;
}

// 5. assessment-completed topic
export interface AssessmentCompletedEvent extends BaseKafkaEvent {
  version: 1;
  assessmentId: string;
  applicationId: string;
  score: number;
  proctoringScore: number;
  tabSwitchesCount: number;
  cameraFlagsCount: number;
  audioFlagsCount: number;
  codeWritten: string;
}

// 6. interview-completed topic
export interface InterviewCompletedEvent extends BaseKafkaEvent {
  version: 1;
  interviewId: string;
  applicationId: string;
  evaluationReport: {
    softSkills: string;
    technicalDepth: string;
    recommendation: string;
  };
  transcriptionExcerpt: string;
}

// 7. report-generated topic
export interface ReportGeneratedEvent extends BaseKafkaEvent {
  version: 1;
  reportId: string;
  recruiterId: string;
  dataSummary: Record<string, any>;
}

// 8. notification topic
export interface NotificationEvent extends BaseKafkaEvent {
  version: 1;
  userId: string;
  title: string;
  message: string;
  type: 'EMAIL' | 'PUSH' | 'SOCKET';
}

// 9. analytics topic
export interface AnalyticsEvent extends BaseKafkaEvent {
  version: 1;
  eventType: string;
  payload: Record<string, any>;
}
