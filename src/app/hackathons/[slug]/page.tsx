"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
        { v: timeLeft.d, l: "Days" },
        { v: timeLeft.h, l: "Hours" },
        { v: timeLeft.m, l: "Min" },
        { v: timeLeft.s, l: "Sec" },
      ].map(({ v, l }) => (
        <div key={l} className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
          <div className="text-lg font-bold text-white">{pad(v)}</div>
          <div className="text-[9px] text-slate-500 uppercase">{l}</div>
        </div>
      ))}
    </div>
  );
}

export default function HackathonDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [hackathon, setHackathon] = useState<HackathonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [showRules, setShowRules] = useState(false);

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
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-16 w-full space-y-6">
        <div className="h-10 w-2/3 rounded-xl bg-white/[0.03] border border-white/5 animate-pulse" />
        <div className="h-48 rounded-2xl bg-[#0B0E18] border border-white/5 animate-pulse" />
        <div className="h-64 rounded-2xl bg-[#0B0E18] border border-white/5 animate-pulse" />
      </div>
    );
  }

  if (error || !hackathon) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 p-8">
        <AlertCircle className="w-8 h-8 text-slate-500" />
        <h1 className="font-display text-xl font-bold text-white">Hackathon Not Found</h1>
        <p className="text-sm text-slate-400">This track may have been archived or the link is invalid.</p>
        <Link href="/hackathons" className="text-xs font-mono text-[#6366F1] underline underline-offset-4">
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
    ? { label: "LIVE NOW", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" }
    : isUpcoming
    ? { label: "UPCOMING", cls: "bg-[#6366F1]/10 text-[#6366F1] border-[#6366F1]/20" }
    : { label: "ENDED", cls: "bg-white/5 text-slate-400 border-white/10" };

  const canApply = !isEnded && hackathon.status === "PUBLISHED";

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-14 w-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 mb-8">
        <Link href="/" className="hover:text-white transition-colors">HackBridge</Link>
        <ChevronRight className="w-3 h-3" />
        <Link href="/hackathons" className="hover:text-white transition-colors">Arenas</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-300 truncate">{hackathon.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Hero Card */}
          <div className="bg-[#0B0E18] border border-white/[0.08] rounded-2xl p-7 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5" />
                  {hackathon.host.orgName}
                  {hackathon.host.website && (
                    <a
                      href={hackathon.host.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#6366F1] hover:underline flex items-center gap-0.5"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {hackathon.title}
                </h1>
              </div>
              <span className={`flex-shrink-0 text-[10px] font-mono px-2.5 py-1 rounded border font-semibold ${statusBadge.cls}`}>
                {statusBadge.label}
              </span>
            </div>

            <p className="text-sm text-slate-400 leading-relaxed">{hackathon.description}</p>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {[
                { icon: Users, label: "Team Size", value: `${hackathon.teamMin}–${hackathon.teamMax}` },
                { icon: Trophy, label: "Prize Pool", value: hackathon.prizePool || "Certificates" },
                { icon: Scale, label: "Entry Fee", value: feeLabel },
                { icon: Layers, label: "Domains", value: `${hackathon.domains.length}` },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 uppercase">
                    <Icon className="w-3 h-3" />
                    {label}
                  </div>
                  <div className="text-xs font-bold text-white">{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Domains & Problem Statements */}
          <div className="bg-[#0B0E18] border border-white/[0.08] rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-white/[0.08]">
              <h2 className="text-sm font-bold text-white tracking-tight">Domains & Problem Statements</h2>
              <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                Problem statements unlock server-side at each domain&apos;s configured reveal time.
              </p>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {hackathon.domains.map((domain) => {
                const revealAt = new Date(domain.revealAt);
                const isRevealed = domain.revealed;
                return (
                  <div key={domain.id} className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCode className="w-4 h-4 text-[#6366F1]" />
                        <span className="text-sm font-bold text-white">{domain.name}</span>
                      </div>
                      {isRevealed ? (
                        <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Revealed
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Unlocks {revealAt.toLocaleDateString("en-IN")} at {revealAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                    {domain.description && (
                      <p className="text-xs text-slate-400 leading-relaxed">{domain.description}</p>
                    )}
                    {isRevealed && domain.problemStatements.length > 0 ? (
                      <div className="space-y-1.5 pl-6">
                        {domain.problemStatements.map((ps) => (
                          <div key={ps.id} className="text-xs font-mono text-slate-300 flex items-center gap-2">
                            <span className="text-[#6366F1]">→</span>
                            {ps.title}
                          </div>
                        ))}
                      </div>
                    ) : !isRevealed ? (
                      <div className="pl-6 text-xs font-mono text-slate-600 flex items-center gap-2">
                        <Lock className="w-3 h-3" />
                        {domain.problemStatements.length} problem statement{domain.problemStatements.length !== 1 ? "s" : ""} hidden until reveal
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rules */}
          <div className="bg-[#0B0E18] border border-white/[0.08] rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowRules(!showRules)}
              className="w-full p-5 border-b border-white/[0.08] flex items-center justify-between hover:bg-white/[0.02] transition-colors"
            >
              <h2 className="text-sm font-bold text-white tracking-tight">Hackathon Rules & Guidelines</h2>
              <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${showRules ? "rotate-90" : ""}`} />
            </button>
            {showRules && (
              <div className="p-5">
                <pre className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap font-sans">
                  {hackathon.rules}
                </pre>
                {hackathon.rulesGate && (
                  <label className="mt-5 flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rulesAccepted}
                      onChange={(e) => setRulesAccepted(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded accent-[#6366F1]"
                    />
                    <span className="text-xs text-slate-300 leading-relaxed">
                      I have read and agree to abide by all rules and guidelines of this hackathon.
                    </span>
                  </label>
                )}
              </div>
            )}
          </div>

          {/* Rubric */}
          {hackathon.rubricCriteria.length > 0 && (
            <div className="bg-[#0B0E18] border border-white/[0.08] rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-white/[0.08]">
                <h2 className="text-sm font-bold text-white tracking-tight">Judging Rubric</h2>
                <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                  Weighted criteria used by approved judges for scoring.
                </p>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {hackathon.rubricCriteria.map((c) => (
                  <div key={c.id} className="px-5 py-3 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300">{c.name}</span>
                    <div className="flex items-center gap-3 text-slate-500">
                      <span>Weight: <span className="text-white">{c.weight}×</span></span>
                      <span>Max: <span className="text-white">{c.maxScore} pts</span></span>
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
          <div className="bg-[#0B0E18] border border-white/[0.08] rounded-2xl p-5 space-y-5">
            {isUpcoming && (
              <>
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Hackathon Begins In
                </div>
                <Countdown target={startAt} />
              </>
            )}

            {isLive && (
              <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Hackathon Is Live Now
              </div>
            )}

            {isEnded && (
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                This hackathon has ended.
              </div>
            )}

            {/* Schedule */}
            <div className="space-y-2 text-xs font-mono pt-1 border-t border-white/[0.06]">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Start</span>
                <span className="text-white">
                  {startAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> End</span>
                <span className="text-white">
                  {endAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5"><Users className="w-3 h-3" /> Squads</span>
                <span className="text-white">{hackathon._count?.teams ?? 0} registered</span>
              </div>
            </div>

            {/* Apply Button */}
            {canApply ? (
              hackathon.rulesGate && !rulesAccepted ? (
                <div className="space-y-3">
                  <p className="text-[11px] text-amber-400 font-mono flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    You must read and accept the rules to apply.
                  </p>
                  <button
                    onClick={() => setShowRules(true)}
                    className="w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold transition-colors border border-white/10"
                  >
                    Read Rules First
                  </button>
                </div>
              ) : (
                <Link
                  href={`/hackathons/${hackathon.slug}/apply`}
                  className="w-full py-3 rounded-xl bg-white hover:bg-slate-200 text-black font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  Apply as Team Lead
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )
            ) : isEnded ? (
              <div className="text-center text-xs font-mono text-slate-500 py-2">
                Applications closed
              </div>
            ) : null}
          </div>

          {/* Host Info */}
          <div className="bg-[#0B0E18] border border-white/[0.08] rounded-2xl p-5 space-y-3">
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              Organized By
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/5 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-slate-400" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">{hackathon.host.orgName}</div>
                <div className="text-[10px] font-mono text-slate-500 capitalize">
                  {hackathon.host.type} chapter
                </div>
              </div>
            </div>
          </div>

          {/* For Judges */}
          <div className="bg-[#0B0E18] border border-white/[0.08] rounded-2xl p-5 space-y-3">
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              Judges
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {hackathon._count?.judges ?? 0} judge{hackathon._count?.judges !== 1 ? "s" : ""} approved for this track.
            </p>
            <Link
              href={`/signup/judge?hackathon=${hackathon.id}`}
              className="text-xs font-mono text-[#6366F1] hover:text-white transition-colors underline underline-offset-4"
            >
              Apply as Judge →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
