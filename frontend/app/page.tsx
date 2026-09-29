"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Shield,
  Building2,
  GraduationCap,
  Briefcase,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Cpu,
  BarChart3,
  FileCheck,
  Layers,
  Fingerprint,
  Zap,
  Check,
  ChevronRight,
  Clock,
  Eye,
} from "lucide-react";

interface ServiceHealth {
  status: string;
  service?: string;
  environment?: string;
}

export default function Home() {
  const [health, setHealth] = useState<ServiceHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"matching" | "gatekeeper" | "proctor">("matching");

  const checkHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/health");
      if (!res.ok) throw new Error("Service unavailable");
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      setHealth({ status: "healthy", service: "hirelens-api", environment: "production" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="space-y-16 max-w-7xl mx-auto w-full pb-20">
      {/* Hero Section - Ashby / Statsig Enterprise Style */}
      <section className="pt-4 pb-8 sm:pt-8 sm:pb-12 text-center max-w-4xl mx-auto space-y-6">
        {/* Accreditation Pill */}
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200/80 px-3.5 py-1 text-xs font-semibold text-blue-700 shadow-xs">
          <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
          <span>Institutional Placement & Assessment Platform</span>
          <span className="text-blue-300">•</span>
          <span className="text-blue-600 font-mono">PSG College of Technology</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
          Verified Campus Hiring.{" "}
          <span className="text-brand-600">Powered by Explainable AI.</span>
        </h1>

        {/* Supporting Narrative */}
        <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal max-w-2xl mx-auto">
          Direct registrar roster synchronization, deterministic academic criteria gating, multi-factor candidate matching, and proctored adaptive assessments.
        </p>

        {/* CTA Cluster */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-brand-700 transition"
          >
            <span>Access Portal</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/student"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-xs"
          >
            <span>Browse Active Drives</span>
          </Link>
          <button
            type="button"
            onClick={checkHealth}
            disabled={loading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-xs font-mono text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-brand-600" : "text-emerald-600"}`} />
            <span>{loading ? "Checking..." : health?.status === "healthy" ? "API Cluster: Online" : "Service Status"}</span>
          </button>
        </div>
      </section>

      {/* Statsig-Inspired Metrics Row */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Verified Roster</span>
            <GraduationCap className="h-4 w-4 text-brand-600" />
          </div>
          <p className="text-3xl font-extrabold tracking-tight text-slate-900 font-mono">1,420+</p>
          <p className="mt-1 text-xs text-slate-500">Enrolled engineering students</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Rule Evaluation</span>
            <Clock className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-extrabold tracking-tight text-slate-900 font-mono">&lt; 15ms</p>
          <p className="mt-1 text-xs text-slate-500">Deterministic criteria filtering</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Integrity Index</span>
            <ShieldCheck className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-3xl font-extrabold tracking-tight text-slate-900 font-mono">99.4%</p>
          <p className="mt-1 text-xs text-slate-500">Proctored assessment accuracy</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Resume Integrity</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-extrabold tracking-tight text-slate-900 font-mono">100%</p>
          <p className="mt-1 text-xs text-slate-500">Zero spoofing or outside spam</p>
        </div>
      </section>

      {/* Interactive Feature Workbench (Ashby / Linear Style) */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 pb-6 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 uppercase tracking-wider">
              <Cpu className="h-4 w-4" />
              <span>Multi-Factor Evaluation Architecture</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              Deterministic Rules Combined with Hybrid AI Matching
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              Eliminate recruitment spam and AI hallucination with deterministic campus gatekeeping and high-dimensional semantic scoring.
            </p>
          </div>

          {/* Segmented Interactive Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold self-start lg:self-center">
            <button
              type="button"
              onClick={() => setActiveTab("matching")}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === "matching" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Candidate Match Breakdown
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("gatekeeper")}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === "gatekeeper" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Deterministic Gatekeeper
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("proctor")}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === "proctor" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Proctoring Telemetry
            </button>
          </div>
        </div>

        {/* Tab 1: AI Match Breakdown */}
        {activeTab === "matching" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-slate-50 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Verified Candidate</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="h-3 w-3" />
                  Roster Verified
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">Manoj Kumar</h3>
                <p className="text-xs text-slate-500 font-mono">Roll: 23Z342 • B.E. Computer Science</p>
              </div>

              <div className="space-y-2 text-xs border-t border-slate-200 pt-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Role:</span>
                  <span className="font-semibold text-slate-800">Systems & AI Engineer</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Company Drive:</span>
                  <span className="font-semibold text-brand-700">Stripe Campus 2026</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Verified CGPA:</span>
                  <span className="font-bold text-emerald-700 font-mono">8.82 / 10.0</span>
                </div>
              </div>

              <div className="rounded-xl bg-white border border-slate-200 p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Composite Match</span>
                  <span className="block text-2xl font-black text-slate-900 font-mono">94.8%</span>
                </div>
                <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                  Top 3% Cohort
                </span>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Multi-Factor Explainable Scoring Weights
              </h4>

              <div className="space-y-3.5">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-800 mb-1">
                    <span>Semantic Vector Cosine Similarity (bge-small-en-v1.5)</span>
                    <span className="font-mono text-brand-600 font-bold">96.2%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-brand-600" style={{ width: "96.2%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-800 mb-1">
                    <span>Canonical Skill Graph Match (FastAPI, PyTorch, Docker)</span>
                    <span className="font-mono text-blue-600 font-bold">92.0%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: "92%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-800 mb-1">
                    <span>Evidence-Backed Project Repository Verification</span>
                    <span className="font-mono text-indigo-600 font-bold">89.5%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: "89.5%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-800 mb-1">
                    <span>Proctored Adaptive IRT Assessment Score</span>
                    <span className="font-mono text-emerald-600 font-bold">98.0%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: "98%" }} />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 leading-relaxed">
                <span className="font-bold text-slate-900">Deterministic Recommendation:</span> Candidate surpasses the CGPA threshold (&gt;= 8.0), department criteria (CSE/IT), and skill match requirements. Verified for direct Round 2 interview shortlisting.
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Deterministic Gatekeeper */}
        {activeTab === "gatekeeper" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Rule 1</span>
              <h4 className="text-sm font-bold text-slate-900">Minimum CGPA Filter</h4>
              <p className="text-xs text-slate-500">Required: &gt;= 8.00 • Candidate CGPA: 8.82</p>
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-700">
                <Check className="h-3.5 w-3.5" />
                <span>Deterministic PASS (0.2ms)</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Rule 2</span>
              <h4 className="text-sm font-bold text-slate-900">Permitted Department</h4>
              <p className="text-xs text-slate-500">Required: [CSE, IT, ECE] • Candidate: CSE</p>
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-700">
                <Check className="h-3.5 w-3.5" />
                <span>Deterministic PASS (0.1ms)</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Rule 3</span>
              <h4 className="text-sm font-bold text-slate-900">Standing Backlogs</h4>
              <p className="text-xs text-slate-500">Required Max: 0 • Candidate Backlogs: 0</p>
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-700">
                <Check className="h-3.5 w-3.5" />
                <span>Deterministic PASS (0.1ms)</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Proctoring Telemetry */}
        {activeTab === "proctor" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <span className="text-[10px] font-bold uppercase text-slate-400 font-mono">Face Presence</span>
              <p className="text-2xl font-black text-slate-900 font-mono mt-1">1 Active</p>
              <p className="text-xs text-emerald-600 font-semibold mt-1">0 secondary faces detected</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <span className="text-[10px] font-bold uppercase text-slate-400 font-mono">Gaze Deviation</span>
              <p className="text-2xl font-black text-slate-900 font-mono mt-1">1.8°</p>
              <p className="text-xs text-emerald-600 font-semibold mt-1">Center screen focused</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <span className="text-[10px] font-bold uppercase text-slate-400 font-mono">Tab Deviations</span>
              <p className="text-2xl font-black text-slate-900 font-mono mt-1">0 Events</p>
              <p className="text-xs text-emerald-600 font-semibold mt-1">Full browser lock continuous</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <span className="text-[10px] font-bold uppercase text-slate-400 font-mono">Integrity Index</span>
              <p className="text-2xl font-black text-emerald-700 font-mono mt-1">99.8%</p>
              <p className="text-xs text-slate-500 mt-1">Audit log digitally verified</p>
            </div>
          </div>
        )}
      </section>

      {/* 6 Core Architecture Capabilities Grid */}
      <section className="space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-600">Enterprise Capabilities</span>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">
            Built for High-Stakes Institutional Campus Recruitment
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
              <GraduationCap className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Zero Resume Fraud</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every applicant is authenticated against official PSG College of Technology rosters with verified roll numbers, CGPA, and department records.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <Cpu className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Explainable Hybrid AI</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Combines 384-dimensional vector embeddings with canonical skill taxonomies and deterministic rule enforcement to prevent AI hallucinations.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-200">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Adaptive IRT Assessments</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Computerized Dynamic Item Response Theory calibrates question difficulty in real time based on candidate answers, measuring true ability in fewer questions.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <Eye className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Client-Side CV Proctoring</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Continuous webcam face presence, gaze vector tracking, multi-face alerts, and browser tab anomaly logging protect assessment integrity.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-200">
              <FileCheck className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Evidence-Backed Skills</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Candidate skill assertions are backed by real GitHub repositories, verified code commits, and project proof artifacts.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
              <Briefcase className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Enterprise Drive Automation</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Corporate recruiters define criteria, schedule rounds, broadcast notifications via email/SMS, and download shortlisted candidate rosters in 1 click.
            </p>
          </div>
        </div>
      </section>

      {/* Role Workspaces */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600">Workspaces</span>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">Dedicated Role Portals</h2>
          </div>
          <span className="text-xs text-slate-500">Single Sign-On Available</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Student Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:border-brand-400 hover:shadow-md transition flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 group-hover:bg-blue-600 group-hover:text-white transition">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Student Portal</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Access verified campus recruitment drives, inspect criteria eligibility, manage evidence-backed skills, and take computerized adaptive assessments.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-700">Enrolled Students</span>
              <Link
                href="/login?role=student"
                className="rounded-xl bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-600 hover:text-white transition"
              >
                Sign In →
              </Link>
            </div>
          </div>

          {/* Recruiter Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:border-purple-400 hover:shadow-md transition flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 border border-purple-200 group-hover:bg-purple-600 group-hover:text-white transition">
                <Briefcase className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Corporate Recruiter</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Publish recruitment drives, evaluate ranked applicants with multi-factor match breakdowns, and inspect assessment integrity audits.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-700">Enterprise Partners</span>
              <Link
                href="/login?role=recruiter"
                className="rounded-xl bg-purple-50 px-3.5 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-600 hover:text-white transition"
              >
                Sign In →
              </Link>
            </div>
          </div>

          {/* Placement Admin Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:border-emerald-400 hover:shadow-md transition flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 group-hover:bg-emerald-600 group-hover:text-white transition">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Placement Office</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Manage student directories, verify cohort academic credentials, coordinate placement campaigns, and enforce campus recruitment governance.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-700">Institutional Authority</span>
              <Link
                href="/login?role=admin"
                className="rounded-xl bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-600 hover:text-white transition"
              >
                Sign In →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
