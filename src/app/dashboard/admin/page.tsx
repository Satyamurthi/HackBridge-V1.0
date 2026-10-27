"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  ShieldCheck, 
  Building2, 
  Check, 
  X, 
  Pause, 
  Play, 
  Activity, 
  Layers, 
  Settings,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Search,
  Filter,
  FileText,
  Key,
  Server,
  Lock,
  Save
} from "lucide-react";

interface HostRecord {
  id: string;
  userId: string;
  orgName: string;
  type: string;
  approvalStatus: string;
  membershipStatus: string;
  website?: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
  };
  _count?: {
    hackathons: number;
  };
}

interface AuditRecord {
  id: string;
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  metadata?: string | null;
  createdAt: string;
  actor?: {
    name: string;
    email: string;
    role: string;
  } | null;
}

interface SiteContentRecord {
  id: string;
  key: string;
  jsonValue: string;
  version: number;
  published: boolean;
  updatedAt: string;
}

export default function AdminDashboard() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"hosts" | "audit" | "cms" | "settings">("hosts");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Hosts
  const [hosts, setHosts] = useState<HostRecord[]>([]);
  const [hostsLoading, setHostsLoading] = useState(false);
  const [hostFilter, setHostFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // CMS
  const [cmsList, setCmsList] = useState<SiteContentRecord[]>([]);
  const [cmsLoading, setCmsLoading] = useState(false);
  const [cmsKey, setCmsKey] = useState("global_announcement");
  const [cmsJson, setCmsJson] = useState('{\n  "message": "Welcome to HackBridge National Circuit 2026",\n  "link": "/hackathons"\n}');
  const [cmsPublished, setCmsPublished] = useState(true);
  const [cmsSaving, setCmsSaving] = useState(false);

  // Platform Settings
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [integrations, setIntegrations] = useState<any>(null);
  const [systemConfig, setSystemConfig] = useState({
    maintenanceMode: false,
    newRegistrationsOpen: true,
    maxFileUploadSizeMB: 10,
    noticeBanner: "",
  });
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Fetch session
  useEffect(() => {
    fetch("/api/v1/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setSession(data.user);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Fetch hosts
  const fetchHosts = useCallback(async () => {
    setHostsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/v1/admin/hosts");
      if (res.ok) {
        const data = await res.json();
        setHosts(data.hosts || []);
      } else {
        const err = await res.json();
        setErrorMessage(err.error || "Failed to load hosts");
      }
    } catch {
      setErrorMessage("Network error loading hosts");
    } finally {
      setHostsLoading(false);
    }
  }, []);

  // Fetch audit logs
  const fetchAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await fetch("/api/v1/admin/audit?limit=50");
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch {
      // ignore
    } finally {
      setAuditLoading(false);
    }
  }, []);

  // Fetch CMS Content
  const fetchCms = useCallback(async () => {
    setCmsLoading(true);
    try {
      const res = await fetch("/api/v1/admin/site-content");
      if (res.ok) {
        const data = await res.json();
        setCmsList(data.contents || []);
      }
    } catch {
      // ignore
    } finally {
      setCmsLoading(false);
    }
  }, []);

  // Fetch System Settings
  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch("/api/v1/admin/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.settings) setSystemConfig(data.settings);
        if (data.integrations) setIntegrations(data.integrations);
      }
    } catch {
      // ignore
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.role === "SUPER_ADMIN") {
      fetchHosts();
      fetchAuditLogs();
      fetchCms();
      fetchSettings();
    }
  }, [session, fetchHosts, fetchAuditLogs, fetchCms, fetchSettings]);

  // Handle status update
  const handleUpdateStatus = async (hostId: string, newStatus: "APPROVED" | "PAUSED" | "REJECTED") => {
    setActionMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/v1/admin/hosts/${hostId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const err = await res.json();
        setErrorMessage(err.error || "Failed to update host status");
        return;
      }

      const data = await res.json();
      setHosts((prev) =>
        prev.map((h) => (h.id === hostId ? { ...h, approvalStatus: newStatus } : h))
      );

      setActionMessage(`Host ${data.host?.orgName || hostId} status changed to ${newStatus}. Recorded to audit log.`);
      fetchAuditLogs();
      setTimeout(() => setActionMessage(null), 4000);
    } catch {
      setErrorMessage("Network error updating host");
    }
  };

  // Save CMS Content
  const handleSaveCms = async (e: React.FormEvent) => {
    e.preventDefault();
    setCmsSaving(true);
    setActionMessage(null);
    setErrorMessage(null);
    try {
      // Validate JSON
      try {
        JSON.parse(cmsJson);
      } catch {
        setErrorMessage("Invalid JSON format in CMS editor");
        setCmsSaving(false);
        return;
      }

      const res = await fetch("/api/v1/admin/site-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: cmsKey,
          jsonValue: cmsJson,
          published: cmsPublished,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setErrorMessage(err.error || "Failed to save CMS content");
        return;
      }

      setActionMessage(`Site Content block "${cmsKey}" updated successfully. Logged to audit stream.`);
      fetchCms();
      fetchAuditLogs();
      setTimeout(() => setActionMessage(null), 4000);
    } catch {
      setErrorMessage("Network error saving CMS content");
    } finally {
      setCmsSaving(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async (updates: Partial<typeof systemConfig>) => {
    setSettingsSaving(true);
    setActionMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/v1/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const err = await res.json();
        setErrorMessage(err.error || "Failed to save settings");
        return;
      }

      const data = await res.json();
      setSystemConfig(data.settings);
      setActionMessage("Platform settings updated. Audit trail recorded.");
      fetchAuditLogs();
      setTimeout(() => setActionMessage(null), 4000);
    } catch {
      setErrorMessage("Network error updating settings");
    } finally {
      setSettingsSaving(false);
    }
  };

  // Filtering
  const filteredHosts = hosts.filter((h) => {
    if (hostFilter !== "ALL" && h.approvalStatus !== hostFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchOrg = h.orgName.toLowerCase().includes(q);
      const matchEmail = h.user.email.toLowerCase().includes(q);
      const matchName = h.user.name.toLowerCase().includes(q);
      return matchOrg || matchEmail || matchName;
    }
    return true;
  });

  const pendingCount = hosts.filter((h) => h.approvalStatus === "PENDING").length;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs font-mono text-slate-500">Authenticating Super Admin clearance...</p>
      </div>
    );
  }

  if (!session || session.role !== "SUPER_ADMIN") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Super Admin Clearance Required</h1>
        <p className="text-xs text-slate-400 mb-6 font-mono">
          Access to platform governance and host approval queues is restricted to authorized super administrators.
        </p>
        <Link
          href="/login"
          className="inline-block px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-slate-200 transition-colors"
        >
          Authenticate as Admin
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full">
      {/* Header Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-white/[0.08] gap-4">
        <div className="space-y-1">
          <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <span>HackBridge</span>
            <span>/</span>
            <span>Governance</span>
            <span>/</span>
            <span className="text-white">Super Admin Command</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">
            Platform Oversight & Host Authorization
          </h1>
          <p className="text-xs text-slate-400">
            Authenticated as: <span className="text-slate-200 font-mono">{session.email}</span> · Full Moderation & Audit Authority
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchHosts();
              fetchAuditLogs();
              fetchCms();
              fetchSettings();
            }}
            className="p-2 rounded-lg bg-white/[0.04] border border-white/10 text-slate-400 hover:text-white transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${hostsLoading || auditLoading ? "animate-spin" : ""}`} />
          </button>
          <span className="px-2.5 py-1 rounded text-[11px] font-mono bg-white/[0.05] border border-white/10 text-slate-300 font-semibold">
            CLEARANCE: SUPER_ADMIN
          </span>
        </div>
      </div>

      {actionMessage && (
        <div className="mb-6 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-mono text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Sidebar */}
        <aside className="md:col-span-3 space-y-4">
          <nav className="p-2 rounded-2xl bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] shadow-sm space-y-1 text-xs font-mono">
            <button
              onClick={() => setActiveTab("hosts")}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center justify-between ${
                activeTab === "hosts"
                  ? "bg-[#6366F1] text-white font-bold shadow-sm"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4" />
                <span>Host Approvals</span>
              </div>
              {pendingCount > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === "hosts" ? "bg-white text-[#6366F1]" : "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                }`}>
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab("audit");
                fetchAuditLogs();
              }}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-2.5 ${
                activeTab === "audit"
                  ? "bg-[#6366F1] text-white font-bold shadow-sm"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]"
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Audit Trail</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("cms");
                fetchCms();
              }}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-2.5 ${
                activeTab === "cms"
                  ? "bg-[#6366F1] text-white font-bold shadow-sm"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Site CMS</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("settings");
                fetchSettings();
              }}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-2.5 ${
                activeTab === "settings"
                  ? "bg-[#6366F1] text-white font-bold shadow-sm"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Platform Rules</span>
            </button>
          </nav>

          {/* Quick Metrics */}
          <div className="p-4 rounded-2xl bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] shadow-sm space-y-3 font-mono text-xs">
            <div className="text-[10px] text-[#64748B] uppercase tracking-wider font-bold">
              Network Overview
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#94A3B8]">Total Hosts:</span>
              <span className="text-[#F8FAFC] font-extrabold">{hosts.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#94A3B8]">Pending Review:</span>
              <span className="text-amber-400 font-extrabold">{pendingCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#94A3B8]">Approved Active:</span>
              <span className="text-[#818CF8] font-extrabold">
                {hosts.filter((h) => h.approvalStatus === "APPROVED").length}
              </span>
            </div>
          </div>
        </aside>

        {/* Main Content Pane */}
        <main className="md:col-span-9 space-y-6">
          {activeTab === "hosts" && (
            <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] rounded-2xl p-6 space-y-6 shadow-sm">
              {/* Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search host organization, contact name, or email..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#111524]/70 border border-white/[0.1] text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#6366F1] font-mono"
                  />
                </div>

                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#111524]/60 border border-white/[0.08] text-xs font-mono">
                  {["ALL", "PENDING", "APPROVED", "PAUSED", "REJECTED"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setHostFilter(s)}
                      className={`px-2.5 py-1 rounded-lg transition-colors text-[11px] ${
                        hostFilter === s
                          ? "bg-[#6366F1] text-white font-bold"
                          : "text-[#94A3B8] hover:text-[#F8FAFC]"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              {hostsLoading ? (
                <div className="p-12 text-center text-xs font-mono text-[#64748B]">
                  Loading host directory...
                </div>
              ) : filteredHosts.length === 0 ? (
                <div className="p-12 text-center text-xs font-mono text-[#64748B]">
                  No hosts match the current filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/[0.08] text-[#64748B] text-[10px] uppercase">
                        <th className="py-3 px-4">Organization & Contact</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Tracks</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Moderation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {filteredHosts.map((host) => (
                        <tr key={host.id} className="hover:bg-white/[0.01]">
                          <td className="py-3 px-4">
                            <div className="font-bold text-[#F8FAFC]">{host.orgName}</div>
                            <div className="text-[11px] text-[#94A3B8]">
                              {host.user.name} · {host.user.email}
                            </div>
                            {host.website && (
                              <a
                                href={host.website}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-[#64748B] hover:text-[#F8FAFC] flex items-center gap-1 mt-0.5"
                              >
                                {host.website} <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </td>
                          <td className="py-3 px-4 text-[#94A3B8] uppercase text-[10px]">
                            {host.type}
                          </td>
                          <td className="py-3 px-4 text-[#94A3B8]">
                            {host._count?.hackathons ?? 0}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              host.approvalStatus === "APPROVED"
                                ? "bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/40"
                                : host.approvalStatus === "PAUSED"
                                ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                : host.approvalStatus === "REJECTED"
                                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                : "bg-white/5 text-amber-300 border border-amber-500/30"
                            }`}>
                              {host.approvalStatus}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {host.approvalStatus !== "APPROVED" && (
                                <button
                                  onClick={() => handleUpdateStatus(host.id, "APPROVED")}
                                  className="px-2 py-1 rounded bg-[#6366F1] text-white font-semibold text-[10px] hover:bg-[#4F46E5] transition-colors"
                                >
                                  Approve
                                </button>
                              )}

                              {host.approvalStatus === "APPROVED" && (
                                <button
                                  onClick={() => handleUpdateStatus(host.id, "PAUSED")}
                                  className="px-2 py-1 rounded bg-white/10 text-[#F8FAFC] font-semibold text-[10px] hover:bg-white/20 transition-colors"
                                >
                                  Pause
                                </button>
                              )}

                              {host.approvalStatus !== "REJECTED" && (
                                <button
                                  onClick={() => handleUpdateStatus(host.id, "REJECTED")}
                                  className="px-2 py-1 rounded bg-white/5 text-[#94A3B8] hover:text-red-400 text-[10px] transition-colors"
                                >
                                  Reject
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "audit" && (
            <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] rounded-2xl p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#F8FAFC] tracking-tight">
                    Platform Immutable Audit Stream
                  </h2>
                  <p className="text-[11px] text-[#94A3B8] font-mono mt-0.5">
                    PRD Rule 10: All governance, auth changes, and publishing actions logged with timestamp and actor.
                  </p>
                </div>
                <button
                  onClick={fetchAuditLogs}
                  className="px-2.5 py-1 text-[11px] font-mono rounded bg-white/[0.04] border border-white/10 text-[#94A3B8] hover:text-[#F8FAFC]"
                >
                  Refresh
                </button>
              </div>

              {auditLoading ? (
                <div className="p-8 text-center text-xs font-mono text-[#64748B]">
                  Loading audit events...
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-[#64748B]">
                  No audit logs recorded yet.
                </div>
              ) : (
                <div className="space-y-2 text-xs font-mono">
                  {auditLogs.map((log) => {
                    let meta: any = null;
                    try {
                      if (log.metadata) meta = JSON.parse(log.metadata);
                    } catch {
                      // ignore
                    }

                    return (
                      <div
                        key={log.id}
                        className="p-3 rounded-lg bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#F8FAFC]">{log.action}</span>
                            <span className="text-[10px] text-[#64748B]">· {log.entity} #{log.entityId.slice(0, 8)}</span>
                          </div>
                          <div className="text-[11px] text-[#94A3B8]">
                            Actor: {log.actor?.name || log.actor?.email || log.actorId} ({log.actor?.role || "SYSTEM"})
                            {meta?.orgName && ` · Org: ${meta.orgName}`}
                            {meta?.newStatus && ` · Status: ${meta.newStatus}`}
                            {meta?.title && ` · Title: ${meta.title}`}
                          </div>
                        </div>
                        <span className="text-[#64748B] text-[10px] shrink-0 font-mono">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "cms" && (
            <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] rounded-2xl p-6 space-y-6 shadow-sm">
              <div>
                <h2 className="text-sm font-bold text-[#F8FAFC] tracking-tight">
                  Site CMS & Content Publishing
                </h2>
                <p className="text-[11px] text-[#94A3B8] font-mono mt-0.5">
                  Update dynamic banners, hero announcements, and site-wide notifications.
                </p>
              </div>

              {/* Existing CMS Blocks */}
              <div className="space-y-2">
                <div className="text-[10px] font-mono uppercase text-[#64748B] font-bold">
                  Active Content Blocks
                </div>
                {cmsLoading ? (
                  <div className="text-xs font-mono text-[#64748B]">Loading CMS blocks...</div>
                ) : cmsList.length === 0 ? (
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 text-xs font-mono text-[#64748B]">
                    No CMS blocks saved yet. Use the editor below to create one.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {cmsList.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setCmsKey(item.key);
                          setCmsJson(item.jsonValue);
                          setCmsPublished(item.published);
                        }}
                        className="p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/20 cursor-pointer transition-colors space-y-1 font-mono text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#F8FAFC]">{item.key}</span>
                          <span className="text-[10px] text-[#64748B]">v{item.version}</span>
                        </div>
                        <div className="text-[10px] text-[#94A3B8] truncate">
                          {item.jsonValue.slice(0, 60)}...
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CMS Editor Form */}
              <form onSubmit={handleSaveCms} className="space-y-4 pt-4 border-t border-white/[0.08] font-mono text-xs">
                <div>
                  <label className="block text-[11px] text-[#94A3B8] mb-1">
                    Content Identifier Key
                  </label>
                  <input
                    type="text"
                    value={cmsKey}
                    onChange={(e) => setCmsKey(e.target.value)}
                    required
                    placeholder="e.g. global_announcement, hero_banner, featured_slug"
                    className="w-full px-3 py-2 rounded-lg bg-[#111524]/70 border border-white/10 text-[#F8FAFC] focus:outline-none focus:border-[#6366F1]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[#94A3B8] mb-1">
                    JSON Value Payload
                  </label>
                  <textarea
                    rows={6}
                    value={cmsJson}
                    onChange={(e) => setCmsJson(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-[#111524]/70 border border-white/10 text-[#F8FAFC] font-mono text-xs focus:outline-none focus:border-[#6366F1]"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cmsPublished}
                      onChange={(e) => setCmsPublished(e.target.checked)}
                      className="rounded bg-white/5 border-white/10 text-[#6366F1]"
                    />
                    <span className="text-[#94A3B8] text-xs">Published & Live</span>
                  </label>

                  <button
                    type="submit"
                    disabled={cmsSaving}
                    className="px-4 py-2 rounded-xl bg-[#6366F1] text-white font-bold text-xs hover:bg-[#4F46E5] transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{cmsSaving ? "Saving..." : "Save Content Block"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] rounded-2xl p-6 space-y-6 shadow-sm">
              <div>
                <h2 className="text-sm font-bold text-[#F8FAFC] tracking-tight">
                  Global Integrations & Security Policies
                </h2>
                <p className="text-[11px] text-[#94A3B8] font-mono mt-0.5">
                  Platform architecture, zero-exposure secret verification, and operational controls.
                </p>
              </div>

              {/* Rule 9 Zero-Exposure Secret Audit */}
              <div className="space-y-3 font-mono text-xs">
                <div className="text-[10px] uppercase text-[#64748B] font-bold">
                  PRD Rule 9: Zero Secret Exposure Status
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Key className="w-3.5 h-3.5 text-[#64748B]" />
                      <span className="text-[#F8FAFC]">JWT Secret</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      integrations?.jwtSecretConfigured
                        ? "bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/30"
                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}>
                      {integrations?.jwtSecretConfigured ? "VERIFIED" : "MISSING"}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Server className="w-3.5 h-3.5 text-[#64748B]" />
                      <span className="text-[#F8FAFC]">Database Engine</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 text-[#94A3B8] border border-white/10">
                      {integrations?.databaseType || "SQLite"}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-[#64748B]" />
                      <span className="text-[#F8FAFC]">Razorpay Webhooks</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      integrations?.razorpayWebhookConfigured
                        ? "bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/30"
                        : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                    }`}>
                      {integrations?.razorpayWebhookConfigured ? "CONFIGURED" : "DEMO / QR"}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#64748B]" />
                      <span className="text-[#F8FAFC]">GitHub Org Provisioning</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      integrations?.githubTokenConfigured
                        ? "bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/30"
                        : "bg-white/5 text-[#64748B] border border-white/10"
                    }`}>
                      {integrations?.githubTokenConfigured ? "CONNECTED" : "DEV STUB"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic Operational Controls */}
              <div className="space-y-4 pt-4 border-t border-white/[0.08] font-mono text-xs">
                <div className="text-[10px] uppercase text-[#64748B] font-bold">
                  Runtime Operational Flags
                </div>

                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-[#F8FAFC] font-bold">Maintenance Mode</div>
                      <div className="text-[11px] text-[#94A3B8]">
                        Block non-admin write operations and show maintenance banner.
                      </div>
                    </div>
                    <button
                      onClick={() => handleSaveSettings({ maintenanceMode: !systemConfig.maintenanceMode })}
                      disabled={settingsSaving}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                        systemConfig.maintenanceMode
                          ? "bg-amber-500 text-black"
                          : "bg-white/5 text-[#94A3B8] hover:text-[#F8FAFC]"
                      }`}
                    >
                      {systemConfig.maintenanceMode ? "ACTIVE" : "OFF"}
                    </button>
                  </div>

                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-[#F8FAFC] font-bold">Student Registrations</div>
                      <div className="text-[11px] text-[#94A3B8]">
                        Allow new students to sign up and receive permanent Hackathon IDs.
                      </div>
                    </div>
                    <button
                      onClick={() => handleSaveSettings({ newRegistrationsOpen: !systemConfig.newRegistrationsOpen })}
                      disabled={settingsSaving}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                        systemConfig.newRegistrationsOpen
                          ? "bg-[#6366F1] text-white"
                          : "bg-white/5 text-[#94A3B8] hover:text-[#F8FAFC]"
                      }`}
                    >
                      {systemConfig.newRegistrationsOpen ? "OPEN" : "PAUSED"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Invariant Reminders */}
              <div className="space-y-3 text-xs font-mono text-[#94A3B8] pt-4 border-t border-white/[0.08]">
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="text-[#F8FAFC] font-bold">PRD Rule 1: Single Active Hackathon per Student</div>
                  <p className="text-[11px]">
                    Enforced at database and API transaction level. A student cannot register for another hackathon until their current event finishes.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="text-[#F8FAFC] font-bold">PRD Rule 4: Balanced Problem Statement Caps</div>
                  <p className="text-[11px]">
                    Automatic selection capping equal to <code>Ceil(totalTeams / totalStatements)</code> prevents clustering on easy problem statements during live reveal.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
