"use client";

import React from "react";
import { useAuth } from "@/lib/auth-context";
import { Briefcase, Building2, ShieldCheck, LogOut } from "lucide-react";

export default function RecruiterLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Recruiter Workspace Header - Modern Dark AI Style */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl border border-white/10 bg-obsidian-850/80 p-5 sm:p-6 shadow-glass backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 text-white font-black text-lg shadow-purple-glow">
            {user?.company_name ? user.company_name.slice(0, 2).toUpperCase() : "CR"}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                {user?.company_name || "Enterprise Partner"}
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 px-2.5 py-0.5 text-[11px] font-bold text-purple-300 border border-purple-500/30">
                <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
                Verified Corporate Recruiter
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
              <span className="font-semibold text-slate-200">{user?.full_name || "Talent Partner"}</span>
              <span>•</span>
              <span>{user?.designation || "Campus Talent Acquisition"}</span>
              <span>•</span>
              <span className="font-mono text-cyan-300">{user?.email}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-center">
          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-rose-500/10 hover:text-rose-300 hover:border-rose-500/30 transition"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="w-full">{children}</main>
    </div>
  );
}
