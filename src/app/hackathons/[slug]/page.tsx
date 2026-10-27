"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Calendar,
  Users,
  Trophy,
  Clock,
  ArrowRight,
  Building2,
  Lock,
  CheckCircle2,
  AlertCircle,
  Layers,
  FileCode,
  Scale,
  ChevronRight,
  ExternalLink,
  X,
  FileText,
  ShieldCheck
} from "lucide-react";

interface HackathonDetail {
  id: string;
  title: string;
  slug: string;
  description: string;
  rules: string;
  rulesGate: boolean;
  prizePool?: string;
  teamMin: number;
  teamMax: number;
  fee: number;
  paymentMode: string;
  bannerUrl?: string;
  startAt: string;
  endAt: string;
  status: string;
  host: { orgName: string; type: string; website?: string };
  domains: Array<{
    id: string;
    name: string;
    description?: string;
    revealAt: string;
    revealed: boolean;
    problemStatements: Array<{ id: string; title: string; cap: number }>;
  }>;
  rubricCriteria: Array<{ id: string; name: string; weight: number; maxScore: number }>;
  _count?: { teams: number; judges: number };
}

function Countdown({ target }: { target: Date }) {
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, target.getTime() - Date.now());
      setTimeLeft({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="grid grid-cols-4 gap-2 text-center font-mono">
      {[
        { v: timeLeft.d, l: "Days", isIndigo: false },
        { v: timeLeft.h, l: "Hours", isIndigo: false },
        { v: timeLeft.m, l: "Min", isIndigo: false },
        { v: timeLeft.s, l: "Sec", isIndigo: true },
      ].map(({ v, l, isIndigo }) => (
        <div key={l} className={`p-2.5 rounded-xl border shadow-sm ${isIndigo ? "bg-[#6366F1]/10 border-[#6366F1]/30" : "bg-white/[0.03] border-white/[0.08]"}`}>
          <div className={`text-xl font-black ${isIndigo ? "text-[#818CF8]" : "text-[#F8FAFC]"}`}>{pad(v)}</div>
          <div className={`text-[9px] uppercase font-bold ${isIndigo ? "text-[#818CF8]" : "text-[#94A3B8]"}`}>{l}</div>
        </div>
      ))}
    </div>
  );
}

