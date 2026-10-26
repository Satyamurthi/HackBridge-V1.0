import React from "react";
import Link from "next/link";
import { Terminal, Code2, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Developer API & Integrations | HackBridge",
  description: "REST API endpoints, webhooks, and GitHub repository synchronization for HackBridge.",
};

export default function DevelopersPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 w-full">
      <div className="max-w-3xl space-y-4 mb-16">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-white/[0.04] border border-white/10 text-[11px] font-mono text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1]" />
          DEVELOPER API REFERENCE
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.1]">
          HackBridge Developer Platform
        </h1>
        <p className="text-base text-slate-400 leading-relaxed">
          Versioned REST APIs under <code className="text-white font-mono bg-white/[0.04] px-1.5 py-0.5 rounded">/api/v1</code>, cryptographic signature verification, and automated GitHub organization hooks.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Sticky Table of Contents */}
        <aside className="lg:col-span-3 lg:sticky lg:top-24 space-y-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
            API Modules
          </div>
          <nav className="space-y-1.5 text-xs font-mono">
            <a href="#auth" className="block text-slate-400 hover:text-white transition-colors">
              /api/v1/auth
            </a>
            <a href="#students" className="block text-slate-400 hover:text-white transition-colors">
              /api/v1/students
            </a>
            <a href="#hackathons" className="block text-slate-400 hover:text-white transition-colors">
              /api/v1/hackathons
            </a>
            <a href="#teams" className="block text-slate-400 hover:text-white transition-colors">
              /api/v1/teams
            </a>
            <a href="#github" className="block text-slate-400 hover:text-white transition-colors">
              GitHub Sync Pipeline
            </a>
          </nav>
        </aside>

        {/* API Specification Content */}
        <main className="lg:col-span-9 space-y-16 text-sm text-slate-300 leading-relaxed">
          <section id="auth" className="space-y-4 scroll-mt-28">
            <h2 className="font-display text-2xl font-bold text-white tracking-tight">
              Authentication & Sessions
            </h2>
            <p className="text-slate-400">
              Stateful session tokens signed using HS256 JWT, delivered in HTTP-only, SameSite lax cookies.
            </p>
            <div className="p-4 rounded-xl bg-[#0B0E18] border border-white/[0.08] font-mono text-xs space-y-2">
              <div className="text-slate-400 uppercase text-[10px]">Endpoints:</div>
              <div className="text-white"><span className="text-[#6366F1] font-bold">POST</span> /api/v1/auth/signup</div>
              <div className="text-white"><span className="text-emerald-400 font-bold">POST</span> /api/v1/auth/login</div>
              <div className="text-white"><span className="text-sky-400 font-bold">GET</span> /api/v1/auth/me</div>
              <div className="text-white"><span className="text-slate-400 font-bold">POST</span> /api/v1/auth/logout</div>
            </div>
          </section>

          <section id="students" className="space-y-4 scroll-mt-28">
            <h2 className="font-display text-2xl font-bold text-white tracking-tight">
              Student ID Lookup & Eligibility
            </h2>
            <p className="text-slate-400">
              Query live student availability during squad registration. Returns real-time registration locks.
            </p>
            <div className="p-4 rounded-xl bg-[#0B0E18] border border-white/[0.08] font-mono text-xs space-y-2">
              <div className="text-white"><span className="text-sky-400 font-bold">GET</span> /api/v1/students/lookup/:hackathonId</div>
              <div className="p-3 rounded-lg bg-black/60 text-[11px] text-slate-300 overflow-x-auto">
{`// Sample Response (200 OK)
{
  "exists": true,
  "studentId": "uuid-90184",
  "hackathonId": "HB-102938",
  "name": "Priya Sundaram",
  "college": "IIIT",
  "isEligible": true,
  "blockedReason": null
}`}
              </div>
            </div>
          </section>

          <section id="hackathons" className="space-y-4 scroll-mt-28">
            <h2 className="font-display text-2xl font-bold text-white tracking-tight">
              Hackathon Tracks & Timed Domains
            </h2>
            <p className="text-slate-400">
              Lists approved, published hackathon events with synchronized server reveal clocks.
            </p>
            <div className="p-4 rounded-xl bg-[#0B0E18] border border-white/[0.08] font-mono text-xs space-y-2">
              <div className="text-white"><span className="text-sky-400 font-bold">GET</span> /api/v1/hackathons</div>
            </div>
          </section>

          <section id="github" className="space-y-4 scroll-mt-28">
            <h2 className="font-display text-2xl font-bold text-white tracking-tight">
              GitHub Sync Pipeline
            </h2>
            <p className="text-slate-400">
              Upon verified squad registration, HackBridge creates an automated repository <code className="text-white font-mono bg-white/[0.04] px-1.5 py-0.5 rounded">github.com/:org/:teamId</code>. If the GitHub API returns rate limits, the worker gracefully falls back to S3-compatible cold object storage with automatic retry.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
