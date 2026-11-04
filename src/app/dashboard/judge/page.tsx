"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { 
  Scale, 
  FileText, 
  Award, 
  Clock, 
  ExternalLink,
  Check, 
  AlertCircle, 
  RefreshCw, 
  Sliders, 
  Send,
  Phone,
  Mail,
  Target,
  GitBranch,
  Globe,
  Layers,
  Folder,
  ArrowLeft,
  Download,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  FileCheck,
  Building2,
  Users,
  ChevronRight,
  ShieldCheck,
  Briefcase,
  Calendar,
  Sparkles,
  BookOpen,
  Activity,
  LogOut
} from "lucide-react";

interface RubricCriterion {
  id: string;
  name: string;
  weight: number;
  maxScore: number;
}

interface PhaseUpload {
  fileName: string;
  fileSize: number;
  fileType: string | null;
  fileUrl: string;
  version: number;
  uploaderName: string;
  createdAt: string | null;
}

interface PhaseItem {
  stage: number;
  name: string;
  title: string;
  hasUpload: boolean;
  latestUpload: PhaseUpload | null;
  allUploads?: any[];
}

interface TeamJudgeItem {
  id: string;
  teamId: string;
  submissionId: string | null;
  description: string;
  submittedAt: string;
  locked: boolean;
  link?: string | null;
  fileUrl?: string | null;
  team: {
    id: string;
    teamId: string | null;
    name: string;
    status: string;
    college: string;
    domain?: { id: string; name: string; description?: string | null } | null;
    problemStatement?: {
      id?: string;
      title: string;
      description?: string | null;
      code?: string | null;
      domain?: { name: string } | null;
    } | null;
    codeRepo?: { githubRepoUrl: string } | null;
    leadStudent: { user: { name: string; email: string; phone?: string | null } };
    members?: Array<{ student: { user: { name: string; email?: string } } }>;
    progressPercent: number;
    lastProgressUpdate?: string | null;
  };
  phases: PhaseItem[];
  scores: Array<{
    id: string;
    criterionId: string;
    score: number;
    notes?: string | null;
    isDraft?: boolean;
  }>;
  isScored: boolean;
  isDraftSaved?: boolean;
  isFinalCertified?: boolean;
}

interface AssignedHackathon {
  id: string;
  title: string;
  slug: string;
  hostName: string;
  hostType: string;
  domain: string;
  approvalStatus: string;
  startAt: string;
  endAt: string;
  status: string;
  teamCount: number;
  isCurrent: boolean;
}

