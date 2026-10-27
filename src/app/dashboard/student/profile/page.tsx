"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  User,
  Shield,
  Download,
  Copy,
  Check,
  Building,
  Github,
  Award,
  ArrowRight,
  FileText,
  Lock,
  ExternalLink,
  Sun,
  Moon,
  AlertCircle,
  CheckCircle2,
  KeyRound
} from "lucide-react";

interface StudentData {
  id: string;
  userId: string;
  hackathonId: string;
  college: string;
  githubUsername?: string;
  bio?: string;
  skills?: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  memberSince: string;
  activeRegistration: {
    teamId: string;
    teamName: string;
    role: string;
    hackathonTitle: string;
    hackathonSlug: string;
    endAt: string;
    status: string;
  } | null;
  isEligibleForNewHackathon: boolean;
}

export default function StudentProfilePage() {
  const [student, setStudent] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Edit profile form state
  const [college, setCollege] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Change password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Theme preference state
  const [currentTheme, setCurrentTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("hb_theme");
      setCurrentTheme(stored === "light" ? "light" : "dark");
    }
  }, []);

  const setTheme = (theme: "dark" | "light") => {
    if (typeof window === "undefined") return;
    if (theme === "light") {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.documentElement.style.colorScheme = "light";
      localStorage.setItem("hb_theme", "light");
      setCurrentTheme("light");
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.documentElement.style.colorScheme = "dark";
      localStorage.setItem("hb_theme", "dark");
      setCurrentTheme("dark");
    }
  };

  const loadProfile = async () => {
    try {
      const res = await fetch("/api/v1/students/me");
      if (res.ok) {
        const data = await res.json();
        if (data?.student) {
          setStudent(data.student);
          setCollege(data.student.college || "");
          setGithubUsername(data.student.githubUsername || "");
          setBio(data.student.bio || "");
          setSkills(data.student.skills || "");
          setPhone(data.student.phone || "");
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const copyId = () => {
    if (!student?.hackathonId) return;
    navigator.clipboard.writeText(student.hackathonId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccess(null);
    setProfileError(null);

    try {
      const res = await fetch("/api/v1/students/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          college: college.trim(),
          githubUsername: githubUsername.trim(),
          bio: bio.trim(),
          skills: skills.trim(),
          phone: phone.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.error || "Failed to update profile.");
        setSavingProfile(false);
        return;
      }

      setProfileSuccess("Profile information saved successfully!");
      await loadProfile();
    } catch {
      setProfileError("Network error saving profile changes.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }

    setSavingPassword(true);
    setPasswordSuccess(null);
    setPasswordError(null);

    try {
      const res = await fetch("/api/v1/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || "Failed to change password.");
        setSavingPassword(false);
        return;
      }

      setPasswordSuccess("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordError("Network error changing password.");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDownloadExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/v1/users/export");
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `hackbridge-data-export-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error("Export error:", e);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full">
        <div className="space-y-6">
          <div className="h-14 rounded-2xl bg-[#0B0E18]/55 border border-white/[0.08] animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-72 rounded-2xl bg-[#0B0E18]/55 border border-white/[0.08] animate-pulse" />
            <div className="h-72 rounded-2xl bg-[#0B0E18]/55 border border-white/[0.08] animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center relative z-10">
        <div className="p-3 rounded-full bg-white/[0.04] border border-white/10 w-fit mx-auto mb-4">
          <Lock className="w-6 h-6 text-[#94A3B8]" />
        </div>
        <h1 className="font-display text-xl font-bold text-[#F8FAFC] mb-2">Student Session Required</h1>
        <p className="text-xs text-[#94A3B8] mb-6 leading-relaxed">
          Please sign in with your student credentials to view your profile and account settings.
        </p>
        <Link
          href="/login?redirect=/dashboard/student/profile"
          className="px-5 py-2.5 rounded-lg bg-[#6366F1] text-white font-semibold text-xs hover:bg-[#4F46E5] transition-colors inline-block"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full space-y-8 relative z-10 text-[#F8FAFC]">
      {/* Header & Breadcrumb */}
      <div className="pb-6 border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-[11px] font-mono text-[#64748B] uppercase tracking-wider flex items-center gap-2">
            <Link href="/dashboard/student" className="hover:text-[#818CF8]">Dashboard</Link>
            <span>/</span>
            <span className="text-[#818CF8] font-bold">Profile</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
            Student Profile & Settings
          </h1>
          <p className="text-xs text-[#94A3B8] font-mono">
            Permanent cryptographic credentials, editable portfolio fields, and account security.
          </p>
        </div>

        {/* Permanent Hackathon ID Chip */}
        <div
          onClick={copyId}
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#0B0E18]/55 backdrop-blur-md border border-white/[0.08] hover:border-[#6366F1]/50 transition-colors cursor-pointer self-start sm:self-auto shadow-sm"
          title="Click to copy permanent Hackathon ID"
        >
          <span className="text-[10px] font-mono text-[#64748B] uppercase font-bold">ID</span>
          <span className="text-sm font-mono font-extrabold text-[#F8FAFC]">{student.hackathonId}</span>
          {copied ? <Check className="w-4 h-4 text-[#6366F1]" /> : <Copy className="w-4 h-4 text-[#64748B]" />}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (7 cols): Identity & Editable Fields */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Profile Form */}
          <div className="bg-[#0B0E18]/55 backdrop-blur-md border border-white/[0.08] rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#6366F1]/15 border border-[#6366F1]/30 flex items-center justify-center text-[#818CF8] font-display font-extrabold text-lg">
                  {student.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-[#F8FAFC]">{student.name}</h2>
                  <p className="text-xs font-mono text-[#94A3B8]">{student.email}</p>
                </div>
              </div>

              <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30 font-bold">
                {student.status}
              </span>
            </div>

            {profileSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{profileSuccess}</span>
              </div>
            )}

            {profileError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[#94A3B8] font-bold block text-[11px]">
                    Full Name (Cryptographic Principal)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={student.name}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[#64748B] text-xs font-mono cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[#94A3B8] font-bold block text-[11px]">
                    Email Address
                  </label>
                  <input
                    type="email"
                    disabled
                    value={student.email}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[#64748B] text-xs font-mono cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[#F8FAFC] font-bold block text-[11px]">
                    College / University <span className="text-[#818CF8]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    placeholder="e.g., Indian Institute of Technology"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#F8FAFC] text-xs font-mono focus:outline-none focus:border-[#6366F1]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[#F8FAFC] font-bold block text-[11px]">
                    GitHub Username
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-[#64748B]">@</span>
                    <input
                      type="text"
                      value={githubUsername}
                      onChange={(e) => setGithubUsername(e.target.value)}
                      placeholder="username"
                      className="w-full pl-7 pr-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#F8FAFC] text-xs font-mono focus:outline-none focus:border-[#6366F1]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[#F8FAFC] font-bold block text-[11px]">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#F8FAFC] text-xs font-mono focus:outline-none focus:border-[#6366F1]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[#F8FAFC] font-bold block text-[11px]">
                    Technical Skills (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    placeholder="TypeScript, Python, Next.js, Docker"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#F8FAFC] text-xs font-mono focus:outline-none focus:border-[#6366F1]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[#F8FAFC] font-bold block text-[11px]">
                  Engineering Bio
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Describe your technical focus, competitive hackathon experience, or research interests..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#F8FAFC] text-xs font-mono focus:outline-none focus:border-[#6366F1] resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold text-xs transition-colors shadow-sm disabled:opacity-40"
                >
                  {savingProfile ? "Saving Changes..." : "Save Profile Changes"}
                </button>
              </div>
            </form>
          </div>

          {/* DPDP Act Section 12 Data Export */}
          <div className="bg-[#0B0E18]/55 backdrop-blur-md border border-white/[0.08] rounded-3xl p-6 sm:p-7 space-y-4 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#818CF8]" />
                  <h3 className="font-display text-sm font-bold text-[#F8FAFC]">
                    DPDP Act 2023 · Personal Data Portability
                  </h3>
                </div>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Under Section 12 of the Digital Personal Data Protection Act, you have the right to download a machine-readable JSON archive of all personal data, memberships, and transaction logs.
                </p>
              </div>

              <button
                onClick={handleDownloadExport}
                disabled={exporting}
                className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono font-bold text-[#F8FAFC] flex items-center gap-1.5 shrink-0 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#818CF8]" />
                {exporting ? "Generating..." : "Export JSON"}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Security, Invariant Rule 1 & Theme */}
        <div className="lg:col-span-5 space-y-6">
          {/* Institutional Invariant Rule 1 Status */}
          <div className="bg-[#0B0E18]/55 backdrop-blur-md border border-white/[0.08] rounded-3xl p-6 space-y-3 shadow-xl text-xs font-mono">
            <div className="text-[10px] uppercase text-[#64748B] tracking-wider font-bold">
              PRD Invariant Rule 1 Status
            </div>

            {student.activeRegistration ? (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[#818CF8] font-bold">
                  <CheckCircle2 className="w-4 h-4 text-[#6366F1]" />
                  Locked in Active Track Registration
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                  <div className="text-[#F8FAFC] font-bold">{student.activeRegistration.hackathonTitle}</div>
                  <div className="text-[#94A3B8] text-[11px]">
                    Squad: {student.activeRegistration.teamName} ({student.activeRegistration.teamId})
                  </div>
                  <div className="text-[#64748B] text-[10px]">
                    Ends: {new Date(student.activeRegistration.endAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Eligible for Active Hackathon Registration
                </div>
                <p className="text-[#94A3B8] text-[11px] leading-relaxed">
                  You are currently unattached to any ongoing event. You can apply as team lead or be added by another squad lead.
                </p>
              </div>
            )}
          </div>

          {/* Theme Preference Card */}
          <div className="bg-[#0B0E18]/55 backdrop-blur-md border border-white/[0.08] rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="space-y-1">
              <h3 className="font-display text-sm font-bold text-[#F8FAFC]">
                Theme Preference
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Choose your default interface appearance (Dark mode is default).
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${
                  currentTheme === "dark"
                    ? "bg-[#6366F1]/20 border-[#6366F1] text-white"
                    : "bg-white/[0.02] border-white/[0.08] text-[#94A3B8] hover:text-[#F8FAFC]"
                }`}
              >
                <Moon className="w-4 h-4 text-[#818CF8]" />
                Dark (Default)
              </button>

              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${
                  currentTheme === "light"
                    ? "bg-[#6366F1]/20 border-[#6366F1] text-white"
                    : "bg-white/[0.02] border-white/[0.08] text-[#94A3B8] hover:text-[#F8FAFC]"
                }`}
              >
                <Sun className="w-4 h-4 text-[#818CF8]" />
                Light Mode
              </button>
            </div>
          </div>

          {/* Change Password Card */}
          <div className="bg-[#0B0E18]/55 backdrop-blur-md border border-white/[0.08] rounded-3xl p-6 space-y-4 shadow-xl text-xs font-mono">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#818CF8]" />
              <h3 className="font-display text-sm font-bold text-[#F8FAFC]">
                Change Password
              </h3>
            </div>

            {passwordSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px]">
                {passwordSuccess}
              </div>
            )}

            {passwordError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-[11px]">
                {passwordError}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[#94A3B8] text-[11px] font-bold block">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#F8FAFC] text-xs font-mono focus:outline-none focus:border-[#6366F1]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#94A3B8] text-[11px] font-bold block">
                  New Password (min 8 chars)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#F8FAFC] text-xs font-mono focus:outline-none focus:border-[#6366F1]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#94A3B8] text-[11px] font-bold block">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#F8FAFC] text-xs font-mono focus:outline-none focus:border-[#6366F1]"
                />
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={savingPassword || !currentPassword || !newPassword}
                  className="w-full py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold text-xs transition-colors disabled:opacity-40"
                >
                  {savingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
