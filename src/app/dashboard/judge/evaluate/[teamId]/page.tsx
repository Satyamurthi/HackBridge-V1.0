"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Layers,
  Award,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Github,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Save,
  Send,
  Building,
  User,
  Scale,
  Sparkles,
  RefreshCw
} from "lucide-react";

interface RubricCriterion {
  id: string;
  name: string;
  description?: string | null;
  maxScore: number;
}

interface PhaseItem {
  stage: number;
  name: string;
  dueAt?: string | null;
  submission: {
    id: string;
    submittedAt?: string | null;
    githubRepoUrl?: string | null;
    demoUrl?: string | null;
    videoUrl?: string | null;
    documents?: Array<{
      id: string;
      fileName: string;
      fileUrl: string;
      docType?: string | null;
      stage?: number | null;
      verified?: boolean;
    }>;
    markdownContent?: string | null;
    documentCount?: number;
  } | null;
}

interface TeamJudgeItem {
  submissionId: string;
  team: {
    id: string;
    teamId: string | null;
    name: string;
    status: string;
    college: string;
    domain?: { id: string; name: string } | null;
    problemStatement?: {
      id?: string;
      title: string;
      description?: string | null;
      code?: string | null;
    } | null;
    codeRepo?: { githubRepoUrl: string } | null;
    leadStudent: { user: { name: string; email: string; phone?: string | null } };
    members?: Array<{ student: { user: { name: string; email?: string } } }>;
    progressPercent: number;
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

export default function JudgeEvaluateSquadPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params?.teamId as string;

  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [teamItem, setTeamItem] = useState<TeamJudgeItem | null>(null);
  const [criteria, setCriteria] = useState<RubricCriterion[]>([]);
  const [hackathon, setHackathon] = useState<any>(null);

  // Stepper and active phase
  const [activePhase, setActivePhase] = useState<number>(1);
  const [viewedPhases, setViewedPhases] = useState<number[]>([1]);

  // Scoring inputs
  const [scoreInputs, setScoreInputs] = useState<Record<string, { score: number | string; notes: string }>>({});
  const [overallFeedback, setOverallFeedback] = useState("");
  const [savingScore, setSavingScore] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!teamId) return;
    setFetching(true);
    try {
      const res = await fetch("/api/v1/judge/submissions");
      if (res.ok) {
        const data = await res.json();
        setHackathon(data.hackathon);

        const mappedCriteria = (data.rubricCriteria || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          maxScore: c.maxMarks || 10,
        }));
        setCriteria(mappedCriteria);

