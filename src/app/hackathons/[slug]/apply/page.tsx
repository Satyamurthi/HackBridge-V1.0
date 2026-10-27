"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  Lock,
  RefreshCw,
  Clock,
  Sparkles,
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

interface ExistingDraftTeam {
  id: string;
  teamId: string | null;
  name: string;
  status: string;
  createdAt: string;
  members: Array<{
    id: string;
    role: string;
    student: {
      id: string;
      hackathonId: string;
      college: string;
      user: { name: string; email: string };
    };
  }>;
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

  // Draft & conflict states
  const [leadConflict, setLeadConflict] = useState<string | null>(null);
  const [existingDraftTeam, setExistingDraftTeam] = useState<ExistingDraftTeam | null>(null);
  const [checkingExistingTeam, setCheckingExistingTeam] = useState(false);
  const [discardingDraft, setDiscardingDraft] = useState(false);

  const errorRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Session
  useEffect(() => {
    fetch("/api/v1/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setSession(data.user);
        }
        setLoadingSession(false);
      })
      .catch(() => setLoadingSession(false));
  }, []);

  // 2. Fetch Hackathon details
  useEffect(() => {
    if (!slug) return;
    setLoadingHackathon(true);
    fetch(`/api/v1/hackathons/${slug}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.hackathon) setHackathon(data.hackathon);
        setLoadingHackathon(false);
      })
      .catch(() => setLoadingHackathon(false));
  }, [slug]);

  // 3. Check existing draft team and lead eligibility once session and hackathon are loaded
  useEffect(() => {
    if (!session || session.role !== "STUDENT" || !hackathon) return;

    setCheckingExistingTeam(true);

    // Check if lead already has a pending or active team in this hackathon
    fetch(`/api/v1/teams?hackathonId=${hackathon.id}`)
      .then((res) => (res.ok ? res.json() : { teams: [] }))
      .then((data) => {
        const teams = data.teams || [];
        const currentHackathonTeam = teams.find(
          (t: any) => t.hackathonId === hackathon.id || t.hackathon?.slug === slug
        );

        if (currentHackathonTeam) {
          if (currentHackathonTeam.status === "PENDING") {
            setExistingDraftTeam(currentHackathonTeam);
          } else if (currentHackathonTeam.status === "ACTIVE") {
            setLeadConflict(
              `You are already confirmed in squad "${currentHackathonTeam.name}" (${currentHackathonTeam.teamId || "Active"}).`
            );
          }
        } else {
          // If no team in this hackathon, verify lead's external eligibility against other active events
          if (session.hackathonId) {
            fetch(`/api/v1/students/lookup/${session.hackathonId}?currentHackathonId=${hackathon.id}`)
              .then((r) => r.json())
              .then((lookup) => {
                if (!lookup.isEligible && lookup.blockedReason) {
                  setLeadConflict(lookup.blockedReason);
                }
              })
              .catch(() => {});
          }

          // Restore unsubmitted draft inputs from localStorage if present
          try {
            const savedDraft = localStorage.getItem(`hb_apply_draft_${slug}`);
            if (savedDraft) {
              const parsed = JSON.parse(savedDraft);
              if (parsed.teamName && !teamName) setTeamName(parsed.teamName);
              if (Array.isArray(parsed.teammates) && teammates.length === 0) {
                setTeammates(parsed.teammates);
              }
            }
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setCheckingExistingTeam(false));
  }, [session, hackathon, slug]);

  // Save unsubmitted inputs to localStorage for draft persistence
  useEffect(() => {
    if (!slug || existingDraftTeam) return;
    if (teamName || teammates.length > 0) {
      try {
        localStorage.setItem(
          `hb_apply_draft_${slug}`,
          JSON.stringify({ teamName, teammates })
        );
      } catch {}
    }
  }, [teamName, teammates, slug, existingDraftTeam]);

  // Lookup and add teammate by ID
  const handleAddTeammate = async () => {
    const rawId = teammateInput.trim().toUpperCase();
    if (!rawId) return;

    if (rawId === session?.hackathonId) {
      setLookupError("You are already the designated team lead.");
      return;
    }

    if (teammates.some((t) => t.hackathonId === rawId)) {
      setLookupError("Teammate already added to your squad.");
      return;
    }

    if (!hackathon) return;

    const currentTotal = 1 + teammates.length;
    if (currentTotal >= hackathon.teamMax) {
      setLookupError(`Maximum squad size of ${hackathon.teamMax} members reached.`);
      return;
    }

    setLookupLoading(true);
    setLookupError(null);

    try {
      const res = await fetch(
        `/api/v1/students/lookup/${rawId}?currentHackathonId=${hackathon.id}`
      );
      const data = await res.json();

      if (!res.ok) {
        setLookupError(data.error || "No student found with Hackathon ID: " + rawId);
        return;
      }

      if (!data.isEligible) {
        setLookupError(
          data.blockedReason ||
            "Student is already participating in an active hackathon registration."
        );
        return;
      }

      setTeammates((prev) => [...prev, data]);
      setTeammateInput("");
    } catch {
      setLookupError("Network error validating teammate ID.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleRemoveTeammate = (index: number) => {
    setTeammates((prev) => prev.filter((_, i) => i !== index));
  };

  // Discard draft team
  const handleDiscardDraft = async () => {
    if (!existingDraftTeam) return;
    if (!confirm("Discard this draft squad application and start over?")) return;

    setDiscardingDraft(true);
    setSubmitError(null);

    try {
      const res = await fetch(`/api/v1/teams/${existingDraftTeam.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setExistingDraftTeam(null);
        setTeamName("");
        setTeammates([]);
        try {
          localStorage.removeItem(`hb_apply_draft_${slug}`);
        } catch {}
      } else {
        const data = await res.json();
        setSubmitError(data.error || "Failed to discard draft application.");
      }
    } catch {
      setSubmitError("Network error discarding draft. Please try again.");
    } finally {
      setDiscardingDraft(false);
    }
  };

  // Squad readiness validation
  const currentTotal = 1 + teammates.length;
  const minRequired = hackathon?.teamMin ?? 1;
  const maxAllowed = hackathon?.teamMax ?? 4;
  const hasTeamName = teamName.trim().length > 0;
  const meetsMinSize = currentTotal >= minRequired;
  const withinMaxSize = currentTotal <= maxAllowed;
  const allTeammatesValidated =
    teammates.length === 0 || teammates.every((t) => t.isEligible && Boolean(t.studentId));

  const isReadyToSubmit =
    hasTeamName &&
    meetsMinSize &&
    withinMaxSize &&
    allTeammatesValidated &&
    !leadConflict &&
    !submitting;

  // Requirement status message shown beside the button
  const requirementMessage = useMemo(() => {
    if (!hasTeamName) {
      return "Enter squad name";
    }
    if (currentTotal < minRequired) {
      const remaining = minRequired - currentTotal;
      return remaining === 1 ? "Add 1 more teammate" : `Add ${remaining} more teammates`;
    }
    if (currentTotal > maxAllowed) {
      return `Exceeds max squad size (${maxAllowed})`;
    }
    if (!allTeammatesValidated) {
      return "Resolve teammate validation issues";
    }
    if (leadConflict) {
      return "Lead active in another event";
    }
    return `Squad ready (${currentTotal} of ${maxAllowed} members)`;
  }, [hasTeamName, currentTotal, minRequired, maxAllowed, allTeammatesValidated, leadConflict]);

  // Submit squad application
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hackathon || !session || !isReadyToSubmit) return;

    setSubmitting(true);
    setSubmitError(null);

    const payload = {
      hackathonId: hackathon.id,
      teamName: teamName.trim(),
      name: teamName.trim(),
      teammateHackathonIds: teammates.map((t) => t.hackathonId),
      members: teammates.map((t) => ({
        studentId: t.studentId,
        hackathonId: t.hackathonId,
      })),
    };

    if (process.env.NODE_ENV !== "production") {
      console.log("[ApplyPage] Sending team application payload:", payload);
    }

    try {
      const res = await fetch("/api/v1/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (process.env.NODE_ENV !== "production") {
        console.log("[ApplyPage] Server response:", res.status, data);
      }

      if (!res.ok) {
        const errorMsg =
          data.error || data.message || `Server Error (${res.status}): Failed to create application.`;
        setSubmitError(errorMsg);
        setSubmitting(false);
        errorRef.current?.scrollIntoView({ behavior: "smooth" });
        return;
      }

      // Clear localStorage unsubmitted draft upon success
      try {
        localStorage.removeItem(`hb_apply_draft_${slug}`);
      } catch {}

      // Route directly to payment phase
      router.push(`/hackathons/${hackathon.slug}/payment/${data.team.id}`);
    } catch (err: any) {
      console.error("[ApplyPage Submit Error]:", err);
      setSubmitError("Network error creating team application. Please try again.");
      setSubmitting(false);
      errorRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (loadingSession || loadingHackathon) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-xs font-mono text-[#94A3B8] relative z-10">
        <div className="h-64 rounded-2xl bg-white/[0.04] border border-white/[0.08] animate-pulse" />
      </div>
    );
  }

  if (!session || session.role !== "STUDENT") {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center relative z-10">
        <div className="p-3 rounded-full bg-white/[0.04] border border-white/10 w-fit mx-auto mb-4">
          <Lock className="w-6 h-6 text-[#94A3B8]" />
        </div>
        <h1 className="font-display text-xl font-bold text-[#F8FAFC] mb-2">
          Student Login Required
        </h1>
        <p className="text-xs text-[#94A3B8] mb-6 leading-relaxed">
          Only authenticated students with a verified Hackathon ID can apply and form a squad.
        </p>
        <Link
          href={`/login?redirect=/hackathons/${slug}/apply`}
          className="px-5 py-2.5 rounded-lg bg-[#6366F1] text-white font-semibold text-xs hover:bg-[#4F46E5] transition-colors inline-block"
        >
          Sign In with Student Account
        </Link>
      </div>
    );
  }

  if (!hackathon) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center relative z-10">
        <h1 className="font-display text-lg font-bold text-[#F8FAFC] mb-2">Hackathon Not Found</h1>
        <Link href="/hackathons" className="text-xs font-mono text-[#818CF8] hover:underline">
          ← Back to Hackathons
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-10 w-full space-y-8 bg-transparent text-[#F8FAFC] relative z-10">
      {/* Header Back Link */}
      <div>
        <Link
          href={`/hackathons/${hackathon.slug}`}
          className="text-xs font-mono text-[#94A3B8] hover:text-[#818CF8] flex items-center gap-1.5 transition-colors mb-4 font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Hackathon Overview
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div className="space-y-1">
            <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-[#6366F1]/15 border border-[#6366F1]/30 text-[#818CF8] font-bold uppercase">
              Phase 3 · Team Registration
            </span>
            <h1 className="font-display text-2xl font-extrabold text-[#F8FAFC] tracking-tight">
              Apply to {hackathon.title}
            </h1>
            <p className="text-xs text-[#94A3B8] font-mono">
              Hosted by {hackathon.host.orgName} · Squad Size: {hackathon.teamMin}–{hackathon.teamMax} members
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#0B0E18]/55 backdrop-blur-md border border-white/[0.08] text-right shrink-0 shadow-sm">
            <div className="text-[10px] font-mono text-[#94A3B8] uppercase font-bold">Entry Fee</div>
            <div className="text-sm font-black text-[#F8FAFC]">
              {hackathon.fee === 0 || hackathon.paymentMode === "FREE" ? "FREE" : `₹${hackathon.fee}`}
            </div>
            <div className="text-[10px] font-mono font-bold text-[#818CF8]">
              {hackathon.paymentMode === "FREE"
                ? "Instant Team ID"
                : hackathon.paymentMode === "QR"
                ? "QR Proof Verification"
                : "Razorpay Checkout"}
            </div>
          </div>
        </div>
      </div>

      {/* Existing Pending Draft Team Banner */}
      {existingDraftTeam && (
        <div className="p-6 rounded-3xl bg-[#6366F1]/10 border border-[#6366F1]/30 backdrop-blur-md space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase font-bold text-[#818CF8] bg-[#6366F1]/20 border border-[#6366F1]/30 px-2.5 py-0.5 rounded">
                  Pending Application Found
                </span>
                {existingDraftTeam.teamId && (
                  <span className="text-xs font-mono font-bold text-[#F8FAFC] bg-white/[0.04] px-2 py-0.5 rounded border border-white/10">
                    {existingDraftTeam.teamId}
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Squad &ldquo;{existingDraftTeam.name}&rdquo;
              </h3>
              <p className="text-xs text-[#94A3B8] font-mono">
                You already initiated an application with {existingDraftTeam.members.length} members for this hackathon.
                Complete payment verification to lock in your squad.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleDiscardDraft}
                disabled={discardingDraft}
                className="px-3.5 py-2.5 rounded-xl border border-white/10 text-xs font-mono text-[#94A3B8] hover:text-red-400 hover:border-red-500/30 transition-colors disabled:opacity-40"
              >
                {discardingDraft ? "Discarding..." : "Discard Draft"}
              </button>
              <Link
                href={`/hackathons/${hackathon.slug}/payment/${existingDraftTeam.id}`}
                className="px-4 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold text-xs font-mono transition-colors flex items-center gap-1.5 shadow-md shadow-indigo-500/20"
              >
                Resume Payment
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Invariant Rule 1 Lead Conflict Alert */}
      {leadConflict && !existingDraftTeam && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-amber-300 flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
          <div className="space-y-1">
            <div className="font-bold">Invariant Rule 1 Restriction Active</div>
            <p className="text-amber-200/90 leading-relaxed">{leadConflict}</p>
          </div>
        </div>
      )}

      {/* Prominent Inline Server Error Alert */}
      {submitError && (
        <div
          ref={errorRef}
          className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-300 flex items-start gap-3 shadow-lg shadow-red-500/5 animate-fadeIn"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
          <div className="space-y-1">
            <div className="font-bold text-red-200">Application Submission Error</div>
            <p className="leading-relaxed text-red-300">{submitError}</p>
          </div>
        </div>
      )}

      {/* Application Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Team Basics */}
        <div className="p-7 rounded-3xl bg-[#0B0E18]/55 backdrop-blur-md border border-white/[0.08] space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-[#6366F1] text-white font-mono text-xs flex items-center justify-center font-bold shadow-sm">
                1
              </span>
              <h2 className="text-sm font-bold text-[#F8FAFC]">Team Details</h2>
            </div>
            <span className="text-[11px] font-mono text-[#64748B] font-semibold">Required</span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono text-[#F8FAFC] font-semibold block">
              Team / Squad Name <span className="text-[#818CF8]">*</span>
            </label>
            <input
              type="text"
              required
              value={teamName}
              onChange={(e) => {
                setTeamName(e.target.value);
                setSubmitError(null);
              }}
              placeholder="e.g., Matrix Architects, VectorOps, ZeroDay Collective"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[#F8FAFC] placeholder-[#64748B] text-xs font-mono focus:outline-none focus:border-[#6366F1]"
            />
          </div>

          {/* Lead Card */}
          <div className="pt-2">
            <div className="text-[11px] font-mono text-[#94A3B8] uppercase tracking-wider font-bold mb-2">
              Team Lead (Designated Applicant)
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-[#F8FAFC] flex items-center gap-2">
                  <span>{session.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-[#6366F1]/20 text-[#818CF8] font-bold border border-[#6366F1]/30">
                    LEAD
                  </span>
                </div>
                <div className="text-[11px] font-mono text-[#94A3B8]">
                  {session.email} · {session.studentProfile?.college || "Collegiate Engineer"}
                </div>
              </div>
              <div className="font-mono text-xs text-[#818CF8] font-bold bg-[#6366F1]/10 px-2.5 py-1 rounded-lg border border-[#6366F1]/20 shadow-sm">
                {session.hackathonId}
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Teammate Addition */}
        <div className="p-7 rounded-3xl bg-[#0B0E18]/55 backdrop-blur-md border border-white/[0.08] space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-[#6366F1] text-white font-mono text-xs flex items-center justify-center font-bold shadow-sm">
                2
              </span>
              <h2 className="text-sm font-bold text-[#F8FAFC]">Squad Members</h2>
            </div>
            <span className="text-[11px] font-mono text-[#94A3B8] font-semibold">
              Current Squad: <strong className="text-[#F8FAFC]">{currentTotal}</strong> / {hackathon.teamMax} (Min: {hackathon.teamMin})
            </span>
          </div>

          <div className="text-xs text-[#94A3B8] leading-relaxed">
            Per <strong className="text-[#F8FAFC]">PRD Rule 2</strong>: Only the team lead applies. Enter your teammates&apos; permanent <strong className="text-[#F8FAFC]">Hackathon IDs (HB-XXXXXX)</strong> below. Each student is verified live against Invariant Rule 1.
          </div>

          {/* Teammate Input Box */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-[#F8FAFC] font-semibold block">
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
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[#F8FAFC] placeholder-[#64748B] text-xs font-mono uppercase focus:outline-none focus:border-[#6366F1] disabled:opacity-50"
                />
              </div>

              <button
                type="button"
                onClick={handleAddTeammate}
                disabled={lookupLoading || currentTotal >= hackathon.teamMax || !teammateInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold text-xs font-mono transition-colors disabled:opacity-40 flex items-center gap-1.5 shrink-0 shadow-sm"
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
              <p className="text-[11px] font-mono text-red-400 font-semibold flex items-center gap-1.5 pt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {lookupError}
              </p>
            )}
          </div>

          {/* Teammates List */}
          <div className="space-y-2 pt-2">
            {teammates.length === 0 ? (
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/[0.08] text-center text-xs font-mono text-[#94A3B8]">
                {hackathon.teamMin > 1
                  ? `This hackathon requires at least ${hackathon.teamMin} members (Lead + ${
                      hackathon.teamMin - 1
                    } teammate${hackathon.teamMin - 1 > 1 ? "s" : ""}). Enter teammate Hackathon IDs above.`
                  : "Solo participation allowed, or add up to " +
                    (hackathon.teamMax - 1) +
                    " teammate(s)."}
              </div>
            ) : (
              teammates.map((teammate, idx) => (
                <div
                  key={teammate.hackathonId}
                  className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs font-mono"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-[#F8FAFC] flex items-center gap-2">
                      <span>{teammate.name}</span>
                      <span className="text-[10px] font-bold text-[#818CF8] bg-[#6366F1]/15 border border-[#6366F1]/30 px-2 py-0.5 rounded">
                        Verified & Eligible
                      </span>
                    </div>
                    <div className="text-[11px] text-[#94A3B8]">{teammate.college}</div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[#818CF8] font-bold bg-[#6366F1]/10 px-2.5 py-1 rounded-lg border border-[#6366F1]/20 text-[11px] shadow-sm">
                      {teammate.hackathonId}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTeammate(idx)}
                      className="p-1 rounded text-[#64748B] hover:text-red-400 transition-colors"
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
        <div className="p-7 rounded-3xl bg-[#0B0E18]/55 backdrop-blur-md border border-white/[0.08] space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-[#6366F1] text-white font-mono text-xs flex items-center justify-center font-bold shadow-sm">
                3
              </span>
              <h2 className="text-sm font-bold text-[#F8FAFC]">Review & Registration Summary</h2>
            </div>
            <span className="text-[11px] font-mono text-[#94A3B8]">Step 3 of 3</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
              <span className="text-[10px] text-[#94A3B8] uppercase font-bold">Squad Members</span>
              <div
                className={`font-black ${
                  meetsMinSize && withinMaxSize
                    ? "text-[#818CF8] bg-[#6366F1]/15 px-2 py-0.5 rounded w-fit border border-[#6366F1]/30"
                    : "text-amber-400"
                }`}
              >
                {currentTotal} / {hackathon.teamMax}
                {meetsMinSize && withinMaxSize ? " (Valid)" : ` (Min ${hackathon.teamMin})`}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
              <span className="text-[10px] text-[#94A3B8] uppercase font-bold">Registration Fee</span>
              <div className="font-black text-[#F8FAFC]">
                {hackathon.fee === 0 || hackathon.paymentMode === "FREE" ? "FREE" : `₹${hackathon.fee}`}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
              <span className="text-[10px] text-[#94A3B8] uppercase font-bold">Verification Mode</span>
              <div className="font-bold text-[#818CF8]">
                {hackathon.paymentMode === "FREE"
                  ? "Instant Issue"
                  : hackathon.paymentMode === "QR"
                  ? "QR Approval Required"
                  : "Razorpay Checkout"}
              </div>
            </div>
          </div>

          {/* Action Area with Status Requirement Badge beside Button */}
          <div className="pt-3 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              {/* Requirement / Readiness Badge beside the button */}
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-mono px-3 py-1.5 rounded-xl border font-semibold flex items-center gap-2 transition-all ${
                    isReadyToSubmit
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  }`}
                >
                  {isReadyToSubmit ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  )}
                  <span>{requirementMessage}</span>
                </span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!isReadyToSubmit}
                className="py-3 px-6 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-extrabold text-xs font-mono transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0 active:scale-[0.99]"
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
            </div>

            <p className="text-[10px] font-mono text-[#64748B] text-center font-medium">
              PRD Rule 3: Official Team ID (TEAM-XXXXXX) is issued immediately upon squad creation & verified payment.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
