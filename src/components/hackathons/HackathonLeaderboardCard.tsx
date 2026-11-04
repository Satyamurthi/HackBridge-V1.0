"use client";

import React, { useState, useEffect } from "react";
import {
  Trophy,
  Award,
  Crown,
  Medal,
  Sparkles,
  Building,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export interface RankedSquad {
  submissionId: string;
  teamId: string;
  officialTeamId: string;
  teamName: string;
  college?: string;
  leadName: string;
  domain?: string | null;
  problemStatement?: string | null;
  problemCode?: string | null;
  finalScore: number;
  maxMarks: number;
  percentage: number;
  computedRank: number;
  trophy: "GOLD" | "SILVER" | "BRONZE" | null;
  isWinner: boolean;
  awardLabel: string;
  isDraft?: boolean;
}

interface HackathonLeaderboardProps {
  hackathonId: string;
  hackathonTitle?: string;
  initialData?: RankedSquad[];
}

export default function HackathonLeaderboardCard({
  hackathonId,
  hackathonTitle,
  initialData,
}: HackathonLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<RankedSquad[]>(initialData || []);
  const [loading, setLoading] = useState(!initialData);
  const [hasScores, setHasScores] = useState(false);
  const [isHostApproved, setIsHostApproved] = useState<boolean>(true);
  const [pendingApprovalMsg, setPendingApprovalMsg] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetch(`/api/v1/hackathons/${hackathonId}/leaderboard`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data) {
          setIsHostApproved(data.isHostApproved !== false);
          setPendingApprovalMsg(data.message || null);
          setHasScores(Boolean(data.hasScores));
          setLeaderboard(data.leaderboard || []);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [hackathonId]);

  if (loading) {
    return (
      <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] rounded-3xl p-6 space-y-4 animate-pulse">
        <div className="h-6 w-48 bg-white/[0.04] rounded-lg" />
        <div className="h-20 bg-white/[0.02] rounded-2xl" />
      </div>
    );
  }

  // If judge has completed evaluation but Host has not approved results yet
  if (hasScores && !isHostApproved && (!leaderboard || leaderboard.length === 0)) {
    return (
      <div className="bg-[#0B0E18]/80 backdrop-blur-md border border-amber-500/20 rounded-3xl p-6 font-mono text-xs space-y-3 shadow-xl">
        <div className="flex items-center gap-2.5 text-amber-400 font-bold text-sm">
          <Clock className="w-4 h-4 animate-spin text-amber-400" />
          <span>Evaluation Completed · Pending Host Approval</span>
        </div>
        <p className="text-slate-400 text-[11px] leading-relaxed">
          {pendingApprovalMsg ||
            "Judges have finished adding marks for this hackathon. Official marks, overall leaderboard standings, and trophy winners will be revealed to all students as soon as the Host officially reviews and approves the results."}
        </p>
      </div>
    );
  }

  // If judge has not added marks yet, the leaderboard does not appear
  if (!hasScores || leaderboard.length === 0) {
    return null;
  }

  return (
    <div
      id="leaderboard"
      className="bg-[#0B0E18]/80 backdrop-blur-md border border-white/[0.12] rounded-3xl overflow-hidden shadow-2xl relative"
    >
      {/* GLOW DECORATOR */}
      <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent pointer-events-none" />

      {/* HEADER BAR */}
      <div className="p-6 border-b border-white/[0.08] bg-gradient-to-r from-white/[0.03] via-amber-500/5 to-transparent flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400">
              <Trophy className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-white tracking-tight font-display">
                  Arena Leaderboard & Official Standings
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Jury Certified</span>
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] font-mono">
                Evaluated by official judges · Top 3 podium rankers awarded championship trophies
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-mono text-[#94A3B8] hover:text-white flex items-center gap-1.5 transition-all"
        >
          <span>{expanded ? "Collapse" : "Expand"} ({leaderboard.length})</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {expanded && (
        <div className="p-6 space-y-4">
          {leaderboard.map((squad) => {
            const isRank1 = squad.computedRank === 1;
            const isRank2 = squad.computedRank === 2;
            const isRank3 = squad.computedRank === 3;
            const isTopThree = isRank1 || isRank2 || isRank3;

            return (
              <div
                key={squad.teamId}
                className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden ${
                  isRank1
                    ? "bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border-amber-400/40 shadow-xl shadow-amber-500/10"
                    : isRank2
                    ? "bg-gradient-to-r from-slate-300/15 via-slate-300/5 to-transparent border-slate-300/30 shadow-lg shadow-slate-300/5"
                    : isRank3
                    ? "bg-gradient-to-r from-amber-700/20 via-amber-700/5 to-transparent border-amber-600/30 shadow-md shadow-amber-700/5"
                    : "bg-[#0B0E18]/60 border-white/[0.06] hover:border-white/15"
                }`}
              >
                {/* TROPHY WATERMARK BACKGROUND FOR TOP 3 */}
                {isTopThree && (
                  <div
                    className={`absolute -right-4 -bottom-6 pointer-events-none opacity-10 select-none text-8xl font-black ${
                      isRank1 ? "text-amber-400" : isRank2 ? "text-slate-300" : "text-amber-600"
                    }`}
                  >
                    {isRank1 ? "🏆" : isRank2 ? "🥈" : "🥉"}
                  </div>
                )}

                <div className="flex items-center gap-4 flex-1 relative z-10">
                  {/* RANK BADGE WITH TROPHY DESIGNATION */}
                  <div
                    className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 font-mono ${
                      isRank1
                        ? "bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/30"
                        : isRank2
                        ? "bg-gradient-to-b from-slate-200 to-slate-400 text-slate-950 font-black shadow-lg shadow-slate-300/20"
                        : isRank3
                        ? "bg-gradient-to-b from-amber-600 to-amber-800 text-white font-black shadow-lg shadow-amber-700/20"
                        : "bg-white/[0.04] text-[#94A3B8] border border-white/10 font-bold"
                    }`}
                  >
                    <span className="text-xs font-black">#{squad.computedRank}</span>
                    {isRank1 && <span className="text-[10px] leading-none">🏆</span>}
                    {isRank2 && <span className="text-[10px] leading-none">🥈</span>}
                    {isRank3 && <span className="text-[10px] leading-none">🥉</span>}
                  </div>

                  {/* SQUAD DETAILS */}
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* TEAM NAME WITH TROPHY INLINE BACKGROUND EMBELLISHMENT */}
                      <span className="text-base font-extrabold text-white flex items-center gap-2">
                        <span>{squad.teamName}</span>

                        {/* TROPHY ICON BEHIND / NEXT TO TEAM NAME */}
                        {isRank1 && (
                          <span
                            title="Gold Trophy — 1st Place Champion"
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-sm shadow-amber-500/20"
                          >
                            <span>🏆</span>
                            <span className="text-[10px] uppercase font-bold tracking-wider">Gold Trophy</span>
                          </span>
                        )}

                        {isRank2 && (
                          <span
                            title="Silver Trophy — 2nd Place Runner Up"
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-200/20 text-slate-200 border border-slate-300/40 shadow-sm shadow-slate-300/10"
                          >
                            <span>🥈</span>
                            <span className="text-[10px] uppercase font-bold tracking-wider">Silver Trophy</span>
                          </span>
                        )}

                        {isRank3 && (
                          <span
                            title="Bronze Trophy — 3rd Place Runner Up"
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-700/25 text-amber-300 border border-amber-600/40 shadow-sm shadow-amber-700/10"
                          >
                            <span>🥉</span>
                            <span className="text-[10px] uppercase font-bold tracking-wider">Bronze Trophy</span>
                          </span>
                        )}
                      </span>

                      {squad.domain && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono text-[#818CF8] bg-[#6366F1]/10 border border-[#6366F1]/20">
                          {squad.domain}
                        </span>
                      )}

                      <span className="text-[10px] font-mono text-[#64748B]">
                        ID: {squad.officialTeamId}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#94A3B8] font-mono">
                      {squad.college && (
                        <span className="flex items-center gap-1 text-[#CBD5E1]">
                          <Building className="w-3 h-3 text-[#64748B]" />
                          <span>{squad.college}</span>
                        </span>
                      )}
                      <span>•</span>
                      <span>Lead: {squad.leadName}</span>
                      {squad.problemStatement && (
                        <>
                          <span>•</span>
                          <span className="text-[#818CF8] truncate max-w-xs">
                            {squad.problemCode ? `[${squad.problemCode}] ` : ""}{squad.problemStatement}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* SCORES AND AWARD BADGE */}
                <div className="flex items-center gap-4 shrink-0 text-right font-mono relative z-10">
                  <div>
                    <div className="flex items-baseline gap-1 justify-end">
                      <span className="text-xl font-black text-white">{squad.finalScore}</span>
                      <span className="text-xs text-[#64748B]">/ {squad.maxMarks}</span>
                    </div>
                    <div className="text-[11px] font-bold text-[#818CF8]">
                      {squad.percentage}% Marks
                    </div>
                  </div>

                  {squad.awardLabel && (
                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider ${
                        isRank1
                          ? "bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/20"
                          : isRank2
                          ? "bg-slate-200 text-slate-950 font-black"
                          : isRank3
                          ? "bg-amber-700/40 text-amber-200 border border-amber-600/40"
                          : "bg-white/[0.04] text-[#94A3B8] border border-white/[0.08]"
                      }`}
                    >
                      {squad.awardLabel}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
