"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  Scale, 
  FileText, 
  Award, 
  Clock, 
  ExternalLink,
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
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 bg-transparent">
        <div className="h-64 rounded-2xl bg-[#0B0E18]/70 border border-white/[0.08] animate-pulse" />
      </div>
    );
  }

  if (!session || (session.role !== "JUDGE" && session.role !== "SUPER_ADMIN")) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[60vh] font-mono bg-transparent">
        <div className="w-12 h-12 rounded-xl bg-[#0B0E18]/70 border border-white/[0.08] shadow-sm flex items-center justify-center mb-4">
          <Scale className="w-6 h-6 text-[#6366F1]" />
        </div>
        <h1 className="font-display text-xl font-extrabold text-[#F8FAFC] mb-2 tracking-tight">Judge Credentials Required</h1>
        <p className="text-sm text-[#94A3B8] mb-6 max-w-sm">Please authenticate with an authorized Judge panel account.</p>
        <Link href="/login" className="px-5 py-2.5 rounded-xl bg-[#6366F1] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#4F46E5] shadow-sm transition-all">
          Judge Sign In
        </Link>
      </div>
    );
  }

  const isApproved = approvalStatus === "APPROVED";
  const hackathonTitle = hackathon?.title || "HackBridge National Grand Arena";

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full space-y-8 font-mono bg-transparent">
      {/* Header Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-white/[0.08] gap-4">
        <div className="space-y-1">
          <div className="text-[11px] text-[#64748B] uppercase tracking-wider flex items-center gap-2">
            <span>HackBridge</span>
            <span>/</span>
            <span>Evaluation Panel</span>
            <span>/</span>
            <span className="text-[#6366F1] font-bold">{hackathonTitle}</span>
          </div>
          <h1 className="font-display text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
            Judge: {session.name}
          </h1>
          <p className="text-sm text-[#94A3B8]">
            {session.email} · Assigned Track: {hackathonTitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-[#0B0E18]/70 border border-white/[0.08] shadow-sm text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#111524] transition-colors"
            title="Refresh submissions"
          >
            <RefreshCw className={`w-4 h-4 ${fetching ? "animate-spin" : ""}`} />
          </button>
          <span className={`px-3 py-1 rounded-full text-[11px] font-extrabold border ${
            isApproved
              ? "bg-[#6366F1]/20 text-[#818CF8] border-[#6366F1]/40"
              : "bg-amber-500/10 text-amber-300 border-amber-500/30"
          }`}>
            PANEL STATUS: {approvalStatus}
          </span>
        </div>
      </div>

      {!isApproved && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-3 shadow-sm">
          <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-extrabold text-amber-300">Awaiting Host Authorization</span>
            <p className="text-amber-200/80 leading-relaxed text-[11px]">
              In accordance with PRD Rule 5, judge accounts must be approved by the hackathon host before submission repositories and scoring rubrics unlock.
            </p>
          </div>
        </div>
      )}

      {actionMsg && (
        <div className="p-3.5 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/30 text-xs text-[#818CF8] flex items-center gap-2 font-bold shadow-sm">
          <Check className="w-4 h-4 shrink-0 text-[#6366F1]" />
          <span>{actionMsg}</span>
        </div>
      )}

      {actionErr && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2 font-bold shadow-sm">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{actionErr}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Sidebar */}
        <aside className="md:col-span-3 space-y-4 text-xs">
          <nav className="p-2 rounded-2xl bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] shadow-sm space-y-1">
            <button
              onClick={() => setActiveTab("queue")}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center justify-between ${
                activeTab === "queue"
                  ? "bg-[#6366F1] text-white font-bold shadow-sm"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>Review Queue</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${activeTab === "queue" ? "bg-white/20 text-white" : "bg-white/[0.06] text-[#94A3B8]"}`}>{submissions.length}</span>
            </button>

            <button
              onClick={() => setActiveTab("rubric")}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center justify-between ${
                activeTab === "rubric"
                  ? "bg-[#6366F1] text-white font-bold shadow-sm"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4" />
                <span>Evaluation Rubric</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${activeTab === "rubric" ? "bg-white/20 text-white" : "bg-white/[0.06] text-[#94A3B8]"}`}>{criteria.length}</span>
            </button>
          </nav>

          <div className="p-4 rounded-2xl bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] shadow-sm space-y-2 text-xs">
            <div className="text-[10px] uppercase text-[#64748B] tracking-wider font-bold">
              PRD Scoring Privacy
            </div>
            <p className="text-[11px] text-[#94A3B8] leading-relaxed">
              PRD Rule 8: Individual scores and notes are visible strictly to host organizers and the evaluating judge. Teams see only their own final certified result.
            </p>
          </div>
        </aside>

        {/* Right Content */}
        <main className="md:col-span-9 space-y-6 text-xs">
          {activeTab === "queue" && (
            <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-[#F8FAFC] tracking-tight">
                    Submissions Evaluation Queue
                  </h2>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    {submissions.length} finalized squads awaiting review.
                  </p>
                </div>
              </div>

              {!isApproved ? (
                <div className="p-12 text-center text-[#64748B]">
                  Submissions are locked until host confirms judge approval.
                </div>
              ) : submissions.length === 0 ? (
                <div className="p-12 text-center text-[#64748B]">
                  No submissions have been finalized by teams yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/[0.08] bg-[#111524]/60 text-[#94A3B8] uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-4 font-bold">Squad & Team ID</th>
                        <th className="py-3 px-4 font-bold">Problem Statement</th>
                        <th className="py-3 px-4 font-bold">Artifacts</th>
                        <th className="py-3 px-4 font-bold">My Score</th>
                        <th className="py-3 px-4 font-bold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {submissions.map((sub) => {
                        const hasScored = sub.scores && sub.scores.length > 0;
                        const totalScore = hasScored
                          ? sub.scores.reduce((s, c) => s + c.score, 0)
                          : 0;

                        return (
                          <tr key={sub.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3.5 px-4 font-bold text-[#F8FAFC]">
                              <div>{sub.team.name}</div>
                              <div className="text-[11px] text-[#6366F1] font-extrabold">
                                {sub.team.teamId}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-[#94A3B8]">
                              {sub.team.problemStatement?.title || "N/A"}
                            </td>
                            <td className="py-3.5 px-4 space-y-1">
                              {sub.link && (
                                <div>
                                  <a
                                    href={sub.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[#6366F1] font-bold hover:underline flex items-center gap-1 text-[11px]"
                                  >
                                    Demo Link <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              )}
                              {sub.team.codeRepo?.githubRepoUrl && (
                                <div>
                                  <a
                                    href={sub.team.codeRepo.githubRepoUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[#94A3B8] hover:text-[#F8FAFC] flex items-center gap-1 text-[11px]"
                                  >
                                    GitHub Repo <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              {hasScored ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/40">
                                  SCORED ({totalScore.toFixed(1)} pts)
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-white/[0.04] text-[#94A3B8] border border-white/[0.08]">
                                  NOT SCORED
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => openScoring(sub)}
                                className="px-3.5 py-1.5 rounded-xl bg-[#6366F1] text-white font-bold text-[10px] hover:bg-[#4F46E5] shadow-sm transition-all flex items-center gap-1 ml-auto font-mono uppercase tracking-wider"
                              >
                                <Sliders className="w-3.5 h-3.5" />
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
            <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] rounded-2xl p-6 space-y-4 shadow-sm">
              <div>
                <h2 className="text-base font-extrabold text-[#F8FAFC] tracking-tight">
                  Host-Configured Evaluation Rubric
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Weights dictate auto-computed totals for the host ranking leaderboard.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {criteria.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-xl bg-[#111524]/60 border border-white/[0.06] flex items-center justify-between"
                  >
                    <div>
                      <div className="font-extrabold text-[#F8FAFC]">{c.name}</div>
                      <div className="text-[11px] text-[#94A3B8]">Max: {c.maxScore} points</div>
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-full bg-white/[0.04] text-[#F8FAFC] border border-white/[0.08] font-extrabold text-[10px]">
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0B0E18]/95 border border-white/[0.12] shadow-2xl rounded-2xl p-6 max-w-xl w-full space-y-5 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <span className="text-[10px] text-[#64748B] uppercase font-bold">Evaluation Panel</span>
                <h3 className="text-base font-extrabold text-[#F8FAFC]">
                  Score Squad: {scoringSubmission.team.name} ({scoringSubmission.team.teamId})
                </h3>
              </div>
              <button
                onClick={() => setScoringSubmission(null)}
                className="text-[#94A3B8] hover:text-[#F8FAFC] text-sm p-1"
              >
                ✕
              </button>
            </div>

            {/* Submission Architecture Snippet */}
            <div className="p-4 rounded-xl bg-[#111524]/60 border border-white/[0.06] space-y-1">
              <span className="text-[10px] text-[#64748B] uppercase font-bold">Architecture & Submission</span>
              <p className="text-[#F8FAFC] text-xs leading-relaxed line-clamp-3">
                {scoringSubmission.description}
              </p>
              {scoringSubmission.link && (
                <div className="pt-1">
                  <a
                    href={scoringSubmission.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#6366F1] font-bold hover:underline flex items-center gap-1 text-xs"
                  >
                    Open Live Demo <ExternalLink className="w-3.5 h-3.5" />
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
                      className="p-4 rounded-xl bg-[#111524]/60 border border-white/[0.06] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-extrabold text-[#F8FAFC]">{c.name}</span>
                          <span className="text-[11px] text-[#64748B] ml-2 font-bold">
                            (Weight: {Math.round(c.weight * 100)}%)
                          </span>
                        </div>
                        <div className="font-extrabold text-[#F8FAFC] flex items-center gap-1">
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
                            className="w-16 px-2 py-1 text-center bg-[#0B0E18] border border-white/[0.1] rounded-lg text-xs font-bold text-[#F8FAFC] focus:outline-none focus:border-[#6366F1]"
                          />
                          <span className="text-[#64748B] text-[11px]">/ {c.maxScore}</span>
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
                        className="w-full px-3 py-1.5 text-xs bg-[#0B0E18] border border-white/[0.1] rounded-lg text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#6366F1]"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setScoringSubmission(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-[#F8FAFC] font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingScore}
                  className="flex-1 py-2.5 rounded-xl bg-[#6366F1] text-white font-bold text-xs hover:bg-[#4F46E5] shadow-sm transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider"
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