        const found = (data.submissions || []).find((s: any) => s.team?.id === teamId);
        if (found) {
          setTeamItem(found);

          // Prepopulate scores
          const initialScores: Record<string, { score: number | string; notes: string }> = {};
          mappedCriteria.forEach((c: RubricCriterion) => {
            const existing = (found.scores || []).find((sc: any) => sc.criterionId === c.id);
            initialScores[c.id] = {
              score: existing ? existing.score : "",
              notes: existing?.notes || "",
            };
          });
          setScoreInputs(initialScores);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, [teamId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectPhase = (stage: number) => {
    setActivePhase(stage);
    if (!viewedPhases.includes(stage)) {
      setViewedPhases((prev) => [...prev, stage]);
    }
  };

  const handleNextPhase = () => {
    if (activePhase < 4) {
      selectPhase(activePhase + 1);
    }
  };

  const handlePrevPhase = () => {
    if (activePhase > 1) {
      selectPhase(activePhase - 1);
    }
  };

  // Compute live score total
  const totalScoreEntered = Object.values(scoreInputs).reduce((sum, item) => {
    const val = Number(item.score);
    return !isNaN(val) ? sum + val : sum;
  }, 0);

  const totalPossible = criteria.reduce((sum, c) => sum + c.maxScore, 0);

  // Save draft scores
  const handleSaveDraft = async () => {
    if (!teamItem) return;
    setSavingDraft(true);
    setActionErr(null);
    setActionMsg(null);

    const scoresPayload: Array<{ criterionId: string; score: number; notes?: string }> = [];
    for (const c of criteria) {
      const input = scoreInputs[c.id];
      const val = input && input.score !== "" ? Number(input.score) : null;
      if (val !== null && !isNaN(val)) {
        if (val < 0 || val > c.maxScore) {
          setActionErr(`Score for "${c.name}" must be between 0 and ${c.maxScore}.`);
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
          teamId: teamItem.team.id,
          submissionId: teamItem.submissionId,
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

      setActionMsg(`✓ Draft marks saved for squad ${teamItem.team.name}!`);
      loadData();
    } catch {
      setActionErr("Network communication error. Please try again.");
    } finally {
      setSavingDraft(false);
    }
  };

  // Submit final certified scores
  const handleSubmitScores = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamItem) return;

    setSavingScore(true);
    setActionErr(null);
    setActionMsg(null);

    const scoresPayload: Array<{ criterionId: string; score: number; notes?: string }> = [];
    for (const c of criteria) {
      const input = scoreInputs[c.id];
      const val = input && input.score !== "" ? Number(input.score) : null;
      if (val === null || isNaN(val)) {
        setActionErr(`Final certification requires marks for "${c.name}" (Out of ${c.maxScore}). Or save draft.`);
        setSavingScore(false);
        return;
      }
      if (val < 0 || val > c.maxScore) {
        setActionErr(`Marks for "${c.name}" must be between 0 and ${c.maxScore}.`);
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
          teamId: teamItem.team.id,
          submissionId: teamItem.submissionId,
          scores: scoresPayload,
          feedback: overallFeedback.trim() || undefined,
          isDraft: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionErr(data.error || "Failed to certify scores");
        return;
      }

      setActionMsg(`✓ Final scores certified successfully for squad ${teamItem.team.name}!`);
      loadData();
    } catch {
      setActionErr("Network communication error. Please try again.");
    } finally {
      setSavingScore(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#6366F1] border-t-transparent animate-spin" />
          <span className="text-xs font-mono text-[#94A3B8]">Loading Squad Deliverables...</span>
        </div>
      </div>
    );
  }

  if (!teamItem) {
    return (
      <div className="max-w-2xl mx-auto p-12 text-center font-mono space-y-4">
        <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
        <h2 className="text-base font-bold text-white">Squad Not Found in Your Evaluation Queue</h2>
        <p className="text-xs text-[#94A3B8]">
          This team might belong to another domain track, or your judge assignment is pending approval.
        </p>
        <Link
          href="/dashboard/judge"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6366F1] text-xs font-bold text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Judge Dashboard</span>
        </Link>
      </div>
    );
  }

  const currentPhaseData = teamItem.phases.find((p) => p.stage === activePhase);

  return (
    <div className="space-y-6 animate-fade-in font-mono max-w-7xl mx-auto px-4 py-8">
      {/* SQUAD HEADER BAR */}
      <div className="p-6 rounded-3xl bg-[#0B0E18]/80 backdrop-blur-md border border-white/[0.12] shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/judge"
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[#94A3B8] hover:text-white transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-white">{teamItem.team.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/30">
                  {teamItem.team.domain?.name || "General Track"}
                </span>
              </div>
              <div className="text-xs text-[#94A3B8] flex items-center gap-3 pt-0.5">
                <span>{teamItem.team.college}</span>
                <span>•</span>
                <span>Lead: {teamItem.team.leadStudent.user.name}</span>
                {teamItem.team.problemStatement && (
                  <>
                    <span>•</span>
                    <span className="truncate max-w-sm">Challenge: {teamItem.team.problemStatement.title}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={fetching}
            className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-bold text-white transition-all flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${fetching ? "animate-spin text-[#818CF8]" : ""}`} />
            <span>Sync</span>
          </button>
          <Link
            href="/dashboard/judge?tab=queue"
            className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white text-xs font-bold transition-all"
          >
            All Squads
          </Link>
        </div>
      </div>

      {/* ACTION MESSAGES */}
      {actionMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}

      {actionErr && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionErr}</span>
        </div>
      )}

      {/* TWO-COLUMN SPLIT PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: DELIVERABLES VIEWER (PHASE 1 - PHASE 4) */}
        <div className="lg:col-span-7 space-y-6">
          {/* V5.0 UNIFIED POLICY BANNER */}
          <div className="p-4 rounded-2xl bg-[#6366F1]/10 border border-[#6366F1]/20 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[#818CF8] font-bold">
              <Sparkles className="w-4 h-4 text-[#6366F1]" />
              <span>v5.0 Unified Evaluation Policy</span>
            </div>
            <span className="text-[11px] text-[#CBD5E1]">
              Single persistent rubric across Phase 1 to Phase 4
            </span>
          </div>

          {/* DELIVERABLES NAVIGATION (PHASE 1 TO PHASE 4) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#6366F1]" />
                Deliverables Navigation
              </span>

              {/* Inspected Tracker */}
              <div className="flex items-center gap-1 text-[11px] text-[#94A3B8]">
                <span>Inspected:</span>
                {[1, 2, 3, 4].map((stage) => (
                  <span
                    key={stage}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      viewedPhases.includes(stage)
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-white/[0.04] text-[#64748B]"
                    }`}
                  >
                    P{stage} {viewedPhases.includes(stage) ? "✓" : ""}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {teamItem.phases.map((phase) => {
                const isSelected = activePhase === phase.stage;
                return (
                  <button
                    key={phase.stage}
                    onClick={() => selectPhase(phase.stage)}
                    className={`p-3 rounded-2xl text-left border transition-all flex flex-col justify-between gap-2 relative ${
                      isSelected
                        ? "bg-[#6366F1]/15 border-[#6366F1] text-white shadow-lg shadow-[#6366F1]/10"
                        : "bg-[#0B0E18]/70 border-white/[0.08] text-[#94A3B8] hover:text-white"
                    }`}
                  >
                    <div className="text-xs font-bold uppercase tracking-wider flex items-center justify-between w-full">
                      <span>{phase.name}</span>
                      {viewedPhases.includes(phase.stage) && (
                        <span className="text-[10px] text-emerald-400">✓</span>
                      )}
                    </div>
                    <div className="text-[10px] text-[#64748B]">
                      {phase.submission ? "Submitted" : "Pending"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ACTIVE DELIVERABLE CONTENT CARD */}
          <div className="p-6 rounded-3xl bg-[#0B0E18]/80 backdrop-blur-md border border-white/[0.12] shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  {currentPhaseData?.name || `Phase ${activePhase} Deliverables`}
                </h3>
                <span className="text-xs text-[#94A3B8]">
                  {currentPhaseData?.submission
                    ? `Submitted on ${new Date(currentPhaseData.submission.submittedAt || Date.now()).toLocaleDateString()}`
                    : "No submission recorded for this phase yet"}
                </span>
              </div>

              {/* Stepper Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevPhase}
                  disabled={activePhase <= 1}
                  className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 text-xs text-white flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <button
                  onClick={handleNextPhase}
                  disabled={activePhase >= 4}
                  className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 text-xs text-white flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* LINKS & ASSETS */}
            {currentPhaseData?.submission ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  {currentPhaseData.submission.githubRepoUrl && (
                    <a
                      href={currentPhaseData.submission.githubRepoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs text-white flex items-center gap-2"
                    >
                      <Github className="w-3.5 h-3.5 text-white" />
                      <span>Code Repository</span>
                      <ExternalLink className="w-3 h-3 text-[#64748B]" />
                    </a>
                  )}

                  {currentPhaseData.submission.demoUrl && (
                    <a
                      href={currentPhaseData.submission.demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs text-[#818CF8] flex items-center gap-2"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Live Prototype URL</span>
                    </a>
                  )}

                  {currentPhaseData.submission.videoUrl && (
                    <a
                      href={currentPhaseData.submission.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs text-amber-300 flex items-center gap-2"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Video Demonstration</span>
                    </a>
                  )}
                </div>

                {/* Uploaded Documents */}
                {currentPhaseData.submission.documents && currentPhaseData.submission.documents.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] text-[#64748B] uppercase font-bold">Uploaded Artifacts</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {currentPhaseData.submission.documents.map((doc) => (
                        <a
                          key={doc.id}
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/20 transition-all flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="w-3.5 h-3.5 text-[#6366F1] shrink-0" />
                            <span className="text-xs text-white truncate">{doc.fileName}</span>
                          </div>
                          <ExternalLink className="w-3 h-3 text-[#64748B] shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Markdown content */}
                {currentPhaseData.submission.markdownContent && (
                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] text-[#64748B] uppercase font-bold">Technical Documentation</span>
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs text-[#CBD5E1] whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                      {currentPhaseData.submission.markdownContent}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-[#94A3B8] rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                This squad has not submitted Phase {activePhase} deliverables yet. Use the stepper above to inspect other phase submissions.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: SINGLE UNIFIED RUBRIC SCORECARD */}
        <div className="lg:col-span-5 space-y-6">
          <form
            onSubmit={handleSubmitScores}
            className="p-6 rounded-3xl bg-[#0B0E18]/80 backdrop-blur-md border border-white/[0.12] shadow-2xl space-y-6"
          >
            {/* SCORECARD HEADER */}
            <div className="space-y-2 border-b border-white/[0.08] pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#6366F1]" />
                  <h3 className="text-base font-extrabold text-white">Unified Rubric Scorecard</h3>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-white">
                    {Math.round(totalScoreEntered * 10) / 10} / {totalPossible}
                  </div>
                  <div className="text-[10px] text-[#818CF8]">Grand Total</div>
                </div>
              </div>
              <p className="text-[11px] text-[#94A3B8]">
                Scores apply to the squad across all deliverables. Changes remain saved across phase tab switches.
              </p>
            </div>

            {/* CRITERIA INPUTS */}
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {criteria.map((crit, idx) => {
                const currentVal = scoreInputs[crit.id]?.score ?? "";
                const currentNotes = scoreInputs[crit.id]?.notes ?? "";

                return (
                  <div
                    key={crit.id}
                    className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/15 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-[#64748B] font-mono">CRITERION #{idx + 1}</span>
                        <div className="text-xs font-bold text-white">{crit.name}</div>
                        {crit.description && (
                          <p className="text-[10px] text-[#94A3B8] leading-tight">{crit.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max={crit.maxScore}
                          value={currentVal}
                          onChange={(e) =>
                            setScoreInputs((prev) => ({
                              ...prev,
                              [crit.id]: {
                                ...prev[crit.id],
                                score: e.target.value === "" ? "" : Number(e.target.value),
                              },
                            }))
                          }
                          placeholder="0"
                          className="w-16 px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-bold text-white text-center focus:border-[#6366F1] focus:outline-none"
                        />
                        <span className="text-[11px] text-[#64748B]">/ {crit.maxScore}</span>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={currentNotes}
                      onChange={(e) =>
                        setScoreInputs((prev) => ({
                          ...prev,
                          [crit.id]: {
                            ...prev[crit.id],
                            notes: e.target.value,
                          },
                        }))
                      }
                      placeholder="Optional notes for this criterion..."
                      className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/[0.04] text-[11px] text-white placeholder-[#64748B] focus:outline-none"
                    />
                  </div>
                );
              })}
            </div>

            {/* OVERALL JURY FEEDBACK */}
            <div className="space-y-1.5 pt-2 border-t border-white/[0.08]">
              <label className="text-xs font-bold text-white">Overall Jury Remarks & Feedback</label>
              <textarea
                rows={3}
                value={overallFeedback}
                onChange={(e) => setOverallFeedback(e.target.value)}
                placeholder="Constructive feedback for the squad lead and mentors..."
                className="w-full p-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-[#64748B] focus:border-[#6366F1] focus:outline-none"
              />
            </div>

            {/* SUBMISSION ACTION BUTTONS */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={savingDraft || savingScore}
                className="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-bold text-white transition-all flex items-center gap-2"
              >
                <Save className="w-3.5 h-3.5 text-[#818CF8]" />
                <span>{savingDraft ? "Saving Draft..." : "Save Draft"}</span>
              </button>

              <button
                type="submit"
                disabled={savingDraft || savingScore}
                className="px-5 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-xs font-bold text-white transition-all shadow-lg shadow-[#6366F1]/20 flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{savingScore ? "Certifying Scores..." : "Submit & Certify"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
