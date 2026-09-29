"use client";

import React from "react";
import { useAuth } from "@/lib/auth-context";
import { GraduationCap, ShieldCheck, LogOut, Award, UserCheck } from "lucide-react";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Institutional Student Header Card - Modern Dark AI Style */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl border border-white/10 bg-obsidian-850/80 p-5 sm:p-6 shadow-glass backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white font-black text-lg shadow-cyber-glow">
            {user?.full_name ? user.full_name.slice(0, 2).toUpperCase() : "ST"}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                {user?.full_name || "Student Candidate"}
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-[11px] font-bold text-cyan-300 border border-cyan-500/30">
                <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                Verified Student
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
              {user?.register_number && (
                <span className="font-mono font-semibold text-slate-200">
                  {user.register_number}
                </span>
              )}
              <span>•</span>
              <span>{user?.department || "PSG College of Technology"}</span>
              {user?.batch && (
                <>
                  <span>•</span>
                  <span>Batch {user.batch}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-center">
          {user?.cgpa && (
            <div className="flex items-center gap-2 rounded-2xl bg-obsidian-950/60 border border-white/10 px-3.5 py-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">Verified CGPA</span>
              <span className="text-sm font-black text-emerald-400 font-mono">
                {user.cgpa.toFixed(2)}
              </span>
            </div>
          )}
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
