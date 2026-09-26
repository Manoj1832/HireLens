"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  FolderGit2,
  GraduationCap,
  Award,
  Check,
  FileCheck,
  Search,
  BookOpen,
} from "lucide-react";

export interface SkillEvidence {
  id: string;
  skill_name: string;
  canonical_name: string;
  category: string;
  section: string;
  snippet: string;
  page_number: number;
  source_type: string;
  confidence: number;
}

export interface ExtractedProject {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  github_url?: string;
  live_url?: string;
  page_number: number;
}

export interface ExtractedEducation {
  id: string;
  degree: string;
  institution: string;
  field_of_study?: string;
  start_year?: number;
  end_year?: number;
  score?: string;
}

export interface ExtractedCertification {
  id: string;
  name: string;
  issuing_organization?: string;
  year?: number;
}

export interface ExtractedExperience {
  id: string;
  role: string;
  company: string;
  location?: string;
  duration?: string;
  description?: string;
  technologies: string[];
}

export interface ResumeData {
  id: string;
  filename: string;
  file_size: number;
  page_count: number;
  word_count: number;
  extraction_method: string;
  candidate_name?: string;
  candidate_email?: string;
  candidate_phone?: string;
  candidate_links?: Record<string, string>;
  sections_detected: string[];
  canonical_skills: string[];
  evidence_items: SkillEvidence[];
  extracted_projects: ExtractedProject[];
  extracted_education: ExtractedEducation[];
  extracted_certifications: ExtractedCertification[];
  extracted_experience: ExtractedExperience[];
  embedding_model: string;
  embedding_dim: number;
  has_embedding: boolean;
  parsed_at: string;
}

