"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Layers,
  Award,
  Calendar,
  Building,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Trophy,
  ArrowLeft
} from "lucide-react";

interface AssignedHackathon {
  id: string;
  title: string;
  slug: string;
  hostName: string;
  hostType: string;
  domain: string;
  approvalStatus: string;
  startAt: string;
  endAt: string;
  status: string;
  teamCount: number;
  isCurrent: boolean;
}

export default function JudgeAssignedPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [assignedHackathons, setAssignedHackathons] = useState<AssignedHackathon[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [currentHackathonId, setCurrentHackathonId] = useState<string>("");

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
        setAssignedHackathons(data.assignedHackathons || []);
        if (data.hackathon) {
          setCurrentHackathonId(data.hackathon.id);
        }
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

  const handleSelectTrack = (hackathonId: string) => {
    router.push(`/dashboard/judge?tab=queue&hackathonId=${hackathonId}`);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#6366F1] border-t-transparent animate-spin" />
          <span className="text-xs font-mono text-[#94A3B8]">Loading Assigned Arenas...</span>
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
              <Layers className="w-5 h-5 text-[#6366F1]" />
              <h1 className="text-xl font-extrabold text-white">Assigned Arenas & Hackathon Tracks</h1>
            </div>
          </div>
          <p className="text-xs text-[#94A3B8] ml-11">
            All hackathon tracks you have been appointed to evaluate as a certified jury member.
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
            <span>Open Scoring Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* TRACKS GRID */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-[#94A3B8]">
          <span>Track Registrations ({assignedHackathons.length})</span>
          <span className="text-[11px] text-[#64748B]">v5.0 Unified Evaluation Architecture</span>
        </div>

        {assignedHackathons.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-[#0B0E18]/50 border border-white/[0.08] space-y-3">
            <Layers className="w-8 h-8 text-[#64748B] mx-auto" />
            <h3 className="text-sm font-bold text-white">No Assigned Tracks Found</h3>
            <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
              You are not assigned to any active hackathon tracks yet. If you recently applied, your application is pending host confirmation.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignedHackathons.map((track) => {
              const isSelected = track.id === currentHackathonId;
              const isApproved = track.approvalStatus === "APPROVED";

              return (
                <div
                  key={track.id}
                  className={`p-6 rounded-3xl border transition-all flex flex-col justify-between gap-6 relative overflow-hidden ${
                    isSelected
                      ? "bg-[#6366F1]/10 border-[#6366F1]/40 shadow-xl shadow-[#6366F1]/10"
                      : "bg-[#0B0E18]/70 border-white/[0.08] hover:border-white/20"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-[#6366F1]" />
                  )}

                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                              isApproved
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            <ShieldCheck className="w-3 h-3" />
                            <span>{track.approvalStatus}</span>
                          </span>

                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono text-[#94A3B8] bg-white/[0.04] border border-white/[0.08]">
                            {track.status}
                          </span>

                          {isSelected && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/30">
                              ACTIVE IN QUEUE
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-extrabold text-white tracking-tight pt-1">
                          {track.title}
                        </h3>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                        <span className="text-[10px] text-[#64748B] uppercase font-bold flex items-center gap-1">
                          <Building className="w-3 h-3 text-[#6366F1]" />
                          Host Organizers
                        </span>
                        <div className="font-bold text-white truncate">{track.hostName}</div>
                      </div>

                      <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                        <span className="text-[10px] text-[#64748B] uppercase font-bold flex items-center gap-1">
                          <Award className="w-3 h-3 text-[#818CF8]" />
                          Domain Track Focus
                        </span>
                        <div className="font-bold text-[#818CF8] truncate">{track.domain}</div>
                      </div>

                      <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                        <span className="text-[10px] text-[#64748B] uppercase font-bold flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#64748B]" />
                          Arena Timeline
                        </span>
                        <div className="font-mono text-[11px] text-[#CBD5E1]">
                          {new Date(track.startAt).toLocaleDateString()} – {new Date(track.endAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                        <span className="text-[10px] text-[#64748B] uppercase font-bold flex items-center gap-1">
                          <Users className="w-3 h-3 text-emerald-400" />
                          Registered Squads
                        </span>
                        <div className="font-bold text-white">
                          {track.teamCount} Squads
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-white/[0.06] gap-3">
                    <Link
                      href={`/dashboard/judge/leaderboard/${track.id}`}
                      className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-bold text-[#CBD5E1] transition-all flex items-center gap-1.5"
                    >
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>Standings</span>
                    </Link>

                    <button
                      onClick={() => handleSelectTrack(track.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                        isSelected
                          ? "bg-[#6366F1] text-white hover:bg-[#4F46E5] shadow-lg shadow-[#6366F1]/20"
                          : "bg-white/[0.06] hover:bg-white/[0.12] text-white"
                      }`}
                    >
                      <span>{isSelected ? "Open Scoring Queue" : "Switch to This Track"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
