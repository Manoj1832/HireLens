// Mock data for HireLens Enterprise recruitment platform

export const initialJobs = [
  {
    id: "job-1",
    title: "Senior Backend Engineer",
    department: "Engineering",
    location: "San Francisco, CA (Hybrid)",
    status: "Open",
    openDate: "Oct 12, 2026",
    candidatesCount: 148,
    requiredSkills: ["Go", "Kubernetes", "gRPC", "PostgreSQL", "System Design"],
    description: "Looking for a seasoned backend engineer to lead our distributed microservices architecture. Experience with containerization, gRPC APIs, and high-performance databases is required."
  },
  {
    id: "job-2",
    title: "Product Designer",
    department: "Design",
    location: "Austin, TX (Remote)",
    status: "Open",
    openDate: "Oct 15, 2026",
    candidatesCount: 92,
    requiredSkills: ["Figma", "Design Systems", "Prototyping", "User Research"],
    description: "Seeking a designer with a strong visual portfolio and experience crafting clean, premium B2B SaaS web applications. Understanding of spacing grids and accessibility standards is key."
  },
  {
    id: "job-3",
    title: "DevOps Specialist",
    department: "Infrastructure",
    location: "New York, NY (Onsite)",
    status: "Open",
    openDate: "Oct 18, 2026",
    candidatesCount: 64,
    requiredSkills: ["AWS", "Terraform", "CI/CD", "Docker", "Prometheus"],
    description: "Build, scale, and monitor cloud infrastructures. Focus on automate-everything pipelines, infrastructure as code, and site reliability metrics."
  },
  {
    id: "job-4",
    title: "Senior Frontend Engineer",
    department: "Engineering",
    location: "Remote (US)",
    status: "Open",
    openDate: "Oct 20, 2026",
    candidatesCount: 122,
    requiredSkills: ["React", "TypeScript", "Tailwind CSS", "Vite", "Performance Optimization"],
    description: "Passionate React developer who cares about sub-second rendering, state management, and elegant motion/aesthetics."
  }
];

