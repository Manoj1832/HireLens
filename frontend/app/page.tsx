"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, RefreshCw, Shield, Building2, GraduationCap, Briefcase } from "lucide-react";

interface ServiceHealth {
  status: string;
  service?: string;
  environment?: string;
}

export default function Home() {
  const [health, setHealth] = useState<ServiceHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:8000/health");
      if (!res.ok) throw new Error("Service unavailable");
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      setError("Backend service is currently initializing or unreachable on port 8000.");
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full">
      {/* Hero Banner - Uber/Zepto Clean Consumer Style */}
      <div className="rounded-3xl border border-surface-border bg-gradient-to-br from-navy-950 via-slate-900 to-indigo-950 p-6 sm:p-10 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-500/20 px-3 py-1 text-xs font-bold text-brand-300 border border-brand-400/30">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Institutional Placement & Assessment Platform</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              Verified Campus Hiring, Powered by Explainable AI.
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
              Direct institutional directory gatekeeping, deterministic criteria enforcement, multi-factor candidate matching, and proctored adaptive assessments.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <a
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-600/30 hover:bg-brand-500 transition"
            >
              <span>Access Secure Portal</span>
              <span className="text-base">→</span>
            </a>
            <button
              onClick={checkHealth}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3.5 text-xs font-semibold text-white hover:bg-white/20 transition backdrop-blur-sm disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-brand-400" : ""}`} />
              <span>{loading ? "Checking..." : health?.status === "healthy" ? "API Online" : "Check Status"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Platform Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-navy-400">Institutional Directory</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              <CheckCircle2 className="h-3 w-3" />
              Verified
            </span>
          </div>
          <p className="mt-2 text-xl font-bold text-navy-950">Zero Resume Spam</p>
          <p className="mt-1 text-xs text-navy-500 leading-normal">
            Only enrolled college students with verified CGPA and department records can apply.
          </p>
        </div>

        <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-navy-400">Evaluation Engine</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
              Multi-Factor
            </span>
          </div>
          <p className="mt-2 text-xl font-bold text-navy-950">Explainable AI Matching</p>
          <p className="mt-1 text-xs text-navy-500 leading-normal">
            Hybrid scoring combining canonical skills, vector embeddings, and verified project evidence.
          </p>
        </div>

        <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-navy-400">Integrity Standard</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
              <Shield className="h-3 w-3" />
              Proctored
            </span>
          </div>
          <p className="mt-2 text-xl font-bold text-navy-950">Computer Vision ML</p>
          <p className="mt-1 text-xs text-navy-500 leading-normal">
            Continuous webcam anomaly detection and browser focus telemetry with transparent trust scoring.
          </p>
        </div>
      </div>

      {/* Role Workspaces */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy-950">Campus Recruitment Workspaces</h2>
          <span className="text-xs text-navy-400">Single Sign-On Available</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Student Card */}
          <div className="rounded-3xl border border-surface-border bg-white p-6 shadow-xs hover:border-blue-400 hover:shadow-md transition flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 group-hover:bg-blue-600 group-hover:text-white transition">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-navy-950">Student Portal</h3>
              <p className="text-xs text-navy-600 leading-relaxed">
                Browse verified campus drives, assess eligibility instantly, manage evidence-backed skills, and take computerized adaptive assessments.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-surface-border flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-700">Enrolled Students</span>
              <a
                href="/login?role=student"
                className="rounded-xl bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-600 hover:text-white transition"
              >
                Sign In →
              </a>
            </div>
          </div>

          {/* Recruiter Card */}
          <div className="rounded-3xl border border-surface-border bg-white p-6 shadow-xs hover:border-indigo-400 hover:shadow-md transition flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 group-hover:bg-indigo-600 group-hover:text-white transition">
                <Briefcase className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-navy-950">Corporate Recruiter</h3>
              <p className="text-xs text-navy-600 leading-relaxed">
                Publish target recruitment drives, review ranked applicants with multi-factor match breakdowns, and inspect assessment integrity audits.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-surface-border flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-700">Enterprise Partners</span>
              <a
                href="/login?role=recruiter"
                className="rounded-xl bg-indigo-50 px-3.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white transition"
              >
                Sign In →
              </a>
            </div>
          </div>

          {/* Placement Admin Card */}
          <div className="rounded-3xl border border-surface-border bg-white p-6 shadow-xs hover:border-emerald-400 hover:shadow-md transition flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 group-hover:bg-emerald-600 group-hover:text-white transition">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-navy-950">Placement Office</h3>
              <p className="text-xs text-navy-600 leading-relaxed">
                Manage student directories, verify cohort academic credentials, coordinate placement campaigns, and enforce campus recruitment governance.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-surface-border flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-700">Institutional Authority</span>
              <a
                href="/login?role=admin"
                className="rounded-xl bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-600 hover:text-white transition"
              >
                Sign In →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