export default function ResumeEvidenceManager() {
  const { token, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [resume, setResume] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadStep, setUploadStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter & Evidence Inspector
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedEvidenceSkill, setSelectedEvidenceSkill] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Sync state
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncDone, setSyncDone] = useState<boolean>(false);

  // Fetch current resume on load
  const fetchResume = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/resumes/current", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setResume(data);
        if (data.canonical_skills?.length > 0) {
          setSelectedEvidenceSkill(data.canonical_skills[0]);
        }
      } else if (res.status === 404) {
        setResume(null);
      }
    } catch (err) {
      console.error("Error loading resume:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResume();
  }, [token]);

  // Upload handler
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a standard PDF document (.pdf).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File size exceeds 5MB limit. Please upload a compact PDF.");
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setUploading(true);
    setSyncDone(false);

    try {
      setUploadStep("Inspecting document headers & structure...");
      await new Promise((r) => setTimeout(r, 400));

      setUploadStep("Executing native multi-page text extraction...");
      await new Promise((r) => setTimeout(r, 450));

      setUploadStep("Mapping canonical skills & contextual evidence links...");

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("http://localhost:8000/api/v1/resumes/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to process resume");
      }

      const data = await res.json();
      setResume(data);
      if (data.canonical_skills?.length > 0) {
        setSelectedEvidenceSkill(data.canonical_skills[0]);
      }
      setSuccessMessage(
        `Resume verified: ${data.canonical_skills.length} skills and ${data.extracted_projects.length} projects extracted with evidence.`
      );
    } catch (err: any) {
      setError(err.message || "An error occurred while analyzing the document.");
    } finally {
      setUploading(false);
      setUploadStep("");
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Sync to Profile
  const handleSyncToProfile = async () => {
    if (!token) return;
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:8000/api/v1/resumes/sync-to-profile", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sync_skills: true,
          sync_projects: true,
          sync_certifications: true,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Synchronization failed");
      }

      const data = await res.json();
      setSyncDone(true);
      setSuccessMessage(data.message);
      if (refreshProfile) {
        refreshProfile();
      }
    } catch (err: any) {
      setError(err.message || "Failed to synchronize with candidate profile");
    } finally {
      setSyncing(false);
    }
  };

  // Categories list
  const categories = [
    "All",
    "Programming Languages",
    "Frontend",
    "Backend",
    "Databases",
    "Cloud & DevOps",
    "AI/ML & Data",
    "Core Computer Science",
  ];

  // Filter skills
  const activeEvidenceItems = resume?.evidence_items || [];
  const filteredSkills = (resume?.canonical_skills || []).filter((skill) => {
    const ev = activeEvidenceItems.find((e) => e.canonical_name === skill);
    const matchesCategory =
      selectedCategory === "All" || (ev && ev.category === selectedCategory);
    const matchesSearch =
      skill.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ev && ev.snippet.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const selectedEvidence = activeEvidenceItems.filter(
    (e) => e.canonical_name === selectedEvidenceSkill
  );

  return (
    <div className="space-y-6">
      {/* Alert Banners */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-800 animate-in fade-in duration-200">
          <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-800 animate-in fade-in duration-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Upload Dropzone Card */}
      <div className="rounded-3xl border border-surface-border bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-surface-border">
          <div>
            <div className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-brand-600" />
              <h2 className="text-lg font-bold text-navy-900">
                Institutional Resume Intelligence & Evidence Engine
              </h2>
            </div>
            <p className="text-xs text-navy-500 mt-1">
              Upload your academic and technical resume. HireLens extracts verifiable skills, projects, and evidence quotes.
            </p>
          </div>

          {resume && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSyncToProfile}
                disabled={syncing || syncDone}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition shadow-xs ${
                  syncDone
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                    : "bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
                }`}
              >
                {syncing ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Synchronizing...</span>
                  </>
                ) : syncDone ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Profile Synchronized</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Sync Evidence to Profile</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Drag-and-Drop Area */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className="mt-6 border-2 border-dashed border-brand-200 rounded-2xl bg-brand-50/40 p-8 text-center cursor-pointer hover:bg-brand-50/70 hover:border-brand-400 transition group"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            accept=".pdf"
            className="hidden"
          />

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-xs border border-brand-100 group-hover:scale-105 transition">
            {uploading ? (
              <RefreshCw className="h-6 w-6 text-brand-600 animate-spin" />
            ) : (
              <UploadCloud className="h-6 w-6 text-brand-600" />
            )}
          </div>

          <div className="mt-3">
            <h3 className="text-sm font-bold text-navy-900">
              {uploading ? uploadStep : "Click to browse or drop your resume PDF here"}
            </h3>
            <p className="text-xs text-navy-500 mt-1">
              Supports genuine PDF documents up to 5MB • Standard collegiate format (1-3 pages recommended)
            </p>
          </div>
        </div>

        {/* Active Resume Metadata Overview */}
        {resume && (
          <div className="mt-6 rounded-2xl bg-surface-subtle border border-surface-border p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white border border-surface-border text-brand-600 shadow-2xs">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-navy-900 text-sm">{resume.filename}</span>
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                      Native Verified
                    </span>
                    {resume.has_embedding && (
                      <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700 border border-violet-200">
                        Semantic Embedding ({resume.embedding_dim}d)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-navy-500 mt-0.5">
                    {resume.page_count} Pages • {resume.word_count} Words • Size: {(resume.file_size / 1024).toFixed(1)} KB • Processed: {new Date(resume.parsed_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-navy-700">Sections Detected:</span>
                {resume.sections_detected.map((sec) => (
                  <span
                    key={sec}
                    className="rounded-md bg-white border border-surface-border px-2 py-0.5 text-[10px] font-semibold text-navy-700"
                  >
                    {sec}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Analysis & Evidence Inspector Grid */}
      {resume && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Categorized Canonical Skills Matrix */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-3xl border border-surface-border bg-white p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-surface-border">
                <div>
                  <h3 className="text-sm font-bold text-navy-900 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-brand-600" />
                    <span>Canonical Skill Profile ({resume.canonical_skills.length})</span>
                  </h3>
                  <p className="text-[11px] text-navy-500 mt-0.5">
                    Select a skill to inspect its contextual evidence quote in your document.
                  </p>
                </div>

                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-navy-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter extracted skills..."
                    className="rounded-xl border border-surface-border pl-8 pr-3 py-1.5 text-xs text-navy-900 placeholder:text-navy-400 focus:border-brand-500 focus:outline-none w-44 sm:w-52"
                  />
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-3 no-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold whitespace-nowrap transition ${
                      selectedCategory === cat
                        ? "bg-navy-900 text-white shadow-2xs"
                        : "bg-surface-subtle text-navy-600 hover:bg-surface-border/50"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Skills Grid */}
              <div className="mt-2 flex flex-wrap gap-2">
                {filteredSkills.map((skill) => {
                  const isSelected = selectedEvidenceSkill === skill;
                  const evCount = activeEvidenceItems.filter((e) => e.canonical_name === skill).length;

                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => setSelectedEvidenceSkill(skill)}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition border ${
                        isSelected
                          ? "bg-brand-50 border-brand-500 text-brand-900 shadow-2xs ring-2 ring-brand-500/20"
                          : "bg-white border-surface-border text-navy-700 hover:border-brand-300 hover:bg-brand-50/30"
                      }`}
                    >
                      <span>{skill}</span>
                      <span className="rounded-full bg-brand-100 text-brand-800 text-[10px] px-1.5 py-0.2 font-bold">
                        {evCount} ev
                      </span>
                    </button>
                  );
                })}

                {filteredSkills.length === 0 && (
                  <div className="w-full py-8 text-center text-xs text-navy-400">
                    No canonical skills matching the selected filter.
                  </div>
                )}
              </div>
            </div>

            {/* Extracted Projects Card */}
            <div className="rounded-3xl border border-surface-border bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-surface-border">
                <div className="flex items-center gap-2">
                  <FolderGit2 className="h-4 w-4 text-brand-600" />
                  <h3 className="text-sm font-bold text-navy-900">
                    Extracted Projects & Implementations ({resume.extracted_projects.length})
                  </h3>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                {resume.extracted_projects.map((proj, idx) => (
                  <div
                    key={proj.id || idx}
                    className="rounded-2xl border border-surface-border bg-surface-subtle/50 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-navy-900 text-xs">{proj.title}</h4>
                      <span className="text-[10px] text-navy-500 font-semibold">
                        Page {proj.page_number}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-navy-600 leading-relaxed">
                      {proj.description}
                    </p>
                    {proj.technologies?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {proj.technologies.map((tech) => (
                          <span
                            key={tech}
                            className="rounded-md bg-white border border-surface-border px-2 py-0.5 text-[10px] font-semibold text-brand-700"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {resume.extracted_projects.length === 0 && (
                  <p className="text-xs text-navy-400 py-4 text-center">
                    No academic projects explicitly tagged under a Projects heading.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Evidence Inspector Drawer */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-3xl border border-brand-200 bg-brand-50/30 p-6 shadow-xs sticky top-6">
              <div className="flex items-center justify-between pb-4 border-b border-brand-100">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-brand-600" />
                  <div>
                    <h3 className="text-sm font-bold text-navy-900">Evidence Inspector</h3>
                    <p className="text-[10px] text-navy-500">
                      Verifiable contextual quotes for recruiter review
                    </p>
                  </div>
                </div>

                {selectedEvidenceSkill && (
                  <span className="rounded-lg bg-brand-600 text-white text-xs font-bold px-2.5 py-1">
                    {selectedEvidenceSkill}
                  </span>
                )}
              </div>

              <div className="mt-4 space-y-3">
                {selectedEvidence.length > 0 ? (
                  selectedEvidence.map((ev, i) => (
                    <div
                      key={ev.id || i}
                      className="rounded-2xl border border-brand-200/80 bg-white p-4 shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700 border border-brand-200">
                          {ev.section} Section
                        </span>
                        <span className="text-[10px] text-navy-400 font-semibold">
                          Page {ev.page_number} • {ev.source_type}
                        </span>
                      </div>

                      <div className="rounded-xl bg-surface-subtle p-3 border border-surface-border text-xs text-navy-800 italic leading-relaxed">
                        &ldquo;{ev.snippet}&rdquo;
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-navy-500 pt-1">
                        <span>Category: {ev.category}</span>
                        <span className="font-semibold text-emerald-700">
                          Confidence: {(ev.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-white p-6 text-center text-xs text-navy-400 border border-dashed border-brand-200">
                    Select any canonical skill to inspect its documented evidence from your resume.
                  </div>
                )}
              </div>

              {/* Education & Academic Qualifications Box */}
              <div className="mt-6 pt-5 border-t border-brand-100 space-y-3">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-brand-600" />
                  <h4 className="text-xs font-bold text-navy-900">Extracted Academic Record</h4>
                </div>

                {resume.extracted_education.map((edu, idx) => (
                  <div
                    key={edu.id || idx}
                    className="rounded-xl bg-white border border-surface-border p-3 text-xs"
                  >
                    <div className="font-bold text-navy-900">{edu.degree}</div>
                    <div className="text-[11px] text-navy-500 mt-0.5">{edu.institution}</div>
                    {edu.score && (
                      <div className="mt-1 text-[10px] font-semibold text-emerald-700">
                        Score / CGPA: {edu.score}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Certifications Box */}
              {resume.extracted_certifications?.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-brand-600" />
                    <h4 className="text-xs font-bold text-navy-900">Documented Certifications</h4>
                  </div>

                  {resume.extracted_certifications.map((c, idx) => (
                    <div
                      key={c.id || idx}
                      className="rounded-xl bg-white border border-surface-border p-2.5 text-xs"
                    >
                      <span className="font-semibold text-navy-900">{c.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
