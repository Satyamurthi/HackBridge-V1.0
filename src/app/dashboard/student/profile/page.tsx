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
  ExternalLink
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

  useEffect(() => {
    fetch("/api/v1/students/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.student) {
          setStudent(data.student);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const copyId = () => {
    if (!student?.hackathonId) return;
    navigator.clipboard.writeText(student.hackathonId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Student Profile Not Found</h2>
        <p className="text-sm text-slate-400 mb-6">Please log in as a student to view your profile.</p>
        <Link
          href="/login"
          className="inline-flex items-center px-4 py-2 rounded bg-[#6366F1] text-white text-xs font-semibold"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const skillsList = student.skills
    ? student.skills.split(",").map((s) => s.trim()).filter(Boolean)
    : ["TypeScript", "Fullstack", "Distributed Systems"];

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 space-y-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-8">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1">
            IDENTITY & DATA PRINCIPAL
          </div>
          <h1 className="font-display text-3xl font-extrabold text-white tracking-tight">
            Student Profile
          </h1>
        </div>

        {/* Permanent Hackathon ID Badge */}
        <div className="flex items-center gap-3">
          <div
            onClick={copyId}
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all cursor-pointer group"
            title="Click to copy permanent Hackathon ID"
          >
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              PERMANENT ID
            </span>
            <span className="text-sm font-mono font-bold text-white tracking-wide">
              {student.hackathonId}
            </span>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-colors" />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Profile Card & Skills */}
        <div className="lg:col-span-7 space-y-6">
          {/* Identity Card */}
          <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-[#6366F1]/10 border border-[#6366F1]/30 flex items-center justify-center text-[#6366F1] font-display font-bold text-xl flex-shrink-0">
                {student.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-white tracking-tight">{student.name}</h2>
                <p className="text-xs font-mono text-slate-400">{student.email}</p>
                <div className="flex items-center gap-2 pt-1 text-xs text-slate-400">
                  <Building className="w-3.5 h-3.5 text-slate-500" />
                  <span>{student.college}</span>
                </div>
              </div>
            </div>

            {student.bio && (
              <div className="pt-4 border-t border-white/[0.06]">
                <p className="text-xs text-slate-300 leading-relaxed">{student.bio}</p>
              </div>
            )}

            {student.githubUsername && (
              <div className="flex items-center gap-2 pt-2 text-xs font-mono text-slate-400">
                <Github className="w-4 h-4 text-slate-500" />
                <a
                  href={`https://github.com/${student.githubUsername}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1 text-[#6366F1]"
                >
                  github.com/{student.githubUsername}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Skills Tags */}
            <div className="pt-4 border-t border-white/[0.06] space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                Technical Capabilities
              </span>
              <div className="flex flex-wrap gap-2">
                {skillsList.map((skill, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded bg-white/[0.04] border border-white/10 text-xs font-mono text-slate-300"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* DPDP Act Section 12 Data Export Card */}
          <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#6366F1]" />
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    DPDP Act Compliance & Data Portability
                  </h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Under Section 12 of India&apos;s Digital Personal Data Protection (DPDP) Act, 2023, you hold the right to obtain a portable, machine-readable archive of all personal data, team submissions, evaluations, and audit logs.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleDownloadExport}
                disabled={exporting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-xs font-mono font-medium text-white transition-all disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 text-[#6366F1]" />
                <span>{exporting ? "Compiling Archive..." : "Download Personal Data Archive (.json)"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Invariant Rule Status & Registration State */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active Registration Status Card */}
          <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              PRD INVARIANT RULE 1
            </div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Single Active Registration Status
            </h3>

            {student.activeRegistration ? (
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                    ACTIVE SQUAD
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    Role: {student.activeRegistration.role}
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">
                    {student.activeRegistration.hackathonTitle}
                  </h4>
                  <p className="text-xs font-mono text-slate-400">
                    Squad: {student.activeRegistration.teamName}
                  </p>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  You are actively competing in this track. Additional hackathon applications are locked until this event concludes.
                </p>

                <div className="pt-2">
                  <Link
                    href={`/hackathons/${student.activeRegistration.hackathonSlug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-[#6366F1] hover:underline"
                  >
                    <span>View arena track</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/20 space-y-2">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-400">
                    Eligible for Next Arena
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  You currently have no active lock. You can form or join a squad for any published hackathon.
                </p>
                <div className="pt-2">
                  <Link
                    href="/hackathons"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded bg-[#6366F1] hover:bg-[#4F46E5] text-white transition-colors"
                  >
                    <span>Discover Arenas</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Quick Navigation
            </span>
            <nav className="space-y-2 text-xs font-mono">
              <Link
                href="/dashboard/student"
                className="flex items-center justify-between p-2 rounded hover:bg-white/[0.04] text-slate-300 hover:text-white transition-colors"
              >
                <span>Console Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </Link>
              <Link
                href="/dashboard/student/history"
                className="flex items-center justify-between p-2 rounded hover:bg-white/[0.04] text-slate-300 hover:text-white transition-colors"
              >
                <span>Career Participation Archive</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </Link>
              <Link
                href="/privacy"
                className="flex items-center justify-between p-2 rounded hover:bg-white/[0.04] text-slate-300 hover:text-white transition-colors"
              >
                <span>Privacy & DPDP Policy</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
