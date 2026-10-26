import React from "react";
import Link from "next/link";
import { ArrowRight, Lock, Layers, GitBranch, Shield, Terminal } from "lucide-react";

export const metadata = {
  title: "Protocol Documentation | HackBridge",
  description: "Complete architectural specification of the HackBridge competitive hackathon infrastructure.",
};

export default function DocsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 w-full">
      {/* Header */}
      <div className="max-w-3xl space-y-4 mb-16">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-white/[0.04] border border-white/10 text-[11px] font-mono text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1]" />
          ARCHITECTURE SPECIFICATION v1.0
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.1]">
          HackBridge Protocol Documentation
        </h1>
        <p className="text-base text-slate-400 leading-relaxed">
          The mathematical, cryptographic, and database specifications governing team formation, atomic problem unlocks, and immutable evaluation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Sticky Table of Contents (3 Cols) */}
        <aside className="lg:col-span-3 lg:sticky lg:top-24 space-y-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
            Table of Contents
          </div>
          <nav className="space-y-1.5 text-xs font-mono">
            <a href="#identity" className="block text-slate-400 hover:text-white transition-colors">
              01. Student Identifier Protocol
            </a>
            <a href="#registration" className="block text-slate-400 hover:text-white transition-colors">
              02. Single Active Registration Rule
            </a>
            <a href="#allocation" className="block text-slate-400 hover:text-white transition-colors">
              03. Atomic Balanced Allocation
            </a>
            <a href="#github-sync" className="block text-slate-400 hover:text-white transition-colors">
              04. Automated GitHub Commits
            </a>
            <a href="#scoring" className="block text-slate-400 hover:text-white transition-colors">
              05. Weighted Rubric Scoring
            </a>
          </nav>
        </aside>

        {/* Editorial Body (9 Cols) */}
        <main className="lg:col-span-9 space-y-16 text-sm text-slate-300 leading-relaxed">
          {/* Section 1 */}
          <section id="identity" className="space-y-4 scroll-mt-28">
            <h2 className="font-display text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="text-[#6366F1] font-mono text-lg">01.</span>
              Student Identifier Protocol (HB-XXXXXX)
            </h2>
            <p className="text-slate-400">
              Upon account creation, the server mints a permanent, cryptographically collision-checked identifier formatted as <code className="text-white font-mono bg-white/[0.04] px-1.5 py-0.5 rounded">HB-XXXXXX</code> (uppercase alphanumeric and digits excluding visually ambiguous characters such as &apos;I&apos; and &apos;O&apos;).
            </p>
            <div className="p-4 rounded-xl bg-[#0B0E18] border border-white/[0.08] space-y-2 text-xs font-mono">
              <div className="text-slate-400 uppercase text-[10px]">Specification Invariant:</div>
              <p>The student Hackathon ID is strictly immutable and persisted directly to the student profile record. Team leads assemble squads by inputting teammate IDs directly into the registration transaction.</p>
            </div>
          </section>

          {/* Section 2 */}
          <section id="registration" className="space-y-4 scroll-mt-28">
            <h2 className="font-display text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="text-[#6366F1] font-mono text-lg">02.</span>
              Single Active Registration Rule
            </h2>
            <p className="text-slate-400">
              PRD Non-Negotiable Rule 1 dictates that a student may belong to only one active hackathon squad at any given moment. This requirement prevents duplicate project submissions and resource hoarding across competing tracks.
            </p>
            <div className="p-4 rounded-xl bg-[#0B0E18] border border-white/[0.08] space-y-2 text-xs font-mono">
              <div className="text-slate-400 uppercase text-[10px]">Database Guarantee:</div>
              <p>Enforced by a unique database constraint on active squad memberships. When payment fails or a team is rejected by host organizers, member IDs are released atomically.</p>
            </div>
          </section>

          {/* Section 3 */}
          <section id="allocation" className="space-y-4 scroll-mt-28">
            <h2 className="font-display text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="text-[#6366F1] font-mono text-lg">03.</span>
              Atomic Balanced Allocation
            </h2>
            <p className="text-slate-400">
              All problem statements remain hidden server-side until the official domain countdown reaches zero. When statements unlock simultaneously, each statement is assigned an exact capacity cap:
            </p>
            <div className="p-5 rounded-xl bg-black/60 border border-white/10 text-center font-mono">
              <span className="text-lg text-white font-bold">
                Cap = ⌈ Registered Teams / Available Statements ⌉
              </span>
            </div>
            <p className="text-slate-400">
              Statement selection occurs inside an atomic transaction with serialized row locks. If two teams submit their choice for the final remaining slot concurrently, one succeeds while the other receives an instant rejection notice to pick another track.
            </p>
          </section>

          {/* Section 4 */}
          <section id="github-sync" className="space-y-4 scroll-mt-28">
            <h2 className="font-display text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="text-[#6366F1] font-mono text-lg">04.</span>
              Automated GitHub Repository Commits
            </h2>
            <p className="text-slate-400">
              Upon verified squad payment, HackBridge initializes a dedicated GitHub repository under the host organization, titled strictly by the squad’s verified <code className="text-white font-mono bg-white/[0.04] px-1.5 py-0.5 rounded">TEAM-XXXXXX</code> identifier.
            </p>
            <p className="text-slate-400">
              Every 30 minutes, squads log progress updates in 10% steps. All uploaded files or direct commits are tracked transparently for the judging panel.
            </p>
          </section>

          {/* Section 5 */}
          <section id="scoring" className="space-y-4 scroll-mt-28">
            <h2 className="font-display text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="text-[#6366F1] font-mono text-lg">05.</span>
              Weighted Rubric Scoring
            </h2>
            <p className="text-slate-400">
              Hackathon hosts configure weighted multi-criteria rubrics (e.g. Technical Depth 35%, Approach 30%, Usability 20%, Production Feasibility 15%). Approved judges submit numeric scores and notes per criterion.
            </p>
            <p className="text-slate-400">
              Final weighted totals and leaderboard ranks are computed automatically by the engine. In accordance with PRD Rule 8, participating teams see strictly their own verified final score.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
