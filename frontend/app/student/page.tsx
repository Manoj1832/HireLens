"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import ProfileEditor from "@/components/student/ProfileEditor";
import ResumeEvidenceManager from "@/components/student/ResumeEvidenceManager";
import {
  Briefcase,
  UserCheck,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  FileText,
} from "lucide-react";

import DriveBrowser from "@/components/student/DriveBrowser";

function StudentDashboardContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const initialTab = tabParam === "profile" ? "profile" : tabParam === "resume" ? "resume" : "drives";
  const [activeTab, setActiveTab] = useState<"drives" | "profile" | "resume">(initialTab);

  useEffect(() => {
    const p = searchParams.get("tab");
    if (p === "profile") {
      setActiveTab("profile");
    } else if (p === "resume") {
      setActiveTab("resume");
    } else if (p === "drives") {
      setActiveTab("drives");
    }
  }, [searchParams]);

  const switchTab = (tab: "drives" | "profile" | "resume") => {
    setActiveTab(tab);
    router.replace(`/student?tab=${tab}`);
  };

  return (
    <div className="space-y-6">
      {/* Modern Segmented Navigation Bar - Dark AI Style */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-obsidian-850/80 border border-white/10 shadow-glass backdrop-blur-xl overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => switchTab("drives")}
          className={`flex items-center gap-2.5 px-4 sm:px-5 py-2.5 text-xs font-bold rounded-xl transition whitespace-nowrap ${
            activeTab === "drives"
              ? "bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-cyber-glow"
              : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          <Briefcase className={`h-4 w-4 ${activeTab === "drives" ? "text-white" : "text-cyan-400"}`} />
          <span>Campus Placement Drives</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab("profile")}
          className={`flex items-center gap-2.5 px-4 sm:px-5 py-2.5 text-xs font-bold rounded-xl transition whitespace-nowrap ${
            activeTab === "profile"
              ? "bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-cyber-glow"
              : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          <UserCheck className={`h-4 w-4 ${activeTab === "profile" ? "text-white" : "text-cyan-400"}`} />
          <span>My Verified Profile</span>
          <span className={`rounded-full text-[10px] px-2 py-0.5 font-bold ${
            activeTab === "profile"
              ? "bg-white/20 text-white"
              : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
          }`}>
            Verified
          </span>
        </button>

        <button
          type="button"
          onClick={() => switchTab("resume")}
          className={`flex items-center gap-2.5 px-4 sm:px-5 py-2.5 text-xs font-bold rounded-xl transition whitespace-nowrap ${
            activeTab === "resume"
              ? "bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-cyber-glow"
              : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          <FileText className={`h-4 w-4 ${activeTab === "resume" ? "text-white" : "text-cyan-400"}`} />
          <span>Resume & Evidence Intelligence</span>
        </button>
      </div>

      {activeTab === "resume" ? (
        /* Resume Processing Pipeline & Skill Evidence */
        <ResumeEvidenceManager />
      ) : activeTab === "profile" ? (
        /* Student Profile Editor */
        <ProfileEditor />
      ) : (
        /* Phase 4 Active Drives & Application Browser */
        <DriveBrowser onNavigateToResume={() => switchTab("resume")} />
      )}
    </div>
  );
}

export default function StudentDashboardPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-navy-500 font-medium">Loading Student Portal...</div>}>
      <StudentDashboardContent />
    </Suspense>
  );
}
