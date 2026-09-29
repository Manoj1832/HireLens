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


  // Resend OTP countdown timer
  const [resendTimer, setResendTimer] = useState<number>(30);
  const [canResend, setCanResend] = useState<boolean>(false);

  useEffect(() => {
    let interval: any;
    if (step === "CREDENTIAL" && detectedAuth?.auth_method === "otp" && resendTimer > 0) {
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
  }, [step, detectedAuth, resendTimer]);

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
        type: "otp",
      };
    }

    if (domain === "psgtech.ac.in" || domain === "student.psgtech.ac.in") {
      return {
        title: "PSG College of Technology",
        badge: "Verified Student Cohort",
        badgeStyle: "bg-blue-50 text-blue-800 border-blue-200",
        dest: "Candidate Portal (/student)",
        icon: GraduationCap,
        type: "otp",
      };
    }

    return {
      title: domain.split(".")[0].toUpperCase(),
      badge: "Corporate Recruiter Workspace",
      badgeStyle: "bg-amber-50 text-amber-800 border-amber-200",
      dest: "Recruiter Workspace (/recruiter)",
      icon: Briefcase,
      type: "passkey",
    };
  }, [email]);

  // 1-Click Fast Instant Login (Development/Demo Mode Only - RC-2 Remediation)
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

  const handleEmailSubmit = async (e: React.FormEvent) => {
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

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    try {
      await loginWithPassword(email.trim(), password);
    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes("not been verified")) {
        setMessage("Your email address is pending verification. A 6-digit verification code has been dispatched to your email. Enter it below to activate your account.");
        setAuthTab("VERIFY_EMAIL");
        setStep("CREDENTIAL");
      } else {
        setError(err.message || "Failed to sign in. Please verify your email and password.");
      }
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError("Please enter your name, email, and password.");
      return;
    }
    try {
      const res = await registerAccount({
        email: email.trim(),
        password: password.trim(),
        full_name: fullName.trim(),
        role: regRole,
        department: regDepartment.trim() || undefined,
        register_number: regRegisterNumber.trim() || undefined,
        company_name: regCompanyName.trim() || undefined,
      });
      setMessage(res.message);
      if (res.dev_code) {
        setDevOtp(res.dev_code);
        const chars = res.dev_code.slice(0, 6).split("");
        setOtpDigits([...chars, ...Array(6 - chars.length).fill("")].slice(0, 6));
      } else {
        setOtpDigits(["", "", "", "", "", ""]);
      }
      setAuthTab("VERIFY_EMAIL");
      setStep("CREDENTIAL");
    } catch (err: any) {
      setError(err.message || "Registration failed. Please check the details.");
    }
  };

  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const fullOtp = otpDigits.join("");

    if (authTab === "VERIFY_EMAIL") {
      if (fullOtp.length < 6) {
        setError("Please enter the complete 6-digit verification code.");
        return;
      }
      try {
        await verifyEmail(email.trim(), fullOtp);
      } catch (err: any) {
        setError(err.message || "Email verification failed.");
      }
      return;
    }

    if (!detectedAuth) return;

    try {
      if (detectedAuth.auth_method === "otp") {
        if (fullOtp.length < 6) {
          setError("Please enter the complete 6-digit verification code.");
          return;
        }
        await verifyOtp(email.trim(), fullOtp);
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
        {/* Access Restriction Banner */}
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

        {/* Claude / Inspo Modern Dark Glass Card Layout */}
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-obsidian-900/95 shadow-glass backdrop-blur-2xl grid grid-cols-1 lg:grid-cols-12 text-slate-100">
          {/* Left Hero Column: Institutional Trust */}
          <div className="lg:col-span-5 bg-gradient-to-b from-obsidian-950 via-obsidian-900 to-indigo-950/40 p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-white/[0.08]">
            <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

            <div>
              {/* Institutional Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold backdrop-blur-xs text-cyan-300 mb-6 font-mono">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                <span>Verified Placement & Testing</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
                HireLens Campus Intelligence
              </h2>

              <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
                Seamless institutional placement ecosystem connecting verified student cohorts, AI proctored screening, and corporate hiring teams.
              </p>

              {/* Feature Highlights */}
              <div className="mt-8 space-y-3">
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-xs">
                  <div className="rounded-xl bg-cyan-500/20 p-2 text-cyan-300 border border-cyan-500/30">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Verified Student Cohort</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Direct registrar-synchronized CGPA and official transcripts.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-xs">
                  <div className="rounded-xl bg-purple-500/20 p-2 text-purple-300 border border-purple-500/30">
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Hybrid ML Assessments</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Adaptive IRT question engines with webcam proctoring.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-xs">
                  <div className="rounded-xl bg-emerald-500/20 p-2 text-emerald-300 border border-emerald-500/30">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Placement Governance</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Placement cell drive orchestration and analytics telemetry.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Persistent Session Security Badge */}
            <div className="mt-8 pt-4 border-t border-white/[0.08]">
              <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-mono">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>Protected 30-Day Enterprise Session Active</span>
              </div>
            </div>
          </div>

          {/* Right Column: Clean Interactive Auth */}
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between bg-obsidian-900/90 text-slate-100">
            <div>
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-cyan-400 bg-cyan-500/10 border border-cyan-500/25 px-2.5 py-0.5 rounded-full">
                    {step === "CREDENTIAL" ? "Step 2: Verification" : authTab === "REGISTER" ? "New Account Registration" : "Enterprise Authentication"}
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Auto-Save Enabled</span>
                  </div>
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-white mt-2">
                  {step === "CREDENTIAL"
                    ? authTab === "VERIFY_EMAIL"
                      ? "Verify Your Email"
                      : detectedAuth?.role_title || "Credential Verification"
                    : authTab === "REGISTER"
                    ? "Create Your HireLens Account"
                    : "Sign in to HireLens"}
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  {step === "CREDENTIAL"
                    ? `Enter the 6-digit verification code sent to ${email}`
                    : authTab === "REGISTER"
                    ? "Register your verified institutional candidate or recruiter profile."
                    : "Sign in with your email and password, or use institutional OTP."}
                </p>
              </div>

              {/* Tab Selector (when on initial screen) */}
              {step === "EMAIL" && (
                <div className="flex border-b border-white/[0.08] mb-6">
                  <button
                    type="button"
                    onClick={() => { setAuthTab("PASSWORD"); setError(null); setMessage(null); }}
                    className={`pb-2.5 text-xs font-bold transition border-b-2 mr-5 ${
                      authTab === "PASSWORD" ? "border-cyan-400 text-cyan-300" : "border-transparent text-slate-400 hover:text-white"
                    }`}
                  >
                    Email & Password
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthTab("OTP"); setError(null); setMessage(null); }}
                    className={`pb-2.5 text-xs font-bold transition border-b-2 mr-5 ${
                      authTab === "OTP" ? "border-cyan-400 text-cyan-300" : "border-transparent text-slate-400 hover:text-white"
                    }`}
                  >
                    Institutional OTP
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthTab("REGISTER"); setError(null); setMessage(null); }}
                    className={`pb-2.5 text-xs font-bold transition border-b-2 ${
                      authTab === "REGISTER" ? "border-cyan-400 text-cyan-300" : "border-transparent text-slate-400 hover:text-white"
                    }`}
                  >
                    Register Account
                  </button>
                </div>
              )}

              {/* 1-Click Fast Launch Portal (Development/Evaluation Mode Only) */}
              {step === "EMAIL" && isDevMode && authTab !== "REGISTER" && (
                <div className="mb-6 rounded-2xl border border-white/10 bg-obsidian-950/60 p-3.5">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <Zap className="h-3.5 w-3.5 text-amber-400" />
                      1-Click Instant Access
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Zero typing required</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Candidate Instant */}
                    <button
                      type="button"
                      onClick={() => handleInstantLogin("candidate")}
                      disabled={Boolean(instantRoleLoading)}
                      className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-left hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:shadow-xs transition group disabled:opacity-50"
                    >
                      <div className="h-8 w-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-300 group-hover:bg-cyan-500 group-hover:text-black transition">
                        <GraduationCap className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-white">
                          {instantRoleLoading === "candidate" ? "Signing In..." : "Candidate"}
                        </span>
                        <span className="block text-[10px] text-slate-400 truncate">Sarah Jenkins</span>
                      </div>
                    </button>

                    {/* Recruiter Instant */}
                    <button
                      type="button"
                      onClick={() => handleInstantLogin("recruiter")}
                      disabled={Boolean(instantRoleLoading)}
                      className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-left hover:border-purple-400/50 hover:bg-purple-500/10 hover:shadow-xs transition group disabled:opacity-50"
                    >
                      <div className="h-8 w-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-300 group-hover:bg-purple-500 group-hover:text-white transition">
                        <Briefcase className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-white">
                          {instantRoleLoading === "recruiter" ? "Signing In..." : "Recruiter"}
                        </span>
                        <span className="block text-[10px] text-slate-400 truncate">Microsoft Talent</span>
                      </div>
                    </button>

                    {/* Admin Instant */}
                    <button
                      type="button"
                      onClick={() => handleInstantLogin("admin")}
                      disabled={Boolean(instantRoleLoading)}
                      className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-left hover:border-emerald-400/50 hover:bg-emerald-500/10 hover:shadow-xs transition group disabled:opacity-50"
                    >
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-300 group-hover:bg-emerald-500 group-hover:text-black transition">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-white">
                          {instantRoleLoading === "admin" ? "Signing In..." : "Placement Cell"}
                        </span>
                        <span className="block text-[10px] text-slate-400 truncate">Dean / Admin</span>
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

              {/* SCREEN 1: PASSWORD LOGIN */}
              {step === "EMAIL" && authTab === "PASSWORD" && (
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-navy-800 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-navy-400">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="yourname@student.psgtech.ac.in"
                        className="w-full rounded-xl border border-surface-border pl-10 pr-4 py-2.5 text-navy-900 text-xs focus:border-brand-600 focus:outline-none focus:ring-3 focus:ring-brand-500/10 transition placeholder:text-navy-400 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-navy-800 uppercase tracking-wider mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-navy-400">
                        <Key className="h-4 w-4" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your account password"
                        className="w-full rounded-xl border border-surface-border pl-10 pr-10 py-2.5 text-navy-900 text-xs focus:border-brand-600 focus:outline-none focus:ring-3 focus:ring-brand-500/10 transition placeholder:text-navy-400 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-navy-400 hover:text-navy-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !email.trim() || !password.trim()}
                    className="w-full rounded-xl bg-brand-600 py-3 text-xs font-bold text-white shadow-md shadow-brand-600/20 hover:bg-brand-700 hover:shadow-brand-600/30 disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    <span>{isLoading ? "Signing In..." : "Sign In with Password"}</span>
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

              {/* SCREEN 2: REGISTRATION FORM */}
              {step === "EMAIL" && authTab === "REGISTER" && (
                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  <div className="flex gap-2 p-1 rounded-xl bg-surface-subtle border border-surface-border">
                    <button
                      type="button"
                      onClick={() => setRegRole("STUDENT")}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                        regRole === "STUDENT" ? "bg-white text-navy-900 shadow-xs" : "text-navy-500 hover:text-navy-900"
                      }`}
                    >
                      Student Candidate
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegRole("RECRUITER")}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                        regRole === "RECRUITER" ? "bg-white text-navy-900 shadow-xs" : "text-navy-500 hover:text-navy-900"
                      }`}
                    >
                      Corporate Recruiter
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-navy-800 uppercase tracking-wider mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rohan Krishnan"
                      className="w-full rounded-xl border border-surface-border px-3.5 py-2 text-navy-900 text-xs focus:border-brand-600 focus:outline-none transition font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-navy-800 uppercase tracking-wider mb-1">
                      Official Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={regRole === "STUDENT" ? "e.g. 23z342@psgtech.ac.in" : "e.g. recruiter@company.com"}
                      className="w-full rounded-xl border border-surface-border px-3.5 py-2 text-navy-900 text-xs focus:border-brand-600 focus:outline-none transition font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-navy-800 uppercase tracking-wider mb-1">
                      Create Password
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full rounded-xl border border-surface-border px-3.5 py-2 text-navy-900 text-xs focus:border-brand-600 focus:outline-none transition font-medium"
                    />
                  </div>

                  {regRole === "STUDENT" ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-navy-800 uppercase tracking-wider mb-1">
                          Roll / Register No.
                        </label>
                        <input
                          type="text"
                          value={regRegisterNumber}
                          onChange={(e) => setRegRegisterNumber(e.target.value)}
                          placeholder="e.g. 23Z342"
                          className="w-full rounded-xl border border-surface-border px-3.5 py-2 text-navy-900 text-xs focus:border-brand-600 focus:outline-none transition font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-navy-800 uppercase tracking-wider mb-1">
                          Department
                        </label>
                        <input
                          type="text"
                          value={regDepartment}
                          onChange={(e) => setRegDepartment(e.target.value)}
                          placeholder="e.g. Computer Science"
                          className="w-full rounded-xl border border-surface-border px-3.5 py-2 text-navy-900 text-xs focus:border-brand-600 focus:outline-none transition font-medium"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] font-bold text-navy-800 uppercase tracking-wider mb-1">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={regCompanyName}
                        onChange={(e) => setRegCompanyName(e.target.value)}
                        placeholder="e.g. Microsoft / Google"
                        className="w-full rounded-xl border border-surface-border px-3.5 py-2 text-navy-900 text-xs focus:border-brand-600 focus:outline-none transition font-medium"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || !fullName.trim() || !email.trim() || !password.trim()}
                    className="w-full rounded-xl bg-brand-600 py-3 text-xs font-bold text-white shadow-md shadow-brand-600/20 hover:bg-brand-700 hover:shadow-brand-600/30 disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    <span>{isLoading ? "Creating Account..." : "Create Account & Send Verification Email"}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setAuthTab("PASSWORD")}
                      className="text-xs font-semibold text-navy-600 hover:text-navy-900 transition"
                    >
                      Already registered? Sign in here
                    </button>
                  </div>
                </form>
              )}

              {/* SCREEN 3: INSTITUTIONAL OTP EMAIL FORM */}
              {step === "EMAIL" && authTab === "OTP" && (
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div className="relative">
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="email" className="block text-xs font-bold text-navy-800 uppercase tracking-wider">
                        Official Institutional Email
                      </label>
                      <span className="text-[11px] text-navy-400">Single Sign-On</span>
                    </div>

                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-navy-400">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. 23z342@psgtech.ac.in or recruiter@microsoft.com"
                        className="w-full rounded-xl border border-surface-border pl-10 pr-4 py-2.5 text-navy-900 text-xs focus:border-brand-600 focus:outline-none focus:ring-3 focus:ring-brand-500/10 transition placeholder:text-navy-400 font-medium"
                      />
                    </div>

                    {/* Dynamic Routing Preview */}
                    {liveRolePreview && (
                      <div className="mt-2.5 flex items-center justify-between rounded-xl border border-surface-border bg-surface-subtle p-2.5 text-xs transition">
                        <div className="flex items-center gap-2">
                          <liveRolePreview.icon className="h-4 w-4 text-brand-600" />
                          <span className="text-navy-700 text-[11px]">
                            Destination: <strong className="text-navy-900">{liveRolePreview.dest}</strong>
                          </span>
                        </div>
                        <span
                          className={`rounded-full border px-2 py-0.5 font-semibold text-[10px] ${liveRolePreview.badgeStyle}`}
                        >
                          {liveRolePreview.badge}
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !email.trim() || Boolean(instantRoleLoading)}
                    className="w-full rounded-xl bg-brand-600 py-3 text-xs font-bold text-white shadow-md shadow-brand-600/20 hover:bg-brand-700 hover:shadow-brand-600/30 disabled:opacity-50 transition flex items-center justify-center gap-2 group"
                  >
                    <span>{isLoading ? "Identifying Workspace..." : "Send Verification Code"}</span>
                    <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                  </button>
                </form>
              )}

              {/* STEP 2: CREDENTIAL VERIFICATION (OTP, Passkey, or Email Verification) */}
              {step === "CREDENTIAL" && (
                <form onSubmit={handleCredentialSubmit} className="space-y-4">
                  {/* Back button */}
                  <button
                    type="button"
                    onClick={() => {
                      setStep("EMAIL");
                      setError(null);
                      setMessage(null);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-800 transition"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back to Sign In</span>
                  </button>


                  {/* Active Account Identity Card */}
                  <div className="flex items-center justify-between rounded-xl border border-surface-border bg-surface-subtle p-3 text-xs">
                    <div>
                      <span className="text-navy-400 block text-[10px] uppercase font-bold tracking-wider">
                        Authenticating Account
                      </span>
                      <span className="font-bold text-navy-900 text-xs">{email}</span>
                    </div>
                    <span className="rounded-full bg-brand-50 border border-brand-200 px-2.5 py-0.5 font-semibold text-[11px] text-brand-800">
                      {detectedAuth?.detected_role}
                    </span>
                  </div>

                  {detectedAuth?.auth_method === "otp" ? (
                    /* Segmented 6-digit OTP */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-navy-800 uppercase tracking-wider">
                          Enter 6-Digit Verification Code
                        </label>
                        <span className="text-[11px] text-navy-400">Sent to institutional inbox</span>
                      </div>

                      <div className="flex justify-between gap-2">
                        {otpDigits.map((digit, index) => (
                          <input
                            key={index}
                            ref={(el) => {
                              otpInputsRef.current[index] = el;
                            }}
                            type="text"
                            maxLength={1}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={digit}
                            onChange={(e) => handleOtpChange(index, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                            className="h-12 w-11 sm:h-13 sm:w-12 rounded-xl border border-surface-border text-center text-lg font-bold font-mono text-navy-900 focus:border-brand-600 focus:outline-none focus:ring-3 focus:ring-brand-500/10 transition shadow-xs"
                          />
                        ))}
                      </div>

                      {/* Resend & Demo Autofill */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-navy-500 text-[11px]">Didn&apos;t receive code?</span>
                          {canResend ? (
                            <button
                              type="button"
                              onClick={handleResendOtp}
                              className="font-bold text-brand-600 hover:text-brand-800 flex items-center gap-1 transition text-[11px]"
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span>Resend OTP</span>
                            </button>
                          ) : (
                            <span className="text-navy-400 font-mono text-[11px]">
                              Resend in {resendTimer}s
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const code = devOtp || "123456";
                            const chars = code.slice(0, 6).split("");
                            setOtpDigits([...chars, ...Array(6 - chars.length).fill("")].slice(0, 6));
                            setError(null);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700 transition"
                        >
                          <Sparkles className="h-3 w-3 text-brand-600" />
                          <span>Autofill Dev Code ({devOtp || "123456"})</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Recruiter Passkey */
                    <div className="space-y-2.5">
                      <label htmlFor="passkey" className="block text-xs font-bold text-navy-800 uppercase tracking-wider">
                        Corporate Partner Passkey
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-navy-400">
                          <Key className="h-4 w-4" />
                        </div>
                        <input
                          id="passkey"
                          type={showPasskey ? "text" : "password"}
                          required
                          value={passkey}
                          onChange={(e) => setPasskey(e.target.value)}
                          placeholder="Enter corporate passkey (HireLens)"
                          className="w-full rounded-xl border border-surface-border pl-9 pr-10 py-2.5 text-navy-900 text-xs focus:border-brand-600 focus:outline-none focus:ring-3 focus:ring-brand-500/10 transition placeholder:text-navy-400 font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasskey(!showPasskey)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-navy-400 hover:text-navy-700"
                        >
                          {showPasskey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>

                      <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-[11px] text-slate-600">
                        <div>
                          <span>Authorized Passkey: </span>
                          <code className="font-mono font-bold text-[11px] bg-white border border-slate-200 px-1 py-0.5 rounded text-indigo-700 ml-1">
                            HireLens
                          </code>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPasskey("HireLens")}
                          className="rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold transition"
                        >
                          Fill Key
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-xl bg-brand-600 py-3 text-xs font-bold text-white shadow-md shadow-brand-600/20 hover:bg-brand-700 hover:shadow-brand-600/30 disabled:opacity-50 transition flex items-center justify-center gap-2 group"
                  >
                    <span>{isLoading ? "Validating Session..." : "Enter Workspace Portal"}</span>
                    <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                  </button>
                </form>
              )}
            </div>

            {/* Bottom Footer Trust */}
            <div className="pt-6 border-t border-surface-border text-center">
              <p className="text-[11px] text-navy-400">
                HireLens Enterprise Placement & AI Screening System • Strictly Role-Protected & Monitored
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center py-16 text-navy-500 font-medium">Loading secure portal access...</div>}>
      <LoginContent />
    </Suspense>
  );
}
