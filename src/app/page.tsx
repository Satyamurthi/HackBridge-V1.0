"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Terminal, 
  ArrowRight, 
  Clock, 
  Layers, 
  Lock,
  GitBranch,
  Shield,
  ExternalLink,
  Building2
} from "lucide-react";

interface HackathonItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  prizePool?: string;
  teamMin: number;
  teamMax: number;
  fee: number;
  startAt: string;
  endAt: string;
  host: {
    orgName: string;
    type: string;
  };
  domains: Array<{
    id: string;
    name: string;
    revealAt?: string | null;
    problemStatements: Array<{ id: string; title: string }>;
  }>;
  _count?: {
    teams: number;
  };
}

export default function HomePage() {
  const [hackathons, setHackathons] = useState<HackathonItem[]>([]);
  const [loadingHackathons, setLoadingHackathons] = useState(true);
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Fetch real hackathon data from database
  useEffect(() => {
    fetch("/api/v1/hackathons")
      .then((res) => (res.ok ? res.json() : { hackathons: [] }))
      .then((data) => {
        setHackathons(data.hackathons || []);
        setLoadingHackathons(false);
      })
      .catch(() => {
        setHackathons([]);
        setLoadingHackathons(false);
      });
  }, []);

  const featured = hackathons.length > 0 ? hackathons[0] : null;

  // Real-time server-clock countdown targeting actual domain revealAt or hackathon startAt
  useEffect(() => {
    if (!featured) return;

    const now = Date.now();
    let candidateTarget: Date | null = null;

    if (featured.domains && featured.domains.length > 0) {
      const futureReveals = featured.domains
        .map((d) => (d.revealAt ? new Date(d.revealAt) : null))
        .filter((d): d is Date => d !== null && d.getTime() > now)
        .sort((a, b) => a.getTime() - b.getTime());

      if (futureReveals.length > 0) {
        candidateTarget = futureReveals[0];
      }
    }

    if (!candidateTarget && featured.startAt) {
      const start = new Date(featured.startAt);
      if (start.getTime() > now) {
        candidateTarget = start;
      }
    }

    const calculateTime = () => {
      if (!candidateTarget) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        setIsUnlocked(true);
        return;
      }
      const diff = candidateTarget.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        setIsUnlocked(true);
      } else {
        setIsUnlocked(false);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds });
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [featured]);

  const totalStatements = featured?.domains?.reduce((sum, d) => sum + (d.problemStatements?.length || 0), 0) || 0;
  const totalTeams = featured?._count?.teams || 0;
  const capValue = totalStatements > 0 ? Math.ceil(totalTeams / totalStatements) : 0;

  return (
    <div className="relative w-full flex flex-col items-center overflow-hidden bg-transparent text-[#F8FAFC]">
      {/* 1. Hero Section (Transparent background reveals global 3D rotating dotted globe) */}
      <section className="relative w-full min-h-[90vh] flex items-center px-4 md:px-8 py-20 lg:py-28 overflow-hidden">
        {/* Subtle radial depth gradient in single accent indigo */}
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-[#6366F1]/10 rounded-full blur-3xl pointer-events-none -z-1" />

        <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column (7 Cols) */}
          <div className="lg:col-span-7 space-y-7 animate-fade-in-up">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-[#F8FAFC] backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-[#6366F1] animate-pulse" />
              <span className="tracking-wider uppercase text-[11px] font-bold text-[#818CF8]">
                PROTOCOL v1.0
              </span>
              <span className="text-white/20">/</span>
              <span className="text-[11px] font-medium text-[#94A3B8]">
                Collegiate Hackathon Infrastructure
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#6366F1]/20 text-[#818CF8] font-bold text-[10px] border border-[#6366F1]/30">
                LIVE
              </span>
            </div>

            <h1 className="font-display text-4xl sm:text-6xl lg:text-[4.25rem] font-extrabold text-[#F8FAFC] tracking-[-0.035em] leading-[1.08]">
              Architectural Infrastructure for{" "}
              <span className="text-white underline decoration-[#6366F1] decoration-2 underline-offset-8">
                High-Stakes Hackathons.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-[#94A3B8] leading-relaxed max-w-xl font-normal">
              Permanent student credentials, atomic problem allocation, and automated GitHub repository provisioning—engineered for university builders and serious hackathon hosts.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
              <Link
                href="/signup/student"
                className="px-6 py-3.5 rounded-xl bg-[#6366F1] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#4F46E5] transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
              >
                <Terminal className="w-4 h-4" />
                Claim Student Hackathon ID
              </Link>

              <Link
                href="/register/college"
                className="px-6 py-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[#F8FAFC] font-semibold text-sm border border-[#6366F1]/30 flex items-center justify-center gap-2 transition-all backdrop-blur-sm active:scale-[0.98]"
              >
                <Building2 className="w-4 h-4 text-[#818CF8]" />
                Host a Hackathon
              </Link>

              <Link
                href="/hackathons"
                className="px-5 py-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] text-[#94A3B8] hover:text-white font-medium text-sm border border-white/[0.06] flex items-center justify-center gap-2 transition-all backdrop-blur-sm active:scale-[0.98]"
              >
                Explore Arenas
                <ArrowRight className="w-4 h-4 text-[#818CF8]" />
              </Link>
            </div>

            <div className="pt-6 border-t border-white/[0.08] flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] font-mono text-[#94A3B8]">
              <div className="flex items-center gap-1.5">
                <span className="text-[#818CF8] font-bold">01</span>
                <span>HB-XXXXXX PERMANENT ID</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#818CF8] font-bold">02</span>
                <span>ATOMIC ROW LOCKING</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#818CF8] font-bold">03</span>
                <span>GITHUB COMMITS PER SQUAD</span>
              </div>
            </div>
          </div>

          {/* Right Column (5 Cols) - Semi-transparent Dark Obsidian Telemetry Card */}
          <div className="lg:col-span-5 w-full flex justify-center lg:justify-end animate-fade-in-up">
            <div className="w-full max-w-md bg-[#0B0E18]/75 backdrop-blur-xl p-7 rounded-3xl space-y-5 border border-white/[0.08] shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${featured ? "bg-[#6366F1] animate-pulse" : "bg-slate-600"}`} />
                  <span className="text-xs font-mono font-bold tracking-wider text-[#F8FAFC] uppercase">
                    {featured ? "Live Arena Telemetry" : "Telemetry Standby"}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-[#94A3B8]">
                  SERVER CLOCK
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#818CF8] font-bold">
                  {featured ? "Featured Track" : "Platform Protocol"}
                </div>
                <h3 className="text-xl font-bold text-[#F8FAFC] tracking-tight">
                  {featured ? featured.title : "Arena Standby: Protocol Ready"}
                </h3>
                <p className="text-xs text-[#94A3B8]">
                  {featured
                    ? `Organized by ${featured.host?.orgName || "Collegiate Host"} · ${featured.domains?.length || 0} Domain${(featured.domains?.length || 0) === 1 ? "" : "s"}`
                    : "Zero active public arenas currently published"}
                </p>
              </div>

              {/* Countdown Timer */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-2.5">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#94A3B8] font-semibold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#818CF8]" />
                  {isUnlocked ? "Problem Statement Status:" : "Problem Statement Unlock In:"}
                </div>
                {isUnlocked ? (
                  <div className="p-3 rounded-xl bg-[#6366F1]/15 border border-[#6366F1]/30 text-center font-mono">
                    <div className="text-xs font-extrabold text-[#F8FAFC] tracking-wider">
                      ALLOCATION & SELECTION ACTIVE
                    </div>
                    <div className="text-[10px] text-[#94A3B8] mt-0.5">
                      Server-synchronized row locking enabled
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 text-center font-mono">
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                      <div className="text-2xl font-black text-[#F8FAFC]">{String(timeLeft.hours).padStart(2, "0")}</div>
                      <div className="text-[9px] text-[#94A3B8] uppercase font-bold">Hours</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                      <div className="text-2xl font-black text-[#F8FAFC]">{String(timeLeft.minutes).padStart(2, "0")}</div>
                      <div className="text-[9px] text-[#94A3B8] uppercase font-bold">Minutes</div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/30">
                      <div className="text-2xl font-black text-[#818CF8]">{String(timeLeft.seconds).padStart(2, "0")}</div>
                      <div className="text-[9px] text-[#818CF8] uppercase font-bold">Seconds</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-[11px] font-mono text-[#94A3B8] flex items-center justify-between pt-1">
                <span className="font-semibold">Allocation Cap:</span>
                <span className="text-[#F8FAFC] font-bold">
                  {featured
                    ? totalStatements > 0
                      ? `⌈ ${totalTeams} / ${totalStatements} ⌉ = ${capValue} max / problem`
                      : "Atomic Row-Locked"
                    : "Enforced at Transaction Layer"}
                </span>
              </div>

              <Link
                href={featured ? `/hackathons/${featured.slug}/apply` : "/hackathons"}
                className="w-full py-3 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-500/20 active:scale-[0.99]"
              >
                {featured ? "Register Squad as Lead" : "Explore Arena Registry"}
                <ArrowRight className="w-3.5 h-3.5 text-white" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Strip */}
      <section className="w-full border-y border-white/[0.08] bg-[#030407]/40 backdrop-blur-sm py-8">
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-[#F8FAFC] font-display">
              ₹5,00,000<span className="text-[#818CF8]">+</span>
            </div>
            <div className="text-xs font-mono text-[#94A3B8] uppercase font-semibold">
              Verified Prize Pools
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-[#F8FAFC] font-display">
              5,000<span className="text-[#818CF8]">+</span>
            </div>
            <div className="text-xs font-mono text-[#94A3B8] uppercase font-semibold">
              Collegiate Builders
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-[#818CF8] font-display">
              100%
            </div>
            <div className="text-xs font-mono text-[#94A3B8] uppercase font-semibold">
              Atomic Row Locking
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-[#F8FAFC] font-display">
              0<span className="text-[#818CF8]">ms</span>
            </div>
            <div className="text-xs font-mono text-[#94A3B8] uppercase font-semibold">
              Dispute Resolution
            </div>
          </div>
        </div>
      </section>

      {/* 2. Real Data Arena Section (Hidden if no approved hackathons exist) */}
      {!loadingHackathons && hackathons.length > 0 && (
        <section className="w-full max-w-7xl mx-auto px-4 md:px-8 py-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-[#818CF8] font-bold mb-1">
                Database Verified Arenas
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F8FAFC] tracking-tight">
                Active & Published Hackathons
              </h2>
            </div>
            <Link
              href="/hackathons"
              className="text-xs font-mono font-bold text-[#818CF8] hover:text-white flex items-center gap-1.5 transition-colors"
            >
              All Approved Tracks ({hackathons.length}) <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {hackathons.map((h) => (
              <div
                key={h.id}
                className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] hover:border-[#6366F1]/50 rounded-2xl p-6 flex flex-col justify-between space-y-6 transition-all shadow-lg hover:shadow-indigo-500/10"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-[#F8FAFC] font-medium">
                      {h.host?.orgName || "Collegiate Host"}
                    </span>
                    <span className="text-xs font-mono text-[#818CF8] bg-[#6366F1]/15 px-2 py-0.5 rounded border border-[#6366F1]/30 font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] animate-pulse" />
                      Active
                    </span>
                  </div>

                  <div>
                    <h3 className="font-display text-xl font-bold text-[#F8FAFC] tracking-tight">
                      {h.title}
                    </h3>
                    <p className="text-xs text-[#94A3B8] mt-2 line-clamp-2 leading-relaxed">
                      {h.description}
                    </p>
                  </div>

                  {h.domains && h.domains.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {h.domains.map((d) => (
                        <span
                          key={d.id}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] text-[#94A3B8] font-medium"
                        >
                          {d.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono">
                  <div className="space-y-0.5">
                    <div className="text-[10px] text-[#64748B] uppercase font-semibold">Prize & Size</div>
                    <div className="text-[#F8FAFC] font-bold">
                      {h.prizePool || "Certificates"} · {h.teamMin}-{h.teamMax} Members
                    </div>
                  </div>

                  <Link
                    href={`/hackathons/${h.slug || h.id}/apply`}
                    className="px-4 py-2 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    Apply as Lead
                    <ExternalLink className="w-3.5 h-3.5 text-white" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Horizontal-Scroll How-It-Works Strip */}
      <section className="w-full border-y border-white/[0.08] py-20 bg-[#0B0E18]/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-[#818CF8] font-bold mb-1">
              End-to-End Workflow
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F8FAFC] tracking-tight">
              From Collegiate Registration to Archived Repository
            </h2>
          </div>
          <span className="text-xs font-mono text-[#94A3B8] font-semibold">
            Scroll horizontally →
          </span>
        </div>

        {/* Scrollable Track */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 overflow-x-auto pb-4 scrollbar-none">
          <div className="flex gap-5 min-w-[1100px]">
            {/* Step 1 */}
            <div className="w-[280px] bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] p-6 rounded-2xl flex flex-col justify-between space-y-4 shadow-sm hover:border-[#6366F1]/40 transition-colors">
              <div className="space-y-3">
                <span className="text-xs font-mono font-bold text-[#818CF8] bg-[#6366F1]/15 px-2 py-0.5 rounded border border-[#6366F1]/30">01 // IDENTITY</span>
                <h3 className="text-sm font-bold text-[#F8FAFC]">Permanent Student Mint</h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Every student signs up and receives a permanent <code className="text-[#F8FAFC] font-bold bg-white/[0.05] px-1 py-0.5 rounded border border-white/[0.08]">HB-XXXXXX</code> ID with live uniqueness validation across active registrations.
                </p>
              </div>
              <div className="text-[11px] font-mono text-[#64748B] font-medium">One Registration Lock</div>
            </div>

            {/* Step 2 */}
            <div className="w-[280px] bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] p-6 rounded-2xl flex flex-col justify-between space-y-4 shadow-sm hover:border-[#6366F1]/40 transition-colors">
              <div className="space-y-3">
                <span className="text-xs font-mono font-bold text-[#818CF8] bg-[#6366F1]/15 px-2 py-0.5 rounded border border-[#6366F1]/30">02 // FORMATION</span>
                <h3 className="text-sm font-bold text-[#F8FAFC]">Lead Squad Assembly</h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Only the team lead applies and adds members by their Hackathon ID. After adding teammates, proceeds directly to Razorpay or host-verified QR payment.
                </p>
              </div>
              <div className="text-[11px] font-mono text-[#64748B] font-medium">Verified Team ID Generated</div>
            </div>

            {/* Step 3 */}
            <div className="w-[280px] bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] p-6 rounded-2xl flex flex-col justify-between space-y-4 shadow-sm hover:border-[#6366F1]/40 transition-colors">
              <div className="space-y-3">
                <span className="text-xs font-mono font-bold text-[#818CF8] bg-[#6366F1]/15 px-2 py-0.5 rounded border border-[#6366F1]/30">03 // REVEAL</span>
                <h3 className="text-sm font-bold text-[#F8FAFC]">Atomic Timed Allocation</h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Problem statements remain hidden on the server until zero countdown. Allocation caps dynamically balance: <code className="text-[#F8FAFC] font-bold bg-white/[0.05] px-1 py-0.5 rounded border border-white/[0.08]">⌈Teams / Statements⌉</code> with database row locks.
                </p>
              </div>
              <div className="text-[11px] font-mono text-[#64748B] font-medium">Zero Overbooking</div>
            </div>

            {/* Step 4 */}
            <div className="w-[280px] bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] p-6 rounded-2xl flex flex-col justify-between space-y-4 shadow-sm hover:border-[#6366F1]/40 transition-colors">
              <div className="space-y-3">
                <span className="text-xs font-mono font-bold text-[#818CF8] bg-[#6366F1]/15 px-2 py-0.5 rounded border border-[#6366F1]/30">04 // WORKSPACE</span>
                <h3 className="text-sm font-bold text-[#F8FAFC]">GitHub Repo Sync & Timeline</h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Teams log progress in 10% non-decreasing increments. All code uploaded or committed lands in an automated GitHub repository named after the Team ID.
                </p>
              </div>
              <div className="text-[11px] font-mono text-[#64748B] font-medium">Immutable 30-min Logs</div>
            </div>

            {/* Step 5 */}
            <div className="w-[280px] bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] p-6 rounded-2xl flex flex-col justify-between space-y-4 shadow-sm hover:border-[#6366F1]/40 transition-colors">
              <div className="space-y-3">
                <span className="text-xs font-mono font-bold text-[#818CF8] bg-[#6366F1]/15 px-2 py-0.5 rounded border border-[#6366F1]/30">05 // EVALUATION</span>
                <h3 className="text-sm font-bold text-[#F8FAFC]">Weighted Rubric Scoring</h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Approved judges evaluate locked code and submissions based on host criteria weights. Results are computed automatically and archived to student portfolios.
                </p>
              </div>
              <div className="text-[11px] font-mono text-[#64748B] font-medium">Permanent Career Archive</div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Sticky Scroll Architectural Guarantees */}
      <section className="w-full max-w-7xl mx-auto px-4 md:px-8 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Sticky Left Column */}
          <div className="lg:col-span-5 lg:sticky lg:top-28 space-y-5">
            <div className="text-xs font-mono uppercase tracking-wider text-[#818CF8] font-bold">
              Architectural Invariants
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#F8FAFC] tracking-tight">
              Fair Competition Guaranteed by Code.
            </h2>
            <p className="text-sm text-[#94A3B8] leading-relaxed">
              HackBridge eliminates manual spreadsheets, Google Forms confusion, and payment verification disputes by executing every rule at the database transaction layer.
            </p>
            <div className="pt-2">
              <Link
                href="/docs"
                className="text-xs font-mono text-[#818CF8] font-bold underline underline-offset-4 hover:text-white transition-colors"
              >
                Read Complete Architectural Specification →
              </Link>
            </div>
          </div>

          {/* Scrolling Right Column (Stacked Invariant Cards) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] p-6 rounded-2xl space-y-3 shadow-sm hover:border-white/20 transition-colors">
              <div className="flex items-center gap-2 text-[#F8FAFC] font-bold text-sm">
                <Lock className="w-4 h-4 text-[#818CF8]" />
                Rule 1: Strict One-Hackathon Registration
              </div>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Enforced via unique database constraints on active squad memberships. If a student is already registered in an ongoing hackathon, any lead attempting to add their ID receives a deterministic error identifying the conflict.
              </p>
            </div>

            <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] p-6 rounded-2xl space-y-3 shadow-sm hover:border-white/20 transition-colors">
              <div className="flex items-center gap-2 text-[#F8FAFC] font-bold text-sm">
                <Layers className="w-4 h-4 text-[#818CF8]" />
                Rule 2: Atomic Row Locks on Selection
              </div>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                When problem statements unlock simultaneously, slot caps are calculated as <code className="text-[#F8FAFC] font-bold bg-white/[0.05] px-1 py-0.5 rounded border border-white/[0.08]">ceil(total_teams / total_statements)</code>. Selections execute inside a serialized database transaction with row locks, guaranteeing zero overbooked slots.
              </p>
            </div>

            <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] p-6 rounded-2xl space-y-3 shadow-sm hover:border-white/20 transition-colors">
              <div className="flex items-center gap-2 text-[#F8FAFC] font-bold text-sm">
                <GitBranch className="w-4 h-4 text-[#818CF8]" />
                Rule 3: Automatic GitHub Commits Named by Team ID
              </div>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Every squad receives an automated repository generated under the host or organization GitHub credentials. All progress commits are permanent, transparent to judges, and preserved in the student&apos;s verified portfolio.
              </p>
            </div>

            <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] p-6 rounded-2xl space-y-3 shadow-sm hover:border-white/20 transition-colors">
              <div className="flex items-center gap-2 text-[#F8FAFC] font-bold text-sm">
                <Shield className="w-4 h-4 text-[#818CF8]" />
                Rule 4: Immutable Final Submissions
              </div>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Once a team lead submits their repository and description, the entry is locked. No edits or re-uploads can be made unless the hackathon host explicitly executes an unlock action, which is permanently recorded in the audit log.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
