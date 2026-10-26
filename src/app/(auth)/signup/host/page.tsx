"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, AlertCircle, ArrowRight, ShieldAlert, Building2 } from "lucide-react";

export default function HostSignupPage() {
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState<"college" | "company">("college");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [website, setWebsite] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();

  const handleHostSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "HOST",
          orgName,
          orgType,
          name,
          email,
          password,
          website: website.trim() || undefined,
          bio: bio.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Host registration failed");
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
    <div className="flex-1 flex min-h-[calc(100vh-65px)]">
      {/* Left Brand Panel */}
      <div className="hidden lg:flex lg:w-5/12 bg-[#06080F] border-r border-white/[0.08] p-12 flex-col justify-between">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-white/[0.04] border border-white/10 text-[11px] font-mono text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1]" />
            ORGANIZER PROTOCOL
          </div>

          <h2 className="font-display text-3xl font-bold text-white tracking-tight leading-snug">
            Host Collegiate & Corporate Competitive Tracks.
          </h2>

          <p className="text-xs text-slate-400 leading-relaxed">
            Run complete hackathons end-to-end: multi-domain timed unlocks, automated team fee verification, GitHub repository generation, and multi-criteria judge evaluation.
          </p>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2 text-xs font-mono text-slate-400">
            <div className="text-white font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#6366F1]" />
              Super Admin Approval Rule
            </div>
            <p className="text-[11px] leading-relaxed">
              In accordance with platform safety policies, newly registered hosts require Super Admin verification before hackathons can be published to the public registry.
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
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-[#030407]">
        <div className="w-full max-w-lg space-y-6">
          {submitted ? (
            /* Pending Review Screen */
            <div className="bg-[#0B0E18] border border-white/[0.08] p-8 rounded-2xl space-y-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 mx-auto flex items-center justify-center">
                <Clock className="w-6 h-6 text-[#6366F1]" />
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-white">
                  Application Under Review
                </h2>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  Your host chapter credentials have been submitted. Our Super Admin panel reviews organization affiliations before hackathon publishing is unlocked.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-black/60 border border-white/10 text-left space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Organization:</span>
                  <span className="text-white font-bold">{orgName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Type:</span>
                  <span className="text-white uppercase">{orgType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="text-amber-400">PENDING_APPROVAL</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.push("/dashboard/host")}
                className="w-full py-3 rounded-xl bg-white hover:bg-slate-200 text-black font-bold text-xs uppercase tracking-wider transition-colors"
              >
                Enter Host Console (Preview State)
              </button>
            </div>
          ) : (
            /* Host Application Form */
            <>
              <div>
                <h1 className="font-display text-2xl font-bold text-white tracking-tight">
                  Host Chapter Registration
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Apply to organize competitive hackathons for your university or company.
                </p>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleHostSignup} className="space-y-4">
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-white/[0.03] border border-white/10 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setOrgType("college")}
                    className={`py-2 rounded-lg transition-colors ${
                      orgType === "college"
                        ? "bg-white text-black font-bold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Collegiate Chapter
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrgType("company")}
                    className={`py-2 rounded-lg transition-colors ${
                      orgType === "company"
                        ? "bg-white text-black font-bold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Enterprise / Industry
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                    Organization / Chapter Name
                  </label>
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Stanford ACM Student Chapter"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0B0E18] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#6366F1] transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                      Representative Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Prof. or Lead Name"
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0B0E18] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#6366F1] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                      Institutional Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="dean@college.edu"
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0B0E18] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#6366F1] transition-colors"
                    />
                  </div>
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

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                    Official Website / Portal (Optional)
                  </label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://acm.stanford.edu"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0B0E18] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#6366F1] transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-white hover:bg-slate-200 text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      Submitting Application...
                    </span>
                  ) : (
                    <>
                      Submit Application for Super Admin Review
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
