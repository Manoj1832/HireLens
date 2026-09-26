"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  Briefcase,
  Plus,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  Search,
  Building2,
  Calendar,
  X,
  ExternalLink,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  Check,
  Ban,
  FileText,
  BadgeAlert,
  Sliders,
  TrendingUp,
  Percent,
  Layers,
  ArrowUpDown,
  BookOpen,
  Info,
  ClipboardCheck,
  BarChart3,
  Brain,
  Trash2,
  HelpCircle,
  Zap,
  RotateCcw,
} from "lucide-react";

export interface DriveSkill {
  name: string;
  canonical_name: string;
  requirement_type: "REQUIRED" | "PREFERRED";
  weight: number;
}

export interface DriveEligibility {
  allowed_departments: string[];
  min_cgpa: number;
  eligible_graduation_years: number[];
  max_active_backlogs: number;
}

export interface DriveItem {
  id: string;
  created_by: string;
  company_name: string;
  job_title: string;
  description: string;
  location: string;
  employment_type: string;
  ctc_range: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
  skills: DriveSkill[];
  eligibility: DriveEligibility;
  deadline?: string;
  created_at: string;
  updated_at: string;
}

export interface RankedApplicantItem {
  application_id: string;
  drive_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  roll_number: string;
  department: string;
  verified_cgpa: number;
  graduation_year: number;
  active_backlogs: number;
  application_status: "APPLIED" | "UNDER_REVIEW" | "SHORTLISTED" | "REJECTED" | "WITHDRAWN";
  overall_match_score: number;
  required_skill_score: number;
  preferred_skill_score: number;
  semantic_score: number;
  evidence_score: number;
  matched_required_count: number;
  total_required_count: number;
  matched_preferred_count: number;
  total_preferred_count: number;
  recommendation: string;
  score_version: string;
  applied_at: string;
}

export interface MatchDetailData {
  application_id: string;
  drive_id: string;
  student_id: string;
  scores: {
    required_skill_score: number;
    preferred_skill_score: number;
    semantic_score: number;
    evidence_score: number;
    overall_score: number;
  };
  score_version: string;
  weights_used: Record<string, number>;
  matched_required_skills: Array<{
    skill_name: string;
    is_matched: boolean;
    evidence_found: boolean;
    evidence_snippet?: string;
    evidence_section?: string;
    confidence: number;
  }>;
  missing_required_skills: Array<{
    skill_name: string;
    requirement_type: string;
    weight: number;
  }>;
  matched_preferred_skills: Array<{
    skill_name: string;
    is_matched: boolean;
    evidence_found: boolean;
    evidence_snippet?: string;
    evidence_section?: string;
    confidence: number;
  }>;
  missing_preferred_skills: Array<{
    skill_name: string;
    requirement_type: string;
    weight: number;
  }>;
  semantic_summary: string;
  evidence_summary: string;
  recommendation: string;
}

const DEPARTMENTS = [
  "Computer Science & Engineering",
  "Information Technology",
  "Electronics & Communication Engineering",
  "Electrical & Electronics Engineering",
  "Mechanical Engineering",
  "Biotechnology",
  "Civil Engineering",
];

const GRAD_YEARS = [2024, 2025, 2026, 2027];

