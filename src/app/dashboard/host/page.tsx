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
  rejectionReason?: string | null;
  hackId?: string | null;
  city?: string | null;
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

interface JudgeRow {
  id: string;
  designation?: string | null;
  company?: string | null;
  approvalStatus: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  hackathon: {
    id: string;
    title: string;
    slug: string;
  };
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-white/[0.04] text-[#94A3B8] border-white/[0.08]",
  PUBLISHED: "bg-[#6366F1]/20 text-[#818CF8] border-[#6366F1]/40 font-bold",
  ARCHIVED: "bg-amber-500/10 text-amber-300 border-amber-500/30 font-bold",
};

const JUDGE_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-300 border-amber-500/30 font-bold",
  APPROVED: "bg-[#6366F1]/20 text-[#818CF8] border-[#6366F1]/40 font-bold",
  REJECTED: "bg-rose-500/10 text-rose-300 border-rose-500/30 font-bold",
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

  // Judges panel states
  const [judges, setJudges] = useState<JudgeRow[]>([]);

  const loadData = useCallback(async () => {
    const [meRes, hacksRes, paymentsRes, judgesRes] = await Promise.all([
      fetch("/api/v1/auth/me"),
      fetch("/api/v1/host/hackathons"),
      fetch("/api/v1/host/payments"),
      fetch("/api/v1/host/judges"),
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

    if (judgesRes.ok) {
      const d = await judgesRes.json();
      setJudges(d.judges || []);
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

  const handleJudgeDecision = async (judgeId: string, action: "APPROVE" | "REJECT") => {
    try {
      const res = await fetch(`/api/v1/host/judges/${judgeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMsg(data.message || `Judge ${action === "APPROVE" ? "approved" : "rejected"} successfully.`);
        loadData();
      } else {
        setActionMsg(`Error: ${data.error}`);
      }
    } catch {
      setActionMsg("Failed to update judge status");
    } finally {
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
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full bg-transparent">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-3 space-y-3">
            <div className="h-40 rounded-2xl bg-[#0B0E18]/70 border border-white/[0.08] animate-pulse" />
          </div>
          <div className="md:col-span-9 space-y-4">
            <div className="h-28 rounded-2xl bg-[#0B0E18]/70 border border-white/[0.08] animate-pulse" />
            <div className="h-64 rounded-2xl bg-[#0B0E18]/70 border border-white/[0.08] animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!session || session.role !== "HOST") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[60vh] bg-transparent">
        <div className="w-12 h-12 rounded-xl bg-[#0B0E18]/70 border border-white/[0.08] shadow-sm flex items-center justify-center mb-4">
          <Building2 className="w-6 h-6 text-[#6366F1]" />
        </div>
        <h1 className="font-display text-xl font-extrabold text-[#F8FAFC] mb-2 tracking-tight">Host Authorization Required</h1>
        <p className="text-sm text-[#94A3B8] mb-6 max-w-sm">
          Please authenticate with an approved Host account to access the organizer console.
        </p>
        <Link href="/login" className="px-5 py-2.5 rounded-xl bg-[#6366F1] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#4F46E5] shadow-sm transition-all">
          Host Sign In
        </Link>
      </div>
    );
  }

  const profile = hostInfo || session.hostProfile || {};
  const isApproved = profile.approvalStatus === "APPROVED";
  const isPending = profile.approvalStatus === "PENDING";
  const isRejected = profile.approvalStatus === "REJECTED";

  if (isRejected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 min-h-[70vh] bg-transparent text-[#F8FAFC]">
        <div className="max-w-lg w-full p-8 sm:p-10 rounded-3xl bg-[#0B0E18]/70 backdrop-blur-md border border-red-500/30 shadow-2xl space-y-6 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-[11px] font-mono text-red-400 font-bold">
              <span>APPLICATION STATUS: REJECTED</span>
            </div>
            <h1 className="font-display text-2xl font-extrabold text-[#F8FAFC]">
              Host Application Rejected
            </h1>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Your institutional host registration for <strong className="text-white">{profile.orgName}</strong> did not pass Super Admin verification.
            </p>
          </div>

          {/* Rejection Reason Card */}
          <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 text-left space-y-1.5 font-mono">
            <span className="text-[10px] uppercase text-red-400 font-bold tracking-wider">
              Rejection Reason Provided by Super Admin:
            </span>
            <p className="text-xs text-red-200 leading-relaxed">
              {profile.rejectionReason || "Verification documentation failed institutional compliance check or accreditation criteria was incomplete."}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs font-mono text-[#94A3B8] text-left space-y-1">
            <div>Organisation: <span className="text-white font-bold">{profile.orgName}</span></div>
            <div>Identifier: <span className="text-[#818CF8] font-bold">{profile.hackId || session.hackathonId || "N/A"}</span></div>
            <div>Representative: <span className="text-white">{session.name} ({session.email})</span></div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/register/college"
              className="w-full sm:w-1/2 py-3 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold text-xs uppercase tracking-wider transition-colors text-center"
            >
              Re-apply as College
            </Link>
            <Link
              href="/register/company"
              className="w-full sm:w-1/2 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white font-semibold text-xs uppercase tracking-wider transition-colors text-center"
            >
              Re-apply as Company
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const draftCount = hackathons.filter((h) => h.status === "DRAFT").length;
  const publishedCount = hackathons.filter((h) => h.status === "PUBLISHED").length;
  const totalTeams = hackathons.reduce((sum, h) => sum + (h._count?.teams ?? 0), 0);
  const pendingPaymentsCount = payments.filter((p) => p.status === "PENDING" && p.txnRef).length;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full bg-transparent">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-white/[0.08] gap-4">
        <div className="space-y-1">
          <div className="text-[11px] font-mono text-[#64748B] uppercase tracking-wider flex items-center gap-2">
            <span>HackBridge</span><span>/</span>
            <span>Host Chapter</span><span>/</span>
            <span className="text-[#6366F1] font-bold">Management Console</span>
          </div>
          <h1 className="font-display text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
            {profile.orgName || "Host Organizer Console"}
          </h1>
          <p className="text-sm text-[#94A3B8]">
            Coordinator: {session.name} ({session.email}) · Type: {profile.type || "Collegiate"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-[11px] font-mono font-extrabold border ${
            isApproved
              ? "bg-[#6366F1]/20 text-[#818CF8] border-[#6366F1]/40"
              : "bg-amber-500/10 text-amber-300 border-amber-500/30"
          }`}>
            STATUS: {profile.approvalStatus || "PENDING"}
          </span>
          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-[#0B0E18]/70 border border-white/[0.08] shadow-sm text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#111524] transition-colors"
            title="Refresh console"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pending Approval Notice */}
      {isPending && (
        <div className="mb-8 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-3 shadow-sm">
          <Clock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-extrabold text-amber-300">Super Admin Review Pending</span>
            <p className="text-amber-200/80 leading-relaxed text-[11px]">
              New host chapters cannot publish hackathons until approved by the Super Admin governance panel.
              You may prepare draft hackathon tracks in the interim.
            </p>
          </div>
        </div>
      )}

      {/* Action Message */}
      {actionMsg && (
        <div className={`mb-6 p-3.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 shadow-sm ${
          actionMsg.startsWith("Error")
            ? "bg-red-500/10 border-red-500/20 text-red-400"
            : "bg-[#6366F1]/10 border-[#6366F1]/30 text-[#818CF8]"
        }`}>
          {actionMsg.startsWith("Error") ? (
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#6366F1]" />
          )}
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Published", value: publishedCount, color: "text-[#F8FAFC]" },
          { label: "Drafts", value: draftCount, color: "text-[#94A3B8]" },
          { label: "Total Squads", value: totalTeams, color: "text-[#6366F1]" },
          { label: "Pending Payments", value: pendingPaymentsCount, color: "text-amber-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="p-4 rounded-2xl bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] shadow-sm text-center">
            <div className={`text-2xl font-extrabold font-display ${color}`}>{value}</div>
            <div className="text-[10px] font-mono text-[#64748B] uppercase font-bold mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Sidebar Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Sidebar */}
        <aside className="md:col-span-3 space-y-4">
          <nav className="p-2 rounded-2xl bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] shadow-sm space-y-1 text-xs font-mono">
            <button
              onClick={() => setActiveTab("hackathons")}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center justify-between ${
                activeTab === "hackathons"
                  ? "bg-[#6366F1] text-white font-bold shadow-sm"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4" />
                <span>Hackathon Tracks</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${activeTab === "hackathons" ? "bg-white/20 text-white" : "bg-white/[0.06] text-[#94A3B8]"}`}>{hackathons.length}</span>
            </button>

            <button
              onClick={() => setActiveTab("payments")}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center justify-between ${
                activeTab === "payments"
                  ? "bg-[#6366F1] text-white font-bold shadow-sm"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4" />
                <span>Payment Queue</span>
              </div>
              {pendingPaymentsCount > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  activeTab === "payments" ? "bg-white text-[#6366F1]" : "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                }`}>
                  {pendingPaymentsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("judges")}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-2.5 ${
                activeTab === "judges"
                  ? "bg-[#6366F1] text-white font-bold shadow-sm"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Judge Panel</span>
            </button>
          </nav>

          <div className="p-4 rounded-2xl bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] shadow-sm space-y-2 text-xs font-mono">
            <div className="text-[10px] uppercase text-[#64748B] tracking-wider font-bold">Quick Actions</div>
            <Link
              href="/dashboard/host/create"
              className="w-full py-2.5 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#F8FAFC] hover:bg-[#6366F1] hover:text-white hover:border-[#6366F1] transition-all flex items-center gap-2 text-xs font-mono font-bold shadow-sm"
            >
              <Plus className="w-4 h-4 text-[#6366F1] group-hover:text-white" /> New Hackathon
            </Link>
            <Link
              href="/dashboard/host/payments"
              className="w-full py-2.5 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#F8FAFC] hover:bg-[#6366F1] hover:text-white hover:border-[#6366F1] transition-all flex items-center gap-2 text-xs font-mono font-bold shadow-sm"
            >
              <CreditCard className="w-4 h-4 text-[#6366F1] group-hover:text-white" /> Full Payment Queue
            </Link>
          </div>
        </aside>

        {/* Right Content */}
        <main className="md:col-span-9 space-y-6">
          {/* Hackathons Tab */}
          {activeTab === "hackathons" && (
            <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-[#F8FAFC] tracking-tight">Managed Hackathon Tracks</h2>
                  <p className="text-xs text-[#64748B] font-mono mt-0.5">
                    {hackathons.length} total track{hackathons.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <Link
                  href="/dashboard/host/create"
                  className="px-3.5 py-2 rounded-xl bg-[#6366F1] text-white font-bold text-xs flex items-center gap-1.5 transition-all hover:bg-[#4F46E5] shadow-sm font-mono uppercase tracking-wider"
                >
                  <Plus className="w-4 h-4" /> New Track
                </Link>
              </div>

              {hackathons.length === 0 ? (
                <div className="p-12 text-center space-y-3 font-mono">
                  <FileText className="w-8 h-8 text-[#64748B] mx-auto" />
                  <p className="text-xs text-[#94A3B8]">No hackathon tracks created yet.</p>
                  <Link
                    href="/dashboard/host/create"
                    className="inline-flex items-center gap-1.5 text-xs text-[#6366F1] font-bold hover:underline"
                  >
                    Launch the Hackathon Builder Wizard →
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/[0.08] bg-[#111524]/60 text-[#94A3B8] uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-4 font-bold">Track Title</th>
                        <th className="py-3 px-4 font-bold">Status</th>
                        <th className="py-3 px-4 font-bold">Domains</th>
                        <th className="py-3 px-4 font-bold">Squads</th>
                        <th className="py-3 px-4 font-bold">Fee</th>
                        <th className="py-3 px-4 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {hackathons.map((h) => (
                        <tr key={h.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4 font-bold text-[#F8FAFC]">
                            <div className="flex items-center gap-2">
                              <span>{h.title}</span>
                              {h.status === "PUBLISHED" && (
                                <Link
                                  href={`/hackathons/${h.slug}`}
                                  target="_blank"
                                  className="text-[#64748B] hover:text-[#6366F1]"
                                  title="View Public Listing"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Link>
                              )}
                            </div>
                            <div className="text-[11px] text-[#64748B] font-normal">
                              {new Date(h.startAt).toLocaleDateString()} – {new Date(h.endAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] border font-extrabold ${STATUS_COLORS[h.status] || "bg-white/[0.04] text-[#94A3B8]"}`}>
                              {h.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-[#94A3B8] font-semibold">
                            {h.domains?.length ?? 0}
                          </td>
                          <td className="py-3.5 px-4 text-[#94A3B8] font-semibold">
                            {h._count?.teams ?? 0}
                          </td>
                          <td className="py-3.5 px-4 text-[#94A3B8] font-semibold">
                            {h.fee === 0 || h.paymentMode === "FREE" ? "Free" : `₹${h.fee}`}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {h.status === "DRAFT" && (
                                <button
                                  onClick={() => handlePublish(h.id)}
                                  disabled={publishing === h.id || !isApproved}
                                  className="px-3 py-1.5 rounded-xl bg-[#6366F1] text-white font-bold text-[10px] hover:bg-[#4F46E5] shadow-sm transition-all disabled:opacity-40 flex items-center gap-1 font-mono uppercase tracking-wider"
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
                                    className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-[#6366F1] hover:text-white border border-white/[0.08] text-[#F8FAFC] font-bold text-[10px] transition-all flex items-center gap-1 shadow-sm font-mono"
                                  >
                                    Arena Command
                                  </Link>
                                  <span className="text-[#818CF8] font-bold text-[10px] flex items-center gap-1 bg-[#6366F1]/20 px-2 py-0.5 rounded-full border border-[#6366F1]/30">
                                    <CheckCircle2 className="w-3 h-3 text-[#6366F1]" /> Live
                                  </span>
                                </div>
                              )}

                              {h.status === "ARCHIVED" && (
                                <span className="text-[#64748B] text-[10px] flex items-center gap-1">
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
            <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-[#F8FAFC] tracking-tight">Payment Review Queue</h2>
                  <p className="text-xs text-[#64748B] font-mono mt-0.5">
                    PRD Rule 3: Official Team ID (TEAM-XXXXXX) is generated only upon verified payment.
                  </p>
                </div>
                <Link
                  href="/dashboard/host/payments"
                  className="text-xs font-mono font-bold text-[#6366F1] hover:underline flex items-center gap-1"
                >
                  Full View →
                </Link>
              </div>

              {payments.length === 0 ? (
                <div className="p-12 text-center text-xs font-mono text-[#64748B]">
                  No payment records yet across your hackathons.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/[0.08] bg-[#111524]/60 text-[#94A3B8] uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-4 font-bold">Squad</th>
                        <th className="py-3 px-4 font-bold">Track</th>
                        <th className="py-3 px-4 font-bold">Amount</th>
                        <th className="py-3 px-4 font-bold">UTR Reference</th>
                        <th className="py-3 px-4 font-bold">Status / Team ID</th>
                        <th className="py-3 px-4 font-bold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4 font-bold text-[#F8FAFC]">
                            <div>{p.team.name}</div>
                            <div className="text-[10px] text-[#64748B] font-normal">
                              {p.team.leadStudent.user.email}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-[#94A3B8]">
                            {p.team.hackathon.title}
                          </td>
                          <td className="py-3.5 px-4 text-[#F8FAFC] font-extrabold">
                            ₹{p.amount}
                          </td>
                          <td className="py-3.5 px-4">
                            {p.txnRef ? (
                              <span className="font-bold text-[#F8FAFC] bg-[#111524]/80 px-2 py-0.5 rounded border border-white/[0.08] select-all text-[11px]">
                                {p.txnRef}
                              </span>
                            ) : (
                              <span className="text-[#64748B] text-[10px]">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {p.status === "VERIFIED" ? (
                              <div className="space-y-0.5">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/40">
                                  VERIFIED
                                </span>
                                {p.team.teamId && (
                                  <div className="text-[11px] font-extrabold text-[#6366F1]">
                                    {p.team.teamId}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                                {p.status}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {p.status === "PENDING" && (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handlePaymentDecision(p.id, "APPROVE")}
                                  className="px-2.5 py-1 rounded-lg bg-[#6366F1] text-white font-bold text-[10px] hover:bg-[#4F46E5] shadow-sm transition-all flex items-center gap-1 font-mono uppercase"
                                >
                                  <Check className="w-3 h-3" /> Approve
                                </button>
                                <button
                                  onClick={() => handlePaymentDecision(p.id, "REJECT")}
                                  className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[#94A3B8] hover:text-red-400 text-[10px] font-bold transition-colors font-mono uppercase"
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
            <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-[#F8FAFC] tracking-tight">
                    Judge Evaluation Panel Management
                  </h2>
                  <p className="text-xs text-[#64748B] font-mono mt-0.5">
                    PRD Rule 5: Judges must provide a valid Hackathon ID and receive host confirmation before scoring submissions.
                  </p>
                </div>
                <div className="text-xs font-mono text-[#94A3B8]">
                  Total Evaluators: <span className="text-[#F8FAFC] font-extrabold">{judges.length}</span>
                </div>
              </div>

              {judges.length === 0 ? (
                <div className="p-12 text-center text-xs font-mono text-[#64748B] space-y-2">
                  <div>No judge applications received yet for your hackathons.</div>
                  <div className="text-xs text-[#64748B]">
                    Judges can register at <Link href="/signup/judge" className="text-[#6366F1] font-bold hover:underline">/signup/judge</Link> by entering your Hackathon ID.
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/[0.08] bg-[#111524]/60 text-[#94A3B8] uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-4 font-bold">Judge Name</th>
                        <th className="py-3 px-4 font-bold">Organization / Designation</th>
                        <th className="py-3 px-4 font-bold">Applied Hackathon</th>
                        <th className="py-3 px-4 font-bold">Approval Status</th>
                        <th className="py-3 px-4 font-bold text-right">Decision</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {judges.map((j) => (
                        <tr key={j.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4 font-bold text-[#F8FAFC]">
                            <div>{j.user.name}</div>
                            <div className="text-[10px] text-[#64748B] font-normal">
                              {j.user.email}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-[#94A3B8]">
                            <div>{j.company || "Independent Evaluator"}</div>
                            <div className="text-[10px] text-[#64748B]">
                              {j.designation || "Senior Technical Judge"}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-[#F8FAFC]">
                            <Link
                              href={`/hackathons/${j.hackathon.slug}`}
                              className="hover:text-[#6366F1] font-semibold transition-colors flex items-center gap-1"
                            >
                              {j.hackathon.title}
                              <ExternalLink className="w-3 h-3 text-[#64748B]" />
                            </Link>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] border font-extrabold ${
                                JUDGE_STATUS_COLORS[j.approvalStatus] || "bg-white/[0.04] text-[#94A3B8]"
                              }`}
                            >
                              {j.approvalStatus}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {j.approvalStatus === "PENDING" ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleJudgeDecision(j.id, "APPROVE")}
                                  className="px-2.5 py-1 rounded-lg bg-[#6366F1] text-white font-bold text-[10px] hover:bg-[#4F46E5] shadow-sm transition-all flex items-center gap-1 font-mono uppercase"
                                >
                                  <Check className="w-3 h-3" /> Approve
                                </button>
                                <button
                                  onClick={() => handleJudgeDecision(j.id, "REJECT")}
                                  className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[#94A3B8] hover:text-red-400 text-[10px] font-bold transition-colors font-mono uppercase"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-2 text-[10px] text-[#64748B] font-mono">
                                {j.approvalStatus === "APPROVED" ? (
                                  <button
                                    onClick={() => handleJudgeDecision(j.id, "REJECT")}
                                    className="text-[#94A3B8] hover:text-red-400 text-[10px] font-bold transition-colors underline"
                                  >
                                    Revoke
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleJudgeDecision(j.id, "APPROVE")}
                                    className="text-[#94A3B8] hover:text-[#818CF8] text-[10px] font-bold transition-colors underline"
                                  >
                                    Re-approve
                                  </button>
                                )}
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
        </main>
      </div>
    </div>
  );
}