export default function HackathonDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [hackathon, setHackathon] = useState<HackathonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showRulesAccordion, setShowRulesAccordion] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/hackathons/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error("not_found");
        return res.json();
      })
      .then((data) => {
        setHackathon(data.hackathon);
        setLoading(false);
      })
      .catch(() => {
        setError("Hackathon not found");
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-16 w-full space-y-6 bg-transparent text-[#F8FAFC] relative z-10">
        <div className="h-10 w-2/3 rounded-xl bg-white/[0.04] border border-white/[0.08] animate-pulse" />
        <div className="h-48 rounded-2xl bg-white/[0.04] border border-white/[0.08] animate-pulse" />
        <div className="h-64 rounded-2xl bg-white/[0.04] border border-white/[0.08] animate-pulse" />
      </div>
    );
  }

  if (error || !hackathon) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 p-8 bg-transparent text-[#F8FAFC] relative z-10">
        <AlertCircle className="w-8 h-8 text-[#818CF8]" />
        <h1 className="font-display text-xl font-bold text-[#F8FAFC]">Hackathon Not Found</h1>
        <p className="text-sm text-[#94A3B8]">This track may have been archived or the link is invalid.</p>
        <Link href="/hackathons" className="text-xs font-mono font-bold text-[#818CF8] underline underline-offset-4">
          Browse all hackathons →
        </Link>
      </div>
    );
  }

  const now = new Date();
  const startAt = new Date(hackathon.startAt);
  const endAt = new Date(hackathon.endAt);
  const isLive = now >= startAt && now <= endAt;
  const isUpcoming = now < startAt;
  const isEnded = now > endAt;

  const feeLabel =
    hackathon.paymentMode === "FREE" || hackathon.fee === 0
      ? "Free Entry"
      : `₹${hackathon.fee} via ${hackathon.paymentMode === "QR" ? "QR Transfer" : "Razorpay"}`;

  const statusBadge = isLive
    ? { label: "LIVE NOW", cls: "bg-[#6366F1]/20 text-[#818CF8] border-[#6366F1]/40" }
    : isUpcoming
    ? { label: "UPCOMING", cls: "bg-white/[0.05] text-[#94A3B8] border-white/[0.1]" }
    : { label: "ENDED", cls: "bg-white/[0.02] text-[#64748B] border-white/[0.04]" };

  const canApply = !isEnded && hackathon.status === "PUBLISHED";

  const handleAcceptRulesAndApply = () => {
    setRulesAccepted(true);
    setShowRulesModal(false);
    router.push(`/hackathons/${hackathon.slug}/apply`);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-14 w-full bg-transparent text-[#F8FAFC] relative z-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[11px] font-mono text-[#94A3B8] mb-8">
        <Link href="/" className="hover:text-[#6366F1] transition-colors">HackBridge</Link>
        <ChevronRight className="w-3 h-3 text-[#64748B]" />
        <Link href="/hackathons" className="hover:text-[#6366F1] transition-colors">Arenas</Link>
        <ChevronRight className="w-3 h-3 text-[#64748B]" />
        <span className="text-[#F8FAFC] font-semibold truncate">{hackathon.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Hero Card */}
          <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] rounded-3xl p-7 space-y-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="text-[11px] font-mono text-[#94A3B8] flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-[#818CF8]" />
                  <span className="font-semibold text-[#F8FAFC]">{hackathon.host.orgName}</span>
                  {hackathon.host.website && (
                    <a
                      href={hackathon.host.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#818CF8] hover:underline flex items-center gap-0.5"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
                  {hackathon.title}
                </h1>
              </div>
              <span className={`flex-shrink-0 text-[10px] font-mono px-2.5 py-1 rounded-full font-bold border ${statusBadge.cls}`}>
                {statusBadge.label}
              </span>
            </div>

            <p className="text-sm text-[#94A3B8] leading-relaxed">{hackathon.description}</p>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {[
                { icon: Users, label: "Team Size", value: `${hackathon.teamMin}–${hackathon.teamMax}` },
                { icon: Trophy, label: "Prize Pool", value: hackathon.prizePool || "Certificates" },
                { icon: Scale, label: "Entry Fee", value: feeLabel },
                { icon: Layers, label: "Domains", value: `${hackathon.domains.length}` },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#94A3B8] uppercase font-bold">
                    <Icon className="w-3 h-3 text-[#818CF8]" />
                    {label}
                  </div>
                  <div className="text-xs font-black text-[#F8FAFC]">{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Domains & Problem Statements */}
          <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] rounded-3xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-white/[0.08] bg-white/[0.02]">
              <h2 className="text-base font-bold text-[#F8FAFC] tracking-tight">Domains & Problem Statements</h2>
              <p className="text-[11px] font-mono text-[#94A3B8] mt-0.5">
                Problem statements unlock server-side at each domain&apos;s configured reveal time.
              </p>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {hackathon.domains.map((domain) => {
                const revealAt = new Date(domain.revealAt);
                const isRevealed = domain.revealed;
                return (
                  <div key={domain.id} className="p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCode className="w-4 h-4 text-[#818CF8]" />
                        <span className="text-sm font-bold text-[#F8FAFC]">{domain.name}</span>
                      </div>
                      {isRevealed ? (
                        <span className="text-[10px] font-mono font-bold text-[#818CF8] bg-[#6366F1]/15 px-2 py-0.5 rounded border border-[#6366F1]/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Revealed
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-[#94A3B8] bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.06] flex items-center gap-1">
                          <Lock className="w-3 h-3 text-[#818CF8]" />
                          Unlocks {revealAt.toLocaleDateString("en-IN")} at {revealAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                    {domain.description && (
                      <p className="text-xs text-[#94A3B8] leading-relaxed">{domain.description}</p>
                    )}
                    {isRevealed && domain.problemStatements.length > 0 ? (
                      <div className="space-y-1.5 pl-6">
                        {domain.problemStatements.map((ps) => (
                          <div key={ps.id} className="text-xs font-mono text-[#F8FAFC] flex items-center gap-2 font-medium">
                            <span className="text-[#818CF8] font-bold">→</span>
                            {ps.title}
                          </div>
                        ))}
                      </div>
                    ) : !isRevealed ? (
                      <div className="pl-6 text-xs font-mono text-[#64748B] flex items-center gap-2">
                        <Lock className="w-3 h-3" />
                        {domain.problemStatements.length} problem statement{domain.problemStatements.length !== 1 ? "s" : ""} hidden until reveal
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rules & Guidelines */}
          <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] rounded-3xl overflow-hidden shadow-xl">
            <button
              type="button"
              onClick={() => setShowRulesAccordion(!showRulesAccordion)}
              className="w-full p-6 border-b border-white/[0.08] flex items-center justify-between hover:bg-white/[0.03] transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#818CF8]" />
                <h2 className="text-base font-bold text-[#F8FAFC] tracking-tight">Hackathon Rules & Guidelines</h2>
              </div>
              <ChevronRight className={`w-4 h-4 text-[#64748B] transition-transform ${showRulesAccordion ? "rotate-90" : ""}`} />
            </button>
            {showRulesAccordion && (
              <div className="p-6 space-y-4">
                <pre className="text-xs text-[#F8FAFC] leading-relaxed whitespace-pre-wrap font-sans bg-white/[0.02] p-4 rounded-2xl border border-white/[0.06]">
                  {hackathon.rules || "Standard HackBridge Competition Rules apply. Please ensure integrity and continuous code commits."}
                </pre>
                {hackathon.rulesGate && (
                  <label className="flex items-start gap-3 cursor-pointer p-3.5 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/30 hover:bg-[#6366F1]/15 transition-colors">
                    <input
                      type="checkbox"
                      checked={rulesAccepted}
                      onChange={(e) => setRulesAccepted(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded accent-[#6366F1] cursor-pointer"
                    />
                    <span className="text-xs text-[#F8FAFC] font-semibold leading-relaxed">
                      I have read, understood, and agree to abide by all rules and guidelines of this hackathon.
                    </span>
                  </label>
                )}
              </div>
            )}
          </div>

          {/* Rubric */}
          {hackathon.rubricCriteria.length > 0 && (
            <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] rounded-3xl overflow-hidden shadow-xl">
              <div className="p-6 border-b border-white/[0.08] bg-white/[0.02]">
                <h2 className="text-base font-bold text-[#F8FAFC] tracking-tight">Judging Rubric</h2>
                <p className="text-[11px] font-mono text-[#94A3B8] mt-0.5">
                  Weighted criteria used by approved judges for scoring.
                </p>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {hackathon.rubricCriteria.map((c) => (
                  <div key={c.id} className="px-6 py-3.5 flex items-center justify-between text-xs font-mono">
                    <span className="text-[#F8FAFC] font-semibold">{c.name}</span>
                    <div className="flex items-center gap-3 text-[#94A3B8]">
                      <span>Weight: <span className="text-[#818CF8] font-bold">{c.weight}×</span></span>
                      <span>Max: <span className="text-[#F8FAFC] font-bold">{c.maxScore} pts</span></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-5 lg:sticky lg:top-24">
          {/* Countdown or Apply CTA */}
          <div className="bg-[#0B0E18]/75 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-6 space-y-5 shadow-2xl">
            {isUpcoming && (
              <>
                <div className="text-[10px] font-mono text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5 font-bold">
                  <Clock className="w-3.5 h-3.5 text-[#818CF8]" /> Hackathon Begins In
                </div>
                <Countdown target={startAt} />
              </>
            )}

            {isLive && (
              <div className="text-[10px] font-mono text-[#818CF8] bg-[#6366F1]/15 border border-[#6366F1]/30 px-2.5 py-1.5 rounded-xl font-bold uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#6366F1] animate-pulse" />
                Hackathon Is Live Now
              </div>
            )}

            {isEnded && (
              <div className="text-[10px] font-mono text-[#94A3B8] bg-white/[0.03] px-3 py-1.5 rounded-xl font-semibold uppercase tracking-wider border border-white/[0.06]">
                This hackathon has ended.
              </div>
            )}

            {/* Schedule */}
            <div className="space-y-2 text-xs font-mono pt-1 border-t border-white/[0.08]">
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3 text-[#818CF8]" /> Start</span>
                <span className="text-[#F8FAFC] font-bold">
                  {startAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </div>
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3 text-[#818CF8]" /> End</span>
                <span className="text-[#F8FAFC] font-bold">
                  {endAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </div>
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span className="flex items-center gap-1.5"><Users className="w-3 h-3 text-[#818CF8]" /> Squads</span>
                <span className="text-[#F8FAFC] font-bold">{hackathon._count?.teams ?? 0} registered</span>
              </div>
            </div>

            {/* Apply Button & Rules Acceptance Gate */}
            {canApply ? (
              hackathon.rulesGate && !rulesAccepted ? (
                <div className="space-y-3.5 pt-1">
                  <div className="p-3.5 rounded-2xl bg-[#6366F1]/10 border border-[#6366F1]/30 space-y-2">
                    <p className="text-[11px] text-[#F8FAFC] font-semibold flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-[#818CF8] flex-shrink-0" />
                      Read and accept rules to unlock squad registration.
                    </p>
                    <label className="flex items-start gap-2 pt-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rulesAccepted}
                        onChange={(e) => setRulesAccepted(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded accent-[#6366F1] cursor-pointer"
                      />
                      <span className="text-xs text-[#F8FAFC] font-bold">
                        I agree to all hackathon rules
                      </span>
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowRulesModal(true)}
                    className="w-full py-3 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-[0.98]"
                  >
                    Read Rules First <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <Link
                  href={`/hackathons/${hackathon.slug}/apply`}
                  className="w-full py-3.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 font-mono tracking-wider active:scale-[0.98]"
                >
                  Apply as Lead <ArrowRight className="w-4 h-4" />
                </Link>
              )
            ) : null}
          </div>

          {/* Organizer Card */}
          <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] rounded-3xl p-6 space-y-3 shadow-sm">
            <div className="text-[10px] font-mono text-[#94A3B8] uppercase tracking-wider font-bold">
              Organized By
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-[#818CF8]" />
              </div>
              <div>
                <div className="text-sm font-bold text-[#F8FAFC]">{hackathon.host.orgName}</div>
                <div className="text-[11px] text-[#94A3B8] capitalize">{hackathon.host.type} Chapter</div>
              </div>
            </div>
          </div>

          {/* Judges Callout */}
          <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] rounded-3xl p-6 space-y-3 shadow-sm">
            <div className="text-[10px] font-mono text-[#94A3B8] uppercase tracking-wider font-bold">
              Judges
            </div>
            <p className="text-xs text-[#94A3B8]">
              {hackathon._count?.judges ?? 0} Judges approved for this track.
            </p>
            <Link
              href="/signup/judge"
              className="text-xs font-mono font-bold text-[#818CF8] hover:text-white flex items-center gap-1 transition-colors"
            >
              Apply as Judge →
            </Link>
          </div>
        </div>
      </div>

      {/* Interactive Rules & Agreement Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-[#0B0E18]/95 border border-white/20 rounded-3xl max-w-2xl w-full p-6 md:p-8 space-y-6 shadow-2xl relative max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#818CF8]" />
                <h3 className="font-display text-lg font-bold text-[#F8FAFC]">
                  Hackathon Rules & Participation Guidelines
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Rules Content */}
            <div className="overflow-y-auto flex-1 pr-2 space-y-4">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-xs text-[#F8FAFC] leading-relaxed whitespace-pre-wrap font-sans">
                {hackathon.rules || "1. All code submitted must be created during the event duration.\n2. Teams must push code to the designated GitHub repository.\n3. Problem statement allocation is subject to dynamic slot caps.\n4. Decisions of the judging panel and host are final."}
              </div>
            </div>

            {/* Checkbox & Acceptance Action */}
            <div className="pt-4 border-t border-white/[0.08] space-y-4">
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/30 select-none">
                <input
                  type="checkbox"
                  checked={rulesAccepted}
                  onChange={(e) => setRulesAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-[#6366F1] cursor-pointer"
                />
                <span className="text-xs text-[#F8FAFC] font-bold leading-relaxed">
                  I have read, understood, and accept all rules and terms for {hackathon.title}.
                </span>
              </label>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRulesModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/[0.08] text-xs font-semibold text-[#94A3B8] hover:bg-white/[0.04] transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleAcceptRulesAndApply}
                  className="px-5 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-[0.98]"
                >
                  Accept Rules & Proceed to Apply <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
