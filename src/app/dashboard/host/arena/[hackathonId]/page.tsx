"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  Users,
  Layers,
  TrendingUp,
  FileCheck,
  Lock,
  Unlock,
  ExternalLink,
  Check,
  AlertCircle,
  Clock,
  ShieldCheck,
  Building2
} from "lucide-react";

interface TeamRow {
  id: string;
  teamId: string | null;
  name: string;
  status: string;
  leadStudent: { user: { name: string; email: string } };
  members: Array<{ student: { hackathonId: string; user: { name: string } } }>;
  problemStatement?: { id: string; title: string } | null;
  progressUpdates: Array<{ percent: number; note: string; createdAt: string }>;
  submission?: {
    id: string;
    link?: string | null;
    fileUrl?: string | null;
    description: string;
    locked: boolean;
    submittedAt: string;
    unlockReason?: string | null;
  } | null;
}

export default function HostArenaCommandCenter() {
  const params = useParams();
  const hackathonId = params?.hackathonId as string;

  const [session, setSession] = useState<any>(null);
  const [hackathon, setHackathon] = useState<any>(null);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "progress" | "submissions">("overview");

  // Unlock modal states
  const [unlockModal, setUnlockModal] = useState<string | null>(null); // submissionId
  const [unlockReason, setUnlockReason] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!hackathonId) return;
    try {
      const [hRes, teamsRes, psRes] = await Promise.all([
        fetch(`/api/v1/hackathons/${hackathonId}`),
        fetch(`/api/v1/teams?hackathonId=${hackathonId}`),
        fetch(`/api/v1/hackathons/${hackathonId}/problem-statements`),
      ]);

      if (hRes.ok) {
        const d = await hRes.json();
        setHackathon(d.hackathon);
      }

      if (teamsRes.ok) {
        const d = await teamsRes.json();
        setTeams(d.teams || []);
      }

      if (psRes.ok) {
        const d = await psRes.json();
        setDomains(d.domains || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [hackathonId]);

  useEffect(() => {
    fetch("/api/v1/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user) setSession(d.user);
      })
      .catch(() => {});

    loadData();
  }, [loadData]);

  // Handle Unlock Submission (PRD Rule 7)
  const handleUnlockSubmission = async () => {
    if (!unlockModal || !unlockReason.trim()) return;

    setUnlocking(true);
    setActionErr(null);
    setActionMsg(null);

    try {
      const res = await fetch(`/api/v1/host/submissions/${unlockModal}/unlock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unlockReason: unlockReason.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionErr(data.error || "Failed to unlock submission");
        return;
      }

      setActionMsg(data.message);
      setUnlockModal(null);
      setUnlockReason("");
      loadData();
      setTimeout(() => setActionMsg(null), 4000);
    } catch {
      setActionErr("Network error unlocking submission");
    } finally {
      setUnlocking(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-16">
        <div className="h-64 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse" />
      </div>
    );
  }

  if (!session || (session.role !== "HOST" && session.role !== "SUPER_ADMIN")) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center font-mono">
        <ShieldCheck className="w-8 h-8 text-slate-500 mx-auto mb-3" />
        <h1 className="text-lg font-bold text-white mb-2">Host Access Required</h1>
        <Link href="/login" className="text-xs text-[#6366F1] underline">
          Host Sign In
        </Link>
      </div>
    );
  }

  const activeTeams = teams.filter((t) => t.status === "ACTIVE" || t.status === "SUBMITTED");
  const submittedTeams = teams.filter((t) => t.submission);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full space-y-8">
      {/* Top Header */}
      <div>
        <Link
          href="/dashboard/host"
          className="text-xs font-mono text-slate-500 hover:text-white flex items-center gap-1.5 transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Host Console
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div className="space-y-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] border border-white/10 text-slate-400 uppercase">
              Phase 4 · Live Arena Command Center
            </span>
            <h1 className="font-display text-2xl font-bold text-white tracking-tight">
              {hackathon?.title || "Hackathon Arena"}
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Live Monitoring & Moderation · {activeTeams.length} Verified Squads
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/host/leaderboard/${hackathonId}`}
              className="px-3 py-1.5 rounded-lg bg-white text-black font-bold text-xs hover:bg-slate-200 transition-colors flex items-center gap-1.5"
            >
              Leaderboard & Results →
            </Link>
            <button
              onClick={loadData}
              className="p-2 rounded-lg bg-white/[0.04] border border-white/10 text-slate-400 hover:text-white transition-colors"
              title="Refresh Arena"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <span className="px-2.5 py-1 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
              TRACK: LIVE
            </span>
          </div>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}

      {actionErr && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-mono text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionErr}</span>
        </div>
      )}

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: "Verified Squads", value: activeTeams.length, color: "text-white" },
          { label: "Selected Statements", value: teams.filter((t) => t.problemStatement).length, color: "text-[#6366F1]" },
          { label: "Avg Progress", value: `${Math.round(teams.reduce((s, t) => s + (t.progressUpdates?.slice(-1)[0]?.percent || 0), 0) / (teams.length || 1))}%`, color: "text-emerald-400" },
          { label: "Final Submissions", value: submittedTeams.length, color: "text-amber-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="p-4 rounded-xl bg-[#0B0E18] border border-white/[0.08] text-center font-mono">
            <div className={`text-2xl font-bold font-display ${color}`}>{value}</div>
            <div className="text-[10px] text-slate-500 uppercase mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Sidebar */}
        <aside className="md:col-span-3 space-y-4 font-mono text-xs">
          <nav className="p-2 rounded-xl bg-[#0B0E18] border border-white/[0.08] space-y-1">
            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                activeTab === "overview"
                  ? "bg-white text-black font-bold"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5" />
                <span>Problem Allocation</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("progress")}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                activeTab === "progress"
                  ? "bg-white text-black font-bold"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Squad Progress Matrix</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("submissions")}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                activeTab === "submissions"
                  ? "bg-white text-black font-bold"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2">
                <FileCheck className="w-3.5 h-3.5" />
                <span>Submissions & Locks</span>
              </div>
              <span className="text-[10px] opacity-70">{submittedTeams.length}</span>
            </button>
          </nav>
        </aside>

        {/* Right Content */}
        <main className="md:col-span-9 space-y-6">
          {/* TAB 1: PROBLEM ALLOCATION BREAKDOWN */}
          {activeTab === "overview" && (
            <div className="bg-[#0B0E18] border border-white/[0.08] rounded-2xl p-6 space-y-6 font-mono">
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">
                  Balanced Problem Statement Allocation
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  PRD Non-Negotiable Rule 4: Cap per statement = Ceil(totalTeams / totalStatements).
                </p>
              </div>

              <div className="space-y-4">
                {domains.map((d) => (
                  <div key={d.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                    <div className="text-xs font-bold text-white flex items-center justify-between">
                      <span>Domain: {d.name}</span>
                      <span className="text-[10px] text-slate-400">
                        {d.isRevealed ? "Unlocked" : `Unlocks in ${d.secondsUntilReveal}s`}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                      {d.problemStatements.map((ps: any) => (
                        <div
                          key={ps.id}
                          className="p-3 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-white">{ps.title}</div>
                            <div className="text-[10px] text-slate-500">
                              Assigned: {ps.assignedCount} squads
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              ps.isFull
                                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            }`}>
                              {ps.isFull ? "CAP FULL" : `${ps.slotsRemaining} SLOTS LEFT`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: SQUAD PROGRESS MATRIX */}
          {activeTab === "progress" && (
            <div className="bg-[#0B0E18] border border-white/[0.08] rounded-2xl overflow-hidden font-mono text-xs">
              <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white">Squad Progress Matrix</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    PRD FR-7: Progress in 10% steps, timestamped. Visible to hosts & judges only.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-slate-500 uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-4 font-medium">Team ID & Squad</th>
                      <th className="py-2.5 px-4 font-medium">Problem Statement</th>
                      <th className="py-2.5 px-4 font-medium">Progress Bar</th>
                      <th className="py-2.5 px-4 font-medium">Latest Milestone Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {teams.map((t) => {
                      const latest = t.progressUpdates?.slice(-1)[0];
                      const pct = latest?.percent || 0;

                      return (
                        <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 font-bold text-white">
                            <div>{t.name}</div>
                            <div className="text-[10px] text-emerald-400 font-normal">
                              {t.teamId || "Pending ID"}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {t.problemStatement?.title || "Not selected yet"}
                          </td>
                          <td className="py-3 px-4">
                            <div className="w-28 space-y-1">
                              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/10">
                                <div
                                  className="bg-[#6366F1] h-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-slate-400">{pct}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            {latest?.note || "Awaiting first 10% update"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: SUBMISSIONS & LOCKS */}
          {activeTab === "submissions" && (
            <div className="bg-[#0B0E18] border border-white/[0.08] rounded-2xl overflow-hidden font-mono text-xs">
              <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white">Submissions & Governance</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    PRD Rule 7: Final submission is immutable; host can unlock with mandatory audit reason.
                  </p>
                </div>
              </div>

              {submittedTeams.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  No squad has finalized submission yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-slate-500 uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-4 font-medium">Squad & Team ID</th>
                        <th className="py-2.5 px-4 font-medium">Demo Link</th>
                        <th className="py-2.5 px-4 font-medium">Submitted At</th>
                        <th className="py-2.5 px-4 font-medium">Lock Status</th>
                        <th className="py-2.5 px-4 font-medium text-right">Moderation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {submittedTeams.map((t) => (
                        <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 font-bold text-white">
                            <div>{t.name}</div>
                            <div className="text-[10px] text-emerald-400 font-normal">
                              {t.teamId}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {t.submission?.link ? (
                              <a
                                href={t.submission.link}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#6366F1] hover:underline flex items-center gap-1"
                              >
                                View Demo <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[10px]">
                            {t.submission?.submittedAt
                              ? new Date(t.submission.submittedAt).toLocaleTimeString()
                              : "—"}
                          </td>
                          <td className="py-3 px-4">
                            {t.submission?.locked ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 w-fit">
                                <Lock className="w-2.5 h-2.5" /> LOCKED
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-fit">
                                <Unlock className="w-2.5 h-2.5" /> UNLOCKED
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {t.submission?.locked ? (
                              <button
                                onClick={() => setUnlockModal(t.submission!.id)}
                                className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-semibold text-[10px] transition-colors"
                              >
                                Unlock for Revision
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-500">
                                Unlocked: {t.submission?.unlockReason || "Host authorized"}
                              </span>
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

      {/* Unlock Submission Modal with Audit Reason (PRD Rule 7 & 10) */}
      {unlockModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B0E18] border border-white/20 rounded-2xl p-6 max-w-md w-full space-y-4 font-mono text-xs">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
              <Unlock className="w-5 h-5" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-white">Unlock Submission for Revision</h3>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                PRD Rule 7 & 10: Unlocking an immutable submission is permanently recorded in the immutable audit log with your host actor ID, timestamp, and explanation.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-300 block">
                Reason for Unlocking <span className="text-red-400">*</span>
              </label>
              <textarea
                required
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                placeholder="e.g., Authorized resubmission due to broken demo link reported to helpdesk..."
                rows={3}
                className="w-full px-3 py-2 text-xs bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-white/30"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setUnlockModal(null);
                  setUnlockReason("");
                }}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUnlockSubmission}
                disabled={unlocking || !unlockReason.trim()}
                className="flex-1 py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-slate-200 transition-colors disabled:opacity-40"
              >
                {unlocking ? "Unlocking..." : "Confirm & Unlock"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
