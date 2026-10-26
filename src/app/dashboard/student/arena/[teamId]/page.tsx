"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Clock,
  CheckCircle2,
  Lock,
  Unlock,
  Terminal,
  Code2,
  FileCode,
  Layers,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Send,
  Upload,
  AlertTriangle,
  GitBranch,
  TrendingUp,
  FileCheck
} from "lucide-react";

interface ProblemStatementItem {
  id: string;
  title: string;
  description: string | null;
  cap: number;
  assignedCount: number;
  slotsRemaining: number;
  isFull: boolean;
  isRevealed: boolean;
}

interface DomainItem {
  id: string;
  name: string;
  description: string | null;
  revealAt: string;
  isRevealed: boolean;
  secondsUntilReveal: number;
  problemStatements: ProblemStatementItem[];
}

export default function StudentArenaPage() {
  const params = useParams();
  const router = useRouter();
  const teamIdParam = params?.teamId as string;

  const [session, setSession] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [domains, setDomains] = useState<DomainItem[]>([]);
  const [domainsLoading, setDomainsLoading] = useState(false);
  const [selectedStatement, setSelectedStatement] = useState<any>(null);

  // Selection states
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);

  // Progress states
  const [currentPercent, setCurrentPercent] = useState<number>(0);
  const [progressHistory, setProgressHistory] = useState<any[]>([]);
  const [nextPercent, setNextPercent] = useState<number>(10);
  const [progressNote, setProgressNote] = useState("");
  const [loggingProgress, setLoggingProgress] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string | null>(null);
  const [progressErr, setProgressErr] = useState<string | null>(null);

  // Repo states
  const [repo, setRepo] = useState<any>(null);
  const [committing, setCommitting] = useState(false);
  const [commitMsg, setCommitMsg] = useState("Implement core algorithm logic");
  const [repoMsg, setRepoMsg] = useState<string | null>(null);

  // Submission states
  const [submission, setSubmission] = useState<any>(null);
  const [subLink, setSubLink] = useState("");
  const [subFileUrl, setSubFileUrl] = useState("");
  const [subDescription, setSubDescription] = useState("");
  const [submittingFinal, setSubmittingFinal] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [subError, setSubError] = useState<string | null>(null);
  const [subSuccess, setSubSuccess] = useState<string | null>(null);

  // Active view tab
  const [activeTab, setActiveTab] = useState<"statement" | "progress" | "repo" | "submission">("statement");

  // Fetch team, progress, repo, submission
  const loadTeamData = useCallback(async () => {
    if (!teamIdParam) return;
    try {
      const res = await fetch(`/api/v1/teams/${teamIdParam}`);
      if (res.ok) {
        const d = await res.json();
        setTeam(d.team);
        if (d.team?.problemStatement) {
          setSelectedStatement(d.team.problemStatement);
        }

        // Fetch domains/problem statements
        const psRes = await fetch(`/api/v1/hackathons/${d.team.hackathonId}/problem-statements`);
        if (psRes.ok) {
          const psData = await psRes.json();
          setDomains(psData.domains || []);
        }

        // Fetch progress
        const progRes = await fetch(`/api/v1/teams/${d.team.id}/progress`);
        if (progRes.ok) {
          const progData = await progRes.json();
          setCurrentPercent(progData.currentPercent || 0);
          setProgressHistory(progData.history || []);
          const next = Math.min(100, (progData.currentPercent || 0) + 10);
          setNextPercent(next);
        }

        // Fetch repo
        const repoRes = await fetch(`/api/v1/teams/${d.team.id}/repo`);
        if (repoRes.ok) {
          const repoData = await repoRes.json();
          setRepo(repoData.repo);
        }

        // Fetch submission
        const subRes = await fetch(`/api/v1/teams/${d.team.id}/submission`);
        if (subRes.ok) {
          const subData = await subRes.json();
          if (subData.submission) {
            setSubmission(subData.submission);
            setSubLink(subData.submission.link || "");
            setSubFileUrl(subData.submission.fileUrl || "");
            setSubDescription(subData.submission.description || "");
          }
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [teamIdParam]);

  useEffect(() => {
    fetch("/api/v1/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (d?.user) setSession(d.user);
      })
      .catch(() => {});

    loadTeamData();
  }, [loadTeamData]);

  // Periodic poll for statement countdown or live unlocks
  useEffect(() => {
    const timer = setInterval(() => {
      if (team?.hackathonId) {
        fetch(`/api/v1/hackathons/${team.hackathonId}/problem-statements`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (d?.domains) setDomains(d.domains);
          })
          .catch(() => {});
      }
    }, 10000);
    return () => clearInterval(timer);
  }, [team]);

  // Handle statement selection
  const handleSelectStatement = async (statementId: string) => {
    setSelectingId(statementId);
    setSelectionError(null);

    try {
      const res = await fetch(`/api/v1/teams/${team.id}/select-statement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemStatementId: statementId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSelectionError(data.error || "Failed to select problem statement");
        return;
      }

      setSelectedStatement(data.statement);
      loadTeamData();
    } catch {
      setSelectionError("Network error selecting statement");
    } finally {
      setSelectingId(null);
    }
  };

  // Handle logging progress update (10% steps, non-decreasing)
  const handleLogProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progressNote.trim()) return;

    setLoggingProgress(true);
    setProgressMsg(null);
    setProgressErr(null);

    try {
      const res = await fetch(`/api/v1/teams/${team.id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          percent: nextPercent,
          note: progressNote.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setProgressErr(data.error || "Failed to log progress");
        return;
      }

      setProgressMsg(`Progress logged at ${nextPercent}%! Timeline updated.`);
      setProgressNote("");
      loadTeamData();
      setTimeout(() => setProgressMsg(null), 4000);
    } catch {
      setProgressErr("Network error logging progress");
    } finally {
      setLoggingProgress(false);
    }
  };

  // Handle code push simulation
  const handlePushCommit = async () => {
    setCommitting(true);
    setRepoMsg(null);

    try {
      const res = await fetch(`/api/v1/teams/${team.id}/repo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: commitMsg }),
      });

      const data = await res.json();
      if (res.ok) {
        setRepoMsg(data.message);
        loadTeamData();
        setTimeout(() => setRepoMsg(null), 4000);
      }
    } catch {
      // ignore
    } finally {
      setCommitting(false);
    }
  };

  // Handle final submission
  const handleFinalSubmit = async () => {
    setSubmittingFinal(true);
    setSubError(null);
    setSubSuccess(null);

    try {
      const res = await fetch(`/api/v1/teams/${team.id}/submission`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          link: subLink.trim() || undefined,
          fileUrl: subFileUrl.trim() || undefined,
          description: subDescription.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubError(data.error || "Submission failed");
        setConfirmModal(false);
        return;
      }

      setSubSuccess("Final submission confirmed and locked! Recorded to audit trail.");
      setConfirmModal(false);
      loadTeamData();
    } catch {
      setSubError("Network error completing submission");
    } finally {
      setSubmittingFinal(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-16">
        <div className="h-64 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
        <h1 className="font-display text-lg font-bold text-white mb-2">Squad Workspace Not Found</h1>
        <Link href="/dashboard/student" className="text-xs font-mono text-[#6366F1] hover:underline">
          ← Back to Console
        </Link>
      </div>
    );
  }

  const isLead = team.leadStudent?.userId === session?.userId;
  const isSubmissionLocked = submission?.locked;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full space-y-8">
      {/* Top Breadcrumb & Status */}
      <div>
        <Link
          href="/dashboard/student"
          className="text-xs font-mono text-slate-500 hover:text-white flex items-center gap-1.5 transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Student Console
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div className="space-y-1">
            <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <span>{team.hackathon.title}</span>
              <span>/</span>
              <span className="text-white">Live Event Arena</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-white tracking-tight flex items-center gap-3">
              <span>Squad: {team.name}</span>
              {team.teamId && (
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {team.teamId}
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Lead: {team.leadStudent.user.name} · Squad Size: {team.members?.length ?? 1} · Status: {team.status}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadTeamData}
              className="p-2 rounded-lg bg-white/[0.04] border border-white/10 text-slate-400 hover:text-white transition-colors"
              title="Refresh Workspace"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <div className="text-right">
              <div className="text-[10px] font-mono text-slate-500 uppercase">Live Progress</div>
              <div className="text-sm font-bold font-mono text-white flex items-center gap-1.5 justify-end">
                <TrendingUp className="w-3.5 h-3.5 text-[#6366F1]" />
                {currentPercent}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Navigation Sidebar */}
        <aside className="md:col-span-3 space-y-4">
          <nav className="p-2 rounded-xl bg-[#0B0E18] border border-white/[0.08] space-y-1 text-xs font-mono">
            <button
              onClick={() => setActiveTab("statement")}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                activeTab === "statement"
                  ? "bg-white text-black font-bold"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2">
                <FileCode className="w-3.5 h-3.5" />
                <span>Problem Statement</span>
              </div>
              {selectedStatement && (
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              )}
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
                <span>Progress Scale</span>
              </div>
              <span className="text-[10px] opacity-70">{currentPercent}%</span>
            </button>

            <button
              onClick={() => setActiveTab("repo")}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                activeTab === "repo"
                  ? "bg-white text-black font-bold"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2">
                <GitBranch className="w-3.5 h-3.5" />
                <span>Code Repository</span>
              </div>
              <span className="text-[10px] opacity-70">Git</span>
            </button>

            <button
              onClick={() => setActiveTab("submission")}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                activeTab === "submission"
                  ? "bg-white text-black font-bold"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2">
                <FileCheck className="w-3.5 h-3.5" />
                <span>Final Submission</span>
              </div>
              {isSubmissionLocked && (
                <Lock className="w-3 h-3 text-amber-400" />
              )}
            </button>
          </nav>

          {/* PRD Non-Negotiable Rules Summary Box */}
          <div className="p-4 rounded-xl bg-[#0B0E18] border border-white/[0.08] space-y-2 text-xs font-mono">
            <div className="text-[10px] uppercase text-slate-500 tracking-wider">
              PRD Event Rules
            </div>
            <div className="text-[11px] text-slate-400 space-y-1.5 leading-relaxed">
              <p>• Statements unlock simultaneously across all clients.</p>
              <p>• Balanced allocation caps prevent clustering.</p>
              <p>• Progress updates are 10% steps and never decrease.</p>
              <p>• Final submission is strictly locked once confirmed.</p>
            </div>
          </div>
        </aside>

        {/* Right Main Content */}
        <main className="md:col-span-9 space-y-6">
          {/* TAB 1: PROBLEM STATEMENT SELECTION & REVEAL */}
          {activeTab === "statement" && (
            <div className="space-y-6">
              {selectionError && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-mono text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{selectionError}</span>
                </div>
              )}

              {/* Already Selected Statement Card */}
              {selectedStatement ? (
                <div className="p-6 rounded-2xl bg-[#0B0E18] border border-emerald-500/30 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      Assigned Problem Statement (Selection Confirmed)
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400">
                      SELECTION FINAL
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h2 className="font-display text-xl font-bold text-white tracking-tight">
                      {selectedStatement.title}
                    </h2>
                    <p className="text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                      {selectedStatement.description}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-sm font-bold text-white tracking-tight">
                      Available Problem Statements & Domains
                    </h2>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      PRD Rule 4: Capped at Ceil(totalTeams / totalStatements). Selection is first-come first-served.
                    </p>
                  </div>

                  {domains.map((domain) => (
                    <div
                      key={domain.id}
                      className="p-6 rounded-2xl bg-[#0B0E18] border border-white/[0.08] space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            <span>{domain.name}</span>
                            {domain.isRevealed ? (
                              <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Unlocked
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" /> Countdown Active
                              </span>
                            )}
                          </div>
                          {domain.description && (
                            <p className="text-[11px] text-slate-400 mt-1 font-mono">
                              {domain.description}
                            </p>
                          )}
                        </div>

                        {!domain.isRevealed && (
                          <div className="text-right font-mono">
                            <span className="text-[10px] text-slate-500 uppercase">Unlocks In</span>
                            <div className="text-xs text-amber-400 font-bold">
                              {domain.secondsUntilReveal}s
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Statements Grid */}
                      <div className="grid grid-cols-1 gap-4">
                        {domain.problemStatements.map((ps) => (
                          <div
                            key={ps.id}
                            className={`p-4 rounded-xl border transition-all ${
                              ps.isFull
                                ? "bg-white/[0.01] border-white/5 opacity-60"
                                : "bg-white/[0.02] border-white/[0.08] hover:border-white/20"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1.5 flex-1">
                                <h3 className="text-xs font-bold text-white font-mono flex items-center gap-2">
                                  <span>{ps.title}</span>
                                  {ps.isFull && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-bold">
                                      CAP REACHED
                                    </span>
                                  )}
                                </h3>
                                <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
                                  {ps.description || "Locked until domain reveal countdown reaches zero."}
                                </p>
                              </div>

                              <div className="text-right shrink-0 space-y-2">
                                <div className="text-[10px] font-mono text-slate-500">
                                  Slots: <strong className="text-white">{ps.slotsRemaining}</strong> / {ps.cap}
                                </div>

                                {domain.isRevealed && isLead && !ps.isFull && (
                                  <button
                                    onClick={() => handleSelectStatement(ps.id)}
                                    disabled={selectingId === ps.id}
                                    className="px-3 py-1.5 rounded-lg bg-white text-black font-bold text-[11px] font-mono hover:bg-slate-200 transition-colors disabled:opacity-40"
                                  >
                                    {selectingId === ps.id ? "Locking..." : "Select Statement"}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PROGRESS SCALE (10% to 100% steps) */}
          {activeTab === "progress" && (
            <div className="p-6 rounded-2xl bg-[#0B0E18] border border-white/[0.08] space-y-6">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight">
                    Progress Scale Timeline
                  </h2>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    PRD Rule 6: 10% steps, timestamped, strictly never decreasing. Visible to judges and host only.
                  </p>
                </div>
                <div className="text-sm font-bold font-mono text-white">
                  Current: {currentPercent}%
                </div>
              </div>

              {progressMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400 flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{progressMsg}</span>
                </div>
              )}

              {progressErr && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-mono text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{progressErr}</span>
                </div>
              )}

              {/* Progress Bar Display */}
              <div className="space-y-2">
                <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="bg-[#6366F1] h-full transition-all duration-300"
                    style={{ width: `${currentPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Log Next Progress Form */}
              {currentPercent < 100 && (
                <form onSubmit={handleLogProgress} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white font-mono">
                      Log Next Milestone ({nextPercent}%)
                    </span>
                    <select
                      value={nextPercent}
                      onChange={(e) => setNextPercent(Number(e.target.value))}
                      className="px-2.5 py-1 text-xs font-mono bg-white/[0.03] border border-white/10 rounded-lg text-white focus:outline-none"
                    >
                      {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
                        .filter((p) => p > currentPercent)
                        .map((p) => (
                          <option key={p} value={p}>
                            {p}%
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-slate-400 block">
                      Milestone Changelog / Technical Summary <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      required
                      value={progressNote}
                      onChange={(e) => setProgressNote(e.target.value)}
                      placeholder="e.g., Completed distributed consensus protocol; initiated vector search integration..."
                      rows={2}
                      className="w-full px-3 py-2 text-xs font-mono bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-white/30"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loggingProgress || !progressNote.trim()}
                    className="w-full py-2.5 rounded-xl bg-white text-black font-bold text-xs font-mono hover:bg-slate-200 transition-colors disabled:opacity-40"
                  >
                    {loggingProgress ? "Recording Milestone..." : `Confirm & Log ${nextPercent}% Progress`}
                  </button>
                </form>
              )}

              {/* Progress History Timeline */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                  Timeline Updates ({progressHistory.length})
                </div>

                {progressHistory.length === 0 ? (
                  <div className="p-6 text-center text-xs font-mono text-slate-500 bg-white/[0.01] rounded-xl border border-dashed border-white/10">
                    No progress updates logged yet. Log your first 10% milestone above.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {progressHistory.map((p) => (
                      <div
                        key={p.id}
                        className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs font-mono"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.2 rounded border border-emerald-500/20 text-[10px]">
                              {p.percent}%
                            </span>
                            <span className="text-slate-300">{p.note}</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0">
                          {new Date(p.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CODE REPOSITORY */}
          {activeTab === "repo" && (
            <div className="p-6 rounded-2xl bg-[#0B0E18] border border-white/[0.08] space-y-6">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight">
                    Provisioned GitHub Code Repository
                  </h2>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    PRD FR-7: Automated repository named after Team ID ({team.teamId || "TEAM-PENDING"}).
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-300">
                  AUTOMATED SYNC
                </span>
              </div>

              {repoMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400 flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{repoMsg}</span>
                </div>
              )}

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 uppercase text-[10px]">Repository URL</span>
                  <a
                    href={repo?.githubRepoUrl || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#6366F1] hover:underline flex items-center gap-1 font-bold"
                  >
                    {repo?.githubRepoUrl} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 uppercase text-[10px]">Latest Commit Hash</span>
                  <span className="text-white bg-white/5 px-2 py-0.5 rounded select-all font-bold">
                    {repo?.commitHash ? repo.commitHash.slice(0, 10) : "No commits yet"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 uppercase text-[10px]">Last Synced</span>
                  <span className="text-slate-400">
                    {repo?.lastPushAt ? new Date(repo.lastPushAt).toLocaleTimeString() : "Pending push"}
                  </span>
                </div>
              </div>

              {/* Commit Trigger */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3 font-mono">
                <div className="text-xs font-bold text-white">Record Code Sync / Commit</div>
                <input
                  type="text"
                  value={commitMsg}
                  onChange={(e) => setCommitMsg(e.target.value)}
                  placeholder="Commit message..."
                  className="w-full px-3 py-2 text-xs bg-white/[0.03] border border-white/10 rounded-lg text-white focus:outline-none"
                />
                <button
                  onClick={handlePushCommit}
                  disabled={committing || !commitMsg.trim()}
                  className="px-4 py-2 rounded-lg bg-white text-black font-bold text-xs hover:bg-slate-200 transition-colors disabled:opacity-40 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {committing ? "Pushing..." : "Push Commit & Sync"}
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: FINAL IMMUTABLE SUBMISSION */}
          {activeTab === "submission" && (
            <div className="p-6 rounded-2xl bg-[#0B0E18] border border-white/[0.08] space-y-6">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight">
                    Final Project Submission
                  </h2>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    PRD Non-Negotiable Rule 7: Final submission is immutable once confirmed; only the host can unlock.
                  </p>
                </div>
                {isSubmissionLocked ? (
                  <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> LOCKED & CONFIRMED
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-white/5 text-slate-400 border border-white/10">
                    PENDING FINAL SUBMISSION
                  </span>
                )}
              </div>

              {subSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400 flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{subSuccess}</span>
                </div>
              )}

              {subError && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-mono text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{subError}</span>
                </div>
              )}

              {isSubmissionLocked ? (
                <div className="p-6 rounded-xl bg-white/[0.02] border border-white/5 space-y-4 font-mono text-xs">
                  <div className="flex items-center gap-2 text-amber-400 font-bold">
                    <Lock className="w-4 h-4" />
                    <span>Submission Frozen for Host & Judge Evaluation</span>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">Live Demo / Repository Link</div>
                      <a
                        href={submission.link || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#6366F1] font-bold hover:underline"
                      >
                        {submission.link || "Not provided"}
                      </a>
                    </div>

                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">Uploaded Application Link</div>
                      <div className="text-white font-bold">{submission.fileUrl || "—"}</div>
                    </div>

                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">Project Architecture & How It Works</div>
                      <p className="text-slate-300 leading-relaxed whitespace-pre-wrap pt-1">
                        {submission.description}
                      </p>
                    </div>

                    <div className="pt-2 text-[10px] text-slate-500 border-t border-white/5">
                      Submitted on {new Date(submission.submittedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 font-mono text-xs">
                  <div className="space-y-1.5">
                    <label className="text-slate-300 block">
                      Live Project / Demo Link (GitHub / Vercel / Loom)
                    </label>
                    <input
                      type="url"
                      value={subLink}
                      onChange={(e) => setSubLink(e.target.value)}
                      placeholder="https://github.com/..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-white/30"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-300 block">
                      Application Binary or Zip Link (Optional)
                    </label>
                    <input
                      type="url"
                      value={subFileUrl}
                      onChange={(e) => setSubFileUrl(e.target.value)}
                      placeholder="https://storage.hackbridge.dev/..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-white/30"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-300 block">
                      How It Works & Technical Architecture <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      required
                      value={subDescription}
                      onChange={(e) => setSubDescription(e.target.value)}
                      placeholder="Describe system design, key technical challenges overcome, instructions to run..."
                      rows={5}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-white/30 leading-relaxed"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setConfirmModal(true)}
                      disabled={!subDescription.trim() || !isLead}
                      className="w-full py-3.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-slate-200 transition-colors disabled:opacity-40"
                    >
                      Lock & Finalize Submission
                    </button>
                    {!isLead && (
                      <p className="text-[10px] text-amber-400 text-center mt-2">
                        Only the team lead ({team.leadStudent.user.name}) can finalize the submission.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Confirmation Modal (PRD Rule 7) */}
              {confirmModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-[#0B0E18] border border-white/20 rounded-2xl p-6 max-w-md w-full space-y-4 font-mono text-xs">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
                      <Lock className="w-5 h-5" />
                    </div>

                    <div className="text-center space-y-1">
                      <h3 className="text-sm font-bold text-white">Confirm Final Submission Locking</h3>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        PRD Non-Negotiable Rule 7: After confirmation, your submission is permanently frozen. The form and uploads lock instantly, and can only be unlocked by explicit host authorization.
                      </p>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => setConfirmModal(false)}
                        className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleFinalSubmit}
                        disabled={submittingFinal}
                        className="flex-1 py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-slate-200 transition-colors"
                      >
                        {submittingFinal ? "Locking..." : "Confirm & Freeze"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
