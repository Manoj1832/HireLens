"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Shield,
  HelpCircle,
  Award,
  XCircle,
  Timer,
  ChevronRight,
  Lock,
  Sparkles,
  Activity,
  ShieldCheck,
  Camera,
  Smartphone,
  Users,
  EyeOff,
  Copy,
  ExternalLink,
  RotateCcw,
  Check,
  Zap,
} from "lucide-react";
import { useProctoringTelemetry } from "@/hooks/useProctoringTelemetry";

export interface QuestionClientView {
  id: string;
  question_number: number;
  total_questions: number;
  skill: string;
  topic: string;
  question_text: string;
  options: string[];
  difficulty: number;
}

export interface StartAttemptResponse {
  attempt_id: string;
  assessment_id: string;
  drive_id: string;
  title: string;
  student_id: string;
  attempt_number: number;
  started_at: string;
  deadline_at: string;
  duration_seconds: number;
  allow_back_navigation: boolean;
  total_questions: number;
  adaptive_mode?: boolean;
  current_difficulty?: number;
  current_question: QuestionClientView;
}

export interface AttemptSummary {
  attempt_id: string;
  assessment_id: string;
  attempt_number?: number;
  max_attempts?: number;
  can_retake?: boolean;
  raw_score?: number;
  penalty_deduction?: number;
  penalty_breakdown?: string[];
  score: number;
  passed: boolean;
  passing_score: number;
  total_questions: number;
  total_answered: number;
  total_correct: number;
  status: string;
  submitted_at: string;
  adaptive_mode?: boolean;
  final_difficulty?: number;
  theta_estimate?: number;
  integrity_trust_score?: number;
  integrity_risk_level?: string;
}

interface AssessmentRunnerProps {
  assessmentId: string;
  driveTitle?: string;
  companyName?: string;
  onClose: () => void;
  onFinished?: () => void;
}

