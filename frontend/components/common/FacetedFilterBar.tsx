"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  X,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
  Sparkles,
  Check,
  Building,
  GraduationCap,
  IndianRupee,
  ShieldCheck,
} from "lucide-react";

export interface FacetedFilterState {
  searchQuery: string;
  selectedDepartments: string[];
  minCgpa: number;
  minCtcLpa: number;
  eligibilityOnly: boolean;
  sortBy: "ctc_desc" | "deadline_asc" | "title_asc" | "default";
}

interface FacetedFilterBarProps {
  initialState?: Partial<FacetedFilterState>;
  onFilterChange: (filters: FacetedFilterState) => void;
  availableDepartments?: string[];
  totalResultsCount?: number;
  filteredResultsCount?: number;
  placeholder?: string;
  showEligibilityToggle?: boolean;
}

const DEFAULT_DEPARTMENTS = [
  "Computer Science & Engineering",
  "Information Technology",
  "Artificial Intelligence & Data Science",
  "Electronics & Communication",
  "Electrical & Electronics",
  "Mechanical Engineering",
];

const CGPA_OPTIONS = [
  { label: "Any CGPA", value: 0 },
  { label: "≥ 7.0", value: 7.0 },
  { label: "≥ 7.5", value: 7.5 },
  { label: "≥ 8.0", value: 8.0 },
  { label: "≥ 8.5", value: 8.5 },
];

const CTC_OPTIONS = [
  { label: "All Packages", value: 0 },
  { label: "Core (≥ 6 LPA)", value: 6 },
  { label: "Dream (≥ 10 LPA)", value: 10 },
  { label: "Super Dream (≥ 18 LPA)", value: 18 },
];

