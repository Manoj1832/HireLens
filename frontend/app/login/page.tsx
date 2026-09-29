"use client";

import React, { useState, Suspense, useMemo, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth, IdentifyResult } from "@/lib/auth-context";
import {
  Mail,
  Key,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  GraduationCap,
  Building2,
  Briefcase,
  Sparkles,
  CheckCircle2,
  Eye,
  EyeOff,
  RotateCcw,
  Lock,
  Zap,
  Check,
  Shield,
} from "lucide-react";

function LoginContent() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const requiredRole = searchParams.get("required");

  const {
    requestOtp,
    verifyOtp,
    loginWithPasskey,
    identifyEmail,
    loginWithPassword,
    registerAccount,
    verifyEmail,
    isLoading,
  } = useAuth();

  const [authTab, setAuthTab] = useState<"PASSWORD" | "OTP" | "REGISTER" | "VERIFY_EMAIL">("PASSWORD");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [regRole, setRegRole] = useState<"STUDENT" | "RECRUITER">("STUDENT");
  const [regDepartment, setRegDepartment] = useState("");
  const [regRegisterNumber, setRegRegisterNumber] = useState("");
  const [regCompanyName, setRegCompanyName] = useState("");

  const [email, setEmail] = useState("");
  const [passkey, setPasskey] = useState("");
  const [showPasskey, setShowPasskey] = useState(false);
  const [step, setStep] = useState<"EMAIL" | "CREDENTIAL">("EMAIL");
  const [detectedAuth, setDetectedAuth] = useState<IdentifyResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [instantRoleLoading, setInstantRoleLoading] = useState<string | null>(null);

  // 6-digit segmented OTP inputs
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Resend countdown timer
  const [resendTimer, setResendTimer] = useState<number>(30);
  const [canResend, setCanResend] = useState<boolean>(false);

  useEffect(() => {
    let interval: any;
    if (step === "CREDENTIAL" && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  // Client-side live preview badge as user types email
  const liveRolePreview = useMemo(() => {
    const trimmed = email.toLowerCase().trim();
    if (!trimmed.includes("@")) return null;
    const parts = trimmed.split("@");
    if (parts.length < 2 || !parts[1].includes(".")) return null;

    const username = parts[0];
    const domain = parts[1];

    if (username === "placement" || username === "placements") {
      return {
        title: "College Placement Cell",
        badge: "Placement Administration",
        badgeStyle: "bg-emerald-50 text-emerald-800 border-emerald-200",
        dest: "Placement Portal (/admin)",
        icon: Building2,
      };
    }

    if (domain === "psgtech.ac.in" || domain === "student.psgtech.ac.in") {
      return {
        title: "PSG College of Technology",
        badge: "Verified Student Cohort",
        badgeStyle: "bg-blue-50 text-blue-800 border-blue-200",
        dest: "Candidate Portal (/student)",
        icon: GraduationCap,
      };
    }

    return {
      title: domain.split(".")[0].toUpperCase(),
      badge: "Corporate Recruiter Workspace",
      badgeStyle: "bg-purple-50 text-purple-800 border-purple-200",
      dest: "Recruiter Workspace (/recruiter)",
      icon: Briefcase,
    };
  }, [email]);

  // 1-Click Fast Instant Login (Demo Mode)
  const isDevMode = process.env.NODE_ENV !== "production";

  const handleInstantLogin = async (roleType: "candidate" | "recruiter" | "admin") => {
    if (!isDevMode) return;
    setError(null);
    setMessage(null);
    setInstantRoleLoading(roleType);

    try {
      if (roleType === "candidate") {
        const studentEmail = "23z342@psgtech.ac.in";
        const otpRes = await requestOtp(studentEmail);
        if (!otpRes.devOtp) {
          throw new Error("Dev OTP not available in current environment. Please check email for OTP.");
        }
        await verifyOtp(studentEmail, otpRes.devOtp);
      } else if (roleType === "recruiter") {
        await loginWithPasskey("recruiter@microsoft.com", "HireLens");
      } else if (roleType === "admin") {
        const adminEmail = "placements@psgtech.ac.in";
        const otpRes = await requestOtp(adminEmail);
        if (!otpRes.devOtp) {
          throw new Error("Dev OTP not available in current environment. Please check email for OTP.");
        }
        await verifyOtp(adminEmail, otpRes.devOtp);
      }
    } catch (err: any) {
      setError(err.message || `Failed to sign in as ${roleType}.`);
      setInstantRoleLoading(null);
    }
  };

  // Password Login Handler
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password.trim()) {
      setError("Please provide both email address and password.");
      return;
    }

    try {
      await loginWithPassword(cleanEmail, password);
    } catch (err: any) {
      const msg = err.message || "Invalid email or password.";
      if (msg.toLowerCase().includes("not verified")) {
        setAuthTab("VERIFY_EMAIL");
        setStep("CREDENTIAL");
        setMessage("Account requires email verification. Enter the 6-digit code sent to your email.");
      } else {
        setError(msg);
      }
    }
  };

  // Registration Handler
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password.trim() || !fullName.trim()) {
      setError("Please complete all required registration fields.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    try {
      const res = await registerAccount({
        email: cleanEmail,
        password: password,
        full_name: fullName.trim(),
        role: regRole,
        department: regRole === "STUDENT" ? regDepartment.trim() || "CSE" : undefined,
        register_number: regRole === "STUDENT" ? regRegisterNumber.trim() || undefined : undefined,
        company_name: regRole === "RECRUITER" ? regCompanyName.trim() || undefined : undefined,
      });

      setMessage(res.message || "Registration successful! Verification code sent.");
      if (res.dev_code) {
        setDevOtp(res.dev_code);
        const chars = res.dev_code.slice(0, 6).split("");
        setOtpDigits([...chars, ...Array(6 - chars.length).fill("")].slice(0, 6));
      } else {
        setOtpDigits(["", "", "", "", "", ""]);
      }
      setAuthTab("VERIFY_EMAIL");
      setStep("CREDENTIAL");
      setResendTimer(30);
      setCanResend(false);
    } catch (err: any) {
      setError(err.message || "Registration failed. Please check your information.");
    }
  };

  // Institutional OTP Email Submit
  const handleOtpEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("Please enter your official college or corporate email address.");
      return;
    }

    try {
      const identification = await identifyEmail(cleanEmail);
      setDetectedAuth(identification);

      if (identification.auth_method === "otp") {
        const res = await requestOtp(cleanEmail);
        setMessage(res.message);
        if (res.devOtp) {
          setDevOtp(res.devOtp);
          const chars = res.devOtp.slice(0, 6).split("");
          setOtpDigits([...chars, ...Array(6 - chars.length).fill("")].slice(0, 6));
        } else {
          setOtpDigits(["", "", "", "", "", ""]);
        }
        setResendTimer(30);
        setCanResend(false);
      } else {
        setMessage(`Corporate workspace identified for ${cleanEmail}. Enter your passkey to enter.`);
      }

      setStep("CREDENTIAL");
    } catch (err: any) {
      setError(err.message || "Unable to resolve email destination. Please check the address.");
    }
  };

  // Handle segmented OTP changes
  const handleOtpChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, "");
    if (clean.length > 1) {
      const digits = clean.slice(0, 6).split("");
      const newDigits = [...otpDigits];
      digits.forEach((d, i) => {
        if (i < 6) newDigits[i] = d;
      });
      setOtpDigits(newDigits);
      const nextIndex = Math.min(digits.length, 5);
      otpInputsRef.current[nextIndex]?.focus();
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = clean;
    setOtpDigits(newDigits);

    if (clean && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    setError(null);
    try {
      const res = await requestOtp(email.trim());
      setMessage(res.message);
      if (res.devOtp) {
        setDevOtp(res.devOtp);
        const chars = res.devOtp.slice(0, 6).split("");
        setOtpDigits([...chars, ...Array(6 - chars.length).fill("")].slice(0, 6));
      }
      setResendTimer(30);
      setCanResend(false);
    } catch (err: any) {
      setError(err.message || "Failed to resend code");
    }
  };

  // Step 2 Submission (Email verification or OTP verification)
  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const fullCode = otpDigits.join("");

    if (authTab === "VERIFY_EMAIL") {
      if (fullCode.length < 6) {
        setError("Please enter the complete 6-digit verification code.");
        return;
      }
      try {
        await verifyEmail(email.trim(), fullCode);
      } catch (err: any) {
        setError(err.message || "Verification code is invalid or expired.");
      }
      return;
    }

    if (!detectedAuth) return;

    try {
      if (detectedAuth.auth_method === "otp") {
        if (fullCode.length < 6) {
          setError("Please enter the complete 6-digit verification code.");
          return;
        }
        await verifyOtp(email.trim(), fullCode);
      } else {
        if (!passkey.trim()) {
          setError("Please enter the corporate access passkey.");
          return;
        }
        await loginWithPasskey(email.trim(), passkey.trim());
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please verify your credentials.");
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-6 px-4">
      <div className="w-full max-w-4xl">
        {/* Access Restriction Notice */}
        {errorParam === "unauthorized_role" && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900 shadow-xs flex items-start gap-3">
            <div className="rounded-xl bg-rose-100 p-2 text-rose-700">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-semibold text-rose-950">Access Restricted</h4>
              <p className="mt-0.5 text-xs text-rose-800">
                The requested view requires <strong>{requiredRole}</strong> authorization. Sign in with an authorized account below.
              </p>
            </div>
          </div>
        )}

        {/* Enterprise Card Container */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 grid grid-cols-1 lg:grid-cols-12">
          {/* Left Column: Institutional Credentials Panel */}
          <div className="lg:col-span-5 bg-slate-900 p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
            <div>
              {/* Institutional Pill */}
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-xs font-semibold text-blue-300 mb-6">
                <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                <span>Verified Campus Recruitment</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                HireLens Talent Network
              </h2>

              <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                Direct institutional placement network connecting verified PSG College of Technology student cohorts with leading corporate recruiters.
              </p>

              {/* Highlights */}
              <div className="mt-8 space-y-3.5">
                <div className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-800/40 p-3">
                  <div className="rounded-xl bg-blue-500/20 p-2 text-blue-400">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Verified Student Roster</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Direct registrar-synchronized CGPA and department records.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-800/40 p-3">
                  <div className="rounded-xl bg-purple-500/20 p-2 text-purple-400">
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Explainable AI Matching</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Deterministic criteria enforcement with vector semantic scoring.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-800/40 p-3">
                  <div className="rounded-xl bg-emerald-500/20 p-2 text-emerald-400">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Proctored Assessments</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Adaptive IRT testing with client-side vision proctoring telemetry.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Persistent Security Guarantee */}
            <div className="mt-8 pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Enterprise Row Level Security &amp; Token Revocation</span>
              </div>
            </div>
          </div>

          {/* Right Column: Clean Interactive Auth */}
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between bg-white">
            <div>
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-wider uppercase text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded-full">
                    {step === "CREDENTIAL"
                      ? "Step 2: Verification"
                      : authTab === "REGISTER"
                      ? "Account Registration"
                      : authTab === "OTP"
                      ? "Institutional OTP"
                      : "Account Sign In"}
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>PSG Tech Portal</span>
                  </div>
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-2">
                  {step === "CREDENTIAL"
                    ? authTab === "VERIFY_EMAIL"
                      ? "Verify Your Email Address"
                      : detectedAuth?.role_title || "Credential Verification"
                    : authTab === "REGISTER"
                    ? "Create Your HireLens Account"
                    : "Sign in to HireLens"}
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  {step === "CREDENTIAL"
                    ? `Enter the 6-digit verification code dispatched to ${email}`
                    : authTab === "REGISTER"
                    ? "Register your student candidate or corporate recruiter profile."
                    : authTab === "OTP"
                    ? "Sign in passwordless using your institutional email address."
                    : "Sign in using your account email and password."}
                </p>
              </div>

              {/* Segmented Auth Mode Switcher */}
              {step === "EMAIL" && (
                <div className="flex border-b border-slate-200 mb-6">
                  <button
                    type="button"
                    onClick={() => { setAuthTab("PASSWORD"); setError(null); setMessage(null); }}
                    className={`pb-2.5 text-xs font-bold transition border-b-2 mr-5 ${
                      authTab === "PASSWORD" ? "border-brand-600 text-brand-600" : "border-transparent text-slate-400 hover:text-slate-700"
                    }`}
                  >
                    Email &amp; Password
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthTab("OTP"); setError(null); setMessage(null); }}
                    className={`pb-2.5 text-xs font-bold transition border-b-2 mr-5 ${
                      authTab === "OTP" ? "border-brand-600 text-brand-600" : "border-transparent text-slate-400 hover:text-slate-700"
                    }`}
                  >
                    Institutional OTP
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthTab("REGISTER"); setError(null); setMessage(null); }}
                    className={`pb-2.5 text-xs font-bold transition border-b-2 ${
                      authTab === "REGISTER" ? "border-brand-600 text-brand-600" : "border-transparent text-slate-400 hover:text-slate-700"
                    }`}
                  >
                    Register Account
                  </button>
                </div>
              )}

              {/* 1-Click Fast Launch Portal (Development/Evaluation Mode) */}
              {step === "EMAIL" && isDevMode && authTab !== "REGISTER" && (
                <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-amber-500" />
                      1-Click Instant Demo Access
                    </span>
                    <span className="text-[10px] text-slate-400">Zero typing required</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Candidate Instant */}
                    <button
                      type="button"
                      onClick={() => handleInstantLogin("candidate")}
                      disabled={Boolean(instantRoleLoading)}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-left hover:border-blue-400 hover:bg-blue-50/50 hover:shadow-xs transition group disabled:opacity-50"
                    >
                      <div className="h-8 w-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition">
                        <GraduationCap className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-slate-900">
                          {instantRoleLoading === "candidate" ? "Signing In..." : "Candidate"}
                        </span>
                        <span className="block text-[10px] text-slate-500 truncate">Sarah Jenkins</span>
                      </div>
                    </button>

                    {/* Recruiter Instant */}
                    <button
                      type="button"
                      onClick={() => handleInstantLogin("recruiter")}
                      disabled={Boolean(instantRoleLoading)}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-left hover:border-purple-400 hover:bg-purple-50/50 hover:shadow-xs transition group disabled:opacity-50"
                    >
                      <div className="h-8 w-8 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 group-hover:bg-purple-600 group-hover:text-white transition">
                        <Briefcase className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-slate-900">
                          {instantRoleLoading === "recruiter" ? "Signing In..." : "Recruiter"}
                        </span>
                        <span className="block text-[10px] text-slate-500 truncate">Microsoft Talent</span>
                      </div>
                    </button>

                    {/* Admin Instant */}
                    <button
                      type="button"
                      onClick={() => handleInstantLogin("admin")}
                      disabled={Boolean(instantRoleLoading)}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-left hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-xs transition group disabled:opacity-50"
                    >
                      <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-slate-900">
                          {instantRoleLoading === "admin" ? "Signing In..." : "Placement Cell"}
                        </span>
                        <span className="block text-[10px] text-slate-500 truncate">Dean / Admin</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 flex items-start gap-2.5">
                  <div className="h-2 w-2 rounded-full bg-rose-500 mt-1 flex-shrink-0" />
                  <div className="flex-1">{error}</div>
                </div>
              )}

              {/* Status Banner */}
              {message && (
                <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50/80 p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-brand-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">{message}</div>
                </div>
              )}

              {/* FORM 1: EMAIL & PASSWORD */}
              {step === "EMAIL" && authTab === "PASSWORD" && (
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="yourname@student.psgtech.ac.in"
                        className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-slate-900 text-xs focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/10 transition placeholder:text-slate-400 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                        <Key className="h-4 w-4" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your account password"
                        className="w-full rounded-xl border border-slate-200 pl-10 pr-10 py-2.5 text-slate-900 text-xs focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/10 transition placeholder:text-slate-400 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !email.trim() || !password.trim()}
                    className="w-full rounded-xl bg-brand-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    <span>{isLoading ? "Authenticating..." : "Sign In with Password"}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setAuthTab("REGISTER")}
                      className="text-xs font-semibold text-brand-600 hover:text-brand-800 transition"
                    >
                      Need an account? Register here
                    </button>
                  </div>
                </form>
              )}

              {/* FORM 2: INSTITUTIONAL OTP */}
              {step === "EMAIL" && authTab === "OTP" && (
                <form onSubmit={handleOtpEmailSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                      Institutional Email
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="yourname@student.psgtech.ac.in"
                        className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-slate-900 text-xs focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/10 transition placeholder:text-slate-400 font-medium"
                      />
                    </div>
                  </div>

                  {liveRolePreview && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <liveRolePreview.icon className="h-4 w-4 text-brand-600" />
                        <span className="font-semibold text-slate-800">{liveRolePreview.title}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${liveRolePreview.badgeStyle}`}>
                        {liveRolePreview.badge}
                      </span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || !email.trim()}
                    className="w-full rounded-xl bg-brand-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    <span>{isLoading ? "Dispatching..." : "Send Institutional OTP"}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </form>
              )}

              {/* FORM 3: REGISTRATION */}
              {step === "EMAIL" && authTab === "REGISTER" && (
                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  <div className="flex gap-2 p-1 rounded-xl bg-slate-100 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setRegRole("STUDENT")}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                        regRole === "STUDENT" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      Student Candidate
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegRole("RECRUITER")}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                        regRole === "RECRUITER" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      Corporate Recruiter
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rohan Krishnan"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-slate-900 text-xs focus:border-brand-600 focus:outline-none transition font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                      Official Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={regRole === "STUDENT" ? "e.g. 23z342@psgtech.ac.in" : "e.g. recruiter@company.com"}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-slate-900 text-xs focus:border-brand-600 focus:outline-none transition font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                      Password (min 8 characters)
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a strong account password"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-slate-900 text-xs focus:border-brand-600 focus:outline-none transition font-medium"
                    />
                  </div>

                  {regRole === "STUDENT" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                          Roll Number
                        </label>
                        <input
                          type="text"
                          required
                          value={regRegisterNumber}
                          onChange={(e) => setRegRegisterNumber(e.target.value)}
                          placeholder="e.g. 23Z342"
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-slate-900 text-xs focus:border-brand-600 focus:outline-none transition font-medium font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                          Department
                        </label>
                        <input
                          type="text"
                          required
                          value={regDepartment}
                          onChange={(e) => setRegDepartment(e.target.value)}
                          placeholder="e.g. CSE"
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-slate-900 text-xs focus:border-brand-600 focus:outline-none transition font-medium"
                        />
                      </div>
                    </div>
                  )}

                  {regRole === "RECRUITER" && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                        Company Name
                      </label>
                      <input
                        type="text"
                        required
                        value={regCompanyName}
                        onChange={(e) => setRegCompanyName(e.target.value)}
                        placeholder="e.g. Microsoft Corporation"
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-slate-900 text-xs focus:border-brand-600 focus:outline-none transition font-medium"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || !email.trim() || !password.trim() || !fullName.trim()}
                    className="w-full rounded-xl bg-brand-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition flex items-center justify-center gap-2 mt-2"
                  >
                    <span>{isLoading ? "Creating Account..." : "Create Account & Verify Email"}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setAuthTab("PASSWORD")}
                      className="text-xs font-semibold text-brand-600 hover:text-brand-800 transition"
                    >
                      Already have an account? Sign in
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: CREDENTIAL VERIFICATION / OTP */}
              {step === "CREDENTIAL" && (
                <form onSubmit={handleCredentialSubmit} className="space-y-5">
                  <div className="text-center space-y-2">
                    <p className="text-xs text-slate-500">
                      Enter the 6-digit verification code dispatched to:
                    </p>
                    <p className="text-sm font-bold text-slate-900 font-mono bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-xl inline-block">
                      {email}
                    </p>
                  </div>

                  {/* 6-Digit Segmented OTP Box */}
                  <div className="flex justify-center gap-2 sm:gap-3 py-2">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => { otpInputsRef.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="h-12 w-11 sm:h-14 sm:w-12 rounded-xl border border-slate-300 text-center font-mono text-lg font-bold text-slate-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition bg-white shadow-xs"
                      />
                    ))}
                  </div>

                  {/* Resend Controls */}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <button
                      type="button"
                      onClick={() => { setStep("EMAIL"); setError(null); }}
                      className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Change Email</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={!canResend}
                      className="font-semibold text-brand-600 hover:text-brand-800 disabled:text-slate-400 transition"
                    >
                      {canResend ? "Resend Verification Code" : `Resend in ${resendTimer}s`}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otpDigits.join("").length < 6}
                    className="w-full rounded-xl bg-brand-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    <span>{isLoading ? "Verifying..." : "Verify & Enter Portal"}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-slate-500 font-medium">Loading HireLens Portal...</div>}>
      <LoginContent />
    </Suspense>
  );
}
