"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  History,
  Award,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Search,
  ExternalLink,
  Building,
  ShieldCheck,
  FileCheck,
  Edit3
} from "lucide-react";

interface EvaluatedSquad {
  id: string;
  name: string;
  college: string;
  domain?: { name: string } | null;
  problemStatement?: { title: string } | null;
  grandTotal: number;
  maxTotal: number;
  percentage: number;
  scores: Array<{
    criterionId: string;
    score: number;
    notes?: string | null;
    isDraft?: boolean;
  }>;
  isDraft: boolean;
  lastUpdated: string;
}

export default function JudgeHistoryPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [evaluatedSquads, setEvaluatedSquads] = useState<EvaluatedSquad[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hackathonTitle, setHackathonTitle] = useState("");

  const loadData = useCallback(async () => {
    setFetching(true);
    try {
      const [meRes, subRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/judge/submissions"),
      ]);

      if (meRes.ok) {
        const meData = await meRes.json();
        setSession(meData.user);
      }

      if (subRes.ok) {
        const data = await subRes.json();
        if (data.hackathon) {
          setHackathonTitle(data.hackathon.title);
        }

        const criteriaList = data.rubricCriteria || [];
        const maxMarksTotal = criteriaList.reduce((sum: number, c: any) => sum + (c.maxMarks || 0), 0) || 100;

        const evaluated: EvaluatedSquad[] = (data.submissions || [])
          .filter((sub: any) => sub.scores && sub.scores.length > 0)
          .map((sub: any) => {
            const sumScore = sub.scores.reduce((sum: number, s: any) => sum + (Number(s.score) || 0), 0);
            const isAnyDraft = sub.scores.some((s: any) => s.isDraft);

            return {
              id: sub.team.id,
              name: sub.team.name,
              college: sub.team.college,
              domain: sub.team.domain,
              problemStatement: sub.team.problemStatement,
              grandTotal: Math.round(sumScore * 10) / 10,
              maxTotal: maxMarksTotal,
              percentage: Math.min(100, Math.round((sumScore / (maxMarksTotal || 100)) * 100)),
              scores: sub.scores,
              isDraft: isAnyDraft,
              lastUpdated: sub.team.lastProgressUpdate || new Date().toISOString(),
            };
          });

        setEvaluatedSquads(evaluated);
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

  const filteredSquads = evaluatedSquads.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.college.toLowerCase().includes(q) ||
      (s.problemStatement?.title || "").toLowerCase().includes(q) ||
      (s.domain?.name || "").toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#6366F1] border-t-transparent animate-spin" />
          <span className="text-xs font-mono text-[#94A3B8]">Loading Evaluation History...</span>
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
              <History className="w-5 h-5 text-[#6366F1]" />
              <h1 className="text-xl font-extrabold text-white">Evaluation History & Certified Scorecards</h1>
            </div>
          </div>
          <p className="text-xs text-[#94A3B8] ml-11">
            Track and audit all squad scores you have submitted across Phase 1 to Phase 4 deliverables.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
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
            <span>Evaluation Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#0B0E18]/80 border border-white/[0.08] space-y-1">
          <span className="text-[10px] text-[#64748B] uppercase font-bold">Total Scored Squads</span>
          <div className="text-2xl font-black text-white">{evaluatedSquads.length}</div>
          <div className="text-[11px] text-[#94A3B8]">{hackathonTitle || "Current Arena"}</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0B0E18]/80 border border-white/[0.08] space-y-1">
          <span className="text-[10px] text-[#64748B] uppercase font-bold">Certified Evaluations</span>
          <div className="text-2xl font-black text-emerald-400">
            {evaluatedSquads.filter((s) => !s.isDraft).length}
          </div>
          <div className="text-[11px] text-emerald-400/80">Submitted to Arena Leaderboard</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0B0E18]/80 border border-white/[0.08] space-y-1">
          <span className="text-[10px] text-[#64748B] uppercase font-bold">Draft Scorecards</span>
          <div className="text-2xl font-black text-amber-400">
            {evaluatedSquads.filter((s) => s.isDraft).length}
          </div>
          <div className="text-[11px] text-amber-400/80">Pending Final Certification</div>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="flex items-center gap-3 p-2 rounded-2xl bg-[#0B0E18]/80 border border-white/[0.08]">
        <Search className="w-4 h-4 text-[#64748B] ml-2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by squad name, college, domain track, or challenge title..."
          className="w-full bg-transparent border-none text-xs text-white placeholder-[#64748B] focus:outline-none"
        />
      </div>

      {/* SQUADS REGISTRY TABLE */}
      <div className="space-y-4">
        {filteredSquads.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-[#0B0E18]/50 border border-white/[0.08] space-y-3">
            <History className="w-8 h-8 text-[#64748B] mx-auto" />
            <h3 className="text-sm font-bold text-white">No Evaluation Records Found</h3>
            <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
              {searchQuery
                ? "No scored squads matched your search query."
                : "You haven't scored any squads yet. Head to the evaluation queue to begin reviewing deliverables."}
            </p>
            <Link
              href="/dashboard/judge?tab=queue"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6366F1] text-xs font-bold text-white hover:bg-[#4F46E5] transition-all"
            >
              <span>Go to Evaluation Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSquads.map((squad) => (
              <div
                key={squad.id}
                className="p-5 rounded-2xl bg-[#0B0E18]/70 border border-white/[0.08] hover:border-white/20 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-extrabold text-white">{squad.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                        squad.isDraft
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      }`}
                    >
                      {squad.isDraft ? <Clock className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                      <span>{squad.isDraft ? "DRAFT SCORECARD" : "CERTIFIED FINAL"}</span>
                    </span>

                    {squad.domain && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-[#818CF8] bg-[#6366F1]/10 border border-[#6366F1]/20">
                        {squad.domain.name}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#94A3B8]">
                    <span className="flex items-center gap-1 text-[#CBD5E1]">
                      <Building className="w-3 h-3 text-[#64748B]" />
                      <span>{squad.college}</span>
                    </span>

                    {squad.problemStatement && (
                      <span className="text-[#64748B] truncate max-w-sm">
                        Challenge: {squad.problemStatement.title}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Score Breakdown Pill */}
                  <div className="text-right">
                    <div className="flex items-baseline gap-1 justify-end">
                      <span className="text-xl font-black text-white">{squad.grandTotal}</span>
                      <span className="text-xs text-[#64748B]">/ {squad.maxTotal}</span>
                    </div>
                    <div className="text-[10px] font-mono text-[#818CF8]">{squad.percentage}% Marks</div>
                  </div>

                  <button
                    onClick={() => router.push(`/dashboard/judge/evaluate/${squad.id}`)}
                    className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-xs font-bold text-white transition-all flex items-center gap-2"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#818CF8]" />
                    <span>Re-evaluate</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