export default function DriveManager() {
  const { token, user } = useAuth();

  const [drives, setDrives] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  const [formCompany, setFormCompany] = useState<string>(user?.company_name || "");
  const [formTitle, setFormTitle] = useState<string>("");
  const [formDesc, setFormDesc] = useState<string>("");
  const [formLocation, setFormLocation] = useState<string>("Bengaluru (Hybrid)");
  const [formEmploymentType, setFormEmploymentType] = useState<string>("Full-Time");
  const [formCtc, setFormCtc] = useState<string>("14 - 20 LPA");
  const [formPublishNow, setFormPublishNow] = useState<boolean>(true);

  // Eligibility
  const [formMinCgpa, setFormMinCgpa] = useState<number>(7.5);
  const [formMaxBacklogs, setFormMaxBacklogs] = useState<number>(0);
  const [formAllowedDepts, setFormAllowedDepts] = useState<string[]>([
    "Computer Science & Engineering",
    "Information Technology",
  ]);
  const [formGradYears, setFormGradYears] = useState<number[]>([2025, 2026]);

  // Skills
  const [skillsList, setSkillsList] = useState<DriveSkill[]>([
    { name: "Python", canonical_name: "Python", requirement_type: "REQUIRED", weight: 9 },
    { name: "FastAPI", canonical_name: "FastAPI", requirement_type: "REQUIRED", weight: 8 },
    { name: "PostgreSQL", canonical_name: "PostgreSQL", requirement_type: "PREFERRED", weight: 7 },
  ]);
  const [newSkillName, setNewSkillName] = useState<string>("");
  const [newSkillType, setNewSkillType] = useState<"REQUIRED" | "PREFERRED">("REQUIRED");
  const [newSkillWeight, setNewSkillWeight] = useState<number>(8);

  // Applicant Drawer & Ranking State
  const [selectedDrive, setSelectedDrive] = useState<DriveItem | null>(null);
  const [rankedApplicants, setRankedApplicants] = useState<RankedApplicantItem[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState<boolean>(false);
  const [updatingAppId, setUpdatingAppId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"score" | "date">("score");

  // Explainability Breakdown Modal
  const [activeMatchDetail, setActiveMatchDetail] = useState<MatchDetailData | null>(null);
  const [loadingMatchDetail, setLoadingMatchDetail] = useState<boolean>(false);
  const [inspectedCandidateName, setInspectedCandidateName] = useState<string>("");

  // Assessment Results State
  const [assessmentResultsDrive, setAssessmentResultsDrive] = useState<DriveItem | null>(null);
  const [assessmentResults, setAssessmentResults] = useState<any>(null);
  const [loadingAssessmentResults, setLoadingAssessmentResults] = useState<boolean>(false);

  // Phase 8: Proctoring Report Inspection Modal
  const [activeProctoringReport, setActiveProctoringReport] = useState<any>(null);
  const [inspectedCandidateForProctoring, setInspectedCandidateForProctoring] = useState<string>("");

  // Publish & MCQ Configuration Modal State
  const [publishingDrive, setPublishingDrive] = useState<DriveItem | null>(null);
  const [publishMode, setPublishMode] = useState<"AUTO" | "CUSTOM" | "NONE">("AUTO");
  const [publishDifficulty, setPublishDifficulty] = useState<"EASY" | "MEDIUM" | "HARD" | "BALANCED">("BALANCED");
  const [publishQuestionCount, setPublishQuestionCount] = useState<number>(10);
  const [publishDurationMinutes, setPublishDurationMinutes] = useState<number>(15);
  const [publishPassingScore, setPublishPassingScore] = useState<number>(60);
  const [publishAdaptiveMode, setPublishAdaptiveMode] = useState<boolean>(true);

  // Auto Preview Questions State
  const [previewQuestions, setPreviewQuestions] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [generationMeta, setGenerationMeta] = useState<any>(null);

  // Custom Questions State
  const [customQuestionsList, setCustomQuestionsList] = useState<Array<{
    question_text: string;
    options: string[];
    correct_answer: string;
    explanation: string;
    difficulty: number;
    skill: string;
    topic: string;
    level: string;
  }>>([]);
  const [customQText, setCustomQText] = useState("");
  const [customOptA, setCustomOptA] = useState("");
  const [customOptB, setCustomOptB] = useState("");
  const [customOptC, setCustomOptC] = useState("");
  const [customOptD, setCustomOptD] = useState("");
  const [customCorrectIdx, setCustomCorrectIdx] = useState<number>(0);
  const [customSkill, setCustomSkill] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [customExplanation, setCustomExplanation] = useState("");
  const [customDifficulty, setCustomDifficulty] = useState<number>(5);
  const [customLevel, setCustomLevel] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");

  const [loadingProctoringReport, setLoadingProctoringReport] = useState<boolean>(false);
  const [publishingInProgress, setPublishingInProgress] = useState<boolean>(false);

  const inspectProctoringReport = async (attemptId: string, candidateName: string) => {
    if (!token) return;
    setInspectedCandidateForProctoring(candidateName);
    setLoadingProctoringReport(true);
    setActiveProctoringReport(null);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/proctoring/report/${attemptId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setActiveProctoringReport(await res.json());
      }
    } catch (err) {
      console.error("Error loading proctoring report:", err);
    } finally {
      setLoadingProctoringReport(false);
    }
  };

  const fetchDrives = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:8000/api/v1/drives?my_drives_only=true", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDrives(data);
      } else {
        const err = await res.json().catch(() => ({ detail: "Failed to load drives" }));
        setError(err.detail || "Unable to fetch recruitment drives.");
      }
    } catch (err: any) {
      setError(err.message || "Network error loading recruitment drives.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrives();
  }, [token]);

  // Add skill to form
  const handleAddSkill = () => {
    if (!newSkillName.trim()) return;
    setSkillsList([
      ...skillsList,
      {
        name: newSkillName.trim(),
        canonical_name: newSkillName.trim(),
        requirement_type: newSkillType,
        weight: newSkillWeight,
      },
    ]);
    setNewSkillName("");
  };

  const handleRemoveSkill = (index: number) => {
    setSkillsList(skillsList.filter((_, i) => i !== index));
  };

  // Toggle department
  const toggleDept = (dept: string) => {
    if (formAllowedDepts.includes(dept)) {
      setFormAllowedDepts(formAllowedDepts.filter((d) => d !== dept));
    } else {
      setFormAllowedDepts([...formAllowedDepts, dept]);
    }
  };

  // Toggle grad year
  const toggleGradYear = (year: number) => {
    if (formGradYears.includes(year)) {
      setFormGradYears(formGradYears.filter((y) => y !== year));
    } else {
      setFormGradYears([...formGradYears, year]);
    }
  };

  // Submit create drive
  const handleCreateDrive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (skillsList.length === 0) {
      alert("Please add at least one required or preferred skill.");
      return;
    }
    if (formAllowedDepts.length === 0) {
      alert("Please select at least one eligible department.");
      return;
    }
    if (formGradYears.length === 0) {
      alert("Please select at least one graduation batch.");
      return;
    }

    setCreating(true);
    try {
      const payload = {
        company_name: formCompany || user?.company_name || "Corporate Partner",
        job_title: formTitle,
        description: formDesc,
        location: formLocation,
        employment_type: formEmploymentType,
        ctc_range: formCtc,
        skills: skillsList,
        eligibility: {
          allowed_departments: formAllowedDepts,
          min_cgpa: Number(formMinCgpa),
          eligible_graduation_years: formGradYears,
          max_active_backlogs: Number(formMaxBacklogs),
        },
        publish_now: formPublishNow,
      };

      const res = await fetch("http://localhost:8000/api/v1/drives", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const createdDrive = await res.json();
        setShowCreateModal(false);
        setFormTitle("");
        setFormDesc("");
        await fetchDrives();
        if (formPublishNow && createdDrive) {
          openPublishModal(createdDrive);
        }
      } else {
        const data = await res.json().catch(() => ({ detail: "Creation failed" }));
        alert(data.detail || "Failed to create drive.");
      }
    } catch (err: any) {
      alert(err.message || "Failed to submit drive.");
    } finally {
      setCreating(false);
    }
  };

  // Open Publish & Assessment Configuration Modal
  const openPublishModal = (drive: DriveItem) => {
    setPublishingDrive(drive);
    setPublishMode("AUTO");
    setPublishDifficulty("BALANCED");
    setPublishQuestionCount(10);
    setPublishDurationMinutes(15);
    setPublishPassingScore(60);
    setPublishAdaptiveMode(true);
    setPreviewQuestions([]);
    setPreviewError(null);
    setGenerationMeta(null);
    setCustomQuestionsList([]);
    setCustomQText("");
    setCustomOptA("");
    setCustomOptB("");
    setCustomOptC("");
    setCustomOptD("");
    setCustomCorrectIdx(0);
    setCustomSkill(drive.skills[0]?.name || "Python");
    setCustomTopic("Technical Knowledge");
    setCustomExplanation("");
    setCustomDifficulty(5);
    setCustomLevel("MEDIUM");
  };

  // Preview AI-Generated MCQs
  const handlePreviewQuestions = async () => {
    if (!publishingDrive || !token) return;
    setLoadingPreview(true);
    setPreviewError(null);
    try {
      const skills = publishingDrive.skills?.map((s) => s.name) || ["Python"];
      const res = await fetch("http://localhost:8000/api/v1/assessments/generate-mcqs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          skills,
          difficulty: publishDifficulty,
          count: publishQuestionCount,
          job_title: publishingDrive.job_title,
          drive_id: publishingDrive.id,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: "Failed to generate questions" }));
        throw new Error(errData.detail || "Failed to generate questions");
      }
      const data = await res.json();
      setPreviewQuestions(data.questions || []);
      setGenerationMeta({
        source: data.generation_source,
        model: data.model_name,
        difficulty: data.difficulty_level,
        skills: data.skills_covered,
      });
    } catch (err: any) {
      setPreviewError(err.message || "Failed to preview questions");
    } finally {
      setLoadingPreview(false);
    }
  };

  // Add a recruiter authored custom question
  const handleAddCustomQuestion = () => {
    if (!customQText.trim()) {
      alert("Please enter a question prompt.");
      return;
    }
    const options = [customOptA.trim(), customOptB.trim(), customOptC.trim(), customOptD.trim()];
    if (options.some((opt) => !opt)) {
      alert("Please fill in all 4 options (A, B, C, D).");
      return;
    }
    const correctAns = options[customCorrectIdx];
    if (!correctAns) {
      alert("Please select which option is correct.");
      return;
    }

    setCustomQuestionsList((prev) => [
      ...prev,
      {
        question_text: customQText.trim(),
        options,
        correct_answer: correctAns,
        explanation:
          customExplanation.trim() ||
          `Option ${String.fromCharCode(65 + customCorrectIdx)} is the correct answer according to industry specifications.`,
        difficulty: customDifficulty,
        skill: customSkill.trim() || "Technical",
        topic: customTopic.trim() || "Core Concepts",
        level: customLevel,
      },
    ]);

    // Reset input fields for next question
    setCustomQText("");
    setCustomOptA("");
    setCustomOptB("");
    setCustomOptC("");
    setCustomOptD("");
    setCustomExplanation("");
    setCustomCorrectIdx(0);
  };

  const handleRemoveCustomQuestion = (index: number) => {
    setCustomQuestionsList((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Publish With Assessment
  const handleConfirmPublishWithAssessment = async () => {
    if (!publishingDrive || !token) return;
    if (publishMode === "CUSTOM" && customQuestionsList.length === 0) {
      alert("Please add at least one custom question before publishing.");
      return;
    }

    setPublishingInProgress(true);
    try {
      const payload: any = {
        mode: publishMode,
        difficulty: publishDifficulty,
        question_count: publishQuestionCount,
        duration_seconds: publishDurationMinutes * 60,
        passing_score: publishPassingScore,
        adaptive_mode: publishAdaptiveMode,
      };

      if (publishMode === "CUSTOM") {
        payload.custom_questions = customQuestionsList;
      }

      const res = await fetch(
        `http://localhost:8000/api/v1/assessments/drive/${publishingDrive.id}/publish-with-assessment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: "Failed to publish drive" }));
        throw new Error(errData.detail || "Publishing failed");
      }

      const result = await res.json();
      setPublishingDrive(null);
      await fetchDrives();
      alert(
        `Placement Drive "${publishingDrive.job_title}" published successfully!\nMode: ${publishMode}\nAssessment: ${
          result.assessment_id ? "Created (" + result.question_count + " questions)" : "None (Direct Drive)"
        }`
      );
    } catch (err: any) {
      alert(err.message || "Failed to publish drive with assessment.");
    } finally {
      setPublishingInProgress(false);
    }
  };

  const handleCloseDrive = async (driveId: string) => {
    if (!token) return;
    if (!confirm("Are you sure you want to close this placement drive? Students will no longer be able to apply.")) return;
    try {
      const res = await fetch(`http://localhost:8000/api/v1/drives/${driveId}/close`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchDrives();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Open Ranked Applicants Drawer
  const openApplicantDrawer = async (drive: DriveItem) => {
    setSelectedDrive(drive);
    setLoadingApplicants(true);
    setRankedApplicants([]);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/drives/${drive.id}/ranked-applicants`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRankedApplicants(data.applicants || []);
      }
    } catch (err) {
      console.error("Error fetching ranked applicants:", err);
    } finally {
      setLoadingApplicants(false);
    }
  };

  // Open Assessment Results Modal
  const openAssessmentResults = async (drive: DriveItem) => {
    if (!token) return;
    setAssessmentResultsDrive(drive);
    setLoadingAssessmentResults(true);
    setAssessmentResults(null);
    try {
      // Get assessment for drive
      const asmRes = await fetch(`http://localhost:8000/api/v1/assessments/drive/${drive.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!asmRes.ok) {
        setAssessmentResults({ error: "No assessment configured for this drive." });
        return;
      }
      const asmData = await asmRes.json();
      if (!asmData || !asmData.id) {
        setAssessmentResults({ error: "No assessment configured for this drive." });
        return;
      }

      const resultsRes = await fetch(`http://localhost:8000/api/v1/assessments/${asmData.id}/results`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resultsRes.ok) {
        setAssessmentResults(await resultsRes.json());
      } else {
        setAssessmentResults({ error: "Failed to load assessment results." });
      }
    } catch (err) {
      setAssessmentResults({ error: "Network error loading assessment results." });
    } finally {
      setLoadingAssessmentResults(false);
    }
  };

  // Inspect Match Breakdown Modal
  const inspectMatchBreakdown = async (app: RankedApplicantItem) => {
    if (!token || !selectedDrive) return;
    setInspectedCandidateName(app.student_name);
    setLoadingMatchDetail(true);
    setActiveMatchDetail(null);
    try {
      const res = await fetch(
        `http://localhost:8000/api/v1/drives/${selectedDrive.id}/applications/${app.application_id}/match`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setActiveMatchDetail(data);
      }
    } catch (err) {
      console.error("Error loading match detail:", err);
    } finally {
      setLoadingMatchDetail(false);
    }
  };

  // Update applicant status
  const handleUpdateStatus = async (appId: string, newStatus: string) => {
    if (!token || !selectedDrive) return;
    setUpdatingAppId(appId);
    try {
      const res = await fetch(
        `http://localhost:8000/api/v1/drives/${selectedDrive.id}/applications/${appId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: newStatus,
            notes: `Status updated to ${newStatus} by recruiter.`,
          }),
        }
      );
      if (res.ok) {
        const updated = await res.json();
        setRankedApplicants((prev) =>
          prev.map((a) =>
            a.application_id === appId ? { ...a, application_status: updated.status } : a
          )
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingAppId(null);
    }
  };

  const filteredDrives = drives.filter(
    (d) =>
      d.job_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.skills.some((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const displayedApplicants = [...rankedApplicants].sort((a, b) => {
    if (sortBy === "score") {
      return b.overall_match_score - a.overall_match_score;
    }
    return new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime();
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-navy-900 via-brand-950 to-indigo-950 p-6 rounded-3xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded-full bg-brand-500/20 text-brand-300 px-3 py-1 text-xs font-bold uppercase tracking-wider border border-brand-400/30">
              Campus Recruitment Operations
            </span>
            <span className="rounded-full bg-emerald-500/20 text-emerald-300 px-3 py-1 text-xs font-bold border border-emerald-400/30">
              AI Candidate Ranking Active
            </span>
          </div>
          <h1 className="text-2xl font-black mt-2 tracking-tight">Placement Drives & AI Ranking</h1>
          <p className="text-xs text-navy-200 mt-1 max-w-xl">
            Publish recruitment campaigns with weighted canonical skills. View applicants ranked by multi-factor hybrid match scores (Deterministic + 384-d Semantic + Evidence Strength).
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-brand-500/30 transition active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Create Placement Drive</span>
        </button>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold text-navy-500 uppercase tracking-wider">
            Total Drives
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-navy-900">{drives.length}</span>
            <span className="text-xs text-brand-600 font-semibold">Managed</span>
          </div>
          <p className="mt-1 text-xs text-navy-400">Institutional campus opportunities</p>
        </div>

        <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold text-navy-500 uppercase tracking-wider">
            Active / Published
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">
              {drives.filter((d) => d.status === "PUBLISHED").length}
            </span>
            <span className="text-xs text-emerald-600 font-semibold">Accepting Apps</span>
          </div>
          <p className="mt-1 text-xs text-navy-400">Open for eligible student batches</p>
        </div>

        <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold text-navy-500 uppercase tracking-wider">
            Draft Campaigns
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-700">
              {drives.filter((d) => d.status === "DRAFT").length}
            </span>
            <span className="text-xs text-amber-600 font-semibold">Configuring</span>
          </div>
          <p className="mt-1 text-xs text-navy-400">Review criteria before publishing</p>
        </div>

        <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold text-navy-500 uppercase tracking-wider">
            Closed / Completed
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-navy-600">
              {drives.filter((d) => d.status === "CLOSED").length}
            </span>
            <span className="text-xs text-navy-400 font-semibold">Archived</span>
          </div>
          <p className="mt-1 text-xs text-navy-400">Pipeline evaluations concluded</p>
        </div>
      </div>

      {/* Drives List */}
      <div className="rounded-2xl border border-surface-border bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-base font-bold text-navy-900">Your Placement Drives</h2>
            <p className="text-xs text-navy-500">
              Configure job profiles, inspect candidate pipeline, and review evidence-backed match scores.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-navy-400" />
            <input
              type="text"
              placeholder="Search drives, skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-surface-border bg-surface-subtle pl-9 pr-3 py-2 text-xs text-navy-800 placeholder-navy-400 focus:border-brand-500 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-navy-500">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent mb-2" />
            <p>Loading placement drives...</p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
            {error}
          </div>
        ) : filteredDrives.length === 0 ? (
          <div className="py-12 text-center text-xs text-navy-500">
            <Briefcase className="mx-auto h-8 w-8 text-navy-300 mb-2" />
            <p className="font-semibold">No placement drives found.</p>
            <p className="text-navy-400 mt-0.5">Click &quot;Create Placement Drive&quot; to launch your first campus recruitment campaign.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDrives.map((drive) => (
              <div
                key={drive.id}
                className="group rounded-2xl border border-surface-border bg-white hover:border-brand-300 hover:shadow-md transition p-5"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-bold text-navy-950 text-base">{drive.job_title}</span>
                      <span className="rounded-md bg-navy-100 text-navy-700 px-2 py-0.5 text-xs font-semibold">
                        {drive.company_name}
                      </span>
                      {drive.status === "PUBLISHED" ? (
                        <span className="rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold">
                          PUBLISHED
                        </span>
                      ) : drive.status === "DRAFT" ? (
                        <span className="rounded-md bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-[11px] font-bold">
                          DRAFT
                        </span>
                      ) : (
                        <span className="rounded-md bg-gray-100 text-gray-700 border border-gray-200 px-2 py-0.5 text-[11px] font-bold">
                          CLOSED
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-navy-600 line-clamp-2 max-w-3xl">
                      {drive.description}
                    </p>

                    {/* Metadata chips */}
                    <div className="flex items-center gap-4 text-xs text-navy-500 flex-wrap">
                      <span>📍 {drive.location}</span>
                      <span>💼 {drive.employment_type}</span>
                      <span>💰 {drive.ctc_range}</span>
                      <span>🎓 Min {drive.eligibility?.min_cgpa} CGPA</span>
                      <span>🚫 Max {drive.eligibility?.max_active_backlogs} Backlogs</span>
                    </div>

                    {/* Canonical Skills */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {drive.skills?.map((s, idx) => (
                        <span
                          key={idx}
                          className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold border ${
                            s.requirement_type === "REQUIRED"
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}
                        >
                          {s.name} <span className="text-[9px] opacity-75">(w:{s.weight})</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Right actions */}
                  <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-surface-border">
                    <button
                      type="button"
                      onClick={() => openApplicantDrawer(drive)}
                      className="flex items-center gap-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 px-4 py-2 text-xs font-bold transition shadow-2xs"
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span>Ranked Pipeline & Match</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openAssessmentResults(drive)}
                      className="flex items-center gap-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 px-4 py-2 text-xs font-bold transition shadow-2xs"
                    >
                      <BarChart3 className="h-3.5 w-3.5" />
                      <span>Assessment Scores</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {drive.status === "DRAFT" && (
                        <button
                          type="button"
                          onClick={() => openPublishModal(drive)}
                          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-semibold transition shadow-2xs"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Publish Drive</span>
                        </button>
                      )}
                      {drive.status === "PUBLISHED" && (
                        <button
                          type="button"
                          onClick={() => handleCloseDrive(drive.id)}
                          className="rounded-lg bg-gray-200 hover:bg-gray-300 text-navy-700 px-3 py-1.5 text-xs font-semibold transition"
                        >
                          Close Drive
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Create Placement Drive */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-3xl border border-surface-border bg-white p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-surface-border">
              <div>
                <h3 className="text-base font-bold text-navy-950">Configure New Placement Drive</h3>
                <p className="text-xs text-navy-500">
                  Define job requirements, weighted skills, and deterministic eligibility rules.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-xl p-1.5 text-navy-400 hover:bg-surface-subtle hover:text-navy-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDrive} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-navy-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    required
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    placeholder="e.g. Google, Atlassian, Zoho"
                    className="w-full rounded-xl border border-surface-border px-3 py-2 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy-700 mb-1">Role / Job Title</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Associate SDE - Backend"
                    className="w-full rounded-xl border border-surface-border px-3 py-2 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-700 mb-1">Job Description</label>
                <textarea
                  rows={2}
                  required
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Provide brief details about the role, expectations, and tech stack..."
                  className="w-full rounded-xl border border-surface-border px-3 py-2 text-xs focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-navy-700 mb-1">Location</label>
                  <input
                    type="text"
                    required
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full rounded-xl border border-surface-border px-3 py-2 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy-700 mb-1">Employment Type</label>
                  <select
                    value={formEmploymentType}
                    onChange={(e) => setFormEmploymentType(e.target.value)}
                    className="w-full rounded-xl border border-surface-border px-3 py-2 text-xs focus:border-brand-500 focus:outline-none"
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Internship">Internship</option>
                    <option value="Internship + FTE">Internship + FTE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy-700 mb-1">CTC Range</label>
                  <input
                    type="text"
                    required
                    value={formCtc}
                    onChange={(e) => setFormCtc(e.target.value)}
                    placeholder="e.g. 15 - 22 LPA"
                    className="w-full rounded-xl border border-surface-border px-3 py-2 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Skills Builder */}
              <div className="rounded-2xl border border-surface-border bg-surface-subtle p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-navy-900">Canonical Skills & Weights</span>
                  <span className="text-[11px] text-navy-500">Multi-Factor Candidate Fit Inputs</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {skillsList.map((s, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-2.5 py-1 text-xs font-semibold text-navy-800 shadow-2xs"
                    >
                      <span>{s.name}</span>
                      <span className="text-[10px] text-brand-600 font-bold">
                        ({s.requirement_type}, w:{s.weight})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(idx)}
                        className="text-navy-400 hover:text-red-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    placeholder="Skill (e.g. Docker, PyTorch)"
                    className="rounded-xl border border-surface-border bg-white px-3 py-1.5 text-xs focus:border-brand-500 focus:outline-none"
                  />
                  <select
                    value={newSkillType}
                    onChange={(e) => setNewSkillType(e.target.value as any)}
                    className="rounded-xl border border-surface-border bg-white px-2.5 py-1.5 text-xs focus:border-brand-500 focus:outline-none"
                  >
                    <option value="REQUIRED">Required</option>
                    <option value="PREFERRED">Preferred</option>
                  </select>
                  <div className="flex items-center gap-1 text-xs text-navy-600">
                    <span>Weight:</span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={newSkillWeight}
                      onChange={(e) => setNewSkillWeight(Number(e.target.value))}
                      className="w-14 rounded-xl border border-surface-border bg-white px-2 py-1.5 text-xs text-center focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="rounded-xl bg-navy-900 text-white px-3 py-1.5 text-xs font-semibold hover:bg-navy-800 transition"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Deterministic Eligibility Engine Rules */}
              <div className="rounded-2xl border border-surface-border bg-surface-subtle p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-bold text-navy-900">Deterministic Eligibility Rules (Zero LLM)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-navy-700 mb-1">
                      Minimum CGPA (Verified)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      max={10}
                      value={formMinCgpa}
                      onChange={(e) => setFormMinCgpa(Number(e.target.value))}
                      className="w-full rounded-xl border border-surface-border bg-white px-3 py-1.5 text-xs focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-navy-700 mb-1">
                      Max Active Backlogs Allowed
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={formMaxBacklogs}
                      onChange={(e) => setFormMaxBacklogs(Number(e.target.value))}
                      className="w-full rounded-xl border border-surface-border bg-white px-3 py-1.5 text-xs focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-navy-700 mb-1.5">
                    Allowed Departments
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {DEPARTMENTS.map((dept) => {
                      const isSel = formAllowedDepts.includes(dept);
                      return (
                        <button
                          key={dept}
                          type="button"
                          onClick={() => toggleDept(dept)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold border transition ${
                            isSel
                              ? "bg-brand-50 text-brand-700 border-brand-300"
                              : "bg-white text-navy-600 border-surface-border hover:border-navy-300"
                          }`}
                        >
                          {dept}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-navy-700 mb-1.5">
                    Graduation Batches
                  </label>
                  <div className="flex gap-2">
                    {GRAD_YEARS.map((year) => {
                      const isSel = formGradYears.includes(year);
                      return (
                        <button
                          key={year}
                          type="button"
                          onClick={() => toggleGradYear(year)}
                          className={`rounded-lg px-3 py-1 text-xs font-semibold border transition ${
                            isSel
                              ? "bg-brand-50 text-brand-700 border-brand-300"
                              : "bg-white text-navy-600 border-surface-border hover:border-navy-300"
                          }`}
                        >
                          {year}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Publish Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="publishNow"
                  checked={formPublishNow}
                  onChange={(e) => setFormPublishNow(e.target.checked)}
                  className="rounded border-surface-border text-brand-600 focus:ring-brand-500"
                />
                <label htmlFor="publishNow" className="text-xs font-medium text-navy-800">
                  Publish drive immediately (visible to eligible students for direct application)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-navy-600 hover:bg-surface-subtle"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 text-xs font-bold transition shadow-sm disabled:opacity-50"
                >
                  {creating ? "Submitting..." : formPublishNow ? "Create & Publish" : "Save as Draft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ranked Applicant Review Drawer */}
      {selectedDrive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-5xl rounded-3xl border border-surface-border bg-white p-6 shadow-2xl my-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-surface-border">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-navy-950">
                    Ranked Pipeline: {selectedDrive.job_title}
                  </span>
                  <span className="rounded-md bg-indigo-50 text-indigo-700 px-2 py-0.5 text-xs font-bold">
                    {selectedDrive.company_name}
                  </span>
                  <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                    Score Version: v1.0
                  </span>
                </div>
                <p className="text-xs text-navy-500 mt-0.5">
                  Multi-factor hybrid ranking: Required Skills (40%), Semantic (25%), Evidence (20%), Preferred (15%).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDrive(null)}
                className="rounded-xl p-1.5 text-navy-400 hover:bg-surface-subtle hover:text-navy-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Pipeline Controls & Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 my-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-navy-500">Sort By:</span>
                <button
                  type="button"
                  onClick={() => setSortBy("score")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    sortBy === "score"
                      ? "bg-navy-900 text-white shadow-xs"
                      : "bg-surface-subtle text-navy-700 hover:bg-surface-border"
                  }`}
                >
                  Match Score (High to Low)
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy("date")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    sortBy === "date"
                      ? "bg-navy-900 text-white shadow-xs"
                      : "bg-surface-subtle text-navy-700 hover:bg-surface-border"
                  }`}
                >
                  Application Date
                </button>
              </div>

              <div className="text-xs text-navy-500">
                Total Evaluated: <span className="font-bold text-navy-900">{rankedApplicants.length} Candidates</span>
              </div>
            </div>

            {/* Candidates List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {loadingApplicants ? (
                <div className="py-16 text-center text-xs text-navy-500">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent mb-2" />
                  <p>Running hybrid match scoring engine across candidate pool...</p>
                </div>
              ) : displayedApplicants.length === 0 ? (
                <div className="py-16 text-center text-xs text-navy-500">
                  <Users className="mx-auto h-8 w-8 text-navy-300 mb-2" />
                  <p className="font-semibold">No students have applied yet.</p>
                  <p className="text-navy-400">Applications from eligible candidates will be evaluated and ranked here.</p>
                </div>
              ) : (
                displayedApplicants.map((app, index) => {
                  const matchScore = Math.round(app.overall_match_score);
                  const isStrong = matchScore >= 80;
                  const isGood = matchScore >= 65 && matchScore < 80;

                  return (
                    <div
                      key={app.application_id}
                      className="rounded-2xl border border-surface-border bg-white p-4 hover:border-brand-300 transition shadow-2xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {/* Rank badge */}
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-subtle font-black text-xs text-navy-600">
                            #{index + 1}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-navy-950 text-sm">{app.student_name}</span>
                              <span className="rounded-md bg-navy-100 text-navy-700 px-2 py-0.5 text-[10px] font-bold">
                                {app.roll_number || "Verified Student"}
                              </span>
                              <span className="text-xs text-navy-500">{app.department}</span>
                            </div>
                            <p className="text-xs text-navy-400">{app.student_email}</p>
                          </div>
                        </div>

                        {/* Hybrid Score & Action */}
                        <div className="flex items-center gap-3 flex-wrap">
                          {/* Match badge */}
                          <div
                            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black border ${
                              isStrong
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : isGood
                                ? "bg-brand-50 text-brand-700 border-brand-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            <TrendingUp className="h-3.5 w-3.5" />
                            <span>{app.overall_match_score}% Match</span>
                            <span className="text-[10px] uppercase font-bold opacity-80">
                              ({app.recommendation.replace("_", " ")})
                            </span>
                          </div>

                          {/* Status updater */}
                          <select
                            value={app.application_status}
                            disabled={updatingAppId === app.application_id}
                            onChange={(e) => handleUpdateStatus(app.application_id, e.target.value)}
                            className="rounded-lg border border-surface-border bg-white px-2 py-1.5 text-xs font-semibold text-navy-700 focus:border-brand-500 focus:outline-none"
                          >
                            <option value="APPLIED">Applied</option>
                            <option value="UNDER_REVIEW">Under Review</option>
                            <option value="SHORTLISTED">Shortlisted</option>
                            <option value="REJECTED">Rejected</option>
                          </select>
                        </div>
                      </div>

                      {/* Component breakdown bar */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs bg-surface-subtle p-3 rounded-xl">
                        <div>
                          <span className="text-[10px] text-navy-400 block">Req Skills (40%)</span>
                          <span className="font-bold text-navy-800">
                            {app.matched_required_count}/{app.total_required_count} ({app.required_skill_score}%)
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-navy-400 block">Semantic Fit (25%)</span>
                          <span className="font-bold text-brand-700">{app.semantic_score}%</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-navy-400 block">Evidence Quality (20%)</span>
                          <span className="font-bold text-emerald-700">{app.evidence_score}%</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-navy-400 block">Pref Skills (15%)</span>
                          <span className="font-semibold text-navy-700">
                            {app.matched_preferred_count}/{app.total_preferred_count} ({app.preferred_skill_score}%)
                          </span>
                        </div>
                        <div className="col-span-2 sm:col-span-1 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => inspectMatchBreakdown(app)}
                            className="text-xs font-bold text-brand-600 hover:text-brand-800 flex items-center gap-1"
                          >
                            <span>Inspect Breakdown</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-4 border-t border-surface-border flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDrive(null)}
                className="rounded-xl bg-navy-900 text-white px-5 py-2 text-xs font-bold hover:bg-navy-800 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Transparent Explainable Match Breakdown (Section 25) */}
      {inspectedCandidateName && (activeMatchDetail || loadingMatchDetail) && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-navy-950/70 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-3xl border border-surface-border bg-white p-6 shadow-2xl my-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-navy-950">
                    Candidate Match Audit: {inspectedCandidateName}
                  </h3>
                  <span className="rounded-md bg-brand-50 text-brand-700 px-2 py-0.5 text-[10px] font-bold border border-brand-200">
                    AI Fit & Evidence Analysis
                  </span>
                </div>
                <p className="text-xs text-navy-500">
                  Detailed evidence citations, section attribution, and multi-factor breakdown.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveMatchDetail(null);
                  setInspectedCandidateName("");
                }}
                className="rounded-xl p-1.5 text-navy-400 hover:bg-surface-subtle hover:text-navy-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingMatchDetail || !activeMatchDetail ? (
              <div className="py-12 text-center text-xs text-navy-500">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent mb-2" />
                <p>Generating evidence citations and semantic evaluation...</p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Score Banner */}
                <div className="flex items-center justify-between bg-gradient-to-r from-navy-900 to-indigo-950 p-4 rounded-2xl text-white">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-navy-300">Composite Hybrid Match</div>
                    <div className="text-2xl font-black">{activeMatchDetail.scores.overall_score}%</div>
                  </div>
                  <div className="text-right">
                    <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
                      {activeMatchDetail.recommendation.replace("_", " ")}
                    </span>
                    <div className="text-[10px] text-navy-300 mt-1">Score Engine {activeMatchDetail.score_version}</div>
                  </div>
                </div>

                {/* Score Bars */}
                <div className="space-y-2 bg-surface-subtle p-3 rounded-2xl">
                  <div>
                    <div className="flex justify-between font-semibold text-navy-800 mb-1">
                      <span>Required Skills (40% weight)</span>
                      <span>{activeMatchDetail.scores.required_skill_score}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-navy-200 overflow-hidden">
                      <div
                        className="h-full bg-brand-600 rounded-full"
                        style={{ width: `${activeMatchDetail.scores.required_skill_score}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-semibold text-navy-800 mb-1">
                      <span>Semantic Domain Similarity (25% weight)</span>
                      <span>{activeMatchDetail.scores.semantic_score}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-navy-200 overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{ width: `${activeMatchDetail.scores.semantic_score}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-semibold text-navy-800 mb-1">
                      <span>Evidence Quality & Depth (20% weight)</span>
                      <span>{activeMatchDetail.scores.evidence_score}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-navy-200 overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full"
                        style={{ width: `${activeMatchDetail.scores.evidence_score}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-semibold text-navy-800 mb-1">
                      <span>Preferred Skills Bonus (15% weight)</span>
                      <span>{activeMatchDetail.scores.preferred_skill_score}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-navy-200 overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${activeMatchDetail.scores.preferred_skill_score}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Natural language summaries */}
                <div className="p-3 bg-brand-50/50 rounded-2xl border border-brand-100 space-y-1">
                  <div className="font-bold text-brand-900 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-brand-600" />
                    <span>Semantic Domain Alignment</span>
                  </div>
                  <p className="text-navy-700">{activeMatchDetail.semantic_summary}</p>
                </div>

                <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-1">
                  <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Skill Evidence Audit</span>
                  </div>
                  <p className="text-navy-700">{activeMatchDetail.evidence_summary}</p>
                </div>

                {/* Required Skills Checklist */}
                <div>
                  <h4 className="font-bold text-navy-900 mb-2">Required Skills Breakdown</h4>
                  <div className="space-y-2">
                    {activeMatchDetail.matched_required_skills.map((s, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/30 flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-800 flex items-center gap-1">
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            {s.skill_name}
                          </span>
                          {s.evidence_section && (
                            <span className="rounded-md bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 font-bold">
                              {s.evidence_section}
                            </span>
                          )}
                        </div>
                        {s.evidence_snippet && (
                          <p className="text-[11px] text-navy-600 italic bg-white/70 p-2 rounded-lg border border-emerald-100">
                            &quot;{s.evidence_snippet}&quot;
                          </p>
                        )}
                      </div>
                    ))}

                    {activeMatchDetail.missing_required_skills.map((s, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl border border-red-200 bg-red-50/30 flex items-center justify-between"
                      >
                        <span className="font-bold text-red-700 flex items-center gap-1">
                          <X className="h-3.5 w-3.5 text-red-500" />
                          {s.skill_name}
                        </span>
                        <span className="text-[10px] text-red-600 font-semibold">Missing from profile/resume</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-surface-border">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMatchDetail(null);
                      setInspectedCandidateName("");
                    }}
                    className="rounded-xl bg-navy-900 text-white px-4 py-2 text-xs font-bold hover:bg-navy-800 transition"
                  >
                    Close Breakdown
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Assessment Results Modal */}
      {assessmentResultsDrive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-3xl border border-surface-border bg-white p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div>
                <h3 className="text-base font-bold text-navy-950">Assessment Screening Results</h3>
                <p className="text-xs text-navy-500">
                  {assessmentResultsDrive.job_title} • {assessmentResultsDrive.company_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAssessmentResultsDrive(null);
                  setAssessmentResults(null);
                }}
                className="rounded-xl p-1.5 text-navy-400 hover:bg-surface-subtle hover:text-navy-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingAssessmentResults && (
              <div className="py-12 text-center">
                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
                <p className="mt-3 text-xs text-navy-500">Loading assessment analytics...</p>
              </div>
            )}

            {assessmentResults?.error && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 text-center text-xs text-amber-800 font-medium">
                <AlertCircle className="mx-auto h-6 w-6 text-amber-500 mb-2" />
                {assessmentResults.error}
              </div>
            )}

            {assessmentResults && !assessmentResults.error && (
              <div className="space-y-4">
                {/* Analytics Summary */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="rounded-xl bg-surface-subtle border border-surface-border p-3 text-center">
                    <span className="text-[10px] text-navy-400 block">Total Attempts</span>
                    <span className="text-lg font-black text-navy-900">{assessmentResults.total_attempts}</span>
                  </div>
                  <div className="rounded-xl bg-surface-subtle border border-surface-border p-3 text-center">
                    <span className="text-[10px] text-navy-400 block">Avg Score</span>
                    <span className="text-lg font-black text-brand-700">{assessmentResults.average_score}%</span>
                  </div>
                  <div className="rounded-xl bg-surface-subtle border border-surface-border p-3 text-center">
                    <span className="text-[10px] text-navy-400 block">Pass Rate</span>
                    <span className="text-lg font-black text-emerald-600">{assessmentResults.pass_rate}%</span>
                  </div>
                  <div className="rounded-xl bg-surface-subtle border border-surface-border p-3 text-center">
                    <span className="text-[10px] text-navy-400 block">Threshold</span>
                    <span className="text-lg font-black text-navy-600">{assessmentResults.passing_score}%</span>
                  </div>
                </div>

                {/* Candidate Results Table */}
                {assessmentResults.attempts && assessmentResults.attempts.length > 0 ? (
                  <div className="rounded-2xl border border-surface-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-surface-subtle/80 text-navy-500">
                          <th className="text-left px-4 py-2.5 font-semibold">Candidate</th>
                          <th className="text-left px-3 py-2.5 font-semibold">Roll No.</th>
                          <th className="text-center px-3 py-2.5 font-semibold">Score</th>
                          <th className="text-center px-3 py-2.5 font-semibold">Adaptive Level</th>
                          <th className="text-center px-3 py-2.5 font-semibold">Integrity</th>
                          <th className="text-center px-3 py-2.5 font-semibold">Passed</th>
                          <th className="text-center px-3 py-2.5 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assessmentResults.attempts.map((c: any, idx: number) => (
                          <tr
                            key={c.attempt_id}
                            className={`border-t border-surface-border ${
                              idx % 2 === 0 ? "bg-white" : "bg-surface-subtle/30"
                            } hover:bg-brand-50/30 transition`}
                          >
                            <td className="px-4 py-2.5">
                              <div className="font-bold text-navy-950">{c.student_name}</div>
                              <div className="text-[10px] text-navy-400">{c.student_email}</div>
                            </td>
                            <td className="px-3 py-2.5 font-mono text-navy-700">{c.roll_number}</td>
                            <td className="px-3 py-2.5 text-center">
                              <span
                                className={`text-sm font-black ${
                                  c.score >= assessmentResults.passing_score
                                    ? "text-emerald-600"
                                    : "text-amber-600"
                                }`}
                              >
                                {c.score}%
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {c.adaptive_mode ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className="rounded-md bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 text-[10px] font-bold">
                                    L{c.final_difficulty || 5}/10
                                  </span>
                                  {c.theta_estimate !== undefined && c.theta_estimate !== null && (
                                    <span className="text-[9px] font-mono text-navy-400">
                                      &theta;: {c.theta_estimate > 0 ? `+${c.theta_estimate}` : c.theta_estimate}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] text-navy-400">Standard</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => inspectProctoringReport(c.attempt_id, c.student_name)}
                                title="Click to view detailed integrity audit log"
                                className="inline-flex flex-col items-center gap-0.5 hover:opacity-80 transition cursor-pointer"
                              >
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                                    (c.integrity_trust_score ?? 100) >= 90
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : (c.integrity_trust_score ?? 100) >= 70
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-red-50 text-red-700 border-red-200"
                                  }`}
                                >
                                  {c.integrity_trust_score ?? 100}%
                                </span>
                                <span className="text-[9px] text-navy-400 font-semibold uppercase">
                                  {c.integrity_risk_level || "CLEAN"}
                                </span>
                              </button>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {c.passed ? (
                                <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                                  ✓ Pass
                                </span>
                              ) : (
                                <span className="rounded-full bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 text-[10px] font-bold">
                                  ✗ Fail
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className="rounded-lg bg-surface-subtle text-navy-600 border border-surface-border px-2 py-0.5 text-[10px] font-semibold">
                                {c.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-surface-border bg-surface-subtle/50 p-8 text-center text-xs text-navy-400">
                    <ClipboardCheck className="mx-auto h-8 w-8 text-navy-300 mb-2" />
                    No candidates have attempted this assessment yet.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Phase 8: Proctoring Report Inspection Modal */}
      {(loadingProctoringReport || activeProctoringReport) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-xl rounded-3xl border border-surface-border bg-white p-6 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-surface-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-brand-50 text-brand-700 border border-brand-200 px-2 py-0.5 text-[10px] font-bold">
                    Proctoring Audit Log
                  </span>
                  <span className="text-xs text-navy-400 font-mono">
                    Attempt: {activeProctoringReport?.attempt_id?.slice(0, 8)}...
                  </span>
                </div>
                <h3 className="text-base font-bold text-navy-950 pt-1">
                  Candidate Integrity Report — {inspectedCandidateForProctoring}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveProctoringReport(null);
                  setLoadingProctoringReport(false);
                }}
                className="rounded-xl p-1.5 text-navy-400 hover:bg-surface-subtle hover:text-navy-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingProctoringReport ? (
              <div className="py-12 text-center space-y-2">
                <div className="mx-auto h-7 w-7 animate-spin rounded-full border-3 border-brand-600 border-t-transparent" />
                <p className="text-xs text-navy-500 font-medium">Fetching candidate proctoring audit trail...</p>
              </div>
            ) : activeProctoringReport ? (
              <div className="space-y-4">
                {/* Score and Risk Overview */}
                <div className="rounded-2xl border border-surface-border bg-surface-subtle p-4 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <span className="text-[10px] text-navy-400 uppercase font-semibold block">Trust Score</span>
                    <span
                      className={`text-2xl font-black ${
                        activeProctoringReport.trust_score >= 90
                          ? "text-emerald-600"
                          : activeProctoringReport.trust_score >= 70
                          ? "text-amber-600"
                          : "text-red-600"
                      }`}
                    >
                      {activeProctoringReport.trust_score}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-navy-400 uppercase font-semibold block">Risk Level</span>
                    <span className="inline-block mt-1 rounded-full px-2.5 py-0.5 text-xs font-bold border bg-white border-surface-border text-navy-800">
                      {activeProctoringReport.risk_level}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-navy-400 uppercase font-semibold block">Total Incidents</span>
                    <span className="text-2xl font-black text-navy-900">
                      {activeProctoringReport.total_incidents}
                    </span>
                  </div>
                </div>

                {/* Breakdown by Incident Type */}
                <div className="rounded-2xl border border-surface-border p-3.5 space-y-2">
                  <span className="text-xs font-bold text-navy-900 block">Incident Breakdown by Category</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-surface-subtle p-2">
                      <span className="text-[10px] text-navy-400 block">Tab Switches</span>
                      <span className="font-bold text-navy-900">{activeProctoringReport.incidents_by_type?.TAB_SWITCH || 0}</span>
                    </div>
                    <div className="rounded-xl bg-surface-subtle p-2">
                      <span className="text-[10px] text-navy-400 block">Window Blurs</span>
                      <span className="font-bold text-navy-900">{activeProctoringReport.incidents_by_type?.WINDOW_BLUR || 0}</span>
                    </div>
                    <div className="rounded-xl bg-surface-subtle p-2">
                      <span className="text-[10px] text-navy-400 block">Paste Attempts</span>
                      <span className="font-bold text-navy-900">{activeProctoringReport.incidents_by_type?.CLIPBOARD_PASTE || 0}</span>
                    </div>
                    <div className="rounded-xl bg-surface-subtle p-2">
                      <span className="text-[10px] text-navy-400 block">Fullscreen Exits</span>
                      <span className="font-bold text-navy-900">{activeProctoringReport.incidents_by_type?.FULLSCREEN_EXIT || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Audit Trail List */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-navy-900 block">Chronological Telemetry Log</span>
                  {activeProctoringReport.incidents && activeProctoringReport.incidents.length > 0 ? (
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {activeProctoringReport.incidents.map((inc: any, i: number) => (
                        <div
                          key={i}
                          className="rounded-xl border border-surface-border bg-white p-3 flex items-start justify-between text-xs gap-3"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 font-bold text-navy-900">
                              <span className="rounded-md bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 text-[9px] font-bold">
                                {inc.incident_type}
                              </span>
                              <span>{inc.description}</span>
                            </div>
                            <span className="text-[10px] text-navy-400">
                              {new Date(inc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </div>
                          <span className="rounded-full bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 text-[10px] font-bold shrink-0">
                            -{inc.penalty_applied} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 text-center text-xs text-emerald-800 font-medium">
                      ✓ No proctoring incidents logged. Candidate maintained focus throughout the exam session.
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end pt-2 border-t border-surface-border">
              <button
                type="button"
                onClick={() => setActiveProctoringReport(null)}
                className="rounded-xl bg-navy-900 text-white px-4 py-2 text-xs font-bold hover:bg-navy-800 transition"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 9: Publish Drive & MCQ Assessment Configuration Modal */}
      {publishingDrive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-3xl border border-surface-border bg-white shadow-2xl p-6 sm:p-8 my-8 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-surface-border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-navy-900">
                    Publish Placement Drive & Assessment
                  </h3>
                  <p className="text-xs text-navy-500">
                    {publishingDrive.job_title} • {publishingDrive.company_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPublishingDrive(null)}
                className="rounded-xl p-1.5 text-navy-400 hover:bg-surface-subtle hover:text-navy-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="py-5 space-y-6">
              {/* Mode Selection Cards */}
              <div>
                <label className="block text-xs font-bold text-navy-800 uppercase tracking-wider mb-2.5">
                  Select Assessment Method
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Option 1: Hybrid AI Auto */}
                  <div
                    onClick={() => setPublishMode("AUTO")}
                    className={`cursor-pointer rounded-2xl border p-4 transition ${
                      publishMode === "AUTO"
                        ? "border-brand-600 bg-brand-50/40 ring-2 ring-brand-500/20 shadow-xs"
                        : "border-surface-border bg-white hover:border-navy-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-8 w-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                        <Brain className="h-4 w-4" />
                      </div>
                      <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5">
                        AI Recommended
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-navy-900">Auto-Generate (Hybrid AI)</h4>
                    <p className="text-xs text-navy-500 mt-1 line-clamp-2">
                      Llama 3.3 70B & calibrated item bank matched to job requirements.
                    </p>
                  </div>

                  {/* Option 2: Custom Questions */}
                  <div
                    onClick={() => setPublishMode("CUSTOM")}
                    className={`cursor-pointer rounded-2xl border p-4 transition ${
                      publishMode === "CUSTOM"
                        ? "border-brand-600 bg-brand-50/40 ring-2 ring-brand-500/20 shadow-xs"
                        : "border-surface-border bg-white hover:border-navy-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-8 w-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      {customQuestionsList.length > 0 && (
                        <span className="rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5">
                          {customQuestionsList.length} Added
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-navy-900">Custom Questions</h4>
                    <p className="text-xs text-navy-500 mt-1 line-clamp-2">
                      Author company-specific questions with custom options and explanations.
                    </p>
                  </div>

                  {/* Option 3: Direct Publish */}
                  <div
                    onClick={() => setPublishMode("NONE")}
                    className={`cursor-pointer rounded-2xl border p-4 transition ${
                      publishMode === "NONE"
                        ? "border-brand-600 bg-brand-50/40 ring-2 ring-brand-500/20 shadow-xs"
                        : "border-surface-border bg-white hover:border-navy-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-8 w-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                        <Briefcase className="h-4 w-4" />
                      </div>
                    </div>
                    <h4 className="text-sm font-bold text-navy-900">Direct Placement</h4>
                    <p className="text-xs text-navy-500 mt-1 line-clamp-2">
                      Skip online test round. Directly collect and rank candidate resumes.
                    </p>
                  </div>
                </div>
              </div>

              {/* Mode 1: AUTO Configuration */}
              {publishMode === "AUTO" && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-navy-900">Hybrid AI Question Parameters</h4>
                      <p className="text-xs text-navy-500">
                        Cognitive Bloom&apos;s taxonomy calibration across: {publishingDrive.skills?.map(s => s.name).join(", ")}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Difficulty Level: easy, med, high, balanced */}
                    <div>
                      <label className="block text-xs font-semibold text-navy-800 mb-1.5">
                        Target Difficulty Level
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { key: "EASY", label: "Easy", desc: "Foundational syntax & terms" },
                          { key: "MEDIUM", label: "Medium", desc: "Problem solving & logic" },
                          { key: "HARD", label: "Hard", desc: "Advanced internals & concurrency" },
                          { key: "BALANCED", label: "Balanced", desc: "Adaptive IRT distribution" },
                        ].map((d) => (
                          <button
                            key={d.key}
                            type="button"
                            onClick={() => setPublishDifficulty(d.key as any)}
                            className={`rounded-xl border p-2.5 text-left transition ${
                              publishDifficulty === d.key
                                ? "border-indigo-600 bg-indigo-50 font-bold text-indigo-900 ring-1 ring-indigo-500"
                                : "border-surface-border bg-white text-navy-700 hover:border-navy-300"
                            }`}
                          >
                            <span className="block text-xs font-bold">{d.label}</span>
                            <span className="block text-[10px] text-navy-500 leading-tight mt-0.5">{d.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Question Count */}
                    <div>
                      <label className="block text-xs font-semibold text-navy-800 mb-1.5">
                        Question Count
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[5, 10, 15].map((cnt) => (
                          <button
                            key={cnt}
                            type="button"
                            onClick={() => setPublishQuestionCount(cnt)}
                            className={`rounded-xl border py-3 text-center transition ${
                              publishQuestionCount === cnt
                                ? "border-indigo-600 bg-indigo-50 font-bold text-indigo-900 ring-1 ring-indigo-500"
                                : "border-surface-border bg-white text-navy-700 hover:border-navy-300"
                            }`}
                          >
                            <span className="block text-sm font-extrabold">{cnt}</span>
                            <span className="block text-[10px] text-navy-500">Questions</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Preview Button & Live Question View */}
                  <div className="pt-2 border-t border-indigo-100/60">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-navy-600">
                        Preview questions before launching to verify quality & answer keys.
                      </span>
                      <button
                        type="button"
                        onClick={handlePreviewQuestions}
                        disabled={loadingPreview}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-indigo-200 px-3.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50 transition shadow-2xs disabled:opacity-50"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                        <span>{loadingPreview ? "Generating..." : "Generate AI Preview"}</span>
                      </button>
                    </div>

                    {previewError && (
                      <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                        {previewError}
                      </div>
                    )}

                    {previewQuestions.length > 0 && (
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-indigo-950">
                          <span>Generated Questions ({previewQuestions.length})</span>
                          {generationMeta && (
                            <span className="text-[10px] font-mono text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-md">
                              Engine: {generationMeta.source}
                            </span>
                          )}
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {previewQuestions.map((q, idx) => (
                            <div key={idx} className="rounded-xl border border-surface-border bg-white p-3 text-xs">
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="font-bold text-navy-900">
                                  Q{idx + 1}. {q.question_text}
                                </span>
                                <span className="rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold shrink-0">
                                  {q.level} • {q.skill}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-1.5 mt-2">
                                {q.options.map((opt: string, optIdx: number) => {
                                  const isCorrect = opt === q.correct_answer;
                                  return (
                                    <div
                                      key={optIdx}
                                      className={`rounded-lg px-2.5 py-1.5 text-[11px] border flex items-center justify-between ${
                                        isCorrect
                                          ? "border-emerald-300 bg-emerald-50 text-emerald-900 font-semibold"
                                          : "border-slate-200 bg-slate-50 text-slate-700"
                                      }`}
                                    >
                                      <span>
                                        {String.fromCharCode(65 + optIdx)}. {opt}
                                      </span>
                                      {isCorrect && <Check className="h-3 w-3 text-emerald-600 shrink-0 ml-1" />}
                                    </div>
                                  );
                                })}
                              </div>
                              {q.explanation && (
                                <p className="mt-2 text-[10px] text-navy-500 italic bg-surface-subtle p-1.5 rounded-md">
                                  💡 {q.explanation}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Mode 2: CUSTOM Authoring */}
              {publishMode === "CUSTOM" && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/20 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-navy-900">Author Custom MCQ</h4>
                      <p className="text-xs text-navy-500">
                        Create technical questions. Mark the correct answer using the radio indicator.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full">
                      {customQuestionsList.length} Questions Saved
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-navy-800 mb-1">Question Prompt</label>
                      <textarea
                        rows={2}
                        value={customQText}
                        onChange={(e) => setCustomQText(e.target.value)}
                        placeholder="e.g. What is the time complexity of searching in a balanced AVL tree?"
                        className="w-full rounded-xl border border-surface-border px-3 py-2 text-xs text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[
                        { label: "Option A", val: customOptA, setVal: setCustomOptA, idx: 0 },
                        { label: "Option B", val: customOptB, setVal: setCustomOptB, idx: 1 },
                        { label: "Option C", val: customOptC, setVal: setCustomOptC, idx: 2 },
                        { label: "Option D", val: customOptD, setVal: setCustomOptD, idx: 3 },
                      ].map((opt) => (
                        <div key={opt.idx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="correctAnswer"
                            checked={customCorrectIdx === opt.idx}
                            onChange={() => setCustomCorrectIdx(opt.idx)}
                            className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                          />
                          <input
                            type="text"
                            value={opt.val}
                            onChange={(e) => opt.setVal(e.target.value)}
                            placeholder={`${opt.label} text`}
                            className="flex-1 rounded-xl border border-surface-border px-3 py-1.5 text-xs text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                      <div>
                        <label className="block text-xs font-semibold text-navy-800 mb-1">Target Skill</label>
                        <input
                          type="text"
                          value={customSkill}
                          onChange={(e) => setCustomSkill(e.target.value)}
                          placeholder="e.g. Python, SQL"
                          className="w-full rounded-xl border border-surface-border px-3 py-1.5 text-xs text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-navy-800 mb-1">Difficulty Level</label>
                        <select
                          value={customLevel}
                          onChange={(e) => setCustomLevel(e.target.value as any)}
                          className="w-full rounded-xl border border-surface-border px-3 py-1.5 text-xs text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        >
                          <option value="EASY">Easy</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HARD">Hard</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-navy-800 mb-1">Topic / Area</label>
                        <input
                          type="text"
                          value={customTopic}
                          onChange={(e) => setCustomTopic(e.target.value)}
                          placeholder="e.g. Memory Management"
                          className="w-full rounded-xl border border-surface-border px-3 py-1.5 text-xs text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-navy-800 mb-1">Explanation (Optional)</label>
                      <input
                        type="text"
                        value={customExplanation}
                        onChange={(e) => setCustomExplanation(e.target.value)}
                        placeholder="Rationale explaining why the selected option is correct"
                        className="w-full rounded-xl border border-surface-border px-3 py-1.5 text-xs text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      />
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={handleAddCustomQuestion}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 text-xs font-bold transition shadow-xs"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Question</span>
                      </button>
                    </div>

                    {/* Added custom questions list */}
                    {customQuestionsList.length > 0 && (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1 pt-2 border-t border-amber-200">
                        {customQuestionsList.map((cq, idx) => (
                          <div key={idx} className="rounded-xl border border-surface-border bg-white p-2.5 text-xs flex items-center justify-between">
                            <div className="min-w-0 pr-3">
                              <span className="font-bold text-navy-900 truncate block">
                                Q{idx + 1}. {cq.question_text}
                              </span>
                              <span className="text-[10px] text-navy-500">
                                Answer: <strong className="text-emerald-700">{cq.correct_answer}</strong> • Level: {cq.level}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomQuestion(idx)}
                              className="text-rose-500 hover:text-rose-700 p-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Assessment Administration Parameters (shown for AUTO & CUSTOM) */}
              {publishMode !== "NONE" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-surface-border">
                  <div>
                    <label className="block text-xs font-semibold text-navy-800 mb-1">
                      Exam Duration (Minutes)
                    </label>
                    <select
                      value={publishDurationMinutes}
                      onChange={(e) => setPublishDurationMinutes(Number(e.target.value))}
                      className="w-full rounded-xl border border-surface-border px-3 py-2 text-xs text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    >
                      <option value={10}>10 Minutes (Quick Screening)</option>
                      <option value={15}>15 Minutes (Standard Technical)</option>
                      <option value={20}>20 Minutes (Comprehensive)</option>
                      <option value={30}>30 Minutes (Deep Evaluation)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-navy-800 mb-1">
                      Passing Score (%)
                    </label>
                    <select
                      value={publishPassingScore}
                      onChange={(e) => setPublishPassingScore(Number(e.target.value))}
                      className="w-full rounded-xl border border-surface-border px-3 py-2 text-xs text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    >
                      <option value={50}>50% (Standard Benchmark)</option>
                      <option value={60}>60% (Recommended Quality Bar)</option>
                      <option value={70}>70% (Competitive Cohort)</option>
                      <option value={80}>80% (High Rigor)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-border">
              <button
                type="button"
                onClick={() => setPublishingDrive(null)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-navy-600 hover:bg-surface-subtle transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPublishWithAssessment}
                disabled={publishingInProgress}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-xs font-bold transition shadow-sm disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                <span>
                  {publishingInProgress
                    ? "Publishing..."
                    : publishMode === "NONE"
                    ? "Publish Direct Drive"
                    : "Publish Drive & Assessment"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

