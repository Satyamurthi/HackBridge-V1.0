"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Terminal, 
  ArrowRight, 
  Clock, 
  Users, 
  Trophy, 
  CheckCircle2, 
  Layers, 
  Building2, 
  Scale, 
  Lock,
  GitBranch,
  Shield,
  FileCode,
  Calendar,
  ExternalLink
} from "lucide-react";
import Hero3D from "@/components/hero/Hero3D";

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
    hours: 18,
    minutes: 42,
    seconds: 15,
  });

  // Simulated server countdown for active track reveal
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 0, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  return (
    <div className="relative w-full flex flex-col items-center overflow-hidden">
      {/* 1. Hero Section (Left-aligned, Display font, Single Accent, No Glows) */}
      <section className="relative w-full min-h-[92vh] flex items-center px-4 md:px-8 py-20 lg:py-28 overflow-hidden">
        <Hero3D />

        <div className="absolute inset-0 noise-overlay pointer-events-none z-[1]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#030407] via-[#030407]/85 to-[#030407]/60 pointer-events-none z-[2]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#030407] via-transparent to-[#030407]/50 pointer-events-none z-[2]" />

        <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column (7 Cols) */}
          <div className="lg:col-span-7 space-y-7 animate-fade-in-up">
            <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/10 text-xs font-mono text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1]" />
              <span className="tracking-wider uppercase text-[11px] text-slate-400">
                PROTOCOL v1.0
              </span>
              <span className="text-slate-600">/</span>
              <span className="text-[11px] text-slate-300">
                Collegiate Hackathon Infrastructure
              </span>
            </div>

            <h1 className="font-display text-4xl sm:text-6xl lg:text-[4.25rem] font-extrabold text-white tracking-[-0.035em] leading-[1.06]">
              Architectural Infrastructure for High-Stakes Hackathons.
            </h1>

            <p className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-xl font-normal">
              Permanent student credentials, atomic problem allocation, and automated GitHub repository provisioning—engineered for university builders and serious hackathon hosts.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
              <Link
                href="/signup/student"
                className="px-6 py-3.5 rounded-xl bg-white text-black font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
              >
                <Terminal className="w-4 h-4" />
                Claim Student Hackathon ID
              </Link>

              <Link
                href="/hackathons"
                className="px-6 py-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white font-medium text-sm border border-white/10 flex items-center justify-center gap-2 transition-colors"
              >
                Explore Active Arenas
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>

            <div className="pt-6 border-t border-white/10 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] font-mono text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">01</span>
                <span>HB-XXXXXX PERMANENT ID</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">02</span>
                <span>ATOMIC ROW LOCKING</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">03</span>
                <span>GITHUB COMMITS PER SQUAD</span>
              </div>
            </div>
          </div>

          {/* Right Column (5 Cols) */}
          <div className="lg:col-span-5 w-full flex justify-center lg:justify-end animate-fade-in-up">
            <div className="w-full max-w-md glass-panel-architectural p-6 rounded-2xl space-y-5 border border-white/10">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-mono font-semibold tracking-wider text-slate-300 uppercase">
                    Live Arena Telemetry
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400">
                  SERVER CLOCK
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#6366F1]">
                  Featured National Track
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  HackBridge National Grand Arena 2026
                </h3>
                <p className="text-xs text-slate-400">
                  Organized by MIT Tech Chapter · Multi-Domain Problem Reveal
                </p>
              </div>

              <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Problem Statement Unlock In:
                </div>
                <div className="grid grid-cols-3 gap-2 text-center font-mono">
                  <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                    <div className="text-xl font-bold text-white">{String(timeLeft.hours).padStart(2, "0")}</div>
                    <div className="text-[9px] text-slate-500 uppercase">Hours</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                    <div className="text-xl font-bold text-white">{String(timeLeft.minutes).padStart(2, "0")}</div>
                    <div className="text-[9px] text-slate-500 uppercase">Minutes</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                    <div className="text-xl font-bold text-[#6366F1]">{String(timeLeft.seconds).padStart(2, "0")}</div>
                    <div className="text-[9px] text-slate-500 uppercase">Seconds</div>
                  </div>
                </div>
              </div>

              <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between pt-1">
                <span className="text-slate-500">Allocation Cap:</span>
                <span className="text-slate-200">⌈ Teams / Statements ⌉</span>
              </div>

              <Link
                href="/hackathons/hackbridge-national-2026/apply"
                className="w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white text-xs font-semibold flex items-center justify-center gap-2 border border-white/10 transition-colors"
              >
                Register Squad as Lead
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Real Data Arena Section (Hidden if no approved hackathons exist) */}
      {!loadingHackathons && hackathons.length > 0 && (
        <section className="w-full max-w-7xl mx-auto px-4 md:px-8 py-20 border-t border-white/[0.06]">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-[#6366F1] mb-1">
                Database Verified Arenas
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Active & Published Hackathons
              </h2>
            </div>
            <Link
              href="/hackathons"
              className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              All Approved Tracks ({hackathons.length}) <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {hackathons.map((h) => (
              <div
                key={h.id}
                className="bg-[#0B0E18] border border-white/[0.08] hover:border-white/20 rounded-2xl p-6 flex flex-col justify-between space-y-6 transition-colors"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.04] border border-white/10 text-slate-400">
                      {h.host?.orgName || "Collegiate Host"}
                    </span>
                    <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Active
                    </span>
                  </div>

                  <div>
                    <h3 className="font-display text-xl font-bold text-white tracking-tight">
                      {h.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                      {h.description}
                    </p>
                  </div>

                  {h.domains && h.domains.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {h.domains.map((d) => (
                        <span
                          key={d.id}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.03] border border-white/5 text-slate-400"
                        >
                          {d.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono">
                  <div className="space-y-0.5">
                    <div className="text-[10px] text-slate-500 uppercase">Prize & Size</div>
                    <div className="text-white font-medium">
                      {h.prizePool || "Certificates"} · {h.teamMin}-{h.teamMax} Members
                    </div>
                  </div>

                  <Link
                    href={`/hackathons/${h.slug || h.id}/apply`}
                    className="px-4 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-white/10"
                  >
                    Apply as Lead
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Horizontal-Scroll How-It-Works Strip */}
      <section className="w-full border-y border-white/[0.06] py-20 bg-[#06080F]/60">
        <div className="max-w-7xl mx-auto px-4 md:px-8 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-[#6366F1] mb-1">
              End-to-End Workflow
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              From Collegiate Registration to Archived Repository
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Scroll horizontally →
          </span>
        </div>

        {/* Scrollable Track */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 overflow-x-auto pb-4 scrollbar-none">
          <div className="flex gap-5 min-w-[1100px]">
            {/* Step 1 */}
            <div className="w-[280px] bg-[#0B0E18] border border-white/[0.08] p-6 rounded-2xl flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <span className="text-xs font-mono font-bold text-[#6366F1]">01 // IDENTITY</span>
                <h3 className="text-sm font-bold text-white">Permanent Student Mint</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Every student signs up and receives a permanent <code className="text-slate-300">HB-XXXXXX</code> ID with live uniqueness validation across active registrations.
                </p>
              </div>
              <div className="text-[11px] font-mono text-slate-500">One Registration Lock</div>
            </div>

            {/* Step 2 */}
            <div className="w-[280px] bg-[#0B0E18] border border-white/[0.08] p-6 rounded-2xl flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <span className="text-xs font-mono font-bold text-[#6366F1]">02 // FORMATION</span>
                <h3 className="text-sm font-bold text-white">Lead Squad Assembly</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Only the team lead applies and adds members by their Hackathon ID. After adding teammates, proceeds directly to Razorpay or host-verified QR payment.
                </p>
              </div>
              <div className="text-[11px] font-mono text-slate-500">Verified Team ID Generated</div>
            </div>

            {/* Step 3 */}
            <div className="w-[280px] bg-[#0B0E18] border border-white/[0.08] p-6 rounded-2xl flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <span className="text-xs font-mono font-bold text-[#6366F1]">03 // REVEAL</span>
                <h3 className="text-sm font-bold text-white">Atomic Timed Allocation</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Problem statements remain hidden on the server until zero countdown. Allocation caps dynamically balance: <code className="text-slate-300">⌈Teams / Statements⌉</code> with database row locks.
                </p>
              </div>
              <div className="text-[11px] font-mono text-slate-500">Zero Overbooking</div>
            </div>

            {/* Step 4 */}
            <div className="w-[280px] bg-[#0B0E18] border border-white/[0.08] p-6 rounded-2xl flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <span className="text-xs font-mono font-bold text-[#6366F1]">04 // WORKSPACE</span>
                <h3 className="text-sm font-bold text-white">GitHub Repo Sync & Timeline</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Teams log progress in 10% non-decreasing increments. All code uploaded or committed lands in an automated GitHub repository named after the Team ID.
                </p>
              </div>
              <div className="text-[11px] font-mono text-slate-500">Immutable 30-min Logs</div>
            </div>

            {/* Step 5 */}
            <div className="w-[280px] bg-[#0B0E18] border border-white/[0.08] p-6 rounded-2xl flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <span className="text-xs font-mono font-bold text-[#6366F1]">05 // EVALUATION</span>
                <h3 className="text-sm font-bold text-white">Weighted Rubric Scoring</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Approved judges evaluate locked code and submissions based on host criteria weights. Results are computed automatically and archived to student portfolios.
                </p>
              </div>
              <div className="text-[11px] font-mono text-slate-500">Permanent Career Archive</div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Sticky Scroll Architectural Guarantees */}
      <section className="w-full max-w-7xl mx-auto px-4 md:px-8 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Sticky Left Column */}
          <div className="lg:col-span-5 lg:sticky lg:top-28 space-y-5">
            <div className="text-xs font-mono uppercase tracking-wider text-[#6366F1]">
              Architectural Invariants
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Fair Competition Guaranteed by Code.
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              HackBridge eliminates manual spreadsheets, Google Forms confusion, and payment verification disputes by executing every rule at the database transaction layer.
            </p>
            <div className="pt-2">
              <Link
                href="/docs"
                className="text-xs font-mono text-white underline underline-offset-4 hover:text-[#6366F1] transition-colors"
              >
                Read Complete Architectural Specification →
              </Link>
            </div>
          </div>

          {/* Scrolling Right Column (Stacked Invariant Cards) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[#0B0E18] border border-white/[0.08] p-6 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Lock className="w-4 h-4 text-[#6366F1]" />
                Rule 1: Strict One-Hackathon Registration
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enforced via unique database constraints on active squad memberships. If a student is already registered in an ongoing hackathon, any lead attempting to add their ID receives a deterministic error identifying the conflict.
              </p>
            </div>

            <div className="bg-[#0B0E18] border border-white/[0.08] p-6 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Layers className="w-4 h-4 text-[#6366F1]" />
                Rule 2: Atomic Row Locks on Selection
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                When problem statements unlock simultaneously, slot caps are calculated as <code className="text-slate-300">ceil(total_teams / total_statements)</code>. Selections execute inside a serialized database transaction with row locks, guaranteeing zero overbooked slots.
              </p>
            </div>

            <div className="bg-[#0B0E18] border border-white/[0.08] p-6 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <GitBranch className="w-4 h-4 text-[#6366F1]" />
                Rule 3: Automatic GitHub Commits Named by Team ID
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every squad receives an automated repository generated under the host or organization GitHub credentials. All progress commits are permanent, transparent to judges, and preserved in the student&apos;s verified portfolio.
              </p>
            </div>

            <div className="bg-[#0B0E18] border border-white/[0.08] p-6 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Shield className="w-4 h-4 text-[#6366F1]" />
                Rule 4: Immutable Final Submissions
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Once a team lead submits their repository and description, the entry is locked. No edits or re-uploads can be made unless the hackathon host explicitly executes an unlock action, which is permanently recorded in the audit log.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
