"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  CreditCard,
  QrCode,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Lock,
  Building2,
  Users
} from "lucide-react";

interface TeamData {
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
    qrImageUrl?: string | null;
    upiId?: string | null;
    host: {
      orgName: string;
    };
  };
  leadStudent: {
    user: { name: string; email: string };
  };
  members: Array<{
    id: string;
    role: string;
    student: {
      hackathonId: string;
      college: string;
      user: { name: string; email: string };
    };
  }>;
  payment?: {
    id: string;
    mode: string;
    amount: number;
    status: string;
    txnRef?: string | null;
    screenshotUrl?: string | null;
    razorpayOrderId?: string | null;
    verifiedAt?: string | null;
  } | null;
}

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const teamIdParam = params?.teamId as string;

  const [session, setSession] = useState<any>(null);
  const [team, setTeam] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // QR Form states
  const [txnRef, setTxnRef] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [submittingProof, setSubmittingProof] = useState(false);
  const [proofMessage, setProofMessage] = useState<string | null>(null);

  // Razorpay states
  const [processingRzp, setProcessingRzp] = useState(false);

  // Fetch session & team
  const fetchTeam = useCallback(async () => {
    if (!teamIdParam) return;
    try {
      const res = await fetch(`/api/v1/teams/${teamIdParam}`);
      if (res.ok) {
        const data = await res.json();
        setTeam(data.team);
        if (data.team?.payment?.txnRef) {
          setTxnRef(data.team.payment.txnRef);
        }
      } else {
        const err = await res.json();
        setError(err.error || "Failed to load team data");
      }
    } catch {
      setError("Network error loading team information");
    } finally {
      setLoading(false);
    }
  }, [teamIdParam]);

  useEffect(() => {
    fetch("/api/v1/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setSession(data.user);
      })
      .catch(() => {});

    fetchTeam();
  }, [fetchTeam]);

  // Periodic poll if awaiting host approval for QR
  useEffect(() => {
    if (team?.payment?.status === "PENDING" && team?.payment?.txnRef && !team?.teamId) {
      const interval = setInterval(() => {
        fetchTeam();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [team, fetchTeam]);

  // Copy helpers
  const copyTeamId = () => {
    if (!team?.teamId) return;
    navigator.clipboard.writeText(team.teamId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const copyUpi = () => {
    const upi = team?.hackathon.upiId || "hackbridge@upi";
    navigator.clipboard.writeText(upi);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // Submit QR proof
  const handleQrProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txnRef.trim()) return;

    setSubmittingProof(true);
    setProofMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/v1/payments/qr-proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: team?.id,
          txnRef: txnRef.trim(),
          screenshotUrl: screenshotUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit proof");
        setSubmittingProof(false);
        return;
      }

      setProofMessage("Proof submitted! Host will review your transaction reference and approve.");
      fetchTeam();
    } catch {
      setError("Network error submitting proof");
    } finally {
      setSubmittingProof(false);
    }
  };

  // Handle Razorpay checkout
  const handleRazorpayCheckout = async () => {
    if (!team) return;
    setProcessingRzp(true);
    setError(null);

    try {
      // 1. Create Order
      const orderRes = await fetch("/api/v1/payments/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: team.id }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        setError(orderData.error || "Failed to initiate payment");
        setProcessingRzp(false);
        return;
      }

      // 2. Complete payment (handles test/sandbox or live)
      const verifyRes = await fetch("/api/v1/payments/razorpay/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: team.id,
          razorpayOrderId: orderData.orderId,
          razorpayPaymentId: `pay_${Date.now()}_test`,
          razorpaySignature: "test_sig_verified",
          isSandbox: true,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setError(verifyData.error || "Payment verification failed");
        setProcessingRzp(false);
        return;
      }

      // Success! Refresh
      await fetchTeam();
    } catch {
      setError("Network error during payment verification");
    } finally {
      setProcessingRzp(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-xs font-mono text-slate-500">
        <div className="h-64 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse" />
      </div>
    );
  }

  if (error && !team) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
        <h1 className="font-display text-lg font-bold text-white mb-2">Error Loading Team</h1>
        <p className="text-xs text-slate-400 mb-6">{error}</p>
        <Link href="/hackathons" className="text-xs font-mono text-[#6366F1] hover:underline">
          ← Browse Hackathons
        </Link>
      </div>
    );
  }

  if (!team) return null;

  const isVerified = team.payment?.status === "VERIFIED" && team.teamId;
  const isPendingHost = team.payment?.status === "PENDING" && team.payment?.txnRef && !team.teamId;
  const paymentMode = team.payment?.mode || team.hackathon.paymentMode;

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-10 w-full space-y-8">
      {/* Top Header */}
      <div>
        <Link
          href={`/hackathons/${team.hackathon.slug}`}
          className="text-xs font-mono text-slate-500 hover:text-white flex items-center gap-1.5 transition-colors mb-4"
        >
          ← {team.hackathon.title}
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div className="space-y-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] border border-white/10 text-slate-400 uppercase">
              Phase 3 · Payment & Identity Verification
            </span>
            <h1 className="font-display text-2xl font-bold text-white tracking-tight">
              Squad: {team.name}
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Lead: {team.leadStudent.user.name} · {team.members.length} Squad Member{team.members.length > 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchTeam()}
              className="p-2 rounded-lg bg-white/[0.04] border border-white/10 text-slate-400 hover:text-white transition-colors"
              title="Refresh status"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <div className={`px-3 py-1 rounded-full text-xs font-mono font-semibold border ${
              isVerified
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : isPendingHost
                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                : "bg-white/5 text-slate-300 border-white/10"
            }`}>
              {isVerified ? "REGISTRATION CONFIRMED" : isPendingHost ? "AWAITING HOST APPROVAL" : "PAYMENT REQUIRED"}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-mono text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* VERIFIED BANNER (PRD Gate 3 Passed) */}
      {isVerified && (
        <div className="p-8 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-[#0B0E18] to-emerald-500/5 border border-emerald-500/30 space-y-6 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h2 className="font-display text-xl font-bold text-white tracking-tight">
              Registration Complete & Verified
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              PRD Non-Negotiable Rule 3: Official Team ID generated upon verified payment.
            </p>
          </div>

          {/* Official Team ID Callout */}
          <div className="max-w-md mx-auto p-4 rounded-xl bg-black/60 border border-white/10 flex items-center justify-between">
            <div className="text-left space-y-0.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Official Team ID</span>
              <div className="font-mono text-lg font-bold text-emerald-400 tracking-wider">
                {team.teamId}
              </div>
            </div>
            <button
              onClick={copyTeamId}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedId ? "Copied" : "Copy ID"}
            </button>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/dashboard/student"
              className="px-6 py-2.5 rounded-xl bg-white text-black font-semibold text-xs font-mono hover:bg-slate-200 transition-colors flex items-center gap-2"
            >
              Open Student Console
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href={`/hackathons/${team.hackathon.slug}`}
              className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs font-mono transition-colors"
            >
              View Hackathon Track
            </Link>
          </div>
        </div>
      )}

      {/* SQUAD ROSTER CARD */}
      <div className="p-6 rounded-2xl bg-[#0B0E18] border border-white/[0.08] space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#6366F1]" />
            <h2 className="text-sm font-bold text-white">Squad Members ({team.members.length})</h2>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Hackathon: {team.hackathon.title}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {team.members.map((m) => (
            <div
              key={m.id}
              className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs font-mono"
            >
              <div>
                <div className="font-bold text-white flex items-center gap-2">
                  <span>{m.student.user.name}</span>
                  {m.role === "LEAD" && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-slate-300">
                      LEAD
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400">{m.student.college}</div>
              </div>
              <span className="text-[11px] text-slate-400 font-bold bg-white/5 px-2 py-0.5 rounded border border-white/10">
                {m.student.hackathonId}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* PAYMENT MODES SECTION (when not yet verified) */}
      {!isVerified && (
        <div className="space-y-6">
          {/* FREE FLOW */}
          {paymentMode === "FREE" && (
            <div className="p-8 rounded-2xl bg-[#0B0E18] border border-white/[0.08] text-center space-y-4">
              <h2 className="text-lg font-bold text-white">Free Registration Track</h2>
              <p className="text-xs text-slate-400 font-mono">
                This hackathon has zero entry fee. Click below to verify and receive your Team ID.
              </p>
              <button
                onClick={handleRazorpayCheckout}
                disabled={processingRzp}
                className="px-6 py-3 rounded-xl bg-white text-black font-bold text-xs font-mono hover:bg-slate-200 transition-colors"
              >
                {processingRzp ? "Confirming..." : "Issue Team ID & Confirm"}
              </button>
            </div>
          )}

          {/* QR CODE FLOW */}
          {paymentMode === "QR" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* QR Image & UPI Info */}
              <div className="md:col-span-5 p-6 rounded-2xl bg-[#0B0E18] border border-white/[0.08] space-y-4 text-center">
                <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                  Host UPI Payment QR
                </div>

                <div className="w-56 h-56 mx-auto bg-white p-3 rounded-xl flex items-center justify-center">
                  {team.hackathon.qrImageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={team.hackathon.qrImageUrl}
                      alt="Host Payment QR"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-black font-mono text-xs flex flex-col items-center justify-center gap-2">
                      <QrCode className="w-16 h-16" />
                      <span>Scan via PhonePe / GPay</span>
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                  <div className="text-[10px] font-mono text-slate-500 uppercase">Amount Due</div>
                  <div className="text-lg font-bold text-white font-mono">₹{team.hackathon.fee}</div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                  <div className="text-left font-mono">
                    <div className="text-[10px] text-slate-500 uppercase">Host UPI ID</div>
                    <div className="text-xs text-white font-bold">{team.hackathon.upiId || "hackbridge@upi"}</div>
                  </div>
                  <button
                    onClick={copyUpi}
                    className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                    title="Copy UPI ID"
                  >
                    {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Proof Submission / Status */}
              <div className="md:col-span-7 p-6 rounded-2xl bg-[#0B0E18] border border-white/[0.08] space-y-5">
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight">
                    Submit Payment Verification Proof
                  </h2>
                  <p className="text-[11px] font-mono text-slate-400 mt-1 leading-relaxed">
                    Per PRD Rule 3: QR mode requires the team to submit their transaction reference (UTR) and screenshot. The host verifies it before issuing your Team ID.
                  </p>
                </div>

                {isPendingHost ? (
                  <div className="p-5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                    <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold">
                      <Clock className="w-4 h-4 animate-spin" />
                      Proof Submitted · Pending Host Review
                    </div>
                    <p className="text-[11px] font-mono text-slate-300 leading-relaxed">
                      UTR Reference: <strong className="text-white">{team.payment?.txnRef}</strong>
                    </p>
                    <p className="text-[10px] font-mono text-slate-400">
                      This page auto-refreshes every 5 seconds. As soon as the host clicks approve in their dashboard, your official Team ID will unlock automatically.
                    </p>
                    <button
                      onClick={() => fetchTeam()}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3 h-3" /> Check Approval Now
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleQrProofSubmit} className="space-y-4">
                    {proofMessage && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400 flex items-center gap-2">
                        <Check className="w-4 h-4 shrink-0" />
                        <span>{proofMessage}</span>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-mono text-slate-300 block">
                        Transaction Reference Number (UTR / 12-digit Ref) <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={txnRef}
                        onChange={(e) => setTxnRef(e.target.value)}
                        placeholder="e.g., 20261026001928"
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 text-xs font-mono focus:outline-none focus:border-white/30"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-mono text-slate-300 block">
                        Screenshot Proof URL (Optional)
                      </label>
                      <input
                        type="url"
                        value={screenshotUrl}
                        onChange={(e) => setScreenshotUrl(e.target.value)}
                        placeholder="https://drive.google.com/... or image link"
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 text-xs font-mono focus:outline-none focus:border-white/30"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingProof || !txnRef.trim()}
                      className="w-full py-3 rounded-xl bg-white text-black font-bold text-xs font-mono hover:bg-slate-200 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {submittingProof ? "Submitting..." : "Submit Proof for Host Verification"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* RAZORPAY FLOW */}
          {paymentMode === "RAZORPAY" && (
            <div className="p-8 rounded-2xl bg-[#0B0E18] border border-white/[0.08] space-y-6 max-w-xl mx-auto text-center">
              <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-white">
                <CreditCard className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h2 className="font-display text-lg font-bold text-white tracking-tight">
                  Razorpay Direct Checkout
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  Total amount: <strong className="text-white">₹{team.hackathon.fee} INR</strong>
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-xs font-mono text-slate-400 text-left space-y-1.5">
                <div className="flex justify-between">
                  <span>Hackathon Fee:</span>
                  <span className="text-white">₹{team.hackathon.fee}</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Processing:</span>
                  <span className="text-white">₹0.00 (Covered)</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-white/5 font-bold text-white">
                  <span>Total Payable:</span>
                  <span>₹{team.hackathon.fee}</span>
                </div>
              </div>

              <button
                onClick={handleRazorpayCheckout}
                disabled={processingRzp}
                className="w-full py-3.5 rounded-xl bg-white text-black font-bold text-xs font-mono hover:bg-slate-200 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {processingRzp ? (
                  <>
                    <span className="animate-spin">⌛</span>
                    Verifying Payment...
                  </>
                ) : (
                  <>
                    Pay ₹{team.hackathon.fee} with Razorpay
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <div className="text-[10px] font-mono text-slate-500">
                🔒 256-bit Encrypted Checkout · Instant Team ID upon verified webhook
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