function JudgeDashboardContent() {
  const searchParams = useSearchParams();
  const queryTab = searchParams?.get("tab");

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"queue" | "assigned" | "history" | "rubric" | "profile">("queue");

  const [submissions, setSubmissions] = useState<TeamJudgeItem[]>([]);
  const [criteria, setCriteria] = useState<RubricCriterion[]>([]);
  const [hackathon, setHackathon] = useState<any>(null);
  const [approvalStatus, setApprovalStatus] = useState<string>("PENDING");
  const [assignedDomain, setAssignedDomain] = useState<string | null>(null);
  const [judgeProfile, setJudgeProfile] = useState<any>(null);
  const [assignedHackathons, setAssignedHackathons] = useState<AssignedHackathon[]>([]);
  const [fetching, setFetching] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDomain, setSelectedDomain] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "SCORED" | "UNSCORED">("ALL");

  // Selected Team for Phase Document Review & Scoring View
  const [selectedTeam, setSelectedTeam] = useState<TeamJudgeItem | null>(null);
  const [activePhase, setActivePhase] = useState<number>(1);
  const [viewedPhases, setViewedPhases] = useState<number[]>([1]);

  // Scoring inputs
  const [scoreInputs, setScoreInputs] = useState<Record<string, { score: number | string; notes: string }>>({});
  const [overallFeedback, setOverallFeedback] = useState("");
  const [savingScore, setSavingScore] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  // Sync tab with URL query parameter
  useEffect(() => {
    if (queryTab) {
      if (queryTab === "assigned") setActiveTab("assigned");
      else if (queryTab === "scoring" || queryTab === "queue") setActiveTab("queue");
      else if (queryTab === "history" || queryTab === "evaluated") setActiveTab("history");
      else if (queryTab === "rubric") setActiveTab("rubric");
      else if (queryTab === "profile") setActiveTab("profile");
    }
  }, [queryTab]);

  // Load data
  const loadData = useCallback(async (hackathonIdOverride?: string) => {
    setFetching(true);
    try {
      const url = hackathonIdOverride
        ? `/api/v1/judge/submissions?hackathonId=${hackathonIdOverride}`
        : "/api/v1/judge/submissions";

      const [meRes, subRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch(url),
      ]);

      if (meRes.ok) {
        const d = await meRes.json();
        if (d?.user) setSession(d.user);
      }

      if (subRes.ok) {
        const subData = await subRes.json();
        setSubmissions(subData.submissions || []);
        setCriteria(subData.criteria || []);
        setHackathon(subData.hackathon || null);
        setApprovalStatus(subData.approvalStatus || "APPROVED");
        setAssignedDomain(subData.assignedDomain || null);
        setJudgeProfile(subData.judgeProfile || null);
        setAssignedHackathons(subData.assignedHackathons || []);

        if (subData.assignedDomain) {
          setSelectedDomain(subData.assignedDomain);
        }

        // Keep selectedTeam synced with updated data
        if (selectedTeam) {
          const fresh = (subData.submissions || []).find((s: TeamJudgeItem) => s.teamId === selectedTeam.teamId);
          if (fresh) setSelectedTeam(fresh);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, [selectedTeam]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Extract unique domains
  const availableDomains = useMemo(() => {
    const set = new Set<string>();
    for (const item of submissions) {
      const dName = item.team.domain?.name || item.team.problemStatement?.domain?.name;
      if (dName) set.add(dName);
    }
    return Array.from(set).sort();
  }, [submissions]);

  // Filtered teams list
  const filteredTeams = useMemo(() => {
    return submissions.filter((item) => {
      // Domain filter
      const dName = item.team.domain?.name || item.team.problemStatement?.domain?.name || "";
      if (selectedDomain !== "ALL" && dName.toLowerCase() !== selectedDomain.toLowerCase()) {
        return false;
      }

      // Status filter
      if (statusFilter === "SCORED" && !item.isScored) return false;
      if (statusFilter === "UNSCORED" && item.isScored) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const tName = item.team.name.toLowerCase();
        const tId = (item.team.teamId || "").toLowerCase();
        const col = (item.team.college || "").toLowerCase();
        const lead = (item.team.leadStudent?.user?.name || "").toLowerCase();
        const ps = (item.team.problemStatement?.title || "").toLowerCase();
        return (
          tName.includes(q) ||
          tId.includes(q) ||
          col.includes(q) ||
          lead.includes(q) ||
          ps.includes(q)
        );
      }

      return true;
    });
  }, [submissions, selectedDomain, statusFilter, searchQuery]);

  // Evaluated teams for history tab
  const evaluatedTeams = useMemo(() => {
    return submissions.filter((s) => s.isScored || s.isDraftSaved);
  }, [submissions]);

  // Open evaluation & document review for a team
  const openEvaluation = (teamItem: TeamJudgeItem, initialPhase = 1) => {
    setSelectedTeam(teamItem);
    setActivePhase(initialPhase);
    setViewedPhases([initialPhase]);
    setActionMsg(null);
    setActionErr(null);

    const initial: Record<string, { score: number | string; notes: string }> = {};
    for (const c of criteria) {
      const existing = teamItem.scores?.find((s) => s.criterionId === c.id);
      initial[c.id] = {
        score: existing ? existing.score : "",
        notes: existing?.notes ?? "",
      };
    }
    setScoreInputs(initial);
    setOverallFeedback(teamItem.description || "");
  };

  // Switch deliverable phase while keeping single unified rubric scorecard intact
  const selectPhase = (stage: number) => {
    setActivePhase(stage);
    setViewedPhases((prev) => (prev.includes(stage) ? prev : [...prev, stage]));
  };

  // Live total score computation
  const liveTotalScore = useMemo(() => {
    let sum = 0;
    for (const c of criteria) {
      const input = scoreInputs[c.id];
      const val = input && input.score !== "" ? Number(input.score) : 0;
      if (!isNaN(val)) sum += val;
    }
    return sum;
  }, [criteria, scoreInputs]);

  const maxTotalScore = useMemo(() => {
    return criteria.reduce((sum, c) => sum + c.maxScore, 0);
  }, [criteria]);

  // Save partial / draft rubric scores
  const handleSaveDraft = async () => {
    if (!selectedTeam) return;

    setSavingDraft(true);
    setActionErr(null);
    setActionMsg(null);

    const scoresPayload: Array<{ criterionId: string; score: number; notes?: string }> = [];
    for (const c of criteria) {
      const input = scoreInputs[c.id];
      if (input && input.score !== "" && input.score !== null && input.score !== undefined) {
        const val = Number(input.score);
        if (isNaN(val)) {
          setActionErr(`Invalid marks for "${c.name}". Please enter a valid number.`);
          setSavingDraft(false);
          return;
        }
        if (val < 0 || val > c.maxScore) {
          setActionErr(`Marks for "${c.name}" must be between 0 and ${c.maxScore} marks.`);
          setSavingDraft(false);
          return;
        }
        scoresPayload.push({
          criterionId: c.id,
          score: val,
          notes: input.notes?.trim() || undefined,
        });
      }
    }

    if (scoresPayload.length === 0) {
      setActionErr("Please enter at least one criterion mark to save draft.");
      setSavingDraft(false);
      return;
    }

    try {
      const res = await fetch("/api/v1/judge/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: selectedTeam.team.id,
          submissionId: selectedTeam.submissionId,
          scores: scoresPayload,
          feedback: overallFeedback.trim() || undefined,
          isDraft: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionErr(data.error || "Failed to save draft scores");
        return;
      }

      setActionMsg(`✓ Draft marks saved for squad ${selectedTeam.team.name}! Old data updated. Scores remain confidential to evaluators.`);
      loadData();
      setTimeout(() => setActionMsg(null), 6000);
    } catch {
      setActionErr("Network error saving draft scores");
    } finally {
      setSavingDraft(false);
    }
  };

  // Submit final certified scores
  const handleSubmitScores = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) return;

    setSavingScore(true);
    setActionErr(null);
    setActionMsg(null);

    // Validate inputs
    const scoresPayload: Array<{ criterionId: string; score: number; notes?: string }> = [];
    for (const c of criteria) {
      const input = scoreInputs[c.id];
      const val = input && input.score !== "" ? Number(input.score) : null;
      if (val === null || isNaN(val)) {
        setActionErr(`Final submission requires marks for "${c.name}" (Out of ${c.maxScore} marks). Or click "Save Draft" to save partial progress.`);
        setSavingScore(false);
        return;
      }
      if (val < 0 || val > c.maxScore) {
        setActionErr(`Marks for "${c.name}" must be between 0 and ${c.maxScore} marks.`);
        setSavingScore(false);
        return;
      }
      scoresPayload.push({
        criterionId: c.id,
        score: val,
        notes: input.notes?.trim() || undefined,
      });
    }

    try {
      const res = await fetch("/api/v1/judge/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: selectedTeam.team.id,
          submissionId: selectedTeam.submissionId,
          scores: scoresPayload,
          feedback: overallFeedback.trim() || undefined,
          isDraft: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionErr(data.error || "Failed to submit scores");
        return;
      }

      setActionMsg(`✓ Final scores certified successfully for squad ${selectedTeam.team.name}!`);
      loadData();
      setTimeout(() => setActionMsg(null), 6000);
    } catch {
      setActionErr("Network error submitting scores");
    } finally {
      setSavingScore(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 bg-transparent">
        <div className="h-64 rounded-3xl bg-[#0B0E18]/70 border border-white/[0.08] animate-pulse" />
      </div>
    );
  }

  if (!session || (session.role !== "JUDGE" && session.role !== "SUPER_ADMIN")) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[60vh] font-mono bg-transparent">
        <div className="w-12 h-12 rounded-2xl bg-[#0B0E18]/70 border border-white/[0.08] shadow-sm flex items-center justify-center mb-4">
          <Scale className="w-6 h-6 text-[#6366F1]" />
        </div>
        <h1 className="font-display text-xl font-extrabold text-[#F8FAFC] mb-2 tracking-tight">Judge Credentials Required</h1>
        <p className="text-sm text-[#94A3B8] mb-6 max-w-sm">Please authenticate with an authorized Judge panel account.</p>
        <Link href="/login?role=JUDGE" className="px-5 py-2.5 rounded-xl bg-[#6366F1] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#4F46E5] shadow-sm transition-all">
          Judge Sign In
        </Link>
      </div>
    );
  }

  const isApproved = approvalStatus === "APPROVED";
  const hackathonTitle = hackathon?.title || "Assigned Arena Track";

  // Gatekeeper: If judge is not approved
  if (!isApproved) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 min-h-[70vh] bg-transparent text-[#F8FAFC] font-mono">
        <div className="max-w-xl w-full p-8 sm:p-10 rounded-3xl bg-[#0B0E18]/70 backdrop-blur-md border border-amber-500/30 shadow-2xl space-y-6 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 font-bold">
              <span>STATUS: WAITING FOR ADMIN APPROVAL</span>
            </div>
            <h1 className="font-display text-2xl font-extrabold text-[#F8FAFC]">
              Waiting for Admin Approval
            </h1>
            <p className="text-sm text-[#94A3B8] leading-relaxed max-w-md mx-auto">
              If admin approves, then only you can access evaluation materials and score hackathon submissions.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-left space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
              <Phone className="w-4 h-4 text-amber-400" />
              <span>Contact Admin For Fast Approval</span>
            </div>
            <p className="text-xs text-amber-200/90 leading-relaxed">
              Waiting for admin approval. Contact <a href="tel:9380968402" className="text-white font-bold underline hover:text-[#818CF8]">9380968402</a> Or <a href="mailto:admin@hackbridge.dev" className="text-white font-bold underline hover:text-[#818CF8]">Admin</a> to activate your evaluation access.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => loadData()}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${fetching ? "animate-spin" : ""}`} />
              Check Approval Status
            </button>
            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white font-semibold text-xs uppercase tracking-wider transition-colors text-center"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Active Phase Upload item for Selected Team
  const currentPhaseData = selectedTeam
    ? selectedTeam.phases.find((p) => p.stage === activePhase) || selectedTeam.phases[0]
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full space-y-8 font-mono bg-transparent text-[#F8FAFC]">
      {/* Header Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-white/[0.08] gap-4">
        <div className="space-y-1">
          <div className="text-[11px] text-[#64748B] uppercase tracking-wider flex items-center gap-2">
            <span>HackBridge</span>
            <span>/</span>
            <span>Evaluation Panel</span>
            <span>/</span>
            <span className="text-[#6366F1] font-bold">{hackathonTitle}</span>
          </div>
          <h1 className="font-display text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
            Judge: {session.name}
          </h1>
          <p className="text-sm text-[#94A3B8]">
            {session.email} · Assigned Arena: <strong className="text-white">{hackathonTitle}</strong> ({submissions.length} Total Registered Squads)
          </p>
          {assignedDomain && (
            <div className="pt-1.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#6366F1]/15 border border-[#6366F1]/30 text-xs font-mono text-[#818CF8] font-bold">
                <Target className="w-3.5 h-3.5 text-[#818CF8]" />
                <span>Host-Assigned Domain:</span>
                <span className="text-white underline underline-offset-2">{assignedDomain}</span>
                <span className="text-[10px] text-emerald-400 font-semibold">(Domain-Filtered)</span>
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            className="p-2.5 rounded-xl bg-[#0B0E18]/70 border border-white/[0.08] shadow-sm text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#111524] transition-colors"
            title="Refresh cohort submissions"
          >
            <RefreshCw className={`w-4 h-4 ${fetching ? "animate-spin" : ""}`} />
          </button>
          <span className="px-3.5 py-1.5 rounded-full text-[11px] font-extrabold border bg-emerald-500/10 text-emerald-400 border-emerald-500/30 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>JURY ACTIVE · APPROVED</span>
          </span>
        </div>
      </div>

      {actionMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2.5 font-bold shadow-lg animate-fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{actionMsg}</span>
        </div>
      )}

      {actionErr && (
        <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 flex items-center gap-2.5 font-bold shadow-lg animate-fade-in">
          <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{actionErr}</span>
        </div>
      )}

      {/* TOP NAVIGATION TABS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.08] pb-3 text-xs">
        <button
          onClick={() => {
            setActiveTab("queue");
            setSelectedTeam(null);
          }}
          className={`px-4 py-2.5 rounded-xl font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === "queue"
              ? "bg-[#6366F1] text-white shadow-lg shadow-[#6366F1]/20"
              : "bg-white/[0.04] text-[#94A3B8] hover:text-white hover:bg-white/[0.08]"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Evaluation Queue</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20">
            {submissions.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab("assigned");
            setSelectedTeam(null);
          }}
          className={`px-4 py-2.5 rounded-xl font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === "assigned"
              ? "bg-[#6366F1] text-white shadow-lg shadow-[#6366F1]/20"
              : "bg-white/[0.04] text-[#94A3B8] hover:text-white hover:bg-white/[0.08]"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Assigned Arenas</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20">
            {assignedHackathons.length || 1}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab("history");
            setSelectedTeam(null);
          }}
          className={`px-4 py-2.5 rounded-xl font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === "history"
              ? "bg-[#6366F1] text-white shadow-lg shadow-[#6366F1]/20"
              : "bg-white/[0.04] text-[#94A3B8] hover:text-white hover:bg-white/[0.08]"
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Evaluation History</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20">
            {evaluatedTeams.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab("rubric");
            setSelectedTeam(null);
          }}
          className={`px-4 py-2.5 rounded-xl font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === "rubric"
              ? "bg-[#6366F1] text-white shadow-lg shadow-[#6366F1]/20"
              : "bg-white/[0.04] text-[#94A3B8] hover:text-white hover:bg-white/[0.08]"
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Rubric Guide</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20">
            {criteria.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab("profile");
            setSelectedTeam(null);
          }}
          className={`px-4 py-2.5 rounded-xl font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === "profile"
              ? "bg-[#6366F1] text-white shadow-lg shadow-[#6366F1]/20"
              : "bg-white/[0.04] text-[#94A3B8] hover:text-white hover:bg-white/[0.08]"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Evaluator Profile</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: EVALUATION QUEUE */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === "queue" && (
        <>
          {selectedTeam ? (
            /* TEAM EVALUATION VIEW (When a team is selected) */
            <div className="space-y-6 animate-fade-in">
              {/* Back button and squad header */}
              <div className="p-6 rounded-3xl bg-[#0B0E18]/80 backdrop-blur-md border border-white/[0.12] shadow-2xl space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedTeam(null)}
                      className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs text-[#94A3B8] hover:text-white transition-all flex items-center gap-2 font-bold"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to Cohort Queue</span>
                    </button>
                    <div className="h-4 w-px bg-white/10" />
                    <span className="text-xs text-[#64748B]">Reviewing Squad:</span>
                    <span className="text-base font-extrabold text-white">{selectedTeam.team.name}</span>
                    {selectedTeam.team.teamId && (
                      <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/30">
                        {selectedTeam.team.teamId}
                      </span>
                    )}
                  </div>

                  {/* Score status badge */}
                  <div className="flex items-center gap-3">
                    {selectedTeam.isFinalCertified ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 font-mono">
                        <Check className="w-3.5 h-3.5" />
                        <span>Certified ({selectedTeam.scores.reduce((s, c) => s + c.score, 0)} / {maxTotalScore} pts)</span>
                      </span>
                    ) : selectedTeam.isDraftSaved ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1.5 font-mono">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Draft Saved ({selectedTeam.scores.reduce((s, c) => s + c.score, 0)} pts)</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono">
                        Awaiting Evaluation
                      </span>
                    )}
                  </div>
                </div>

                {/* Squad details grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                    <span className="text-[10px] text-[#64748B] uppercase font-bold">Domain & Track</span>
                    <div className="font-extrabold text-[#818CF8] flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-[#6366F1]" />
                      <span>{selectedTeam.team.domain?.name || "Open Domain"}</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                    <span className="text-[10px] text-[#64748B] uppercase font-bold">Institution / College</span>
                    <div className="font-bold text-white truncate" title={selectedTeam.team.college}>
                      {selectedTeam.team.college}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                    <span className="text-[10px] text-[#64748B] uppercase font-bold">Team Lead & Contact</span>
                    <div className="font-bold text-white truncate">
                      {selectedTeam.team.leadStudent?.user?.name || "Lead"}
                    </div>
                    <div className="text-[10px] text-[#94A3B8] truncate">
                      {selectedTeam.team.leadStudent?.user?.email}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                    <span className="text-[10px] text-[#64748B] uppercase font-bold">Sprint Progress</span>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-white/[0.06] rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-[#6366F1] to-emerald-400 h-full rounded-full transition-all"
                          style={{ width: `${selectedTeam.team.progressPercent}%` }}
                        />
                      </div>
                      <span className="font-bold text-white font-mono">{selectedTeam.team.progressPercent}%</span>
                    </div>
                  </div>
                </div>

                {/* Problem Statement Card */}
                {selectedTeam.team.problemStatement && (
                  <div className="p-4 rounded-2xl bg-[#111524]/60 border border-white/[0.08] flex items-start gap-3">
                    <Target className="w-5 h-5 text-[#6366F1] shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-[#6366F1]">Selected Problem Statement</span>
                        {selectedTeam.team.problemStatement.code && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#6366F1]/20 text-[#818CF8]">
                            {selectedTeam.team.problemStatement.code}
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-extrabold text-white">
                        {selectedTeam.team.problemStatement.title}
                      </div>
                      {selectedTeam.team.problemStatement.description && (
                        <p className="text-xs text-[#94A3B8] leading-relaxed line-clamp-2">
                          {selectedTeam.team.problemStatement.description}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* v5.0 ARCHITECTURE POLICY BANNER: SINGLE UNIFIED RUBRIC FOR ALL PHASES */}
              <div className="p-4 rounded-2xl bg-[#6366F1]/10 border border-[#6366F1]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-md">
                <div className="flex items-center gap-2.5 text-[#818CF8] font-bold">
                  <Scale className="w-4 h-4 text-[#6366F1] shrink-0" />
                  <span>v5.0 Unified Evaluation Policy: Single Rubric for All Phases</span>
                </div>
                <div className="text-[11px] text-[#CBD5E1] flex items-center gap-2">
                  <span>Judges navigate through Phase 1 to Phase 4 deliverables on the left; all phases are scored on this single unified scorecard on the right.</span>
                </div>
              </div>

              {/* PHASE-1 THROUGH PHASE-4 BUTTON DISPLAY */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-extrabold text-[#F8FAFC] tracking-tight uppercase flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#6366F1]" />
                      <span>Deliverables Navigation (Phase 1 – Phase 4)</span>
                    </h2>
                    <span className="text-[11px] text-[#64748B]">Click any phase button to inspect documentation · Your rubric scores on the right remain persistent</span>
                  </div>

                  {/* Inspected Phases Tracker */}
                  <div className="flex items-center gap-1.5 text-[11px] text-[#94A3B8] font-mono">
                    <span className="text-[#64748B]">Inspected:</span>
                    {[1, 2, 3, 4].map((stage) => (
                      <span
                        key={stage}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          viewedPhases.includes(stage)
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-white/[0.04] text-[#64748B] border border-white/[0.08]"
                        }`}
                      >
                        P{stage} {viewedPhases.includes(stage) ? "✓" : ""}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Segmented Phase Buttons */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {selectedTeam.phases.map((phase) => {
                    const isSelected = activePhase === phase.stage;
                    return (
                      <button
                        key={phase.stage}
                        onClick={() => selectPhase(phase.stage)}
                        className={`p-4 rounded-2xl text-left border transition-all flex flex-col justify-between gap-3 relative overflow-hidden ${
                          isSelected
                            ? "bg-[#6366F1]/15 border-[#6366F1] shadow-lg shadow-[#6366F1]/10 text-white"
                            : "bg-[#0B0E18]/70 border-white/[0.08] hover:border-white/20 text-[#94A3B8] hover:text-white"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-0 left-0 right-0 h-1 bg-[#6366F1]" />
                        )}

                        <div className="flex items-center justify-between gap-2 w-full">
                          <span className="text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5">
                            <span>{phase.name}</span>
                            {viewedPhases.includes(phase.stage) && (
                              <span className="text-[10px] text-emerald-400">✓</span>
                            )}
                          </span>
                          {phase.hasUpload ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <Check className="w-2.5 h-2.5" />
                              <span>Uploaded (v{phase.latestUpload?.version || 1})</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/[0.04] text-[#64748B] border border-white/[0.08]">
                              Pending
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="text-xs font-extrabold text-white truncate">
                            {phase.title}
                          </div>
                          <div className="text-[11px] text-[#64748B] truncate mt-0.5">
                            {phase.hasUpload ? phase.latestUpload?.fileName : "No file uploaded yet"}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TWO-COLUMN LAYOUT: DOCUMENT PREVIEW (LEFT) + RUBRICS & MARKS ENTRY (RIGHT) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT: DOCUMENT PREVIEW CONTAINER */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="p-6 rounded-3xl bg-[#0B0E18]/80 backdrop-blur-md border border-white/[0.12] shadow-2xl space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
                      <div>
                        <span className="text-[10px] text-[#64748B] uppercase font-bold">
                          Viewing Deliverable
                        </span>
                        <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                          <FileCheck className="w-4 h-4 text-[#6366F1]" />
                          <span>{currentPhaseData?.name}: {currentPhaseData?.title}</span>
                        </h3>
                      </div>

                      {currentPhaseData?.hasUpload && currentPhaseData.latestUpload && (
                        <div className="flex items-center gap-2">
                          <a
                            href={currentPhaseData.latestUpload.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-[#6366F1]/20 hover:bg-[#6366F1]/30 border border-[#6366F1]/40 text-[#818CF8] text-xs font-bold transition-all flex items-center gap-1.5"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Fullscreen</span>
                          </a>
                          <a
                            href={currentPhaseData.latestUpload.fileUrl}
                            download
                            className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Upload metadata bar */}
                    {currentPhaseData?.hasUpload && currentPhaseData.latestUpload ? (
                      <div className="space-y-4">
                        <div className="p-3.5 rounded-2xl bg-[#111524]/60 border border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px] uppercase">
                              {currentPhaseData.latestUpload.fileType || "DOCUMENT"}
                            </span>
                            <span className="font-bold text-white truncate max-w-[200px] sm:max-w-xs">
                              {currentPhaseData.latestUpload.fileName}
                            </span>
                            <span className="text-[#64748B]">
                              ({Math.round(currentPhaseData.latestUpload.fileSize / 1024)} KB)
                            </span>
                          </div>
                          <div className="text-[11px] text-[#94A3B8]">
                            Uploaded by <strong className="text-white">{currentPhaseData.latestUpload.uploaderName}</strong>
                            {currentPhaseData.latestUpload.createdAt && (
                              <span> · {new Date(currentPhaseData.latestUpload.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            )}
                          </div>
                        </div>

                        {/* Interactive Embedded Previewer */}
                        <div className="rounded-2xl border border-white/10 overflow-hidden bg-black/60 relative">
                          {currentPhaseData.latestUpload.fileName.toLowerCase().endsWith(".pdf") ? (
                            <iframe
                              src={`${currentPhaseData.latestUpload.fileUrl}#toolbar=0`}
                              className="w-full h-[540px] border-0"
                              title="Phase Document PDF Preview"
                            />
                          ) : currentPhaseData.latestUpload.fileName.toLowerCase().match(/\.(jpg|jpeg|png|webp|svg)$/) ? (
                            <div className="p-6 flex items-center justify-center min-h-[400px]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={currentPhaseData.latestUpload.fileUrl}
                                alt={currentPhaseData.latestUpload.fileName}
                                className="max-h-[500px] max-w-full rounded-xl object-contain border border-white/10"
                              />
                            </div>
                          ) : (
                            <div className="p-12 text-center space-y-4">
                              <div className="w-16 h-16 rounded-2xl bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center mx-auto text-[#818CF8]">
                                <FileText className="w-8 h-8" />
                              </div>
                              <div className="space-y-1">
                                <h4 className="text-base font-extrabold text-white">
                                  {currentPhaseData.latestUpload.fileName}
                                </h4>
                                <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
                                  This file is available in the team archive. Click below to inspect or download the original file.
                                </p>
                              </div>
                              <a
                                href={currentPhaseData.latestUpload.fileUrl}
                                download
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold text-xs uppercase tracking-wider transition-all"
                              >
                                <Download className="w-4 h-4" />
                                <span>Download {currentPhaseData.latestUpload.fileName}</span>
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Empty state when no document is uploaded for this phase */
                      <div className="py-16 px-6 text-center rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-[#64748B]">
                          <Clock className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-extrabold text-white">
                            {currentPhaseData?.name} Documentation Not Yet Uploaded
                          </h4>
                          <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                            Squad {selectedTeam.team.name} has not submitted documentation for {currentPhaseData?.title}.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Step-through Phase Navigation in Document Viewer */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.08] text-xs">
                      <button
                        type="button"
                        disabled={activePhase <= 1}
                        onClick={() => selectPhase(activePhase - 1)}
                        className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[#94A3B8] hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1.5 font-bold"
                      >
                        <span>← Previous (Phase {activePhase - 1})</span>
                      </button>

                      <div className="text-[11px] text-[#64748B] font-mono">
                        Deliverable {activePhase} of 4
                      </div>

                      <button
                        type="button"
                        disabled={activePhase >= 4}
                        onClick={() => selectPhase(activePhase + 1)}
                        className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[#94A3B8] hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1.5 font-bold"
                      >
                        <span>Next (Phase {activePhase + 1}) →</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* RIGHT: RUBRICS & MARKS ENTRY SECTION */}
                <div className="lg:col-span-5 space-y-4">
                  <form onSubmit={handleSubmitScores} className="p-6 rounded-3xl bg-[#0B0E18]/80 backdrop-blur-md border border-white/[0.12] shadow-2xl space-y-5">
                    <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[#64748B] uppercase font-bold">Jury Evaluation</span>
                          <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/30 uppercase tracking-wider">
                            Single Unified Rubric
                          </span>
                        </div>
                        <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                          <Award className="w-4 h-4 text-[#6366F1]" />
                          <span>Rubric Criteria & Marks</span>
                        </h3>
                      </div>

                      {/* Dynamic Score Total Counter */}
                      <div className="px-3 py-1.5 rounded-2xl bg-[#6366F1]/15 border border-[#6366F1]/30 text-right">
                        <span className="text-[10px] text-[#818CF8] uppercase font-bold block">Certified Total</span>
                        <span className="text-base font-extrabold text-white font-mono">
                          {liveTotalScore} <span className="text-xs text-[#94A3B8]">/ {maxTotalScore}</span>
                        </span>
                      </div>
                    </div>

                    {/* Unified Rubric Guidance Banner */}
                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-white">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                        <span>Single Rubric for All Phases (v5.0 Architecture)</span>
                      </div>
                      <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                        Judges navigate deliverables (Phase 1 → Phase 4) on the left. All phases are evaluated together on this single unified scorecard. Entered marks and comments persist across phase switching.
                      </p>
                    </div>

                    {/* Rubric Criteria List with Explicit "Out of X Marks" display */}
                    <div className="space-y-4">
                      {criteria.map((criterion) => {
                        const input = scoreInputs[criterion.id] || { score: "", notes: "" };
                        const numVal = input.score !== "" ? Number(input.score) : null;
                        const isOver = numVal !== null && numVal > criterion.maxScore;

                        return (
                          <div
                            key={criterion.id}
                            className={`p-4 rounded-2xl border transition-all space-y-3 ${
                              isOver
                                ? "bg-red-500/10 border-red-500/40"
                                : "bg-[#111524]/60 border-white/[0.08] hover:border-white/20"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-0.5">
                                <span className="text-xs font-extrabold text-white block">
                                  {criterion.name}
                                </span>
                                <span className="text-[11px] text-[#64748B]">
                                  Maximum Marks: <strong className="text-[#818CF8]">{criterion.maxScore} marks</strong>
                                </span>
                              </div>

                              {/* OUT OF HOW MUCH MARKS BADGE */}
                              <span className="px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold bg-white/[0.06] text-white border border-white/10 shrink-0">
                                Max: {criterion.maxScore}
                              </span>
                            </div>

                            {/* Marks Input Box */}
                            <div className="space-y-1">
                              <label className="text-[11px] text-[#94A3B8] font-bold block">
                                Awarded Marks (Out of {criterion.maxScore}):
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  max={criterion.maxScore}
                                  step="0.5"
                                  value={input.score}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setScoreInputs((prev) => ({
                                      ...prev,
                                      [criterion.id]: {
                                        ...prev[criterion.id],
                                        score: val,
                                        notes: prev[criterion.id]?.notes || "",
                                      },
                                    }));
                                  }}
                                  placeholder={`0 - ${criterion.maxScore}`}
                                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-[#6366F1] transition-colors"
                                />
                                <span className="text-xs font-mono font-bold text-[#64748B] shrink-0">
                                  / {criterion.maxScore}
                                </span>
                              </div>

                              {isOver && (
                                <span className="text-[11px] text-red-400 font-bold block">
                                  ⚠️ Marks cannot exceed {criterion.maxScore} marks!
                                </span>
                              )}
                            </div>

                            {/* Criterion Notes / Feedback */}
                            <div>
                              <input
                                type="text"
                                value={input.notes}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setScoreInputs((prev) => ({
                                    ...prev,
                                    [criterion.id]: {
                                      ...prev[criterion.id],
                                      score: prev[criterion.id]?.score ?? "",
                                      notes: val,
                                    },
                                  }));
                                }}
                                placeholder="Specific feedback or notes for this criteria..."
                                className="w-full px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[11px] text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-white/20 transition-colors"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Overall Feedback */}
                    <div className="space-y-1.5 pt-2">
                      <label className="text-xs font-bold text-white block">
                        Overall Jury Remarks & Strengths:
                      </label>
                      <textarea
                        rows={3}
                        value={overallFeedback}
                        onChange={(e) => setOverallFeedback(e.target.value)}
                        placeholder="Provide constructive feedback, key highlights, or recommendations for this squad..."
                        className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#6366F1] transition-colors"
                      />
                    </div>

                    {/* Submit & Draft Action Buttons */}
                    <div className="pt-3 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          disabled={savingDraft || savingScore}
                          onClick={handleSaveDraft}
                          className="w-full py-3.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-[#6366F1]/40 text-[#818CF8] font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm active:scale-[0.99]"
                        >
                          {savingDraft ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-[#818CF8]" />
                          ) : (
                            <FileCheck className="w-4 h-4 text-[#818CF8]" />
                          )}
                          <span>Save Draft (In-Progress)</span>
                        </button>

                        <button
                          type="submit"
                          disabled={savingScore || savingDraft}
                          onClick={handleSubmitScores}
                          className="w-full py-3.5 rounded-2xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-[#6366F1]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-[0.99]"
                        >
                          {savingScore ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          <span>Certify & Submit Final</span>
                        </button>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-[#111524]/80 border border-white/[0.08] text-[11px] text-[#94A3B8] flex items-center gap-2 font-mono">
                        <span className="text-emerald-400 font-bold shrink-0">🔒 Privacy Protocol:</span>
                        <span>Draft marks remain completely hidden from students until final certification and host publication.</span>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            /* SQUAD COHORT LIST (DEFAULT QUEUE VIEW) */
            <div className="space-y-6">
              {/* KPI STAT CARDS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-[#0B0E18]/70 border border-white/[0.08] space-y-1">
                  <span className="text-[10px] text-[#64748B] uppercase font-bold">Total Assigned</span>
                  <div className="text-2xl font-black text-white font-mono">{submissions.length}</div>
                  <span className="text-[10px] text-[#94A3B8]">Registered squads</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#0B0E18]/70 border border-emerald-500/20 space-y-1">
                  <span className="text-[10px] text-emerald-400 uppercase font-bold">Certified Evaluated</span>
                  <div className="text-2xl font-black text-emerald-400 font-mono">
                    {submissions.filter((s) => s.isFinalCertified).length}
                  </div>
                  <span className="text-[10px] text-[#94A3B8]">Final scores submitted</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#0B0E18]/70 border border-blue-500/20 space-y-1">
                  <span className="text-[10px] text-blue-400 uppercase font-bold">Drafts Saved</span>
                  <div className="text-2xl font-black text-blue-400 font-mono">
                    {submissions.filter((s) => s.isDraftSaved && !s.isFinalCertified).length}
                  </div>
                  <span className="text-[10px] text-[#94A3B8]">In-progress evaluations</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#0B0E18]/70 border border-amber-500/20 space-y-1">
                  <span className="text-[10px] text-amber-400 uppercase font-bold">Awaiting Evaluation</span>
                  <div className="text-2xl font-black text-amber-400 font-mono">
                    {submissions.filter((s) => !s.isScored && !s.isDraftSaved).length}
                  </div>
                  <span className="text-[10px] text-[#94A3B8]">Pending grading</span>
                </div>
              </div>

              {/* Filter Bar & Search */}
              <div className="p-5 rounded-3xl bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  {/* Search Bar */}
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search squad, ID, college, lead..."
                      className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#6366F1] transition-colors font-mono"
                    />
                  </div>

                  {/* Status Filter */}
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
                    <button
                      onClick={() => setStatusFilter("ALL")}
                      className={`px-3 py-1 rounded-lg font-bold transition-all ${
                        statusFilter === "ALL"
                          ? "bg-[#6366F1] text-white"
                          : "text-[#94A3B8] hover:text-white"
                      }`}
                    >
                      All ({submissions.length})
                    </button>
                    <button
                      onClick={() => setStatusFilter("UNSCORED")}
                      className={`px-3 py-1 rounded-lg font-bold transition-all ${
                        statusFilter === "UNSCORED"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "text-[#94A3B8] hover:text-white"
                      }`}
                    >
                      Pending ({submissions.filter((s) => !s.isScored).length})
                    </button>
                    <button
                      onClick={() => setStatusFilter("SCORED")}
                      className={`px-3 py-1 rounded-lg font-bold transition-all ${
                        statusFilter === "SCORED"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "text-[#94A3B8] hover:text-white"
                      }`}
                    >
                      Evaluated ({submissions.filter((s) => s.isScored).length})
                    </button>
                  </div>
                </div>

                {/* Domain Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                  <span className="text-[10px] text-[#64748B] uppercase font-bold shrink-0">Domain Track:</span>
                  <button
                    onClick={() => setSelectedDomain("ALL")}
                    className={`px-3 py-1 rounded-xl font-bold shrink-0 transition-all ${
                      selectedDomain === "ALL"
                        ? "bg-white text-black"
                        : "bg-white/[0.04] text-[#94A3B8] hover:text-white border border-white/10"
                    }`}
                  >
                    All Tracks
                  </button>
                  {availableDomains.map((dom) => {
                    const count = submissions.filter(
                      (s) => (s.team.domain?.name || s.team.problemStatement?.domain?.name) === dom
                    ).length;
                    const isSelected = selectedDomain.toLowerCase() === dom.toLowerCase();
                    return (
                      <button
                        key={dom}
                        onClick={() => setSelectedDomain(dom)}
                        className={`px-3 py-1 rounded-xl font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-[#6366F1] text-white border border-[#6366F1]"
                            : "bg-white/[0.04] text-[#94A3B8] hover:text-white border border-white/10"
                        }`}
                      >
                        <span>{dom}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? "bg-white/20" : "bg-white/[0.08]"}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SQUADS TABLE */}
              <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] rounded-3xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-extrabold text-[#F8FAFC] tracking-tight">
                      Squads for Evaluation ({filteredTeams.length})
                    </h2>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Click on any squad below to open Phase 1–4 document review & enter marks.
                    </p>
                  </div>
                </div>

                {filteredTeams.length === 0 ? (
                  <div className="p-16 text-center text-[#64748B] space-y-2">
                    <Users className="w-8 h-8 mx-auto opacity-50" />
                    <p className="text-sm">No squads match the selected filters or search query.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/[0.08] bg-[#111524]/60 text-[#94A3B8] uppercase text-[10px] tracking-wider">
                          <th className="py-3.5 px-5 font-bold">Squad & College</th>
                          <th className="py-3.5 px-4 font-bold">Domain & Statement</th>
                          <th className="py-3.5 px-4 font-bold">Phase Documents</th>
                          <th className="py-3.5 px-4 font-bold">Progress</th>
                          <th className="py-3.5 px-4 font-bold">Evaluation</th>
                          <th className="py-3.5 px-5 font-bold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {filteredTeams.map((item) => {
                          const domainName =
                            item.team.domain?.name || item.team.problemStatement?.domain?.name;
                          const hasScored = item.isScored;
                          const totalScore = hasScored
                            ? item.scores.reduce((s, c) => s + c.score, 0)
                            : 0;

                          return (
                            <tr
                              key={item.teamId}
                              onClick={() => openEvaluation(item)}
                              className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                            >
                              <td className="py-4 px-5">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-white text-sm group-hover:text-[#818CF8] transition-colors">
                                    {item.team.name}
                                  </span>
                                  {item.team.teamId && (
                                    <span className="text-[10px] text-[#818CF8] font-mono px-2 py-0.5 rounded bg-[#6366F1]/10 border border-[#6366F1]/20 font-bold">
                                      {item.team.teamId}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-[#94A3B8] truncate max-w-xs mt-0.5" title={item.team.college}>
                                  {item.team.college}
                                </div>
                                <div className="text-[10px] text-[#64748B]">
                                  Lead: {item.team.leadStudent?.user?.name || "Student"}
                                </div>
                              </td>

                              <td className="py-4 px-4 space-y-1">
                                {domainName && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#6366F1]/10 border border-[#6366F1]/25 text-[10px] font-bold text-[#818CF8]">
                                    <Target className="w-2.5 h-2.5" />
                                    {domainName}
                                  </span>
                                )}
                                <div className="text-xs font-semibold text-white truncate max-w-xs">
                                  {item.team.problemStatement?.title || "Pending assignment"}
                                </div>
                              </td>

                              {/* Phase 1-4 indicator pills */}
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-1.5">
                                  {item.phases.map((ph) => (
                                    <span
                                      key={ph.stage}
                                      title={`${ph.name}: ${ph.hasUpload ? ph.latestUpload?.fileName : "Pending"}`}
                                      className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all ${
                                        ph.hasUpload
                                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                          : "bg-white/[0.04] text-[#64748B] border border-white/[0.06]"
                                      }`}
                                    >
                                      P{ph.stage}
                                    </span>
                                  ))}
                                </div>
                              </td>

                              {/* Progress */}
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-16 bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className="bg-[#6366F1] h-full rounded-full"
                                      style={{ width: `${item.team.progressPercent}%` }}
                                    />
                                  </div>
                                  <span className="text-[11px] font-mono font-bold text-white">
                                    {item.team.progressPercent}%
                                  </span>
                                </div>
                              </td>

                              {/* Evaluation Status */}
                              <td className="py-4 px-4">
                                {item.isFinalCertified ? (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1 font-mono">
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span>Certified ({totalScore.toFixed(1)} / {maxTotalScore})</span>
                                  </span>
                                ) : item.isDraftSaved ? (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-500/15 text-blue-300 border border-blue-500/30 inline-flex items-center gap-1 font-mono">
                                    <Clock className="w-3 h-3 text-blue-400" />
                                    <span>Draft Saved ({totalScore.toFixed(1)} pts)</span>
                                  </span>
                                ) : hasScored ? (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1 font-mono">
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span>{totalScore.toFixed(1)} / {maxTotalScore} pts</span>
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                                    PENDING
                                  </span>
                                )}
                              </td>

                              {/* Action CTA */}
                              <td className="py-4 px-5 text-right">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEvaluation(item);
                                  }}
                                  className="px-3.5 py-1.5 rounded-xl bg-[#6366F1] text-white font-bold text-[10px] hover:bg-[#4F46E5] shadow-sm transition-all inline-flex items-center gap-1 font-mono uppercase tracking-wider"
                                >
                                  <span>{hasScored ? "Review / Edit" : "Review & Score"}</span>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
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
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: ASSIGNED ARENAS & TRACKS */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === "assigned" && (
        <div className="space-y-6 animate-fade-in font-mono">
          <div className="p-6 rounded-3xl bg-[#0B0E18]/70 border border-white/[0.08] space-y-2">
            <div className="flex items-center gap-2 text-[#818CF8]">
              <Building2 className="w-5 h-5 text-[#6366F1]" />
              <h2 className="text-lg font-extrabold text-white">Assigned Arenas & Challenge Tracks</h2>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Hackathon arenas and domain tracks where your judge credentials have been assigned and cleared for evaluation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignedHackathons.map((arena) => (
              <div
                key={arena.id}
                className={`p-6 rounded-3xl border transition-all flex flex-col justify-between space-y-4 ${
                  arena.isCurrent
                    ? "bg-[#6366F1]/10 border-[#6366F1] shadow-xl shadow-[#6366F1]/10"
                    : "bg-[#0B0E18]/70 border-white/[0.08] hover:border-white/20"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                      {arena.hostName} ({arena.hostType})
                    </span>
                    {arena.isCurrent ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Active Evaluation Track</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/[0.04] text-[#94A3B8] border border-white/10">
                        Authorized
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-extrabold text-white">
                    {arena.title}
                  </h3>

                  <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Assigned Domain:</span>
                      <span className="text-[#818CF8] font-bold">{arena.domain}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Competing Squads:</span>
                      <span className="text-white font-bold">{arena.teamCount} Squads</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Track Clearance:</span>
                      <span className="text-emerald-400 font-bold">{arena.approvalStatus}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      loadData(arena.id);
                      setActiveTab("queue");
                    }}
                    disabled={arena.isCurrent}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                      arena.isCurrent
                        ? "bg-white/[0.04] text-[#64748B] border border-white/[0.08] cursor-default"
                        : "bg-[#6366F1] hover:bg-[#4F46E5] text-white shadow-md cursor-pointer"
                    }`}
                  >
                    <span>{arena.isCurrent ? "Current Track Selected" : "Select & Evaluate Track"}</span>
                    {!arena.isCurrent && <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: EVALUATION HISTORY */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === "history" && (
        <div className="space-y-6 animate-fade-in font-mono">
          <div className="p-6 rounded-3xl bg-[#0B0E18]/70 border border-white/[0.08] space-y-2">
            <div className="flex items-center gap-2 text-[#818CF8]">
              <FileCheck className="w-5 h-5 text-[#6366F1]" />
              <h2 className="text-lg font-extrabold text-white">Evaluation History & Scored Squads</h2>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Permanent registry of squads evaluated, awarded marks, and certified jury feedback.
            </p>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[#0B0E18]/70 border border-white/[0.08] space-y-1">
              <span className="text-[10px] text-[#64748B] uppercase font-bold">Evaluated Squads</span>
              <div className="text-2xl font-black text-white font-mono">{evaluatedTeams.length}</div>
              <span className="text-[10px] text-[#94A3B8]">Total reviewed</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#0B0E18]/70 border border-emerald-500/20 space-y-1">
              <span className="text-[10px] text-emerald-400 uppercase font-bold">Certified Complete</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                {evaluatedTeams.filter((s) => s.isFinalCertified).length}
              </div>
              <span className="text-[10px] text-[#94A3B8]">Official final submissions</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#0B0E18]/70 border border-blue-500/20 space-y-1">
              <span className="text-[10px] text-blue-400 uppercase font-bold">Drafts in Progress</span>
              <div className="text-2xl font-black text-blue-400 font-mono">
                {evaluatedTeams.filter((s) => s.isDraftSaved && !s.isFinalCertified).length}
              </div>
              <span className="text-[10px] text-[#94A3B8]">Partial evaluations saved</span>
            </div>
          </div>

          {evaluatedTeams.length === 0 ? (
            <div className="p-16 text-center rounded-3xl bg-[#0B0E18]/70 border border-white/[0.08] text-[#64748B] space-y-3">
              <FileCheck className="w-10 h-10 mx-auto opacity-40 text-[#6366F1]" />
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-white">No Evaluated Squads Yet</h3>
                <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                  Switch to the Evaluation Queue tab to inspect participant deliverables and record marks.
                </p>
              </div>
              <button
                onClick={() => setActiveTab("queue")}
                className="px-4 py-2 rounded-xl bg-[#6366F1] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#4F46E5] transition-all inline-flex items-center gap-1.5"
              >
                <span>Go to Evaluation Queue</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {evaluatedTeams.map((squad) => {
                const totalScore = squad.scores.reduce((sum, c) => sum + c.score, 0);
                return (
                  <div
                    key={squad.teamId}
                    className="p-6 rounded-3xl bg-[#0B0E18]/80 border border-white/[0.08] hover:border-white/20 transition-all space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base font-extrabold text-white">{squad.team.name}</span>
                        {squad.team.teamId && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#6366F1]/20 text-[#818CF8]">
                            {squad.team.teamId}
                          </span>
                        )}
                        <span className="text-xs text-[#64748B]">· {squad.team.college}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="px-3 py-1 rounded-xl bg-[#6366F1]/15 border border-[#6366F1]/30 text-right">
                          <span className="text-sm font-black text-white font-mono">
                            {totalScore.toFixed(1)} <span className="text-[10px] text-[#94A3B8]">/ {maxTotalScore} pts</span>
                          </span>
                        </div>

                        <button
                          onClick={() => {
                            setActiveTab("queue");
                            openEvaluation(squad);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                        >
                          <span>Re-evaluate / Edit</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Criteria marks pill breakdown */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-[#64748B] uppercase font-bold">Criteria Breakdown:</span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {squad.scores.map((sc) => {
                          const crit = criteria.find((c) => c.id === sc.criterionId);
                          return (
                            <div
                              key={sc.criterionId}
                              className="px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[10px] flex items-center gap-1.5"
                            >
                              <span className="text-[#94A3B8] truncate max-w-[140px]">{crit?.name || "Criterion"}:</span>
                              <strong className="text-emerald-400 font-mono">{sc.score}</strong>
                              <span className="text-[#64748B]">/{crit?.maxScore || 10}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {squad.description && (
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-[#CBD5E1] space-y-1">
                        <span className="text-[10px] uppercase font-bold text-[#64748B]">Jury Remarks:</span>
                        <p className="leading-relaxed">{squad.description}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 4: UNIFIED RUBRIC GUIDE */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === "rubric" && (
        <div className="space-y-6 animate-fade-in font-mono">
          <div className="p-6 rounded-3xl bg-[#0B0E18]/70 border border-white/[0.08] space-y-2">
            <div className="flex items-center gap-2 text-[#818CF8]">
              <Award className="w-5 h-5 text-[#6366F1]" />
              <h2 className="text-lg font-extrabold text-white">Unified Evaluation Rubric Guide (v5.0 Architecture)</h2>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Under Release v5.0, there is strictly one unified rubric for all phases. Evaluators navigate across Phase 1 to Phase 4 deliverables while grading on this single scorecard.
            </p>
          </div>

          {/* Grand Total Banner */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-[#6366F1]/15 to-emerald-500/10 border border-[#6366F1]/30 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#818CF8]">Evaluation Schema</span>
              <h3 className="text-base font-extrabold text-white">
                {criteria.length}-Criterion Standard Evaluation Metric
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Every squad is scored on these exact criteria. The certified grand total ranks squads on the host leaderboard.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0B0E18] border border-white/10 text-right">
              <span className="text-[10px] text-[#64748B] uppercase font-bold block">Grand Total</span>
              <span className="text-3xl font-black text-white font-mono">{maxTotalScore}</span>
              <span className="text-xs text-[#818CF8] font-bold block">Marks</span>
            </div>
          </div>

          {/* Criteria Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {criteria.map((c, idx) => (
              <div
                key={c.id}
                className="p-5 rounded-3xl bg-[#0B0E18]/70 border border-white/[0.08] hover:border-white/20 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#6366F1] uppercase">
                      Criterion #{idx + 1}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/30 font-mono">
                      Weight: {c.weight}x
                    </span>
                  </div>

                  <h4 className="text-sm font-extrabold text-white leading-snug">
                    {c.name}
                  </h4>
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs font-mono">
                  <span className="text-[#64748B]">Maximum Points:</span>
                  <strong className="text-emerald-400 text-sm font-bold">{c.maxScore} marks</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 5: EVALUATOR PROFILE & CLEARANCES */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === "profile" && (
        <div className="space-y-6 animate-fade-in font-mono max-w-3xl mx-auto">
          <div className="p-6 rounded-3xl bg-[#0B0E18]/70 border border-white/[0.08] space-y-2">
            <div className="flex items-center gap-2 text-[#818CF8]">
              <Users className="w-5 h-5 text-[#6366F1]" />
              <h2 className="text-lg font-extrabold text-white">Evaluator Profile & Clearances</h2>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Your registered jury account details and evaluation clearances for HackBridge arenas.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-[#0B0E18]/80 backdrop-blur-md border border-white/[0.12] shadow-2xl space-y-6">
            <div className="flex items-center gap-4 border-b border-white/[0.08] pb-6">
              <div className="w-16 h-16 rounded-2xl bg-[#6366F1]/20 border border-[#6366F1]/30 flex items-center justify-center text-xl font-black text-[#818CF8]">
                {session.name ? session.name.charAt(0).toUpperCase() : "J"}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-extrabold text-white">{session.name}</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>APPROVED EVALUATOR</span>
                  </span>
                </div>
                <div className="text-xs text-[#94A3B8]">{session.email}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                <span className="text-[10px] text-[#64748B] uppercase font-bold">Organization / Company</span>
                <div className="font-bold text-white">
                  {judgeProfile?.company || "Evaluation Panel"}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                <span className="text-[10px] text-[#64748B] uppercase font-bold">Designation</span>
                <div className="font-bold text-white">
                  {judgeProfile?.designation || "Industry Evaluator"}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                <span className="text-[10px] text-[#64748B] uppercase font-bold">Assigned Domain Focus</span>
                <div className="font-bold text-[#818CF8]">
                  {assignedDomain || "All Domain Tracks"}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                <span className="text-[10px] text-[#64748B] uppercase font-bold">Current Assigned Arena</span>
                <div className="font-bold text-white truncate">
                  {hackathonTitle}
                </div>
              </div>
            </div>

            {/* Fast Admin Support Contact Card */}
            <div className="p-5 rounded-2xl bg-[#111524]/80 border border-white/[0.08] space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                <Phone className="w-4 h-4 text-[#818CF8]" />
                <span>Admin Assistance & Jury Coordination</span>
              </div>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                For track re-assignments, domain adjustments, or urgent event support, contact our administrator:
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

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <Link
                href="/dashboard/judge/profile"
                className="px-5 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-[#6366F1]/20"
              >
                <Users className="w-4 h-4" />
                <span>Open Full Profile & Security Console</span>
              </Link>

              <button
                onClick={async () => {
                  await fetch("/api/v1/auth/logout", { method: "POST" });
                  window.location.href = "/login?role=JUDGE";
                }}
                className="px-5 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out from Judge Panel</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function JudgeDashboard() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 bg-transparent font-mono">
          <div className="h-64 rounded-3xl bg-[#0B0E18]/70 border border-white/[0.08] animate-pulse" />
        </div>
      }
    >
      <JudgeDashboardContent />
    </Suspense>
  );
}
