"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  Scale, 
  FileText, 
  Code2, 
  Award, 
  Clock, 
  CheckCircle2, 
  ExternalLink,
  ShieldCheck,
  Check,
  AlertCircle,
  RefreshCw,
  Sliders,
  Send
} from "lucide-react";

interface RubricCriterion {
  id: string;
  name: string;
  weight: number;
  maxScore: number;
}

interface SubmissionItem {
  id: string;
  link?: string | null;
  fileUrl?: string | null;
  description: string;
  submittedAt: string;
  locked: boolean;
  team: {
    id: string;
    teamId: string | null;
    name: string;
    problemStatement?: { title: string } | null;
    codeRepo?: { githubRepoUrl: string } | null;
    leadStudent: { user: { name: string; email: string } };
  };
  scores: Array<{
    id: string;
    criterionId: string;
    score: number;
    notes?: string | null;
  }>;
}

export default function JudgeDashboard() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"queue" | "rubric">("queue");

  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [criteria, setCriteria] = useState<RubricCriterion[]>([]);
  const [hackathon, setHackathon] = useState<any>(null);
  const [approvalStatus, setApprovalStatus] = useState<string>("PENDING");
  const [fetching, setFetching] = useState(false);

  // Scoring form modal
  const [scoringSubmission, setScoringSubmission] = useState<SubmissionItem | null>(null);
  const [scoreInputs, setScoreInputs] = useState<Record<string, { score: number; notes: string }>>({});
  const [savingScore, setSavingScore] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setFetching(true);
    try {
      const [meRes, subRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/judge/submissions"),
      ]);

      if (meRes.ok) {
        const d = await meRes.json();
        if (d?.user) setSession(d.user);
      }

      if (subRes.ok) {
        const subData = await subRes.json();
        setSubmissions(subData.submissions || []);
        setCriteria(subData.criteria || []);
        setHackathon(subData.hackathon || null);
        setApprovalStatus(subData.approvalStatus || "APPROVED");
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open scoring panel for a submission
  const openScoring = (sub: SubmissionItem) => {
    setScoringSubmission(sub);
    setActionMsg(null);
    setActionErr(null);

    // Prepopulate with existing scores if any
    const initial: Record<string, { score: number; notes: string }> = {};
    for (const c of criteria) {
      const existing = sub.scores?.find((s) => s.criterionId === c.id);
      initial[c.id] = {
        score: existing?.score ?? Math.round(c.maxScore * 0.7),
        notes: existing?.notes ?? "",
      };
    }
    setScoreInputs(initial);
  };

  // Submit scores
  const handleSubmitScores = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scoringSubmission) return;

    setSavingScore(true);
    setActionErr(null);
    setActionMsg(null);

    const scoresPayload = Object.entries(scoreInputs).map(([criterionId, data]) => ({
      criterionId,
      score: data.score,
      notes: data.notes || undefined,
    }));

    try {
      const res = await fetch("/api/v1/judge/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: scoringSubmission.id,
          scores: scoresPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionErr(data.error || "Failed to submit scores");
        return;
      }

      setActionMsg(`Scores certified for squad ${scoringSubmission.team.name}!`);
      setScoringSubmission(null);
      loadData();
      setTimeout(() => setActionMsg(null), 4000);
    } catch {
      setActionErr("Network error submitting scores");
    } finally {
      setSavingScore(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-16">
        <div className="h-64 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse" />
      </div>
    );
  }

  if (!session || (session.role !== "JUDGE" && session.role !== "SUPER_ADMIN")) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[60vh] font-mono">
        <Scale className="w-8 h-8 text-slate-500 mb-3" />
        <h1 className="font-display text-lg font-bold text-white mb-1">Judge Credentials Required</h1>
        <p className="text-xs text-slate-400 mb-5 max-w-sm">Please authenticate with an authorized Judge panel account.</p>
        <Link href="/login" className="px-4 py-2 rounded-lg bg-white text-black font-semibold text-xs">
          Judge Sign In
        </Link>
      </div>
    );
  }

  const isApproved = approvalStatus === "APPROVED";
  const hackathonTitle = hackathon?.title || "HackBridge National Grand Arena";

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full space-y-8 font-mono">
      {/* Header Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-white/[0.08] gap-4">
        <div className="space-y-1">
          <div className="text-[11px] text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <span>HackBridge</span>
            <span>/</span>
            <span>Evaluation Panel</span>
            <span>/</span>
            <span className="text-white">{hackathonTitle}</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">
            Judge: {session.name}
          </h1>
          <p className="text-xs text-slate-400">
            {session.email} · Assigned Track: {hackathonTitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2 rounded-lg bg-white/[0.04] border border-white/10 text-slate-400 hover:text-white transition-colors"
            title="Refresh submissions"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${fetching ? "animate-spin" : ""}`} />
          </button>
          <span className={`px-2.5 py-1 rounded text-[11px] font-medium border ${
            isApproved
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
          }`}>
            PANEL STATUS: {approvalStatus}
          </span>
        </div>
      </div>

      {!isApproved && (
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-3">
          <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold">Awaiting Host Authorization</span>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              In accordance with PRD Rule 5, judge accounts must be approved by the hackathon host before submission repositories and scoring rubrics unlock.
            </p>
          </div>
        </div>
      )}

      {actionMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}

      {actionErr && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionErr}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Sidebar */}
        <aside className="md:col-span-3 space-y-4 text-xs">
          <nav className="p-2 rounded-xl bg-[#0B0E18] border border-white/[0.08] space-y-1">
            <button
              onClick={() => setActiveTab("queue")}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                activeTab === "queue"
                  ? "bg-white text-black font-bold"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                <span>Review Queue</span>
              </div>
              <span className="text-[10px] opacity-70">{submissions.length}</span>
            </button>

            <button
              onClick={() => setActiveTab("rubric")}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                activeTab === "rubric"
                  ? "bg-white text-black font-bold"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2">
                <Award className="w-3.5 h-3.5" />
                <span>Evaluation Rubric</span>
              </div>
              <span className="text-[10px] opacity-70">{criteria.length}</span>
            </button>
          </nav>

          <div className="p-4 rounded-xl bg-[#0B0E18] border border-white/[0.08] space-y-2 text-xs">
            <div className="text-[10px] uppercase text-slate-500 tracking-wider">
              PRD Scoring Privacy
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              PRD Rule 8: Individual scores and notes are visible strictly to host organizers and the evaluating judge. Teams see only their own final certified result.
            </p>
          </div>
        </aside>

        {/* Right Content */}
        <main className="md:col-span-9 space-y-6 text-xs">
          {activeTab === "queue" && (
            <div className="bg-[#0B0E18] border border-white/[0.08] rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight">
                    Submissions Evaluation Queue
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {submissions.length} finalized squads awaiting review.
                  </p>
                </div>
              </div>

              {!isApproved ? (
                <div className="p-12 text-center text-slate-500">
                  Submissions are locked until host confirms judge approval.
                </div>
              ) : submissions.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  No submissions have been finalized by teams yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-slate-500 uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-4 font-medium">Squad & Team ID</th>
                        <th className="py-2.5 px-4 font-medium">Problem Statement</th>
                        <th className="py-2.5 px-4 font-medium">Artifacts</th>
                        <th className="py-2.5 px-4 font-medium">My Score</th>
                        <th className="py-2.5 px-4 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {submissions.map((sub) => {
                        const hasScored = sub.scores && sub.scores.length > 0;
                        const totalScore = hasScored
                          ? sub.scores.reduce((s, c) => s + c.score, 0)
                          : 0;

                        return (
                          <tr key={sub.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3 px-4 font-bold text-white">
                              <div>{sub.team.name}</div>
                              <div className="text-[10px] text-emerald-400 font-normal">
                                {sub.team.teamId}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-300">
                              {sub.team.problemStatement?.title || "N/A"}
                            </td>
                            <td className="py-3 px-4 space-y-1">
                              {sub.link && (
                                <div>
                                  <a
                                    href={sub.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[#6366F1] hover:underline flex items-center gap-1 text-[11px]"
                                  >
                                    Demo Link <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                </div>
                              )}
                              {sub.team.codeRepo?.githubRepoUrl && (
                                <div>
                                  <a
                                    href={sub.team.codeRepo.githubRepoUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-slate-400 hover:text-white flex items-center gap-1 text-[10px]"
                                  >
                                    GitHub Repo <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {hasScored ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  SCORED ({totalScore.toFixed(1)} pts)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 text-slate-400 border border-white/10">
                                  NOT SCORED
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => openScoring(sub)}
                                className="px-3 py-1.5 rounded-lg bg-white text-black font-semibold text-[10px] hover:bg-slate-200 transition-colors flex items-center gap-1 ml-auto"
                              >
                                <Sliders className="w-3 h-3" />
                                {hasScored ? "Edit Scores" : "Evaluate & Score"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "rubric" && (
            <div className="bg-[#0B0E18] border border-white/[0.08] rounded-2xl p-6 space-y-4">
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">
                  Host-Configured Evaluation Rubric
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Weights dictate auto-computed totals for the host ranking leaderboard.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {criteria.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-white">{c.name}</div>
                      <div className="text-[10px] text-slate-500">Max: {c.maxScore} points</div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300 font-bold text-[10px]">
                        Weight: {Math.round(c.weight * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Evaluation & Scoring Modal */}
      {scoringSubmission && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B0E18] border border-white/20 rounded-2xl p-6 max-w-xl w-full space-y-5 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <span className="text-[10px] text-slate-500 uppercase">Evaluation Panel</span>
                <h3 className="text-sm font-bold text-white">
                  Score Squad: {scoringSubmission.team.name} ({scoringSubmission.team.teamId})
                </h3>
              </div>
              <button
                onClick={() => setScoringSubmission(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* Submission Architecture Snippet */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase">Architecture & Submission</span>
              <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-3">
                {scoringSubmission.description}
              </p>
              {scoringSubmission.link && (
                <div className="pt-1">
                  <a
                    href={scoringSubmission.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#6366F1] hover:underline flex items-center gap-1 text-[11px]"
                  >
                    Open Live Demo <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              )}
            </div>

            {/* Rubric Scoring Form */}
            <form onSubmit={handleSubmitScores} className="space-y-4">
              <div className="space-y-3">
                {criteria.map((c) => {
                  const inputVal = scoreInputs[c.id] || { score: 7, notes: "" };
                  return (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-white">{c.name}</span>
                          <span className="text-[10px] text-slate-500 ml-2">
                            (Weight: {Math.round(c.weight * 100)}%)
                          </span>
                        </div>
                        <div className="font-bold text-white flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={c.maxScore}
                            step={0.5}
                            value={inputVal.score}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setScoreInputs((prev) => ({
                                ...prev,
                                [c.id]: { ...prev[c.id], score: val },
                              }));
                            }}
                            className="w-14 px-2 py-0.5 text-center bg-white/[0.05] border border-white/10 rounded text-xs text-white focus:outline-none"
                          />
                          <span className="text-slate-500 text-[10px]">/ {c.maxScore}</span>
                        </div>
                      </div>

                      <input
                        type="text"
                        placeholder="Evaluation feedback or notes..."
                        value={inputVal.notes}
                        onChange={(e) => {
                          const val = e.target.value;
                          setScoreInputs((prev) => ({
                            ...prev,
                            [c.id]: { ...prev[c.id], notes: val },
                          }));
                        }}
                        className="w-full px-2.5 py-1 text-[11px] bg-white/[0.03] border border-white/5 rounded-lg text-slate-300 placeholder-slate-600 focus:outline-none"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setScoringSubmission(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingScore}
                  className="flex-1 py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {savingScore ? "Certifying..." : "Submit Certified Scores"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
