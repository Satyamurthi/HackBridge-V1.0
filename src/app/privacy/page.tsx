import React from "react";

export const metadata = {
  title: "Privacy Policy (DPDP Act) | HackBridge",
  description: "Data privacy policy and DPDP Act compliance on HackBridge.",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 w-full">
      <div className="max-w-3xl space-y-4 mb-16">
        <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
          DATA PROTECTION
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.1]">
          Privacy Policy & DPDP Compliance
        </h1>
        <p className="text-base text-slate-400">
          Last revised: October 26, 2026 · Compliant with India&apos;s Digital Personal Data Protection (DPDP) Act.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <aside className="lg:col-span-3 lg:sticky lg:top-24 space-y-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
            Clauses
          </div>
          <nav className="space-y-1.5 text-xs font-mono">
            <a href="#collection" className="block text-slate-400 hover:text-white transition-colors">
              1. Minimum Data Collection
            </a>
            <a href="#retention" className="block text-slate-400 hover:text-white transition-colors">
              2. Purpose & Retention
            </a>
            <a href="#rights" className="block text-slate-400 hover:text-white transition-colors">
              3. Data Principal Rights
            </a>
            <a href="#security" className="block text-slate-400 hover:text-white transition-colors">
              4. Security & Encryption at Rest
            </a>
          </nav>
        </aside>

        <main className="lg:col-span-9 space-y-12 text-sm text-slate-300 leading-relaxed">
          <section id="collection" className="space-y-3 scroll-mt-28">
            <h2 className="font-display text-xl font-bold text-white">
              1. Minimum Necessary Data Collection
            </h2>
            <p className="text-slate-400">
              HackBridge collects only minimum student data required for competitive identity and credential issuance: full legal name, institutional email, college affiliation, and technical skills.
            </p>
          </section>

          <section id="retention" className="space-y-3 scroll-mt-28">
            <h2 className="font-display text-xl font-bold text-white">
              2. Purpose Limitation & Retention
            </h2>
            <p className="text-slate-400">
              Personal data is processed strictly for team validation, payment verification, and automated GitHub repository creation. HackBridge does not sell or lease student data to third-party advertising brokers.
            </p>
          </section>

          <section id="rights" className="space-y-3 scroll-mt-28">
            <h2 className="font-display text-xl font-bold text-white">
              3. Data Principal Rights
            </h2>
            <p className="text-slate-400">
              Under India’s DPDP Act, users may request full data export or account erasure. Upon validated deletion requests, personal records are permanently pruned while maintaining anonymized audit logs.
            </p>
          </section>

          <section id="security" className="space-y-3 scroll-mt-28">
            <h2 className="font-display text-xl font-bold text-white">
              4. Security & Encryption at Rest
            </h2>
            <p className="text-slate-400">
              All credentials, API secrets, and sensitive tokens are encrypted at rest using industry-standard AES-256 and bcrypt hashing.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
