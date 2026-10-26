"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Trophy,
  Award,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  Code2,
  Calendar,
  Users,
  ShieldCheck,
  CheckCircle2,
  Lock
} from "lucide-react";

interface TeamHistoryItem {
  id: string;
  teamId: string | null;
  name: string;
  status: string;
  hackathon: {
    id: string;
    title: string;
    slug: string;
    startAt: string;
    endAt: string;
  };
  members: Array<{
    role: string;
    student: {
      hackathonId: string;
      user: { name: string; email: string };
    };
  }>;
  problemStatement?: { title: string } | null;
  codeRepo?: { githubRepoUrl: string } | null;
  result?: {
    rank: number;
    award: string;
    prize?: string | null;
    publishedAt: string;
  } | null;
}

export default function StudentHistoryPage() {
  const [session, setSession] = useState<any>(null);
  const [history, setHistory] = useState<TeamHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

  const loadData = useCallback(async () => {
    setFetching(true);
    try {
      const [meRes, teamsRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/teams"),
      ]);

      if (meRes.ok) {
        const d = await meRes.json();
        if (d?.user) setSession(d.user);
      }

      if (teamsRes.ok) {
        const tData = await teamsRes.json();
        const rawTeams: any[] = tData.teams || [];

        // For each team, fetch their certified result from /api/v1/teams/[id]/result
        // Enforces PRD Rule 8: Teams see only their own results
        const enriched = await Promise.all(
          rawTeams.map(async (t) => {
            try {
              const res = await fetch(`/api/v1/teams/${t.id}/result`);
              if (res.ok) {
                const rData = await res.json();
                return { ...t, result: rData.result };
              }
            } catch {
              // ignore
            }
            return t;
          })
        );

        setHistory(enriched);
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-16">
        <div className="h-64 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse" />
      </div>
    );
  }

  if (!session || session.role !== "STUDENT") {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center font-mono">
        <h1 className="text-lg font-bold text-white mb-2">Student Credentials Required</h1>
        <Link href="/login" className="text-xs text-[#6366F1] underline">
          Student Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full space-y-8 font-mono">
      {/* Top Header */}
      <div>
        <Link
          href="/dashboard/student"
          className="text-xs text-slate-500 hover:text-white flex items-center gap-1.5 transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Student Console
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div className="space-y-1">
            <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] border border-white/10 text-slate-400 uppercase">
              Phase 5 · Builder Records & History
            </span>
            <h1 className="font-display text-2xl font-bold text-white tracking-tight">
              Hackathon History & Award Showcase
            </h1>
            <p className="text-xs text-slate-400">
              PRD Non-Negotiable Rule 8: Squad privacy strictly enforced. Results visible to squad members only.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="p-2 rounded-lg bg-white/[0.04] border border-white/10 text-slate-400 hover:text-white transition-colors"
              title="Refresh History"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${fetching ? "animate-spin" : ""}`} />
            </button>
            <span className="px-2.5 py-1 rounded text-[11px] font-bold bg-white/5 text-slate-300 border border-white/10">
              EVENTS ATTENDED: {history.length}
            </span>
          </div>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="p-16 rounded-2xl bg-[#0B0E18] border border-white/[0.08] text-center space-y-3 text-xs">
          <Trophy className="w-8 h-8 text-slate-600 mx-auto" />
          <h2 className="text-sm font-bold text-white">No Hackathon Track Records Yet</h2>
          <p className="text-slate-400 max-w-sm mx-auto">
            Once you register and compete in arena events, your official squad awards, code repositories, and achievements will appear here.
          </p>
          <div className="pt-2">
            <Link
              href="/hackathons"
              className="px-4 py-2 rounded-lg bg-white text-black font-bold text-xs inline-block hover:bg-slate-200 transition-colors"
            >
              Explore Hackathons →
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {history.map((item) => (
            <div
              key={item.id}
              className="p-6 rounded-2xl bg-[#0B0E18] border border-white/[0.08] space-y-5 text-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Track</div>
                  <h3 className="font-display text-lg font-bold text-white">
                    {item.hackathon.title}
                  </h3>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>Squad: <strong className="text-white">{item.name}</strong></span>
                    {item.teamId && (
                      <span className="px-2 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                        {item.teamId}
                      </span>
                    )}
                  </div>
                </div>

                {item.result ? (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-right space-y-0.5 shrink-0">
                    <div className="text-[10px] text-amber-400 uppercase font-bold flex items-center gap-1 justify-end">
                      <Trophy className="w-3.5 h-3.5" /> Certified Result
                    </div>
                    <div className="text-sm font-bold text-white">
                      {item.result.award} (#{item.result.rank})
                    </div>
                    {item.result.prize && (
                      <div className="text-[11px] text-emerald-400 font-bold">
                        Prize: {item.result.prize}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-right text-[11px] text-slate-500">
                    Results pending host publication
                  </div>
                )}
              </div>

              {/* Squad Details & Stored Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="text-[10px] text-slate-500 uppercase">Assigned Problem</div>
                  <div className="font-bold text-white">
                    {item.problemStatement?.title || "General Track"}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="text-[10px] text-slate-500 uppercase">Stored Code Repository</div>
                  {item.codeRepo?.githubRepoUrl ? (
                    <a
                      href={item.codeRepo.githubRepoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#6366F1] font-bold hover:underline flex items-center gap-1"
                    >
                      GitHub Repo <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-slate-500">Pending repo link</span>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="text-[10px] text-slate-500 uppercase">Squad Members</div>
                  <div className="text-slate-300">
                    {item.members.map((m) => m.student.user.name).join(", ")}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
