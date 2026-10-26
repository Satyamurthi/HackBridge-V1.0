"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Search,
  Filter,
  Check,
  AlertCircle
} from "lucide-react";

interface PaymentItem {
  id: string;
  mode: string;
  amount: number;
  status: string;
  txnRef?: string | null;
  screenshotUrl?: string | null;
  createdAt: string;
  verifiedAt?: string | null;
  team: {
    id: string;
    teamId: string | null;
    name: string;
    hackathon: {
      id: string;
      title: string;
      slug: string;
    };
    leadStudent: {
      user: {
        name: string;
        email: string;
      };
    };
    members: Array<{
      student: {
        hackathonId: string;
        user: { name: string };
      };
    }>;
  };
}

export default function HostPaymentsPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [fetching, setFetching] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [search, setSearch] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch session
  useEffect(() => {
    fetch("/api/v1/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setSession(data.user);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Fetch payments
  const fetchPayments = useCallback(async () => {
    setFetching(true);
    setActionError(null);
    try {
      const res = await fetch("/api/v1/host/payments");
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
      } else {
        const err = await res.json();
        setActionError(err.error || "Failed to load payments");
      }
    } catch {
      setActionError("Network error loading payments");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (session?.role === "HOST" || session?.role === "SUPER_ADMIN") {
      fetchPayments();
    }
  }, [session, fetchPayments]);

  // Handle Approve or Reject
  const handleDecision = async (paymentId: string, action: "APPROVE" | "REJECT") => {
    setActionError(null);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/v1/host/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();

      if (!res.ok) {
        setActionError(data.error || "Failed to update payment");
        return;
      }

      if (action === "APPROVE") {
        setActionMessage(`Payment approved! Official Team ID ${data.teamId} issued.`);
      } else {
        setActionMessage("Payment rejected.");
      }

      fetchPayments();
      setTimeout(() => setActionMessage(null), 4000);
    } catch {
      setActionError("Network error updating payment");
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        <div className="h-64 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse" />
      </div>
    );
  }

  if (!session || (session.role !== "HOST" && session.role !== "SUPER_ADMIN")) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <ShieldCheck className="w-8 h-8 text-slate-500 mx-auto mb-3" />
        <h1 className="font-display text-lg font-bold text-white mb-2">Host Access Required</h1>
        <p className="text-xs text-slate-400 mb-5">
          Only verified collegiate hosts can review and authorize squad payments.
        </p>
        <Link href="/login" className="px-4 py-2 rounded-lg bg-white text-black font-semibold text-xs">
          Host Sign In
        </Link>
      </div>
    );
  }

  const filteredPayments = payments.filter((p) => {
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    const matchesSearch =
      search === "" ||
      p.team.name.toLowerCase().includes(search.toLowerCase()) ||
      p.team.hackathon.title.toLowerCase().includes(search.toLowerCase()) ||
      p.txnRef?.toLowerCase().includes(search.toLowerCase()) ||
      p.team.leadStudent.user.email.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const pendingCount = payments.filter((p) => p.status === "PENDING" && p.txnRef).length;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/host"
          className="text-xs font-mono text-slate-500 hover:text-white flex items-center gap-1.5 transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Host Console
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div className="space-y-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] border border-white/10 text-slate-400 uppercase">
              Host Payment Management
            </span>
            <h1 className="font-display text-2xl font-bold text-white tracking-tight">
              Payment Verification Queue
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              PRD Non-Negotiable Rule 3: Team IDs are issued only after verified payment.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchPayments}
              className="p-2 rounded-lg bg-white/[0.04] border border-white/10 text-slate-400 hover:text-white transition-colors"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${fetching ? "animate-spin" : ""}`} />
            </button>
            <span className="px-2.5 py-1 rounded text-[11px] font-mono bg-white/[0.05] border border-white/10 text-slate-300 font-semibold">
              PENDING PROOFS: {pendingCount}
            </span>
          </div>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-mono text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0B0E18] border border-white/[0.08] p-4 rounded-xl">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setStatusFilter("PENDING")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 ${
              statusFilter === "PENDING"
                ? "bg-white text-black"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span>Pending Review</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500 text-black font-bold">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setStatusFilter("VERIFIED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
              statusFilter === "VERIFIED"
                ? "bg-white text-black"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Verified & Active
          </button>
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
              statusFilter === "ALL"
                ? "bg-white text-black"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            All History
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search squad, UTR, track..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 text-xs font-mono focus:outline-none focus:border-white/30"
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-[#0B0E18] border border-white/[0.08] rounded-2xl overflow-hidden">
        {fetching ? (
          <div className="p-12 text-center text-xs font-mono text-slate-500">
            Loading payments queue...
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-xs font-mono text-slate-500 space-y-2">
            <div>No payments found in this view.</div>
            <p className="text-[11px] text-slate-600">
              When teams submit QR transaction references (UTR), they will appear here for verification.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/[0.06] text-slate-500 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 font-medium">Squad & Lead</th>
                  <th className="py-3 px-4 font-medium">Hackathon Track</th>
                  <th className="py-3 px-4 font-medium">Amount & Mode</th>
                  <th className="py-3 px-4 font-medium">UTR / Transaction Ref</th>
                  <th className="py-3 px-4 font-medium">Status / Team ID</th>
                  <th className="py-3 px-4 font-medium text-right">Verification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredPayments.map((p) => {
                  const hasTxn = !!p.txnRef;
                  return (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Squad & Lead */}
                      <td className="py-3.5 px-4 font-bold text-white">
                        <div>{p.team.name}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          Lead: {p.team.leadStudent.user.name} ({p.team.leadStudent.user.email})
                        </div>
                        <div className="text-[10px] text-slate-500 font-normal">
                          {p.team.members.length} members
                        </div>
                      </td>

                      {/* Hackathon */}
                      <td className="py-3.5 px-4 text-slate-300">
                        <div>{p.team.hackathon.title}</div>
                      </td>

                      {/* Amount & Mode */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">₹{p.amount}</div>
                        <div className="text-[10px] text-slate-500 uppercase">{p.mode}</div>
                      </td>

                      {/* UTR / Proof */}
                      <td className="py-3.5 px-4">
                        {p.txnRef ? (
                          <div className="space-y-1">
                            <span className="font-bold text-white bg-white/5 px-2 py-0.5 rounded border border-white/10 select-all">
                              {p.txnRef}
                            </span>
                            {p.screenshotUrl && (
                              <div>
                                <a
                                  href={p.screenshotUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-[#6366F1] hover:underline flex items-center gap-1"
                                >
                                  View Screenshot <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-600 text-[10px]">No UTR submitted yet</span>
                        )}
                      </td>

                      {/* Status / Team ID */}
                      <td className="py-3.5 px-4">
                        {p.status === "VERIFIED" ? (
                          <div className="space-y-0.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              VERIFIED
                            </span>
                            {p.team.teamId && (
                              <div className="text-[11px] font-bold text-white tracking-wider">
                                {p.team.teamId}
                              </div>
                            )}
                          </div>
                        ) : p.status === "REJECTED" ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                            REJECTED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            PENDING REVIEW
                          </span>
                        )}
                      </td>

                      {/* Verification Action */}
                      <td className="py-3.5 px-4 text-right">
                        {p.status === "PENDING" && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleDecision(p.id, "APPROVE")}
                              className="px-2.5 py-1 rounded bg-white text-black font-semibold text-[10px] hover:bg-slate-200 transition-colors flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" /> Approve & Issue Team ID
                            </button>
                            <button
                              onClick={() => handleDecision(p.id, "REJECT")}
                              className="px-2 py-1 rounded bg-white/5 text-slate-400 hover:text-red-400 text-[10px] transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        )}

                        {p.status === "VERIFIED" && (
                          <span className="text-[10px] text-slate-500">
                            Verified on {p.verifiedAt ? new Date(p.verifiedAt).toLocaleDateString() : "Record"}
                          </span>
                        )}

                        {p.status === "REJECTED" && (
                          <button
                            onClick={() => handleDecision(p.id, "APPROVE")}
                            className="px-2 py-1 rounded bg-white/5 text-slate-400 hover:text-white text-[10px]"
                          >
                            Re-approve
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
