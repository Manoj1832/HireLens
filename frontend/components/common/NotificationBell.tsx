"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  Briefcase,
  FileText,
  ClipboardCheck,
  Award,
  AlertCircle,
  ShieldAlert,
  Settings,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import NotificationPreferencesModal from "./NotificationPreferencesModal";

interface NotificationItem {
  id: string;
  user_id: string;
  type: string;
  channel: string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  is_read: boolean;
  read_at?: string | null;
  delivery_status: string;
  created_at: string;
}

export default function NotificationBell() {
  const { user, token } = useAuth();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [prefsOpen, setPrefsOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const getAuthToken = useCallback(() => {
    return token || (typeof window !== "undefined" ? localStorage.getItem("hirelens_token") : null);
  }, [token]);

  // Fetch unread count for fast badge polling
  const fetchUnreadCount = useCallback(async () => {
    const authToken = getAuthToken();
    if (!authToken) return;

    try {
      const res = await fetch("http://localhost:8000/api/v1/notifications/unread-count", {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unread_count || 0);
      }
    } catch (err) {
      // Quiet fail on network polling
    }
  }, [getAuthToken]);

  // Fetch full notification list
  const fetchNotifications = useCallback(
    async (onlyUnread = false) => {
      const authToken = getAuthToken();
      if (!authToken) return;

      setLoading(true);
      try {
        const query = onlyUnread ? "?unread_only=true" : "";
        const res = await fetch(`http://localhost:8000/api/v1/notifications${query}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.unread_count || 0);
        }
      } catch (err) {
        console.error("Failed to load notifications:", err);
      } finally {
        setLoading(false);
      }
    },
    [getAuthToken]
  );

  // Poll unread count every 30 seconds
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // When dropdown opens, fetch feed
  useEffect(() => {
    if (isOpen) {
      fetchNotifications(activeTab === "unread");
    }
  }, [isOpen, activeTab, fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Mark single as read
  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const authToken = getAuthToken();
    if (!authToken) return;

    try {
      const res = await fetch(`http://localhost:8000/api/v1/notifications/${id}/read`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (err) {
      console.error("Error marking notification read:", err);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    const authToken = getAuthToken();
    if (!authToken) return;

    try {
      const res = await fetch("http://localhost:8000/api/v1/notifications/read-all", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Error marking all read:", err);
    }
  };

  // Handle navigation on notification click
  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.is_read) {
      handleMarkAsRead(item.id);
    }

    setIsOpen(false);

    // Route based on metadata and role
    if (item.metadata?.drive_id) {
      if (user?.role === "STUDENT") {
        router.push("/student?tab=drives");
      } else if (user?.role === "RECRUITER") {
        router.push("/recruiter?tab=drives");
      }
    } else if (item.metadata?.assessment_id) {
      if (user?.role === "STUDENT") {
        router.push("/student?tab=assessments");
      } else {
        router.push("/recruiter?tab=assessments");
      }
    } else if (item.type === "INTEGRITY_REVIEW_REQUIRED") {
      router.push("/recruiter?tab=drives");
    }
  };

  // Icon mapping
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "DRIVE_PUBLISHED":
        return <Briefcase className="h-4 w-4 text-blue-600" />;
      case "APPLICATION_SUBMITTED":
      case "APPLICATION_STATUS_CHANGED":
        return <FileText className="h-4 w-4 text-indigo-600" />;
      case "CANDIDATE_SHORTLISTED":
        return <Award className="h-4 w-4 text-emerald-600" />;
      case "CANDIDATE_REJECTED":
        return <AlertCircle className="h-4 w-4 text-rose-500" />;
      case "ASSESSMENT_SCHEDULED":
      case "ASSESSMENT_REMINDER":
      case "ASSESSMENT_COMPLETED":
      case "ASSESSMENT_RESULTS_READY":
        return <ClipboardCheck className="h-4 w-4 text-purple-600" />;
      case "INTEGRITY_REVIEW_REQUIRED":
        return <ShieldAlert className="h-4 w-4 text-amber-600" />;
      default:
        return <Bell className="h-4 w-4 text-navy-600" />;
    }
  };

  // Relative time format helper
  const formatTimeAgo = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      if (diffSecs < 60) return "Just now";
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return "";
    }
  };

  const filteredNotifications =
    activeTab === "unread"
      ? notifications.filter((n) => !n.is_read)
      : notifications;

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* Bell Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="View notifications"
          className="relative rounded-xl border border-surface-border bg-surface-subtle p-2 text-navy-600 hover:bg-surface-accent hover:border-brand-200 transition focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white ring-2 ring-white animate-pulse">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown Popover */}
        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-surface-border bg-white shadow-2xl shadow-blue-950/10 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between p-3.5 border-b border-surface-border bg-surface-subtle/40">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
                  Notifications
                </h4>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-brand-50 text-brand-700 font-bold px-2 py-0.5 text-[10px] border border-brand-200">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    title="Mark all as read"
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-brand-600 hover:bg-brand-50 transition"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    <span>Read all</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setPrefsOpen(true);
                  }}
                  title="Notification settings"
                  className="rounded-lg p-1.5 text-navy-400 hover:bg-surface-subtle hover:text-navy-700 transition"
                >
                  <Settings className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex border-b border-surface-border px-3 bg-white">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition ${
                  activeTab === "all"
                    ? "border-brand-600 text-brand-600"
                    : "border-transparent text-navy-500 hover:text-navy-800"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("unread")}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition ${
                  activeTab === "unread"
                    ? "border-brand-600 text-brand-600"
                    : "border-transparent text-navy-500 hover:text-navy-800"
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {/* Notification List */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-surface-border">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-600 mb-2" />
                  <p className="text-xs text-navy-500">Loading notifications...</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="py-12 px-6 flex flex-col items-center justify-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-subtle text-navy-400 mb-3">
                    <Bell className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-bold text-navy-800">No notifications</p>
                  <p className="text-[11px] text-navy-500 mt-1 max-w-[200px]">
                    {activeTab === "unread"
                      ? "You have no unread notifications right now."
                      : "Campus drives, tests, and application alerts will appear here."}
                  </p>
                </div>
              ) : (
                filteredNotifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`group relative p-3.5 flex items-start gap-3 transition cursor-pointer hover:bg-surface-subtle/80 ${
                      !item.is_read ? "bg-blue-50/30" : "bg-white"
                    }`}
                  >
                    {/* Channel / Type Icon */}
                    <div className="p-2 rounded-xl bg-surface-subtle border border-surface-border shrink-0 mt-0.5">
                      {getNotificationIcon(item.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h5
                          className={`text-xs truncate ${
                            !item.is_read
                              ? "font-bold text-navy-900"
                              : "font-semibold text-navy-700"
                          }`}
                        >
                          {item.title}
                        </h5>
                        <span className="text-[10px] text-navy-400 shrink-0 font-medium">
                          {formatTimeAgo(item.created_at)}
                        </span>
                      </div>
                      <p className="text-[11px] text-navy-600 line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>
                    </div>

                    {/* Unread indicator / mark read action */}
                    {!item.is_read ? (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsRead(item.id, e)}
                        title="Mark as read"
                        className="opacity-0 group-hover:opacity-100 transition p-1 rounded-md text-navy-400 hover:text-brand-600 hover:bg-white shrink-0 self-center"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <span className="h-2 w-2 shrink-0 self-center" />
                    )}

                    {!item.is_read && (
                      <span className="absolute top-4 right-3 h-2 w-2 rounded-full bg-brand-600 group-hover:hidden" />
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-2.5 border-t border-surface-border bg-surface-subtle/40 text-center">
              <span className="text-[10px] text-navy-400 font-medium">
                HireLens Real-Time Event Notifier • 30s Polling
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Preferences Modal */}
      <NotificationPreferencesModal
        isOpen={prefsOpen}
        onClose={() => setPrefsOpen(false)}
        token={getAuthToken()}
      />
    </>
  );
}
