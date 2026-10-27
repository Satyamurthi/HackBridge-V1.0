"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  Users, 
  Terminal, 
  ExternalLink, 
  Check, 
  Copy, 
  Plus, 
  AlertCircle, 
  Clock, 
  CheckCircle2,
  Lock,
  ArrowRight
} from "lucide-react";

interface MemberItem {
  role: string;
  student: {
    id: string;
    hackathonId: string;
    college: string;
    user: {
      name: string;
      email: string;
    };
  };
}

interface TeamItem {
  id: string;
  teamId: string | null;
  name: string;
  status: string;
  hackathon: {
    id: string;
    title: string;
    slug: string;
    fee: number;
    paymentMode: string;
    teamMin: number;
    teamMax: number;
    startAt: string;
    endAt: string;
    status: string;
  };
  leadStudent: {
    user: {
      name: string;
      email: string;
    };
  };
  members: MemberItem[];
  payment?: {
    id: string;
    status: string;
    mode: string;
    amount: number;
    txnRef?: string | null;
  } | null;
}

export default function MyTeamsPage() {
  const [session, setSession] = useState<any>(null);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Teammate add state for leads
  const [addingTeammateTo, setAddingTeammateTo] = useState<string | null>(null);
  const [teammateInput, setTeammateInput] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

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
        setError("Failed to load your squad records.");
      }
    } catch {
      setError("Network error loading teams. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddMember = async (teamId: string) => {
    const rawId = teammateInput.trim().toUpperCase();
    if (!rawId) return;

    setLookupLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      // Step 1: verify student exists and is eligible
      const lookupRes = await fetch(`/api/v1/students/lookup/${rawId}`);
      const lookupData = await lookupRes.json();

      if (!lookupRes.ok || !lookupData.exists) {
        setActionError(lookupData.error || "Student not found with this Hackathon ID.");
        setLookupLoading(false);
        return;
      }

      if (!lookupData.isEligible) {
        setActionError(lookupData.blockedReason || "Student is locked in an active hackathon registration.");
        setLookupLoading(false);
        return;
      }

      // Step 2: append member to team
      const addRes = await fetch(`/api/v1/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: lookupData.studentId }),
      });

      const addData = await addRes.json();
      if (!addRes.ok) {
        setActionError(addData.error || "Failed to add teammate to squad.");
        setLookupLoading(false);
        return;
      }

      setActionSuccess(`Added ${lookupData.name} (${rawId}) to squad!`);
      setTeammateInput("");
      setAddingTeammateTo(null);
      await loadData();
    } catch {
      setActionError("Network error adding teammate.");
    } finally {
      setLookupLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full">
        <div className="space-y-6">
          <div className="h-14 rounded-2xl bg-[#0B0E18]/55 border border-white/[0.08] animate-pulse" />
          <div className="grid grid-cols-1 gap-6">
            <div className="h-64 rounded-2xl bg-[#0B0E18]/55 border border-white/[0.08] animate-pulse" />
            <div className="h-64 rounded-2xl bg-[#0B0E18]/55 border border-white/[0.08] animate-pulse" />
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
          Please sign in with your student credentials to view and manage your squads.
        </p>
        <Link
          href="/login?redirect=/dashboard/student/teams"
          className="px-5 py-2.5 rounded-lg bg-[#6366F1] text-white font-semibold text-xs hover:bg-[#4F46E5] transition-colors inline-block"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full space-y-8 relative z-10 text-[#F8FAFC]">
      {/* Header & Breadcrumb */}
      <div className="pb-6 border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-[11px] font-mono text-[#64748B] uppercase tracking-wider flex items-center gap-2">
            <Link href="/dashboard/student" className="hover:text-[#818CF8]">Dashboard</Link>
            <span>/</span>
            <span className="text-[#818CF8] font-bold">My Teams</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
            My Teams & Squad Rosters
          </h1>
          <p className="text-xs text-[#94A3B8] font-mono">
            Every collegiate team associated with your permanent Hackathon ID ({session.hackathonId}).
          </p>
        </div>

        <Link
          href="/hackathons"
          className="px-4 py-2 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold text-xs font-mono transition-all flex items-center gap-1.5 self-start sm:self-auto shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Join New Arena
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-amber-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Teams Grid / List */}
      {teams.length === 0 ? (
        <div className="p-16 rounded-3xl bg-[#0B0E18]/55 backdrop-blur-md border border-white/[0.08] text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-[#6366F1]">
            <Users className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-[#F8FAFC]">No Squad Memberships Found</h2>
          <p className="text-xs text-[#94A3B8] max-w-md mx-auto leading-relaxed">
            You are not currently part of any hackathon squad. Register as a team lead or give your permanent Hackathon ID (<span className="text-[#818CF8] font-mono font-bold">{session.hackathonId}</span>) to your lead.
          </p>
          <div className="pt-2">
            <Link
              href="/hackathons"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold text-xs transition-colors shadow-sm"
            >
              Explore Active Arenas
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {teams.map((team) => {
            const isLead = team.leadStudent.user.email === session.email;
            const isVerified = team.payment?.status === "VERIFIED" && !!team.teamId;

            return (
              <div
                key={team.id}
                className="bg-[#0B0E18]/55 backdrop-blur-md border border-white/[0.08] hover:border-white/[0.15] rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl transition-all"
              >
                {/* Team Top Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-white/[0.08] gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="font-display text-xl font-extrabold text-[#F8FAFC] tracking-tight">
                        {team.name}
                      </h2>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        isLead 
                          ? "bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/30" 
                          : "bg-white/[0.04] text-[#94A3B8] border border-white/[0.08]"
                      }`}>
                        {isLead ? "TEAM LEAD" : "MEMBER"}
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        team.status === "ACTIVE"
                          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                          : team.status === "PENDING"
                          ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                          : "bg-red-500/15 text-red-300 border border-red-500/30"
                      }`}>
                        {team.status}
                      </span>
                    </div>

                    <p className="text-xs text-[#94A3B8] font-mono">
                      Hackathon:{" "}
                      <Link
                        href={`/hackathons/${team.hackathon.slug}`}
                        className="text-[#818CF8] hover:underline font-semibold"
                      >
                        {team.hackathon.title}
                      </Link>
                    </p>
                  </div>

                  {/* Team ID & Workspace CTA */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {team.teamId ? (
                      <div
                        onClick={() => copyText(team.teamId!, team.id)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] cursor-pointer hover:border-[#6366F1]/50 transition-colors"
                        title="Click to copy official Team ID"
                      >
                        <span className="text-[10px] font-mono text-[#64748B] uppercase font-bold">TEAM ID</span>
                        <span className="text-xs font-mono font-extrabold text-[#F8FAFC]">{team.teamId}</span>
                        {copiedId === team.id ? (
                          <Check className="w-3.5 h-3.5 text-[#6366F1]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-[#64748B]" />
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] font-mono text-[#64748B] bg-white/[0.02] border border-white/[0.06] px-2.5 py-1 rounded-lg">
                        Team ID Pending Payment
                      </span>
                    )}

                    {isVerified ? (
                      <Link
                        href={`/dashboard/student/arena/${team.id}`}
                        className="px-4 py-2 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold text-xs font-mono transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <Terminal className="w-3.5 h-3.5" />
                        Enter Team Workspace
                      </Link>
                    ) : (
                      <Link
                        href={`/hackathons/${team.hackathon.slug}/payment/${team.id}`}
                        className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-200 border border-amber-500/40 hover:bg-amber-500/30 font-bold text-xs font-mono transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        Verify Payment Proof →
                      </Link>
                    )}
                  </div>
                </div>

                {/* Squad Members Roster */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-[#94A3B8] font-bold">
                      Squad Roster ({team.members.length} / {team.hackathon.teamMax} members)
                    </span>
                    {isLead && team.status === "PENDING" && team.members.length < team.hackathon.teamMax && (
                      <button
                        onClick={() => {
                          setAddingTeammateTo(addingTeammateTo === team.id ? null : team.id);
                          setActionError(null);
                          setActionSuccess(null);
                        }}
                        className="text-xs font-mono text-[#818CF8] hover:text-white font-bold flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {addingTeammateTo === team.id ? "Cancel" : "Add Member by ID"}
                      </button>
                    )}
                  </div>

                  {/* Add Member inline form */}
                  {addingTeammateTo === team.id && (
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-[#6366F1]/30 space-y-2">
                      <div className="text-[11px] font-mono text-[#94A3B8]">
                        Enter student&apos;s permanent Hackathon ID (e.g. HB-102938):
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={teammateInput}
                          onChange={(e) => setTeammateInput(e.target.value.toUpperCase())}
                          placeholder="HB-XXXXXX"
                          className="flex-1 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-[#F8FAFC] uppercase focus:outline-none focus:border-[#6366F1]"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddMember(team.id)}
                          disabled={lookupLoading || !teammateInput.trim()}
                          className="px-4 py-2 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold text-xs font-mono disabled:opacity-40"
                        >
                          {lookupLoading ? "Adding..." : "Confirm"}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {team.members.map((m) => (
                      <div
                        key={m.student.hackathonId}
                        className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs font-mono"
                      >
                        <div className="space-y-0.5 truncate mr-2">
                          <div className="font-bold text-[#F8FAFC] flex items-center gap-1.5 truncate">
                            <span className="truncate">{m.student.user.name}</span>
                            {m.role === "LEAD" && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#6366F1]/20 text-[#818CF8] font-bold shrink-0">
                                LEAD
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#94A3B8] truncate">{m.student.college}</div>
                        </div>

                        <span className="text-[10px] font-mono font-bold text-[#818CF8] bg-[#6366F1]/10 px-2 py-0.5 rounded border border-[#6366F1]/20 shrink-0">
                          {m.student.hackathonId}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment & Timeline summary strip */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-[#64748B]">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span>
                      Fee:{" "}
                      <strong className="text-[#F8FAFC]">
                        {team.hackathon.fee === 0 || team.hackathon.paymentMode === "FREE" ? "FREE" : `₹${team.hackathon.fee}`}
                      </strong>
                    </span>
                    <span>·</span>
                    <span>
                      Payment:{" "}
                      <strong className={isVerified ? "text-[#818CF8]" : "text-amber-400"}>
                        {team.payment?.status || "UNPAID"}
                      </strong>
                    </span>
                    {team.payment?.txnRef && (
                      <>
                        <span>·</span>
                        <span>UTR: <strong className="text-[#94A3B8]">{team.payment.txnRef}</strong></span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#64748B]" />
                    <span>Ends: {new Date(team.hackathon.endAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
