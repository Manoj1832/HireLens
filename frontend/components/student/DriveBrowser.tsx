"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import AssessmentRunner from "@/components/student/AssessmentRunner";
import FacetedFilterBar, { FacetedFilterState } from "@/components/common/FacetedFilterBar";
import {
  Briefcase,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  FileText,
  Send,
  Sparkles,
  GraduationCap,
  Award,
  Check,
  X,
  ArrowRight,
  Layers,
  TrendingUp,
  Lightbulb,
  BookOpen,
  ClipboardCheck,
  MapPin,
  Calendar,
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

export interface EligibilityStatus {
  drive_id: string;
  student_id: string;
  is_eligible: boolean;
  reasons: string[];
  criteria_breakdown: Record<string, boolean>;
  can_apply: boolean;
  has_active_resume: boolean;
  already_applied: boolean;
}

export interface MyApplication {
  id: string;
  drive_id: string;
  student_id: string;
  resume_id: string;
  status: "APPLIED" | "UNDER_REVIEW" | "SHORTLISTED" | "REJECTED" | "WITHDRAWN";
  applied_at: string;
  updated_at: string;
  notes?: string;
}

export interface StudentSkillGapData {
  drive_id: string;
  job_title: string;
  company_name: string;
  overall_match_score: number;
  required_skill_score: number;
  preferred_skill_score: number;
  semantic_score: number;
  evidence_score: number;
  matched_required_skills: string[];
  missing_required_skills: string[];
  matched_preferred_skills: string[];
  missing_preferred_skills: string[];
  readiness_level: string;
  preparation_tips: string[];
}

interface DriveBrowserProps {
  onNavigateToResume?: () => void;
}

export default function DriveBrowser({ onNavigateToResume }: DriveBrowserProps) {
  const { token, user } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<"available" | "my_apps">("available");
  const [drives, setDrives] = useState<DriveItem[]>([]);
  const [eligibilityMap, setEligibilityMap] = useState<Record<string, EligibilityStatus>>({});
  const [myApplications, setMyApplications] = useState<MyApplication[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [studentProfile, setStudentProfile] = useState<{
    placement_opt_in?: boolean;
    opt_out_reason?: string | null;
  } | null>(null);
  const [isReEnrolling, setIsReEnrolling] = useState<boolean>(false);
  const [filters, setFilters] = useState<FacetedFilterState>({
    searchQuery: "",
    selectedDepartments: [],
    minCgpa: 0,
    minCtcLpa: 0,
    eligibilityOnly: false,
    sortBy: "default",
  });

  // Application submission modal
  const [applyingDrive, setApplyingDrive] = useState<DriveItem | null>(null);
  const [applyNotes, setApplyNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [applicationSuccess, setApplicationSuccess] = useState<boolean>(false);

  // Skill match readiness modal
  const [matchModalDrive, setMatchModalDrive] = useState<DriveItem | null>(null);
  const [skillGapData, setSkillGapData] = useState<StudentSkillGapData | null>(null);
  const [loadingGap, setLoadingGap] = useState<boolean>(false);

  interface AssessmentStatusInfo {
    id: string;
    hasAttempt: boolean;
    passed?: boolean;
    score?: number;
    adaptive_mode?: boolean;
    final_difficulty?: number;
    attempt_number?: number;
    max_attempts?: number;
    can_retake?: boolean;
  }

  // Assessment Runner modal state
  const [assessmentDrive, setAssessmentDrive] = useState<DriveItem | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [assessmentStatusMap, setAssessmentStatusMap] = useState<Record<string, AssessmentStatusInfo>>({});

  const handleQuickOptIn = async () => {
    if (!token) return;
    setIsReEnrolling(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/student/profile/opt-in-status", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ placement_opt_in: true, opt_out_reason: null }),
      });
      if (res.ok) {
        const data = await res.json();
        setStudentProfile(data);
        await fetchDrivesAndEligibility();
      }
    } catch (err) {
      console.error("Error re-enrolling in placements:", err);
    } finally {
      setIsReEnrolling(false);
    }
  };

  const fetchDrivesAndEligibility = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // 0. Fetch profile consent
      try {
        const profRes = await fetch("http://localhost:8000/api/v1/student/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (profRes.ok) {
          const profData = await profRes.json();
          setStudentProfile(profData);
        }
      } catch (e) {
        console.error("Error loading profile consent:", e);
      }

      // 1. Fetch drives
      const drivesRes = await fetch("http://localhost:8000/api/v1/drives", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!drivesRes.ok) return;
      const drivesData: DriveItem[] = await drivesRes.json();
      setDrives(drivesData);

      // 2. Fetch eligibility for each drive in parallel
      const eligPromises = drivesData.map(async (d) => {
        try {
          const res = await fetch(`http://localhost:8000/api/v1/drives/${d.id}/eligibility`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data: EligibilityStatus = await res.json();
            return { driveId: d.id, status: data };
          }
        } catch (e) {
          console.error(e);
        }
        return null;
      });

      const eligResults = await Promise.all(eligPromises);
      const newMap: Record<string, EligibilityStatus> = {};
      eligResults.forEach((r) => {
        if (r) newMap[r.driveId] = r.status;
      });
      setEligibilityMap(newMap);

      // 3. Fetch My Applications
      const appsRes = await fetch("http://localhost:8000/api/v1/applications/my", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (appsRes.ok) {
        const appsData = await appsRes.json();
        setMyApplications(appsData);
      }

      // 4. Fetch assessment availability for each drive
      await fetchAssessmentStatus(drivesData);
    } catch (err) {
      console.error("Error fetching drives & eligibility:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch assessment availability for each drive
  const fetchAssessmentStatus = async (drivesList: DriveItem[]) => {
    if (!token) return;
    const statusMap: Record<string, AssessmentStatusInfo> = {};
    await Promise.all(
      drivesList.map(async (d) => {
        try {
          const asmRes = await fetch(`http://localhost:8000/api/v1/assessments/drive/${d.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (asmRes.ok) {
            const asmData = await asmRes.json();
            if (asmData && asmData.id) {
              // Check if student has an attempt
              const attemptRes = await fetch(`http://localhost:8000/api/v1/assessments/${asmData.id}/my-attempt`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              let hasAttempt = false;
              let passed: boolean | undefined;
              let score: number | undefined;
              let adaptive_mode: boolean | undefined = asmData.adaptive_mode;
              let final_difficulty: number | undefined;
              let attempt_number: number | undefined;
              let max_attempts: number | undefined = asmData.max_attempts || 2;
              let can_retake: boolean | undefined = false;

              if (attemptRes.ok) {
                const attemptData = await attemptRes.json();
                if (attemptData && attemptData.status) {
                  hasAttempt = attemptData.status === "COMPLETED" || attemptData.status === "EXPIRED";
                  passed = attemptData.passed;
                  score = attemptData.score;
                  attempt_number = attemptData.attempt_number;
                  max_attempts = attemptData.max_attempts || 2;
                  can_retake = attemptData.can_retake;
                  if (attemptData.final_difficulty !== undefined && attemptData.final_difficulty !== null) {
                    final_difficulty = attemptData.final_difficulty;
                  }
                }
              }
              statusMap[d.id] = {
                id: asmData.id,
                hasAttempt,
                passed,
                score,
                adaptive_mode,
                final_difficulty,
                attempt_number,
                max_attempts,
                can_retake,
              };
            }
          }
        } catch (e) {
          // Ignore fetch errors for assessment status
        }
      })
    );
    setAssessmentStatusMap(statusMap);
  };

  useEffect(() => {
    fetchDrivesAndEligibility();
  }, [token]);

  // Open Skill Match & Preparation Tips
  const handleOpenSkillMatch = async (drive: DriveItem) => {
    if (!token) return;
    setMatchModalDrive(drive);
    setLoadingGap(true);
    setSkillGapData(null);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/drives/${drive.id}/my-match`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSkillGapData(data);
      } else {
        const err = await res.json().catch(() => ({ detail: "Failed to evaluate match" }));
        alert(err.detail || "Please upload and verify your resume in the Resume tab first.");
        setMatchModalDrive(null);
      }
    } catch (err: any) {
      alert(err.message || "Network error fetching match readiness.");
      setMatchModalDrive(null);
    } finally {
      setLoadingGap(false);
    }
  };

  // Handle Submit Application
  const handleApply = async () => {
    if (!token || !applyingDrive) return;
    setSubmitting(true);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/drives/${applyingDrive.id}/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes: applyNotes }),
      });

      if (res.ok) {
        setApplicationSuccess(true);
        setTimeout(() => {
          setApplyingDrive(null);
          setApplicationSuccess(false);
          setApplyNotes("");
          fetchDrivesAndEligibility();
        }, 1200);
      } else {
        const err = await res.json().catch(() => ({ detail: "Application submission failed" }));
        alert(err.detail || "Unable to submit application.");
      }
    } catch (err: any) {
      alert(err.message || "Network error submitting application.");
    } finally {
      setSubmitting(false);
    }
  };

  const parseCtcMin = (ctcStr: string): number => {
    const match = ctcStr.match(/(\d+(\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  };

  let filteredDrives = drives.filter((d) => {
    // 1. Text search (company, title, description, skills)
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const titleMatch = d.job_title.toLowerCase().includes(q);
      const compMatch = d.company_name.toLowerCase().includes(q);
      const descMatch = (d.description || "").toLowerCase().includes(q);
      const skillMatch = d.skills.some((s) => s.name.toLowerCase().includes(q));
      if (!titleMatch && !compMatch && !descMatch && !skillMatch) return false;
    }

    // 2. Department filter
    if (filters.selectedDepartments.length > 0) {
      const driveDepts = (d.eligibility?.allowed_departments || []).map((x) => x.toLowerCase());
      if (driveDepts.length > 0) {
        const hasDeptOverlap = filters.selectedDepartments.some((sd) =>
          driveDepts.some((dd) => dd.includes(sd.toLowerCase()) || sd.toLowerCase().includes(dd))
        );
        if (!hasDeptOverlap) return false;
      }
    }

    // 3. Min CGPA filter
    if (filters.minCgpa > 0) {
      if (d.eligibility?.min_cgpa && d.eligibility.min_cgpa > filters.minCgpa) {
        return false;
      }
    }

    // 4. Min CTC filter
    if (filters.minCtcLpa > 0) {
      const ctcVal = parseCtcMin(d.ctc_range);
      if (ctcVal > 0 && ctcVal < filters.minCtcLpa) {
        return false;
      }
    }

    // 5. Eligibility only filter
    if (filters.eligibilityOnly) {
      const elig = eligibilityMap[d.id];
      if (!elig || !elig.is_eligible) return false;
    }

    return true;
  });

  // Sorting
  if (filters.sortBy === "ctc_desc") {
    filteredDrives = [...filteredDrives].sort(
      (a, b) => parseCtcMin(b.ctc_range) - parseCtcMin(a.ctc_range)
    );
  } else if (filters.sortBy === "deadline_asc") {
    filteredDrives = [...filteredDrives].sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
  } else if (filters.sortBy === "title_asc") {
    filteredDrives = [...filteredDrives].sort((a, b) => a.job_title.localeCompare(b.job_title));
  }

  return (
    <div className="space-y-5">
      {/* Institutional Placement Participation Advisory (Opt-In / Opt-Out) */}
      {studentProfile && studentProfile.placement_opt_in === false && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 sm:p-5 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="rounded-xl bg-amber-200/80 p-2.5 text-amber-800 shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Campus Placement Consent Inactive
                </span>
                <span className="rounded-md bg-amber-200 px-2 py-0.2 text-[10px] font-extrabold text-amber-900">
                  Opted Out
                </span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                You have opted out of institutional campus placements (Reason:{" "}
                <span className="font-semibold">{studentProfile.opt_out_reason || "Student opted out"}</span>).
                You can review drive criteria and test skill match scores, but application submissions are disabled until you re-enroll.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleQuickOptIn}
            disabled={isReEnrolling}
            className="self-start sm:self-center shrink-0 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 shadow-sm transition disabled:opacity-50"
          >
            {isReEnrolling ? "Re-enrolling..." : "Re-enroll / Opt In Now"}
          </button>
        </div>
      )}

      {/* Sub tabs & Segmented Navigation */}
      <div className="flex items-center justify-between border-b border-surface-border pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab("available")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeSubTab === "available"
                ? "bg-navy-900 text-white shadow-sm"
                : "text-navy-600 hover:bg-surface-subtle"
            }`}
          >
            Available Drives ({drives.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("my_apps")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeSubTab === "my_apps"
                ? "bg-navy-900 text-white shadow-sm"
                : "text-navy-600 hover:bg-surface-subtle"
            }`}
          >
            My Applications ({myApplications.length})
          </button>
        </div>
      </div>

      {/* Senior Engineer Faceted Filter Bar */}
      {activeSubTab === "available" && (
        <FacetedFilterBar
          onFilterChange={setFilters}
          totalResultsCount={drives.length}
          filteredResultsCount={filteredDrives.length}
          placeholder="Search by company name, job title, technology stack, or keywords..."
          showEligibilityToggle={true}
        />
      )}

      {activeSubTab === "available" ? (
        /* Placement Drives List */
        loading ? (
          <div className="py-16 text-center text-xs text-navy-500">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent mb-2" />
            <p>Evaluating campus recruitment eligibility and match models...</p>
          </div>
        ) : filteredDrives.length === 0 ? (
          <div className="rounded-2xl border border-surface-border bg-white p-12 text-center text-xs text-navy-500">
            <Briefcase className="mx-auto h-8 w-8 text-navy-300 mb-2" />
            <p className="font-semibold text-navy-800">No active placement drives found.</p>
            <p className="text-navy-400 mt-1">Check back later when recruiters publish new campus campaigns.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {filteredDrives.map((drive) => {
              const elig = eligibilityMap[drive.id];
              const isEligible = elig ? elig.is_eligible : false;
              const hasResume = elig ? elig.has_active_resume : false;
              const alreadyApplied = elig ? elig.already_applied : false;

              return (
                <div
                  key={drive.id}
                  className="rounded-3xl border border-surface-border bg-white p-5 sm:p-6 shadow-xs hover:border-brand-300 hover:shadow-md transition space-y-4"
                >
                  {/* Top Bar: Company Monogram + Title + Badges */}
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-12 w-12 sm:h-13 sm:w-13 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-navy-900 to-indigo-950 text-white font-black text-base shadow-sm">
                        {drive.company_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base sm:text-lg font-bold text-navy-950 leading-snug">
                            {drive.job_title}
                          </h3>
                          <span className="rounded-lg bg-slate-100 text-navy-800 px-2.5 py-0.5 text-xs font-semibold">
                            {drive.company_name}
                          </span>
                        </div>
                        {/* Meta Row - Zepto / Swiggy style */}
                        <div className="flex items-center gap-2.5 text-xs text-navy-600 flex-wrap pt-0.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2.5 py-0.5 font-bold text-[11px] shadow-2xs">
                            ₹ {drive.ctc_range}
                          </span>
                          <span className="inline-flex items-center gap-1 text-navy-500 font-medium">
                            <MapPin className="h-3.5 w-3.5 text-navy-400" />
                            <span>{drive.location}</span>
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 text-navy-500 font-medium">
                            <Briefcase className="h-3.5 w-3.5 text-navy-400" />
                            <span>{drive.employment_type}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Eligibility Pill */}
                    <div className="self-start md:self-auto shrink-0">
                      {isEligible ? (
                        <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700 shadow-2xs">
                          <ShieldCheck className="h-4 w-4 text-emerald-600" />
                          <span>Eligible to Apply</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-xs font-bold text-rose-700 shadow-2xs">
                          <ShieldAlert className="h-4 w-4 text-rose-600" />
                          <span>Not Eligible</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Drive Description */}
                  <p className="text-xs text-navy-600 leading-relaxed max-w-4xl line-clamp-3">
                    {drive.description}
                  </p>

                  {/* Target Skills Tags */}
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-navy-400">Target Skills:</span>
                    {drive.skills?.map((s, idx) => (
                      <span
                        key={idx}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold border ${
                          s.requirement_type === "REQUIRED"
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                        }`}
                      >
                        {s.name}
                        <span className="text-[10px] ml-1.5 opacity-75 font-normal">
                          {s.requirement_type === "REQUIRED" ? "Mandatory" : "Preferred"}
                        </span>
                      </span>
                    ))}
                  </div>

                  {/* Verified Institutional Eligibility Checklist */}
                  <div className="rounded-2xl border border-surface-border bg-surface-subtle/80 p-4 text-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-navy-900 flex items-center gap-1.5 text-xs">
                        <GraduationCap className="h-4 w-4 text-brand-600" />
                        Institutional Qualification Matrix
                      </span>
                      <span className="text-[11px] text-navy-400 font-medium">Automatic Pre-Screening</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="p-2.5 rounded-xl bg-white border border-surface-border shadow-2xs">
                        <span className="text-[10px] text-navy-400 font-semibold block uppercase">Min CGPA</span>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="font-bold text-navy-900 text-sm">
                            {drive.eligibility?.min_cgpa}
                          </span>
                          {elig && (
                            <span
                              className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${
                                elig.criteria_breakdown?.cgpa ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                              }`}
                            >
                              {elig.criteria_breakdown?.cgpa ? "✓ Pass" : "✗ Below"}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white border border-surface-border shadow-2xs">
                        <span className="text-[10px] text-navy-400 font-semibold block uppercase">Branches</span>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="font-bold text-navy-900 text-xs truncate max-w-[100px]" title={drive.eligibility?.allowed_departments?.join(", ")}>
                            {drive.eligibility?.allowed_departments?.join(", ")}
                          </span>
                          {elig && (
                            <span
                              className={`text-[10px] font-bold rounded-full px-2 py-0.5 shrink-0 ${
                                elig.criteria_breakdown?.department ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                              }`}
                            >
                              {elig.criteria_breakdown?.department ? "✓ Match" : "✗ Restr."}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white border border-surface-border shadow-2xs">
                        <span className="text-[10px] text-navy-400 font-semibold block uppercase">Batches</span>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="font-bold text-navy-900 text-sm">
                            {drive.eligibility?.eligible_graduation_years?.join(", ")}
                          </span>
                          {elig && (
                            <span
                              className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${
                                elig.criteria_breakdown?.graduation_year ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                              }`}
                            >
                              {elig.criteria_breakdown?.graduation_year ? "✓ Clear" : "✗ Ineligible"}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white border border-surface-border shadow-2xs">
                        <span className="text-[10px] text-navy-400 font-semibold block uppercase">Max Backlogs</span>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="font-bold text-navy-900 text-sm">
                            {drive.eligibility?.max_active_backlogs}
                          </span>
                          {elig && (
                            <span
                              className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${
                                elig.criteria_breakdown?.backlogs ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                              }`}
                            >
                              {elig.criteria_breakdown?.backlogs ? "✓ Clear" : "✗ Exceeded"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Reasons list if not eligible */}
                    {elig && !elig.is_eligible && elig.reasons.length > 0 && (
                      <div className="mt-2 text-[11px] text-rose-700 bg-rose-50/70 border border-rose-200/80 rounded-xl p-2.5 font-medium flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-600" />
                        <span>{elig.reasons.join(" • ")}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar - Docked Bottom */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-surface-border">
                    <div className="flex items-center gap-1.5 text-xs text-navy-400">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Posted on {new Date(drive.created_at).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Skill Readiness & Gap Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenSkillMatch(drive)}
                        className="flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 hover:bg-brand-100 text-brand-700 px-3.5 py-2 text-xs font-bold transition shadow-2xs"
                      >
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span>Skill Match & Readiness</span>
                      </button>

                      {alreadyApplied ? (
                        <>
                          <span className="rounded-xl bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 text-xs font-bold">
                            ✓ Applied
                          </span>
                          {/* Take Assessment button for applied drives with available assessment */}
                          {assessmentStatusMap[drive.id] && (
                            assessmentStatusMap[drive.id].hasAttempt ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`rounded-xl px-3.5 py-2 text-xs font-bold border flex items-center gap-1.5 ${
                                  assessmentStatusMap[drive.id].passed
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                }`}>
                                  <ClipboardCheck className="h-3.5 w-3.5" />
                                  <span>
                                    Attempt {assessmentStatusMap[drive.id].attempt_number || 1}/{assessmentStatusMap[drive.id].max_attempts || 2}: {assessmentStatusMap[drive.id].score}%
                                  </span>
                                  {assessmentStatusMap[drive.id].adaptive_mode && assessmentStatusMap[drive.id].final_difficulty && (
                                    <span className="ml-1 text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-mono font-bold">
                                      L{assessmentStatusMap[drive.id].final_difficulty}
                                    </span>
                                  )}
                                </span>

                                {/* Re-attempt button if can_retake */}
                                {assessmentStatusMap[drive.id].can_retake ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAssessmentDrive(drive);
                                      setAssessmentId(assessmentStatusMap[drive.id].id);
                                    }}
                                    className="flex items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white px-3.5 py-2 text-xs font-bold transition shadow-2xs active:scale-95"
                                  >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    <span>Retake Assessment (Attempt 2 of 2)</span>
                                  </button>
                                ) : (
                                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5">
                                    All Attempts Completed
                                  </span>
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setAssessmentDrive(drive);
                                  setAssessmentId(assessmentStatusMap[drive.id].id);
                                }}
                                className="flex items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 text-xs font-bold transition shadow-sm active:scale-95"
                              >
                                <ClipboardCheck className="h-3.5 w-3.5" />
                                <span>Take {assessmentStatusMap[drive.id].adaptive_mode ? "Adaptive Exam" : "Assessment"}</span>
                              </button>
                            )
                          )}
                        </>
                      ) : !isEligible ? (
                        <button
                          type="button"
                          disabled
                          className="rounded-xl bg-gray-100 text-gray-400 px-4 py-2 text-xs font-bold cursor-not-allowed"
                        >
                          Ineligible to Apply
                        </button>
                      ) : !hasResume ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (onNavigateToResume) onNavigateToResume();
                            else alert("Please upload your PDF resume in the Resume Intelligence tab first.");
                          }}
                          className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 text-xs font-bold transition shadow-sm"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>Upload Resume First</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setApplyingDrive(drive)}
                          className="flex items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 text-xs font-bold transition shadow-sm active:scale-95"
                        >
                          <span>Apply Now</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* My Applications Tab */
        <div className="space-y-4">
          <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-navy-900">Your Placement Applications</h2>
            <p className="text-xs text-navy-500">
              Track status of applications submitted to campus recruiters. Duplicate submissions are automatically prevented.
            </p>
          </div>

          {myApplications.length === 0 ? (
            <div className="rounded-2xl border border-surface-border bg-white p-12 text-center text-xs text-navy-500">
              <Send className="mx-auto h-8 w-8 text-navy-300 mb-2" />
              <p className="font-semibold text-navy-800">You haven&apos;t applied to any drives yet.</p>
              <p className="text-navy-400 mt-1">Browse available drives and submit your verified application.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myApplications.map((app) => {
                const drive = drives.find((d) => d.id === app.drive_id);
                return (
                  <div
                    key={app.id}
                    className="rounded-2xl border border-surface-border bg-white p-5 shadow-2xs hover:border-brand-200 transition space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-navy-950 text-sm">
                            {drive ? drive.job_title : "Placement Campaign"}
                          </span>
                          <span className="rounded-md bg-navy-100 text-navy-700 px-2 py-0.5 text-xs font-semibold">
                            {drive ? drive.company_name : "Corporate Partner"}
                          </span>
                        </div>
                        <p className="text-xs text-navy-500 mt-0.5">
                          Application ID: <span className="font-mono">{app.id.slice(0, 10)}...</span> • Applied on{" "}
                          {new Date(app.applied_at).toLocaleDateString()}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold border ${
                          app.status === "SHORTLISTED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : app.status === "REJECTED"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : app.status === "UNDER_REVIEW"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        {app.status}
                      </span>
                    </div>

                    {app.notes && (
                      <p className="text-xs text-navy-600 bg-surface-subtle p-3 rounded-xl italic">
                        &quot;{app.notes}&quot;
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Skill Match & Readiness Tips */}
      {matchModalDrive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-3xl border border-surface-border bg-white p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-navy-950">
                    Skill Match & Readiness Audit
                  </h3>
                  <span className="rounded-md bg-brand-50 text-brand-700 px-2 py-0.5 text-[10px] font-bold border border-brand-200">
                    AI Candidate Fit Model
                  </span>
                </div>
                <p className="text-xs text-navy-500">
                  {matchModalDrive.job_title} • {matchModalDrive.company_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMatchModalDrive(null);
                  setSkillGapData(null);
                }}
                className="rounded-xl p-1.5 text-navy-400 hover:bg-surface-subtle hover:text-navy-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingGap || !skillGapData ? (
              <div className="py-12 text-center text-xs text-navy-500">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent mb-2" />
                <p>Computing semantic similarity and canonical skill coverage...</p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Score & Readiness Header */}
                <div className="flex items-center justify-between bg-gradient-to-r from-navy-900 to-indigo-950 p-4 rounded-2xl text-white">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-navy-300">Your Candidate Fit</div>
                    <div className="text-2xl font-black">{skillGapData.overall_match_score}%</div>
                  </div>
                  <div className="text-right">
                    <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-1 text-xs font-bold">
                      {skillGapData.readiness_level}
                    </span>
                    <div className="text-[10px] text-navy-300 mt-1">Multi-factor hybrid score</div>
                  </div>
                </div>

                {/* Score component breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-surface-subtle border border-surface-border">
                    <span className="text-[10px] text-navy-400 block">Required Skills</span>
                    <span className="font-bold text-navy-800 text-sm">{skillGapData.required_skill_score}%</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-subtle border border-surface-border">
                    <span className="text-[10px] text-navy-400 block">Semantic Fit</span>
                    <span className="font-bold text-brand-700 text-sm">{skillGapData.semantic_score}%</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-subtle border border-surface-border">
                    <span className="text-[10px] text-navy-400 block">Evidence Quality</span>
                    <span className="font-bold text-emerald-700 text-sm">{skillGapData.evidence_score}%</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-subtle border border-surface-border">
                    <span className="text-[10px] text-navy-400 block">Preferred Bonus</span>
                    <span className="font-bold text-amber-700 text-sm">{skillGapData.preferred_skill_score}%</span>
                  </div>
                </div>

                {/* Matched vs Missing Required Skills */}
                <div className="space-y-2">
                  <div className="font-bold text-navy-900">Required Skills Status</div>
                  <div className="flex flex-wrap gap-1.5">
                    {skillGapData.matched_required_skills.map((s, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 text-xs font-bold"
                      >
                        <Check className="h-3 w-3 text-emerald-600" />
                        {s}
                      </span>
                    ))}
                    {skillGapData.missing_required_skills.map((s, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-50 text-red-800 border border-red-200 px-2.5 py-1 text-xs font-bold"
                      >
                        <X className="h-3 w-3 text-red-500" />
                        {s} (Missing)
                      </span>
                    ))}
                  </div>
                </div>

                {/* Preparation Tips */}
                <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-4 space-y-2">
                  <div className="font-bold text-brand-900 flex items-center gap-1.5">
                    <Lightbulb className="h-4 w-4 text-brand-600" />
                    <span>Personalized Preparation Tips</span>
                  </div>
                  <ul className="space-y-1.5 text-navy-700">
                    {skillGapData.preparation_tips.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-brand-600 font-bold">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex justify-end pt-3 border-t border-surface-border">
                  <button
                    type="button"
                    onClick={() => {
                      setMatchModalDrive(null);
                      setSkillGapData(null);
                    }}
                    className="rounded-xl bg-navy-900 text-white px-4 py-2 text-xs font-bold hover:bg-navy-800 transition"
                  >
                    Got It
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Application Submission Modal */}
      {applyingDrive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-3xl border border-surface-border bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div>
                <h3 className="text-base font-bold text-navy-950">Confirm Application</h3>
                <p className="text-xs text-navy-500">{applyingDrive.job_title} • {applyingDrive.company_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setApplyingDrive(null)}
                className="rounded-xl p-1.5 text-navy-400 hover:bg-surface-subtle hover:text-navy-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {applicationSuccess ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600 animate-bounce" />
                <h4 className="text-sm font-bold text-navy-900">Application Submitted Successfully!</h4>
                <p className="text-xs text-navy-500">
                  Your verified institutional profile and active resume have been linked.
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-4 text-xs space-y-2">
                  <div className="font-bold text-navy-900 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>Verified Academic Credentials Attached</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-navy-700">
                    <div>
                      <span className="text-navy-400 block text-[10px]">Student Email:</span>
                      <span className="font-semibold">{user?.email}</span>
                    </div>
                    <div>
                      <span className="text-navy-400 block text-[10px]">Verification:</span>
                      <span className="font-semibold text-emerald-700">Deterministic Pass ✓</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-navy-700 mb-1">
                    Candidate Statement / Note (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={applyNotes}
                    onChange={(e) => setApplyNotes(e.target.value)}
                    placeholder="Highlight your key achievements, why you're passionate about this role, or relevant project links..."
                    className="w-full rounded-xl border border-surface-border px-3 py-2 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
                  <button
                    type="button"
                    onClick={() => setApplyingDrive(null)}
                    className="rounded-xl px-4 py-2 text-xs font-semibold text-navy-600 hover:bg-surface-subtle"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleApply}
                    className="flex items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 text-xs font-bold transition shadow-sm disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Confirm & Apply"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Assessment Runner Modal */}
      {assessmentDrive && assessmentId && (
        <AssessmentRunner
          assessmentId={assessmentId}
          driveTitle={assessmentDrive.job_title}
          companyName={assessmentDrive.company_name}
          onClose={() => {
            setAssessmentDrive(null);
            setAssessmentId(null);
            fetchAssessmentStatus(drives);
            fetchDrivesAndEligibility();
          }}
          onFinished={() => {
            fetchAssessmentStatus(drives);
            fetchDrivesAndEligibility();
          }}
        />
      )}
    </div>
  );
}
