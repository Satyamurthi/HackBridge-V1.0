"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Trophy,
  Award,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Send,
  Building2,
  Check
} from "lucide-react";

interface RankedSquad {
  submissionId: string;
  teamId: string;
  officialTeamId: string;
  teamName: string;
  leadName: string;
  problemStatement: string;
  scoreCount: number;
  finalScore: number;
  computedRank: number;
  publishedResult?: {
    rank: number;
    award: string;
    prize?: string | null;
  } | null;
}

export default function HostLeaderboardPage() {
  const params = useParams();
  const hackathonId = params?.hackathonId as string;

  const [session, setSession] = useState<any>(null);
  const [hackathon, setHackathon] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<RankedSquad[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

  // Results publication state
  const [awardInputs, setAwardInputs] = useState<Record<string, { award: string; prize: string }>>({});
  const [publishing, setPublishing] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const loadLeaderboard = useCallback(async () => {
    if (!hackathonId) return;
    setFetching(true);
    try {
      const res = await fetch(`/api/v1/host/hackathons/${hackathonId}/leaderboard`);
      if (res.ok) {
        const data = await res.json();
        setHackathon(data.hackathon);
        setLeaderboard(data.leaderboard || []);

        // Prepopulate default awards
        const initialAwards: Record<string, { award: string; prize: string }> = {};
        (data.leaderboard || []).forEach((squad: RankedSquad) => {
          initialAwards[squad.teamId] = {
            award: squad.publishedResult?.award || (squad.computedRank === 1 ? "Grand Champion" : squad.computedRank === 2 ? "1st Runner Up" : squad.computedRank === 3 ? "2nd Runner Up" : "Finalist Merit"),
            prize: squad.publishedResult?.prize || (squad.computedRank === 1 ? "₹2,50,000" : squad.computedRank === 2 ? "₹1,50,000" : squad.computedRank === 3 ? "₹1,00,000" : "Certificate"),
          };
        });
        setAwardInputs(initialAwards);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, [hackathonId]);

  useEffect(() => {
    fetch("/api/v1/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user) setSession(d.user);
      })
      .catch(() => {});

    loadLeaderboard();
  }, [loadLeaderboard]);

  // Publish Results
  const handlePublishResults = async () => {
    setPublishing(true);
    setActionErr(null);
    setActionMsg(null);

    const payload = leaderboard.map((squad) => ({
      teamId: squad.teamId,
      rank: squad.computedRank,
      award: awardInputs[squad.teamId]?.award || `Rank #${squad.computedRank}`,
      prize: awardInputs[squad.teamId]?.prize || undefined,
    }));

    try {
      const res = await fetch(`/api/v1/host/hackathons/${hackathonId}/publish-results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results: payload }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionErr(data.error || "Failed to publish results");
        return;
      }

      setActionMsg(data.message);
      loadLeaderboard();
      setTimeout(() => setActionMsg(null), 5000);
    } catch {
      setActionErr("Network error publishing results");
    } finally {
      setPublishing(false);
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

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full space-y-8 font-mono">
      {/* Top Header */}
      <div>
        <Link
          href={`/dashboard/host/arena/${hackathonId}`}
          className="text-xs text-slate-500 hover:text-white flex items-center gap-1.5 transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Live Arena Command
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div className="space-y-1">
            <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] border border-white/10 text-slate-400 uppercase">
              Phase 5 · Scoring & Results Certification
            </span>
            <h1 className="font-display text-2xl font-bold text-white tracking-tight">
              Leaderboard & Results: {hackathon?.title}
            </h1>
            <p className="text-xs text-slate-400">
              PRD FR-9: Weighted rubric aggregation. Scores visible to host and admin only.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadLeaderboard}
              className="p-2 rounded-lg bg-white/[0.04] border border-white/10 text-slate-400 hover:text-white transition-colors"
              title="Refresh Leaderboard"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${fetching ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={handlePublishResults}
              disabled={publishing || leaderboard.length === 0}
              className="px-4 py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-slate-200 transition-colors disabled:opacity-40 flex items-center gap-1.5"
            >
              <Trophy className="w-3.5 h-3.5" />
              {publishing ? "Certifying..." : "Publish Certified Results"}
            </button>
          </div>
        </div>
      </div>

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

      {/* Leaderboard Table */}
      <div className="bg-[#0B0E18] border border-white/[0.08] rounded-2xl overflow-hidden text-xs">
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Weighted Evaluation Ranking</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Rankings automatically determined by weighted rubric score sum.
            </p>
          </div>
          <span className="text-[10px] text-slate-500">
            {leaderboard.length} submissions evaluated
          </span>
        </div>

        {leaderboard.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No submissions evaluated by judges yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/[0.06] text-slate-500 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-4 font-medium">Rank</th>
                  <th className="py-2.5 px-4 font-medium">Squad & Team ID</th>
                  <th className="py-2.5 px-4 font-medium">Problem Statement</th>
                  <th className="py-2.5 px-4 font-medium">Weighted Score</th>
                  <th className="py-2.5 px-4 font-medium">Award Designation</th>
                  <th className="py-2.5 px-4 font-medium">Prize / Grant</th>
                  <th className="py-2.5 px-4 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {leaderboard.map((squad) => {
                  const input = awardInputs[squad.teamId] || { award: "", prize: "" };
                  const isPublished = !!squad.publishedResult;

                  return (
                    <tr key={squad.teamId} className="hover:bg-white/[0.02] transition-colors">
                      {/* Rank */}
                      <td className="py-3 px-4 font-bold text-white">
                        <div className="flex items-center gap-1.5">
                          {squad.computedRank === 1 && <Trophy className="w-3.5 h-3.5 text-amber-400" />}
                          {squad.computedRank === 2 && <Award className="w-3.5 h-3.5 text-slate-300" />}
                          {squad.computedRank === 3 && <Award className="w-3.5 h-3.5 text-amber-600" />}
                          <span>#{squad.computedRank}</span>
                        </div>
                      </td>

                      {/* Squad */}
                      <td className="py-3 px-4 font-bold text-white">
                        <div>{squad.teamName}</div>
                        <div className="text-[10px] text-emerald-400 font-normal">
                          {squad.officialTeamId}
                        </div>
                      </td>

                      {/* Problem Statement */}
                      <td className="py-3 px-4 text-slate-300">
                        {squad.problemStatement}
                      </td>

                      {/* Final Weighted Score */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-white bg-white/5 px-2 py-0.5 rounded border border-white/10">
                          {squad.finalScore} pts
                        </span>
                        <span className="text-[10px] text-slate-500 ml-1.5">
                          ({squad.scoreCount} criteria)
                        </span>
                      </td>

                      {/* Award Designation Input */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={input.award}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAwardInputs((prev) => ({
                              ...prev,
                              [squad.teamId]: { ...prev[squad.teamId], award: val },
                            }));
                          }}
                          className="px-2.5 py-1 text-[11px] bg-white/[0.04] border border-white/10 rounded-lg text-white focus:outline-none w-40"
                        />
                      </td>

                      {/* Prize Input */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={input.prize}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAwardInputs((prev) => ({
                              ...prev,
                              [squad.teamId]: { ...prev[squad.teamId], prize: val },
                            }));
                          }}
                          className="px-2.5 py-1 text-[11px] bg-white/[0.04] border border-white/10 rounded-lg text-white focus:outline-none w-28"
                        />
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-right">
                        {isPublished ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            PUBLISHED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 text-slate-400 border border-white/10">
                            DRAFT
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
