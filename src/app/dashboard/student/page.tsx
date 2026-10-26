"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  Copy, 
  Check, 
  Terminal, 
  Layers, 
  Code2, 
  User, 
  CheckCircle2, 
  Plus, 
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  FileCode,
  CreditCard,
  Clock,
  AlertCircle
} from "lucide-react";

interface TeamItem {
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
    startAt: string;
    endAt: string;
    status: string;
  };
  leadStudent: {
    user: { name: string; email: string };
  };
  members: Array<{
    role: string;
    student: {
      id: string;
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
  } | null;
}

export default function StudentDashboard() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "squads" | "repos" | "profile">("overview");

  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);

  const fetchSessionAndTeams = useCallback(async () => {
    try {
      const [meRes, teamsRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/teams"),
      ]);

      if (meRes.ok) {
        const data = await meRes.json();
        if (data?.user) setSession(data.user);
      }

      if (teamsRes.ok) {
        const tData = await teamsRes.json();
        setTeams(tData.teams || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessionAndTeams();
  }, [fetchSessionAndTeams]);

  const copyId = () => {
    if (!session?.hackathonId) return;
    navigator.clipboard.writeText(session.hackathonId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Calm Skeleton Loader
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-3 space-y-3">
            <div className="h-40 rounded-xl bg-white/[0.03] border border-white/5 animate-pulse" />
            <div className="h-48 rounded-xl bg-white/[0.03] border border-white/5 animate-pulse" />
          </div>
          <div className="md:col-span-9 space-y-4">
            <div className="h-28 rounded-xl bg-white/[0.03] border border-white/5 animate-pulse" />
            <div className="h-72 rounded-xl bg-white/[0.03] border border-white/5 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!session || session.role !== "STUDENT") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[60vh]">
        <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 mb-3">
          <User className="w-5 h-5" />
        </div>
        <h1 className="font-display text-lg font-bold text-white mb-1">Student Session Required</h1>
        <p className="text-xs text-slate-400 mb-5 max-w-sm">Please authenticate with your student account credentials to access this workspace.</p>
        <Link href="/login" className="px-4 py-2 rounded-lg bg-white text-black font-semibold text-xs">
          Sign In
        </Link>
      </div>
    );
  }

  const profile = session.studentProfile || {};
  const now = new Date();
  const activeRegistration = teams.find(
    (t) => (t.status === "ACTIVE" || t.status === "PENDING") && new Date(t.hackathon.endAt) > now
  );

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full">
      {/* Header Breadcrumbs & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-white/[0.08] gap-4">
        <div className="space-y-1">
          <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <span>HackBridge</span>
            <span>/</span>
            <span>Student Console</span>
            <span>/</span>
            <span className="text-white">Workspace</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">
            {session.name}
          </h1>
          <p className="text-xs text-slate-400">
            {profile.college || "Collegiate Engineer"} · {session.email}
          </p>
        </div>

        {/* Permanent Hackathon ID Callout */}
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#0B0E18] border border-white/10">
          <div className="px-2 py-0.5 text-[10px] font-mono uppercase bg-white/5 text-slate-400 rounded">
            ID
          </div>
          <span className="font-mono font-bold text-sm text-white tracking-wider">
            {session.hackathonId || "HB-PENDING"}
          </span>
          <button
            onClick={copyId}
            className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title="Copy Permanent Hackathon ID"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Sidebar Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Sidebar Navigation (3 Cols) */}
        <aside className="md:col-span-3 space-y-4">
          <nav className="p-2 rounded-xl bg-[#0B0E18] border border-white/[0.08] space-y-1 text-xs font-mono">
            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                activeTab === "overview"
                  ? "bg-white text-black font-bold"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-3.5 h-3.5" />
                <span>Track Registrations</span>
              </div>
              <span className="text-[10px] opacity-70">{teams.length}</span>
            </button>
            <button
              onClick={() => setActiveTab("squads")}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2.5 ${
                activeTab === "squads"
                  ? "bg-white text-black font-bold"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Squad Formation</span>
            </button>
            <button
              onClick={() => setActiveTab("repos")}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2.5 ${
                activeTab === "repos"
                  ? "bg-white text-black font-bold"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Code Repositories</span>
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2.5 ${
                activeTab === "profile"
                  ? "bg-white text-black font-bold"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Engineering Profile</span>
            </button>
          </nav>

          {/* Institutional Compliance Card */}
          <div className="p-4 rounded-xl bg-[#0B0E18] border border-white/[0.08] space-y-2 text-xs font-mono">
            <div className="text-[10px] uppercase text-slate-500 tracking-wider">
              PRD Invariant Rule 1
            </div>
            {activeRegistration ? (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-[11px]">
                  <Clock className="w-3.5 h-3.5" />
                  Locked in Active Track
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed pt-1 border-t border-white/5">
                  Currently competing in &ldquo;{activeRegistration.hackathon.title}&rdquo;.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Eligible to Apply
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed pt-1 border-t border-white/5">
                  Not currently locked in an active hackathon registration.
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* Right Content Area (9 Cols) */}
        <main className="md:col-span-9 space-y-6">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Dense Data Table: Active Registrations */}
              <div className="bg-[#0B0E18] border border-white/[0.08] rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-white tracking-tight">
                      My Hackathon Registrations
                    </h2>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Enforcing Invariant Rule 1: One active hackathon per student.
                    </p>
                  </div>
                  <Link
                    href="/hackathons"
                    className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs font-mono font-semibold text-white border border-white/10 flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Browse Arenas
                  </Link>
                </div>

                {teams.length === 0 ? (
                  <div className="p-12 text-center text-xs font-mono text-slate-500 space-y-3">
                    <div>You are not currently registered for any hackathon tracks.</div>
                    <Link
                      href="/hackathons"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-black font-semibold text-xs font-mono hover:bg-slate-200 transition-colors"
                    >
                      Browse Upcoming Hackathons →
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-white/[0.06] text-slate-500 uppercase text-[10px] tracking-wider">
                          <th className="py-2.5 px-4 font-medium">Hackathon Track</th>
                          <th className="py-2.5 px-4 font-medium">Squad Name</th>
                          <th className="py-2.5 px-4 font-medium">Role</th>
                          <th className="py-2.5 px-4 font-medium">Official Team ID</th>
                          <th className="py-2.5 px-4 font-medium">Payment Status</th>
                          <th className="py-2.5 px-4 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {teams.map((t) => {
                          const myMember = t.members.find((m) => m.student.user.email === session.email);
                          const isLead = myMember?.role === "LEAD" || t.leadStudent.user.email === session.email;
                          const isVerified = t.payment?.status === "VERIFIED" && t.teamId;

                          return (
                            <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="py-3 px-4 font-bold text-white">
                                <Link
                                  href={`/hackathons/${t.hackathon.slug}`}
                                  className="hover:text-[#6366F1] transition-colors flex items-center gap-1.5"
                                >
                                  {t.hackathon.title}
                                  <ExternalLink className="w-2.5 h-2.5 text-slate-500" />
                                </Link>
                              </td>
                              <td className="py-3 px-4 text-slate-300">
                                {t.name}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  isLead ? "bg-white/10 text-white" : "bg-white/5 text-slate-400"
                                }`}>
                                  {isLead ? "LEAD" : "MEMBER"}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {t.teamId ? (
                                  <span className="font-bold text-emerald-400 tracking-wider">
                                    {t.teamId}
                                  </span>
                                ) : (
                                  <span className="text-slate-600 text-[10px]">Pending Payment</span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  isVerified
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : t.payment?.txnRef
                                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                    : "bg-white/5 text-slate-400 border border-white/10"
                                }`}>
                                  {isVerified ? "VERIFIED" : t.payment?.txnRef ? "IN REVIEW" : "UNPAID"}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                {!isVerified ? (
                                  <Link
                                    href={`/hackathons/${t.hackathon.slug}/payment/${t.id}`}
                                    className="text-xs text-white hover:underline font-semibold"
                                  >
                                    Verify Payment →
                                  </Link>
                                ) : (
                                  <Link
                                    href={`/dashboard/student/arena/${t.id}`}
                                    className="px-2.5 py-1 rounded bg-white text-black font-semibold text-[10px] hover:bg-slate-200 transition-colors inline-flex items-center gap-1"
                                  >
                                    Enter Arena →
                                  </Link>
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

              {/* Real Repositories Info */}
              <div className="bg-[#0B0E18] border border-white/[0.08] rounded-2xl p-6 space-y-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Code2 className="w-4 h-4 text-[#6366F1]" />
                  <span>Phase 4 Automated Code Repository Provisioning</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed font-mono">
                  PRD Rule 4 & 5: When an event unlocks and enters Phase 4 (Event Day), an automated GitHub repository named after your official Team ID will be provisioned. All commits, progress updates, and final submissions link to this repository.
                </p>
              </div>
            </div>
          )}

          {/* Squads Tab */}
          {activeTab === "squads" && (
            <div className="bg-[#0B0E18] border border-white/[0.08] rounded-2xl p-6 space-y-4">
              <h2 className="text-sm font-bold text-white tracking-tight">
                Squad Formation Guidelines
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                As team lead, you can apply directly to hackathon tracks and add your teammates by their permanent Hackathon ID (<code className="text-slate-200">HB-XXXXXX</code>). Teammate IDs are validated live to ensure they exist and are not already committed to an ongoing event.
              </p>
              <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2 text-xs font-mono">
                <div className="text-white font-semibold">Live Validation Workflow:</div>
                <div className="text-slate-400 leading-relaxed space-y-1">
                  <div>1. Enter teammate Hackathon ID (e.g., HB-A1B2C3)</div>
                  <div>2. System verifies institutional existence and college domain</div>
                  <div>3. Checks Non-negotiable Rule 1: A student can belong to only one active hackathon</div>
                  <div>4. Direct progression to payment upon verified squad roster</div>
                </div>
              </div>
            </div>
          )}

          {/* Repos Tab */}
          {activeTab === "repos" && (
            <div className="bg-[#0B0E18] border border-white/[0.08] rounded-2xl p-6 space-y-4">
              <h2 className="text-sm font-bold text-white tracking-tight">
                Code Repositories
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Repositiories are linked dynamically to your verified Team ID on event launch day.
              </p>
              <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-xs font-mono text-slate-500">
                Active repositories will populate here during live hackathon hours.
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="bg-[#0B0E18] border border-white/[0.08] rounded-2xl p-6 space-y-4">
              <h2 className="text-sm font-bold text-white tracking-tight">
                Verified Engineering Profile
              </h2>
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="text-slate-500 uppercase text-[10px]">Name</div>
                  <div className="text-white font-bold">{session.name}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="text-slate-500 uppercase text-[10px]">Email</div>
                  <div className="text-white font-bold">{session.email}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="text-slate-500 uppercase text-[10px]">Permanent Hackathon ID</div>
                  <div className="text-emerald-400 font-bold">{session.hackathonId}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="text-slate-500 uppercase text-[10px]">College / University</div>
                  <div className="text-white font-bold">{profile.college || "Collegiate Engineer"}</div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
