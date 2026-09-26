"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { BrainCircuit, Users, Sparkles, Building, GraduationCap, Plus } from "lucide-react";
import PlacementAnalyticsDashboard from "@/components/analytics/PlacementAnalyticsDashboard";

interface StudentRecord {
  id: string;
  register_number: string;
  name: string;
  institutional_email: string;
  department: string;
  batch: string;
  graduation_year: number;
  cgpa: number;
  status: string;
}

export default function AdminDashboardPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<"analytics" | "directory">("analytics");
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Student Form State
  const [newRoll, setNewRoll] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDept, setNewDept] = useState("Computer Science & Engineering");
  const [newBatch, setNewBatch] = useState("2021-2025");
  const [newGradYear, setNewGradYear] = useState(2025);
  const [newCgpa, setNewCgpa] = useState(8.5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDirectory = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:8000/api/v1/admin/student-directory", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error("Failed to load Student Directory");
      }
      const data = await res.json();
      setStudents(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectory();
  }, [token]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/admin/student-directory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          register_number: newRoll,
          name: newName,
          institutional_email: newEmail,
          department: newDept,
          batch: newBatch,
          graduation_year: Number(newGradYear),
          cgpa: Number(newCgpa),
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to add student to directory");
      }
      setShowAddModal(false);
      // Reset form
      setNewRoll("");
      setNewName("");
      setNewEmail("");
      await fetchDirectory();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.register_number.toLowerCase().includes(search.toLowerCase()) ||
      s.institutional_email.toLowerCase().includes(search.toLowerCase()) ||
      s.department.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Segmented Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-surface-border pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("analytics")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition shadow-2xs ${
            activeTab === "analytics"
              ? "bg-navy-950 text-white"
              : "bg-surface-subtle text-navy-600 hover:bg-slate-200"
          }`}
        >
          <BrainCircuit className="h-3.5 w-3.5 text-brand-400" />
          <span>Placement ML Analytics & Forecasting</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("directory")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition shadow-2xs ${
            activeTab === "directory"
              ? "bg-navy-950 text-white"
              : "bg-surface-subtle text-navy-600 hover:bg-slate-200"
          }`}
        >
          <Users className="h-3.5 w-3.5 text-emerald-400" />
          <span>Student Directory & Enrollment ({students.length})</span>
        </button>
      </div>

      {activeTab === "analytics" ? (
        <PlacementAnalyticsDashboard />
      ) : (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold text-navy-500 uppercase tracking-wider">
                Total Enrolled in Directory
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-navy-900">{students.length} Students</span>
                <span className="text-xs text-emerald-600 font-semibold">Verified</span>
              </div>
              <p className="mt-1 text-xs text-navy-400">
                Enforces institutional-domain gatekeeping
              </p>
            </div>

            <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold text-navy-500 uppercase tracking-wider">
                Active Placement Batch
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-navy-900">2021-2025</span>
                <span className="text-xs text-brand-600 font-semibold">Final Year</span>
              </div>
              <p className="mt-1 text-xs text-navy-400">
                Target graduation cohort for active recruitment
              </p>
            </div>

            <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold text-navy-500 uppercase tracking-wider">
                Access Policy
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-navy-900">Directory Gate</span>
                <span className="text-xs text-emerald-600 font-semibold">Strict RBAC</span>
              </div>
              <p className="mt-1 text-xs text-navy-400">
                Unlisted emails blocked from student dashboard
              </p>
            </div>
          </div>

          {/* Student Directory Management */}
          <div className="rounded-2xl border border-surface-border bg-white p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-lg font-bold text-navy-900">College Student Directory</h2>
                <p className="text-xs text-navy-500">
                  Authorized students permitted to register, create profiles, and participate in recruitment drives.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by Roll No, Name, or Department..."
                  className="rounded-lg border border-surface-border px-3 py-1.5 text-xs text-navy-900 placeholder:text-navy-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 w-64"
                />
                <button
                  onClick={() => setShowAddModal(true)}
                  className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
                >
                  + Enroll Student
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-navy-500">Loading Student Directory...</div>
            ) : error ? (
              <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{error}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-surface-border bg-surface-subtle text-navy-600 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Roll Number</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Institutional Email</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Batch</th>
                      <th className="py-3 px-4">CGPA</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border text-navy-800">
                    {filteredStudents.map((s) => (
                      <tr key={s.id} className="hover:bg-surface-subtle/50 transition">
                        <td className="py-3 px-4 font-mono font-bold text-navy-900">{s.register_number}</td>
                        <td className="py-3 px-4 font-semibold text-navy-900">{s.name}</td>
                        <td className="py-3 px-4 text-navy-600">{s.institutional_email}</td>
                        <td className="py-3 px-4">{s.department}</td>
                        <td className="py-3 px-4">{s.batch}</td>
                        <td className="py-3 px-4 font-semibold text-emerald-700">{s.cgpa.toFixed(2)}</td>
                        <td className="py-3 px-4">
                          <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-surface-border bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-navy-900 mb-1">
              Enroll Student in College Directory
            </h3>
            <p className="text-xs text-navy-500 mb-4">
              Students must be registered here before they can authenticate with their institutional email.
            </p>

            <form onSubmit={handleAddStudent} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-navy-700 mb-1">
                    Registration / Roll No
                  </label>
                  <input
                    type="text"
                    required
                    value={newRoll}
                    onChange={(e) => setNewRoll(e.target.value)}
                    placeholder="e.g. 21CS105"
                    className="w-full rounded-lg border border-surface-border px-3 py-1.5 text-xs text-navy-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-navy-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Meera Krishnan"
                    className="w-full rounded-lg border border-surface-border px-3 py-1.5 text-xs text-navy-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-navy-700 mb-1">
                  Institutional Email
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. 21cs105@student.psgtech.ac.in"
                  className="w-full rounded-lg border border-surface-border px-3 py-1.5 text-xs text-navy-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-navy-700 mb-1">
                    Department
                  </label>
                  <select
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full rounded-lg border border-surface-border px-3 py-1.5 text-xs text-navy-900"
                  >
                    <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Artificial Intelligence & Data Science">Artificial Intelligence & Data Science</option>
                    <option value="Electronics & Communication Engineering">Electronics & Communication Engineering</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-navy-700 mb-1">
                    CGPA
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    required
                    value={newCgpa}
                    onChange={(e) => setNewCgpa(parseFloat(e.target.value))}
                    className="w-full rounded-lg border border-surface-border px-3 py-1.5 text-xs text-navy-900"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2 pt-2 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-semibold text-navy-700 hover:bg-surface-subtle"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Enrolling..." : "Enroll Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
