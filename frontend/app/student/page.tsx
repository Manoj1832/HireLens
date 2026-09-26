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
      {/* Modern Segmented Navigation Bar - Zepto / Uber style */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white border border-surface-border shadow-xs overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => switchTab("drives")}
          className={`flex items-center gap-2.5 px-4 sm:px-5 py-2.5 text-xs font-bold rounded-xl transition whitespace-nowrap ${
            activeTab === "drives"
              ? "bg-brand-600 text-white shadow-xs"
              : "text-navy-600 hover:text-navy-950 hover:bg-surface-subtle"
          }`}
        >
          <Briefcase className={`h-4 w-4 ${activeTab === "drives" ? "text-white" : "text-brand-600"}`} />
          <span>Campus Placement Drives</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab("profile")}
          className={`flex items-center gap-2.5 px-4 sm:px-5 py-2.5 text-xs font-bold rounded-xl transition whitespace-nowrap ${
            activeTab === "profile"
              ? "bg-brand-600 text-white shadow-xs"
              : "text-navy-600 hover:text-navy-950 hover:bg-surface-subtle"
          }`}
        >
          <UserCheck className={`h-4 w-4 ${activeTab === "profile" ? "text-white" : "text-brand-600"}`} />
          <span>My Verified Profile</span>
          <span className={`rounded-full text-[10px] px-2 py-0.5 font-bold ${
            activeTab === "profile"
              ? "bg-white/20 text-white"
              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
          }`}>
            Verified
          </span>
        </button>

        <button
          type="button"
          onClick={() => switchTab("resume")}
          className={`flex items-center gap-2.5 px-4 sm:px-5 py-2.5 text-xs font-bold rounded-xl transition whitespace-nowrap ${
            activeTab === "resume"
              ? "bg-brand-600 text-white shadow-xs"
              : "text-navy-600 hover:text-navy-950 hover:bg-surface-subtle"
          }`}
        >
          <FileText className={`h-4 w-4 ${activeTab === "resume" ? "text-white" : "text-brand-600"}`} />
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
