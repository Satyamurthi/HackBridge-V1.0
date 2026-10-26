import React from "react";

export const metadata = {
  title: "Refund Policy | HackBridge",
  description: "Official refund guidelines for HackBridge hackathon tracks.",
};

export default function RefundsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 w-full">
      <div className="max-w-3xl space-y-4 mb-16">
        <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
          FINANCIAL POLICY
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.1]">
          Refund & Payment Terms
        </h1>
        <p className="text-base text-slate-400">
          Clear financial specifications governing hackathon participation fees.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <aside className="lg:col-span-3 lg:sticky lg:top-24 space-y-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
            Terms
          </div>
          <nav className="space-y-1.5 text-xs font-mono">
            <a href="#payment-verification" className="block text-slate-400 hover:text-white transition-colors">
              1. Payment Verification
            </a>
            <a href="#cancellations" className="block text-slate-400 hover:text-white transition-colors">
              2. Event Cancellations
            </a>
            <a href="#rejections" className="block text-slate-400 hover:text-white transition-colors">
              3. Host Payment Rejections
            </a>
          </nav>
        </aside>

        <main className="lg:col-span-9 space-y-12 text-sm text-slate-300 leading-relaxed">
          <section id="payment-verification" className="space-y-3 scroll-mt-28">
            <h2 className="font-display text-xl font-bold text-white">
              1. Payment Verification & Team ID Minting
            </h2>
            <p className="text-slate-400">
              Registration fees are verified either automatically via Razorpay webhooks or manually by host review of UPI QR transaction proofs. A Team ID is minted strictly upon verified payment confirmation.
            </p>
          </section>

          <section id="cancellations" className="space-y-3 scroll-mt-28">
            <h2 className="font-display text-xl font-bold text-white">
              2. Event Cancellations by Host
            </h2>
            <p className="text-slate-400">
              In the event that an approved host cancels an active track prior to problem statement countdown expiration, all registered squads are entitled to a 100% full refund returned via the original payment rail within 5-7 business days.
            </p>
          </section>

          <section id="rejections" className="space-y-3 scroll-mt-28">
            <h2 className="font-display text-xl font-bold text-white">
              3. Rejected QR Transaction Proofs
            </h2>
            <p className="text-slate-400">
              If a host organizer rejects a QR transaction proof due to mismatched reference IDs or unreadable screenshots, the squad reservation is dissolved and member Hackathon IDs are released back into the pool.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
