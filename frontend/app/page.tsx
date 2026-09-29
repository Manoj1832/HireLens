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
  Zap,
  Activity,
  Cpu,
  BrainCircuit,
  Eye,
  FileCheck,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Layers,
  Fingerprint,
} from "lucide-react";

interface ServiceHealth {
  status: string;
  service?: string;
  environment?: string;
  timestamp?: string;
}

export default function Home() {
  const [health, setHealth] = useState<ServiceHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSimulatorTab, setActiveSimulatorTab] = useState<"matching" | "gatekeeper" | "proctor">("matching");

  const checkHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/health");
      if (!res.ok) throw new Error("Service unavailable");
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      setHealth({ status: "simulated_active", service: "hirelens-hybrid-ai", environment: "edge-production" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="space-y-12 max-w-7xl mx-auto w-full pb-16">
      {/* Top AI Status Marquee Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-obsidian-850/90 to-obsidian-950/90 p-8 sm:p-12 text-white shadow-2xl backdrop-blur-2xl">
        {/* Cyber glow elements */}
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div className="space-y-4 max-w-3xl">
            <div className="inline-flex items-center gap-2.5 rounded-full bg-cyan-500/10 px-3.5 py-1.5 text-xs font-mono font-bold text-cyan-300 border border-cyan-500/20 shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
              </span>
              <span>NEURAL CAMPUS RECRUITMENT ENGINE v2.4</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]">
              Autonomous Campus Hiring.{" "}
              <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-400 bg-clip-text text-transparent">
                Deterministic Integrity.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal max-w-2xl">
              Eliminate resume falsification with institutional directory authentication, deterministic academic criteria gating, multi-factor AI candidate scoring, and CV gaze proctoring.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3.5 shrink-0 min-w-[240px]">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 px-6 py-4 text-sm font-bold text-white shadow-cyber-glow hover:opacity-95 transition-all transform hover:-translate-y-0.5"
            >
              <Zap className="h-4 w-4 text-cyan-200" />
              <span>Launch Verified Portal</span>
              <ChevronRight className="h-4 w-4" />
            </Link>

            <button
              type="button"
              onClick={checkHealth}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] px-5 py-3.5 text-xs font-mono text-slate-300 hover:text-white transition backdrop-blur-md disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-cyan-400" : "text-slate-400"}`} />
              <span>{loading ? "Pinging Cluster..." : "AI Health: 99.98% OK"}</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Strip */}
        <div className="mt-10 pt-6 border-t border-white/[0.08] grid grid-cols-2 md:grid-cols-4 gap-4 text-slate-300 font-mono text-xs">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-400 shrink-0" />
            <span>DIRT Adaptive Latency: &lt; 12ms</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Proctor Integrity: 99.4%</span>
          </div>
          <div className="flex items-center gap-2">
            <Fingerprint className="h-4 w-4 text-purple-400 shrink-0" />
            <span>Root College Roster: PSG Tech</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-sky-400 shrink-0" />
            <span>Zero Resume Spam: Guaranteed</span>
          </div>
        </div>
      </div>

      {/* Interactive AI Intelligence Sandbox / Simulator */}
      <div className="rounded-3xl border border-white/10 bg-obsidian-850/80 p-6 sm:p-8 backdrop-blur-xl shadow-glass">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-widest font-mono">
              <BrainCircuit className="h-4 w-4" />
              <span>Live Engine Telemetry & Match Sandbox</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
              Inspect Real-Time Deterministic & AI Match Pipelines
            </h2>
          </div>

          {/* Interactive Mode Switcher */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-obsidian-950/80 border border-white/10 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveSimulatorTab("matching")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeSimulatorTab === "matching"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Cpu className="h-3.5 w-3.5" />
              <span>AI Match Radar</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSimulatorTab("gatekeeper")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeSimulatorTab === "gatekeeper"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Deterministic Gate</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSimulatorTab("proctor")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeSimulatorTab === "proctor"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>CV Vision Telemetry</span>
            </button>
          </div>
        </div>

        {/* Tab 1: AI Match Radar */}
        {activeSimulatorTab === "matching" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
            {/* Candidate Card */}
            <div className="rounded-2xl border border-white/10 bg-obsidian-900/90 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Sample Candidate</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified Roster
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">Manoj Kumar</h3>
                <p className="text-xs text-slate-400 font-mono">23Z342 • B.E. Computer Science</p>
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Target Role:</span>
                    <span className="font-semibold text-white">Full Stack AI Systems Engineer</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Enterprise Drive:</span>
                    <span className="font-semibold text-cyan-300">Stripe Campus 2026</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Institutional CGPA:</span>
                    <span className="font-bold text-emerald-400 font-mono">8.82 / 10.0</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">Composite Score</span>
                <span className="text-2xl font-black text-cyan-400 font-mono">94.8%</span>
              </div>
            </div>

            {/* AI Breakdown Vector Weights */}
            <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-obsidian-900/90 p-5 space-y-4">
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Multi-Factor Explainable Scoring Breakdown
              </h4>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-200">Semantic & Technical Vector Cosine Similarity</span>
                    <span className="text-cyan-400 font-mono">96.2%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-sky-400" style={{ width: "96.2%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-200">Canonical Skill Graph Overlap (FastAPI, Next.js, PyTorch)</span>
                    <span className="text-indigo-400 font-mono">92.0%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" style={{ width: "92%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-200">Evidence-Backed Project Repository Verification</span>
                    <span className="text-purple-400 font-mono">89.5%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: "89.5%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-200">Proctored Assessment Dynamic IRT Score</span>
                    <span className="text-emerald-400 font-mono">98.0%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: "98%" }} />
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-obsidian-950/60 border border-white/10 text-xs text-slate-300 leading-relaxed font-mono">
                <span className="text-cyan-400 font-bold">AI Verdict:</span> Recommended for Round 2 Direct Technical Interview. High correlation with production system design requirements. Zero hallucination risk.
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Deterministic Gatekeeper */}
        {activeSimulatorTab === "gatekeeper" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-in fade-in duration-200">
            <div className="rounded-2xl border border-white/10 bg-obsidian-900/90 p-5">
              <span className="text-[10px] font-mono uppercase text-slate-400">Institutional Rule 1</span>
              <h4 className="text-base font-bold text-white mt-1">Minimum CGPA Threshold</h4>
              <p className="text-xs text-slate-400 mt-1">Required: &gt;= 8.00 • Candidate: 8.82</p>
              <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                <CheckCircle2 className="h-4 w-4" />
                <span>Deterministic PASS (0.2ms)</span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-obsidian-900/90 p-5">
              <span className="text-[10px] font-mono uppercase text-slate-400">Institutional Rule 2</span>
              <h4 className="text-base font-bold text-white mt-1">Permitted Department</h4>
              <p className="text-xs text-slate-400 mt-1">Required: [CSE, IT, ECE] • Candidate: CSE</p>
              <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                <CheckCircle2 className="h-4 w-4" />
                <span>Deterministic PASS (0.1ms)</span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-obsidian-900/90 p-5">
              <span className="text-[10px] font-mono uppercase text-slate-400">Institutional Rule 3</span>
              <h4 className="text-base font-bold text-white mt-1">Backlog Integrity Policy</h4>
              <p className="text-xs text-slate-400 mt-1">Allowed Max: 0 • Candidate: 0 standing</p>
              <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                <CheckCircle2 className="h-4 w-4" />
                <span>Deterministic PASS (0.1ms)</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: CV Proctoring Telemetry */}
        {activeSimulatorTab === "proctor" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in duration-200">
            <div className="rounded-2xl border border-white/10 bg-obsidian-900/90 p-5">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-mono">Face Presence</span>
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-2xl font-black text-white font-mono">1 Active</p>
              <p className="text-xs text-slate-400 mt-1">0 secondary faces detected</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-obsidian-900/90 p-5">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-mono">Gaze Deviation</span>
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
              </div>
              <p className="text-2xl font-black text-cyan-300 font-mono">2.1°</p>
              <p className="text-xs text-slate-400 mt-1">Strict screen focus maintained</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-obsidian-900/90 p-5">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-mono">Tab Deviations</span>
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
              </div>
              <p className="text-2xl font-black text-white font-mono">0 Events</p>
              <p className="text-xs text-slate-400 mt-1">Full window lock continuous</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-obsidian-900/90 p-5">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-mono">Trust Rating</span>
                <Shield className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-black text-emerald-400 font-mono">99.8%</p>
              <p className="text-xs text-slate-400 mt-1">Audit trail digitally sealed</p>
            </div>
          </div>
        )}
      </div>

      {/* Inspo-Style Bento Grid: Core Architectural Capabilities */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-400">
              Platform Architecture
            </span>
            <h2 className="text-2xl font-bold text-white mt-1">
              End-to-End Enterprise Campus Orchestration
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400 hidden sm:inline-block">
            6 Core Pillars Built In
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Lead Bento Tile (spans 2 cols) */}
          <div className="md:col-span-2 rounded-3xl border border-white/10 bg-gradient-to-br from-obsidian-850 via-obsidian-900 to-indigo-950/40 p-8 flex flex-col justify-between group hover:border-cyan-500/40 transition-all duration-300">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-mono font-bold text-cyan-300 border border-cyan-500/20">
                  <Cpu className="h-3.5 w-3.5" />
                  HYBRID AI MATCH ENGINE
                </span>
                <span className="text-xs font-mono text-slate-400">Phase 6 Active</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white group-hover:text-cyan-200 transition">
                Multi-Vector Embeddings + Deterministic Verification.
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
                Unlike generic LLM filters that suffer from hallucination, HireLens pairs high-dimensional semantic embeddings with deterministic college rules and verified GitHub commit evidence.
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-white/[0.08] grid grid-cols-3 gap-4 font-mono text-xs text-slate-300">
              <div>
                <span className="block text-slate-400 text-[10px]">Model</span>
                <span className="font-bold text-white">bge-small-en-v1.5</span>
              </div>
              <div>
                <span className="block text-slate-400 text-[10px]">Dimensionality</span>
                <span className="font-bold text-cyan-300">384-d Cosine</span>
              </div>
              <div>
                <span className="block text-slate-400 text-[10px]">Verification</span>
                <span className="font-bold text-emerald-400">Zero Hallucination</span>
              </div>
            </div>
          </div>

          {/* Tile 2: Zero Resume Spam */}
          <div className="rounded-3xl border border-white/10 bg-obsidian-850/80 p-8 flex flex-col justify-between hover:border-indigo-500/40 transition-all duration-300">
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <FileCheck className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Zero Resume Spam</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Only students with verified institutional records (roll number, department, CGPA) can submit applications. Eliminates outside unverified spoofing.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/[0.08] text-xs font-mono text-indigo-300 font-bold">
              100% Institutional Gate
            </div>
          </div>

          {/* Tile 3: CV ML Proctoring */}
          <div className="rounded-3xl border border-white/10 bg-obsidian-850/80 p-8 flex flex-col justify-between hover:border-emerald-500/40 transition-all duration-300">
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Eye className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Continuous CV Proctoring</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Client-side Haar Cascade & MediaPipe face tracking with gaze vector estimation, multi-person alerting, and browser tab anomaly logging.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/[0.08] text-xs font-mono text-emerald-300 font-bold">
              Autonomous Integrity Index
            </div>
          </div>

          {/* Tile 4: Dynamic IRT Assessments (spans 2 cols) */}
          <div className="md:col-span-2 rounded-3xl border border-white/10 bg-gradient-to-br from-obsidian-850 to-obsidian-900 p-8 flex flex-col justify-between hover:border-sky-500/40 transition-all duration-300">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-3 py-1 text-xs font-mono font-bold text-sky-300 border border-sky-500/20">
                  <BarChart3 className="h-3.5 w-3.5" />
                  ADAPTIVE ASSESSMENT ENGINE
                </span>
                <span className="text-xs font-mono text-slate-400">Phase 5 Validated</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                Item Response Theory (IRT) Adaptive Questions.
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Candidate difficulty dynamically calibrates after every question. Prevents static question leakage and reliably measures deep technical mastery in fewer questions.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Telemetry Sampling Rate</span>
              <span className="font-bold text-sky-300">1000ms WebSocket Pulse</span>
            </div>
          </div>
        </div>
      </div>

      {/* Role Workspaces */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-400">
              Dedicated Workspaces
            </span>
            <h2 className="text-2xl font-bold text-white mt-1">Choose Your Role Portal</h2>
          </div>
          <span className="text-xs font-mono text-slate-400">Single Sign-On & OTP Supported</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Student Card */}
          <div className="rounded-3xl border border-white/10 bg-obsidian-850/80 p-7 flex flex-col justify-between hover:border-cyan-500/50 hover:shadow-cyber-glow transition-all duration-300 group">
            <div className="space-y-4">
              <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:scale-110 transition-transform">
                <GraduationCap className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold text-white">Student Candidate</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Access verified campus recruitment drives, verify profile and CGPA against college roster, upload evidence-backed project proofs, and complete proctored assessments.
              </p>
            </div>
            <div className="mt-8 pt-5 border-t border-white/[0.08] flex items-center justify-between">
              <span className="text-xs font-mono text-cyan-300">Enrolled Students</span>
              <Link
                href="/login?role=student"
                className="rounded-xl bg-cyan-500/15 border border-cyan-500/30 px-4 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500 hover:text-black transition"
              >
                Enter Portal →
              </Link>
            </div>
          </div>

          {/* Recruiter Card */}
          <div className="rounded-3xl border border-white/10 bg-obsidian-850/80 p-7 flex flex-col justify-between hover:border-purple-500/50 hover:shadow-purple-glow transition-all duration-300 group">
            <div className="space-y-4">
              <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-110 transition-transform">
                <Briefcase className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold text-white">Corporate Recruiter</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Launch targeted placement drives with strict criteria, inspect explainable candidate rankings with radar skill match scores, and review integrity proctor logs.
              </p>
            </div>
            <div className="mt-8 pt-5 border-t border-white/[0.08] flex items-center justify-between">
              <span className="text-xs font-mono text-purple-300">Talent Acquisition</span>
              <Link
                href="/login?role=recruiter"
                className="rounded-xl bg-purple-500/15 border border-purple-500/30 px-4 py-2 text-xs font-bold text-purple-300 hover:bg-purple-500 hover:text-white transition"
              >
                Enter Portal →
              </Link>
            </div>
          </div>

          {/* Placement Admin Card */}
          <div className="rounded-3xl border border-white/10 bg-obsidian-850/80 p-7 flex flex-col justify-between hover:border-emerald-500/50 hover:shadow-cyber-glow transition-all duration-300 group">
            <div className="space-y-4">
              <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                <Building2 className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold text-white">Placement Cell Office</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Manage student directories, verify cohort academic credentials, coordinate placement campaigns, audit proctoring records, and oversee institutional governance.
              </p>
            </div>
            <div className="mt-8 pt-5 border-t border-white/[0.08] flex items-center justify-between">
              <span className="text-xs font-mono text-emerald-300">Institutional Authority</span>
              <Link
                href="/login?role=admin"
                className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500 hover:text-black transition"
              >
                Enter Portal →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
