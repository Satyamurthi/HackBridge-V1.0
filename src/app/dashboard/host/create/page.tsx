"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building2,
  Calendar,
  Layers,
  Scale,
  Rocket,
  ChevronRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProblemStatement {
  title: string;
  description: string;
}

interface Domain {
  name: string;
  description: string;
  revealAt: string;
  problemStatements: ProblemStatement[];
}

interface RubricCriterion {
  name: string;
  weight: number;
  maxScore: number;
}

interface WizardData {
  // Step 1: Basics
  title: string;
  description: string;
  prizePool: string;
  startAt: string;
  endAt: string;
  // Step 2: Rules
  rules: string;
  rulesGate: boolean;
  // Step 3: Domains & Problem Statements
  domains: Domain[];
  // Step 4: Team & Payment
  teamMin: number;
  teamMax: number;
  fee: number;
  paymentMode: "FREE" | "QR" | "RAZORPAY";
  upiId: string;
  // Step 5: Judging Rubric
  rubricCriteria: RubricCriterion[];
}

const STEPS = [
  { id: 1, label: "Basics", icon: Building2 },
  { id: 2, label: "Rules", icon: FileText },
  { id: 3, label: "Domains", icon: Layers },
  { id: 4, label: "Team & Pay", icon: Scale },
  { id: 5, label: "Rubric", icon: Scale },
  { id: 6, label: "Publish", icon: Rocket },
];

