"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, UserRole } from "@/lib/auth-context";
import {
  GraduationCap,
  Briefcase,
  Building2,
  LogOut,
  User as UserIcon,
  ChevronDown,
  ShieldCheck,
  Award,
  Sparkles,
  ArrowRight,
  X,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import NotificationBell from "@/components/common/NotificationBell";

export default function Navbar() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "STUDENT":
        return {
          label: "Verified Student",
          style: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
          icon: GraduationCap,
          portalHref: "/student",
          portalName: "Student Portal",
        };
      case "RECRUITER":
        return {
          label: "Corporate Recruiter",
          style: "bg-purple-500/10 text-purple-300 border-purple-500/30",
          icon: Briefcase,
          portalHref: "/recruiter",
          portalName: "Recruiter Workspace",
        };
      case "COLLEGE_ADMIN":
        return {
          label: "Placement Admin",
          style: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
          icon: Building2,
          portalHref: "/admin",
          portalName: "Placement Office",
        };
      default:
        return {
          label: "Member",
          style: "bg-slate-800 text-slate-300 border-slate-700",
          icon: UserIcon,
          portalHref: "/",
          portalName: "Home",
        };
    }
  };

  const userInitials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "HL";

  const roleMeta = user ? getRoleBadge(user.role) : null;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-obsidian-950/80 backdrop-blur-xl shadow-glass">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white font-black text-sm tracking-tight shadow-cyber-glow group-hover:scale-105 transition-all duration-300">
              HL
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-white group-hover:text-cyan-300 transition">
                  HireLens
                </span>
                <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest border border-cyan-500/20 shadow-xs">
                  AI CORE
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block -mt-0.5 font-medium tracking-wide">
                Autonomous Talent Intelligence Platform
              </p>
            </div>
          </Link>

          {/* Navigation Links & Session Controls */}
          <nav className="flex items-center gap-3 sm:gap-4">
            {/* Primary Portal Navigation */}
            {isAuthenticated && roleMeta ? (
              <div className="flex items-center gap-2">
                <Link
                  href={roleMeta.portalHref}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                    pathname.startsWith(roleMeta.portalHref)
                      ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-xs"
                      : "text-slate-300 hover:text-white hover:bg-white/[0.06]"
                  }`}
                >
                  <roleMeta.icon className="h-4 w-4 text-cyan-400" />
                  <span>{roleMeta.portalName}</span>
                </Link>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-1 text-xs font-semibold text-slate-400">
                <Link
                  href="/student"
                  className="px-3 py-1.5 rounded-xl hover:text-white hover:bg-white/[0.06] transition"
                >
                  Students
                </Link>
                <Link
                  href="/recruiter"
                  className="px-3 py-1.5 rounded-xl hover:text-white hover:bg-white/[0.06] transition"
                >
                  Recruiters
                </Link>
                <Link
                  href="/admin"
                  className="px-3 py-1.5 rounded-xl hover:text-white hover:bg-white/[0.06] transition"
                >
                  Placement Cell
                </Link>
              </div>
            )}

            {/* User Session Area */}
            {isLoading ? (
              <div className="h-8 w-24 rounded-lg bg-slate-800/60 animate-pulse" />
            ) : isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                <NotificationBell />
                <div className="relative flex items-center gap-2" ref={dropdownRef}>
                  {/* Profile Trigger Button */}
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5 hover:bg-white/[0.08] hover:border-cyan-500/30 transition focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white font-bold text-xs shadow-xs">
                    {userInitials}
                  </div>
                  <div className="text-left hidden sm:block">
                    <span className="block text-xs font-bold text-white leading-tight max-w-[120px] truncate">
                      {user.full_name}
                    </span>
                    <span className="block text-[10px] text-slate-400 font-medium leading-tight">
                      {user.role === "STUDENT"
                        ? user.register_number || "Student"
                        : user.role === "COLLEGE_ADMIN"
                        ? "Placement Dean"
                        : user.company_name || "Recruiter"}
                    </span>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {/* Direct 1-Click Sign Out Button */}
                <button
                  type="button"
                  onClick={logout}
                  title="Sign out of HireLens"
                  className="rounded-xl border border-white/10 p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 transition hidden sm:inline-flex"
                >
                  <LogOut className="h-4 w-4" />
                </button>

                {/* Profile Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-white/10 bg-obsidian-900/95 p-4 shadow-glass z-50 animate-in fade-in slide-in-from-top-1 duration-150 backdrop-blur-2xl">
                    {/* User Header */}
                    <div className="flex items-start gap-3 pb-3 border-b border-white/[0.08]">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white font-bold text-sm shadow-xs">
                        {userInitials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-white truncate">
                          {user.full_name}
                        </h4>
                        <p className="text-xs text-slate-400 truncate">{user.email}</p>
                        {roleMeta && (
                          <span
                            className={`mt-1.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${roleMeta.style}`}
                          >
                            <roleMeta.icon className="h-3 w-3" />
                            <span>{roleMeta.label}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Academic / Professional Highlights */}
                    <div className="py-3 space-y-1.5 text-xs text-slate-300 border-b border-white/[0.08]">
                      {user.role === "STUDENT" && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Roll Number:</span>
                            <span className="font-semibold text-white font-mono">
                              {user.register_number || "Not assigned"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Department:</span>
                            <span className="font-semibold text-white text-right truncate max-w-[140px]">
                              {user.department || "Engineering"}
                            </span>
                          </div>
                          {user.batch && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Cohort Batch:</span>
                              <span className="font-semibold text-white">{user.batch}</span>
                            </div>
                          )}
                          {user.cgpa && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Verified CGPA:</span>
                              <span className="font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono">
                                {user.cgpa.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </>
                      )}

                      {user.role === "RECRUITER" && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Company:</span>
                            <span className="font-semibold text-white">
                              {user.company_name || "Enterprise Partner"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Designation:</span>
                            <span className="font-semibold text-white">
                              {user.designation || "Talent Acquisition"}
                            </span>
                          </div>
                        </>
                      )}

                      {user.role === "COLLEGE_ADMIN" && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Authority:</span>
                            <span className="font-semibold text-white">Placement Cell</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Designation:</span>
                            <span className="font-semibold text-white">
                              {user.designation || "Dean of Placements"}
                            </span>
                          </div>
                        </>
                      )}

                      <div className="flex justify-between pt-1">
                        <span className="text-slate-400">Session Security:</span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                          <ShieldCheck className="h-3 w-3" />
                          <span>Active (Verified)</span>
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 space-y-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          setProfileModalOpen(true);
                        }}
                        className="w-full rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 hover:text-white transition flex items-center justify-between"
                      >
                        <span>View Full Profile</span>
                        <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          logout();
                        }}
                        className="w-full rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 px-3 py-2 text-xs font-bold transition flex items-center justify-center gap-1.5"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Sign Out of HireLens</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-cyber-glow hover:opacity-95 transition"
              >
                <span>Access Portal</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Profile Details Dialog Modal */}
      {profileModalOpen && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-obsidian-900/95 p-6 sm:p-8 shadow-2xl relative text-slate-100 backdrop-blur-2xl">
            <button
              type="button"
              onClick={() => setProfileModalOpen(false)}
              className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white font-black text-xl shadow-cyber-glow">
                {userInitials}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{user.full_name}</h3>
                <p className="text-xs text-slate-400 font-mono">{user.email}</p>
                {roleMeta && (
                  <span
                    className={`mt-1.5 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${roleMeta.style}`}
                  >
                    <roleMeta.icon className="h-3.5 w-3.5" />
                    <span>{roleMeta.label}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Detailed Metadata Grid */}
            <div className="rounded-2xl border border-white/10 bg-obsidian-950/60 p-4 space-y-3 text-xs mb-6">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                <span className="font-medium text-slate-400">Unique Identity ID</span>
                <span className="font-mono text-cyan-300 font-semibold">{user.id}</span>
              </div>

              {user.role === "STUDENT" && (
                <>
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                    <span className="font-medium text-slate-400">Student Roll Number</span>
                    <span className="font-mono text-white font-bold text-sm">
                      {user.register_number || "23Z342"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                    <span className="font-medium text-slate-400">Academic Department</span>
                    <span className="text-white font-semibold">{user.department || "CSE"}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                    <span className="font-medium text-slate-400">Graduation Batch</span>
                    <span className="text-white font-semibold">{user.batch || "2023-2027"}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                    <span className="font-medium text-slate-400">Verified CGPA</span>
                    <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                      {user.cgpa ? user.cgpa.toFixed(2) : "8.80"} / 10.0
                    </span>
                  </div>
                </>
              )}

              {user.role === "RECRUITER" && (
                <>
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                    <span className="font-medium text-slate-400">Corporate Enterprise</span>
                    <span className="text-white font-bold">
                      {user.company_name || "Enterprise Partner"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                    <span className="font-medium text-slate-400">Title / Designation</span>
                    <span className="text-white font-semibold">
                      {user.designation || "Talent Acquisition Lead"}
                    </span>
                  </div>
                </>
              )}

              {user.role === "COLLEGE_ADMIN" && (
                <>
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                    <span className="font-medium text-slate-400">Administrative Office</span>
                    <span className="text-white font-bold">College Placement Cell</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                    <span className="font-medium text-slate-400">Position</span>
                    <span className="text-white font-semibold">
                      {user.designation || "Dean of Placement & Training"}
                    </span>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-400">Account Authorization</span>
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 font-bold text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>ACTIVE (Row Level Isolated)</span>
                </span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/[0.08] transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileModalOpen(false);
                  logout();
                }}
                className="rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 px-4 py-2.5 text-xs font-bold transition flex items-center gap-1.5"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
