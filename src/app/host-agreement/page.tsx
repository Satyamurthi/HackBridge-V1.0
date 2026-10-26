import React from "react";

export const metadata = {
  title: "Host Operating Agreement | HackBridge",
  description: "Terms and responsibilities for colleges and companies hosting on HackBridge.",
};

export default function HostAgreementPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 w-full">
      <div className="max-w-3xl space-y-4 mb-16">
        <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
          HOST GOVERNANCE
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.1]">
          Host Chapter Operating Agreement
        </h1>
        <p className="text-base text-slate-400">
          Responsibilities for academic institutions and enterprises hosting hackathon arenas on HackBridge.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <aside className="lg:col-span-3 lg:sticky lg:top-24 space-y-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
            Terms
          </div>
          <nav className="space-y-1.5 text-xs font-mono">
            <a href="#approval" className="block text-slate-400 hover:text-white transition-colors">
              1. Host Account Approval
            </a>
            <a href="#rubrics" className="block text-slate-400 hover:text-white transition-colors">
              2. Fair Rubrics & Judge Approvals
            </a>
            <a href="#audit" className="block text-slate-400 hover:text-white transition-colors">
              3. Permanent Audit Trail
            </a>
          </nav>
        </aside>

        <main className="lg:col-span-9 space-y-12 text-sm text-slate-300 leading-relaxed">
          <section id="approval" className="space-y-3 scroll-mt-28">
            <h2 className="font-display text-xl font-bold text-white">
              1. Super Admin Host Approval
            </h2>
            <p className="text-slate-400">
              Host organizations cannot publish hackathon tracks, accept student applications, or collect registration fees until cleared by Super Admin review. Paused hosts maintain read-only access to existing events.
            </p>
          </section>

          <section id="rubrics" className="space-y-3 scroll-mt-28">
            <h2 className="font-display text-xl font-bold text-white">
              2. Fair Rubrics & Judge Approvals
            </h2>
            <p className="text-slate-400">
              Hosts must define rubric criteria and weights prior to problem unlock. All incoming judge requests must be verified by the host chapter to prevent conflicts of interest.
            </p>
          </section>

          <section id="audit" className="space-y-3 scroll-mt-28">
            <h2 className="font-display text-xl font-bold text-white">
              3. Audit Trail Invariant
            </h2>
            <p className="text-slate-400">
              In accordance with PRD Rule 10, every host action (manual submission unlocks, QR payment approvals, judge authorizations) is permanently committed to the immutable audit log.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
