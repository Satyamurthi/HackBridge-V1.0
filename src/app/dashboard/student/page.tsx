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
  ExternalLink,
  Clock,
  Github,
  AlertCircle,
  FileCode,
  ShieldCheck,
  Building,
  ArrowRight
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
    teamMin: number;
    teamMax: number;
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
  problemStatement?: {
    id: string;
    title: string;
  } | null;
  codeRepo?: {
    id: string;
    githubRepoUrl: string;
    storagePath?: string | null;
    lastPushAt?: string | null;
  } | null;
  submission?: {
    id: string;
    locked: boolean;
    submittedAt?: string | null;
    githubRepoUrl?: string | null;
    zipFileUrl?: string | null;
  } | null;
}

export default function StudentDashboard() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "squads" | "repos" | "profile">("overview");

  const [teams, setTeams] = useState<TeamItem[]>([]);

  // Squad formation interactive state
  const [addingToTeamId, setAddingToTeamId] = useState<string | null>(null);
  const [teammateIdInput, setTeammateIdInput] = useState("");
  const [addingLoading, setAddingLoading] = useState(false);
  const [squadMsg, setSquadMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Profile tab interactive state
  const [profileSkills, setProfileSkills] = useState("");
  const [profileGithub, setProfileGithub] = useState("");
  const [profileCollege, setProfileCollege] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchSessionAndTeams = useCallback(async () => {
    try {
      const [meRes, teamsRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch("/api/v1/teams"),
      ]);

      if (meRes.ok) {
        const data = await meRes.json();
        if (data?.user) {
          setSession(data.user);
          const p = data.user.studentProfile;
          if (p) {
            setProfileSkills(p.skills || "");
            setProfileGithub(p.githubUsername || "");
            setProfileCollege(p.college || "");
            setProfileBio(p.bio || "");
          }
        }
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

  const handleAddTeammate = async (teamId: string) => {
    const rawId = teammateIdInput.trim().toUpperCase();
    if (!rawId) return;

    setAddingLoading(true);
    setSquadMsg(null);

    try {
      const lookupRes = await fetch(`/api/v1/students/lookup/${rawId}`);
      const lookupData = await lookupRes.json();

      if (!lookupRes.ok || !lookupData.exists) {
        setSquadMsg({ type: "error", text: lookupData.error || "Student not found with this Hackathon ID." });
        setAddingLoading(false);
        return;
      }

      if (!lookupData.isEligible) {
        setSquadMsg({ type: "error", text: lookupData.blockedReason || "Student is locked in an active registration elsewhere." });
        setAddingLoading(false);
        return;
      }

      const addRes = await fetch(`/api/v1/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: lookupData.studentId }),
      });

      const addData = await addRes.json();
      if (!addRes.ok) {
        setSquadMsg({ type: "error", text: addData.error || "Failed to add member to team." });
        setAddingLoading(false);
        return;
      }

      setSquadMsg({ type: "success", text: `Successfully added ${lookupData.name} (${rawId}) to your squad!` });
      setTeammateIdInput("");
      setAddingToTeamId(null);
      await fetchSessionAndTeams();
    } catch {
      setSquadMsg({ type: "error", text: "Network error adding teammate." });
    } finally {
      setAddingLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);

    try {
      const res = await fetch("/api/v1/students/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          college: profileCollege.trim(),
          githubUsername: profileGithub.trim(),
          skills: profileSkills.trim(),
          bio: profileBio.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setProfileMsg({ type: "error", text: data.error || "Failed to update profile." });
        setSavingProfile(false);
        return;
      }

      setProfileMsg({ type: "success", text: "Engineering profile updated successfully!" });
      await fetchSessionAndTeams();
    } catch {
      setProfileMsg({ type: "error", text: "Network error saving profile." });
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full bg-transparent">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-3 space-y-3">
            <div className="h-40 rounded-2xl bg-[#0B0E18]/55 border border-white/[0.08] animate-pulse" />
            <div className="h-48 rounded-2xl bg-[#0B0E18]/55 border border-white/[0.08] animate-pulse" />
          </div>
          <div className="md:col-span-9 space-y-4">
            <div className="h-28 rounded-2xl bg-[#0B0E18]/55 border border-white/[0.08] animate-pulse" />
            <div className="h-72 rounded-2xl bg-[#0B0E18]/55 border border-white/[0.08] animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!session || session.role !== "STUDENT") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[60vh] bg-transparent">
        <div className="w-12 h-12 rounded-xl bg-[#0B0E18]/70 border border-white/[0.08] shadow-sm flex items-center justify-center text-[#F8FAFC] mb-4">
          <User className="w-6 h-6 text-[#6366F1]" />
        </div>
        <h1 className="font-display text-xl font-extrabold text-[#F8FAFC] mb-2 tracking-tight">Student Session Required</h1>
        <p className="text-sm text-[#94A3B8] mb-6 max-w-sm">Please authenticate with your student account credentials to access this workspace.</p>
        <Link href="/login" className="px-5 py-2.5 rounded-xl bg-[#6366F1] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#4F46E5] shadow-sm transition-all">
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
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full bg-transparent relative z-10 text-[#F8FAFC]">
      {/* Header Breadcrumbs & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-white/[0.08] gap-4">
        <div className="space-y-1">
          <div className="text-[11px] font-mono text-[#64748B] uppercase tracking-wider flex items-center gap-2">
            <span>HackBridge</span>
            <span>/</span>
            <span>Student Console</span>
            <span>/</span>
            <span className="text-[#818CF8] font-bold">Workspace</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
            {session.name}
          </h1>
          <p className="text-xs text-[#94A3B8] font-mono">
            {profile.college || "Collegiate Engineer"} · {session.email}
          </p>
        </div>

        {/* Permanent Hackathon ID Callout */}
        <div className="flex items-center gap-2.5 p-2 px-3 rounded-2xl bg-[#0B0E18]/55 backdrop-blur-md border border-white/[0.08] shadow-sm">
          <div className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30 rounded">
            ID
          </div>
          <span className="font-mono font-extrabold text-sm text-[#F8FAFC] tracking-wider">
            {session.hackathonId || "HB-PENDING"}
          </span>
          <button
            onClick={copyId}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
            title="Copy Permanent Hackathon ID"
          >
            {copied ? <Check className="w-4 h-4 text-[#6366F1]" /> : <Copy className="w-4 h-4 text-[#64748B]" />}
          </button>
        </div>
      </div>

      {/* Sidebar Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Sidebar Navigation (3 Cols) */}
        <aside className="md:col-span-3 space-y-4">
          <nav className="p-2 rounded-2xl bg-[#0B0E18]/55 backdrop-blur-md border border-white/[0.08] shadow-sm space-y-1 text-xs font-mono">
            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center justify-between ${
                activeTab === "overview"
                  ? "bg-[#6366F1] text-white font-bold shadow-sm"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4" />
                <span>Track Registrations</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${activeTab === "overview" ? "bg-white/20 text-white" : "bg-white/[0.06] text-[#94A3B8]"}`}>
                {teams.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("squads")}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center justify-between ${
                activeTab === "squads"
                  ? "bg-[#6366F1] text-white font-bold shadow-sm"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Terminal className="w-4 h-4" />
                <span>Squad Formation</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${activeTab === "squads" ? "bg-white/20 text-white" : "bg-white/[0.06] text-[#94A3B8]"}`}>
                {teams.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("repos")}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center justify-between ${
                activeTab === "repos"
                  ? "bg-[#6366F1] text-white font-bold shadow-sm"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Code2 className="w-4 h-4" />
                <span>Code Repositories</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${activeTab === "repos" ? "bg-white/20 text-white" : "bg-white/[0.06] text-[#94A3B8]"}`}>
                {teams.filter((t) => t.codeRepo || t.teamId).length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-2.5 ${
                activeTab === "profile"
                  ? "bg-[#6366F1] text-white font-bold shadow-sm"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]"
              }`}
            >
              <User className="w-4 h-4" />
              <span>Engineering Profile</span>
            </button>
          </nav>

          {/* Institutional Compliance Card */}
          <div className="p-4 rounded-2xl bg-[#0B0E18]/55 backdrop-blur-md border border-white/[0.08] shadow-sm space-y-2 text-xs font-mono">
            <div className="text-[10px] uppercase text-[#64748B] tracking-wider font-bold">
              PRD Invariant Rule 1
            </div>
            {activeRegistration ? (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[#818CF8] font-bold text-[11px]">
                  <Clock className="w-3.5 h-3.5" />
                  Locked in Active Track
                </div>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed pt-1 border-t border-white/[0.08]">
                  Currently competing in &ldquo;{activeRegistration.hackathon.title}&rdquo;.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Eligible to Apply
                </div>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed pt-1 border-t border-white/[0.08]">
                  Not currently locked in an active hackathon registration.
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* Right Content Area (9 Cols) */}
        <main className="md:col-span-9 space-y-6">
          {/* TAB 1: Track Registrations */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="bg-[#0B0E18]/55 backdrop-blur-md border border-white/[0.08] rounded-3xl shadow-xl overflow-hidden">
                <div className="p-6 border-b border-white/[0.08] flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-extrabold text-[#F8FAFC] tracking-tight">
                      My Hackathon Registrations
                    </h2>
                    <p className="text-xs text-[#64748B] font-mono mt-0.5">
                      Enforcing Invariant Rule 1: One active hackathon per student.
                    </p>
                  </div>
                  <Link
                    href="/hackathons"
                    className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-[#6366F1] hover:text-white text-xs font-mono font-bold text-[#F8FAFC] border border-white/[0.08] flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Browse Arenas
                  </Link>
                </div>

                {teams.length === 0 ? (
                  <div className="p-16 text-center text-xs font-mono text-[#64748B] space-y-3">
                    <div>You are not currently registered for any hackathon tracks.</div>
                    <Link
                      href="/hackathons"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#6366F1] text-white font-bold text-xs font-mono hover:bg-[#4F46E5] shadow-sm transition-all"
                    >
                      Browse Upcoming Hackathons →
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-white/[0.08] bg-[#111524]/60 text-[#94A3B8] uppercase text-[10px] tracking-wider">
                          <th className="py-3.5 px-4 font-bold">Hackathon Track</th>
                          <th className="py-3.5 px-4 font-bold">Squad Name</th>
                          <th className="py-3.5 px-4 font-bold">Role</th>
                          <th className="py-3.5 px-4 font-bold">Official Team ID</th>
                          <th className="py-3.5 px-4 font-bold">Payment Status</th>
                          <th className="py-3.5 px-4 font-bold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {teams.map((t) => {
                          const myMember = t.members.find((m) => m.student.user.email === session.email);
                          const isLead = myMember?.role === "LEAD" || t.leadStudent.user.email === session.email;
                          const isVerified = t.payment?.status === "VERIFIED" && t.teamId;

                          return (
                            <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="py-4 px-4 font-bold text-[#F8FAFC]">
                                <Link
                                  href={`/hackathons/${t.hackathon.slug}`}
                                  className="hover:text-[#818CF8] transition-colors flex items-center gap-1.5"
                                >
                                  {t.hackathon.title}
                                  <ExternalLink className="w-3 h-3 text-[#64748B]" />
                                </Link>
                              </td>
                              <td className="py-4 px-4 text-[#94A3B8] font-semibold">
                                {t.name}
                              </td>
                              <td className="py-4 px-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isLead ? "bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/30" : "bg-white/[0.04] text-[#94A3B8] border border-white/[0.08]"
                                }`}>
                                  {isLead ? "LEAD" : "MEMBER"}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                {t.teamId ? (
                                  <span className="font-extrabold text-[#818CF8] tracking-wider">
                                    {t.teamId}
                                  </span>
                                ) : (
                                  <span className="text-[#64748B] text-[11px]">Pending Payment</span>
                                )}
                              </td>
                              <td className="py-4 px-4">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                  isVerified
                                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                    : t.payment?.txnRef
                                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                    : "bg-white/[0.04] text-[#94A3B8] border border-white/[0.08]"
                                }`}>
                                  {isVerified ? "VERIFIED" : t.payment?.txnRef ? "IN REVIEW" : "UNPAID"}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-right">
                                {!isVerified ? (
                                  <Link
                                    href={`/hackathons/${t.hackathon.slug}/payment/${t.id}`}
                                    className="text-xs text-[#818CF8] hover:underline font-bold"
                                  >
                                    Verify Payment →
                                  </Link>
                                ) : (
                                  <Link
                                    href={`/dashboard/student/arena/${t.id}`}
                                    className="px-3 py-1.5 rounded-xl bg-[#6366F1] text-white font-bold text-[10px] hover:bg-[#4F46E5] shadow-sm transition-colors inline-flex items-center gap-1"
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
            </div>
          )}

          {/* TAB 2: Squad Formation (Interactive Roster & Member Addition) */}
          {activeTab === "squads" && (
            <div className="space-y-6">
              {squadMsg && (
                <div className={`p-4 rounded-2xl text-xs font-mono flex items-center gap-2 border ${
                  squadMsg.type === "success" 
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-red-500/10 border-red-500/30 text-red-300"
                }`}>
                  {squadMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{squadMsg.text}</span>
                </div>
              )}

              {teams.length === 0 ? (
                <div className="p-16 rounded-3xl bg-[#0B0E18]/55 backdrop-blur-md border border-white/[0.08] text-center space-y-4">
                  <Terminal className="w-8 h-8 text-[#6366F1] mx-auto" />
                  <h3 className="font-bold text-sm text-[#F8FAFC]">No Squads Formed Yet</h3>
                  <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
                    Apply as a team lead to form a squad or share your ID ({session.hackathonId}) with your lead.
                  </p>
                  <Link href="/hackathons" className="inline-block px-4 py-2 rounded-xl bg-[#6366F1] text-xs font-bold text-white">
                    Explore Hackathons
                  </Link>
                </div>
              ) : (
                teams.map((team) => {
                  const isLead = team.leadStudent.user.email === session.email;
                  const canAdd = isLead && team.status === "PENDING" && team.members.length < team.hackathon.teamMax;

                  return (
                    <div
                      key={team.id}
                      className="bg-[#0B0E18]/55 backdrop-blur-md border border-white/[0.08] rounded-3xl p-6 sm:p-7 space-y-5 shadow-xl"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/[0.08] gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-display text-lg font-bold text-[#F8FAFC]">{team.name}</h3>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-[#818CF8] border border-white/[0.08] font-bold">
                              {team.members.length} / {team.hackathon.teamMax} Members
                            </span>
                          </div>
                          <p className="text-xs text-[#94A3B8] font-mono mt-0.5">
                            Track: {team.hackathon.title}
                          </p>
                        </div>

                        {canAdd && (
                          <button
                            onClick={() => {
                              setAddingToTeamId(addingToTeamId === team.id ? null : team.id);
                              setSquadMsg(null);
                            }}
                            className="text-xs font-mono text-[#818CF8] hover:text-white font-bold flex items-center gap-1 self-start sm:self-auto transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            {addingToTeamId === team.id ? "Cancel Add" : "Add Teammate"}
                          </button>
                        )}
                      </div>

                      {/* Add Teammate Input Box */}
                      {addingToTeamId === team.id && (
                        <div className="p-4 rounded-2xl bg-white/[0.02] border border-[#6366F1]/30 space-y-2 font-mono text-xs">
                          <label className="text-[11px] text-[#94A3B8] block font-bold">
                            Enter Permanent Hackathon ID (HB-XXXXXX):
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={teammateIdInput}
                              onChange={(e) => setTeammateIdInput(e.target.value.toUpperCase())}
                              placeholder="HB-XXXXXX"
                              className="flex-1 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#F8FAFC] text-xs font-mono uppercase focus:outline-none focus:border-[#6366F1]"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddTeammate(team.id)}
                              disabled={addingLoading || !teammateIdInput.trim()}
                              className="px-4 py-2 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold text-xs disabled:opacity-40"
                            >
                              {addingLoading ? "Validating..." : "Add Member"}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Member cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 font-mono text-xs">
                        {team.members.map((m) => (
                          <div
                            key={m.student.hackathonId}
                            className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between"
                          >
                            <div className="space-y-0.5 truncate mr-2">
                              <div className="font-bold text-[#F8FAFC] flex items-center gap-1.5 truncate">
                                <span className="truncate">{m.student.user.name}</span>
                                {m.role === "LEAD" && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#6366F1]/20 text-[#818CF8] font-bold shrink-0">
                                    LEAD
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#94A3B8] truncate">{m.student.college}</div>
                            </div>
                            <span className="text-[10px] font-bold text-[#818CF8] bg-[#6366F1]/10 px-2 py-0.5 rounded border border-[#6366F1]/20 shrink-0">
                              {m.student.hackathonId}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: Code Repositories */}
          {activeTab === "repos" && (
            <div className="bg-[#0B0E18]/55 backdrop-blur-md border border-white/[0.08] rounded-3xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-white/[0.08] flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-[#F8FAFC] tracking-tight">
                    Provisioned GitHub Repositories
                  </h2>
                  <p className="text-xs text-[#64748B] font-mono mt-0.5">
                    PRD Rule 4: Automated GitHub repository titled by Team ID with live commit tracking.
                  </p>
                </div>
                <div className="text-xs font-mono text-[#94A3B8]">
                  Active: <span className="text-[#818CF8] font-extrabold">{teams.filter((t) => t.codeRepo || t.teamId).length}</span>
                </div>
              </div>

              {teams.filter((t) => t.codeRepo || t.teamId).length === 0 ? (
                <div className="p-16 text-center text-xs font-mono text-[#64748B] space-y-2">
                  <div>No provisioned repositories yet.</div>
                  <p className="text-xs text-[#64748B] max-w-md mx-auto">
                    When your team verifies payment and enters the Live Arena on event day, a repository named after your official Team ID will be provisioned automatically.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.06]">
                  {teams
                    .filter((t) => t.codeRepo || t.teamId)
                    .map((t) => {
                      const repoUrl =
                        t.codeRepo?.githubRepoUrl ||
                        `https://github.com/hackbridge-org/hackbridge-${t.teamId || t.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
                      const repoName = `hackbridge-${t.teamId || "pending"}`;

                      return (
                        <div key={t.id} className="p-6 hover:bg-white/[0.02] transition-colors space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <Code2 className="w-4 h-4 text-[#818CF8]" />
                              <span className="font-mono text-sm font-bold text-[#F8FAFC]">
                                {repoName}
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30 font-bold">
                                {t.teamId ? "PROVISIONED" : "PENDING ALLOCATION"}
                              </span>
                            </div>

                            <Link
                              href={`/dashboard/student/arena/${t.id}`}
                              className="px-4 py-2 rounded-xl bg-[#6366F1] text-white font-bold text-xs hover:bg-[#4F46E5] transition-all flex items-center gap-1.5 font-mono shadow-sm self-start sm:self-auto"
                            >
                              Live Workspace Arena →
                            </Link>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-0.5">
                              <div className="text-[10px] text-[#64748B] uppercase font-bold">Squad / Track</div>
                              <div className="text-[#F8FAFC] font-semibold truncate">
                                {t.name} · {t.hackathon.title}
                              </div>
                            </div>

                            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-0.5">
                              <div className="text-[10px] text-[#64748B] uppercase font-bold">Assigned Problem</div>
                              <div className="text-[#94A3B8] font-semibold truncate">
                                {t.problemStatement?.title || "Pending problem selection"}
                              </div>
                            </div>

                            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-0.5">
                              <div className="text-[10px] text-[#64748B] uppercase font-bold">Submission Zip / Code</div>
                              <div className="text-[#94A3B8] font-semibold">
                                {t.submission?.locked ? "Final Code Locked" : t.codeRepo?.lastPushAt ? "Sync Active" : "Initialized"}
                              </div>
                            </div>
                          </div>

                          {/* Clone Snippet */}
                          <div className="flex items-center justify-between p-3 rounded-xl bg-[#030407] border border-white/[0.08] text-[11px] font-mono text-[#F8FAFC] overflow-x-auto">
                            <span className="truncate mr-2 select-all text-[#818CF8]">
                              git clone {repoUrl}.git
                            </span>
                            <a
                              href={repoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-[#818CF8] hover:underline flex items-center gap-1 shrink-0 font-bold"
                            >
                              Open on GitHub <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Engineering Profile (Live Editable) */}
          {activeTab === "profile" && (
            <div className="bg-[#0B0E18]/55 backdrop-blur-md border border-white/[0.08] rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl">
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <div>
                  <h2 className="text-base font-extrabold text-[#F8FAFC] tracking-tight">
                    Engineering Profile
                  </h2>
                  <p className="text-xs text-[#64748B] font-mono mt-0.5">
                    Skills, GitHub username, collegiate identity, and bio.
                  </p>
                </div>
                <Link
                  href="/dashboard/student/profile"
                  className="text-xs font-mono text-[#818CF8] hover:underline font-bold"
                >
                  Full Profile & Password Settings →
                </Link>
              </div>

              {profileMsg && (
                <div className={`p-3.5 rounded-xl text-xs font-mono flex items-center gap-2 border ${
                  profileMsg.type === "success" 
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-red-500/10 border-red-500/30 text-red-300"
                }`}>
                  {profileMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{profileMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4 font-mono text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[#94A3B8] font-bold block text-[11px]">
                      Permanent Hackathon ID
                    </label>
                    <input
                      type="text"
                      disabled
                      value={session.hackathonId || ""}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[#818CF8] font-extrabold text-xs cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[#94A3B8] font-bold block text-[11px]">
                      College / University
                    </label>
                    <input
                      type="text"
                      value={profileCollege}
                      onChange={(e) => setProfileCollege(e.target.value)}
                      placeholder="e.g. Indian Institute of Technology"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#F8FAFC] text-xs focus:outline-none focus:border-[#6366F1]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[#94A3B8] font-bold block text-[11px]">
                      GitHub Username
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-[#64748B]">@</span>
                      <input
                        type="text"
                        value={profileGithub}
                        onChange={(e) => setProfileGithub(e.target.value)}
                        placeholder="username"
                        className="w-full pl-7 pr-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#F8FAFC] text-xs focus:outline-none focus:border-[#6366F1]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[#94A3B8] font-bold block text-[11px]">
                      Skills (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={profileSkills}
                      onChange={(e) => setProfileSkills(e.target.value)}
                      placeholder="React, Rust, PyTorch, Go"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#F8FAFC] text-xs focus:outline-none focus:border-[#6366F1]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[#94A3B8] font-bold block text-[11px]">
                    Bio / Technical Focus
                  </label>
                  <textarea
                    rows={3}
                    value={profileBio}
                    onChange={(e) => setProfileBio(e.target.value)}
                    placeholder="Brief description of your competitive coding interests..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#F8FAFC] text-xs focus:outline-none focus:border-[#6366F1] resize-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-5 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold text-xs transition-colors disabled:opacity-40 shadow-sm"
                  >
                    {savingProfile ? "Saving..." : "Save Engineering Profile"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
