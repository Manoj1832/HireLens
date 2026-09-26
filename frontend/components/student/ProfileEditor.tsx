"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  GraduationCap,
  Briefcase,
  Award,
  Code2,
  ExternalLink,
  Github,
  Linkedin,
  Globe,
  Phone,
  Mail,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Sparkles,
  Save,
  X,
  Layers,
} from "lucide-react";

export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  field_of_study: string;
  start_year: number;
  end_year?: number | null;
  score_type: string;
  score: number;
}

export interface SkillItem {
  id: string;
  name: string;
  category: string;
  proficiency?: string | null;
}

export interface ProjectItem {
  id: string;
  title: string;
  description: string;
  skills_used: string[];
  project_url?: string | null;
  github_url?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

export interface CertificationItem {
  id: string;
  name: string;
  issuing_organization: string;
  issue_date?: string | null;
  expiration_date?: string | null;
  credential_id?: string | null;
  credential_url?: string | null;
}

export interface ExperienceItem {
  id: string;
  title: string;
  company: string;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean;
  description?: string | null;
}

export interface StudentProfileData {
  id: string;
  user_id: string;
  register_number: string;
  institutional_email: string;
  department: string;
  batch: string;
  graduation_year: number;
  verified_cgpa: number;
  full_name: string;
  headline?: string | null;
  summary?: string | null;
  phone?: string | null;
  github_url?: string | null;
  linkedin_url?: string | null;
  portfolio_url?: string | null;
  education: EducationItem[];
  skills: SkillItem[];
  projects: ProjectItem[];
  certifications: CertificationItem[];
  experience: ExperienceItem[];
  completion_percentage: number;
  updated_at: string;
  placement_opt_in?: boolean;
  opt_out_reason?: string | null;
  opt_in_updated_at?: string | null;
}

export default function ProfileEditor() {
  const { token } = useAuth();
  const [profile, setProfile] = useState<StudentProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [editBioOpen, setEditBioOpen] = useState(false);
  const [addSkillOpen, setAddSkillOpen] = useState(false);
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [addCertOpen, setAddCertOpen] = useState(false);
  const [optOutModalOpen, setOptOutModalOpen] = useState(false);
  const [optOutReason, setOptOutReason] = useState("Pursuing Higher Studies (MS/MBA)");
  const [customReason, setCustomReason] = useState("");
  const [consentAcknowledged, setConsentAcknowledged] = useState(false);
  const [isUpdatingConsent, setIsUpdatingConsent] = useState(false);

  // Form states
  const [bioForm, setBioForm] = useState({
    headline: "",
    summary: "",
    phone: "",
    github_url: "",
    linkedin_url: "",
    portfolio_url: "",
  });

  const [skillForm, setSkillForm] = useState({
    name: "",
    category: "Languages",
    proficiency: "Intermediate",
  });

  const [projectForm, setProjectForm] = useState({
    title: "",
    description: "",
    skills_used: "",
    github_url: "",
    project_url: "",
  });

  const [certForm, setCertForm] = useState({
    name: "",
    issuing_organization: "",
    issue_date: "",
    credential_id: "",
    credential_url: "",
  });

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:8000/api/v1/student/profile", {
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem("hirelens_token")}`,
        },
      });
      if (!res.ok) throw new Error("Failed to load profile data");
      const data: StudentProfileData = await res.json();
      setProfile(data);
      setBioForm({
        headline: data.headline || "",
        summary: data.summary || "",
        phone: data.phone || "",
        github_url: data.github_url || "",
        linkedin_url: data.linkedin_url || "",
        portfolio_url: data.portfolio_url || "",
      });
    } catch (err: any) {
      setError(err.message || "Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSaveBio = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:8000/api/v1/student/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || localStorage.getItem("hirelens_token")}`,
        },
        body: JSON.stringify(bioForm),
      });
      if (!res.ok) throw new Error("Could not update profile information");
      const updated: StudentProfileData = await res.json();
      setProfile(updated);
      setEditBioOpen(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillForm.name.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/student/profile/skills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || localStorage.getItem("hirelens_token")}`,
        },
        body: JSON.stringify(skillForm),
      });
      if (!res.ok) throw new Error("Failed to add skill");
      const updated: StudentProfileData = await res.json();
      setProfile(updated);
      setSkillForm({ name: "", category: "Languages", proficiency: "Intermediate" });
      setAddSkillOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSkill = async (skillId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/student/profile/skills/${skillId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem("hirelens_token")}`,
        },
      });
      if (res.ok) {
        const updated: StudentProfileData = await res.json();
        setProfile(updated);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectForm.title.trim() || !projectForm.description.trim()) return;
    setIsSaving(true);
    try {
      const skillsArray = projectForm.skills_used
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("http://localhost:8000/api/v1/student/profile/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || localStorage.getItem("hirelens_token")}`,
        },
        body: JSON.stringify({
          title: projectForm.title,
          description: projectForm.description,
          skills_used: skillsArray,
          github_url: projectForm.github_url || null,
          project_url: projectForm.project_url || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to add project");
      const updated: StudentProfileData = await res.json();
      setProfile(updated);
      setProjectForm({ title: "", description: "", skills_used: "", github_url: "", project_url: "" });
      setAddProjectOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/student/profile/projects/${projectId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem("hirelens_token")}`,
        },
      });
      if (res.ok) {
        const updated: StudentProfileData = await res.json();
        setProfile(updated);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certForm.name.trim() || !certForm.issuing_organization.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/student/profile/certifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || localStorage.getItem("hirelens_token")}`,
        },
        body: JSON.stringify({
          name: certForm.name,
          issuing_organization: certForm.issuing_organization,
          issue_date: certForm.issue_date || null,
          credential_id: certForm.credential_id || null,
          credential_url: certForm.credential_url || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to add certification");
      const updated: StudentProfileData = await res.json();
      setProfile(updated);
      setCertForm({ name: "", issuing_organization: "", issue_date: "", credential_id: "", credential_url: "" });
      setAddCertOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCert = async (certId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/student/profile/certifications/${certId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem("hirelens_token")}`,
        },
      });
      if (res.ok) {
        const updated: StudentProfileData = await res.json();
        setProfile(updated);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleConsent = async (optIn: boolean, reason?: string) => {
    setIsUpdatingConsent(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/student/profile/opt-in-status", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || localStorage.getItem("hirelens_token")}`,
        },
        body: JSON.stringify({
          placement_opt_in: optIn,
          opt_out_reason: optIn ? null : reason,
        }),
      });
      if (!res.ok) throw new Error("Failed to update placement participation consent");
      const updated: StudentProfileData = await res.json();
      setProfile(updated);
      setOptOutModalOpen(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUpdatingConsent(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-surface-border bg-white p-12 text-center text-navy-500">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-600 border-r-transparent mb-3" />
        <p className="text-sm font-semibold">Loading verified student profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
        <h3 className="font-bold">Profile Record Inaccessible</h3>
        <p className="text-sm mt-1 text-rose-700">
          Could not load the profile record. Please check your network connection or session validity.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {saveSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>Profile changes saved and verified successfully!</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-900 font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Top Banner: Profile Header & Completion Meter */}
      <div className="rounded-3xl border border-surface-border bg-white p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white font-extrabold text-2xl shadow-md shadow-brand-600/20">
              {profile.full_name ? profile.full_name[0] : "S"}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-extrabold text-navy-900">{profile.full_name}</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>PSG Tech Verified</span>
                </span>
              </div>
              <p className="text-sm text-navy-700 font-medium mt-1">
                {profile.headline || "Undergraduate Engineering Student"}
              </p>
              <div className="flex items-center gap-4 text-xs text-navy-500 mt-2 flex-wrap">
                <span className="flex items-center gap-1">
                  <GraduationCap className="h-3.5 w-3.5 text-brand-600" />
                  <span>Roll No: <strong className="text-navy-800">{profile.register_number}</strong></span>
                </span>
                <span>•</span>
                <span>{profile.department}</span>
                <span>•</span>
                <span>Batch {profile.batch}</span>
                <span>•</span>
                <span className="rounded bg-emerald-50 px-2 py-0.5 font-bold text-emerald-800 border border-emerald-200">
                  CGPA: {profile.verified_cgpa.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-3">
            {/* Completion Meter */}
            <div className="w-full sm:w-56 rounded-2xl border border-surface-border bg-surface-subtle p-3.5">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-navy-700">Profile Readiness</span>
                <span className="font-extrabold text-brand-700">{profile.completion_percentage}%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-600 to-indigo-600 transition-all duration-500"
                  style={{ width: `${profile.completion_percentage}%` }}
                />
              </div>
              <p className="text-[10px] text-navy-400 mt-1.5 text-center sm:text-right">
                {profile.completion_percentage === 100
                  ? "🎉 100% Placement Ready"
                  : "Add skills & projects to reach 100%"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setEditBioOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border bg-white px-3.5 py-2 text-xs font-bold text-navy-800 shadow-xs hover:bg-surface-subtle transition"
            >
              <Edit3 className="h-3.5 w-3.5 text-brand-600" />
              <span>Edit Personal Info</span>
            </button>
          </div>
        </div>

        {/* Bio / Summary & Contact Links */}
        {(profile.summary || profile.github_url || profile.linkedin_url || profile.phone) && (
          <div className="mt-6 pt-6 border-t border-surface-border grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-8">
              <h4 className="text-xs font-bold text-navy-400 uppercase tracking-wider mb-1.5">
                Executive Profile Summary
              </h4>
              <p className="text-xs text-navy-700 leading-relaxed">
                {profile.summary || "No executive summary provided. Click 'Edit Personal Info' to add an introduction."}
              </p>
            </div>
            <div className="md:col-span-4 flex flex-col gap-2 justify-center border-l-0 md:border-l border-surface-border md:pl-6">
              {profile.phone && (
                <div className="flex items-center gap-2 text-xs text-navy-700">
                  <Phone className="h-3.5 w-3.5 text-navy-400" />
                  <span>{profile.phone}</span>
                </div>
              )}
              {profile.github_url && (
                <a
                  href={profile.github_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-xs text-navy-700 hover:text-brand-600 transition"
                >
                  <Github className="h-3.5 w-3.5 text-navy-900" />
                  <span className="truncate">{profile.github_url.replace("https://", "")}</span>
                </a>
              )}
              {profile.linkedin_url && (
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-xs text-navy-700 hover:text-brand-600 transition"
                >
                  <Linkedin className="h-3.5 w-3.5 text-blue-600" />
                  <span className="truncate">{profile.linkedin_url.replace("https://", "")}</span>
                </a>
              )}
              {profile.portfolio_url && (
                <a
                  href={profile.portfolio_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-xs text-navy-700 hover:text-brand-600 transition"
                >
                  <Globe className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="truncate">{profile.portfolio_url.replace("https://", "")}</span>
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Placement Participation & Consent Card (Opt-In / Opt-Out) */}
      <div
        className={`rounded-3xl border p-5 sm:p-6 shadow-xs transition ${
          profile.placement_opt_in !== false
            ? "border-emerald-200/80 bg-gradient-to-r from-emerald-50/50 via-white to-white"
            : "border-amber-200/80 bg-gradient-to-r from-amber-50/50 via-white to-white"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                profile.placement_opt_in !== false
                  ? "bg-emerald-600 text-white shadow-emerald-600/20 shadow-md"
                  : "bg-amber-600 text-white shadow-amber-600/20 shadow-md"
              }`}
            >
              {profile.placement_opt_in !== false ? (
                <ShieldCheck className="h-6 w-6" />
              ) : (
                <ShieldAlert className="h-6 w-6" />
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-extrabold text-navy-950">
                  Campus Placement Participation Consent
                </h3>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    profile.placement_opt_in !== false
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-amber-100 text-amber-900 border border-amber-300"
                  }`}
                >
                  {profile.placement_opt_in !== false ? "Active (Opted In)" : "Inactive (Opted Out)"}
                </span>
              </div>
              <p className="text-xs text-navy-600 max-w-2xl leading-relaxed">
                {profile.placement_opt_in !== false
                  ? "You are actively participating in institutional campus recruitment drives. Your profile and verified credentials are eligible for corporate match evaluation and screening assessments."
                  : `You have opted out of institutional campus placements (Reason: ${
                      profile.opt_out_reason || "Not specified"
                    }). You will not be considered for campus drives or company candidate pools until you opt back in.`}
              </p>
              {profile.opt_in_updated_at && (
                <p className="text-[10px] text-navy-400">
                  Last updated: {new Date(profile.opt_in_updated_at).toLocaleDateString()} at{" "}
                  {new Date(profile.opt_in_updated_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>
          </div>

          <div className="shrink-0 self-start sm:self-center">
            {profile.placement_opt_in !== false ? (
              <button
                type="button"
                onClick={() => setOptOutModalOpen(true)}
                className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 hover:border-rose-300 shadow-2xs transition"
              >
                Opt Out of Placements
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleToggleConsent(true)}
                disabled={isUpdatingConsent}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm transition disabled:opacity-50"
              >
                {isUpdatingConsent ? "Re-enrolling..." : "Re-enroll / Opt In"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SECTION: Technical Skills (Unstop Style Tag Matrix) */}
      <div className="rounded-3xl border border-surface-border bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-brand-600" />
              <h3 className="text-lg font-bold text-navy-900">Technical Skills & Competencies</h3>
            </div>
            <p className="text-xs text-navy-500 mt-0.5">
              Verified skills matched deterministically against corporate job eligibility criteria.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAddSkillOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 border border-brand-200 px-3 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-100 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Skill</span>
          </button>
        </div>

        {profile.skills.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-surface-border p-8 text-center text-navy-400">
            <p className="text-xs">No technical skills added yet. Click &quot;Add Skill&quot; to build your candidate profile.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {profile.skills.map((skill) => (
              <div
                key={skill.id}
                className="group flex items-center gap-2 rounded-xl border border-surface-border bg-surface-subtle px-3 py-1.5 text-xs font-semibold text-navy-800 hover:border-brand-300 hover:bg-brand-50/40 transition"
              >
                <span>{skill.name}</span>
                <span className="rounded bg-white border border-surface-border px-1.5 py-0.5 text-[10px] font-bold text-navy-600">
                  {skill.proficiency || "Proficient"}
                </span>
                <span className="text-[10px] text-navy-400">({skill.category})</span>
                <button
                  type="button"
                  onClick={() => handleDeleteSkill(skill.id)}
                  className="text-navy-300 hover:text-rose-600 transition"
                  title="Remove skill"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION: Projects & Systems */}
      <div className="rounded-3xl border border-surface-border bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-bold text-navy-900">Featured Engineering Projects</h3>
            </div>
            <p className="text-xs text-navy-500 mt-0.5">
              Practical software engineering artifacts with verified repository links.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAddProjectOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Project</span>
          </button>
        </div>

        {profile.projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-surface-border p-8 text-center text-navy-400">
            <p className="text-xs">No projects registered yet. Showcase your technical depth by adding your engineering projects.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.projects.map((proj) => (
              <div
                key={proj.id}
                className="rounded-2xl border border-surface-border bg-white p-5 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-navy-900 text-sm">{proj.title}</h4>
                    <button
                      type="button"
                      onClick={() => handleDeleteProject(proj.id)}
                      className="text-navy-300 hover:text-rose-600 transition"
                      title="Delete project"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-navy-600 mt-2 leading-relaxed">{proj.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {proj.skills_used.map((s, idx) => (
                      <span
                        key={idx}
                        className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 border border-indigo-100"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-surface-border flex items-center gap-3 text-xs">
                  {proj.github_url && (
                    <a
                      href={proj.github_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-navy-700 hover:text-navy-950"
                    >
                      <Github className="h-3.5 w-3.5" />
                      <span>Code Repository</span>
                    </a>
                  )}
                  {proj.project_url && (
                    <a
                      href={proj.project_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:text-brand-800"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Live Deployment</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION: Education History & Certifications Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Education History */}
        <div className="rounded-3xl border border-surface-border bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap className="h-5 w-5 text-emerald-600" />
            <h3 className="text-lg font-bold text-navy-900">Education & Academics</h3>
          </div>
          <div className="space-y-4">
            {profile.education.map((edu) => (
              <div key={edu.id} className="rounded-2xl border border-surface-border bg-surface-subtle p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-navy-900">{edu.institution}</h4>
                    <p className="text-xs text-navy-600 mt-0.5">
                      {edu.degree} • {edu.field_of_study}
                    </p>
                  </div>
                  <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                    {edu.score_type}: {edu.score}
                  </span>
                </div>
                <div className="mt-2 text-[11px] text-navy-400">
                  {edu.start_year} – {edu.end_year || "Present"}
                </div>
              </div>
            ))}
          </div>

          {/* Sync-lock notice */}
          <div className="mt-4 rounded-xl bg-blue-50 border border-blue-100 p-3 text-[11px] text-blue-900 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <span>Collegiate degrees and verified CGPA are synchronized directly with the College Directory.</span>
          </div>
        </div>

        {/* Certifications */}
        <div className="rounded-3xl border border-surface-border bg-white p-6 sm:p-8 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-600" />
                <h3 className="text-lg font-bold text-navy-900">Industry Certifications</h3>
              </div>
              <button
                type="button"
                onClick={() => setAddCertOpen(true)}
                className="inline-flex items-center gap-1 rounded-xl bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-bold text-amber-800 hover:bg-amber-100 transition"
              >
                <Plus className="h-3 w-3" />
                <span>Add</span>
              </button>
            </div>

            {profile.certifications.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-surface-border p-6 text-center text-navy-400 text-xs">
                No industry certifications registered yet.
              </div>
            ) : (
              <div className="space-y-3">
                {profile.certifications.map((cert) => (
                  <div
                    key={cert.id}
                    className="rounded-2xl border border-surface-border bg-white p-3.5 shadow-xs flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-navy-900">{cert.name}</h4>
                      <p className="text-[11px] text-navy-500 mt-0.5">
                        {cert.issuing_organization}
                        {cert.issue_date && ` • Issued ${cert.issue_date}`}
                      </p>
                      {cert.credential_id && (
                        <span className="font-mono text-[10px] text-navy-400">
                          ID: {cert.credential_id}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCert(cert.id)}
                      className="text-navy-300 hover:text-rose-600 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="mt-4 text-[11px] text-navy-400">
            Validated certifications contribute 20% toward candidate verification scoring.
          </p>
        </div>
      </div>

      {/* MODAL 1: Edit Personal & Bio Info */}
      {editBioOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl border border-surface-border bg-white p-6 sm:p-8 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setEditBioOpen(false)}
              className="absolute right-5 top-5 text-navy-400 hover:text-navy-700"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold text-navy-900 mb-4">Edit Personal & Professional Links</h3>
            <form onSubmit={handleSaveBio} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-navy-800 mb-1">Headline</label>
                <input
                  type="text"
                  value={bioForm.headline}
                  onChange={(e) => setBioForm({ ...bioForm, headline: e.target.value })}
                  placeholder="e.g. Systems & Backend Engineer | B.E. CSE"
                  className="w-full rounded-xl border border-surface-border px-3 py-2 text-navy-900 focus:outline-none focus:border-brand-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-navy-800 mb-1">Executive Summary</label>
                <textarea
                  rows={3}
                  value={bioForm.summary}
                  onChange={(e) => setBioForm({ ...bioForm, summary: e.target.value })}
                  placeholder="Brief summary of your technical strengths and career interests..."
                  className="w-full rounded-xl border border-surface-border p-3 text-navy-900 focus:outline-none focus:border-brand-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-navy-800 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={bioForm.phone}
                  onChange={(e) => setBioForm({ ...bioForm, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-xl border border-surface-border px-3 py-2 text-navy-900 focus:outline-none focus:border-brand-600"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-navy-800 mb-1">GitHub Profile URL</label>
                  <input
                    type="url"
                    value={bioForm.github_url}
                    onChange={(e) => setBioForm({ ...bioForm, github_url: e.target.value })}
                    placeholder="https://github.com/username"
                    className="w-full rounded-xl border border-surface-border px-3 py-2 text-navy-900 focus:outline-none focus:border-brand-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-navy-800 mb-1">LinkedIn Profile URL</label>
                  <input
                    type="url"
                    value={bioForm.linkedin_url}
                    onChange={(e) => setBioForm({ ...bioForm, linkedin_url: e.target.value })}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full rounded-xl border border-surface-border px-3 py-2 text-navy-900 focus:outline-none focus:border-brand-600"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditBioOpen(false)}
                  className="rounded-xl border border-surface-border px-4 py-2 font-semibold text-navy-700 hover:bg-surface-subtle"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-brand-600 px-5 py-2 font-bold text-white shadow hover:bg-brand-700 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Skill */}
      {addSkillOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl border border-surface-border bg-white p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setAddSkillOpen(false)}
              className="absolute right-5 top-5 text-navy-400 hover:text-navy-700"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold text-navy-900 mb-4">Add Technical Skill</h3>
            <form onSubmit={handleAddSkill} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-navy-800 mb-1">Skill Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={skillForm.name}
                  onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })}
                  placeholder="e.g. Docker, Rust, GraphQL"
                  className="w-full rounded-xl border border-surface-border px-3 py-2 text-navy-900 focus:outline-none focus:border-brand-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-navy-800 mb-1">Category</label>
                  <select
                    value={skillForm.category}
                    onChange={(e) => setSkillForm({ ...skillForm, category: e.target.value })}
                    className="w-full rounded-xl border border-surface-border px-3 py-2 text-navy-900 focus:outline-none focus:border-brand-600"
                  >
                    <option value="Languages">Languages</option>
                    <option value="Frameworks">Frameworks</option>
                    <option value="Databases">Databases</option>
                    <option value="Cloud & DevOps">Cloud & DevOps</option>
                    <option value="Core Concepts">Core Concepts</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-navy-800 mb-1">Proficiency</label>
                  <select
                    value={skillForm.proficiency}
                    onChange={(e) => setSkillForm({ ...skillForm, proficiency: e.target.value })}
                    className="w-full rounded-xl border border-surface-border px-3 py-2 text-navy-900 focus:outline-none focus:border-brand-600"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddSkillOpen(false)}
                  className="rounded-xl border border-surface-border px-4 py-2 font-semibold text-navy-700 hover:bg-surface-subtle"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-brand-600 px-5 py-2 font-bold text-white shadow hover:bg-brand-700 disabled:opacity-50"
                >
                  {isSaving ? "Adding..." : "Add Skill"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Add Project */}
      {addProjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl border border-surface-border bg-white p-6 sm:p-8 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setAddProjectOpen(false)}
              className="absolute right-5 top-5 text-navy-400 hover:text-navy-700"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold text-navy-900 mb-4">Add Engineering Project</h3>
            <form onSubmit={handleAddProject} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-navy-800 mb-1">Project Title</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={projectForm.title}
                  onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                  placeholder="e.g. Distributed Consensus Engine"
                  className="w-full rounded-xl border border-surface-border px-3 py-2 text-navy-900 focus:outline-none focus:border-brand-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-navy-800 mb-1">Project Description & Architecture</label>
                <textarea
                  rows={3}
                  required
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                  placeholder="Describe the system architecture, challenges solved, and key features..."
                  className="w-full rounded-xl border border-surface-border p-3 text-navy-900 focus:outline-none focus:border-brand-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-navy-800 mb-1">Technologies & Skills Used (Comma Separated)</label>
                <input
                  type="text"
                  value={projectForm.skills_used}
                  onChange={(e) => setProjectForm({ ...projectForm, skills_used: e.target.value })}
                  placeholder="e.g. Go, Raft, Docker, gRPC"
                  className="w-full rounded-xl border border-surface-border px-3 py-2 text-navy-900 focus:outline-none focus:border-brand-600"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-navy-800 mb-1">GitHub Repository Link</label>
                  <input
                    type="url"
                    value={projectForm.github_url}
                    onChange={(e) => setProjectForm({ ...projectForm, github_url: e.target.value })}
                    placeholder="https://github.com/..."
                    className="w-full rounded-xl border border-surface-border px-3 py-2 text-navy-900 focus:outline-none focus:border-brand-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-navy-800 mb-1">Live Demo / Deployment</label>
                  <input
                    type="url"
                    value={projectForm.project_url}
                    onChange={(e) => setProjectForm({ ...projectForm, project_url: e.target.value })}
                    placeholder="https://myproject.app"
                    className="w-full rounded-xl border border-surface-border px-3 py-2 text-navy-900 focus:outline-none focus:border-brand-600"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddProjectOpen(false)}
                  className="rounded-xl border border-surface-border px-4 py-2 font-semibold text-navy-700 hover:bg-surface-subtle"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-brand-600 px-5 py-2 font-bold text-white shadow hover:bg-brand-700 disabled:opacity-50"
                >
                  {isSaving ? "Adding..." : "Add Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Add Certification */}
      {addCertOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl border border-surface-border bg-white p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setAddCertOpen(false)}
              className="absolute right-5 top-5 text-navy-400 hover:text-navy-700"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold text-navy-900 mb-4">Add Certification</h3>
            <form onSubmit={handleAddCert} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-navy-800 mb-1">Certification Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={certForm.name}
                  onChange={(e) => setCertForm({ ...certForm, name: e.target.value })}
                  placeholder="e.g. AWS Certified Developer"
                  className="w-full rounded-xl border border-surface-border px-3 py-2 text-navy-900 focus:outline-none focus:border-brand-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-navy-800 mb-1">Issuing Organization</label>
                <input
                  type="text"
                  required
                  value={certForm.issuing_organization}
                  onChange={(e) => setCertForm({ ...certForm, issuing_organization: e.target.value })}
                  placeholder="e.g. Amazon Web Services, Microsoft"
                  className="w-full rounded-xl border border-surface-border px-3 py-2 text-navy-900 focus:outline-none focus:border-brand-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-navy-800 mb-1">Issue Date</label>
                  <input
                    type="month"
                    value={certForm.issue_date}
                    onChange={(e) => setCertForm({ ...certForm, issue_date: e.target.value })}
                    className="w-full rounded-xl border border-surface-border px-3 py-2 text-navy-900 focus:outline-none focus:border-brand-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-navy-800 mb-1">Credential ID</label>
                  <input
                    type="text"
                    value={certForm.credential_id}
                    onChange={(e) => setCertForm({ ...certForm, credential_id: e.target.value })}
                    placeholder="e.g. SAA-12345"
                    className="w-full rounded-xl border border-surface-border px-3 py-2 text-navy-900 focus:outline-none focus:border-brand-600"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddCertOpen(false)}
                  className="rounded-xl border border-surface-border px-4 py-2 font-semibold text-navy-700 hover:bg-surface-subtle"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-brand-600 px-5 py-2 font-bold text-white shadow hover:bg-brand-700 disabled:opacity-50"
                >
                  {isSaving ? "Adding..." : "Add Certification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Placement Opt-Out Confirmation */}
      {optOutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-surface-border bg-white p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-navy-950">Opt Out of Campus Placements</h3>
                  <p className="text-xs text-navy-500">Placement Participation Consent</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOptOutModalOpen(false)}
                className="text-navy-400 hover:text-navy-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Warning Box */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                <span>Important Consequences</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-amber-900/90 text-[11px]">
                <li>Your profile will be omitted from active recruiter discovery shortlists.</li>
                <li>You will not be eligible to submit applications to new or ongoing campus drives.</li>
                <li>Your eligibility status will be marked as "Opted Out" in the placement system.</li>
                <li>You can re-enroll and opt back in at any time to reactivate full eligibility.</li>
              </ul>
            </div>

            {/* Reason Selection */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-navy-900">
                Primary Reason for Opting Out <span className="text-rose-500">*</span>
              </label>
              <div className="space-y-2">
                {[
                  "Pursuing Higher Studies (MS / M.Tech / MBA)",
                  "Off-Campus Placement Offer Secured",
                  "Entrepreneurship / Startup Venture",
                  "Civil Services / Competitive Exam Preparation",
                  "Other Personal Reasons",
                ].map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-xs font-semibold cursor-pointer transition ${
                      optOutReason === reason
                        ? "border-navy-900 bg-navy-900 text-white"
                        : "border-surface-border bg-white text-navy-800 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="optOutReason"
                      value={reason}
                      checked={optOutReason === reason}
                      onChange={(e) => setOptOutReason(e.target.value)}
                      className="sr-only"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>

              {optOutReason === "Other Personal Reasons" && (
                <textarea
                  rows={2}
                  placeholder="Please describe your reason for opting out..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full rounded-xl border border-surface-border p-3 text-xs text-navy-900 placeholder-navy-400 focus:outline-none focus:border-brand-600"
                />
              )}
            </div>

            {/* Acknowledgment Checkbox */}
            <label className="flex items-start gap-2.5 text-xs text-navy-700 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={consentAcknowledged}
                onChange={(e) => setConsentAcknowledged(e.target.checked)}
                className="mt-0.5 rounded border-surface-border text-brand-600 focus:ring-brand-500"
              />
              <span className="font-medium">
                I acknowledge that opting out removes my candidacy from campus recruitment drives for the current academic session.
              </span>
            </label>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2.5 pt-2 border-t border-surface-border">
              <button
                type="button"
                onClick={() => setOptOutModalOpen(false)}
                className="rounded-xl border border-surface-border px-4 py-2 text-xs font-bold text-navy-700 hover:bg-surface-subtle transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  !consentAcknowledged ||
                  isUpdatingConsent ||
                  (optOutReason === "Other Personal Reasons" && !customReason.trim())
                }
                onClick={() => {
                  const finalReason =
                    optOutReason === "Other Personal Reasons" ? customReason.trim() : optOutReason;
                  handleToggleConsent(false, finalReason);
                }}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50 transition"
              >
                {isUpdatingConsent ? "Processing..." : "Confirm Opt-Out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