export default function AssessmentRunner({
  assessmentId,
  driveTitle,
  companyName,
  onClose,
  onFinished,
}: AssessmentRunnerProps) {
  const { token } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active session state
  const [attempt, setAttempt] = useState<StartAttemptResponse | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionClientView | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Completed session state
  const [summary, setSummary] = useState<AttemptSummary | null>(null);

  // Cheating simulator panel expanded state
  const [showSimPanel, setShowSimPanel] = useState<boolean>(true);
  const [simulatedIncidentMsg, setSimulatedIncidentMsg] = useState<string | null>(null);

  // Synchronized countdown timer
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const questionStartTimeRef = useRef<number>(Date.now());

  // Phase 8: Proctoring & Browser Telemetry Monitor with Computer Vision ML
  const {
    integrity,
    isFullscreen,
    cameraActive,
    cameraError,
    videoRef,
    faceCount,
    visionVerified,
    visionStatusMessage,
    isSimulatedCamera,
    requestFullscreen,
    dismissWarning,
    simulateMalpractice,
  } = useProctoringTelemetry({
    attemptId: attempt?.attempt_id || null,
    token: token || null,
    enabled: Boolean(attempt && !summary),
    enableCamera: true,
  });

  const handleClose = () => {
    if (onFinished) onFinished();
    onClose();
  };

  // Start a fresh attempt (e.g. Attempt 1 or Retake Attempt 2)
  const startFreshAttempt = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    setSummary(null);

    try {
      const startRes = await fetch(
        `http://localhost:8000/api/v1/assessments/${assessmentId}/start`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!startRes.ok) {
        const errData = await startRes.json().catch(() => ({ detail: "Failed to start assessment" }));
        throw new Error(errData.detail || "Unable to start assessment.");
      }

      const attemptData: StartAttemptResponse = await startRes.json();
      setAttempt(attemptData);
      setCurrentQuestion(attemptData.current_question);
      setSelectedOption(null);
      questionStartTimeRef.current = Date.now();

      // Calculate server deadline remaining seconds
      const deadline = new Date(attemptData.deadline_at).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((deadline - now) / 1000));
      setSecondsRemaining(remaining);
    } catch (err: any) {
      setError(err.message || "Failed to initialize assessment attempt.");
    } finally {
      setLoading(false);
    }
  };

  // Check if student already has completed attempts or active session
  const initializeAssessment = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Check existing attempt status
      const existingRes = await fetch(
        `http://localhost:8000/api/v1/assessments/${assessmentId}/my-attempt`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (existingRes.ok) {
        const existingData = await existingRes.json();
        if (existingData && (existingData.status === "COMPLETED" || existingData.status === "EXPIRED")) {
          // If already completed and NO attempts remaining, show summary
          if (!existingData.can_retake) {
            setSummary({
              attempt_id: existingData.attempt_id,
              assessment_id: existingData.assessment_id,
              attempt_number: existingData.attempt_number,
              max_attempts: existingData.max_attempts || 2,
              can_retake: existingData.can_retake,
              raw_score: existingData.raw_score,
              penalty_deduction: existingData.penalty_deduction,
              penalty_breakdown: existingData.penalty_breakdown,
              score: existingData.score,
              passed: existingData.passed,
              passing_score: existingData.passing_score,
              total_questions: existingData.total_questions,
              total_answered: existingData.total_answered,
              total_correct: existingData.total_correct,
              status: existingData.status,
              submitted_at: existingData.submitted_at || new Date().toISOString(),
              adaptive_mode: existingData.adaptive_mode,
              final_difficulty: existingData.final_difficulty,
              theta_estimate: existingData.theta_estimate,
              integrity_trust_score: existingData.integrity_trust_score ?? 100.0,
              integrity_risk_level: existingData.integrity_risk_level ?? "CLEAN",
            });
            setLoading(false);
            return;
          }
        }
      }

      // 2. Start or Resume active attempt
      await startFreshAttempt();
    } catch (err: any) {
      setError(err.message || "Failed to initialize test environment.");
      setLoading(false);
    }
  };

  useEffect(() => {
    initializeAssessment();
  }, [assessmentId, token]);

  // Synchronized countdown timer tick
  useEffect(() => {
    if (!attempt || summary || secondsRemaining <= 0) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [attempt, summary, secondsRemaining]);

  // Server-authoritative expiration handler
  const handleTimeExpired = async () => {
    if (!attempt || !token) return;
    try {
      const res = await fetch(
        `http://localhost:8000/api/v1/assessments/${assessmentId}/submit?attempt_id=${attempt.attempt_id}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const sumData = await res.json();
        setSummary(sumData);
        if (onFinished) onFinished();
      }
    } catch (e) {
      console.error("Auto submit error:", e);
    }
  };

  // Submit Answer Choice
  const handleAnswerSubmit = async () => {
    if (!token || !attempt || !currentQuestion || !selectedOption) return;
    setSubmitting(true);

    const responseTime = Date.now() - questionStartTimeRef.current;

    try {
      const res = await fetch(`http://localhost:8000/api/v1/assessments/${assessmentId}/answer`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          attempt_id: attempt.attempt_id,
          question_id: currentQuestion.id,
          selected_answer: selectedOption,
          response_time_ms: responseTime,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: "Answer submission failed" }));
        throw new Error(errData.detail || "Failed to record answer.");
      }

      const answerData = await res.json();

      if (answerData.is_finished || !answerData.next_question) {
        // Assessment complete -> fetch final scored attempt summary
        const summaryRes = await fetch(
          `http://localhost:8000/api/v1/assessments/${assessmentId}/submit?attempt_id=${attempt.attempt_id}`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (summaryRes.ok) {
          const sumData = await summaryRes.json();
          setSummary(sumData);
          if (onFinished) onFinished();
        }
      } else {
        // Advance to next question
        setCurrentQuestion(answerData.next_question);
        setSelectedOption(null);
        questionStartTimeRef.current = Date.now();
      }
    } catch (err: any) {
      alert(err.message || "Failed to submit answer.");
    } finally {
      setSubmitting(false);
    }
  };

  // Cheating / Malpractice simulation handler
  const handleTriggerSimulation = async (
    type:
      | "TAB_SWITCH"
      | "WINDOW_BLUR"
      | "CLIPBOARD_PASTE"
      | "FULLSCREEN_EXIT"
      | "FACE_MISSING"
      | "MULTIPLE_FACES"
      | "OBJECT_DETECTED",
    label: string,
    penaltyLabel: string
  ) => {
    await simulateMalpractice(type);
    setSimulatedIncidentMsg(`Logged: ${label} (${penaltyLabel})`);
    setTimeout(() => setSimulatedIncidentMsg(null), 4000);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const isLowTime = secondsRemaining > 0 && secondsRemaining < 120;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-3xl border border-surface-border bg-white shadow-2xl flex flex-col h-[92vh] max-h-[880px] overflow-hidden">
        {/* Loading State */}
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
            <div className="h-10 w-10 animate-spin rounded-full border-3 border-brand-600 border-t-transparent" />
            <h3 className="text-sm font-bold text-navy-900">Setting up Proctoring Environment...</h3>
            <p className="text-xs text-navy-500">
              Synchronizing server-authoritative timer, face detection models, and questions...
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="p-8 text-center space-y-4 my-auto">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 border border-red-200">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-navy-950">Unable to Start Assessment</h3>
              <p className="text-xs text-red-600 font-medium max-w-md mx-auto">{error}</p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl bg-navy-900 text-white px-5 py-2.5 text-xs font-bold hover:bg-navy-800 transition shadow-sm"
            >
              Return to Drives
            </button>
          </div>
        )}

        {/* Results / Completion View */}
        {!loading && !error && summary && (
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-2">
              <div
                className={`mx-auto h-14 w-14 rounded-2xl flex items-center justify-center border ${
                  summary.passed
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                    : "bg-amber-50 text-amber-600 border-amber-200"
                }`}
              >
                {summary.passed ? <CheckCircle2 className="h-8 w-8" /> : <Award className="h-8 w-8" />}
              </div>
              <h2 className="text-xl font-bold text-navy-950">
                Assessment {summary.passed ? "Passed" : "Completed"}
              </h2>
              <div className="flex items-center justify-center gap-2 text-xs text-navy-500">
                <span>{driveTitle || "Technical Screening"}</span>
                <span>•</span>
                <span className="font-semibold text-brand-700 bg-brand-50 border border-brand-200 rounded-md px-2 py-0.5">
                  Attempt {summary.attempt_number || 1} of {summary.max_attempts || 2}
                </span>
              </div>
            </div>

            {/* Score Metric Card */}
            <div className="rounded-2xl border border-surface-border bg-surface-subtle p-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="space-y-1">
                <span className="text-[10px] text-navy-400 uppercase font-semibold">Final Score</span>
                <span
                  className={`block text-2xl font-black ${
                    summary.passed ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {summary.score}%
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-navy-400 uppercase font-semibold">Raw Objective</span>
                <span className="block text-2xl font-bold text-navy-700">
                  {summary.raw_score !== undefined ? `${summary.raw_score}%` : `${summary.score}%`}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-navy-400 uppercase font-semibold">Pass Threshold</span>
                <span className="block text-2xl font-bold text-navy-700">{summary.passing_score}%</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-navy-400 uppercase font-semibold">Accuracy</span>
                <span className="block text-2xl font-bold text-navy-700">
                  {summary.total_correct}/{summary.total_questions}
                </span>
              </div>
            </div>

            {/* Cheating & Malpractice Score Deduction Audit Card */}
            {summary.penalty_deduction && summary.penalty_deduction > 0 ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 space-y-2 text-xs text-rose-950">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-rose-900">
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                    <span>Cheating / Malpractice Score Penalty Deducted</span>
                  </div>
                  <span className="rounded-full bg-rose-200 text-rose-900 px-2.5 py-0.5 font-black text-xs">
                    -{summary.penalty_deduction}%
                  </span>
                </div>
                <p className="text-[11px] text-rose-800">
                  Suspicious activities and proctoring incidents were recorded. Objective score of{" "}
                  <strong>{summary.raw_score}%</strong> was adjusted down to{" "}
                  <strong>{summary.score}%</strong>.
                </p>
                {summary.penalty_breakdown && summary.penalty_breakdown.length > 0 && (
                  <div className="pt-1 space-y-1">
                    {summary.penalty_breakdown.map((item, idx) => (
                      <p key={idx} className="text-[10px] font-mono text-rose-700">
                        • {item}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {/* Adaptive Assessment Profile (CAT / IRT) */}
            {summary.adaptive_mode && (
              <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <span>Adaptive Testing Profile (CAT / IRT)</span>
                  </div>
                  <span className="rounded-full bg-purple-200/70 text-purple-900 px-2 py-0.5 text-[10px] font-bold">
                    Computerized Adaptive Testing
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1 text-center">
                  <div className="rounded-xl bg-white/80 p-2.5 border border-purple-100">
                    <span className="text-[10px] text-purple-700 font-semibold uppercase block">
                      Final Difficulty Level
                    </span>
                    <span className="text-lg font-bold text-purple-900">
                      Level {summary.final_difficulty || 5}/10
                    </span>
                  </div>
                  <div className="rounded-xl bg-white/80 p-2.5 border border-purple-100">
                    <span className="text-[10px] text-purple-700 font-semibold uppercase block">
                      IRT Ability Estimate (&theta;)
                    </span>
                    <span className="text-lg font-bold text-purple-900 font-mono">
                      {summary.theta_estimate !== undefined && summary.theta_estimate !== null
                        ? summary.theta_estimate > 0
                          ? `+${summary.theta_estimate}`
                          : summary.theta_estimate
                        : "0.0"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Assessment Integrity & Proctoring Verification */}
            <div className="rounded-2xl border border-surface-border bg-surface-subtle/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-navy-950">
                  <ShieldCheck className="h-4 w-4 text-brand-600" />
                  <span>Assessment Integrity & Proctoring Telemetry</span>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                    (summary.integrity_risk_level || "CLEAN") === "CLEAN"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  {summary.integrity_risk_level || "CLEAN"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-center">
                <div className="rounded-xl bg-white p-2 border border-surface-border">
                  <span className="text-[9px] text-navy-400 font-semibold uppercase block">Trust Rating</span>
                  <span
                    className={`text-base font-black ${
                      (summary.integrity_trust_score ?? 100) >= 90
                        ? "text-emerald-600"
                        : (summary.integrity_trust_score ?? 100) >= 70
                        ? "text-amber-600"
                        : "text-red-600"
                    }`}
                  >
                    {summary.integrity_trust_score ?? 100}%
                  </span>
                </div>
                <div className="rounded-xl bg-white p-2 border border-surface-border">
                  <span className="text-[9px] text-navy-400 font-semibold uppercase block">Tab Switches</span>
                  <span className="text-base font-bold text-navy-800">
                    {integrity.tabSwitches + integrity.windowBlurs}
                  </span>
                </div>
                <div className="rounded-xl bg-white p-2 border border-surface-border">
                  <span className="text-[9px] text-navy-400 font-semibold uppercase block">Clipboard Pastes</span>
                  <span className="text-base font-bold text-navy-800">{integrity.pasteAttempts}</span>
                </div>
                <div className="rounded-xl bg-white p-2 border border-surface-border">
                  <span className="text-[9px] text-navy-400 font-semibold uppercase block">Vision Incidents</span>
                  <span className="text-base font-bold text-navy-800">{integrity.faceIncidents}</span>
                </div>
                <div className="rounded-xl bg-white p-2 border border-surface-border">
                  <span className="text-[9px] text-navy-400 font-semibold uppercase block">Device Alerts</span>
                  <span className="text-base font-bold text-navy-800">{integrity.objectIncidents}</span>
                </div>
              </div>
            </div>

            {/* Actions: Retake (Attempt 2) vs Exit */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-surface-border">
              <div>
                {summary.can_retake ? (
                  <span className="text-xs text-brand-700 font-bold bg-brand-50 border border-brand-200 rounded-lg px-2.5 py-1">
                    ✓ 1 Re-attempt Remaining (Attempt 2 of 2)
                  </span>
                ) : (
                  <span className="text-xs text-navy-400 font-medium">
                    Maximum attempt limit reached ({summary.attempt_number || 2}/{summary.max_attempts || 2}).
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl border border-surface-border px-4 py-2.5 text-xs font-semibold text-navy-700 hover:bg-surface-subtle transition"
                >
                  Return to Drives
                </button>

                {summary.can_retake && (
                  <button
                    type="button"
                    onClick={startFreshAttempt}
                    className="inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 text-xs font-bold transition shadow-sm active:scale-95"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Start Re-Attempt (Attempt 2 of 2)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Active Test Execution View */}
        {!loading && !error && !summary && attempt && currentQuestion && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Header with Title and Countdown Timer */}
            <div className="bg-[#0F172A] px-5 sm:px-7 py-3 flex items-center justify-between gap-4 border-b border-white/10 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                    Attempt {attempt.attempt_number} of 2
                  </span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold flex items-center gap-1 ${
                      integrity.trustScore >= 80
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                        : "bg-red-500/20 text-red-300 border border-red-400/30"
                    }`}
                  >
                    <ShieldCheck className="h-3 w-3" />
                    Trust {integrity.trustScore}%
                  </span>
                  {integrity.trustScore < 100 && (
                    <span className="rounded-md bg-rose-500/30 text-rose-300 text-[10px] font-bold px-1.5 py-0.5">
                      Penalty Applied
                    </span>
                  )}
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white truncate">{attempt.title}</h3>
              </div>

              {/* Header Right: Countdown Timer */}
              <div className="flex items-center gap-2 shrink-0">
                <div
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 border font-mono text-sm font-bold transition shadow-xs ${
                    isLowTime
                      ? "bg-red-500/20 text-red-300 border-red-500 animate-pulse"
                      : "bg-white/10 text-white border-white/20"
                  }`}
                >
                  <Clock className="h-4 w-4 text-brand-400" />
                  <span>{formatTimer(secondsRemaining)}</span>
                </div>
              </div>
            </div>

            {/* Warning Banner when integrity incident detected */}
            {integrity.warningMessage && (
              <div className="bg-amber-500/10 border-b border-amber-500/30 px-5 py-2 flex items-center justify-between gap-3 text-amber-900 shrink-0">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>{integrity.warningMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={dismissWarning}
                  className="rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-900 px-2.5 py-0.5 text-[11px] font-bold transition shrink-0"
                >
                  Acknowledge
                </button>
              </div>
            )}

            {/* Dedicated Camera & Proctoring Telemetry Bar */}
            <div className="bg-slate-900 px-5 py-3 border-b border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 shrink-0">
              {/* Left: Live Camera View with Face Reticle */}
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative h-16 w-24 sm:h-20 sm:w-28 rounded-xl overflow-hidden border-2 border-slate-700 bg-black shrink-0 shadow-inner group">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover scale-x-[-1]"
                  />
                  {/* ML Face Tracking Overlay Reticle */}
                  <div
                    className={`absolute inset-2 border-2 border-dashed rounded-lg pointer-events-none transition-colors ${
                      visionVerified ? "border-emerald-400/70" : "border-rose-500/80 animate-pulse"
                    }`}
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-black/85 backdrop-blur-[2px] px-1 py-0.5 flex items-center justify-between text-[8px] text-white">
                    <span className="flex items-center gap-1 font-semibold">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          visionVerified ? "bg-emerald-400" : "bg-red-400"
                        } animate-pulse`}
                      />
                      <span>{faceCount} Face</span>
                    </span>
                    <span className="font-mono text-[7px] text-brand-300 font-bold">
                      {isSimulatedCamera ? "AI FEED" : "WEBCAM"}
                    </span>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5 text-brand-400" />
                    <span className="text-xs font-bold text-white">Proctoring Camera Active</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Status:{" "}
                    <strong className={visionVerified ? "text-emerald-400" : "text-rose-400"}>
                      {visionStatusMessage}
                    </strong>
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Live face presence & device detection active.
                  </p>
                </div>
              </div>

              {/* Right: Cheating / Malpractice Simulator Controls */}
              <div className="w-full md:w-auto flex flex-col items-end">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-[11px] font-bold text-slate-200">
                    Simulate Cheating & Malpractice
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSimPanel(!showSimPanel)}
                    className="text-[10px] text-brand-300 hover:text-white underline ml-1"
                  >
                    {showSimPanel ? "Hide" : "Show"}
                  </button>
                </div>

                {showSimPanel && (
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        handleTriggerSimulation("OBJECT_DETECTED", "Phone in view", "-15 pts")
                      }
                      className="inline-flex items-center gap-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 px-2 py-1 text-[10px] font-bold transition"
                    >
                      <Smartphone className="h-3 w-3" />
                      <span>Phone (-15%)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleTriggerSimulation("MULTIPLE_FACES", "Multiple faces detected", "-10 pts")
                      }
                      className="inline-flex items-center gap-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 px-2 py-1 text-[10px] font-bold transition"
                    >
                      <Users className="h-3 w-3" />
                      <span>2nd Person (-10%)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleTriggerSimulation("FACE_MISSING", "Candidate face missing", "-5 pts")
                      }
                      className="inline-flex items-center gap-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 px-2 py-1 text-[10px] font-bold transition"
                    >
                      <EyeOff className="h-3 w-3" />
                      <span>Look Away (-5%)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleTriggerSimulation("TAB_SWITCH", "Browser tab switched", "-5 pts")
                      }
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 px-2 py-1 text-[10px] font-bold transition"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>Tab Switch (-5%)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleTriggerSimulation("CLIPBOARD_PASTE", "Clipboard paste intercepted", "-5 pts")
                      }
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600 px-2 py-1 text-[10px] font-bold transition"
                    >
                      <Copy className="h-3 w-3" />
                      <span>Paste (-5%)</span>
                    </button>
                  </div>
                )}

                {simulatedIncidentMsg && (
                  <span className="text-[10px] font-mono font-bold text-amber-300 mt-1 animate-pulse">
                    ⚠ {simulatedIncidentMsg}
                  </span>
                )}
              </div>
            </div>

            {/* Question Progress Bar */}
            <div className="w-full bg-slate-100 h-1.5 shrink-0">
              <div
                className="bg-brand-600 h-1.5 transition-all duration-300"
                style={{
                  width: `${(currentQuestion.question_number / currentQuestion.total_questions) * 100}%`,
                }}
              />
            </div>

            {/* Exam Content Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
              {/* Question Metadata */}
              <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-xl bg-brand-50 text-brand-700 border border-brand-200 px-3 py-1 font-bold">
                    Question {currentQuestion.question_number} of {currentQuestion.total_questions}
                  </span>
                  <span className="rounded-xl bg-surface-subtle text-navy-600 border border-surface-border px-3 py-1 font-medium">
                    {currentQuestion.skill} • {currentQuestion.topic}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-xl px-2.5 py-1 text-xs font-bold border ${
                      currentQuestion.difficulty <= 3
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : currentQuestion.difficulty <= 6
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : currentQuestion.difficulty <= 8
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-purple-50 text-purple-700 border-purple-200"
                    }`}
                  >
                    Level {currentQuestion.difficulty}/10
                  </span>
                  {attempt.adaptive_mode && (
                    <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 rounded-lg px-2 py-1 border border-purple-200">
                      Adaptive CAT
                    </span>
                  )}
                </div>
              </div>

              {/* Question Text Card */}
              <div className="rounded-2xl border border-surface-border bg-surface-subtle/70 p-5 sm:p-6 shadow-2xs">
                <p className="text-sm sm:text-base font-semibold text-navy-950 leading-relaxed whitespace-pre-wrap">
                  {currentQuestion.question_text}
                </p>
              </div>

              {/* 4 Interactive MCQ Options */}
              <div className="space-y-3">
                <span className="block text-xs font-bold text-navy-700 uppercase tracking-wider">
                  Select Answer Choice
                </span>
                <div className="grid grid-cols-1 gap-2.5">
                  {currentQuestion.options.map((optionText, idx) => {
                    const isSelected = selectedOption === optionText;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedOption(optionText)}
                        className={`w-full text-left rounded-2xl border p-4 transition flex items-center justify-between gap-4 ${
                          isSelected
                            ? "border-brand-600 bg-brand-50/50 ring-2 ring-brand-500/20 shadow-xs"
                            : "border-surface-border bg-white hover:border-navy-300 hover:bg-surface-subtle"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`h-7 w-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition ${
                              isSelected
                                ? "bg-brand-600 text-white"
                                : "bg-surface-subtle text-navy-600 border border-surface-border"
                            }`}
                          >
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span
                            className={`text-xs sm:text-sm ${
                              isSelected ? "font-bold text-navy-950" : "text-navy-800"
                            }`}
                          >
                            {optionText}
                          </span>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-brand-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer with Submit Button */}
            <div className="border-t border-surface-border bg-white px-5 sm:px-7 py-3.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-xs text-navy-500">
                <Lock className="h-3.5 w-3.5 text-navy-400" />
                <span>Single selection • Auto-finalized on last question</span>
              </div>
              <button
                type="button"
                onClick={handleAnswerSubmit}
                disabled={!selectedOption || submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 text-xs font-bold transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>
                  {submitting
                    ? "Recording..."
                    : currentQuestion.question_number === currentQuestion.total_questions
                    ? "Submit & Score"
                    : "Save & Next"}
                </span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
