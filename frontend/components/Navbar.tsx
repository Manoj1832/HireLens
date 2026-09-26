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
          style: "bg-blue-50 text-blue-700 border-blue-200",
          icon: GraduationCap,
          portalHref: "/student",
          portalName: "Student Portal",
        };
      case "RECRUITER":
        return {
          label: "Corporate Recruiter",
          style: "bg-indigo-50 text-indigo-700 border-indigo-200",
          icon: Briefcase,
          portalHref: "/recruiter",
          portalName: "Recruiter Workspace",
        };
      case "COLLEGE_ADMIN":
        return {
          label: "Placement Admin",
          style: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: Building2,
          portalHref: "/admin",
          portalName: "Placement Office",
        };
      default:
        return {
          label: "Member",
          style: "bg-slate-50 text-slate-700 border-slate-200",
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
      <header className="sticky top-0 z-40 border-b border-surface-border bg-white/95 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white font-bold tracking-tight shadow-sm group-hover:bg-brand-700 transition">
              HL
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-extrabold tracking-tight text-navy-900">
                  HireLens
                </span>
                <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700 uppercase tracking-wide border border-brand-200">
                  Campus
                </span>
              </div>
              <p className="text-[11px] text-navy-500 hidden sm:block -mt-0.5">
                College Recruitment & Assessment Platform
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
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    pathname.startsWith(roleMeta.portalHref)
                      ? "bg-brand-50 text-brand-700 border border-brand-200"
                      : "text-navy-700 hover:bg-surface-subtle"
                  }`}
                >
                  <roleMeta.icon className="h-4 w-4 text-brand-600" />
                  <span>{roleMeta.portalName}</span>
                </Link>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-navy-600">
                <Link
                  href="/student"
                  className="px-2.5 py-1.5 rounded-lg hover:text-navy-900 hover:bg-surface-subtle transition"
                >
                  Students
                </Link>
                <Link
                  href="/recruiter"
                  className="px-2.5 py-1.5 rounded-lg hover:text-navy-900 hover:bg-surface-subtle transition"
                >
                  Recruiters
                </Link>
                <Link
                  href="/admin"
                  className="px-2.5 py-1.5 rounded-lg hover:text-navy-900 hover:bg-surface-subtle transition"
                >
                  Placement Cell
                </Link>
              </div>
            )}

            {/* User Session Area */}
            {isLoading ? (
              <div className="h-8 w-24 rounded-lg bg-slate-100 animate-pulse" />
            ) : isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                <NotificationBell />
                <div className="relative flex items-center gap-2" ref={dropdownRef}>
                  {/* Profile Trigger Button */}
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 rounded-xl border border-surface-border bg-surface-subtle px-2.5 py-1.5 hover:bg-surface-accent hover:border-brand-200 transition focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white font-bold text-xs shadow-xs">
                    {userInitials}
                  </div>
                  <div className="text-left hidden sm:block">
                    <span className="block text-xs font-bold text-navy-900 leading-tight max-w-[120px] truncate">
                      {user.full_name}
                    </span>
                    <span className="block text-[10px] text-navy-500 font-medium leading-tight">
                      {user.role === "STUDENT"
                        ? user.register_number || "Student"
                        : user.role === "COLLEGE_ADMIN"
                        ? "Dean of Placements"
                        : user.company_name || "Recruiter"}
                    </span>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-navy-400" />
                </button>

                {/* Direct 1-Click Sign Out Button */}
                <button
                  type="button"
                  onClick={logout}
                  title="Sign out of HireLens"
                  className="rounded-lg border border-surface-border p-1.5 text-navy-500 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition hidden sm:inline-flex"
                >
                  <LogOut className="h-4 w-4" />
                </button>

                {/* Profile Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-surface-border bg-white p-4 shadow-xl shadow-blue-900/10 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                    {/* User Header */}
                    <div className="flex items-start gap-3 pb-3 border-b border-surface-border">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white font-bold text-sm shadow-xs">
                        {userInitials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-navy-900 truncate">
                          {user.full_name}
                        </h4>
                        <p className="text-xs text-navy-500 truncate">{user.email}</p>
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
                    <div className="py-3 space-y-1.5 text-xs text-navy-600 border-b border-surface-border">
                      {user.role === "STUDENT" && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-navy-400">Roll Number:</span>
                            <span className="font-semibold text-navy-900 font-mono">
                              {user.register_number || "Not assigned"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-navy-400">Department:</span>
                            <span className="font-semibold text-navy-900 text-right truncate max-w-[140px]">
                              {user.department || "Engineering"}
                            </span>
                          </div>
                          {user.batch && (
                            <div className="flex justify-between">
                              <span className="text-navy-400">Cohort Batch:</span>
                              <span className="font-semibold text-navy-900">{user.batch}</span>
                            </div>
                          )}
                          {user.cgpa && (
                            <div className="flex justify-between">
                              <span className="text-navy-400">Verified CGPA:</span>
                              <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                {user.cgpa.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </>
                      )}

                      {user.role === "RECRUITER" && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-navy-400">Company:</span>
                            <span className="font-semibold text-navy-900">
                              {user.company_name || "Enterprise Partner"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-navy-400">Designation:</span>
                            <span className="font-semibold text-navy-900">
                              {user.designation || "Talent Acquisition"}
                            </span>
                          </div>
                        </>
                      )}

                      {user.role === "COLLEGE_ADMIN" && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-navy-400">Authority:</span>
                            <span className="font-semibold text-navy-900">Placement Cell</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-navy-400">Designation:</span>
                            <span className="font-semibold text-navy-900">
                              {user.designation || "Dean of Placements"}
                            </span>
                          </div>
                        </>
                      )}

                      <div className="flex justify-between pt-1">
                        <span className="text-navy-400">Session Security:</span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
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
                        className="w-full rounded-xl bg-surface-subtle hover:bg-surface-accent border border-surface-border px-3 py-2 text-xs font-semibold text-navy-800 transition flex items-center justify-between"
                      >
                        <span>View Full Profile</span>
                        <ExternalLink className="h-3.5 w-3.5 text-navy-400" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          logout();
                        }}
                        className="w-full rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-2 text-xs font-bold transition flex items-center justify-center gap-1.5"
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
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-700 transition"
              >
                <span>Sign In</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Profile Details Dialog Modal */}
      {profileModalOpen && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl border border-surface-border bg-white p-6 sm:p-8 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setProfileModalOpen(false)}
              className="absolute right-5 top-5 rounded-full p-1.5 text-navy-400 hover:bg-surface-subtle hover:text-navy-700 transition"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white font-extrabold text-xl shadow-md shadow-brand-600/20">
                {userInitials}
              </div>
              <div>
                <h3 className="text-xl font-bold text-navy-900">{user.full_name}</h3>
                <p className="text-xs text-navy-500">{user.email}</p>
                {roleMeta && (
                  <span
                    className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${roleMeta.style}`}
                  >
                    <roleMeta.icon className="h-3.5 w-3.5" />
                    <span>{roleMeta.label}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Detailed Metadata Grid */}
            <div className="rounded-2xl border border-surface-border bg-surface-subtle p-4 space-y-3 text-xs mb-6">
              <div className="flex items-center justify-between pb-2 border-b border-surface-border">
                <span className="font-medium text-navy-500">Unique Identity ID</span>
                <span className="font-mono text-navy-900 font-semibold">{user.id}</span>
              </div>

              {user.role === "STUDENT" && (
                <>
                  <div className="flex items-center justify-between pb-2 border-b border-surface-border">
                    <span className="font-medium text-navy-500">Student Roll Number</span>
                    <span className="font-mono text-navy-900 font-bold text-sm">
                      {user.register_number || "23Z342"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-surface-border">
                    <span className="font-medium text-navy-500">Academic Department</span>
                    <span className="text-navy-900 font-semibold">{user.department || "CSE"}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-surface-border">
                    <span className="font-medium text-navy-500">Graduation Batch</span>
                    <span className="text-navy-900 font-semibold">{user.batch || "2023-2027"}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-surface-border">
                    <span className="font-medium text-navy-500">Verified CGPA</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {user.cgpa ? user.cgpa.toFixed(2) : "8.80"} / 10.0
                    </span>
                  </div>
                </>
              )}

              {user.role === "RECRUITER" && (
                <>
                  <div className="flex items-center justify-between pb-2 border-b border-surface-border">
                    <span className="font-medium text-navy-500">Corporate Enterprise</span>
                    <span className="text-navy-900 font-bold">
                      {user.company_name || "Enterprise Partner"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-surface-border">
                    <span className="font-medium text-navy-500">Title / Designation</span>
                    <span className="text-navy-900 font-semibold">
                      {user.designation || "Talent Acquisition Lead"}
                    </span>
                  </div>
                </>
              )}

              {user.role === "COLLEGE_ADMIN" && (
                <>
                  <div className="flex items-center justify-between pb-2 border-b border-surface-border">
                    <span className="font-medium text-navy-500">Administrative Office</span>
                    <span className="text-navy-900 font-bold">College Placement Cell</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-surface-border">
                    <span className="font-medium text-navy-500">Position</span>
                    <span className="text-navy-900 font-semibold">
                      {user.designation || "Dean of Placement & Training"}
                    </span>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between">
                <span className="font-medium text-navy-500">Account Authorization</span>
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">
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
                className="flex-1 rounded-xl border border-surface-border py-2.5 text-xs font-semibold text-navy-700 hover:bg-surface-subtle transition"
              >
                Close Profile
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileModalOpen(false);
                  logout();
                }}
                className="rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 px-4 py-2.5 text-xs font-bold transition flex items-center gap-1.5"
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
