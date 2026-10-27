"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  CreditCard, 
  Receipt, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  RefreshCw, 
  X, 
  FileText, 
  ShieldCheck,
  Lock,
  ArrowRight
} from "lucide-react";

interface PaymentItem {
  id: string;
  amount: number;
  mode: string;
  status: string;
  txnRef?: string | null;
  screenshotUrl?: string | null;
  orderId?: string | null;
  paymentId?: string | null;
  createdAt: string;
  verifiedAt?: string | null;
  isLead: boolean;
  team: {
    id: string;
    teamId: string | null;
    name: string;
    status: string;
    hackathon: {
      id: string;
      title: string;
      slug: string;
      fee: number;
      paymentMode: string;
      upiId?: string | null;
    };
    lead: {
      name: string;
      email: string;
    };
  };
}

export default function StudentPaymentsPage() {
  const [session, setSession] = useState<any>(null);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Receipt Modal state
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentItem | null>(null);

  // Resubmit Proof Modal state
  const [resubmittingPayment, setResubmittingPayment] = useState<PaymentItem | null>(null);
  const [newTxnRef, setNewTxnRef] = useState("");
  const [newScreenshotUrl, setNewScreenshotUrl] = useState("");
  const [resubmitting, setResubmitting] = useState(false);
  const [resubmitError, setResubmitError] = useState<string | null>(null);
  const [resubmitSuccess, setResubmitSuccess] = useState<string | null>(null);

  const loadPayments = useCallback(async () => {
    try {
      const [meRes, paymentsRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/payments"),
      ]);

      if (meRes.ok) {
        const meData = await meRes.json();
        setSession(meData.user || null);
      }

      if (paymentsRes.ok) {
        const pData = await paymentsRes.json();
        setPayments(pData.payments || []);
      } else {
        setError("Failed to load payment history.");
      }
    } catch {
      setError("Network error loading payments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const handleResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resubmittingPayment || !newTxnRef.trim()) return;

    setResubmitting(true);
    setResubmitError(null);
    setResubmitSuccess(null);

    try {
      const res = await fetch("/api/v1/payments/qr-proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: resubmittingPayment.team.id,
          txnRef: newTxnRef.trim(),
          screenshotUrl: newScreenshotUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setResubmitError(data.error || "Failed to resubmit payment proof.");
        setResubmitting(false);
        return;
      }

      setResubmitSuccess("Payment proof resubmitted successfully! Status updated to Pending Review.");
      setNewTxnRef("");
      setNewScreenshotUrl("");
      setResubmittingPayment(null);
      await loadPayments();
    } catch {
      setResubmitError("Network error resubmitting payment proof.");
    } finally {
      setResubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full">
        <div className="space-y-6">
          <div className="h-14 rounded-2xl bg-[#0B0E18]/55 border border-white/[0.08] animate-pulse" />
          <div className="h-64 rounded-2xl bg-[#0B0E18]/55 border border-white/[0.08] animate-pulse" />
        </div>
      </div>
    );
  }

  if (!session || session.role !== "STUDENT") {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center relative z-10">
        <div className="p-3 rounded-full bg-white/[0.04] border border-white/10 w-fit mx-auto mb-4">
          <Lock className="w-6 h-6 text-[#94A3B8]" />
        </div>
        <h1 className="font-display text-xl font-bold text-[#F8FAFC] mb-2">Student Session Required</h1>
        <p className="text-xs text-[#94A3B8] mb-6 leading-relaxed">
          Please sign in with your student credentials to view and manage your fee payments.
        </p>
        <Link
          href="/login?redirect=/dashboard/student/payments"
          className="px-5 py-2.5 rounded-lg bg-[#6366F1] text-white font-semibold text-xs hover:bg-[#4F46E5] transition-colors inline-block"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const totalPaid = payments
    .filter((p) => p.status === "VERIFIED")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full space-y-8 relative z-10 text-[#F8FAFC]">
      {/* Header & Breadcrumb */}
      <div className="pb-6 border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-[11px] font-mono text-[#64748B] uppercase tracking-wider flex items-center gap-2">
            <Link href="/dashboard/student" className="hover:text-[#818CF8]">Dashboard</Link>
            <span>/</span>
            <span className="text-[#818CF8] font-bold">Payments</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
            Payment History & Receipts
          </h1>
          <p className="text-xs text-[#94A3B8] font-mono">
            Verify registration transactions, resubmit rejected payment proofs, and download receipts.
          </p>
        </div>

        {/* Total Summary Chip */}
        <div className="p-3 px-4 rounded-2xl bg-[#0B0E18]/55 backdrop-blur-md border border-white/[0.08] font-mono text-xs flex items-center gap-3">
          <span className="text-[#94A3B8]">Verified Total:</span>
          <span className="text-[#818CF8] font-extrabold text-sm">₹{totalPaid}</span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {resubmitSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{resubmitSuccess}</span>
        </div>
      )}

      {/* Payments List / Table */}
      {payments.length === 0 ? (
        <div className="p-16 rounded-3xl bg-[#0B0E18]/55 backdrop-blur-md border border-white/[0.08] text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-[#6366F1]">
            <CreditCard className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-[#F8FAFC]">No Payment Records Found</h2>
          <p className="text-xs text-[#94A3B8] max-w-md mx-auto leading-relaxed">
            No registration fee transactions are associated with your squads yet.
          </p>
          <div className="pt-2">
            <Link
              href="/hackathons"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold text-xs transition-colors shadow-sm"
            >
              Browse Upcoming Arenas
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-[#0B0E18]/55 backdrop-blur-md border border-white/[0.08] rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/[0.08] bg-[#111524]/60 text-[#94A3B8] uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4 font-bold">Hackathon / Squad</th>
                  <th className="py-3.5 px-4 font-bold">Amount</th>
                  <th className="py-3.5 px-4 font-bold">Method</th>
                  <th className="py-3.5 px-4 font-bold">UTR / Reference</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold">Date</th>
                  <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {payments.map((p) => {
                  const isVerified = p.status === "VERIFIED";
                  const isPending = p.status === "PENDING";
                  const isRejected = p.status === "REJECTED";

                  return (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-4 font-bold text-[#F8FAFC]">
                        <div>
                          <Link
                            href={`/hackathons/${p.team.hackathon.slug}`}
                            className="hover:text-[#818CF8] transition-colors font-semibold"
                          >
                            {p.team.hackathon.title}
                          </Link>
                          <div className="text-[11px] text-[#94A3B8] font-normal mt-0.5">
                            Squad: <strong className="text-[#F8FAFC]">{p.team.name}</strong>
                            {p.team.teamId && (
                              <span className="text-[#818CF8] ml-2">({p.team.teamId})</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 font-bold text-[#F8FAFC]">
                        {p.amount === 0 ? "FREE" : `₹${p.amount}`}
                      </td>

                      <td className="py-4 px-4">
                        <span className="text-[10px] uppercase font-bold text-[#94A3B8] bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                          {p.mode}
                        </span>
                      </td>

                      <td className="py-4 px-4 font-bold text-[#818CF8]">
                        {p.txnRef || p.paymentId || (p.amount === 0 ? "INSTANT_FREE" : "PENDING_INPUT")}
                      </td>

                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          isVerified
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            : isPending
                            ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            : "bg-red-500/15 text-red-300 border border-red-500/30"
                        }`}>
                          {p.status}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-[#94A3B8] text-[11px]">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-4 px-4 text-right space-x-2">
                        {/* Receipt Button */}
                        <button
                          onClick={() => setSelectedReceipt(p)}
                          className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#F8FAFC] border border-white/[0.08] text-[11px] font-bold transition-colors inline-flex items-center gap-1"
                          title="View Digital Receipt"
                        >
                          <Receipt className="w-3 h-3 text-[#818CF8]" />
                          Receipt
                        </button>

                        {/* Resubmit Proof Button if Rejected and user is Lead */}
                        {isRejected && p.isLead && (
                          <button
                            onClick={() => {
                              setResubmittingPayment(p);
                              setNewTxnRef(p.txnRef || "");
                              setResubmitError(null);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[11px] font-bold transition-colors inline-flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Resubmit UTR
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Official Digital Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in-up">
          <div className="w-full max-w-lg bg-[#0B0E18] border border-white/[0.12] rounded-3xl p-6 sm:p-8 space-y-6 font-mono text-xs shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#6366F1] text-white flex items-center justify-center font-bold text-xs">
                  HB
                </div>
                <span className="font-display font-bold text-base text-[#F8FAFC]">
                  Official Fee Receipt
                </span>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="p-1 rounded-lg hover:bg-white/[0.08] text-[#94A3B8]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Receipt ID:</span>
                  <span className="text-[#F8FAFC] font-bold">RCP-{selectedReceipt.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Hackathon:</span>
                  <span className="text-[#F8FAFC] font-bold">{selectedReceipt.team.hackathon.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Squad Name:</span>
                  <span className="text-[#F8FAFC] font-bold">{selectedReceipt.team.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Official Team ID:</span>
                  <span className="text-[#818CF8] font-bold">{selectedReceipt.team.teamId || "Pending Verification"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Applicant Lead:</span>
                  <span className="text-[#F8FAFC] font-bold">{selectedReceipt.team.lead.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Transaction / UTR:</span>
                  <span className="text-[#818CF8] font-bold">{selectedReceipt.txnRef || selectedReceipt.paymentId || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Payment Mode:</span>
                  <span className="text-[#F8FAFC] font-bold uppercase">{selectedReceipt.mode}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/[0.06]">
                  <span className="text-[#F8FAFC] font-bold">Total Amount Paid:</span>
                  <span className="text-sm font-extrabold text-[#818CF8]">
                    {selectedReceipt.amount === 0 ? "FREE ENTRY (₹0)" : `₹${selectedReceipt.amount}`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20 text-[11px] text-[#818CF8]">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>
                  Cryptographically verified on HackBridge Collegiate Protocol. Issued per Invariant Rule 3.
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[#F8FAFC] border border-white/[0.08] font-bold transition-colors"
              >
                Print Receipt
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resubmit Payment Modal */}
      {resubmittingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in-up">
          <div className="w-full max-w-md bg-[#0B0E18] border border-white/[0.12] rounded-3xl p-6 space-y-5 font-mono text-xs shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="font-bold text-sm text-[#F8FAFC]">Resubmit Payment Proof</div>
              <button
                onClick={() => setResubmittingPayment(null)}
                className="p-1 rounded-lg hover:bg-white/[0.08] text-[#94A3B8]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Submit your correct 12-digit UPI Transaction Reference (UTR) for{" "}
              <strong className="text-[#F8FAFC]">{resubmittingPayment.team.hackathon.title}</strong> (₹{resubmittingPayment.amount}).
            </p>

            {resubmitError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-[11px]">
                {resubmitError}
              </div>
            )}

            <form onSubmit={handleResubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#F8FAFC] block">
                  12-digit UTR / Transaction Reference <span className="text-[#818CF8]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTxnRef}
                  onChange={(e) => setNewTxnRef(e.target.value)}
                  placeholder="e.g., 402918239012"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-[#F8FAFC] focus:outline-none focus:border-[#6366F1]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#F8FAFC] block">
                  Screenshot Proof URL (Optional)
                </label>
                <input
                  type="text"
                  value={newScreenshotUrl}
                  onChange={(e) => setNewScreenshotUrl(e.target.value)}
                  placeholder="https://imgur.com/... or public drive link"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-[#F8FAFC] focus:outline-none focus:border-[#6366F1]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResubmittingPayment(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[#F8FAFC] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resubmitting || !newTxnRef.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold disabled:opacity-40"
                >
                  {resubmitting ? "Submitting..." : "Submit Proof"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