export default function FacetedFilterBar({
  initialState,
  onFilterChange,
  availableDepartments = DEFAULT_DEPARTMENTS,
  totalResultsCount,
  filteredResultsCount,
  placeholder = "Search by company, role, tech stack, or requirements...",
  showEligibilityToggle = true,
}: FacetedFilterBarProps) {
  const [searchQuery, setSearchQuery] = useState(initialState?.searchQuery || "");
  const [debouncedQuery, setDebouncedQuery] = useState(initialState?.searchQuery || "");
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(
    initialState?.selectedDepartments || []
  );
  const [minCgpa, setMinCgpa] = useState<number>(initialState?.minCgpa || 0);
  const [minCtcLpa, setMinCtcLpa] = useState<number>(initialState?.minCtcLpa || 0);
  const [eligibilityOnly, setEligibilityOnly] = useState<boolean>(
    initialState?.eligibilityOnly || false
  );
  const [sortBy, setSortBy] = useState<FacetedFilterState["sortBy"]>(
    initialState?.sortBy || "default"
  );
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Debounce search query by 250ms for high performance
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Notify parent component on any filter change
  useEffect(() => {
    onFilterChange({
      searchQuery: debouncedQuery,
      selectedDepartments,
      minCgpa,
      minCtcLpa,
      eligibilityOnly,
      sortBy,
    });
  }, [debouncedQuery, selectedDepartments, minCgpa, minCtcLpa, eligibilityOnly, sortBy, onFilterChange]);

  const activeFiltersCount =
    (debouncedQuery ? 1 : 0) +
    selectedDepartments.length +
    (minCgpa > 0 ? 1 : 0) +
    (minCtcLpa > 0 ? 1 : 0) +
    (eligibilityOnly ? 1 : 0) +
    (sortBy !== "default" ? 1 : 0);

  const handleResetFilters = () => {
    setSearchQuery("");
    setDebouncedQuery("");
    setSelectedDepartments([]);
    setMinCgpa(0);
    setMinCtcLpa(0);
    setEligibilityOnly(false);
    setSortBy("default");
  };

  const toggleDepartment = (dept: string) => {
    setSelectedDepartments((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
    );
  };

  return (
    <div className="rounded-2xl border border-surface-border bg-white p-4 sm:p-5 shadow-xs space-y-3.5 transition">
      {/* Top Search & Primary Action Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Debounced Input with Clear */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-surface-border bg-surface-subtle pl-10 pr-9 py-2.5 text-xs sm:text-sm text-navy-900 placeholder-navy-400 focus:border-brand-500 focus:bg-white focus:outline-none transition shadow-2xs font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-700 transition"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Toggle Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAdvancedOpen((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition shadow-2xs ${
              isAdvancedOpen || activeFiltersCount > 0
                ? "border-brand-500 bg-brand-50 text-brand-700"
                : "border-surface-border bg-white text-navy-700 hover:bg-surface-subtle"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] text-white font-black">
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown
              className={`h-3 w-3 text-navy-400 transition-transform ${
                isAdvancedOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Quick Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as FacetedFilterState["sortBy"])}
            className="rounded-xl border border-surface-border bg-white px-3 py-2.5 text-xs font-semibold text-navy-700 shadow-2xs hover:bg-surface-subtle focus:border-brand-500 focus:outline-none transition"
          >
            <option value="default">Default Order</option>
            <option value="ctc_desc">Highest Package (CTC)</option>
            <option value="deadline_asc">Upcoming Deadlines</option>
            <option value="title_asc">Alphabetical (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Quick Filter Segmented Pills (Uber / Zepto Style) */}
      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
        <span className="text-[11px] font-bold text-navy-500 uppercase tracking-wider mr-1">
          Quick Filters:
        </span>

        {showEligibilityToggle && (
          <button
            type="button"
            onClick={() => setEligibilityOnly((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition shadow-2xs border ${
              eligibilityOnly
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-surface-subtle text-navy-700 border-surface-border hover:bg-slate-100"
            }`}
          >
            <ShieldCheck className="h-3 w-3" />
            <span>Eligible Only</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setMinCtcLpa((prev) => (prev === 18 ? 0 : 18))}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition shadow-2xs border ${
            minCtcLpa === 18
              ? "bg-purple-600 text-white border-purple-600"
              : "bg-surface-subtle text-navy-700 border-surface-border hover:bg-slate-100"
          }`}
        >
          <Sparkles className="h-3 w-3" />
          <span>Super Dream (≥ 18 LPA)</span>
        </button>

        <button
          type="button"
          onClick={() => setMinCtcLpa((prev) => (prev === 10 ? 0 : 10))}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition shadow-2xs border ${
            minCtcLpa === 10
              ? "bg-brand-600 text-white border-brand-600"
              : "bg-surface-subtle text-navy-700 border-surface-border hover:bg-slate-100"
          }`}
        >
          <IndianRupee className="h-3 w-3" />
          <span>Dream (≥ 10 LPA)</span>
        </button>

        <button
          type="button"
          onClick={() => setMinCgpa((prev) => (prev === 8.0 ? 0 : 8.0))}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition shadow-2xs border ${
            minCgpa === 8.0
              ? "bg-amber-600 text-white border-amber-600"
              : "bg-surface-subtle text-navy-700 border-surface-border hover:bg-slate-100"
          }`}
        >
          <GraduationCap className="h-3 w-3" />
          <span>CGPA ≥ 8.0</span>
        </button>

        {activeFiltersCount > 0 && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 ml-auto py-1 px-2 hover:bg-rose-50 rounded-lg transition"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset All</span>
          </button>
        )}
      </div>

      {/* Advanced Expandable Filter Panel */}
      {isAdvancedOpen && (
        <div className="rounded-xl border border-surface-border bg-surface-subtle/60 p-4 space-y-4 animate-in fade-in duration-150">
          {/* Department Multi-Select */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-navy-500" />
                Target Departments / Disciplines
              </span>
              {selectedDepartments.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedDepartments([])}
                  className="text-[11px] font-semibold text-brand-600 hover:underline"
                >
                  Clear Selection ({selectedDepartments.length})
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {availableDepartments.map((dept) => {
                const isSelected = selectedDepartments.includes(dept);
                return (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => toggleDepartment(dept)}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold border transition ${
                      isSelected
                        ? "bg-navy-900 text-white border-navy-900 shadow-2xs"
                        : "bg-white text-navy-700 border-surface-border hover:bg-slate-50"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                    <span>{dept}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Criteria Sliders / Pills Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-surface-border">
            {/* Minimum CGPA */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-navy-500" />
                Minimum CGPA Requirement
              </span>
              <div className="flex flex-wrap gap-1.5">
                {CGPA_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMinCgpa(opt.value)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold border transition ${
                      minCgpa === opt.value
                        ? "bg-navy-900 text-white border-navy-900"
                        : "bg-white text-navy-700 border-surface-border hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Compensation Tier */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
                <IndianRupee className="h-3.5 w-3.5 text-navy-500" />
                Compensation Tier (CTC)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {CTC_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMinCtcLpa(opt.value)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold border transition ${
                      minCtcLpa === opt.value
                        ? "bg-navy-900 text-white border-navy-900"
                        : "bg-white text-navy-700 border-surface-border hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Count Header */}
      {(totalResultsCount !== undefined || filteredResultsCount !== undefined) && (
        <div className="flex items-center justify-between text-xs text-navy-500 pt-1 border-t border-surface-border/60">
          <span>
            Showing{" "}
            <strong className="text-navy-900 font-bold">
              {filteredResultsCount ?? totalResultsCount}
            </strong>{" "}
            of{" "}
            <strong className="text-navy-900 font-bold">{totalResultsCount}</strong> campaigns
          </span>
          {activeFiltersCount > 0 && (
            <span className="text-[11px] text-brand-600 font-semibold">
              {activeFiltersCount} filter{activeFiltersCount > 1 ? "s" : ""} applied
            </span>
          )}
        </div>
      )}
    </div>
  );
}
