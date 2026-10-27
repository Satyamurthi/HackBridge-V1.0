"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  Trophy, 
  Terminal, 
  Clock, 
  ExternalLink, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  ArrowRight,
  FileCode,
  AlertCircle
} from "lucide-react";

interface ProblemStatementItem {
  id: string;
  title: string;
  description?: string;
}

interface DomainItem {
  id: string;
  name: string;
  revealAt?: string | null;
  problemStatements: ProblemStatementItem[];
}

interface HackathonItem {
  id: string;
  title: string;
  slug: string;
  fee: number;
  paymentMode: string;
  startAt: string;
  endAt: string;
  status: string;
  domains?: DomainItem[];
}

interface TeamItem {
  id: string;
  teamId: string | null;
  name: string;
  status: string;
  hackathon: HackathonItem;
  problemStatement?: {
    id: string;
    title: string;
  } | null;
  submission?: {
    id: string;
    locked: boolean;
    submittedAt?: string | null;
    githubRepoUrl?: string | null;
  } | null;
  payment?: {
    status: string;
  } | null;
}

export default function MyHackathonsPage() {
  const [session, setSession] = useState<any>(null);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Time ticker for live countdowns
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [meRes, teamsRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/teams"),
      ]);

      if (meRes.ok) {
        const meData = await meRes.json();
        setSession(meData.user || null);
      }

      if (teamsRes.ok) {
        const tData = await teamsRes.json();
        setTeams(tData.teams || []);
      } else {
        setError("Failed to load your hackathons.");
      }
    } catch {
      setError("Network error loading hackathons.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full">
        <div className="space-y-6">
          <div className="h-14 rounded-2xl bg-[#0B0E18]/55 border border-white/[0.08] animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-72 rounded-2xl bg-[#0B0E18]/55 border border-white/[0.08] animate-pulse" />
            <div className="h-72 rounded-2xl bg-[#0B0E18]/55 border border-white/[0.08] animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!session || session.role !== "STUDENT") {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center relative z-10">
        <div className="p-3 rounded-full bg-white/[0.04] border border-white/10 w-fit mx-auto mb-4">
          <Lock className="w-6 h-6 text-[#94A3B8]" />
        </div>
        <h1 className="font-display text-xl font-bold text-[#F8FAFC] mb-2">Student Session Required</h1>
        <p className="text-xs text-[#94A3B8] mb-6 leading-relaxed">
          Please sign in with your student credentials to view your registered hackathons.
        </p>
        <Link
          href="/login?redirect=/dashboard/student/hackathons"
          className="px-5 py-2.5 rounded-lg bg-[#6366F1] text-white font-semibold text-xs hover:bg-[#4F46E5] transition-colors inline-block"
        >
          Sign In
        </Link>
      </div>
    );
  }

  // Deduplicate hackathons across teams
  const registeredHackathons = teams.map((team) => ({
    team,
    hackathon: team.hackathon,
  }));

  const formatCountdown = (targetDateStr: string) => {
    const diff = new Date(targetDateStr).getTime() - currentTime;
    if (diff <= 0) return { isOver: true, text: "LIVE NOW" };
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    return {
      isOver: false,
      text: `${String(hours).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`,
    };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full space-y-8 relative z-10 text-[#F8FAFC]">
      {/* Header & Breadcrumb */}
      <div className="pb-6 border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-[11px] font-mono text-[#64748B] uppercase tracking-wider flex items-center gap-2">
            <Link href="/dashboard/student" className="hover:text-[#818CF8]">Dashboard</Link>
            <span>/</span>
            <span className="text-[#818CF8] font-bold">My Hackathons</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
            My Registered Hackathons
          </h1>
          <p className="text-xs text-[#94A3B8] font-mono">
            Track countdowns, timed problem reveals, workspace access, and submissions.
          </p>
        </div>

        <Link
          href="/hackathons"
          className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono font-bold text-[#F8FAFC] flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          Browse Hackathons →
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty State */}
      {registeredHackathons.length === 0 ? (
        <div className="p-16 rounded-3xl bg-[#0B0E18]/55 backdrop-blur-md border border-white/[0.08] text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-[#6366F1]">
            <Trophy className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-[#F8FAFC]">No Registered Hackathons Found</h2>
          <p className="text-xs text-[#94A3B8] max-w-md mx-auto leading-relaxed">
            You have not registered for any hackathons yet. Find upcoming collegiate arenas, claim your track, and form your squad.
          </p>
          <div className="pt-2">
            <Link
              href="/hackathons"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold text-xs transition-colors shadow-sm"
            >
              Browse Upcoming Hackathons
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {registeredHackathons.map(({ team, hackathon }) => {
            const nowTime = currentTime;
            const startTime = new Date(hackathon.startAt).getTime();
            const endTime = new Date(hackathon.endAt).getTime();
            const isLive = nowTime >= startTime && nowTime <= endTime;
            const isUpcoming = nowTime < startTime;
            const isCompleted = nowTime > endTime;

            const countdown = isUpcoming
              ? formatCountdown(hackathon.startAt)
              : isLive
              ? formatCountdown(hackathon.endAt)
              : { isOver: true, text: "EVENT CONCLUDED" };

            const isVerified = team.payment?.status === "VERIFIED" && !!team.teamId;
            const isSubmitted = !!team.submission?.locked;

            return (
              <div
                key={team.id}
                className="bg-[#0B0E18]/55 backdrop-blur-md border border-white/[0.08] hover:border-white/[0.15] rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl flex flex-col justify-between transition-all"
              >
                <div className="space-y-5">
                  {/* Status header */}
                  <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                    <span className={`text-[10px] font-mono px-2.5 py-1 rounded font-bold uppercase flex items-center gap-1.5 ${
                      isLive
                        ? "bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/30"
                        : isUpcoming
                        ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                        : "bg-white/[0.04] text-[#94A3B8] border border-white/[0.08]"
                    }`}>
                      {isLive && <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] animate-pulse" />}
                      {isLive ? "LIVE ARENA ACTIVE" : isUpcoming ? "UPCOMING TRACK" : "COMPLETED"}
                    </span>

                    <span className="text-xs font-mono text-[#818CF8] font-bold">
                      Squad: {team.name}
                    </span>
                  </div>

                  {/* Title & Dates */}
                  <div className="space-y-1.5">
                    <h2 className="font-display text-xl font-extrabold text-[#F8FAFC] tracking-tight">
                      <Link
                        href={`/hackathons/${hackathon.slug}`}
                        className="hover:text-[#818CF8] transition-colors flex items-center gap-1.5"
                      >
                        {hackathon.title}
                        <ExternalLink className="w-3.5 h-3.5 text-[#64748B]" />
                      </Link>
                    </h2>
                    <p className="text-xs text-[#94A3B8] font-mono">
                      {new Date(hackathon.startAt).toLocaleDateString()} — {new Date(hackathon.endAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Countdown Timer Strip */}
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between font-mono text-xs">
                    <div className="flex items-center gap-2 text-[#94A3B8]">
                      <Clock className="w-4 h-4 text-[#818CF8]" />
                      <span>{isUpcoming ? "Starts In:" : isLive ? "Event Closes In:" : "Status:"}</span>
                    </div>
                    <span className="font-extrabold text-[#F8FAFC] tracking-wider text-sm">
                      {countdown.text}
                    </span>
                  </div>

                  {/* Domain & Problem Reveal State */}
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2 font-mono text-xs">
                    <div className="flex items-center justify-between text-[11px] text-[#94A3B8] uppercase font-bold">
                      <span className="flex items-center gap-1.5">
                        {team.problemStatement ? (
                          <Unlock className="w-3.5 h-3.5 text-[#818CF8]" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-[#64748B]" />
                        )}
                        Problem Statement
                      </span>
                      <span>
                        {team.problemStatement ? "Assigned & Locked" : isLive ? "Available in Arena" : "Server Masked"}
                      </span>
                    </div>

                    {team.problemStatement ? (
                      <div className="text-sm font-bold text-[#F8FAFC]">
                        {team.problemStatement.title}
                      </div>
                    ) : (
                      <div className="text-[11px] text-[#64748B] leading-relaxed">
                        {isLive 
                          ? "Problem statements unlocked! Enter the Arena to choose your problem under atomic slot allocation."
                          : "Problem statements remain encrypted on the server clock until countdown reaches zero."}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-5 border-t border-white/[0.08] flex items-center gap-3">
                  {isVerified ? (
                    <Link
                      href={`/dashboard/student/arena/${team.id}`}
                      className="flex-1 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold text-xs font-mono transition-all text-center flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      Open Workspace Arena
                    </Link>
                  ) : (
                    <Link
                      href={`/hackathons/${hackathon.slug}/payment/${team.id}`}
                      className="flex-1 py-2.5 rounded-xl bg-amber-500/20 text-amber-200 border border-amber-500/30 hover:bg-amber-500/30 font-bold text-xs font-mono transition-all text-center"
                    >
                      Verify Payment Proof →
                    </Link>
                  )}

                  <Link
                    href={`/dashboard/student/arena/${team.id}`}
                    className={`px-3 py-2.5 rounded-xl text-xs font-mono font-bold border transition-colors flex items-center gap-1.5 ${
                      isSubmitted
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                        : "bg-white/[0.03] text-[#94A3B8] border-white/[0.08] hover:text-[#F8FAFC]"
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    {isSubmitted ? "Locked" : "Submission"}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