// ─── Input Components ─────────────────────────────────────────────────────────
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400">
        {label}
      </label>
      {children}
      {hint && <p className="text-[10px] text-slate-500 font-mono">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl bg-[#111524] border border-white/[0.08] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#6366F1]/50 transition-colors";

const textareaCls =
  "w-full px-3.5 py-2.5 rounded-xl bg-[#111524] border border-white/[0.08] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#6366F1]/50 transition-colors resize-none leading-relaxed";

// ─── Main Wizard Component ────────────────────────────────────────────────────
export default function CreateHackathonPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);

  const [data, setData] = useState<WizardData>({
    title: "",
    description: "",
    prizePool: "",
    startAt: "",
    endAt: "",
    rules: "",
    rulesGate: false,
    domains: [
      {
        name: "",
        description: "",
        revealAt: "",
        problemStatements: [{ title: "", description: "" }],
      },
    ],
    teamMin: 2,
    teamMax: 4,
    fee: 0,
    paymentMode: "FREE",
    upiId: "",
    rubricCriteria: [
      { name: "Innovation & Originality", weight: 1.5, maxScore: 10 },
      { name: "Technical Implementation", weight: 2.0, maxScore: 10 },
      { name: "Business Viability", weight: 1.0, maxScore: 10 },
      { name: "Presentation & Demo", weight: 1.0, maxScore: 10 },
    ],
  });

  const set = <K extends keyof WizardData>(key: K, val: WizardData[K]) =>
    setData((prev) => ({ ...prev, [key]: val }));

  // ─── Domain helpers ──────────────────────────────────────────────────────
  const addDomain = () =>
    set("domains", [
      ...data.domains,
      { name: "", description: "", revealAt: "", problemStatements: [{ title: "", description: "" }] },
    ]);

  const removeDomain = (i: number) =>
    set("domains", data.domains.filter((_, idx) => idx !== i));

  const updateDomain = (i: number, field: keyof Domain, val: string) =>
    set("domains", data.domains.map((d, idx) => (idx === i ? { ...d, [field]: val } : d)));

  const addPS = (di: number) =>
    set(
      "domains",
      data.domains.map((d, i) =>
        i === di
          ? { ...d, problemStatements: [...d.problemStatements, { title: "", description: "" }] }
          : d
      )
    );

  const removePS = (di: number, pi: number) =>
    set(
      "domains",
      data.domains.map((d, i) =>
        i === di
          ? { ...d, problemStatements: d.problemStatements.filter((_, idx) => idx !== pi) }
          : d
      )
    );

  const updatePS = (di: number, pi: number, field: keyof ProblemStatement, val: string) =>
    set(
      "domains",
      data.domains.map((d, i) =>
        i === di
          ? {
              ...d,
              problemStatements: d.problemStatements.map((ps, j) =>
                j === pi ? { ...ps, [field]: val } : ps
              ),
            }
          : d
      )
    );

  // ─── Rubric helpers ──────────────────────────────────────────────────────
  const addCriterion = () =>
    set("rubricCriteria", [...data.rubricCriteria, { name: "", weight: 1.0, maxScore: 10 }]);

  const removeCriterion = (i: number) =>
    set("rubricCriteria", data.rubricCriteria.filter((_, idx) => idx !== i));

  const updateCriterion = (i: number, field: keyof RubricCriterion, val: any) =>
    set(
      "rubricCriteria",
      data.rubricCriteria.map((c, idx) => (idx === i ? { ...c, [field]: val } : c))
    );

  // ─── Step validation ─────────────────────────────────────────────────────
  const canAdvance = (): boolean => {
    if (step === 1) return !!data.title && !!data.description && !!data.startAt && !!data.endAt;
    if (step === 2) return data.rules.length >= 10;
    if (step === 3)
      return data.domains.every(
        (d) => d.name && d.revealAt && d.problemStatements.every((ps) => ps.title)
      );
    if (step === 4) return data.teamMin >= 1 && data.teamMax >= data.teamMin;
    if (step === 5) return data.rubricCriteria.every((c) => c.name);
    return true;
  };

  // ─── Final Submit ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/hackathons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to create hackathon");
        setSubmitting(false);
        return;
      }

      setCreatedSlug(json.hackathon.slug);
      setStep(6);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Step 1: Basics ──────────────────────────────────────────────────────
  const Step1 = (
    <div className="space-y-5">
      <Field label="Hackathon Title" hint="A concise, memorable name for your event.">
        <input
          type="text"
          value={data.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="e.g. MIT TechFest BuildAthon 2027"
          className={inputCls}
        />
      </Field>

      <Field label="Short Description" hint="Shown on the public listing card (max 300 chars).">
        <textarea
          rows={3}
          maxLength={300}
          value={data.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="What this hackathon is about, who it's for..."
          className={textareaCls}
        />
        <span className="text-[10px] text-slate-600 font-mono">{data.description.length}/300</span>
      </Field>

      <Field label="Prize Pool" hint="Optional. E.g. '₹50,000 Cash + Internship Offer'">
        <input
          type="text"
          value={data.prizePool}
          onChange={(e) => set("prizePool", e.target.value)}
          placeholder="Certificates, ₹10,000 Prize Pool..."
          className={inputCls}
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Start Date & Time" hint="Server time (UTC+5:30 IST)">
          <input
            type="datetime-local"
            value={data.startAt}
            onChange={(e) => set("startAt", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="End Date & Time" hint="When the hackathon concludes.">
          <input
            type="datetime-local"
            value={data.endAt}
            min={data.startAt}
            onChange={(e) => set("endAt", e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>
    </div>
  );

  // ─── Step 2: Rules ───────────────────────────────────────────────────────
  const Step2 = (
    <div className="space-y-5">
      <Field
        label="Hackathon Rules & Guidelines"
        hint="Minimum 10 characters. Be specific about IP ownership, code of conduct, eligibility."
      >
        <textarea
          rows={12}
          value={data.rules}
          onChange={(e) => set("rules", e.target.value)}
          placeholder={`1. All participants must be currently enrolled students.\n2. Each team may have ${data.teamMin}–${data.teamMax} members.\n3. Code must be written during the hackathon period.\n4. All submissions must be original work.\n5. Judges' decisions are final.`}
          className={textareaCls}
        />
        <span className="text-[10px] text-slate-600 font-mono">{data.rules.length} chars</span>
      </Field>

      <label className="flex items-start gap-3 cursor-pointer p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/10 transition-colors">
        <input
          type="checkbox"
          checked={data.rulesGate}
          onChange={(e) => set("rulesGate", e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded accent-[#6366F1]"
        />
        <div>
          <div className="text-sm font-semibold text-white">Enable Rules Gate</div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5 leading-relaxed">
            If enabled, applicants must expand and accept the rules before they can access the apply form.
          </div>
        </div>
      </label>
    </div>
  );

  // ─── Step 3: Domains ─────────────────────────────────────────────────────
  const Step3 = (
    <div className="space-y-6">
      <p className="text-[11px] font-mono text-slate-400 leading-relaxed">
        Each domain has its own reveal timestamp. Problem statement titles are shown after reveal;
        descriptions are shown only inside the workspace.
      </p>

      {data.domains.map((domain, di) => (
        <div key={di} className="rounded-2xl border border-white/[0.08] bg-[#0B0E18] overflow-hidden">
          {/* Domain Header */}
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.01]">
            <span className="text-xs font-mono font-bold text-[#6366F1]">Domain {di + 1}</span>
            {data.domains.length > 1 && (
              <button
                onClick={() => removeDomain(di)}
                className="text-slate-500 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Domain Name">
                <input
                  type="text"
                  value={domain.name}
                  onChange={(e) => updateDomain(di, "name", e.target.value)}
                  placeholder="e.g. Web3 & Blockchain"
                  className={inputCls}
                />
              </Field>
              <Field label="Problem Reveal Time" hint="Server clock — problems unlock at this exact time.">
                <input
                  type="datetime-local"
                  value={domain.revealAt}
                  onChange={(e) => updateDomain(di, "revealAt", e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>

            <Field label="Domain Description (optional)">
              <textarea
                rows={2}
                value={domain.description}
                onChange={(e) => updateDomain(di, "description", e.target.value)}
                placeholder="Brief context about this domain..."
                className={textareaCls}
              />
            </Field>

            {/* Problem Statements */}
            <div className="space-y-3">
              <div className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">
                Problem Statements ({domain.problemStatements.length})
              </div>

              {domain.problemStatements.map((ps, pi) => (
                <div key={pi} className="rounded-xl bg-[#111524] border border-white/[0.06] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-500">PS-{pi + 1}</span>
                    {domain.problemStatements.length > 1 && (
                      <button
                        onClick={() => removePS(di, pi)}
                        className="text-slate-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={ps.title}
                    onChange={(e) => updatePS(di, pi, "title", e.target.value)}
                    placeholder="Problem statement title (shown after reveal)"
                    className={inputCls}
                  />
                  <textarea
                    rows={2}
                    value={ps.description}
                    onChange={(e) => updatePS(di, pi, "description", e.target.value)}
                    placeholder="Full problem description (shown inside workspace only)"
                    className={textareaCls}
                  />
                </div>
              ))}

              <button
                onClick={() => addPS(di)}
                className="text-xs font-mono text-[#6366F1] flex items-center gap-1 hover:text-white transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Problem Statement
              </button>
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={addDomain}
        className="w-full py-2.5 rounded-xl bg-white/[0.03] border border-dashed border-white/10 text-xs font-mono text-slate-400 hover:text-white hover:border-white/20 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-3.5 h-3.5" /> Add Another Domain
      </button>
    </div>
  );

  // ─── Step 4: Team & Payment ───────────────────────────────────────────────
  const Step4 = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-5">
        <Field label="Min Team Size">
          <input
            type="number"
            min={1}
            max={10}
            value={data.teamMin}
            onChange={(e) => set("teamMin", Number(e.target.value))}
            className={inputCls}
          />
        </Field>
        <Field label="Max Team Size">
          <input
            type="number"
            min={data.teamMin}
            max={10}
            value={data.teamMax}
            onChange={(e) => set("teamMax", Number(e.target.value))}
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="Payment Mode">
        <div className="grid grid-cols-3 gap-3">
          {(["FREE", "QR", "RAZORPAY"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                set("paymentMode", mode);
                if (mode === "FREE") set("fee", 0);
              }}
              className={`py-3 rounded-xl border text-xs font-mono font-semibold transition-colors ${
                data.paymentMode === mode
                  ? "bg-white text-black border-white"
                  : "bg-white/[0.02] border-white/[0.08] text-slate-300 hover:border-white/20"
              }`}
            >
              {mode === "FREE" ? "Free Entry" : mode === "QR" ? "QR Transfer" : "Razorpay"}
            </button>
          ))}
        </div>
      </Field>

      {data.paymentMode !== "FREE" && (
        <Field
          label="Registration Fee (INR)"
          hint="Amount students must pay to register their team."
        >
          <input
            type="number"
            min={1}
            value={data.fee}
            onChange={(e) => set("fee", Number(e.target.value))}
            placeholder="e.g. 299"
            className={inputCls}
          />
        </Field>
      )}

      {data.paymentMode === "QR" && (
        <Field label="UPI ID or QR Note" hint="Teams will submit transaction screenshots for your review.">
          <input
            type="text"
            value={data.upiId}
            onChange={(e) => set("upiId", e.target.value)}
            placeholder="yourorg@upi"
            className={inputCls}
          />
        </Field>
      )}

      {data.paymentMode === "RAZORPAY" && (
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300 font-mono">
          Razorpay Key ID and Secret are configured by the Super Admin in System Config. Your hackathon will use the platform&apos;s default Razorpay credentials. Team IDs are auto-generated on verified webhook.
        </div>
      )}
    </div>
  );

  // ─── Step 5: Rubric ───────────────────────────────────────────────────────
  const Step5 = (
    <div className="space-y-5">
      <p className="text-[11px] font-mono text-slate-400 leading-relaxed">
        Define judging criteria and their weights. Judges will score each team on every criterion.
        Weighted totals are computed automatically.
      </p>

      <div className="space-y-3">
        <div className="grid grid-cols-12 gap-2 text-[10px] font-mono text-slate-500 uppercase tracking-wider px-1">
          <span className="col-span-6">Criterion Name</span>
          <span className="col-span-2 text-center">Weight</span>
          <span className="col-span-2 text-center">Max Pts</span>
          <span className="col-span-2" />
        </div>

        {data.rubricCriteria.map((c, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-center">
            <input
              type="text"
              value={c.name}
              onChange={(e) => updateCriterion(i, "name", e.target.value)}
              placeholder="Criterion name"
              className={`${inputCls} col-span-6`}
            />
            <input
              type="number"
              step={0.5}
              min={0.5}
              max={5}
              value={c.weight}
              onChange={(e) => updateCriterion(i, "weight", Number(e.target.value))}
              className={`${inputCls} col-span-2 text-center`}
            />
            <input
              type="number"
              step={1}
              min={1}
              max={100}
              value={c.maxScore}
              onChange={(e) => updateCriterion(i, "maxScore", Number(e.target.value))}
              className={`${inputCls} col-span-2 text-center`}
            />
            <div className="col-span-2 flex justify-center">
              <button
                onClick={() => removeCriterion(i)}
                disabled={data.rubricCriteria.length <= 1}
                className="text-slate-500 hover:text-red-400 disabled:opacity-30 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addCriterion}
        className="text-xs font-mono text-[#6366F1] flex items-center gap-1 hover:text-white transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Add Criterion
      </button>
    </div>
  );

  // ─── Step 6: Success ─────────────────────────────────────────────────────
  const Step6 = (
    <div className="text-center space-y-6 py-8">
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
      </div>
      <div>
        <h2 className="font-display text-2xl font-bold text-white">Hackathon Created!</h2>
        <p className="text-sm text-slate-400 mt-2 leading-relaxed">
          Your hackathon has been saved as a <strong className="text-white">DRAFT</strong>. It will
          become publicly visible once your account is approved by a Super Admin and you click{" "}
          <strong className="text-white">Publish</strong>.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-3">
        <Link
          href="/dashboard/host"
          className="px-5 py-2.5 rounded-xl bg-white text-black font-bold text-sm hover:bg-slate-200 transition-colors"
        >
          Go to Host Dashboard
        </Link>
        {createdSlug && (
          <Link
            href={`/hackathons/${createdSlug}`}
            className="px-5 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white font-medium text-sm hover:bg-white/[0.1] transition-colors"
          >
            Preview Track
          </Link>
        )}
      </div>
    </div>
  );

  const stepContent = [Step1, Step2, Step3, Step4, Step5, Step6][step - 1];

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-12 w-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 mb-8">
        <Link href="/dashboard/host" className="hover:text-white transition-colors">
          Host Console
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-300">New Hackathon Track</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-white tracking-tight">
          Hackathon Builder Wizard
        </h1>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Step {step} of {STEPS.length} — {STEPS[step - 1].label}
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-1">
        {STEPS.map((s, idx) => {
          const Icon = s.icon;
          const done = step > s.id;
          const active = step === s.id;
          return (
            <React.Fragment key={s.id}>
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono flex-shrink-0 transition-colors ${
                  active
                    ? "bg-white text-black font-bold"
                    : done
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "text-slate-500 bg-white/[0.02] border border-white/5"
                }`}
              >
                {done ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <Icon className="w-3 h-3" />
                )}
                {s.label}
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`h-px flex-1 min-w-[12px] ${done ? "bg-emerald-500/30" : "bg-white/[0.06]"}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step Card */}
      <div className="bg-[#0B0E18] border border-white/[0.08] rounded-2xl p-6 md:p-8">
        {stepContent}

        {/* Error */}
        {error && (
          <div className="mt-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Navigation Buttons */}
        {step < 6 && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/[0.06]">
            <button
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 1}
              className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 text-xs font-mono flex items-center gap-2 hover:bg-white/[0.08] disabled:opacity-30 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>

            {step < 5 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canAdvance()}
                className="px-5 py-2 rounded-xl bg-white text-black font-bold text-xs flex items-center gap-2 hover:bg-slate-200 disabled:opacity-40 transition-colors"
              >
                Continue <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting || !canAdvance()}
                className="px-5 py-2 rounded-xl bg-white text-black font-bold text-xs flex items-center gap-2 hover:bg-slate-200 disabled:opacity-40 transition-colors"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Creating Track...
                  </>
                ) : (
                  <>
                    Create as Draft <Rocket className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
