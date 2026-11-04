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
  Building2,
  Edit2,
  Download,
  FileText,
  FileArchive,
  Code2,
  GitFork,
  Globe,
  CheckSquare,
  Copy,
  CheckCircle2,
  Trophy,
  X,
  FileCode,
  Award,
} from "lucide-react";

interface TeamRow {
  id: string;
  teamId: string | null;
  name: string;
  status: string;
  leadStudent: { user: { name: string; email: string }; college?: string | null };
  members: Array<{ student: { hackathonId: string; user: { name: string; email?: string }; college?: string | null } }>;
  domain?: { id: string; name: string } | null;
  domainId?: string | null;
  problemStatement?: { id: string; title: string; code?: string | null } | null;
  progressUpdates: Array<{ percent: number; note: string; createdAt: string; studentName?: string | null }>;
  documentUploads?: Array<{
    id: string;
    stage: number;
    version: number;
    fileName: string;
    fileSize?: number;
    fileType?: string;
    fileUrl?: string;
    syncStatus: string;
    githubCommitHash?: string | null;
    createdAt: string;
    uploaderName: string;
  }>;
  codeRepo?: {
    githubRepoUrl?: string | null;
    forkedRepoUrl?: string | null;
    liveDemoUrl?: string | null;
    syncStatus?: string | null;
    updatedAt?: string;
  } | null;
  submission?: {
    id: string;
    link?: string | null;
    fileUrl?: string | null;
    description: string;
    locked: boolean;
    submittedAt: string;
    unlockReason?: string | null;
    scores?: Array<{ id: string; score: number; isDraft: boolean; notes?: string | null }>;
  } | null;
  result?: {
    id: string;
    rank: number;
    award: string;
    prize?: string | null;
    publishedAt: string;
  } | null;
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "0 KB";
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function getTeamArtifactStats(t: TeamRow) {
  const uploads = t.documentUploads || [];
  const fileCount = uploads.length + (t.submission?.fileUrl ? 1 : 0);

  const links: Array<{ label: string; url: string; type: "live" | "github" | "fork" | "binary" }> = [];
  if (t.codeRepo?.liveDemoUrl) {
    links.push({ label: "Live Demo URL", url: t.codeRepo.liveDemoUrl, type: "live" });
  } else if (t.submission?.link && !t.submission.link.includes("github.com")) {
    links.push({ label: "Live Demo URL", url: t.submission.link, type: "live" });
  }

  if (t.codeRepo?.githubRepoUrl) {
    links.push({ label: "Student GitHub Repo", url: t.codeRepo.githubRepoUrl, type: "github" });
  } else if (t.submission?.link && t.submission.link.includes("github.com")) {
    links.push({ label: "Student GitHub Repo", url: t.submission.link, type: "github" });
  }

  if (t.codeRepo?.forkedRepoUrl) {
    links.push({ label: "Host Forked Repo", url: t.codeRepo.forkedRepoUrl, type: "fork" });
  }

  if (t.submission?.fileUrl) {
    links.push({ label: "Submission Binary / APK", url: t.submission.fileUrl, type: "binary" });
  }

  return { fileCount, linksCount: links.length, links, uploads };
}

export default function HostArenaCommandCenter() {
  const params = useParams();
  const hackathonId = params?.hackathonId as string;

  const [session, setSession] = useState<any>(null);
  const [hackathon, setHackathon] = useState<any>(null);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "progress" | "documents" | "submissions">("overview");

  // Unlock modal states
  const [unlockModal, setUnlockModal] = useState<string | null>(null); // submissionId
  const [unlockReason, setUnlockReason] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  // Deliverables Crosscheck Modal
  const [crosscheckSquad, setCrosscheckSquad] = useState<TeamRow | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Results Approval Modal
  const [approveResultsModal, setApproveResultsModal] = useState(false);
  const [approvingResults, setApprovingResults] = useState(false);
  const [hostLeaderboard, setHostLeaderboard] = useState<any[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  const handleCopyLink = (url: string, key: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(key);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  const handleOpenApproveModal = async () => {
    setApproveResultsModal(true);
    setLoadingLeaderboard(true);
    try {
      const res = await fetch(`/api/v1/host/hackathons/${hackathonId}/leaderboard`);
      if (res.ok) {
        const d = await res.json();
        setHostLeaderboard(d.leaderboard || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const handleApproveAndPublishResults = async () => {
    if (!hostLeaderboard || hostLeaderboard.length === 0) return;
    setApprovingResults(true);
    setActionErr(null);
    setActionMsg(null);

    const payload = hostLeaderboard.map((squad) => ({
      teamId: squad.teamId,
      rank: squad.computedRank,
      award:
        squad.award ||
        (squad.computedRank === 1
          ? "1st Place Winner - Gold Trophy"
          : squad.computedRank === 2
          ? "2nd Place Winner - Silver Trophy"
          : squad.computedRank === 3
          ? "3rd Place Winner - Bronze Trophy"
          : `Rank #${squad.computedRank}`),
    }));

    try {
      const res = await fetch(`/api/v1/host/hackathons/${hackathonId}/publish-results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results: payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionErr(data.error || "Failed to approve results");
        return;
      }

      setActionMsg("✓ Official Results Approved & Published! Students can now view their marks and trophies.");
      setApproveResultsModal(false);
      loadData();
      setTimeout(() => setActionMsg(null), 6000);
    } catch {
      setActionErr("Network error approving results");
    } finally {
      setApprovingResults(false);
    }
  };

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
  const hasApprovedResults =
    Boolean(hackathon?.results && hackathon.results.length > 0) ||
    teams.some((t) => Boolean(t.result));

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

          <div className="flex flex-wrap items-center gap-3">
            {hasApprovedResults ? (
              <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-1.5 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Results Approved & Published</span>
              </div>
            ) : (
              <button
                onClick={handleOpenApproveModal}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs transition-colors flex items-center gap-1.5 font-mono cursor-pointer"
                title="Approve judge results and reveal marks to students"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Approve Results (Reveal Marks) →</span>
              </button>
            )}

            <Link
              href={`/dashboard/host/edit/${hackathonId}`}
              className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-white font-bold text-xs hover:bg-[#6366F1] transition-colors flex items-center gap-1.5 font-mono"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit Track
            </Link>
            <Link
              href={`/dashboard/host/leaderboard/${hackathonId}`}
              className="px-3 py-1.5 rounded-lg bg-white text-black font-bold text-xs hover:bg-slate-200 transition-colors flex items-center gap-1.5"
            >
              Leaderboard & Results →
            </Link>
            <button
              onClick={loadData}
              className="p-2 rounded-lg bg-white/[0.04] border border-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
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
              onClick={() => setActiveTab("documents")}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                activeTab === "documents"
                  ? "bg-white text-black font-bold"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5" />
                <span>Stage Uploads & Trace</span>
              </div>
              <span className="text-[10px] opacity-70">
                {teams.reduce((acc, t) => acc + (t.documentUploads?.length || 0), 0)}
              </span>
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
                  Domains & Problem Statement Allocation
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Host-defined domains, problem statements, and real-time registered squads per domain.
                </p>
              </div>

              <div className="space-y-4">
                {domains.map((d) => {
                  const teamsInDomain = teams.filter((t) => t.domain?.id === d.id || t.domainId === d.id).length;

                  return (
                    <div key={d.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                      <div className="text-xs font-bold text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>Domain: {d.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30 font-bold">
                            {teamsInDomain} squad{teamsInDomain === 1 ? "" : "s"} registered
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {d.isRevealed
                            ? `Unlocked at ${new Date(d.revealAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })} IST`
                            : `Unlocks at ${new Date(d.revealAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })} IST (${(() => {
                                const sec = Math.max(0, d.secondsUntilReveal || 0);
                                const hh = String(Math.floor(sec / 3600)).padStart(2, "0");
                                const mm = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
                                const ss = String(sec % 60).padStart(2, "0");
                                return `${hh}:${mm}:${ss}`;
                              })()})`}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5">
                        {d.problemStatements.map((ps: any) => (
                          <div
                            key={ps.id}
                            className="p-3 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs"
                          >
                            <div className="space-y-1">
                              <div className="font-bold text-white flex items-center gap-2">
                                <span>{ps.title}</span>
                              </div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-3">
                                <span>Assigned: {ps.assignedCount} squads</span>
                                {ps.attachmentUrl && (
                                  <span className="text-[#818CF8]">
                                    Attachment: {ps.attachmentName || "Link"}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  ps.isFull
                                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                }`}
                              >
                                {ps.isFull ? "Slots full" : `${ps.slotsRemaining} SLOTS LEFT`}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
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

          {/* TAB 3: STAGE UPLOADS & TRACE */}
          {activeTab === "documents" && (
            <div className="bg-[#0B0E18] border border-white/[0.08] rounded-2xl overflow-hidden font-mono text-xs">
              <div className="p-4 border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Squad Stage Documentation & GitHub Trace</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                      Deliverables Crosscheck
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Stage-by-stage document upload status (Parts 1-4), version history, download URLs, and repository links for crosschecking.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-slate-300">
                    Total Files Uploaded:{" "}
                    <strong className="text-white">
                      {teams.reduce((acc, t) => acc + (t.documentUploads?.length || 0) + (t.submission?.fileUrl ? 1 : 0), 0)}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-slate-500 uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-4 font-medium min-w-[170px]">Team ID & Squad</th>
                      <th className="py-2.5 px-4 font-medium min-w-[170px]">Domain & Statement</th>
                      <th className="py-2.5 px-3 font-medium min-w-[150px]">Part 1 (SRS / Doc)</th>
                      <th className="py-2.5 px-3 font-medium min-w-[150px]">Part 2 (Code ZIP)</th>
                      <th className="py-2.5 px-3 font-medium min-w-[160px]">Part 3 (Test / Code)</th>
                      <th className="py-2.5 px-3 font-medium min-w-[180px]">Part 4 (Final Matrix)</th>
                      <th className="py-2.5 px-3 font-medium min-w-[180px]">Registered Links</th>
                      <th className="py-2.5 px-4 font-medium text-right min-w-[140px]">Audit Crosscheck</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {teams.map((t) => {
                      const uploads = t.documentUploads || [];
                      const stats = getTeamArtifactStats(t);

                      const renderStageUploads = (stageNum: number) => {
                        const stageUploads = uploads
                          .filter((u) => u.stage === stageNum)
                          .sort((a, b) => b.version - a.version);

                        if (stageUploads.length === 0) {
                          return <span className="text-[10px] text-slate-600">—</span>;
                        }

                        return (
                          <div className="space-y-1.5 py-1">
                            {stageUploads.map((u) => (
                              <div
                                key={u.id}
                                className="p-1.5 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/20 transition-all space-y-0.5"
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-bold text-white text-[9px] px-1 rounded bg-white/10">
                                    v{u.version}
                                  </span>
                                  <span
                                    className={`text-[8px] px-1 py-0.2 rounded font-bold uppercase ${
                                      u.syncStatus === "Synced"
                                        ? "bg-emerald-500/10 text-emerald-400"
                                        : u.syncStatus === "Pending"
                                        ? "bg-amber-500/10 text-amber-400"
                                        : "bg-red-500/10 text-red-400"
                                    }`}
                                  >
                                    {u.syncStatus}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <a
                                    href={u.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    download={u.fileName}
                                    title={`Click to download/inspect: ${u.fileName}`}
                                    className="text-[10px] text-sky-400 hover:text-sky-300 hover:underline truncate max-w-[125px] flex items-center gap-1 font-medium"
                                  >
                                    <FileText className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                                    <span className="truncate">{u.fileName}</span>
                                    <Download className="w-2.5 h-2.5 shrink-0 text-sky-400 ml-0.5" />
                                  </a>
                                </div>
                                <div className="text-[8px] text-slate-500 flex items-center justify-between">
                                  <span>{formatFileSize(u.fileSize)}</span>
                                  {u.createdAt && (
                                    <span>
                                      {new Date(u.createdAt).toLocaleDateString([], {
                                        month: "short",
                                        day: "numeric",
                                      })}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      };

                      return (
                        <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                          {/* Team & ID */}
                          <td className="py-3 px-4 font-bold text-white align-top">
                            <div className="font-semibold text-white">{t.name}</div>
                            <div className="text-[10px] text-emerald-400 font-mono">
                              {t.teamId || "Pending ID"}
                            </div>
                            <div className="text-[9px] text-slate-500 mt-0.5">
                              Lead: {t.leadStudent.user.name}
                            </div>
                          </td>

                          {/* Domain & Statement */}
                          <td className="py-3 px-4 text-slate-300 align-top">
                            <div className="font-medium text-white">{t.domain?.name || "No domain"}</div>
                            <div
                              className="text-[10px] text-slate-400 line-clamp-2"
                              title={t.problemStatement?.title || ""}
                            >
                              {t.problemStatement?.title || "No statement"}
                            </div>
                          </td>

                          {/* Part 1 */}
                          <td className="py-3 px-3 align-top">{renderStageUploads(1)}</td>

                          {/* Part 2 */}
                          <td className="py-3 px-3 align-top">{renderStageUploads(2)}</td>

                          {/* Part 3 */}
                          <td className="py-3 px-3 align-top">{renderStageUploads(3)}</td>

                          {/* Part 4 */}
                          <td className="py-3 px-3 align-top">{renderStageUploads(4)}</td>

                          {/* Registered Links */}
                          <td className="py-3 px-3 align-top">
                            {stats.links.length === 0 ? (
                              <span className="text-[10px] text-slate-600">No links registered</span>
                            ) : (
                              <div className="space-y-1">
                                {stats.links.map((lnk, idx) => (
                                  <a
                                    key={idx}
                                    href={lnk.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono border flex items-center gap-1 transition-colors truncate max-w-[155px] ${
                                      lnk.type === "live"
                                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20"
                                        : lnk.type === "github"
                                        ? "bg-white/5 text-slate-200 border-white/10 hover:bg-white/10"
                                        : lnk.type === "fork"
                                        ? "bg-sky-500/10 text-sky-300 border-sky-500/20 hover:bg-sky-500/20"
                                        : "bg-purple-500/10 text-purple-300 border-purple-500/20 hover:bg-purple-500/20"
                                    }`}
                                    title={`${lnk.label}: ${lnk.url}`}
                                  >
                                    {lnk.type === "live" ? (
                                      <Globe className="w-2.5 h-2.5 shrink-0" />
                                    ) : lnk.type === "github" ? (
                                      <Code2 className="w-2.5 h-2.5 shrink-0" />
                                    ) : lnk.type === "fork" ? (
                                      <GitFork className="w-2.5 h-2.5 shrink-0" />
                                    ) : (
                                      <FileArchive className="w-2.5 h-2.5 shrink-0" />
                                    )}
                                    <span className="truncate">{lnk.label}</span>
                                    <ExternalLink className="w-2.5 h-2.5 shrink-0 ml-auto" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* Crosscheck Action */}
                          <td className="py-3 px-4 text-right align-top">
                            <button
                              onClick={() => setCrosscheckSquad(t)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#6366F1]/10 hover:bg-[#6366F1]/20 text-[#818CF8] hover:text-white border border-[#6366F1]/30 text-[10px] font-bold transition-all flex items-center gap-1 ml-auto cursor-pointer"
                              title="Open complete squad deliverables crosscheck modal"
                            >
                              <CheckSquare className="w-3 h-3 text-[#818CF8]" />
                              <span>Crosscheck ({stats.fileCount}F, {stats.linksCount}L)</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: SUBMISSIONS & LOCKS */}
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

      {/* CROSSCHECK ALL DELIVERABLES MODAL */}
      {crosscheckSquad && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0B0E18] border border-white/20 rounded-2xl max-w-4xl w-full p-6 space-y-6 font-mono text-xs my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>{crosscheckSquad.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {crosscheckSquad.teamId || "Pending Team ID"}
                    </span>
                  </h2>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Deliverables & Artifacts Crosscheck Audit · Track: {crosscheckSquad.domain?.name || "General"} · Lead:{" "}
                  {crosscheckSquad.leadStudent.user.name} ({crosscheckSquad.leadStudent.user.email})
                </p>
                {crosscheckSquad.leadStudent.college && (
                  <p className="text-[10px] text-slate-500">
                    College: {crosscheckSquad.leadStudent.college}
                  </p>
                )}
              </div>
              <button
                onClick={() => setCrosscheckSquad(null)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* STATS STRIP */}
            {(() => {
              const stats = getTeamArtifactStats(crosscheckSquad);
              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase">Uploaded Files</span>
                    <div className="text-lg font-bold text-white">{stats.fileCount}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase">Registered Links</span>
                    <div className="text-lg font-bold text-emerald-400">{stats.linksCount}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase">Final Submission</span>
                    <div
                      className={`text-xs font-bold ${
                        crosscheckSquad.submission?.locked ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      {crosscheckSquad.submission?.locked ? "LOCKED & FROZEN" : "IN-PROGRESS"}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase">GitHub Fork</span>
                    <div
                      className={`text-xs font-bold ${
                        crosscheckSquad.codeRepo?.forkedRepoUrl ? "text-sky-400" : "text-slate-500"
                      }`}
                    >
                      {crosscheckSquad.codeRepo?.forkedRepoUrl ? "FORKED & SYNCED" : "PENDING"}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 1. REGISTERED LINKS SECTION */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>1. Registered Application & Repository Links to Crosscheck</span>
              </h3>
              {(() => {
                const stats = getTeamArtifactStats(crosscheckSquad);
                if (stats.links.length === 0) {
                  return (
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-slate-500 text-center text-xs">
                      No links registered yet by this squad.
                    </div>
                  );
                }
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {stats.links.map((lnk, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-white text-xs flex items-center gap-1.5">
                            {lnk.type === "live" ? (
                              <Globe className="w-3.5 h-3.5 text-emerald-400" />
                            ) : lnk.type === "github" ? (
                              <Code2 className="w-3.5 h-3.5 text-white" />
                            ) : lnk.type === "fork" ? (
                              <GitFork className="w-3.5 h-3.5 text-sky-400" />
                            ) : (
                              <FileArchive className="w-3.5 h-3.5 text-purple-400" />
                            )}
                            <span>{lnk.label}</span>
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
                            Active
                          </span>
                        </div>

                        <div className="p-2 rounded bg-black/40 border border-white/5 text-[11px] text-slate-300 break-all select-all font-mono">
                          {lnk.url}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <a
                            href={lnk.url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1 rounded-lg bg-white text-black font-bold text-[10px] hover:bg-slate-200 transition-colors flex items-center gap-1"
                          >
                            <span>Open Link</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <button
                            onClick={() => handleCopyLink(lnk.url, `lnk-${idx}`)}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedLink === `lnk-${idx}` ? "Copied!" : "Copy"}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* 2. UPLOADED FILES SECTION */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                <span>2. Uploaded Stage Files & Deliverables Archive</span>
              </h3>

              {[1, 2, 3, 4].map((stageNum) => {
                const stageFiles = (crosscheckSquad.documentUploads || []).filter(
                  (u) => u.stage === stageNum
                );
                const stageTitles: Record<number, string> = {
                  1: "Part 1: Architecture Diagram & Requirements Document (SRS)",
                  2: "Part 2: Code Repository & Project Files Archive",
                  3: "Part 3: Code Package Archive & Testcase PDF",
                  4: "Part 4: Final Deliverables Matrix (Code ZIP, Complete PDF, Complete PPTX)",
                };

                return (
                  <div
                    key={stageNum}
                    className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-2.5"
                  >
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="font-bold text-white text-xs">
                        {stageTitles[stageNum]}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-400">
                        {stageFiles.length} file{stageFiles.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    {stageFiles.length === 0 ? (
                      <div className="text-[11px] text-slate-600 py-1">
                        No file uploaded for this stage.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {stageFiles.map((u) => (
                          <div
                            key={u.id}
                            className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-white/20 transition-all"
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white">
                                  v{u.version}
                                </span>
                                <span className="font-semibold text-white text-xs break-all">
                                  {u.fileName}
                                </span>
                                <span
                                  className={`text-[8px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                    u.syncStatus === "Synced"
                                      ? "bg-emerald-500/10 text-emerald-400"
                                      : "bg-amber-500/10 text-amber-400"
                                  }`}
                                >
                                  {u.syncStatus}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-3">
                                <span>Size: {formatFileSize(u.fileSize)}</span>
                                <span>Uploader: {u.uploaderName}</span>
                                <span>{new Date(u.createdAt).toLocaleString()}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <a
                                href={u.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                download={u.fileName}
                                className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 font-bold text-[10px] transition-colors flex items-center gap-1.5"
                              >
                                <Download className="w-3 h-3" />
                                <span>Download / Inspect</span>
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 3. ARCHITECTURE WRITE-UP */}
            {crosscheckSquad.submission?.description && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  3. Squad Architecture & Implementation Write-Up
                </h3>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 text-[11px] text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                  {crosscheckSquad.submission.description}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setCrosscheckSquad(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Done Crosschecking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* APPROVE RESULTS & PUBLISH MARKS MODAL */}
      {approveResultsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0B0E18] border border-white/20 rounded-2xl max-w-xl w-full p-6 space-y-5 font-mono text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Approve Official Results & Reveal Marks</h2>
                  <p className="text-[11px] text-slate-400">
                    Release v5.0 Authorization Gate
                  </p>
                </div>
              </div>
              <button
                onClick={() => setApproveResultsModal(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 space-y-1">
              <div className="font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Important Governance Invariant:</span>
              </div>
              <p className="text-[11px] text-amber-200/80 leading-relaxed">
                In accordance with Release v5.0, students cannot see their marks or trophies until the Host officially approves and certifies the results.
                Once you approve below, final marks, percentage bars, Gold/Silver/Bronze trophy watermarks, and green winner badges will be published live to students.
              </p>
            </div>

            {loadingLeaderboard ? (
              <div className="p-8 text-center text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#6366F1]" />
                <span>Loading judge score standings...</span>
              </div>
            ) : hostLeaderboard.length === 0 ? (
              <div className="p-6 rounded-xl bg-white/[0.02] border border-white/5 text-center text-slate-400">
                No evaluated squads found. Please ensure judges have scored squads in this track first.
              </div>
            ) : (
              <div className="space-y-2">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                  Standings to be Certified ({hostLeaderboard.length} Squads):
                </span>
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                  {hostLeaderboard.map((squad) => (
                    <div
                      key={squad.teamId}
                      className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                            squad.computedRank === 1
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : squad.computedRank === 2
                              ? "bg-slate-300/20 text-slate-200 border border-slate-300/40"
                              : squad.computedRank === 3
                              ? "bg-amber-700/20 text-amber-500 border border-amber-700/40"
                              : "bg-white/5 text-slate-400"
                          }`}
                        >
                          #{squad.computedRank}
                        </span>
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{squad.teamName}</span>
                            {squad.computedRank === 1 && <span className="text-amber-400">🏆 Gold</span>}
                            {squad.computedRank === 2 && <span className="text-slate-300">🥈 Silver</span>}
                            {squad.computedRank === 3 && <span className="text-amber-600">🥉 Bronze</span>}
                          </div>
                          <div className="text-[10px] text-slate-500">{squad.college || squad.leadName}</div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-bold text-emerald-400">
                          {squad.finalScore} / {squad.maxMarks}
                        </div>
                        <div className="text-[10px] text-slate-500">{squad.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                onClick={() => setApproveResultsModal(false)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveAndPublishResults}
                disabled={approvingResults || hostLeaderboard.length === 0}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-colors disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
              >
                {approvingResults ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Approving & Publishing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve & Publish Results to Students</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
