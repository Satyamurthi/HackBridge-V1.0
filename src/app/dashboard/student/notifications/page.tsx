"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  Bell, 
  Check, 
  CheckCheck, 
  ExternalLink, 
  Clock, 
  AlertCircle, 
  Users, 
  CreditCard, 
  Lock, 
  Trophy, 
  Info,
  Calendar
} from "lucide-react";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
}

export default function StudentNotificationsPage() {
  const [session, setSession] = useState<any>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "UNREAD">("ALL");
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const [meRes, notifRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/notifications?limit=50"),
      ]);

      if (meRes.ok) {
        const meData = await meRes.json();
        setSession(meData.user || null);
      }

      if (notifRes.ok) {
        const nData = await notifRes.json();
        setNotifications(nData.notifications || []);
        setUnreadCount(nData.unreadCount || 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch("/api/v1/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "MARK_READ", notificationId: id }),
      });

      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const markAllAsRead = async () => {
    setMarkingAll(true);
    try {
      const res = await fetch("/api/v1/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "MARK_ALL_READ" }),
      });

      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setMarkingAll(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "TEAM_INVITE":
        return <Users className="w-4 h-4 text-[#818CF8]" />;
      case "PAYMENT_VERIFIED":
        return <CreditCard className="w-4 h-4 text-emerald-400" />;
      case "PAYMENT_REJECTED":
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case "SUBMISSION_LOCKED":
        return <Lock className="w-4 h-4 text-[#818CF8]" />;
      case "RESULTS_PUBLISHED":
        return <Trophy className="w-4 h-4 text-amber-400" />;
      case "PROGRESS_REMINDER":
        return <Calendar className="w-4 h-4 text-[#6366F1]" />;
      default:
        return <Info className="w-4 h-4 text-[#94A3B8]" />;
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full">
        <div className="space-y-6">
          <div className="h-14 rounded-2xl bg-[#0B0E18]/55 border border-white/[0.08] animate-pulse" />
          <div className="space-y-4">
            <div className="h-20 rounded-2xl bg-[#0B0E18]/55 border border-white/[0.08] animate-pulse" />
            <div className="h-20 rounded-2xl bg-[#0B0E18]/55 border border-white/[0.08] animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!session || session.role !== "STUDENT") {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center relative z-10">
        <div className="p-3 rounded-full bg-white/[0.04] border border-white/10 w-fit mx-auto mb-4">
          <Lock className="w-6 h-6 text-[#94A3B8]" />
        </div>
        <h1 className="font-display text-xl font-bold text-[#F8FAFC] mb-2">Student Session Required</h1>
        <p className="text-xs text-[#94A3B8] mb-6 leading-relaxed">
          Please sign in with your student credentials to view your notifications.
        </p>
        <Link
          href="/login?redirect=/dashboard/student/notifications"
          className="px-5 py-2.5 rounded-lg bg-[#6366F1] text-white font-semibold text-xs hover:bg-[#4F46E5] transition-colors inline-block"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const displayedNotifications = notifications.filter((n) =>
    filter === "UNREAD" ? !n.read : true
  );

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full space-y-8 relative z-10 text-[#F8FAFC]">
      {/* Header & Breadcrumb */}
      <div className="pb-6 border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-[11px] font-mono text-[#64748B] uppercase tracking-wider flex items-center gap-2">
            <Link href="/dashboard/student" className="hover:text-[#818CF8]">Dashboard</Link>
            <span>/</span>
            <span className="text-[#818CF8] font-bold">Notifications</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
            Notifications & System Alerts
          </h1>
          <p className="text-xs text-[#94A3B8] font-mono">
            Real-time notifications, payment updates, and event status changes.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Filter Pills */}
          <div className="p-1 rounded-xl bg-[#0B0E18]/55 border border-white/[0.08] flex items-center gap-1 text-xs font-mono">
            <button
              onClick={() => setFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                filter === "ALL" ? "bg-[#6366F1] text-white" : "text-[#94A3B8] hover:text-[#F8FAFC]"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter("UNREAD")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                filter === "UNREAD" ? "bg-[#6366F1] text-white" : "text-[#94A3B8] hover:text-[#F8FAFC]"
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              disabled={markingAll}
              className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono font-bold text-[#F8FAFC] flex items-center gap-1.5 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5 text-[#818CF8]" />
              {markingAll ? "Marking..." : "Mark All Read"}
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      {displayedNotifications.length === 0 ? (
        <div className="p-16 rounded-3xl bg-[#0B0E18]/55 backdrop-blur-md border border-white/[0.08] text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-[#6366F1]">
            <Bell className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-[#F8FAFC]">
            {filter === "UNREAD" ? "No Unread Notifications" : "No Notifications Yet"}
          </h2>
          <p className="text-xs text-[#94A3B8] max-w-md mx-auto leading-relaxed">
            {filter === "UNREAD"
              ? "All your notifications have been marked as read."
              : "When you receive squad invites, payment verifications, or timer countdown alerts, they will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                !notif.read
                  ? "bg-[#0B0E18]/70 border-[#6366F1]/30 shadow-md shadow-indigo-500/5"
                  : "bg-[#0B0E18]/50 border-white/[0.06] hover:border-white/[0.1]"
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] shrink-0 mt-0.5">
                  {getNotificationIcon(notif.type)}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-[#F8FAFC]">
                      {notif.title}
                    </span>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-[#6366F1] animate-pulse" />
                    )}
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-[#94A3B8] uppercase">
                      {notif.type.replace(/_/g, " ")}
                    </span>
                  </div>

                  <p className="text-xs text-[#94A3B8] leading-relaxed max-w-2xl">
                    {notif.message}
                  </p>

                  <div className="text-[11px] font-mono text-[#64748B] flex items-center gap-1.5 pt-0.5">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(notif.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {notif.link && (
                  <Link
                    href={notif.link}
                    className="px-3 py-1.5 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-mono font-bold transition-colors inline-flex items-center gap-1 shadow-sm"
                  >
                    View Details
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}

                {!notif.read && (
                  <button
                    onClick={() => markAsRead(notif.id)}
                    className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#94A3B8] hover:text-[#F8FAFC] border border-white/[0.08] transition-colors"
                    title="Mark as read"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
