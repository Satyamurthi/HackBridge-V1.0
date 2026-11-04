"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Trophy,
  Award,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Building,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Eye,
  Layers
} from "lucide-react";

interface RankedSquad {
  submissionId: string;
  teamId: string;
  officialTeamId: string;
  teamName: string;
  college?: string;
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

export default function JudgeLeaderboardPage() {
  const params = useParams();
  const router = useRouter();
  const hackathonId = params?.hackathonId as string;

  const [hackathon, setHackathon] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<RankedSquad[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLeaderboard = useCallback(async () => {
    if (!hackathonId) return;
    setFetching(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/host/hackathons/${hackathonId}/leaderboard`);
      if (res.ok) {
        const data = await res.json();
        setHackathon(data.hackathon);
        setLeaderboard(data.leaderboard || []);
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to load arena leaderboard.");
      }
    } catch {
      setError("Network communication error. Please try again.");
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, [hackathonId]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#6366F1] border-t-transparent animate-spin" />
          <span className="text-xs font-mono text-[#94A3B8]">Loading Arena Standings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in font-mono max-w-6xl mx-auto px-4 py-8">
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-3xl bg-[#0B0E18]/70 border border-white/[0.08]">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/judge"
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[#94A3B8] hover:text-white transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2 text-[#818CF8]">
              <Trophy className="w-5 h-5 text-amber-400" />
              <h1 className="text-xl font-extrabold text-white">Live Arena Standings & Grand Totals</h1>
            </div>
          </div>
          <p className="text-xs text-[#94A3B8] ml-11">
            {hackathon?.title || "Hackathon Arena"} · Computed weighted jury rankings across Phase 1 to Phase 4
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadLeaderboard}
            disabled={fetching}
            className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-bold text-white transition-all flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${fetching ? "animate-spin text-[#818CF8]" : ""}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/dashboard/judge?tab=queue"
            className="px-4 py-2 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold transition-all shadow-lg shadow-[#6366F1]/20 flex items-center gap-2"
          >
            <span>Return to Evaluation Queue</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {error ? (
        <div className="p-8 text-center rounded-3xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs space-y-3">
          <AlertCircle className="w-8 h-8 mx-auto" />
          <p>{error}</p>
          <Link
            href="/dashboard/judge"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white font-bold"
          >
            Back to Dashboard
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span>Ranked Squad Cohort ({leaderboard.length})</span>
            <span className="text-[11px] text-[#818CF8]">v5.0 Single Unified Rubric Scores</span>
          </div>

          {leaderboard.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-[#0B0E18]/50 border border-white/[0.08] space-y-3">
              <Trophy className="w-8 h-8 text-[#64748B] mx-auto" />
              <h3 className="text-sm font-bold text-white">No Certified Scores Yet</h3>
              <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
                Once jury evaluators certify their scores for participating squads, the ranked leaderboard will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((squad) => {
                const isChampion = squad.computedRank === 1;
                const isRunnerUp = squad.computedRank === 2 || squad.computedRank === 3;

                return (
                  <div
                    key={squad.teamId}
                    className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                      isChampion
                        ? "bg-amber-500/10 border-amber-500/30 shadow-lg shadow-amber-500/5"
                        : isRunnerUp
                        ? "bg-[#6366F1]/10 border-[#6366F1]/30"
                        : "bg-[#0B0E18]/70 border-white/[0.08]"
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {/* Rank Badge */}
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shrink-0 ${
                          isChampion
                            ? "bg-amber-400 text-black shadow-lg shadow-amber-400/20"
                            : isRunnerUp
                            ? "bg-[#818CF8] text-white"
                            : "bg-white/[0.06] text-[#94A3B8] border border-white/10"
                        }`}
                      >
                        #{squad.computedRank}
                      </div>

                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-extrabold text-white">{squad.teamName}</span>
                          {squad.publishedResult?.award && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {squad.publishedResult.award}
                            </span>
                          )}
                          <span className="text-xs text-[#64748B] font-mono">
                            ID: {squad.officialTeamId || squad.teamId.slice(0, 8)}
                          </span>
                        </div>

                        <div className="text-xs text-[#94A3B8] flex flex-wrap items-center gap-4">
                          <span>Lead: {squad.leadName}</span>
                          {squad.problemStatement && (
                            <span>Challenge: {squad.problemStatement}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="flex items-baseline gap-1 justify-end">
                          <span className="text-2xl font-black text-white">{squad.finalScore}</span>
                          <span className="text-xs text-[#64748B]">Pts</span>
                        </div>
                        <div className="text-[10px] text-[#94A3B8]">
                          {squad.scoreCount} {squad.scoreCount === 1 ? "Evaluation" : "Evaluations"}
                        </div>
                      </div>

                      <Link
                        href={`/dashboard/judge/evaluate/${squad.teamId}`}
                        className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-xs font-bold text-white transition-all flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#818CF8]" />
                        <span>Inspect & Score</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
