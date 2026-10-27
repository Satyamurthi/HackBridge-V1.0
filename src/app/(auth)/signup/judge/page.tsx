"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Scale, Clock, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";

export default function JudgeSignupPage() {
  const [hackathonId, setHackathonId] = useState("hackbridge-national-2026");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [designation, setDesignation] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();

  const handleJudgeSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "JUDGE",
          hackathonId: hackathonId.trim(),
          name,
          email,
          password,
          designation: designation.trim() || undefined,
          company: company.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Judge registration failed");
        setLoading(false);
        return;
      }

      setSubmitted(true);
      setLoading(false);
    } catch {
      setError("Server connection failed");
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex min-h-[calc(100vh-65px)] bg-transparent">
      {/* Left Brand Panel */}
      <div className="hidden lg:flex lg:w-5/12 bg-[#0B0E18]/60 backdrop-blur-md border-r border-white/[0.08] p-12 flex-col justify-between">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-white/[0.04] border border-white/10 text-[11px] font-mono text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1]" />
            EVALUATION PROTOCOL
          </div>

          <h2 className="font-display text-3xl font-bold text-white tracking-tight leading-snug">
            Expert Rubric Evaluation & Code Review Panel.
          </h2>

          <p className="text-xs text-slate-400 leading-relaxed">
            Judge accounts are bound strictly to designated hackathons. Review locked team submissions and automated GitHub repositories with automated multi-criterion weighted ranking.
          </p>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2 text-xs font-mono text-slate-400">
            <div className="text-white font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#6366F1]" />
              Host Verification Rule
            </div>
            <p className="text-[11px] leading-relaxed">
              As required by PRD Rule 5, judge accounts cannot submit scores or access private submission materials until confirmed by the host of the specified hackathon.
            </p>
          </div>
        </div>

        <div className="pt-8 border-t border-white/[0.06] text-[11px] font-mono text-slate-500">
          Already approved?{" "}
          <Link href="/login" className="text-white hover:underline">
            Sign In here
          </Link>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-transparent">
        <div className="w-full max-w-lg space-y-6">
          {submitted ? (
            /* Pending Judge Review Screen */
            <div className="bg-[#0B0E18]/80 backdrop-blur-md border border-white/[0.08] p-8 rounded-2xl space-y-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 mx-auto flex items-center justify-center">
                <Clock className="w-6 h-6 text-[#6366F1]" />
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-white">
                  Judge Invitation Pending
                </h2>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  Your registration has been submitted. The hackathon host organizers will review your technical credentials and assign evaluation access.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-black/60 border border-white/10 text-left space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Track:</span>
                  <span className="text-white font-bold">{hackathonId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="text-amber-400">PENDING_HOST_APPROVAL</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.push("/dashboard/judge")}
                className="w-full py-3 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold text-xs uppercase tracking-wider transition-colors"
              >
                Enter Judge Portal (Awaiting Authorization)
              </button>
            </div>
          ) : (
            /* Judge Registration Form */
            <>
              <div>
                <h1 className="font-display text-2xl font-bold text-white tracking-tight">
                  Judge Panel Registration
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Enter your evaluation credentials and target hackathon identifier.
                </p>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleJudgeSignup} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                    Target Hackathon ID or Slug (Required)
                  </label>
                  <input
                    type="text"
                    required
                    value={hackathonId}
                    onChange={(e) => setHackathonId(e.target.value)}
                    placeholder="e.g. hackbridge-national-2026"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0B0E18] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#6366F1] transition-colors font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Demo track identifier: <code className="text-slate-300">hackbridge-national-2026</code>
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Rivera"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0B0E18] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#6366F1] transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                      Professional Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@industry.com"
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0B0E18] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#6366F1] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                      Password (8+ chars)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0B0E18] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#6366F1] transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                      Designation
                    </label>
                    <input
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="Principal Architect"
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0B0E18] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#6366F1] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                      Company / Organization
                    </label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="CloudScale Systems"
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0B0E18] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#6366F1] transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Registering Judge...
                    </span>
                  ) : (
                    <>
                      Submit Judge Credentials
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              <div className="pt-4 border-t border-white/[0.06] text-center text-xs text-slate-400">
                Already registered?{" "}
                <Link href="/login" className="text-white underline underline-offset-4 hover:text-[#6366F1] transition-colors">
                  Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
