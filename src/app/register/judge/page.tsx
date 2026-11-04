"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  Scale,
  Mail,
  User,
  Phone,
  Briefcase,
  Building,
  Target,
  Globe,
  Lock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Clock,
  ExternalLink,
  ChevronRight,
  Sparkles
} from "lucide-react";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";

interface HackathonOption {
  id: string;
  title: string;
  slug: string;
  hostName?: string;
}

export default function RegisterJudgePage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [designation, setDesignation] = useState("");
  const [domain, setDomain] = useState("Full Stack & Distributed Systems");
  const [experience, setExperience] = useState("5+ years");
  const [linkedin, setLinkedin] = useState("");
  const [hackathonId, setHackathonId] = useState("");

  const [availableHackathons, setAvailableHackathons] = useState<HackathonOption[]>([]);
  const [loadingHackathons, setLoadingHackathons] = useState(false);

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedDetails, setSubmittedDetails] = useState<any>(null);

  // Load published hackathons for selection
  useEffect(() => {
    setLoadingHackathons(true);
    fetch("/api/v1/hackathons?status=PUBLISHED")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.hackathons && Array.isArray(data.hackathons)) {
          const list = data.hackathons.map((h: any) => ({
            id: h.id,
            title: h.title,
            slug: h.slug,
            hostName: h.host?.orgName || "Organizer",
          }));
          setAvailableHackathons(list);
          if (list.length > 0 && !hackathonId) {
            setHackathonId(list[0].id);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingHackathons(false));
  }, []);

  const domainOptions = [
    "Full Stack & Distributed Systems",
    "Artificial Intelligence & ML",
    "Cloud Architecture & DevOps",
    "Cybersecurity & Networks",
    "Mobile & Cross-Platform",
    "Web3 & Blockchain",
    "All / General Tracks",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormError(null);

    if (!name.trim()) {
      setFormError("Full Name is required.");
      setLoading(false);
      return;
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError("Please enter a valid professional email address.");
      setLoading(false);
      return;
    }

    if (!password || password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "JUDGE",
          name: name.trim(),
          email: email.trim(),
          password,
          phone: phone.trim() || undefined,
          company: company.trim() || undefined,
          designation: designation.trim() || undefined,
          domain: domain || undefined,
          hackathonId: hackathonId.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Judge registration failed. Please check your inputs.");
        setLoading(false);
        return;
      }

      const targetTitle =
        availableHackathons.find((h) => h.id === hackathonId || h.slug === hackathonId)?.title ||
        data.user?.hackathonTitle ||
        "HackBridge Hackathon Arena";

      setSubmittedDetails({
        name,
        email,
        company: company || "Independent Expert",
        designation: designation || "Industry Evaluator",
        domain,
        targetTrack: targetTitle,
      });

      setSubmitted(true);
    } catch {
      setFormError("Server communication failed. Please check network and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex min-h-[calc(100vh-65px)] bg-transparent text-[#F8FAFC]">
      {/* LEFT BRAND & JURY HIGHLIGHT PANEL */}
      <div className="hidden lg:flex lg:w-5/12 bg-[#0B0E18]/60 backdrop-blur-md border-r border-white/[0.08] p-12 flex-col justify-between">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[11px] font-mono text-[#818CF8]">
            <Scale className="w-3.5 h-3.5 text-[#6366F1]" />
            <span className="font-bold">EVALUATION PROTOCOL · v5.0 UNIFIED RUBRIC</span>
          </div>

          <div className="space-y-2">
            <h1 className="font-display text-3xl font-extrabold text-white tracking-tight leading-snug">
              Industry Judge & Evaluator Panel Registration
            </h1>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Evaluate collegiate engineering squads on a single unified rubric across Phase 1 to Phase 4 deliverables. Inspect code repositories, system architectures, and live project demos.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2 text-xs font-mono">
              <div className="text-white font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#6366F1]" />
                <span>Single Unified Scorecard (v5.0 Architecture)</span>
              </div>
              <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                Judges navigate through participant deliverables across all 4 phases on the left, while evaluating on one persistent, unified scorecard on the right.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2 text-xs font-mono">
              <div className="text-white font-bold flex items-center gap-2">
                <Target className="w-4 h-4 text-[#818CF8]" />
                <span>Domain-Filtered Jury Assignments</span>
              </div>
              <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                You can be designated to specific technical tracks (AI/ML, Systems, Web3, Mobile) by hackathon hosts to review relevant squads.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2 text-xs font-mono">
              <div className="text-amber-300 font-bold flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Host & Admin Fast-Approval</span>
              </div>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                If admin approves, then only judges access evaluation console. For fast activation, contact admin hotline at <strong>9380968402</strong> or <strong>admin@hackbridge.dev</strong>.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-white/[0.06] text-xs font-mono text-[#64748B] flex items-center justify-between">
          <span>Already an authorized judge?</span>
          <Link
            href="/login?role=JUDGE"
            className="text-[#818CF8] hover:text-white font-bold underline transition-colors"
          >
            Sign In Here →
          </Link>
        </div>
      </div>

      {/* RIGHT REGISTRATION FORM PANEL */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-transparent">
        <div className="w-full max-w-xl space-y-6">
          {submitted ? (
            /* SUBMITTED SUCCESS CARD */
            <div className="p-8 sm:p-10 rounded-3xl bg-[#0B0E18]/80 backdrop-blur-md border border-amber-500/30 shadow-2xl space-y-6 text-center animate-fade-in font-mono">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 mx-auto flex items-center justify-center">
                <Clock className="w-8 h-8 text-amber-400 animate-pulse" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] font-bold text-amber-300">
                  <span>STATUS: WAITING FOR ADMIN APPROVAL</span>
                </div>
                <h2 className="font-display text-2xl font-extrabold text-white">
                  Judge Application Received
                </h2>
                <p className="text-xs text-[#94A3B8] max-w-md mx-auto leading-relaxed">
                  Your judge credentials have been recorded. Once host/admin activates your profile, you will have immediate clearance to review and score squad deliverables.
                </p>
              </div>

              {/* Evaluator Summary Card */}
              {submittedDetails && (
                <div className="p-4 rounded-2xl bg-[#111524]/80 border border-white/10 text-left space-y-2 text-xs">
                  <div className="flex justify-between border-b border-white/[0.06] pb-2">
                    <span className="text-[#64748B]">Evaluator Name:</span>
                    <span className="text-white font-bold">{submittedDetails.name}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.06] pb-2">
                    <span className="text-[#64748B]">Professional Email:</span>
                    <span className="text-white font-bold">{submittedDetails.email}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.06] pb-2">
                    <span className="text-[#64748B]">Organization / Company:</span>
                    <span className="text-[#818CF8] font-bold">{submittedDetails.company} ({submittedDetails.designation})</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.06] pb-2">
                    <span className="text-[#64748B]">Domain Specialization:</span>
                    <span className="text-emerald-400 font-bold">{submittedDetails.domain}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Assigned Track:</span>
                    <span className="text-white font-bold truncate max-w-[200px]">{submittedDetails.targetTrack}</span>
                  </div>
                </div>
              )}

              {/* Fast Approval Contact Actions */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-left space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
                  <Phone className="w-4 h-4 text-amber-400" />
                  <span>Contact Admin For Fast Approval</span>
                </div>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  Waiting for admin approval. Contact <a href="tel:9380968402" className="text-white font-bold underline hover:text-[#818CF8]">9380968402</a> or <a href="mailto:admin@hackbridge.dev" className="text-white font-bold underline hover:text-[#818CF8]">Admin</a> to expedite your evaluation access.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <a
                    href="tel:9380968402"
                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[10px] font-bold border border-amber-500/40 transition-colors flex items-center gap-1.5"
                  >
                    📞 Call 9380968402
                  </a>
                  <a
                    href="https://wa.me/919380968402?text=Hello%20Admin,%20my%20judge%20account%20registration%20is%20waiting%20for%20approval."
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold border border-emerald-500/40 transition-colors flex items-center gap-1.5"
                  >
                    💬 WhatsApp Admin
                  </a>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/judge")}
                  className="w-full sm:w-auto flex-1 py-3 px-6 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Enter Judge Dashboard
                </button>
                <Link
                  href="/login?role=JUDGE"
                  className="w-full sm:w-auto py-3 px-6 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white font-bold text-xs uppercase tracking-wider border border-white/10 transition-all text-center"
                >
                  Judge Sign In
                </Link>
              </div>
            </div>
          ) : (
            /* JUDGE REGISTRATION FORM */
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-[#818CF8] mb-1">
                  <Award className="w-4 h-4" />
                  <span>JURY & INDUSTRY EVALUATOR PORTAL</span>
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Register as Judge / Mentor
                </h1>
                <p className="text-xs text-[#94A3B8] mt-1 font-mono">
                  Join the certified judging jury. Review and score team deliverables across hackathon phases.
                </p>
              </div>

              {/* Google Fast Sign-in */}
              <div className="space-y-4">
                <GoogleSignInButton
                  role="JUDGE"
                  action="register"
                  label="Register as Judge with Google"
                />

                <div className="relative flex items-center justify-center">
                  <div className="border-t border-white/[0.08] w-full" />
                  <span className="bg-[#030407] px-3 text-[10px] font-mono text-[#64748B] uppercase tracking-wider shrink-0">
                    or register with professional credentials
                  </span>
                  <div className="border-t border-white/[0.08] w-full" />
                </div>
              </div>

              {formError && (
                <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-center gap-2 font-mono animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 font-mono">
                {/* Full Name & Official Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] uppercase tracking-wider text-[#94A3B8] font-bold">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Dr. Alex Rivera"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B0E18] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#6366F1] transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] uppercase tracking-wider text-[#94A3B8] font-bold">
                      Professional Email *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="alex@techcorp.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B0E18] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#6366F1] transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Password & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] uppercase tracking-wider text-[#94A3B8] font-bold">
                      Password (8+ chars) *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B0E18] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#6366F1] transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] uppercase tracking-wider text-[#94A3B8] font-bold">
                      Mobile Phone (Optional)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B0E18] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#6366F1] transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Organization & Designation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] uppercase tracking-wider text-[#94A3B8] font-bold">
                      Current Company / Institution
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Google / IISc / Microsoft"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B0E18] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#6366F1] transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] uppercase tracking-wider text-[#94A3B8] font-bold">
                      Designation / Role
                    </label>
                    <div className="relative">
                      <Briefcase className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        placeholder="Principal Architect / Professor"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B0E18] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#6366F1] transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Domain Track Specialization */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] uppercase tracking-wider text-[#94A3B8] font-bold">
                    Primary Evaluation Domain Specialization
                  </label>
                  <select
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0B0E18] border border-white/10 text-white text-xs focus:outline-none focus:border-[#6366F1] transition-colors font-mono"
                  >
                    {domainOptions.map((opt) => (
                      <option key={opt} value={opt} className="bg-[#0B0E18] text-white">
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Hackathon Track Selection */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] uppercase tracking-wider text-[#94A3B8] font-bold">
                    Target Hackathon Track (Select or Enter Code)
                  </label>
                  {availableHackathons.length > 0 ? (
                    <div className="space-y-2">
                      <select
                        value={hackathonId}
                        onChange={(e) => setHackathonId(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#0B0E18] border border-white/10 text-white text-xs focus:outline-none focus:border-[#6366F1] transition-colors font-mono"
                      >
                        {availableHackathons.map((h) => (
                          <option key={h.id} value={h.id} className="bg-[#0B0E18] text-white">
                            {h.title} (by {h.hostName})
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={hackathonId}
                        onChange={(e) => setHackathonId(e.target.value)}
                        placeholder="Or type custom Hackathon ID / Slug"
                        className="w-full px-4 py-2 rounded-xl bg-white/[0.02] border border-white/10 text-white text-xs font-mono placeholder-slate-600 focus:outline-none focus:border-[#6366F1]"
                      />
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={hackathonId}
                      onChange={(e) => setHackathonId(e.target.value)}
                      placeholder="Enter Hackathon ID or Slug (e.g. collegiate-hack-2026)"
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0B0E18] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#6366F1] transition-colors font-mono"
                    />
                  )}
                </div>

                {/* Experience & LinkedIn */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] uppercase tracking-wider text-[#94A3B8] font-bold">
                      Industry Experience
                    </label>
                    <select
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0B0E18] border border-white/10 text-white text-xs focus:outline-none focus:border-[#6366F1] transition-colors font-mono"
                    >
                      <option value="1-3 years">1 - 3 years</option>
                      <option value="3-5 years">3 - 5 years</option>
                      <option value="5-10 years">5 - 10 years</option>
                      <option value="10+ years">10+ years (Senior / Staff)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] uppercase tracking-wider text-[#94A3B8] font-bold">
                      LinkedIn / Portfolio URL (Optional)
                    </label>
                    <div className="relative">
                      <Globe className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="url"
                        value={linkedin}
                        onChange={(e) => setLinkedin(e.target.value)}
                        placeholder="https://linkedin.com/in/alexrivera"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B0E18] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#6366F1] transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-[#6366F1]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-[0.99] mt-6"
                >
                  {loading ? (
                    <span>Registering Evaluator Profile...</span>
                  ) : (
                    <>
                      <span>Complete Judge Registration</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Persona Navigation Links */}
              <div className="pt-6 border-t border-white/[0.08] space-y-3 text-xs font-mono">
                <div className="flex items-center justify-between text-[#94A3B8]">
                  <span>Are you an engineering student?</span>
                  <Link href="/signup/student" className="text-[#818CF8] hover:text-white font-bold underline">
                    Student Registration →
                  </Link>
                </div>
                <div className="flex items-center justify-between text-[#94A3B8]">
                  <span>Looking to organize a hackathon?</span>
                  <Link href="/register/college" className="text-[#818CF8] hover:text-white font-bold underline">
                    College / Host Portal →
                  </Link>
                </div>
                <div className="flex items-center justify-between text-[#94A3B8]">
                  <span>Already an approved judge?</span>
                  <Link href="/login?role=JUDGE" className="text-white hover:underline font-bold">
                    Judge Sign In
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
