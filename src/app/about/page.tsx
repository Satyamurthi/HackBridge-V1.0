import React from "react";
import Link from "next/link";
import { ShieldCheck, Building2, Terminal, ArrowRight } from "lucide-react";

export const metadata = {
  title: "About | HackBridge",
  description: "The architectural mission and engineering philosophy behind HackBridge.",
};

export default function AboutPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 w-full">
      <div className="max-w-3xl space-y-4 mb-16">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-white/[0.04] border border-white/10 text-[11px] font-mono text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1]" />
          ORIGIN & PRINCIPLES
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.1]">
          Engineering Infrastructure for Collegiate Hackathons.
        </h1>
        <p className="text-base text-slate-400 leading-relaxed">
          Why we replaced messy Google Forms, spreadsheet tracking, and payment verification chat groups with a deterministic competitive platform.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Table of Contents */}
        <aside className="lg:col-span-3 lg:sticky lg:top-24 space-y-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
            Principles
          </div>
          <nav className="space-y-1.5 text-xs font-mono">
            <a href="#problem" className="block text-slate-400 hover:text-white transition-colors">
              The Problem We Solved
            </a>
            <a href="#mission" className="block text-slate-400 hover:text-white transition-colors">
              Our Mission
            </a>
            <a href="#invariants" className="block text-slate-400 hover:text-white transition-colors">
              Core Architectural Invariants
            </a>
            <a href="#colleges" className="block text-slate-400 hover:text-white transition-colors">
              Collegiate Ecosystem
            </a>
          </nav>
        </aside>

        {/* Editorial Body */}
        <main className="lg:col-span-9 space-y-16 text-sm text-slate-300 leading-relaxed">
          <section id="problem" className="space-y-4 scroll-mt-28">
            <h2 className="font-display text-2xl font-bold text-white tracking-tight">
              The Problem We Solved
            </h2>
            <p className="text-slate-400">
              Collegiate hackathons are among the highest-leverage engineering events on the planet, yet organizers historically operated them using makeshift Google Sheets, unverified screenshots of UPI payments, and informal messaging channels.
            </p>
            <p className="text-slate-400">
              Students participated in multiple tracks without proof of past accomplishments, and code written during 48-hour sprints was frequently lost or abandoned across forgotten local drives.
            </p>
          </section>

          <section id="mission" className="space-y-4 scroll-mt-28">
            <h2 className="font-display text-2xl font-bold text-white tracking-tight">
              Our Mission
            </h2>
            <p className="text-slate-400">
              HackBridge provides an institutional competitive platform where universities and industry partners host verified tracks, students maintain permanent verified credentials, and problem allocation occurs with mathematical fairness.
            </p>
          </section>

          <section id="invariants" className="space-y-4 scroll-mt-28">
            <h2 className="font-display text-2xl font-bold text-white tracking-tight">
              Core Architectural Invariants
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-4 rounded-xl bg-[#0B0E18] border border-white/[0.08] space-y-2">
                <span className="text-white font-bold">1. Zero Overbooked Slots</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Every problem statement slot is protected by transactional row locks. Allocation caps recalculate dynamically as team counts fluctuate.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#0B0E18] border border-white/[0.08] space-y-2">
                <span className="text-white font-bold">2. Permanent Code Preservation</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  All work is committed to automated GitHub repositories titled by Team ID, ensuring student engineering portfolios endure beyond event closure.
                </p>
              </div>
            </div>
          </section>

          <section id="colleges" className="space-y-4 scroll-mt-28">
            <h2 className="font-display text-2xl font-bold text-white tracking-tight">
              Collegiate Ecosystem
            </h2>
            <p className="text-slate-400">
              HackBridge chapters span premier engineering institutions, ACM student branches, and IEEE collegiate societies. All organizer chapters undergo verification prior to public publishing clearance.
            </p>
            <div className="pt-4">
              <Link
                href="/signup/host"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-slate-200 transition-colors"
              >
                Apply as Collegiate Chapter
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
