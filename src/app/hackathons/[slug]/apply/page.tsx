"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Users,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Lock,
  Search,
  Sparkles,
  CreditCard,
  Building2,
  AlertTriangle
} from "lucide-react";

interface HackathonDetail {
  id: string;
  title: string;
  slug: string;
  description: string;
  fee: number;
  paymentMode: string;
  teamMin: number;
  teamMax: number;
  startAt: string;
  endAt: string;
  host: {
    orgName: string;
    type: string;
  };
}

interface TeammateLookup {
  studentId: string;
  hackathonId: string;
  name: string;
  college: string;
  isEligible: boolean;
  blockedReason?: string | null;
}

export default function ApplyPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [hackathon, setHackathon] = useState<HackathonDetail | null>(null);
  const [loadingHackathon, setLoadingHackathon] = useState(true);

  // Form states
  const [teamName, setTeamName] = useState("");
  const [teammateInput, setTeammateInput] = useState("");
  const [teammates, setTeammates] = useState<TeammateLookup[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Lead eligibility check
  const [leadConflict, setLeadConflict] = useState<string | null>(null);

  // Fetch session
  useEffect(() => {
    fetch("/api/v1/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setSession(data.user);
          // Check lead's existing teams for Non-negotiable rule 1
          if (data.user.role === "STUDENT" && data.user.hackathonId) {
            fetch(`/api/v1/students/lookup/${data.user.hackathonId}`)
              .then((r) => r.json())
              .then((lookup) => {
                if (!lookup.isEligible && lookup.blockedReason) {
                  setLeadConflict(lookup.blockedReason);
                }
              })
              .catch(() => {});
          }
        }
        setLoadingSession(false);
      })
      .catch(() => setLoadingSession(false));
  }, []);

  // Fetch hackathon details
  useEffect(() => {
    if (!slug) return;
    setLoadingHackathon(true);
    fetch(`/api/v1/hackathons/${slug}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.hackathon) {
          setHackathon(data.hackathon);
        }
        setLoadingHackathon(false);
      })
      .catch(() => setLoadingHackathon(false));
  }, [slug]);

  // Handle adding teammate by Hackathon ID
  const handleAddTeammate = async () => {
    const rawId = teammateInput.trim().toUpperCase();
    setLookupError(null);

    if (!rawId) {
      setLookupError("Please enter a valid Hackathon ID (e.g., HB-XXXXXX)");
      return;
    }

    if (!/^HB-[A-Z0-9]{6}$/.test(rawId)) {
      setLookupError("Invalid format. Must match HB-XXXXXX format.");
      return;
    }

    if (session?.hackathonId && rawId === session.hackathonId.toUpperCase()) {
      setLookupError("You are already the Team Lead. Do not add yourself as a teammate.");
      return;
    }

    if (teammates.some((t) => t.hackathonId.toUpperCase() === rawId)) {
      setLookupError("This student has already been added to your squad.");
      return;
    }

    const currentTotal = 1 + teammates.length;
    if (hackathon && currentTotal >= hackathon.teamMax) {
      setLookupError(`Maximum team size for this hackathon is ${hackathon.teamMax} members.`);
      return;
    }

    setLookupLoading(true);
    try {
      const res = await fetch(`/api/v1/students/lookup/${rawId}`);
      const data = await res.json();

      if (!res.ok || !data.exists) {
        setLookupError(data.error || `No verified student found with Hackathon ID: ${rawId}`);
        return;
      }

      if (!data.isEligible) {
        setLookupError(
          data.blockedReason || `Student ${data.name} is already registered in an active hackathon.`
        );
        return;
      }

      setTeammates((prev) => [
        ...prev,
        {
          studentId: data.studentId,
          hackathonId: data.hackathonId,
          name: data.name,
          college: data.college,
          isEligible: data.isEligible,
        },
      ]);
      setTeammateInput("");
    } catch {
      setLookupError("Network error checking student ID.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleRemoveTeammate = (index: number) => {
    setTeammates((prev) => prev.filter((_, i) => i !== index));
    setLookupError(null);
  };

  // Submit team application
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!teamName.trim()) {
      setSubmitError("Please enter a team name.");
      return;
    }

    if (!hackathon) return;

    const totalSquad = 1 + teammates.length;
    if (totalSquad < hackathon.teamMin) {
      setSubmitError(
        `This hackathon requires a minimum of ${hackathon.teamMin} member${
          hackathon.teamMin > 1 ? "s" : ""
        }. Please add ${hackathon.teamMin - totalSquad} more teammate${
          hackathon.teamMin - totalSquad > 1 ? "s" : ""
        }.`
      );
      return;
    }

    if (totalSquad > hackathon.teamMax) {
      setSubmitError(`Maximum team size is ${hackathon.teamMax} members.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hackathonId: hackathon.id,
          teamName: teamName.trim(),
          teammateHackathonIds: teammates.map((t) => t.hackathonId),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || "Failed to create team application");
        setSubmitting(false);
        return;
      }

      const teamId = data.team?.id;
      // Redirect to payment step
      router.push(`/hackathons/${hackathon.slug}/payment/${teamId}`);
    } catch {
      setSubmitError("Network error creating application. Please try again.");
      setSubmitting(false);
    }
  };

  if (loadingSession || loadingHackathon) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-xs font-mono text-slate-500">
        <div className="h-48 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse" />
      </div>
    );
  }

  if (!session || session.role !== "STUDENT") {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="p-3 rounded-full bg-white/[0.04] border border-white/10 w-fit mx-auto mb-4">
          <Lock className="w-6 h-6 text-slate-400" />
        </div>
        <h1 className="font-display text-xl font-bold text-white mb-2">Student Login Required</h1>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Only authenticated students with a verified Hackathon ID can apply and form a squad.
        </p>
        <Link
          href={`/login?redirect=/hackathons/${slug}/apply`}
          className="px-5 py-2.5 rounded-lg bg-white text-black font-semibold text-xs hover:bg-slate-200 transition-colors inline-block"
        >
          Sign In with Student Account
        </Link>
      </div>
    );
  }

  if (!hackathon) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-lg font-bold text-white mb-2">Hackathon Not Found</h1>
        <Link href="/hackathons" className="text-xs font-mono text-[#6366F1] hover:underline">
          ← Back to Hackathons
        </Link>
      </div>
    );
  }

  const currentTotal = 1 + teammates.length;
  const isSquadSizeValid = currentTotal >= hackathon.teamMin && currentTotal <= hackathon.teamMax;

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-10 w-full space-y-8">
      {/* Header Back Link */}
      <div>
        <Link
          href={`/hackathons/${hackathon.slug}`}
          className="text-xs font-mono text-slate-500 hover:text-white flex items-center gap-1.5 transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Hackathon Overview
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div className="space-y-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] border border-white/10 text-slate-400 uppercase">
              Phase 3 · Team Registration
            </span>
            <h1 className="font-display text-2xl font-bold text-white tracking-tight">
              Apply to {hackathon.title}
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Hosted by {hackathon.host.orgName} · Squad Size: {hackathon.teamMin}–{hackathon.teamMax} members
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-right shrink-0">
            <div className="text-[10px] font-mono text-slate-500 uppercase">Entry Fee</div>
            <div className="text-sm font-bold text-white">
              {hackathon.fee === 0 || hackathon.paymentMode === "FREE" ? "FREE" : `₹${hackathon.fee}`}
            </div>
            <div className="text-[10px] font-mono text-[#6366F1]">
              {hackathon.paymentMode === "FREE"
                ? "Instant Team ID"
                : hackathon.paymentMode === "QR"
                ? "QR Proof Verification"
                : "Razorpay Checkout"}
            </div>
          </div>
        </div>
      </div>

      {leadConflict && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-mono text-red-400 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold">Invariant Rule 1 Restriction Active</div>
            <p className="text-red-300 leading-relaxed">{leadConflict}</p>
          </div>
        </div>
      )}

      {submitError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-mono text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Application Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Team Basics */}
        <div className="p-6 rounded-2xl bg-[#0B0E18] border border-white/[0.08] space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-white/10 text-white font-mono text-xs flex items-center justify-center font-bold">
                1
              </span>
              <h2 className="text-sm font-bold text-white">Team Details</h2>
            </div>
            <span className="text-[11px] font-mono text-slate-500">Required</span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono text-slate-300 block">
              Team / Squad Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g., Matrix Architects, VectorOps, ZeroDay Collective"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 text-xs font-mono focus:outline-none focus:border-white/30"
            />
          </div>

          {/* Lead Card */}
          <div className="pt-2">
            <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-2">
              Team Lead (Designated Applicant)
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>{session.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    LEAD
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  {session.email} · {session.studentProfile?.college || "Collegiate Engineer"}
                </div>
              </div>
              <div className="font-mono text-xs text-slate-300 font-bold bg-white/5 px-2.5 py-1 rounded border border-white/10">
                {session.hackathonId}
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Teammate Addition */}
        <div className="p-6 rounded-2xl bg-[#0B0E18] border border-white/[0.08] space-y-5">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-white/10 text-white font-mono text-xs flex items-center justify-center font-bold">
                2
              </span>
              <h2 className="text-sm font-bold text-white">Squad Members</h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Current Squad: <strong className="text-white">{currentTotal}</strong> / {hackathon.teamMax}
            </span>
          </div>

          <div className="text-xs text-slate-400 leading-relaxed">
            Per <strong className="text-white">PRD Rule 2</strong>: Only the team lead applies. Enter your teammates&apos; permanent <strong className="text-white">Hackathon IDs (HB-XXXXXX)</strong> below. Each student is verified live against Invariant Rule 1.
          </div>

          {/* Teammate Input Box */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-slate-300 block">
              Add Teammate by Permanent Hackathon ID
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={teammateInput}
                  onChange={(e) => {
                    setTeammateInput(e.target.value.toUpperCase());
                    setLookupError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTeammate();
                    }
                  }}
                  placeholder="HB-XXXXXX"
                  disabled={currentTotal >= hackathon.teamMax}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 text-xs font-mono uppercase focus:outline-none focus:border-white/30 disabled:opacity-50"
                />
              </div>

              <button
                type="button"
                onClick={handleAddTeammate}
                disabled={lookupLoading || currentTotal >= hackathon.teamMax || !teammateInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-white text-black font-semibold text-xs font-mono hover:bg-slate-200 transition-colors disabled:opacity-40 flex items-center gap-1.5 shrink-0"
              >
                {lookupLoading ? (
                  <span className="animate-spin">⌛</span>
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                Add Member
              </button>
            </div>

            {lookupError && (
              <p className="text-[11px] font-mono text-red-400 flex items-center gap-1.5 pt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {lookupError}
              </p>
            )}
          </div>

          {/* Teammates List */}
          <div className="space-y-2 pt-2">
            {teammates.length === 0 ? (
              <div className="p-4 rounded-xl bg-white/[0.01] border border-dashed border-white/10 text-center text-xs font-mono text-slate-500">
                {hackathon.teamMin > 1
                  ? `This hackathon requires at least ${hackathon.teamMin} members. Please add ${
                      hackathon.teamMin - 1
                    } teammate(s).`
                  : "Solo participation allowed, or add up to " +
                    (hackathon.teamMax - 1) +
                    " teammate(s)."}
              </div>
            ) : (
              teammates.map((teammate, idx) => (
                <div
                  key={teammate.hackathonId}
                  className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs font-mono"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-white flex items-center gap-2">
                      <span>{teammate.name}</span>
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.2 rounded border border-emerald-500/20">
                        Verified & Eligible
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">{teammate.college}</div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-slate-300 font-bold bg-white/5 px-2 py-1 rounded border border-white/10 text-[11px]">
                      {teammate.hackathonId}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTeammate(idx)}
                      className="p-1 rounded text-slate-500 hover:text-red-400 transition-colors"
                      title="Remove teammate"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Step 3: Review & Submit */}
        <div className="p-6 rounded-2xl bg-[#0B0E18] border border-white/[0.08] space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-white/10 text-white font-mono text-xs flex items-center justify-center font-bold">
                3
              </span>
              <h2 className="text-sm font-bold text-white">Review & Registration Summary</h2>
            </div>
            <span className="text-[11px] font-mono text-slate-500">Step 3 of 3</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase">Squad Members</span>
              <div className={`font-bold ${isSquadSizeValid ? "text-emerald-400" : "text-amber-400"}`}>
                {currentTotal} / {hackathon.teamMax}
                {isSquadSizeValid ? " (Valid)" : ` (Requires min ${hackathon.teamMin})`}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase">Registration Fee</span>
              <div className="font-bold text-white">
                {hackathon.fee === 0 || hackathon.paymentMode === "FREE" ? "FREE" : `₹${hackathon.fee}`}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase">Payment Verification</span>
              <div className="font-bold text-[#6366F1]">
                {hackathon.paymentMode === "FREE"
                  ? "Instant Issue"
                  : hackathon.paymentMode === "QR"
                  ? "QR Approval Required"
                  : "Razorpay Checkout"}
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || !isSquadSizeValid || !teamName.trim() || !!leadConflict}
              className="w-full py-3.5 rounded-xl bg-white text-black font-bold text-xs font-mono hover:bg-slate-200 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="animate-spin">⌛</span>
                  Creating Application...
                </>
              ) : (
                <>
                  Proceed to Payment & Verification
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
            <p className="text-[10px] font-mono text-slate-500 text-center mt-2">
              PRD Rule 3: Official Team ID (TEAM-XXXXXX) is issued immediately upon verified payment.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