export const initialCandidates = [
  {
    id: "cand-1",
    name: "Sarah Chen",
    initials: "SC",
    location: "San Francisco, CA",
    role: "Senior Backend Engineer",
    email: "sarah.chen@techmail.net",
    phone: "+1 (510) 555-0192",
    appliedDate: "Oct 22, 2026",
    stage: "Interviewed", // Applied, Screened, Assessed, Interviewed, Offered, Hired
    atsScore: 94,
    avatar: "",
    skills: ["Go", "Kubernetes", "Docker", "PostgreSQL", "gRPC", "Redis", "Kafka"],
    matchDetails: {
      matchPercent: 94,
      verifiedPoints: [
        { label: "Resume NLP Parsed", status: "verified", source: "Sarah_Chen_CV.pdf" },
        { label: "LinkedIn Cross-Ref", status: "verified", source: "linkedin.com/in/sarah-chen-dev" },
        { label: "GitHub Contributions", status: "verified", source: "github.com/schen-codes" },
        { label: "Coding Assessment Verified", status: "verified", source: "Test ID #9981" }
      ],
      gaps: ["No direct experience with Rust (Nice-to-have)"],
      strengths: ["Exemplary Go concurrent programming", "Strong Kubernetes cluster setup portfolio", "5+ years enterprise SaaS experience"]
    },
    codeAssessment: {
      status: "Passed",
      score: "100%",
      date: "Oct 23, 2026",
      tabSwitches: 0,
      warnings: 0,
      codeWritten: `// Sarah Chen - Go Solution for Microservices Rate Limiter
package main

import (
	"sync"
	"time"
)

type RateLimiter struct {
	mu       sync.Mutex
	rate     int
	tokens   int
	lastTick time.Time
}

func NewRateLimiter(rate int) *RateLimiter {
	return &RateLimiter{
		rate:     rate,
		tokens:   rate,
		lastTick: time.Now(),
	}
}

func (rl *RateLimiter) Allow() bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(rl.lastTick)
	rl.lastTick = now

	// Replenish tokens based on elapsed time
	rl.tokens += int(elapsed.Seconds() * float64(rl.rate))
	if rl.tokens > rl.rate {
		rl.tokens = rl.rate
	}

	if rl.tokens > 0 {
		rl.tokens--
		return true
	}
	return false
}`,
      testCases: [
        { name: "Basic Request Under Limit", status: "Pass", duration: "1.2ms" },
        { name: "Burst Request Blocked", status: "Pass", duration: "2.1ms" },
        { name: "Token Replenishment Speed", status: "Pass", duration: "10.4ms" }
      ]
    },
    proctoringLogs: [
      { timestamp: "10:02:15", type: "system", message: "Webcam and Mic connected successfully." },
      { timestamp: "10:15:30", type: "activity", message: "Typing speed stable at 75 WPM. Logical patterns matches baseline." },
      { timestamp: "10:45:00", type: "system", message: "Assessment submitted. Session completed normally." }
    ],
    interviewEvaluation: {
      softSkills: "Excellent communicator. Explains architectural trade-offs logically. Aligns with team dynamics.",
      technicalDepth: "Outstanding. Built complex Go packages from scratch. Solid understanding of Kubernetes operators.",
      transcriptionSnippet: " Sarah Chen: 'When designing for 10k requests per second, I prefer using a token bucket rate limiter in Go, running on memory to reduce Redis latency...'",
      recommendation: "Strong Hire"
    },
    timeline: [
      { date: "Oct 22, 2026", title: "Application Received", desc: "Submitted resume and LinkedIn profile. AI matched at 94%." },
      { date: "Oct 22, 2026", title: "Automated Screening Passed", desc: "Match integrity threshold met. Auto-invited to Technical Assessment." },
      { date: "Oct 23, 2026", title: "Coding Test Completed", desc: "Scored 100% in Rate Limiter challenge. Proctoring score: 100/100 (No red flags)." },
      { date: "Oct 24, 2026", title: "Technical Panel Interview", desc: "Conducted by Alex Wright. Soft skills and tech depth verified. Recommended: Strong Hire." }
    ]
  },
  {
    id: "cand-2",
    name: "Marcus Thorne",
    initials: "MT",
    location: "Austin, TX",
    role: "Product Designer",
    email: "marcus.t@designspace.co",
    phone: "+1 (512) 555-8812",
    appliedDate: "Oct 22, 2026",
    stage: "Assessed",
    atsScore: 88,
    avatar: "",
    skills: ["Figma", "Design Systems", "Prototyping", "HTML/CSS", "Wireframing"],
    matchDetails: {
      matchPercent: 88,
      verifiedPoints: [
        { label: "Resume NLP Parsed", status: "verified", source: "Marcus_Thorne_Portfolio.pdf" },
        { label: "LinkedIn Cross-Ref", status: "verified", source: "linkedin.com/in/marcusthorne" },
        { label: "Dribbble/Behance Portfolio Link", status: "verified", source: "behance.net/mthorne" },
        { label: "Design Task Submitted", status: "verified", source: "Figma File #8234-AX" }
      ],
      gaps: ["No direct experience with React frontend code (Nice-to-have)"],
      strengths: ["Impeccable B2B SaaS layout styling", "Excellent feedback from design system case studies", "3 years product design experience"]
    },
    codeAssessment: {
      status: "Passed",
      score: "85%",
      date: "Oct 23, 2026",
      tabSwitches: 1,
      warnings: 1,
      codeWritten: `/* Marcus Thorne - CSS/HTML Design Layout submission */
.card-container {
  display: flex;
  flex-direction: column;
  padding: 16px;
  border-radius: 8px;
  background-color: var(--color-surface);
  border: 1px solid var(--color-outline-variant);
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-container:hover {
  transform: translateY(-2px);
  border-color: var(--color-primary);
}`,
      testCases: [
        { name: "Responsive Layout Rules", status: "Pass", duration: "0.5ms" },
        { name: "CSS Token Validation", status: "Pass", duration: "1.0ms" },
        { name: "Contrast Ratio Checker", status: "Warning", duration: "2.0ms" }
      ]
    },
    proctoringLogs: [
      { timestamp: "14:00:10", type: "system", message: "Webcam and Mic connected." },
      { timestamp: "14:12:45", type: "warning", message: "Window blurred/Tab switched: Recruiter dashboard preview opened." },
      { timestamp: "14:45:00", type: "system", message: "Design file uploaded. Session closed." }
    ],
    interviewEvaluation: {
      softSkills: "Enthusiastic and team-oriented. Presents design critiques constructively.",
      technicalDepth: "Very strong in visual hierarchy and systems design. Basic HTML/CSS knowledge.",
      transcriptionSnippet: " Marcus Thorne: 'I always look at grids first. Spacing systems should be governed by a strict 4px rhythm to establish consistent layout density...'",
      recommendation: "Shortlist for Team Sync"
    },
    timeline: [
      { date: "Oct 22, 2026", title: "Application Received", desc: "Submitted resume and digital design portfolio link." },
      { date: "Oct 23, 2026", title: "Design Challenge Sent", desc: "Auto-triggered Figma review challenge invitation." },
      { date: "Oct 23, 2026", title: "Figma Challenge Submitted", desc: "Uploaded B2B Dashboard design. Automated styling checker score: 85%." }
    ]
  },
  {
    id: "cand-3",
    name: "Elena Lopez",
    initials: "EL",
    location: "New York, NY",
    role: "DevOps Specialist",
    email: "elena.lopez@cloudops.io",
    phone: "+1 (646) 555-9031",
    appliedDate: "Oct 23, 2026",
    stage: "Applied",
    atsScore: 76,
    avatar: "",
    skills: ["AWS", "Terraform", "CI/CD", "Docker", "Python", "Kubernetes"],
    matchDetails: {
      matchPercent: 76,
      verifiedPoints: [
        { label: "Resume NLP Parsed", status: "verified", source: "Elena_Lopez_Resume.pdf" },
        { label: "LinkedIn Cross-Ref", status: "verified", source: "linkedin.com/in/elena-lopez-ops" },
        { label: "GitHub Contributions", status: "unverified", source: "github.com/elena-lopez" },
        { label: "Coding Assessment", status: "pending", source: "TBD" }
      ],
      gaps: ["Missing AWS certified SysOps certificate (Desired)", "Limited experience with Prometheus monitoring alerts"],
      strengths: ["Strong scriptwriting capabilities in Python", "Fluent with Terraform configuration setups", "Excellent containerized CI/CD workflow"]
    },
    codeAssessment: null,
    proctoringLogs: [],
    interviewEvaluation: null,
    timeline: [
      { date: "Oct 23, 2026", title: "Application Received", desc: "Applied via referral link. Automated matching processed. Match Score: 76%." }
    ]
  },
  {
    id: "cand-4",
    name: "David Kim",
    initials: "DK",
    location: "Seattle, WA",
    role: "Senior Backend Engineer",
    email: "david.kim@gotech.org",
    phone: "+1 (206) 555-4309",
    appliedDate: "Oct 21, 2026",
    stage: "Hired",
    atsScore: 92,
    avatar: "",
    skills: ["Go", "Kubernetes", "gRPC", "Docker", "PostgreSQL", "AWS"],
    matchDetails: {
      matchPercent: 92,
      verifiedPoints: [
        { label: "Resume NLP Parsed", status: "verified", source: "David_Kim_Go.pdf" },
        { label: "LinkedIn Cross-Ref", status: "verified", source: "linkedin.com/in/dkim-go" },
        { label: "GitHub Contributions", status: "verified", source: "github.com/dkim-backend" },
        { label: "Coding Assessment Verified", status: "verified", source: "Test ID #9978" }
      ],
      gaps: ["No direct experience with Kafka queues (Nice-to-have)"],
      strengths: ["6+ years building REST and gRPC Go APIs", "Extensive AWS Cloud automation expertise", "Outstanding technical coding score"]
    },
    codeAssessment: {
      status: "Passed",
      score: "95%",
      date: "Oct 22, 2026",
      tabSwitches: 0,
      warnings: 0,
      codeWritten: `// David Kim - Microservices rate limiter
package main

import (
	"sync"
	"time"
)

type Limiter struct {
	mu     sync.Mutex
	cap    int
	tokens int
}

func (l *Limiter) AllowRequest() bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.tokens > 0 {
		l.tokens--
		return true
	}
	return false
}`,
      testCases: [
        { name: "Basic Request Under Limit", status: "Pass", duration: "1.5ms" },
        { name: "Burst Request Blocked", status: "Pass", duration: "2.5ms" },
        { name: "Token Replenishment Speed", status: "Pass", duration: "12.0ms" }
      ]
    },
    proctoringLogs: [
      { timestamp: "09:00:00", type: "system", message: "Session started." },
      { timestamp: "09:40:00", type: "system", message: "Session completed. Passed." }
    ],
    interviewEvaluation: {
      softSkills: "Calm demeanor, team player, clear articulator.",
      technicalDepth: "Excellent grasp of concurrency issues and PostgreSQL index locking mechanisms.",
      transcriptionSnippet: " David Kim: 'I always optimize Go database queries first, ensuring we have proper indices before scaling the database hardware...'",
      recommendation: "Hire immediately"
    },
    timeline: [
      { date: "Oct 21, 2026", title: "Application Received", desc: "Submitted resume." },
      { date: "Oct 22, 2026", title: "Technical Test Passed", desc: "Scored 95% in coding assessment." },
      { date: "Oct 23, 2026", title: "Technical Interview Completed", desc: "Recommended for hire by Alex Wright." },
      { date: "Oct 24, 2026", title: "Offer Extended & Hired", desc: "Corporate contract signed. Set to onboard next month." }
    ]
  }
];

