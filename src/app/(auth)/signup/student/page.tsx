"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Check, ArrowRight, AlertCircle, Share2, CheckCircle2 } from "lucide-react";

export default function StudentSignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [college, setCollege] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [skills, setSkills] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "STUDENT",
          name,
          email,
          password,
          college,
          githubUsername: githubUsername.trim() || undefined,
          skills: skills.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Student registration failed");
        setLoading(false);
        return;
      }

      setGeneratedId(data.user.hackathonId);
      setLoading(false);
    } catch {
      setError("Server connection failed during registration");
      setLoading(false);
    }
  };

  const copyId = () => {
    if (!generatedId) return;
    navigator.clipboard.writeText(generatedId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="flex-1 flex min-h-[calc(100vh-65px)]">
      {/* Left Brand Panel */}
      <div className="hidden lg:flex lg:w-5/12 bg-[#06080F] border-r border-white/[0.08] p-12 flex-col justify-between relative">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-white/[0.04] border border-white/10 text-[11px] font-mono text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1]" />
            STUDENT CREDENTIAL PROTOCOL
          </div>

          <h2 className="font-display text-3xl font-bold text-white tracking-tight leading-snug">
            One Permanent Identity for Your Entire Engineering Career.
          </h2>

          <p className="text-xs text-slate-400 leading-relaxed">
            Every student receives a cryptographic <code className="text-slate-200">HB-XXXXXX</code> identifier. Team leads add you by this ID, and all future hackathon submissions, awards, and GitHub repositories are preserved permanently under this identity.
          </p>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2 text-xs font-mono text-slate-400">
            <div className="text-white font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Invariant Rule 1
            </div>
            <p className="text-[11px] leading-relaxed">
              A student can belong to only one active hackathon squad at a time. This rule is enforced by the database unique constraint to prevent overbooking.
            </p>
          </div>
        </div>

        <div className="pt-8 border-t border-white/[0.06] text-[11px] font-mono text-slate-500">
          Already registered?{" "}
          <Link href="/login" className="text-white hover:underline">
            Sign In here
          </Link>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-[#030407]">
        <div className="w-full max-w-lg space-y-6">
          {generatedId ? (
            /* Minted Success Screen */
            <div className="bg-[#0B0E18] border border-white/[0.08] p-8 rounded-2xl space-y-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                <Check className="w-6 h-6" />
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-white">
                  Permanent Identity Minted
                </h2>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Your official HackBridge student identifier is active. Share this with your team lead to join hackathon tracks.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-black/60 border border-white/10 text-center space-y-2">
                <div className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">
                  Permanent Student ID
                </div>
                <div className="text-3xl font-mono font-bold text-white tracking-widest">
                  {generatedId}
                </div>
                <p className="text-[11px] font-mono text-slate-400">
                  {name} · {college}
                </p>
              </div>

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={copyId}
                  className="px-4 py-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs font-mono font-semibold text-white border border-white/10 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied" : "Copy ID"}
                </button>
              </div>

              <button
                type="button"
                onClick={() => router.push("/dashboard/student")}
                className="w-full py-3 rounded-xl bg-white hover:bg-slate-200 text-black font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
              >
                Proceed to Student Console
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Registration Form */
            <>
              <div>
                <h1 className="font-display text-2xl font-bold text-white tracking-tight">
                  Student Registration
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Fill in your details to mint your permanent student credential.
                </p>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                    Full Legal Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Priya Sundaram"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0B0E18] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#6366F1] transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                      Institutional Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="priya@college.edu"
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

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                    College / University Name
                  </label>
                  <input
                    type="text"
                    required
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    placeholder="e.g. Indian Institute of Information Technology"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0B0E18] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#6366F1] transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                      GitHub Username (Optional)
                    </label>
                    <input
                      type="text"
                      value={githubUsername}
                      onChange={(e) => setGithubUsername(e.target.value)}
                      placeholder="priya-dev"
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0B0E18] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#6366F1] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                      Primary Skills (Optional)
                    </label>
                    <input
                      type="text"
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                      placeholder="Rust, TypeScript, Python"
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0B0E18] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#6366F1] transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-white hover:bg-slate-200 text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      Minting Hackathon ID...
                    </span>
                  ) : (
                    <>
                      Register & Mint Permanent ID
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              <div className="pt-4 border-t border-white/[0.06] text-center text-xs text-slate-400">
                Already hold a Hackathon ID?{" "}
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
