"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Award,
  Layers,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Scale,
  Sparkles,
  ShieldAlert,
  Code2,
  Cpu,
  Video
} from "lucide-react";

interface Criterion {
  id: string;
  name: string;
  description?: string | null;
  maxMarks: number;
}

export default function JudgeRubricPage() {
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [loading, setLoading] = useState(true);
  const [hackathonTitle, setHackathonTitle] = useState("");

  useEffect(() => {
    fetch("/api/v1/judge/submissions")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.rubricCriteria) {
          setCriteria(d.rubricCriteria);
        }
        if (d?.hackathon?.title) {
          setHackathonTitle(d.hackathon.title);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalDeclaredMarks = criteria.reduce((sum, c) => sum + (c.maxMarks || 0), 0) || 100;

  const phaseDeliverableGuides = [
    {
      phase: "Phase 1: Ideation & Architecture",
      icon: Layers,
      items: [
        "System Architecture Diagram & Tech Stack Specification",
        "Problem Statement Fit & Technical Feasibility Scope",
        "Target Persona User Flows & Database Entity Relationship Models",
        "Repository Setup with Initial Verified Commit"
      ],
    },
    {
      phase: "Phase 2: Core Engine & APIs",
      icon: Code2,
      items: [
        "Working Backend / Microservices / API Engine",
        "Database Schema Implementation & Migrations",
        "Authentication & Security Clearance Handling",
        "Unit & Integration Tests Execution Logs"
      ],
    },
    {
      phase: "Phase 3: Prototype & Live Demo",
      icon: Cpu,
      items: [
        "Functional Frontend UI / Client Application",
        "End-to-End User Flow Execution on Real Data",
        "Deployment Link / Sandbox URL Verification",
        "Edge-case & Error Boundary Handling"
      ],
    },
    {
      phase: "Phase 4: Final Deck & Video Pitch",
      icon: Video,
      items: [
        "Concise 2–3 Minute Video Demonstration Walkthrough",
        "Executive Pitch Deck (Problem, Solution, Market, Architecture)",
        "Open-source Code Repository with Comprehensive README",
        "Self-contained Setup Instructions for Host Verification"
      ],
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in font-mono max-w-6xl mx-auto px-4 py-8">
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
              <Scale className="w-5 h-5 text-[#6366F1]" />
              <h1 className="text-xl font-extrabold text-white">v5.0 Unified Evaluation Rubric Guide</h1>
            </div>
          </div>
          <p className="text-xs text-[#94A3B8] ml-11">
            Standardized evaluation framework across all phases · Total Marks: {totalDeclaredMarks}
          </p>
        </div>

        <Link
          href="/dashboard/judge?tab=queue"
          className="px-4 py-2 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold transition-all shadow-lg shadow-[#6366F1]/20 flex items-center gap-2"
        >
          <span>Open Scoring Queue</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* V5.0 PROTOCOL BANNER */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#6366F1]/20 via-[#4F46E5]/10 to-transparent border border-[#6366F1]/30 space-y-2">
        <div className="flex items-center gap-2 text-[#818CF8] text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-[#6366F1]" />
          <span>Release v5.0 Single Unified Rubric Protocol</span>
        </div>
        <p className="text-xs text-[#CBD5E1] leading-relaxed">
          Under v5.0 architecture, judges evaluate each squad once on a persistent unified scorecard.
          Judges navigate through Phase 1 to Phase 4 deliverables in the viewer on the left, while criteria scores
          remain persistent on the scorecard on the right. There are no separate per-phase rubric resets.
        </p>
      </div>

      {/* 9 RUBRIC CRITERIA BREAKDOWN */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-[#94A3B8]">
          <span className="font-bold uppercase tracking-wider text-white">Rubric Criteria ({criteria.length})</span>
          <span className="text-[11px] text-[#818CF8]">Sum: {totalDeclaredMarks} Marks</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {criteria.map((crit, idx) => (
            <div
              key={crit.id}
              className="p-5 rounded-2xl bg-[#0B0E18]/80 border border-white/[0.08] hover:border-white/20 transition-all flex flex-col justify-between gap-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-[#6366F1]/20 text-[#818CF8] flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </span>
                    <h3 className="text-sm font-extrabold text-white">{crit.name}</h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-black bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/30">
                    Max: {crit.maxMarks}
                  </span>
                </div>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  {crit.description || "Evaluate candidate deliverable depth, implementation rigor, and engineering quality."}
                </p>
              </div>

              <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-[#64748B]">
                <span>Weightage: {Math.round((crit.maxMarks / totalDeclaredMarks) * 100)}%</span>
                <span>Scored 0 – {crit.maxMarks}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PHASE DELIVERABLE GUIDELINES */}
      <div className="space-y-4 pt-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#6366F1]" />
          <span>Deliverables Inspection Checklist (Phase 1 – Phase 4)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {phaseDeliverableGuides.map((guide) => {
            const Icon = guide.icon;
            return (
              <div
                key={guide.phase}
                className="p-6 rounded-2xl bg-[#0B0E18]/70 border border-white/[0.08] space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#818CF8]">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-extrabold text-white">{guide.phase}</h3>
                </div>

                <ul className="space-y-2">
                  {guide.items.map((item, i) => (
                    <li key={i} className="text-xs text-[#94A3B8] flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* JURY INTEGRITY STANDARDS */}
      <div className="p-6 rounded-3xl bg-[#0B0E18]/70 border border-white/[0.08] space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
          <ShieldAlert className="w-4 h-4" />
          <span>Evaluation Ethics & Conflict of Interest</span>
        </div>
        <p className="text-xs text-[#94A3B8] leading-relaxed">
          Judges must evaluate each deliverable impartially according to the published criteria.
          If you have a direct affiliation with any participating collegiate squad, notify the event host
          immediately for track re-assignment. All scores and jury remarks are cryptographic timestamped.
        </p>
      </div>
    </div>
  );
}
