"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell, CheckCheck, ExternalLink, Clock } from "lucide-react";

interface NotificationItem {
  id: string;
  type: string;
  payload: {
    title: string;
    message: string;
    link?: string;
    metadata?: Record<string, any>;
  };
  readAt: string | null;
  createdAt: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/v1/notifications?limit=20");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // Ignore background fetch error
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await fetch("/api/v1/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "MARK_READ", notificationId: id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Ignore
    }
  };

  const handleMarkAllRead = async () => {
    if (loading || unreadCount === 0) return;
    setLoading(true);
    try {
      await fetch("/api/v1/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "MARK_ALL_READ" }),
      });
      const now = new Date().toISOString();
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: now })));
      setUnreadCount(0);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors"
        title="Notifications"
        aria-label="View notifications"
        data-testid="notification-bell-btn"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[15px] h-[15px] px-1 text-[9px] font-mono font-bold text-white bg-[#6366F1] rounded-full">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Tray */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg bg-[#030407] border border-white/[0.08] shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/20">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={loading}
                className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-white transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-white/[0.04]">
            {notifications.length === 0 ? (
              <div className="py-10 text-center px-4">
                <Clock className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                <p className="text-xs text-slate-400 font-medium">No notifications yet</p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Platform alerts and squad invitations will appear here.
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !n.readAt;
                return (
                  <div
                    key={n.id}
                    onClick={() => isUnread && handleMarkAsRead(n.id)}
                    className={`p-3.5 transition-colors cursor-pointer text-left ${
                      isUnread
                        ? "bg-[#6366F1]/[0.03] hover:bg-[#6366F1]/[0.06]"
                        : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        {isUnread && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] flex-shrink-0" />
                        )}
                        <h4 className="text-xs font-semibold text-white tracking-tight">
                          {n.payload.title}
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">
                        {formatTimeAgo(n.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed pl-3 mb-2">
                      {n.payload.message}
                    </p>

                    {n.payload.link && (
                      <div className="pl-3">
                        <Link
                          href={n.payload.link}
                          onClick={() => {
                            if (isUnread) handleMarkAsRead(n.id);
                            setIsOpen(false);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-[#6366F1] hover:underline"
                        >
                          <span>Open action</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
