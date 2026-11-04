"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  ShieldCheck,
  Building,
  Briefcase,
  Award,
  Phone,
  Mail,
  Lock,
  CheckCircle2,
  AlertCircle,
  Save,
  KeyRound,
  LogOut,
  ArrowLeft,
  RefreshCw,
  Layers,
  Sparkles
} from "lucide-react";

export default function JudgeProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [designation, setDesignation] = useState("");
  const [domain, setDomain] = useState("");

  // Password update states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordErr, setPasswordErr] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch("/api/v1/judge/profile");
      if (res.ok) {
        const data = await res.json();
        setProfileData(data);
        setName(data.user?.name || "");
        setPhone(data.user?.phone || "");
        setCompany(data.judgeProfile?.company || "");
        setDesignation(data.judgeProfile?.designation || "");
        setDomain(data.judgeProfile?.domain || "");
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    setProfileErr(null);

    try {
      const res = await fetch("/api/v1/judge/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || undefined,
          company: company.trim() || undefined,
          designation: designation.trim() || undefined,
          domain: domain.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setProfileErr(data.error || "Failed to update evaluator profile.");
      } else {
        setProfileMsg("Profile updated successfully!");
        loadProfile();
      }
    } catch {
      setProfileErr("Network communication error. Please try again.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    setPasswordErr(null);

    if (newPassword !== confirmPassword) {
      setPasswordErr("New password and confirmation do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordErr("New password must be at least 8 characters.");
      return;
    }

    setSavingPassword(true);

    try {
      const res = await fetch("/api/v1/judge/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPasswordErr(data.error || "Failed to update password.");
      } else {
        setPasswordMsg("Password changed successfully! Keep your credentials secure.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setPasswordErr("Network communication error. Please try again.");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#6366F1] border-t-transparent animate-spin" />
          <span className="text-xs font-mono text-[#94A3B8]">Loading Evaluator Profile...</span>
        </div>
      </div>
    );
  }

  const user = profileData?.user;
  const judgeProfile = profileData?.judgeProfile;
  const stats = profileData?.stats;
  const assignedHackathons = profileData?.assignedHackathons || [];

  return (
    <div className="space-y-8 animate-fade-in font-mono max-w-4xl mx-auto px-4 py-8">
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-3xl bg-[#0B0E18]/70 border border-white/[0.08]">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/judge"
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[#94A3B8] hover:text-white transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2 text-[#818CF8]">
              <User className="w-5 h-5 text-[#6366F1]" />
              <h1 className="text-xl font-extrabold text-white">Evaluator Profile & Clearance Console</h1>
            </div>
          </div>
          <p className="text-xs text-[#94A3B8] ml-11">
            Manage your jury credentials, assigned domain focus, and account security.
          </p>
        </div>

        <button
          onClick={handleSignOut}
          className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-bold text-red-300 transition-all flex items-center gap-2"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* EVALUATOR HERO CARD */}
      <div className="p-8 rounded-3xl bg-[#0B0E18]/80 backdrop-blur-md border border-white/[0.12] shadow-2xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#6366F1]/20 border border-[#6366F1]/30 flex items-center justify-center text-xl font-black text-[#818CF8]">
              {user?.name ? user.name.charAt(0).toUpperCase() : "J"}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-white">{user?.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>{judgeProfile?.approvalStatus || "APPROVED"} EVALUATOR</span>
                </span>
              </div>
              <div className="text-xs text-[#94A3B8]">{user?.email}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadProfile}
              disabled={fetching}
              className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs text-[#94A3B8] hover:text-white flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${fetching ? "animate-spin text-[#818CF8]" : ""}`} />
              <span>Sync</span>
            </button>
          </div>
        </div>

        {/* EVALUATOR METRICS SUMMARY */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
            <span className="text-[10px] text-[#64748B] uppercase font-bold">Assigned Arenas</span>
            <div className="text-xl font-black text-white">{stats?.totalAssignedHackathons || 0}</div>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
            <span className="text-[10px] text-[#64748B] uppercase font-bold">Certified Evaluations</span>
            <div className="text-xl font-black text-emerald-400">{stats?.totalCertifiedEvaluations || 0}</div>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
            <span className="text-[10px] text-[#64748B] uppercase font-bold">Draft Scorecards</span>
            <div className="text-xl font-black text-amber-400">{stats?.totalDraftEvaluations || 0}</div>
          </div>
        </div>
      </div>

      {/* EDIT PROFILE DETAILS FORM */}
      <div className="p-8 rounded-3xl bg-[#0B0E18]/80 backdrop-blur-md border border-white/[0.12] shadow-2xl space-y-6">
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#6366F1]" />
            <span>Professional & Evaluator Credentials</span>
          </h3>
          <p className="text-xs text-[#94A3B8]">
            Update your jury organization, designation, and primary domain track specialization.
          </p>
        </div>

        {profileMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{profileMsg}</span>
          </div>
        )}

        {profileErr && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{profileErr}</span>
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-[#94A3B8] font-bold">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-[#64748B] focus:border-[#6366F1] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-[#94A3B8] font-bold">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-[#64748B] focus:border-[#6366F1] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-[#94A3B8] font-bold">Organization / Company</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Google / Microsoft / Independent Expert"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-[#64748B] focus:border-[#6366F1] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-[#94A3B8] font-bold">Designation / Title</label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="Principal Architect / Engineering Director"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-[#64748B] focus:border-[#6366F1] focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[#94A3B8] font-bold">Evaluation Domain Focus</label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="Full Stack & Distributed Systems, AI/ML, Cybersecurity, Cloud DevOps"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-[#64748B] focus:border-[#6366F1] focus:outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="px-5 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold transition-all shadow-lg shadow-[#6366F1]/20 flex items-center gap-2"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingProfile ? "Saving Profile..." : "Save Profile Changes"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* CHANGE PASSWORD SECURITY FORM */}
      <div className="p-8 rounded-3xl bg-[#0B0E18]/80 backdrop-blur-md border border-white/[0.12] shadow-2xl space-y-6">
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#818CF8]" />
            <span>Security & Password Management</span>
          </h3>
          <p className="text-xs text-[#94A3B8]">
            Ensure your evaluator access remains cryptographically protected.
          </p>
        </div>

        {passwordMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{passwordMsg}</span>
          </div>
        )}

        {passwordErr && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{passwordErr}</span>
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-[#94A3B8] font-bold">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-[#64748B] focus:border-[#6366F1] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-[#94A3B8] font-bold">New Password (min 8 characters)</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-[#64748B] focus:border-[#6366F1] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-[#94A3B8] font-bold">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-[#64748B] focus:border-[#6366F1] focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingPassword}
              className="px-5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white text-xs font-bold transition-all flex items-center gap-2"
            >
              <Lock className="w-3.5 h-3.5 text-[#818CF8]" />
              <span>{savingPassword ? "Updating Password..." : "Update Password"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ASSIGNED TRACKS CLEARANCE CARD */}
      <div className="p-8 rounded-3xl bg-[#0B0E18]/80 backdrop-blur-md border border-white/[0.12] shadow-2xl space-y-4">
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#6366F1]" />
            <span>Assigned Hackathon Track Clearances</span>
          </h3>
          <p className="text-xs text-[#94A3B8]">
            Official hackathon tracks where your jury decisions are certified.
          </p>
        </div>

        {assignedHackathons.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#94A3B8] rounded-2xl bg-white/[0.02] border border-white/[0.06]">
            No hackathon tracks assigned to this evaluator account yet.
          </div>
        ) : (
          <div className="space-y-3">
            {assignedHackathons.map((h: any) => (
              <div
                key={h.id}
                className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-wrap items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-white">{h.title}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        h.approvalStatus === "APPROVED"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      {h.approvalStatus}
                    </span>
                  </div>
                  <div className="text-xs text-[#94A3B8] flex items-center gap-3">
                    <span>Host: {h.hostName}</span>
                    <span>•</span>
                    <span className="text-[#818CF8]">Track: {h.domain}</span>
                  </div>
                </div>

                <Link
                  href={`/dashboard/judge?tab=queue&hackathonId=${h.id}`}
                  className="px-3.5 py-1.5 rounded-xl bg-[#6366F1]/20 hover:bg-[#6366F1]/30 border border-[#6366F1]/30 text-xs font-bold text-[#818CF8] hover:text-white transition-all"
                >
                  Open Arena
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAST-TRACK ADMIN SUPPORT CARD */}
      <div className="p-6 rounded-3xl bg-[#111524]/80 border border-white/[0.08] space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
          <Phone className="w-4 h-4 text-[#818CF8]" />
          <span>Need Help or Track Adjustments?</span>
        </div>
        <p className="text-xs text-[#94A3B8] leading-relaxed">
          For fast approval, track reassignments, or jury coordination, contact our central administrator hotline:
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <a
            href="tel:9380968402"
            className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white text-xs font-bold transition-all flex items-center gap-2"
          >
            <Phone className="w-3.5 h-3.5 text-emerald-400" />
            <span>Call 9380968402</span>
          </a>
          <a
            href="mailto:admin@hackbridge.dev"
            className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white text-xs font-bold transition-all flex items-center gap-2"
          >
            <Mail className="w-3.5 h-3.5 text-[#818CF8]" />
            <span>admin@hackbridge.dev</span>
          </a>
        </div>
      </div>
    </div>
  );
}