export const initialAgenda = [
  { time: "10:00 AM", candidate: "Sarah Chen", type: "Technical Round", duration: "45m", details: "Backend concurrency & K8s design sync." },
  { time: "1:30 PM", candidate: "Marcus Thorne", type: "Portfolio Review", duration: "60m", details: "Reviewing B2B SaaS dashboard layout mocks." },
  { time: "3:00 PM", candidate: "Engineering Sync", type: "Pipeline Review", duration: "30m", details: "Reviewing active backend candidates." },
  { time: "4:30 PM", candidate: "Elena Lopez", type: "DevOps Screen", duration: "30m", details: "Quick Terraform & CI/CD checklist screen." }
];

export const initialAiInsights = [
  {
    id: "insight-1",
    title: "Skill Gap Detected",
    subtitle: "Senior Backend Candidate Pools",
    text: "Candidate pools for 'Senior Backend' show a 15% decrease in specialized Kubernetes experience this quarter. Consider updating assessment criteria.",
    type: "skill_gap",
    icon: "psychology"
  },
  {
    id: "insight-2",
    title: "Drop-off Alert",
    subtitle: "Recruitment Funnel Warning",
    text: "Funnel conversion from Assessed to Interviewed dropped 8% this week. Primary cause: 'Technical Assessment Complexity' feedback.",
    type: "drop_off",
    icon: "warning"
  },
  {
    id: "insight-3",
    title: "Integrity Flag raised",
    subtitle: "Proctoring Alert",
    text: "Candidate #9842 (Jane Doe) triggered 3 window switches during Coding Assessment Test. System flagged as High Risk.",
    type: "proctoring",
    icon: "gavel"
  }
];

export const initialProctoringAlerts = [
  { id: "alert-1", time: "14:12:45", candidate: "Marcus Thorne", type: "Window Blur", details: "Tab switch detected. Recruiter dashboard query blur.", status: "unread", severity: "medium" },
  { id: "alert-2", time: "10:42:01", candidate: "Jane Doe", type: "Audio Volume Spike", details: "Significant external speaking voices detected.", status: "unread", severity: "high" },
  { id: "alert-3", time: "09:33:12", candidate: "Sam Wilson", type: "Webcam Blocked", details: "Video feed lost for more than 15 seconds.", status: "read", severity: "high" }
];
