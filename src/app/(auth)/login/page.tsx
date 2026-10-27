"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("lead.priya@student.edu");
  const [password, setPassword] = useState("Password@123");
  const [activeTab, setActiveTab] = useState<"STUDENT" | "HOST" | "JUDGE" | "ADMIN">("STUDENT");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleRoleTab = (role: "STUDENT" | "HOST" | "JUDGE" | "ADMIN") => {
    setActiveTab(role);
    setError(null);
    if (role === "STUDENT") {
      setEmail("lead.priya@student.edu");
      setPassword("Password@123");
    } else if (role === "HOST") {
      setEmail("host.mit@college.edu");
      setPassword("Password@123");
    } else if (role === "JUDGE") {
      setEmail("judge.alex@industry.com");
      setPassword("Password@123");
    } else if (role === "ADMIN") {
      setEmail("admin@hackbridge.dev");
      setPassword("Admin@123");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Authentication failed");
        setLoading(false);
        return;
      }

      const user = data.user;
      if (user.role === "SUPER_ADMIN") {
        router.push("/dashboard/admin");
      } else if (user.role === "HOST") {
        router.push("/dashboard/host");
      } else if (user.role === "JUDGE") {
        router.push("/dashboard/judge");
      } else {
        router.push("/dashboard/student");
      }
      router.refresh();
    } catch {
      setError("Network connection to server failed");
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex min-h-[calc(100vh-65px)] bg-transparent text-[#F8FAFC]">
      {/* Left Brand Panel (Desktop) */}
      <div className="hidden lg:flex lg:w-5/12 bg-[#0B0E18]/60 backdrop-blur-md border-r border-white/[0.08] p-12 flex-col justify-between relative overflow-hidden">
        <div className="space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-[#F8FAFC] shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#6366F1] animate-pulse" />
            <span className="font-bold text-[#818CF8]">AUTHENTICATION PROTOCOL</span>
          </div>

          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#F8FAFC] tracking-tight leading-snug">
            Single Gateway for Builders, Organizers, and Evaluators.
          </h2>

          <p className="text-sm text-[#94A3B8] leading-relaxed">
            Sign in with verified institutional or developer credentials. Role-based authorization is enforced deterministically on every API endpoint.
          </p>

          <div className="pt-6 border-t border-white/[0.08] space-y-3.5 text-xs font-mono text-[#94A3B8]">
            <div className="flex items-center gap-2">
              <span className="text-[#6366F1] font-bold">01</span>
              <span>Permanent Student Hackathon ID (HB-XXXXXX)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#6366F1] font-bold">02</span>
              <span>Host Chapter Administrative Publishing Gate</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#6366F1] font-bold">03</span>
              <span>Bound Judge Evaluation Matrix</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-8 border-t border-white/[0.08] text-[11px] font-mono text-[#64748B]">
          Security: Passwords hashed with bcrypt · Signed session tokens
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md bg-[#0B0E18]/80 backdrop-blur-md border border-white/[0.08] rounded-3xl p-8 space-y-6 shadow-2xl">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-[#F8FAFC] tracking-tight">
              Sign In to HackBridge
            </h1>
            <p className="text-xs text-[#94A3B8] mt-1 font-medium">
              Select your persona or enter your registered credentials.
            </p>
          </div>

          {/* Role Tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[#111524]/60 border border-white/[0.08] text-xs font-mono">
            <button
              type="button"
              data-testid="role-tab-student"
              onClick={() => handleRoleTab("STUDENT")}
              className={`py-2 rounded-lg font-bold transition-all ${
                activeTab === "STUDENT"
                  ? "bg-[#6366F1] text-white shadow-sm"
                  : "text-[#94A3B8] hover:text-[#F8FAFC]"
              }`}
            >
              Student
            </button>
            <button
              type="button"
              data-testid="role-tab-host"
              onClick={() => handleRoleTab("HOST")}
              className={`py-2 rounded-lg font-bold transition-all ${
                activeTab === "HOST"
                  ? "bg-[#6366F1] text-white shadow-sm"
                  : "text-[#94A3B8] hover:text-[#F8FAFC]"
              }`}
            >
              Host
            </button>
            <button
              type="button"
              data-testid="role-tab-judge"
              onClick={() => handleRoleTab("JUDGE")}
              className={`py-2 rounded-lg font-bold transition-all ${
                activeTab === "JUDGE"
                  ? "bg-[#6366F1] text-white shadow-sm"
                  : "text-[#94A3B8] hover:text-[#F8FAFC]"
              }`}
            >
              Judge
            </button>
            <button
              type="button"
              data-testid="role-tab-admin"
              onClick={() => handleRoleTab("ADMIN")}
              className={`py-2 rounded-lg font-bold transition-all ${
                activeTab === "ADMIN"
                  ? "bg-[#6366F1] text-white shadow-sm"
                  : "text-[#94A3B8] hover:text-[#F8FAFC]"
              }`}
            >
              Admin
            </button>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs font-mono text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[#94A3B8] font-bold mb-1.5">
                Official Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.edu"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#111524]/70 border border-white/[0.1] text-[#F8FAFC] placeholder-[#64748B] text-sm focus:outline-none focus:border-[#6366F1] transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#94A3B8] font-bold">
                  Password
                </label>
                <span className="text-[11px] text-[#94A3B8] hover:text-[#6366F1] cursor-pointer">
                  Reset password
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#111524]/70 border border-white/[0.1] text-[#F8FAFC] placeholder-[#64748B] text-sm focus:outline-none focus:border-[#6366F1] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer active:scale-[0.99]"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Verifying Credentials...
                </span>
              ) : (
                <>
                  Authenticate & Enter Console
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-white/[0.08] text-center text-xs text-[#94A3B8]">
            Need an account?{" "}
            <Link href="/signup/student" className="text-[#6366F1] font-bold underline underline-offset-4 hover:text-[#818CF8] transition-colors">
              Mint Student ID
            </Link>
            {" · "}
            <Link href="/register" className="text-[#6366F1] font-bold underline underline-offset-4 hover:text-[#818CF8] transition-colors">
              Host / Register
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
