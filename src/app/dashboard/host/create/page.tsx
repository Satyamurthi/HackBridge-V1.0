"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Award,
  QrCode,
  Upload,
  Sparkles,
  Download,
  Copy,
  Check,
  RefreshCw,
  Image as ImageIcon,
  Clock,
  Phone,
  Mail,
} from "lucide-react";
import { isValidUpiId, generateUpiQrCode, readQrImageFile } from "@/lib/upi-qr";

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
  registrationDeadline: string;
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
  qrImageUrl: string;
  qrMode: "AUTOGEN" | "UPLOAD";
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

  const [authLoading, setAuthLoading] = useState(true);
  const [userSession, setUserSession] = useState<any>(null);
  const [hostProfile, setHostProfile] = useState<any>(null);

  const checkHostStatus = async () => {
    setAuthLoading(true);
    try {
      const res = await fetch("/api/v1/auth/me");
      if (res.ok) {
        const json = await res.json();
        if (json?.user) {
          setUserSession(json.user);
          setHostProfile(json.user.hostProfile || null);
        }
      }
    } catch (err) {
      console.error("Error fetching user session:", err);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    checkHostStatus();
  }, []);

  const [generatingQr, setGeneratingQr] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [data, setData] = useState<WizardData>({
    title: "",
    description: "",
    prizePool: "",
    registrationDeadline: "",
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
    qrImageUrl: "",
    qrMode: "AUTOGEN",
    rubricCriteria: [
      { name: "1. Understand the Problem Statement", weight: 1.0, maxScore: 10 },
      { name: "2. Approach to solve the problem", weight: 1.0, maxScore: 10 },
      { name: "3. Requirement Specification document", weight: 1.0, maxScore: 10 },
      { name: "4. Architecture Diagram(Design)", weight: 1.0, maxScore: 10 },
      { name: "5. Development to Solve Problem", weight: 1.0, maxScore: 10 },
      { name: "6. Test case-Testing", weight: 1.0, maxScore: 10 },
      { name: "7. Ready for Deployment", weight: 1.0, maxScore: 10 },
      { name: "8. PPT-Presentation - Starting to End (Last Slide - Team Members Photos)", weight: 1.0, maxScore: 10 },
      { name: "9. Novelty - Best Approach to solve problem - overall", weight: 2.0, maxScore: 20 },
    ],
  });

  const set = <K extends keyof WizardData>(key: K, val: WizardData[K]) =>
    setData((prev) => ({ ...prev, [key]: val }));

  // Auto-generate QR code whenever upiId, fee, or title changes in AUTOGEN mode
  useEffect(() => {
    if (data.paymentMode !== "QR" || data.qrMode !== "AUTOGEN") return;

    const trimmedUpi = data.upiId.trim();
    if (!trimmedUpi || !isValidUpiId(trimmedUpi)) {
      if (data.qrImageUrl) {
        set("qrImageUrl", "");
      }
      return;
    }

    let isMounted = true;
    setGeneratingQr(true);

    generateUpiQrCode({
      upiId: trimmedUpi,
      payeeName: data.title ? `${data.title} Organizer` : "Hackathon Organizer",
      amount: data.fee > 0 ? data.fee : undefined,
      note: `${data.title || "Hackathon"} Entry Fee`,
    })
      .then((qrUrl) => {
        if (isMounted) {
          set("qrImageUrl", qrUrl);
        }
      })
      .catch((err) => {
        console.error("[CreateHackathon] Failed to auto-generate UPI QR:", err);
      })
      .finally(() => {
        if (isMounted) setGeneratingQr(false);
      });

    return () => {
      isMounted = false;
    };
  }, [data.paymentMode, data.qrMode, data.upiId, data.fee, data.title]);

  const handleQrFileUpload = async (file: File) => {
    setUploadError(null);
    try {
      const dataUrl = await readQrImageFile(file);
      set("qrImageUrl", dataUrl);
    } catch (err: any) {
      setUploadError(err.message || "Failed to read image file.");
    }
  };

  const copyUpiId = () => {
    if (!data.upiId) return;
    navigator.clipboard.writeText(data.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const downloadQrCode = () => {
    if (!data.qrImageUrl) return;
    const a = document.createElement("a");
    a.href = data.qrImageUrl;
    a.download = `hackbridge-upi-qr-${(data.title || "hackathon").toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 30)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

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
    if (step === 1) {
      if (!data.title || !data.description || !data.startAt || !data.endAt || !data.registrationDeadline) return false;
      const start = new Date(data.startAt).getTime();
      const end = new Date(data.endAt).getTime();
      const reg = new Date(data.registrationDeadline).getTime();
      if (end <= start) return false;
      if (reg > start) return false;
      return true;
    }
    if (step === 2) return data.rules.length >= 10;
    if (step === 3)
      return data.domains.every(
        (d) => d.name && d.revealAt && d.problemStatements.every((ps) => ps.title)
      );
    if (step === 4) {
      if (data.teamMin < 1 || data.teamMax < data.teamMin) return false;
      if (data.paymentMode !== "FREE") {
        if (!data.fee || data.fee <= 0) return false;
      }
      if (data.paymentMode === "QR") {
        const cleanUpi = data.upiId.trim();
        if (!cleanUpi || !isValidUpiId(cleanUpi)) return false;
        if (!data.qrImageUrl || !data.qrImageUrl.trim()) return false;
      }
      return true;
    }
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field
          label="Registration End Time"
          hint="Declared by Host: Students can register until this declared date & time."
        >
          <input
            type="datetime-local"
            required
            value={data.registrationDeadline}
            max={data.startAt || undefined}
            onChange={(e) => set("registrationDeadline", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Start Date & Time" hint="Server time (UTC+5:30 IST)">
          <input
            type="datetime-local"
            required
            value={data.startAt}
            onChange={(e) => set("startAt", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="End Date & Time" hint="When the hackathon concludes.">
          <input
            type="datetime-local"
            required
            value={data.endAt}
            min={data.startAt}
            onChange={(e) => set("endAt", e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="p-3.5 rounded-2xl bg-[#6366F1]/10 border border-[#6366F1]/30 text-xs font-mono text-[#818CF8] flex items-start gap-2.5">
        <Clock className="w-4 h-4 text-[#6366F1] shrink-0 mt-0.5" />
        <div className="space-y-0.5 text-[11px] leading-relaxed">
          <span className="font-bold text-white">Registration Window Policy:</span>
          <p className="text-slate-300">
            Student squad registrations remain strictly open until your declared <strong className="text-white">Registration End Time</strong>. Once this deadline passes, registrations automatically lock and no new squads can register.
          </p>
        </div>
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
              <Field label="Problem Unlock Time (HH:MM:SS)" hint="Server clock — problems unlock at this exact time in HH:MM:SS format.">
                <input
                  type="datetime-local"
                  value={domain.revealAt}
                  onChange={(e) => updateDomain(di, "revealAt", e.target.value)}
                  className={inputCls}
                />
                {domain.revealAt && (
                  <div className="text-[10px] font-mono text-[#818CF8] mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#6366F1]" />
                    <span>
                      Unlock Time: <strong className="text-white">{new Date(domain.revealAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })} IST</strong> (HH:MM:SS)
                    </span>
                  </div>
                )}
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
  const isUpiValid = isValidUpiId(data.upiId);

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
          label="Registration Fee (INR) *"
          hint="Amount students must pay to register their team (min ₹1)."
        >
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">
              ₹
            </span>
            <input
              type="number"
              min={1}
              value={data.fee || ""}
              onChange={(e) => set("fee", Number(e.target.value))}
              placeholder="299"
              className={`${inputCls} pl-8`}
            />
          </div>
        </Field>
      )}

      {/* QR Transfer Flow: Compulsory UPI ID & Compulsory QR Code (Autogen or Custom Upload) */}
      {data.paymentMode === "QR" && (
        <div className="space-y-6 pt-2">
          {/* Section 1: Compulsory UPI ID */}
          <div className="p-5 rounded-2xl bg-[#030407]/60 border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-2">
                <span>Receiving UPI ID (Compulsory) *</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/30">
                  Required
                </span>
              </label>
              {data.upiId && (
                <span className="text-[10px] font-mono flex items-center gap-1">
                  {isUpiValid ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Valid VPA
                    </span>
                  ) : (
                    <span className="text-red-400">Invalid handle format</span>
                  )}
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                value={data.upiId}
                onChange={(e) => set("upiId", e.target.value)}
                placeholder="e.g. acm.chapter@oksbi or eventcouncil@upi"
                className={`${inputCls} font-mono text-xs pr-10 ${
                  data.upiId && !isUpiValid
                    ? "border-red-500/50 focus:border-red-500"
                    : isUpiValid
                    ? "border-emerald-500/40 focus:border-emerald-500"
                    : ""
                }`}
              />
              {isUpiValid && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400">
                  <Check className="w-4 h-4" />
                </div>
              )}
            </div>

            <p className="text-[10px] font-mono text-slate-400">
              Students will make direct payments to this verified UPI ID. Must follow standard Virtual Payment Address format (e.g. <span className="text-slate-300">username@bank</span>).
            </p>
          </div>

          {/* Section 2: Compulsory QR Code with Dual Options */}
          <div className="p-5 rounded-2xl bg-[#030407]/60 border border-white/[0.08] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-[#818CF8]" />
                  <span>Payment QR Code (Compulsory) *</span>
                </label>
                <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                  Choose how to provide the payment QR code for registered student teams.
                </p>
              </div>

              {/* Dual Mode Switcher Tabs */}
              <div className="flex items-center gap-1 bg-[#111524] p-1 rounded-xl border border-white/[0.06] self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => set("qrMode", "AUTOGEN")}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-semibold flex items-center gap-1.5 transition-all ${
                    data.qrMode === "AUTOGEN"
                      ? "bg-[#6366F1] text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Sparkles className="w-3 h-3" /> Auto-Generate
                </button>
                <button
                  type="button"
                  onClick={() => set("qrMode", "UPLOAD")}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-semibold flex items-center gap-1.5 transition-all ${
                    data.qrMode === "UPLOAD"
                      ? "bg-[#6366F1] text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Upload className="w-3 h-3" /> Upload Custom
                </button>
              </div>
            </div>

            {/* Hidden file input for custom QR upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleQrFileUpload(file);
              }}
            />

            {/* Mode 1: Auto-Generate Live Preview */}
            {data.qrMode === "AUTOGEN" && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  {isUpiValid ? (
                    <div className="flex flex-col sm:flex-row items-center gap-5">
                      {/* Crisp QR Frame */}
                      <div className="relative group flex-shrink-0">
                        <div className="w-44 h-44 bg-white p-2.5 rounded-2xl shadow-xl flex items-center justify-center border border-white/20">
                          {generatingQr ? (
                            <div className="flex flex-col items-center justify-center text-slate-800 text-xs font-mono gap-2">
                              <RefreshCw className="w-6 h-6 animate-spin text-[#6366F1]" />
                              <span>Generating...</span>
                            </div>
                          ) : data.qrImageUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={data.qrImageUrl}
                              alt="Auto-generated UPI QR Code"
                              className="w-full h-full object-contain rounded-lg"
                            />
                          ) : (
                            <QrCode className="w-16 h-16 text-slate-400 animate-pulse" />
                          )}
                        </div>
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[#6366F1] text-[9px] font-mono text-white font-bold whitespace-nowrap shadow-md flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" /> Auto-Generated
                        </div>
                      </div>

                      {/* QR Metadata & Actions */}
                      <div className="flex-1 space-y-3 text-left">
                        <div>
                          <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            <Check className="w-3 h-3" /> Ready for Direct Scans
                          </div>
                          <div className="text-xs text-white font-semibold mt-1">
                            NPCI UPI Dynamic Deep-Link QR
                          </div>
                          <p className="text-[11px] font-mono text-slate-400 mt-1 leading-relaxed">
                            Encodes payment to <strong className="text-slate-200">{data.upiId}</strong> for amount <strong className="text-emerald-400">₹{data.fee || 0}</strong>. Students scanning in PhonePe, GPay, or Paytm get pre-filled transaction data.
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={copyUpiId}
                            className="px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-slate-300 text-[10px] font-mono flex items-center gap-1.5 transition-colors"
                          >
                            {copiedUpi ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            {copiedUpi ? "Copied" : "Copy UPI ID"}
                          </button>
                          <button
                            type="button"
                            onClick={downloadQrCode}
                            disabled={!data.qrImageUrl}
                            className="px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-slate-300 text-[10px] font-mono flex items-center gap-1.5 transition-colors disabled:opacity-40"
                          >
                            <Download className="w-3 h-3" /> Download PNG
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 px-4 text-center space-y-2">
                      <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-slate-400">
                        <QrCode className="w-6 h-6" />
                      </div>
                      <div className="text-xs font-mono text-slate-300 font-semibold">
                        Awaiting Valid UPI ID
                      </div>
                      <p className="text-[11px] font-mono text-slate-500 max-w-sm mx-auto">
                        Type your compulsory UPI ID in the field above (e.g. <span className="text-slate-400">organizer@okhdfcbank</span>). Your QR code will generate instantly!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mode 2: Custom QR Upload */}
            {data.qrMode === "UPLOAD" && (
              <div className="space-y-3">
                {data.qrImageUrl ? (
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row items-center gap-5">
                    {/* Custom Image Frame */}
                    <div className="relative group flex-shrink-0">
                      <div className="w-44 h-44 bg-white p-2 rounded-2xl shadow-xl flex items-center justify-center border border-white/20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={data.qrImageUrl}
                          alt="Custom Merchant QR"
                          className="w-full h-full object-contain rounded-lg"
                        />
                      </div>
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-emerald-600 text-[9px] font-mono text-white font-bold whitespace-nowrap shadow-md flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" /> Custom QR Active
                      </div>
                    </div>

                    <div className="flex-1 space-y-3 text-left">
                      <div>
                        <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                          Custom QR Code Attached
                        </div>
                        <div className="text-xs text-white font-semibold mt-1">
                          Official Institutional QR Image
                        </div>
                        <p className="text-[11px] font-mono text-slate-400 mt-1 leading-relaxed">
                          This image will be displayed on the student registration and payment screen. Teams will scan this exact image to complete their registration.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-white text-[11px] font-mono flex items-center gap-1.5 transition-colors"
                        >
                          <Upload className="w-3 h-3" /> Replace Image
                        </button>
                        <button
                          type="button"
                          onClick={() => set("qrImageUrl", "")}
                          className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-[11px] font-mono transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleQrFileUpload(file);
                    }}
                    className="p-8 rounded-xl bg-white/[0.01] border-2 border-dashed border-white/10 hover:border-[#6366F1]/50 cursor-pointer text-center space-y-3 transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center mx-auto text-[#818CF8] group-hover:scale-105 transition-transform">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs font-mono text-white font-semibold">
                        Click to browse or drag &amp; drop QR Code image
                      </div>
                      <p className="text-[10px] font-mono text-slate-500 mt-1">
                        PNG, JPG, or WebP merchant QR image (max 5MB)
                      </p>
                    </div>
                  </div>
                )}

                {uploadError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 font-mono flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {uploadError}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Validation Checklist Card */}
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
            <div className="flex items-center gap-4">
              <span className={`flex items-center gap-1 ${data.fee > 0 ? "text-emerald-400" : "text-amber-400"}`}>
                {data.fee > 0 ? <Check className="w-3.5 h-3.5" /> : "○"} Fee: ₹{data.fee || 0}
              </span>
              <span className={`flex items-center gap-1 ${isUpiValid ? "text-emerald-400" : "text-amber-400"}`}>
                {isUpiValid ? <Check className="w-3.5 h-3.5" /> : "○"} UPI ID: {isUpiValid ? "Verified" : "Compulsory"}
              </span>
              <span className={`flex items-center gap-1 ${Boolean(data.qrImageUrl) ? "text-emerald-400" : "text-amber-400"}`}>
                {Boolean(data.qrImageUrl) ? <Check className="w-3.5 h-3.5" /> : "○"} QR Code: {Boolean(data.qrImageUrl) ? (data.qrMode === "AUTOGEN" ? "Auto-Generated" : "Uploaded") : "Compulsory"}
              </span>
            </div>
            {(!isUpiValid || !data.qrImageUrl || data.fee <= 0) && (
              <span className="text-amber-400/90 text-[10px]">
                Complete both UPI ID &amp; QR Code to continue
              </span>
            )}
          </div>
        </div>
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
      <div className="p-3.5 rounded-2xl bg-[#6366F1]/10 border border-[#6366F1]/30 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-[#818CF8] font-bold">
          <Award className="w-4 h-4 text-[#6366F1]" />
          <span>Single Unified Rubric for All Phases (v5.0 Architecture)</span>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/30">
          One Rubric · All 4 Phases
        </span>
      </div>
      <p className="text-[11px] font-mono text-slate-400 leading-relaxed">
        Define judging criteria and their weights. In HackBridge v5.0, there is only one unified rubric for all phases. Judges move across Phase 1 to Phase 4 deliverables in the evaluator portal while scoring each squad against this single scorecard.
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

  if (authLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <RefreshCw className="w-8 h-8 text-[#6366F1] animate-spin mb-3" />
        <p className="text-xs font-mono text-[#94A3B8]">Verifying host authorization...</p>
      </div>
    );
  }

  if (!userSession || userSession.role !== "HOST") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[60vh] bg-transparent">
        <div className="w-12 h-12 rounded-xl bg-[#0B0E18]/70 border border-white/[0.08] shadow-sm flex items-center justify-center mb-4">
          <Building2 className="w-6 h-6 text-[#6366F1]" />
        </div>
        <h1 className="font-display text-xl font-extrabold text-[#F8FAFC] mb-2 tracking-tight">Host Authorization Required</h1>
        <p className="text-sm text-[#94A3B8] mb-6 max-w-sm">
          Please authenticate with an approved Host account to create and host hackathons.
        </p>
        <Link href="/login" className="px-5 py-2.5 rounded-xl bg-[#6366F1] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#4F46E5] shadow-sm transition-all">
          Host Sign In
        </Link>
      </div>
    );
  }

  if (hostProfile?.approvalStatus !== "APPROVED") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 min-h-[70vh] bg-transparent text-[#F8FAFC]">
        <div className="max-w-xl w-full p-8 sm:p-10 rounded-3xl bg-[#0B0E18]/70 backdrop-blur-md border border-amber-500/30 shadow-2xl space-y-6 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] font-mono text-amber-300 font-bold">
              <span>STATUS: WAITING FOR ADMIN APPROVAL</span>
            </div>
            <h1 className="font-display text-2xl font-extrabold text-[#F8FAFC]">
              Waiting for Admin Approval
            </h1>
            <p className="text-sm text-[#94A3B8] leading-relaxed max-w-md mx-auto">
              If admin approves, then only you can access or host the hackathon. Your host registration for <strong className="text-white">{hostProfile?.orgName || "your organization"}</strong> is awaiting admin verification.
            </p>
          </div>

          {/* Contact Admin Notice Card */}
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-left space-y-3 font-mono">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
              <Phone className="w-4 h-4 text-amber-400" />
              <span>Contact Admin For Fast Approval</span>
            </div>
            <p className="text-xs text-amber-200/90 leading-relaxed">
              Waiting for admin approval. Contact <a href="tel:9380968402" className="text-white font-bold underline hover:text-[#818CF8]">9380968402</a> Or <a href="mailto:admin@hackbridge.dev" className="text-white font-bold underline hover:text-[#818CF8]">Admin</a> to approve your host credentials and unlock hackathon creation.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href="tel:9380968402"
                className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-bold border border-amber-500/40 transition-colors flex items-center gap-2"
              >
                📞 Call 9380968402
              </a>
              <a
                href={`https://wa.me/919380968402?text=${encodeURIComponent(`Hello Admin, my host account for "${hostProfile?.orgName || 'Host'}" is waiting for admin approval. Please approve my account to create hackathons.`)}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/40 transition-colors flex items-center gap-2"
              >
                💬 WhatsApp Admin
              </a>
              <a
                href={`mailto:admin@hackbridge.dev?subject=${encodeURIComponent(`Host Approval Request - ${hostProfile?.orgName || 'Host'}`)}`}
                className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-bold border border-white/10 transition-colors flex items-center gap-2"
              >
                ✉️ Email Admin
              </a>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs font-mono text-[#94A3B8] text-left space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[#64748B]">Organisation:</span>
              <span className="text-white font-bold">{hostProfile?.orgName || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">HACK ID:</span>
              <span className="text-[#818CF8] font-bold">{hostProfile?.hackId || userSession?.hackathonId || "PENDING"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Representative:</span>
              <span className="text-white">{userSession?.name} ({userSession?.email})</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={checkHostStatus}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Check Approval Status
            </button>
            <Link
              href="/dashboard/host"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white font-semibold text-xs uppercase tracking-wider transition-colors text-center"
            >
              Back to Host Console
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
