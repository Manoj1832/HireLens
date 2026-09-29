"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export type UserRole = "STUDENT" | "RECRUITER" | "COLLEGE_ADMIN";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  status: string;
  full_name: string;
  department?: string | null;
  register_number?: string | null;
  batch?: string | null;
  graduation_year?: number | null;
  cgpa?: number | null;
  company_name?: string | null;
  designation?: string | null;
}

export interface IdentifyResult {
  email: string;
  detected_role: UserRole;
  auth_method: "otp" | "passkey";
  role_title: string;
  portal_target: string;
  is_institutional: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithDevRole: (role: UserRole) => Promise<void>;
  requestOtp: (email: string) => Promise<{ success: boolean; message: string; devOtp?: string; detected_role?: UserRole }>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  loginWithPasskey: (email: string, passkey: string) => Promise<void>;
  identifyEmail: (email: string) => Promise<IdentifyResult>;
  refreshProfile: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = "http://localhost:8000/api/v1";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Validate session against server on mount
  useEffect(() => {
    const validateExistingSession = async () => {
      const savedToken = localStorage.getItem("hirelens_token");
      const savedUser = localStorage.getItem("hirelens_user");

      if (!savedToken) {
        setIsLoading(false);
        return;
      }

      // Optimistic initial hydration from local storage
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          setUser(parsed);
          setToken(savedToken);
        } catch {
          // ignore parsing error
        }
      }

      // Verify token integrity with backend
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: {
            Authorization: `Bearer ${savedToken}`,
          },
        });

        if (res.ok) {
          const verifiedUser: User = await res.json();
          setUser(verifiedUser);
          setToken(savedToken);
          localStorage.setItem("hirelens_user", JSON.stringify(verifiedUser));
          document.cookie = `hirelens_role=${verifiedUser.role}; path=/; max-age=2592000; SameSite=Lax`;
          document.cookie = `hirelens_token=${savedToken}; path=/; max-age=2592000; SameSite=Lax`;
        } else if (res.status === 401) {
          // Token expired or revoked: cleanly purge session only on definitive 401
          localStorage.removeItem("hirelens_token");
          localStorage.removeItem("hirelens_user");
          document.cookie = "hirelens_role=; path=/; max-age=0";
          document.cookie = "hirelens_token=; path=/; max-age=0";
          setUser(null);
          setToken(null);
        } else {
          // On non-401 (e.g. 500/502/server restart), retain cached session
          console.warn(`Backend responded with status ${res.status}; retaining cached session.`);
        }
      } catch (err) {
        // Backend temporarily unreachable; retain cached user for offline view
        console.warn("Could not verify session with backend:", err);
      } finally {
        setIsLoading(false);
      }
    };

    validateExistingSession();
  }, []);

  const handleAuthSuccess = (accessToken: string, userData: User) => {
    setToken(accessToken);
    setUser(userData);
    localStorage.setItem("hirelens_token", accessToken);
    localStorage.setItem("hirelens_user", JSON.stringify(userData));

    // Set cookies for Next.js route middleware verification (30 days)
    document.cookie = `hirelens_role=${userData.role}; path=/; max-age=2592000; SameSite=Lax`;
    document.cookie = `hirelens_token=${accessToken}; path=/; max-age=2592000; SameSite=Lax`;

    // Navigate to role-specific dashboard
    if (userData.role === "STUDENT") {
      router.push("/student");
    } else if (userData.role === "RECRUITER") {
      router.push("/recruiter");
    } else if (userData.role === "COLLEGE_ADMIN") {
      router.push("/admin");
    }
  };

  const loginWithDevRole = async (role: UserRole) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/dev-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Login failed");
      }
      const data = await res.json();
      handleAuthSuccess(data.access_token, data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const requestOtp = async (email: string) => {
    const res = await fetch(`${API_BASE}/auth/request-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || "Failed to request verification code");
    }
    const data = await res.json();
    return {
      success: data.success,
      message: data.message,
      devOtp: data.dev_otp,
      detected_role: data.detected_role,
    };
  };

  const verifyOtp = async (email: string, otp: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Verification failed");
      }
      const data = await res.json();
      handleAuthSuccess(data.access_token, data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithPasskey = async (email: string, passkey: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/passkey-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, passkey }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Corporate passkey authentication failed");
      }
      const data = await res.json();
      handleAuthSuccess(data.access_token, data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const identifyEmail = async (email: string): Promise<IdentifyResult> => {
    const res = await fetch(`${API_BASE}/auth/identify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || "Identification failed");
    }
    return await res.json();
  };

  const refreshProfile = async () => {
    const currentToken = token || localStorage.getItem("hirelens_token");
    if (!currentToken) return;

    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      });
      if (res.ok) {
        const freshUser: User = await res.json();
        setUser(freshUser);
        localStorage.setItem("hirelens_user", JSON.stringify(freshUser));
      }
    } catch (e) {
      console.warn("Failed to refresh profile:", e);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("hirelens_token");
    localStorage.removeItem("hirelens_user");
    document.cookie = "hirelens_role=; path=/; max-age=0";
    document.cookie = "hirelens_token=; path=/; max-age=0";
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        loginWithDevRole,
        requestOtp,
        verifyOtp,
        loginWithPasskey,
        identifyEmail,
        refreshProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
