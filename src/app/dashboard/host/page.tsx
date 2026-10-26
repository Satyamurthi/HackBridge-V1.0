"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Building2,
  Layers,
  CreditCard,
  Users,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  FileText,
  Rocket,
  Archive,
  Check,
  Search,
} from "lucide-react";

interface HackathonRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  fee: number;
  paymentMode: string;
  startAt: string;
  endAt: string;
  domains: Array<{ name: string; problemStatements: Array<{ id: string }> }>;
  _count: { teams: number; judges: number };
}

interface HostInfo {
  id: string;
  orgName: string;
  type: string;
  approvalStatus: string;
}

interface PaymentRow {
  id: string;
  mode: string;
  amount: number;
  status: string;
  txnRef?: string | null;
  screenshotUrl?: string | null;
  createdAt: string;
  team: {
    id: string;
    teamId: string | null;
    name: string;
    hackathon: { title: string; slug: string };
    leadStudent: { user: { name: string; email: string } };
  };
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-white/5 text-slate-400 border-white/10",
  PUBLISHED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  ARCHIVED: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export default function HostDashboard() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hackathons, setHackathons] = useState<HackathonRow[]>([]);
  const [hostInfo, setHostInfo] = useState<HostInfo | null>(null);
  const [activeTab, setActiveTab] = useState<"hackathons" | "payments" | "judges">("hackathons");
  const [publishing, setPublishing] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Payments queue states
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  const loadData = useCallback(async () => {
    const [meRes, hacksRes, paymentsRes] = await Promise.all([
      fetch("/api/v1/auth/me"),
      fetch("/api/v1/host/hackathons"),
      fetch("/api/v1/host/payments"),
    ]);

    if (meRes.ok) {
      const d = await meRes.json();
      if (d?.user) setSession(d.user);
    }

    if (hacksRes.ok) {
      const d = await hacksRes.json();
      setHackathons(d.hackathons || []);
      setHostInfo(d.host || null);
    }

    if (paymentsRes.ok) {
      const d = await paymentsRes.json();
      setPayments(d.payments || []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePublish = async (id: string) => {
    setPublishing(id);
    try {
      const res = await fetch(`/api/v1/hackathons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "PUBLISH" }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMsg(`"${data.hackathon.title}" published successfully.`);
        await loadData();
      } else {
        setActionMsg(`Error: ${data.error}`);
      }
    } finally {
      setPublishing(null);
      setTimeout(() => setActionMsg(null), 4000);
    }
  };

  const handlePaymentDecision = async (paymentId: string, action: "APPROVE" | "REJECT") => {
    try {
      const res = await fetch(`/api/v1/host/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMsg(
          action === "APPROVE"
            ? `Payment verified! Team ID ${data.teamId} issued.`
            : "Payment rejected."
        );
        loadData();
      } else {
        setActionMsg(`Error: ${data.error}`);
      }
    } catch {
      setActionMsg("Network error updating payment");
    } finally {
      setTimeout(() => setActionMsg(null), 4000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-3 space-y-3">
            <div className="h-40 rounded-xl bg-white/[0.03] border border-white/5 animate-pulse" />
          </div>
          <div className="md:col-span-9 space-y-4">
            <div className="h-28 rounded-xl bg-white/[0.03] border border-white/5 animate-pulse" />
            <div className="h-64 rounded-xl bg-white/[0.03] border border-white/5 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!session || session.role !== "HOST") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[60vh]">
        <Building2 className="w-8 h-8 text-slate-500 mb-3" />
        <h1 className="font-display text-lg font-bold text-white mb-1">Host Authorization Required</h1>
        <p className="text-xs text-slate-400 mb-5 max-w-sm">
          Please authenticate with an approved Host account to access the organizer console.
        </p>
        <Link href="/login" className="px-4 py-2 rounded-lg bg-white text-black font-semibold text-xs">
          Host Sign In
        </Link>
      </div>
    );
  }

  const profile = hostInfo || session.hostProfile || {};
  const isApproved = profile.approvalStatus === "APPROVED";
  const isPending = profile.approvalStatus === "PENDING";

  const draftCount = hackathons.filter((h) => h.status === "DRAFT").length;
  const publishedCount = hackathons.filter((h) => h.status === "PUBLISHED").length;
  const totalTeams = hackathons.reduce((sum, h) => sum + (h._count?.teams ?? 0), 0);
  const pendingPaymentsCount = payments.filter((p) => p.status === "PENDING" && p.txnRef).length;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-white/[0.08] gap-4">
        <div className="space-y-1">
          <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <span>HackBridge</span><span>/</span>
            <span>Host Chapter</span><span>/</span>
            <span className="text-white">Management Console</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">
            {profile.orgName || "Host Organizer Console"}
          </h1>
          <p className="text-xs text-slate-400">
            Coordinator: {session.name} ({session.email}) · Type: {profile.type || "Collegiate"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium border ${
            isApproved
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
          }`}>
            STATUS: {profile.approvalStatus || "PENDING"}
          </span>
          <button
            onClick={loadData}
            className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-white transition-colors"
            title="Refresh console"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Pending Approval Notice */}
      {isPending && (
        <div className="mb-8 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-3">
          <Clock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold">Super Admin Review Pending</span>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              New host chapters cannot publish hackathons until approved by the Super Admin governance panel.
              You may prepare draft hackathon tracks in the interim.
            </p>
          </div>
        </div>
      )}

      {/* Action Message */}
      {actionMsg && (
        <div className={`mb-6 p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
          actionMsg.startsWith("Error")
            ? "bg-red-500/10 border-red-500/20 text-red-300"
            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
        }`}>
          {actionMsg.startsWith("Error") ? (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Published", value: publishedCount, color: "text-emerald-400" },
          { label: "Drafts", value: draftCount, color: "text-slate-300" },
          { label: "Total Squads", value: totalTeams, color: "text-[#6366F1]" },
          { label: "Pending Payments", value: pendingPaymentsCount, color: "text-amber-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="p-4 rounded-xl bg-[#0B0E18] border border-white/[0.08] text-center">
            <div className={`text-2xl font-bold font-display ${color}`}>{value}</div>
            <div className="text-[10px] font-mono text-slate-500 uppercase mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Sidebar Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Sidebar */}
        <aside className="md:col-span-3 space-y-4">
          <nav className="p-2 rounded-xl bg-[#0B0E18] border border-white/[0.08] space-y-1 text-xs font-mono">
            <button
              onClick={() => setActiveTab("hackathons")}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                activeTab === "hackathons"
                  ? "bg-white text-black font-bold"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-3.5 h-3.5" />
                <span>Hackathon Tracks</span>
              </div>
              <span className="text-[10px] opacity-70">{hackathons.length}</span>
            </button>

            <button
              onClick={() => setActiveTab("payments")}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                activeTab === "payments"
                  ? "bg-white text-black font-bold"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-3.5 h-3.5" />
                <span>Payment Queue</span>
              </div>
              {pendingPaymentsCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  activeTab === "payments" ? "bg-black text-white" : "bg-amber-500 text-black"
                }`}>
                  {pendingPaymentsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("judges")}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2.5 ${
                activeTab === "judges"
                  ? "bg-white text-black font-bold"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Judge Panel</span>
            </button>
          </nav>

          <div className="p-4 rounded-xl bg-[#0B0E18] border border-white/[0.08] space-y-2 text-xs font-mono">
            <div className="text-[10px] uppercase text-slate-500 tracking-wider">Quick Actions</div>
            <Link
              href="/dashboard/host/create"
              className="w-full py-2 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-300 hover:text-white hover:border-white/20 transition-colors flex items-center gap-2 text-xs font-mono"
            >
              <Plus className="w-3.5 h-3.5" /> New Hackathon
            </Link>
            <Link
              href="/dashboard/host/payments"
              className="w-full py-2 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-300 hover:text-white hover:border-white/20 transition-colors flex items-center gap-2 text-xs font-mono"
            >
              <CreditCard className="w-3.5 h-3.5" /> Full Payment Queue
            </Link>
          </div>
        </aside>

        {/* Right Content */}
        <main className="md:col-span-9 space-y-6">
          {/* Hackathons Tab */}
          {activeTab === "hackathons" && (
            <div className="bg-[#0B0E18] border border-white/[0.08] rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight">Managed Hackathon Tracks</h2>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {hackathons.length} total track{hackathons.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <Link
                  href="/dashboard/host/create"
                  className="px-3 py-1.5 rounded-lg bg-white text-black font-semibold text-xs flex items-center gap-1.5 transition-colors hover:bg-slate-200"
                >
                  <Plus className="w-3.5 h-3.5" /> New Track
                </Link>
              </div>

              {hackathons.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">No hackathon tracks created yet.</p>
                  <Link
                    href="/dashboard/host/create"
                    className="inline-flex items-center gap-1.5 text-xs text-[#6366F1] hover:underline"
                  >
                    Launch the Hackathon Builder Wizard →
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-slate-500 uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-4 font-medium">Track Title</th>
                        <th className="py-2.5 px-4 font-medium">Status</th>
                        <th className="py-2.5 px-4 font-medium">Domains</th>
                        <th className="py-2.5 px-4 font-medium">Squads</th>
                        <th className="py-2.5 px-4 font-medium">Fee</th>
                        <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {hackathons.map((h) => (
                        <tr key={h.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 font-bold text-white">
                            <div className="flex items-center gap-2">
                              <span>{h.title}</span>
                              {h.status === "PUBLISHED" && (
                                <Link
                                  href={`/hackathons/${h.slug}`}
                                  target="_blank"
                                  className="text-slate-500 hover:text-white"
                                  title="View Public Listing"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </Link>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-normal">
                              {new Date(h.startAt).toLocaleDateString()} – {new Date(h.endAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] border font-semibold ${STATUS_COLORS[h.status] || "bg-white/5 text-slate-400"}`}>
                              {h.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {h.domains?.length ?? 0}
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {h._count?.teams ?? 0}
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {h.fee === 0 || h.paymentMode === "FREE" ? "Free" : `₹${h.fee}`}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {h.status === "DRAFT" && (
                                <button
                                  onClick={() => handlePublish(h.id)}
                                  disabled={publishing === h.id || !isApproved}
                                  className="px-2.5 py-1 rounded bg-white text-black font-semibold text-[10px] hover:bg-slate-200 transition-colors disabled:opacity-30 flex items-center gap-1"
                                  title={!isApproved ? "Super Admin approval required to publish" : "Publish to live platform"}
                                >
                                  {publishing === h.id ? (
                                    <span className="animate-spin">⌛</span>
                                  ) : (
                                    <Rocket className="w-3 h-3" />
                                  )}
                                  Publish
                                </button>
                              )}

                              {h.status === "PUBLISHED" && (
                                <div className="flex items-center gap-1.5">
                                  <Link
                                    href={`/dashboard/host/arena/${h.id}`}
                                    className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-semibold text-[10px] transition-colors flex items-center gap-1"
                                  >
                                    Arena Command
                                  </Link>
                                  <span className="text-emerald-400 text-[10px] flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Live
                                  </span>
                                </div>
                              )}

                              {h.status === "ARCHIVED" && (
                                <span className="text-slate-500 text-[10px] flex items-center gap-1">
                                  <Archive className="w-3 h-3" /> Archived
                                </span>
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

          {/* Payments Tab */}
          {activeTab === "payments" && (
            <div className="bg-[#0B0E18] border border-white/[0.08] rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight">Payment Review Queue</h2>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    PRD Rule 3: Official Team ID (TEAM-XXXXXX) is generated only upon verified payment.
                  </p>
                </div>
                <Link
                  href="/dashboard/host/payments"
                  className="text-xs font-mono text-[#6366F1] hover:underline flex items-center gap-1"
                >
                  Full View →
                </Link>
              </div>

              {payments.length === 0 ? (
                <div className="p-12 text-center text-xs font-mono text-slate-500">
                  No payment records yet across your hackathons.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-slate-500 uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-4 font-medium">Squad</th>
                        <th className="py-2.5 px-4 font-medium">Track</th>
                        <th className="py-2.5 px-4 font-medium">Amount</th>
                        <th className="py-2.5 px-4 font-medium">UTR Reference</th>
                        <th className="py-2.5 px-4 font-medium">Status / Team ID</th>
                        <th className="py-2.5 px-4 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 font-bold text-white">
                            <div>{p.team.name}</div>
                            <div className="text-[10px] text-slate-500 font-normal">
                              {p.team.leadStudent.user.email}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {p.team.hackathon.title}
                          </td>
                          <td className="py-3 px-4 text-white font-bold">
                            ₹{p.amount}
                          </td>
                          <td className="py-3 px-4">
                            {p.txnRef ? (
                              <span className="font-bold text-white bg-white/5 px-2 py-0.5 rounded border border-white/10 select-all text-[11px]">
                                {p.txnRef}
                              </span>
                            ) : (
                              <span className="text-slate-600 text-[10px]">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {p.status === "VERIFIED" ? (
                              <div className="space-y-0.5">
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  VERIFIED
                                </span>
                                {p.team.teamId && (
                                  <div className="text-[10px] font-bold text-white">
                                    {p.team.teamId}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                {p.status}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {p.status === "PENDING" && (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handlePaymentDecision(p.id, "APPROVE")}
                                  className="px-2 py-1 rounded bg-white text-black font-semibold text-[10px] hover:bg-slate-200 transition-colors flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" /> Approve
                                </button>
                                <button
                                  onClick={() => handlePaymentDecision(p.id, "REJECT")}
                                  className="px-2 py-1 rounded bg-white/5 text-slate-400 hover:text-red-400 text-[10px] transition-colors"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Judges Tab */}
          {activeTab === "judges" && (
            <div className="bg-[#0B0E18] border border-white/[0.08] rounded-2xl p-6 space-y-4">
              <h2 className="text-sm font-bold text-white tracking-tight">
                Judge Evaluation Panel Management
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Incoming judge applications bound to your hackathon require host confirmation before
                scores can be logged. Judge approval is implemented in Phase 5.
              </p>
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs font-mono text-slate-400">
                No pending judge applications. Judge signup requires a valid hackathon ID.
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
