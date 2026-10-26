import React from "react";

export const metadata = {
  title: "Terms of Protocol | HackBridge",
  description: "Terms governing student builders, institutional hosts, and evaluators on HackBridge.",
};

export default function TermsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 w-full">
      <div className="max-w-3xl space-y-4 mb-16">
        <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
          LEGAL GOVERNANCE
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.1]">
          Terms of Protocol & Competition
        </h1>
        <p className="text-base text-slate-400">
          Last revised: October 26, 2026 · Governing all competitive actions across HackBridge.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <aside className="lg:col-span-3 lg:sticky lg:top-24 space-y-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
            Clauses
          </div>
          <nav className="space-y-1.5 text-xs font-mono">
            <a href="#eligibility" className="block text-slate-400 hover:text-white transition-colors">
              1. Student Eligibility & Permanent ID
            </a>
            <a href="#single-track" className="block text-slate-400 hover:text-white transition-colors">
              2. Single Active Registration Rule
            </a>
            <a href="#submission" className="block text-slate-400 hover:text-white transition-colors">
              3. Immutable Submissions
            </a>
            <a href="#intellectual-property" className="block text-slate-400 hover:text-white transition-colors">
              4. Code Ownership & Open Source
            </a>
          </nav>
        </aside>

        <main className="lg:col-span-9 space-y-12 text-sm text-slate-300 leading-relaxed">
          <section id="eligibility" className="space-y-3 scroll-mt-28">
            <h2 className="font-display text-xl font-bold text-white">
              1. Student Eligibility & Permanent ID
            </h2>
            <p className="text-slate-400">
              Users registering as students represent that they are currently enrolled at a recognized academic institution. The assigned <code className="text-white font-mono bg-white/[0.04] px-1.5 py-0.5 rounded">HB-XXXXXX</code> Hackathon ID is strictly personal and non-transferable.
            </p>
          </section>

          <section id="single-track" className="space-y-3 scroll-mt-28">
            <h2 className="font-display text-xl font-bold text-white">
              2. Single Active Registration Invariant
            </h2>
            <p className="text-slate-400">
              A student ID may belong to strictly one active hackathon squad at any given moment. Attempting to circumvent this database invariant through multiple accounts or aliases will result in immediate disqualification and platform suspension.
            </p>
          </section>

          <section id="submission" className="space-y-3 scroll-mt-28">
            <h2 className="font-display text-xl font-bold text-white">
              3. Immutable Submissions & Virus Verification
            </h2>
            <p className="text-slate-400">
              Final submissions locked at deadline cannot be altered. Uploaded application binaries and executable packages are subject to automated security scanning and will be disqualified if found to contain unauthorized payloads.
            </p>
          </section>

          <section id="intellectual-property" className="space-y-3 scroll-mt-28">
            <h2 className="font-display text-xl font-bold text-white">
              4. Code Ownership & Open Source Licensing
            </h2>
            <p className="text-slate-400">
              All code authored by participating squads remains the intellectual property of the team members, licensed in accordance with the host hackathon track guidelines.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
