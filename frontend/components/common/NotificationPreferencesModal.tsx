"use client";

import React, { useState, useEffect } from "react";
import { X, Bell, Mail, Shield, Check, Loader2 } from "lucide-react";

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  token?: string | null;
}

interface PreferencesState {
  email_enabled: boolean;
  in_app_enabled: boolean;
  muted_types: string[];
}

const NOTIFICATION_CATEGORIES = [
  {
    type: "DRIVE_PUBLISHED",
    title: "New Placement Drives",
    description: "Alerts when new hiring drives matching your profile are published",
  },
  {
    type: "APPLICATION_STATUS_CHANGED",
    title: "Application Updates",
    description: "Status changes on your submitted applications (Shortlisted, Under Review)",
  },
  {
    type: "ASSESSMENT_SCHEDULED",
    title: "Assessment Invitations",
    description: "Notifications when screening assessments are configured or scheduled",
  },
  {
    type: "ASSESSMENT_REMINDER",
    title: "Assessment Reminders",
    description: "Upcoming assessment deadline reminders and countdown alerts",
  },
  {
    type: "ASSESSMENT_COMPLETED",
    title: "Assessment Results",
    description: "Score feedback and completion confirmations",
  },
  {
    type: "SYSTEM_ALERT",
    title: "System & Campus Announcements",
    description: "Important placement cell updates and platform maintenance notices",
  },
];

export default function NotificationPreferencesModal({
  isOpen,
  onClose,
  token,
}: NotificationPreferencesModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [prefs, setPrefs] = useState<PreferencesState>({
    email_enabled: true,
    in_app_enabled: true,
    muted_types: [],
  });

  useEffect(() => {
    if (!isOpen) return;

    const fetchPreferences = async () => {
      setLoading(true);
      try {
        const authToken = token || localStorage.getItem("hirelens_token");
        const res = await fetch("http://localhost:8000/api/v1/notifications/preferences", {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setPrefs({
            email_enabled: data.email_enabled,
            in_app_enabled: data.in_app_enabled,
            muted_types: data.muted_types || [],
          });
        }
      } catch (err) {
        console.error("Failed to load notification preferences:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [isOpen, token]);

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      const authToken = token || localStorage.getItem("hirelens_token");
      const res = await fetch("http://localhost:8000/api/v1/notifications/preferences", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(prefs),
      });
      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => {
          setSavedSuccess(false);
          onClose();
        }, 1000);
      }
    } catch (err) {
      console.error("Failed to save notification preferences:", err);
    } finally {
      setSaving(false);
    }
  };

  const toggleTypeMute = (type: string) => {
    setPrefs((prev) => {
      const isMuted = prev.muted_types.includes(type);
      return {
        ...prev,
        muted_types: isMuted
          ? prev.muted_types.filter((t) => t !== type)
          : [...prev.muted_types, type],
      };
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-surface-border bg-white shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-surface-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-navy-900">Notification Preferences</h3>
              <p className="text-xs text-navy-500">Configure delivery channels and alert categories</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-navy-400 hover:bg-surface-subtle hover:text-navy-700 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600 mb-2" />
            <p className="text-xs text-navy-500 font-medium">Loading preferences...</p>
          </div>
        ) : (
          <div className="py-4 space-y-6 max-h-[60vh] overflow-y-auto pr-1">
            {/* Delivery Channels */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-navy-400 mb-3">
                Delivery Channels
              </h4>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-3 rounded-xl border border-surface-border bg-surface-subtle/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                      <Bell className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-navy-900">In-App Notification Feed</p>
                      <p className="text-[11px] text-navy-500">Real-time alerts inside HireLens header</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prefs.in_app_enabled}
                      onChange={(e) => setPrefs({ ...prefs, in_app_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-surface-border bg-surface-subtle/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-navy-900">Email Digest & Alerts</p>
                      <p className="text-[11px] text-navy-500">Summary emails sent to your registered address</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prefs.email_enabled}
                      onChange={(e) => setPrefs({ ...prefs, email_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Notification Topics */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-navy-400 mb-3">
                Notification Topics
              </h4>
              <div className="space-y-2">
                {NOTIFICATION_CATEGORIES.map((cat) => {
                  const isEnabled = !prefs.muted_types.includes(cat.type);
                  return (
                    <div
                      key={cat.type}
                      className="flex items-center justify-between p-3 rounded-xl border border-surface-border hover:bg-surface-subtle/30 transition"
                    >
                      <div className="pr-4">
                        <p className="text-xs font-bold text-navy-900">{cat.title}</p>
                        <p className="text-[11px] text-navy-500 leading-relaxed">{cat.description}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => toggleTypeMute(cat.type)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-surface-border">
          <div className="flex items-center gap-1.5 text-[11px] text-navy-400">
            <Shield className="h-3.5 w-3.5 text-emerald-600" />
            <span>Encrypted & Privacy Protected</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-surface-border text-xs font-semibold text-navy-700 hover:bg-surface-subtle transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-xs font-bold text-white shadow-xs transition disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : savedSuccess ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Preferences</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
