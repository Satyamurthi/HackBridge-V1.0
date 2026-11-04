"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Layers,
  Scale,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Save,
  QrCode,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  FileText,
  Rocket,
  Lock,
  Unlock,
  Archive,
  Eye,
  AlertTriangle,
  Award,
  ArrowUp,
  ArrowDown,
  Users,
  UserPlus,
  Mail,
  Phone,
  GraduationCap,
  Search,
  X,
  CreditCard,
  Download,
  Upload,
  Zap,
  EyeOff,
  Send,
} from "lucide-react";
import { generateUpiQrCode, isValidUpiId, readQrImageFile } from "@/lib/upi-qr";

interface ProblemStatementItem {
  id?: string;
  title: string;
  description: string;
  difficulty: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  cap: number;
}

interface DomainItem {
  id: string;
  name: string;
  description?: string | null;
  revealAt: string;
  unlockTimeHHMMSS?: string;
  countdownHHMMSS?: string;
  problemStatements: ProblemStatementItem[];
}

interface RubricCriterionItem {
  id?: string;
  name: string;
  weight: number;
  maxScore: number;
}

export default function EditHackathonPage() {
  const params = useParams();
  const router = useRouter();
  const hackathonId = params?.id as string;

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Active edit tab
  const [activeTab, setActiveTab] = useState<
    | "basics"
    | "rules"
    | "schedule"
    | "teams"
    | "domains"
    | "rubrics"
    | "squads"
    | "judges"
    | "payment_setup"
    | "payment_queue"
  >("basics");

  // Payments & Verification states
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [paymentsFilter, setPaymentsFilter] = useState<"ALL" | "PENDING" | "VERIFIED" | "REJECTED">("ALL");
  const [utrInputs, setUtrInputs] = useState<Record<string, string>>({});
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [verifyingPaymentId, setVerifyingPaymentId] = useState<string | null>(null);
  const [previewScreenshotUrl, setPreviewScreenshotUrl] = useState<string | null>(null);
  const [paymentActionMsg, setPaymentActionMsg] = useState<string | null>(null);
  const [paymentActionErr, setPaymentActionErr] = useState<string | null>(null);

  // Excel export loading state
  const [exportingType, setExportingType] = useState<string | null>(null);

  // Payment Setup credentials state
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [razorpayKeySecret, setRazorpayKeySecret] = useState("");
  const [showRazorpaySecret, setShowRazorpaySecret] = useState(false);
  const [testingRazorpay, setTestingRazorpay] = useState(false);
  const [razorpayTestResult, setRazorpayTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [savingPaymentSetup, setSavingPaymentSetup] = useState(false);
  const [paymentSetupMsg, setPaymentSetupMsg] = useState<string | null>(null);
  const [paymentSetupErr, setPaymentSetupErr] = useState<string | null>(null);
  const [qrMode, setQrMode] = useState<"AUTOGEN" | "UPLOAD">("AUTOGEN");
  const [uploadingQr, setUploadingQr] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    status: "DRAFT",
    rules: "",
    rulesGate: false,
    teamMin: 1,
    teamMax: 4,
    fee: 0,
    paymentMode: "FREE",
    upiId: "",
    qrImageUrl: "",
    prizePool: "",
    bannerUrl: "",
    registrationDeadline: "",
    startAt: "",
    revealAt: "",
    endAt: "",
    part1Due: "",
    part2Due: "",
    part3Due: "",
    part4Due: "",
    githubOrgRepo: "",
  });

  const [domains, setDomains] = useState<DomainItem[]>([]);
  const [rubricCriteria, setRubricCriteria] = useState<RubricCriterionItem[]>([]);
  const [copiedUpi, setCopiedUpi] = useState(false);

  const DEFAULT_9_RUBRICS: RubricCriterionItem[] = [
    { name: "1. Understand the Problem Statement", weight: 1.0, maxScore: 10 },
    { name: "2. Approach to solve the problem", weight: 1.0, maxScore: 10 },
    { name: "3. Requirement Specification document", weight: 1.0, maxScore: 10 },
    { name: "4. Architecture Diagram(Design)", weight: 1.0, maxScore: 10 },
    { name: "5. Development to Solve Problem", weight: 1.0, maxScore: 10 },
    { name: "6. Test case-Testing", weight: 1.0, maxScore: 10 },
    { name: "7. Ready for Deployment", weight: 1.0, maxScore: 10 },
    { name: "8. PPT-Presentation - Starting to End (Last Slide - Team Members Photos)", weight: 1.0, maxScore: 10 },
    { name: "9. Novelty - Best Approach to solve problem - overall", weight: 2.0, maxScore: 20 },
  ];

  const addRubricCriterion = () => {
    setRubricCriteria((prev) => [
      ...prev,
      {
        name: `${prev.length + 1}. `,
        weight: 1.0,
        maxScore: 10,
      },
    ]);
  };

  const updateRubricCriterion = (
    index: number,
    field: keyof RubricCriterionItem,
    val: any
  ) => {
    setRubricCriteria((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: val } : c))
    );
  };

  const removeRubricCriterion = (index: number) => {
    setRubricCriteria((prev) => prev.filter((_, i) => i !== index));
  };

  const moveRubricCriterion = (index: number, direction: "up" | "down") => {
    setRubricCriteria((prev) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const applyDefault9Rubrics = () => {
    setRubricCriteria(DEFAULT_9_RUBRICS);
  };

  const totalDeclaredMarks = rubricCriteria.reduce(
    (sum, c) => sum + (Number(c.maxScore) || 0),
    0
  );

  // Teams & Students states
  const [teamsList, setTeamsList] = useState<any[]>([]);
  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  const [addTeamModalOpen, setAddTeamModalOpen] = useState(false);
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamLeadId, setNewTeamLeadId] = useState("");
  const [newTeamMemberIds, setNewTeamMemberIds] = useState<string[]>([""]);
  const [newTeamDomainId, setNewTeamDomainId] = useState("");
  const [newTeamPsId, setNewTeamPsId] = useState("");
  const [teamActionMsg, setTeamActionMsg] = useState<string | null>(null);
  const [teamActionErr, setTeamActionErr] = useState<string | null>(null);
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);

  // Judges states
  const [judgesList, setJudgesList] = useState<any[]>([]);
  const [availableJudges, setAvailableJudges] = useState<any[]>([]);
  const [addJudgeModalOpen, setAddJudgeModalOpen] = useState(false);
  const [addingJudge, setAddingJudge] = useState(false);
  const [judgeMode, setJudgeMode] = useState<"EXISTING" | "NEW">("EXISTING");
  const [selectedExistingJudgeId, setSelectedExistingJudgeId] = useState("");
  const [newJudgeName, setNewJudgeName] = useState("");
  const [newJudgeEmail, setNewJudgeEmail] = useState("");
  const [newJudgePassword, setNewJudgePassword] = useState("JudgeKey#2026");
  const [newJudgeDesignation, setNewJudgeDesignation] = useState("");
  const [newJudgeCompany, setNewJudgeCompany] = useState("");
  const [newJudgeDomain, setNewJudgeDomain] = useState("");
  const [judgeActionMsg, setJudgeActionMsg] = useState<string | null>(null);
  const [judgeActionErr, setJudgeActionErr] = useState<string | null>(null);
  const [deletingJudgeId, setDeletingJudgeId] = useState<string | null>(null);

  // Domain edit modal/state
  const [editingDomain, setEditingDomain] = useState<DomainItem | null>(null);
  const [isNewDomain, setIsNewDomain] = useState(false);
  const [domainModalOpen, setDomainModalOpen] = useState(false);

  // Problem statement edit modal/state
  const [psModalOpen, setPsModalOpen] = useState(false);
  const [selectedDomainForPs, setSelectedDomainForPs] = useState<string | null>(null);
  const [editingPs, setEditingPs] = useState<ProblemStatementItem | null>(null);
  const [isNewPs, setIsNewPs] = useState(false);

  // Live timer ticker for countdowns
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format date helper for datetime-local
  const toLocalISO = (dateStr?: string | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    return localISOTime;
  };

  const loadData = useCallback(async () => {
    if (!hackathonId) return;
    try {
      const [meRes, hRes, teamsRes, judgesRes, allJudgesRes, paymentsRes, setupRes] = await Promise.all([
        fetch("/api/v1/auth/me"),
        fetch(`/api/v1/hackathons/${hackathonId}`),
        fetch(`/api/v1/host/teams?hackathonId=${hackathonId}`),
        fetch(`/api/v1/host/judges?hackathonId=${hackathonId}`),
        fetch("/api/v1/host/judges?allJudges=true"),
        fetch(`/api/v1/host/payments?hackathonId=${hackathonId}`),
        fetch("/api/v1/host/payments-setup"),
      ]);

      if (meRes.ok) {
        const d = await meRes.json();
        setSession(d?.user || null);
      }

      if (hRes.ok) {
        const d = await hRes.json();
        const h = d.hackathon;
        if (h) {
          const defaultRevealAt = h.domains?.[0]?.revealAt || h.startAt;
          setFormData({
            title: h.title || "",
            slug: h.slug || "",
            description: h.description || "",
            status: h.status || "DRAFT",
            rules: h.rules || "",
            rulesGate: Boolean(h.rulesGate),
            teamMin: h.teamMin || 1,
            teamMax: h.teamMax || 4,
            fee: h.fee || 0,
            paymentMode: h.paymentMode || "FREE",
            upiId: h.upiId || "",
            qrImageUrl: h.qrImageUrl || "",
            prizePool: h.prizePool || "",
            bannerUrl: h.bannerUrl || "",
            registrationDeadline: toLocalISO(h.registrationDeadline),
            startAt: toLocalISO(h.startAt),
            revealAt: toLocalISO(defaultRevealAt),
            endAt: toLocalISO(h.endAt),
            part1Due: toLocalISO(h.part1Due),
            part2Due: toLocalISO(h.part2Due),
            part3Due: toLocalISO(h.part3Due),
            part4Due: toLocalISO(h.part4Due),
            githubOrgRepo: h.githubOrgRepo || "",
          });
          setDomains(h.domains || []);
          setRubricCriteria(h.rubricCriteria || []);
        }
      } else {
        const err = await hRes.json();
        setErrorMsg(err.error || "Failed to load hackathon data");
      }

      if (teamsRes.ok) {
        const td = await teamsRes.json();
        setTeamsList(td.teams || []);
      }

      if (judgesRes.ok) {
        const jd = await judgesRes.json();
        setJudgesList(jd.judges || []);
      }

      if (allJudgesRes.ok) {
        const ajd = await allJudgesRes.json();
        setAvailableJudges(ajd.availableJudges || []);
      }

      if (paymentsRes.ok) {
        const pd = await paymentsRes.json();
        const pList = pd.payments || [];
        setPaymentsList(pList);
        const map: Record<string, string> = {};
        pList.forEach((p: any) => {
          map[p.id] = p.txnRef || "";
        });
        setUtrInputs(map);
      }

      if (setupRes.ok) {
        const sd = await setupRes.json();
        if (sd?.setup) {
          setRazorpayKeyId(sd.setup.razorpayKeyId || "");
        }
      }
    } catch {
      setErrorMsg("Network error loading hackathon");
    } finally {
      setLoading(false);
    }
  }, [hackathonId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-generate QR code whenever upiId or fee changes in AUTOGEN mode
  useEffect(() => {
    if (qrMode !== "AUTOGEN") return;
    const cleanUpi = formData.upiId?.trim();
    if (!cleanUpi || !isValidUpiId(cleanUpi)) return;
    generateUpiQrCode({
      upiId: cleanUpi,
      payeeName: formData.title || "HackBridge Arena",
      amount: formData.fee > 0 ? formData.fee : undefined,
      note: `Hackathon Entry: ${formData.title.slice(0, 30)}`,
    }).then((dataUrl) => {
      setFormData((prev) => ({ ...prev, qrImageUrl: dataUrl }));
    }).catch(() => {});
  }, [formData.upiId, formData.fee, formData.title, qrMode]);

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingQr(true);
    setPaymentSetupErr(null);
    try {
      const dataUrl = await readQrImageFile(file);
      setFormData((prev) => ({ ...prev, qrImageUrl: dataUrl }));
      setQrMode("UPLOAD");
      setPaymentSetupMsg("Custom QR image loaded successfully.");
    } catch (err: any) {
      setPaymentSetupErr(err.message || "Failed to process image file.");
    } finally {
      setUploadingQr(false);
    }
  };

  const handleVerifyPayment = async (paymentId: string, action: "APPROVE" | "REJECT" | "UPDATE_UTR") => {
    setVerifyingPaymentId(paymentId);
    setPaymentActionMsg(null);
    setPaymentActionErr(null);
    try {
      const utr = utrInputs[paymentId]?.trim() || "";
      const reason = rejectionReasons[paymentId]?.trim() || "";
      const res = await fetch(`/api/v1/host/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          utrNumber: utr,
          rejectionReason: reason,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPaymentActionMsg(data.message || `Payment ${action.toLowerCase()} processed successfully.`);
        // Reload payments and squads
        const [pRes, tRes] = await Promise.all([
          fetch(`/api/v1/host/payments?hackathonId=${hackathonId}`),
          fetch(`/api/v1/host/teams?hackathonId=${hackathonId}`),
        ]);
        if (pRes.ok) {
          const pd = await pRes.json();
          setPaymentsList(pd.payments || []);
        }
        if (tRes.ok) {
          const td = await tRes.json();
          setTeamsList(td.teams || []);
        }
      } else {
        setPaymentActionErr(data.error || "Failed to process payment verification.");
      }
    } catch {
      setPaymentActionErr("Network error while updating payment status.");
    } finally {
      setVerifyingPaymentId(null);
    }
  };

  const handleExportExcel = async (type: "participants" | "judges" | "payments" | "all") => {
    setExportingType(type);
    try {
      const res = await fetch(`/api/v1/host/hackathons/${hackathonId}/export?type=${type}`);
      if (!res.ok) {
        alert("Failed to export Excel report.");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${formData.slug || "hackathon"}_${type}_export.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert("Error downloading Excel report.");
    } finally {
      setExportingType(null);
    }
  };

  const handleSavePaymentSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPaymentSetup(true);
    setPaymentSetupMsg(null);
    setPaymentSetupErr(null);
    try {
      const [setupRes, hackRes] = await Promise.all([
        fetch("/api/v1/host/payments-setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpayKeyId,
            razorpayKeySecret,
            upiId: formData.upiId,
            qrImageUrl: formData.qrImageUrl,
          }),
        }),
        fetch(`/api/v1/hackathons/${hackathonId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fee: formData.fee,
            paymentMode: formData.paymentMode,
            upiId: formData.upiId,
            qrImageUrl: formData.qrImageUrl,
          }),
        }),
      ]);

      if (setupRes.ok && hackRes.ok) {
        setPaymentSetupMsg("Payment setup and credentials saved successfully!");
      } else {
        const err = await hackRes.json().catch(() => ({}));
        setPaymentSetupErr(err.error || "Failed to save payment configuration.");
      }
    } catch {
      setPaymentSetupErr("Network error while saving payment configuration.");
    } finally {
      setSavingPaymentSetup(false);
    }
  };

  const handleTestRazorpay = async () => {
    setTestingRazorpay(true);
    setRazorpayTestResult(null);
    try {
      const res = await fetch("/api/v1/host/payments-setup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyId: razorpayKeyId,
          keySecret: razorpayKeySecret,
        }),
      });
      const d = await res.json();
      if (res.ok && d.success) {
        setRazorpayTestResult({ success: true, message: d.message || "Razorpay API credentials authenticated!" });
      } else {
        setRazorpayTestResult({ success: false, message: d.error || "Authentication failed. Check your API Key ID and Secret." });
      }
    } catch {
      setRazorpayTestResult({ success: false, message: "Network error testing Razorpay credentials." });
    } finally {
      setTestingRazorpay(false);
    }
  };

  // Squad management handlers
  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`Are you sure you want to delete squad "${teamName}"? This will cancel their registration and release the students' IDs.`)) {
      return;
    }
    setDeletingTeamId(teamId);
    setTeamActionErr(null);
    setTeamActionMsg(null);
    try {
      const res = await fetch(`/api/v1/teams/${teamId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setTeamActionErr(data.error || "Failed to delete squad");
        return;
      }
      setTeamActionMsg(`Squad "${teamName}" has been successfully deleted.`);
      setTimeout(() => setTeamActionMsg(null), 4000);
      await loadData();
    } catch {
      setTeamActionErr("Network error while deleting squad");
    } finally {
      setDeletingTeamId(null);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) {
      setTeamActionErr("Please enter a squad name.");
      return;
    }
    if (!newTeamLeadId.trim()) {
      setTeamActionErr("Please enter the Lead Student ID (e.g. HB-XXXXXX or student email).");
      return;
    }
    setCreatingTeam(true);
    setTeamActionErr(null);
    setTeamActionMsg(null);
    try {
      const payload = {
        hackathonId,
        teamName: newTeamName.trim(),
        leadStudentId: newTeamLeadId.trim(),
        memberStudentIds: newTeamMemberIds.map((id) => id.trim()).filter(Boolean),
        domainId: newTeamDomainId || undefined,
        problemStatementId: newTeamPsId || undefined,
      };

      const res = await fetch("/api/v1/host/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setTeamActionErr(data.error || "Failed to add team");
        return;
      }
      setTeamActionMsg(data.message || "Squad successfully created and verified!");
      setAddTeamModalOpen(false);
      setNewTeamName("");
      setNewTeamLeadId("");
      setNewTeamMemberIds([""]);
      setNewTeamDomainId("");
      setNewTeamPsId("");
      setTimeout(() => setTeamActionMsg(null), 4000);
      await loadData();
    } catch {
      setTeamActionErr("Network error creating squad");
    } finally {
      setCreatingTeam(false);
    }
  };

  // Judge management handlers
  const handleDeleteJudge = async (judgeId: string, judgeName: string) => {
    if (!confirm(`Are you sure you want to remove judge "${judgeName}" from this hackathon?`)) {
      return;
    }
    setDeletingJudgeId(judgeId);
    setJudgeActionErr(null);
    setJudgeActionMsg(null);
    try {
      const res = await fetch(`/api/v1/host/judges/${judgeId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setJudgeActionErr(data.error || "Failed to remove judge");
        return;
      }
      setJudgeActionMsg(`Judge "${judgeName}" has been removed from this hackathon.`);
      setTimeout(() => setJudgeActionMsg(null), 4000);
      await loadData();
    } catch {
      setJudgeActionErr("Network error while removing judge");
    } finally {
      setDeletingJudgeId(null);
    }
  };

  const handleAddJudge = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingJudge(true);
    setJudgeActionErr(null);
    setJudgeActionMsg(null);
    try {
      const payload: any = {
        hackathonId,
        designation: newJudgeDesignation.trim() || undefined,
        company: newJudgeCompany.trim() || undefined,
        domain: newJudgeDomain.trim() || undefined,
      };

      if (judgeMode === "EXISTING") {
        if (!selectedExistingJudgeId) {
          setJudgeActionErr("Please select an existing judge from the platform list.");
          setAddingJudge(false);
          return;
        }
        payload.judgeUserId = selectedExistingJudgeId;
      } else {
        if (!newJudgeEmail.trim()) {
          setJudgeActionErr("Please enter the judge email address.");
          setAddingJudge(false);
          return;
        }
        payload.judgeEmail = newJudgeEmail.trim().toLowerCase();
        payload.judgeName = newJudgeName.trim() || undefined;
        payload.password = newJudgePassword || "JudgeKey#2026";
      }

      const res = await fetch("/api/v1/host/judges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setJudgeActionErr(data.error || "Failed to assign judge");
        return;
      }
      setJudgeActionMsg(data.message || "Judge successfully assigned to this hackathon!");
      setAddJudgeModalOpen(false);
      setNewJudgeName("");
      setNewJudgeEmail("");
      setSelectedExistingJudgeId("");
      setNewJudgeDesignation("");
      setNewJudgeCompany("");
      setNewJudgeDomain("");
      setTimeout(() => setJudgeActionMsg(null), 4000);
      await loadData();
    } catch {
      setJudgeActionErr("Network error assigning judge");
    } finally {
      setAddingJudge(false);
    }
  };

  const handleDecisionJudge = async (judgeId: string, action: "APPROVE" | "REJECT") => {
    try {
      const res = await fetch(`/api/v1/host/judges/${judgeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setJudgeActionErr(data.error || "Decision failed");
        return;
      }
      setJudgeActionMsg(data.message);
      setTimeout(() => setJudgeActionMsg(null), 4000);
      await loadData();
    } catch {
      setJudgeActionErr("Network error updating judge");
    }
  };

  // Handle Main Hackathon Form Update
  const handleSaveHackathon = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSaveSuccess(false);

    try {
      const payload: any = {
        title: formData.title.trim(),
        slug: formData.slug.trim(),
        description: formData.description.trim(),
        status: formData.status,
        rules: formData.rules.trim(),
        rulesGate: formData.rulesGate,
        teamMin: Number(formData.teamMin),
        teamMax: Number(formData.teamMax),
        fee: Number(formData.fee),
        paymentMode: formData.paymentMode,
        upiId: formData.upiId?.trim() || null,
        qrImageUrl: formData.qrImageUrl || null,
        prizePool: formData.prizePool?.trim() || null,
        bannerUrl: formData.bannerUrl?.trim() || null,
        registrationDeadline: formData.registrationDeadline
          ? new Date(formData.registrationDeadline).toISOString()
          : null,
        startAt: formData.startAt ? new Date(formData.startAt).toISOString() : null,
        revealAt: formData.revealAt ? new Date(formData.revealAt).toISOString() : null,
        endAt: formData.endAt ? new Date(formData.endAt).toISOString() : null,
        part1Due: formData.part1Due ? new Date(formData.part1Due).toISOString() : null,
        part2Due: formData.part2Due ? new Date(formData.part2Due).toISOString() : null,
        part3Due: formData.part3Due ? new Date(formData.part3Due).toISOString() : null,
        part4Due: formData.part4Due ? new Date(formData.part4Due).toISOString() : null,
        githubOrgRepo: formData.githubOrgRepo?.trim() || null,
        rubricCriteria: rubricCriteria.map((c) => ({
          id: c.id,
          name: c.name.trim(),
          weight: Number(c.weight) || 1.0,
          maxScore: Number(c.maxScore) || 10.0,
        })),
      };

      const res = await fetch(`/api/v1/hackathons/${hackathonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to save hackathon updates");
        return;
      }

      setSaveSuccess(true);
      setInfoMsg("Hackathon configuration saved successfully.");
      setTimeout(() => {
        setSaveSuccess(false);
        setInfoMsg(null);
      }, 4000);
      await loadData();
    } catch {
      setErrorMsg("Network error saving hackathon");
    } finally {
      setSaving(false);
    }
  };

  // Generate NPCI UPI QR on demand
  const handleGenerateQr = async () => {
    if (!formData.upiId || !isValidUpiId(formData.upiId)) {
      setErrorMsg("Please enter a valid UPI ID (e.g. satyu@ptaxis) before generating QR");
      return;
    }
    try {
      const qrDataUrl = await generateUpiQrCode({
        upiId: formData.upiId.trim(),
        payeeName: formData.title || "Hackathon Organizer",
        amount: formData.fee > 0 ? formData.fee : undefined,
        note: `${formData.title.slice(0, 25)} Fee`,
      });
      setFormData((prev) => ({ ...prev, qrImageUrl: qrDataUrl }));
      setInfoMsg("Generated NPCI UPI QR Code successfully.");
      setTimeout(() => setInfoMsg(null), 3000);
    } catch {
      setErrorMsg("Failed to generate QR code");
    }
  };

  // Save / Update Domain
  const handleSaveDomain = async () => {
    if (!editingDomain?.name?.trim()) {
      setErrorMsg("Domain name is required");
      return;
    }
    if (!editingDomain?.revealAt) {
      setErrorMsg("Problem statement unlock time (revealAt) is required");
      return;
    }

    try {
      if (isNewDomain) {
        // Create Domain
        const res = await fetch(`/api/v1/hackathons/${hackathonId}/domains`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editingDomain.name.trim(),
            description: editingDomain.description?.trim() || "",
            revealAt: new Date(editingDomain.revealAt).toISOString(),
            problemStatements: [],
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || "Failed to create domain");
          return;
        }
        setInfoMsg("Domain track added successfully.");
      } else {
        // Update Domain
        const res = await fetch(`/api/v1/hackathons/${hackathonId}/domains`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domainId: editingDomain.id,
            name: editingDomain.name.trim(),
            description: editingDomain.description?.trim() || "",
            revealAt: new Date(editingDomain.revealAt).toISOString(),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || "Failed to update domain");
          return;
        }
        setInfoMsg("Domain track updated successfully.");
      }

      setDomainModalOpen(false);
      setEditingDomain(null);
      await loadData();
      setTimeout(() => setInfoMsg(null), 3000);
    } catch {
      setErrorMsg("Failed to save domain track");
    }
  };

  // Delete Domain
  const handleDeleteDomain = async (domainId: string, domainName: string) => {
    if (!confirm(`Are you sure you want to delete domain track "${domainName}" and all its problem statements?`)) {
      return;
    }
    try {
      const res = await fetch(
        `/api/v1/hackathons/${hackathonId}/domains?domainId=${domainId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to delete domain");
        return;
      }
      setInfoMsg("Domain track removed.");
      await loadData();
      setTimeout(() => setInfoMsg(null), 3000);
    } catch {
      setErrorMsg("Network error deleting domain");
    }
  };

  // Save / Update Problem Statement
  const handleSaveProblemStatement = async () => {
    if (!editingPs?.title?.trim()) {
      setErrorMsg("Problem statement title is required");
      return;
    }
    if (!selectedDomainForPs) {
      setErrorMsg("Domain association is required");
      return;
    }

    try {
      if (isNewPs) {
        const res = await fetch(
          `/api/v1/hackathons/${hackathonId}/problem-statements`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              domainId: selectedDomainForPs,
              title: editingPs.title.trim(),
              description: editingPs.description?.trim() || "",
              difficulty: editingPs.difficulty || "MEDIUM",
              cap: Number(editingPs.cap) || 0,
              attachmentUrl: editingPs.attachmentUrl?.trim() || null,
              attachmentName: editingPs.attachmentName?.trim() || null,
            }),
          }
        );
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || "Failed to add problem statement");
          return;
        }
        setInfoMsg("Problem statement created.");
      } else {
        const res = await fetch(
          `/api/v1/hackathons/${hackathonId}/problem-statements`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              statementId: editingPs.id,
              title: editingPs.title.trim(),
              description: editingPs.description?.trim() || "",
              difficulty: editingPs.difficulty || "MEDIUM",
              cap: Number(editingPs.cap) || 0,
              attachmentUrl: editingPs.attachmentUrl?.trim() || null,
              attachmentName: editingPs.attachmentName?.trim() || null,
            }),
          }
        );
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || "Failed to update problem statement");
          return;
        }
        setInfoMsg("Problem statement updated.");
      }

      setPsModalOpen(false);
      setEditingPs(null);
      await loadData();
      setTimeout(() => setInfoMsg(null), 3000);
    } catch {
      setErrorMsg("Failed to save problem statement");
    }
  };

  // Delete Problem Statement
  const handleDeleteProblemStatement = async (
    statementId: string,
    statementTitle: string
  ) => {
    if (!confirm(`Delete problem statement "${statementTitle}"?`)) return;
    try {
      const res = await fetch(
        `/api/v1/hackathons/${hackathonId}/problem-statements?statementId=${statementId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to delete statement");
        return;
      }
      setInfoMsg("Problem statement deleted.");
      await loadData();
      setTimeout(() => setInfoMsg(null), 3000);
    } catch {
      setErrorMsg("Failed to delete problem statement");
    }
  };

  // Compute countdown in HH:MM:SS format
  const getCountdownHHMMSS = (revealAtStr: string) => {
    const diff = new Date(revealAtStr).getTime() - currentTime;
    if (diff <= 0) return "UNLOCKED";
    const totalSec = Math.floor(diff / 1000);
    const hh = String(Math.floor(totalSec / 3600)).padStart(2, "0");
    const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
    const ss = String(totalSec % 60).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  };

  // Compute unlock time in HH:MM:SS format
  const getUnlockTimeHHMMSS = (revealAtStr: string) => {
    try {
      return new Date(revealAtStr).toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    } catch {
      return "--:--:--";
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 space-y-4">
        <div className="h-24 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse" />
        <div className="h-96 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse" />
      </div>
    );
  }

  if (!session || (session.role !== "HOST" && session.role !== "SUPER_ADMIN")) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center font-mono">
        <ShieldCheck className="w-10 h-10 text-slate-500 mx-auto mb-3" />
        <h1 className="text-xl font-bold text-white mb-2">Host Access Required</h1>
        <p className="text-xs text-slate-400 mb-6">
          You must be logged in as the organizer of this hackathon to edit its details.
        </p>
        <Link
          href="/login"
          className="px-5 py-2.5 rounded-xl bg-[#6366F1] text-white text-xs font-bold uppercase tracking-wider"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const inputCls =
    "w-full bg-[#111524] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-[#F8FAFC] placeholder-slate-500 focus:outline-none focus:border-[#6366F1] font-mono transition-colors";
  const textareaCls =
    "w-full bg-[#111524] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-[#F8FAFC] placeholder-slate-500 focus:outline-none focus:border-[#6366F1] font-mono transition-colors resize-y";

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 w-full space-y-6 text-[#F8FAFC] font-mono">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-white/[0.08] gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#64748B] uppercase tracking-wider">
            <Link
              href="/dashboard/host"
              className="hover:text-[#818CF8] flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Host Console
            </Link>
            <span>/</span>
            <span className="text-[#6366F1] font-bold">Edit Hackathon</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] tracking-tight flex items-center gap-3">
            <span>{formData.title || "Edit Hackathon"}</span>
            <span
              className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${
                formData.status === "PUBLISHED"
                  ? "bg-[#6366F1]/20 text-[#818CF8] border-[#6366F1]/40"
                  : formData.status === "DRAFT"
                  ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                  : "bg-white/[0.04] text-slate-400 border-white/[0.08]"
              }`}
            >
              {formData.status}
            </span>
          </h1>
          <p className="text-xs text-[#94A3B8]">
            Edit all configuration fields, rules, submission deadlines, UPI/QR settings, and problem statements.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {formData.status === "PUBLISHED" && (
            <Link
              href={`/hackathons/${formData.slug}`}
              target="_blank"
              className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs text-white font-bold transition-colors flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" /> View Public
            </Link>
          )}
          <Link
            href={`/dashboard/host/arena/${hackathonId}`}
            className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs text-white font-bold transition-colors flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Arena Command
          </Link>
          <button
            onClick={() => handleSaveHackathon()}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saving ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      </div>

      {/* Alert Notices */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}
      {infoMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{infoMsg}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.08] pb-3 text-xs">
        {[
          { key: "basics", label: "Basics & Overview", icon: Building2 },
          { key: "rules", label: "Rules & Gate", icon: FileText },
          { key: "schedule", label: "Schedule & Deadlines", icon: Calendar },
          { key: "teams", label: "Squads, Fees & QR", icon: Scale },
          { key: "domains", label: "Domains & Problems", icon: Layers, count: domains.length },
          { key: "rubrics", label: "Overall Rubrics", icon: Award, count: rubricCriteria.length },
          { key: "squads", label: "Teams & Students", icon: Users, count: teamsList.length },
          { key: "judges", label: "Judges", icon: ShieldCheck, count: judgesList.length },
          { key: "payment_setup", label: "Payment Setup", icon: Lock },
          { key: "payment_queue", label: "Payment Queue", icon: CreditCard, count: paymentsList.filter((p) => p.status === "PENDING").length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
                isActive
                  ? "bg-[#6366F1] text-white shadow-sm"
                  : "bg-white/[0.02] hover:bg-white/[0.06] text-[#94A3B8] hover:text-white border border-white/[0.04]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-white/[0.06] text-[#94A3B8]"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Form Content */}
      <form onSubmit={handleSaveHackathon} className="space-y-6">
        {/* TAB 1: BASICS */}
        {activeTab === "basics" && (
          <div className="p-6 rounded-2xl bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] space-y-5">
            <div className="text-sm font-extrabold text-[#F8FAFC] border-b border-white/[0.08] pb-3 flex items-center justify-between">
              <span>Core Track Identity & Visibility</span>
              <span className="text-[10px] text-[#64748B]">All fields editable</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase text-[#94A3B8] font-bold">Hackathon Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Intercollegiate Code Fest 2026"
                  className={inputCls}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] uppercase text-[#94A3B8] font-bold">URL Slug</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="e.g. codefest-2026"
                  className={inputCls}
                  required
                />
                <div className="text-[10px] text-[#64748B]">
                  Public URL: /hackathons/<span className="text-white font-bold">{formData.slug}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase text-[#94A3B8] font-bold">Lifecycle Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className={inputCls}
                >
                  <option value="DRAFT">DRAFT (Hidden from general public)</option>
                  <option value="PUBLISHED">PUBLISHED (Live on HackBridge)</option>
                  <option value="ARCHIVED">ARCHIVED (Read-only historical)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] uppercase text-[#94A3B8] font-bold">Banner Image URL</label>
                <input
                  type="url"
                  value={formData.bannerUrl}
                  onChange={(e) => setFormData({ ...formData, bannerUrl: e.target.value })}
                  placeholder="https://example.com/banner.png"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] uppercase text-[#94A3B8] font-bold">Full Description</label>
              <textarea
                rows={6}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Comprehensive hackathon background, goals, eligibility, and evaluation overview..."
                className={textareaCls}
              />
            </div>
          </div>
        )}

        {/* TAB 2: RULES */}
        {activeTab === "rules" && (
          <div className="p-6 rounded-2xl bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] space-y-5">
            <div className="text-sm font-extrabold text-[#F8FAFC] border-b border-white/[0.08] pb-3 flex items-center justify-between">
              <span>Rules, Regulations & Mandatory Compliance Gate</span>
              <span className="text-[10px] text-[#818CF8]">Gate Enforcement: Active</span>
            </div>

            <div className="p-4 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-start gap-3">
              <input
                type="checkbox"
                id="rulesGateCheck"
                checked={formData.rulesGate}
                onChange={(e) => setFormData({ ...formData, rulesGate: e.target.checked })}
                className="mt-0.5 w-4 h-4 accent-[#6366F1] rounded cursor-pointer"
              />
              <label htmlFor="rulesGateCheck" className="text-xs text-white cursor-pointer select-none">
                <strong className="text-[#818CF8] block">Mandatory Rules Gate Checkbox</strong>
                When enabled, students must read and affirmatively accept these rules before registering or entering the arena workspace.
              </label>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] uppercase text-[#94A3B8] font-bold">
                Official Rules & Regulations (Markdown format supported)
              </label>
              <textarea
                rows={12}
                value={formData.rules}
                onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                placeholder="Rule 1: Participants must adhere to institutional code of conduct...&#10;Rule 2: Plagiarism or unauthorized code leads to instant disqualification..."
                className={textareaCls}
              />
            </div>
          </div>
        )}

        {/* TAB 3: SCHEDULE */}
        {activeTab === "schedule" && (
          <div className="p-6 rounded-2xl bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] space-y-5">
            <div className="text-sm font-extrabold text-[#F8FAFC] border-b border-white/[0.08] pb-3">
              Event Timelines & 4-Stage Submission Deadlines
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase text-[#94A3B8] font-bold">Registration Deadline</label>
                <input
                  type="datetime-local"
                  value={formData.registrationDeadline}
                  onChange={(e) => setFormData({ ...formData, registrationDeadline: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase text-[#94A3B8] font-bold">Hackathon Starts At</label>
                <input
                  type="datetime-local"
                  value={formData.startAt}
                  onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                  className={inputCls}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase text-[#818CF8] font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#6366F1]" /> Problem Reveal Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.revealAt}
                  onChange={(e) => setFormData({ ...formData, revealAt: e.target.value })}
                  className={`${inputCls} border-[#6366F1]/50 focus:border-[#818CF8] bg-[#6366F1]/[0.05]`}
                  required
                />
                <p className="text-[10px] text-[#818CF8] leading-tight">
                  Cryptographically unlocks statements &amp; slot selection
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase text-[#94A3B8] font-bold">Hackathon Ends At</label>
                <input
                  type="datetime-local"
                  value={formData.endAt}
                  onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                  className={inputCls}
                  required
                />
              </div>
            </div>

            <div className="pt-2 border-t border-white/[0.06] space-y-3">
              <div className="text-xs font-bold text-[#818CF8] uppercase tracking-wider">
                Arena 4-Stage Document Checkpoint Deadlines
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase text-[#94A3B8]">Part 1 Due (Ideation / Architecture)</label>
                  <input
                    type="datetime-local"
                    value={formData.part1Due}
                    onChange={(e) => setFormData({ ...formData, part1Due: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase text-[#94A3B8]">Part 2 Due (Implementation Alpha)</label>
                  <input
                    type="datetime-local"
                    value={formData.part2Due}
                    onChange={(e) => setFormData({ ...formData, part2Due: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase text-[#94A3B8]">Part 3 Due (Testing & Validation)</label>
                  <input
                    type="datetime-local"
                    value={formData.part3Due}
                    onChange={(e) => setFormData({ ...formData, part3Due: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase text-[#94A3B8]">Part 4 Due (Final Polish / Deployment)</label>
                  <input
                    type="datetime-local"
                    value={formData.part4Due}
                    onChange={(e) => setFormData({ ...formData, part4Due: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-[11px] uppercase text-[#94A3B8] font-bold">
                Target GitHub Organization / Repository
              </label>
              <input
                type="text"
                value={formData.githubOrgRepo}
                onChange={(e) => setFormData({ ...formData, githubOrgRepo: e.target.value })}
                placeholder="e.g. hackbridge-org/submissions-hub"
                className={inputCls}
              />
            </div>
          </div>
        )}

        {/* TAB 4: TEAMS, FEES & QR */}
        {activeTab === "teams" && (
          <div className="p-6 rounded-2xl bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] space-y-6">
            <div className="text-sm font-extrabold text-[#F8FAFC] border-b border-white/[0.08] pb-3">
              Squad Parameters, Entry Fee & Payment Integration
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase text-[#94A3B8] font-bold">Min Squad Size</label>
                <input
                  type="number"
                  min={1}
                  max={formData.teamMax}
                  value={formData.teamMin}
                  onChange={(e) => setFormData({ ...formData, teamMin: Number(e.target.value) })}
                  className={inputCls}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase text-[#94A3B8] font-bold">Max Squad Size</label>
                <input
                  type="number"
                  min={formData.teamMin}
                  max={20}
                  value={formData.teamMax}
                  onChange={(e) => setFormData({ ...formData, teamMax: Number(e.target.value) })}
                  className={inputCls}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase text-[#94A3B8] font-bold">Total Prize Pool</label>
                <input
                  type="text"
                  value={formData.prizePool}
                  onChange={(e) => setFormData({ ...formData, prizePool: e.target.value })}
                  placeholder="e.g. ₹5,00,000+"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-white/[0.06] space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase text-[#94A3B8] font-bold">Registration Fee (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.fee}
                    onChange={(e) => setFormData({ ...formData, fee: Number(e.target.value) })}
                    className={inputCls}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase text-[#94A3B8] font-bold">Payment Mode</label>
                  <select
                    value={formData.paymentMode}
                    onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                    className={inputCls}
                  >
                    <option value="FREE">FREE (No fee charged)</option>
                    <option value="QR">UPI QR (Direct scanner UTR verification)</option>
                    <option value="RAZORPAY">RAZORPAY (Online gateway checkout)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase text-[#94A3B8] font-bold">Host UPI ID</label>
                  <input
                    type="text"
                    value={formData.upiId}
                    onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                    placeholder="e.g. satyu@ptaxis"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* UPI QR preview & generator */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-[#818CF8]" />
                      NPCI UPI Payment QR Code
                    </span>
                    <p className="text-[10px] text-[#94A3B8]">
                      Displayed to students during checkout. Encodes host UPI ID and exact squad fee.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateQr}
                    className="px-3 py-1.5 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold flex items-center gap-1 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Auto-Generate QR
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                  {formData.qrImageUrl ? (
                    <div className="p-2 bg-white rounded-xl shadow-lg border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={formData.qrImageUrl}
                        alt="UPI QR Preview"
                        className="w-32 h-32 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded-xl bg-white/[0.04] border border-dashed border-white/20 flex flex-col items-center justify-center text-slate-500 text-[10px] text-center p-2">
                      <QrCode className="w-6 h-6 mb-1 opacity-50" />
                      No QR loaded
                    </div>
                  )}

                  <div className="space-y-2 flex-1 w-full">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-[#94A3B8]">Custom QR Image URL</label>
                      <input
                        type="url"
                        value={formData.qrImageUrl}
                        onChange={(e) => setFormData({ ...formData, qrImageUrl: e.target.value })}
                        placeholder="https://... or data:image/png;base64,..."
                        className={inputCls}
                      />
                    </div>
                    {formData.upiId && (
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>UPI: <strong className="text-white">{formData.upiId}</strong></span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(formData.upiId);
                            setCopiedUpi(true);
                            setTimeout(() => setCopiedUpi(false), 2000);
                          }}
                          className="text-[#6366F1] hover:underline flex items-center gap-0.5 text-[10px]"
                        >
                          {copiedUpi ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          {copiedUpi ? "Copied" : "Copy"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: DOMAINS & PROBLEM STATEMENTS */}
        {activeTab === "domains" && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/[0.08] gap-3">
                <div>
                  <h2 className="text-sm font-extrabold text-[#F8FAFC]">
                    Domain Tracks & Problem Statements
                  </h2>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Unlock time of problem statements is strictly enforced in HH:MM:SS format.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsNewDomain(true);
                    setEditingDomain({
                      id: "",
                      name: "",
                      description: "",
                      revealAt: toLocalISO(new Date(Date.now() + 3600000).toISOString()),
                      problemStatements: [],
                    });
                    setDomainModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Domain Track
                </button>
              </div>

              {domains.length === 0 ? (
                <div className="p-12 text-center text-xs text-[#64748B]">
                  No domains configured for this hackathon yet. Click &quot;Add Domain Track&quot; above.
                </div>
              ) : (
                <div className="space-y-6">
                  {domains.map((dom) => {
                    const unlockTimeHHMMSS = getUnlockTimeHHMMSS(dom.revealAt);
                    const countdownHHMMSS = getCountdownHHMMSS(dom.revealAt);
                    const isUnlocked = countdownHHMMSS === "UNLOCKED";

                    return (
                      <div
                        key={dom.id}
                        className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-4"
                      >
                        {/* Domain Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/[0.06] gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm text-white">{dom.name}</span>
                              <span
                                className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${
                                  isUnlocked
                                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 font-bold"
                                    : "bg-amber-500/10 text-amber-300 border-amber-500/30 font-bold"
                                }`}
                              >
                                {isUnlocked ? "UNLOCKED" : `LOCKED (Countdown: ${countdownHHMMSS})`}
                              </span>
                            </div>
                            <div className="text-xs text-[#94A3B8]">
                              {dom.description || "No domain description provided"}
                            </div>
                            {/* Unlock Time formatted in HH:MM:SS */}
                            <div className="text-[11px] font-mono text-[#818CF8] flex items-center gap-2 pt-0.5">
                              <Clock className="w-3.5 h-3.5 text-[#6366F1]" />
                              <span>
                                Unlock Time: <strong className="text-white">{unlockTimeHHMMSS} IST</strong> (HH:MM:SS) —{" "}
                                {new Date(dom.revealAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
                              </span>
                            </div>
                          </div>

                          {/* Domain Controls */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setIsNewDomain(false);
                                setEditingDomain({
                                  ...dom,
                                  revealAt: toLocalISO(dom.revealAt),
                                });
                                setDomainModalOpen(true);
                              }}
                              className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white transition-colors"
                              title="Edit Domain & Reveal Time"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDomain(dom.id, dom.name)}
                              className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                              title="Delete Domain"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDomainForPs(dom.id);
                                setIsNewPs(true);
                                setEditingPs({
                                  title: "",
                                  description: "",
                                  difficulty: "MEDIUM",
                                  cap: 0,
                                  attachmentName: "",
                                  attachmentUrl: "",
                                });
                                setPsModalOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold flex items-center gap-1 transition-colors"
                            >
                              <Plus className="w-3 h-3" /> Add Problem
                            </button>
                          </div>
                        </div>

                        {/* Problem Statements List under this Domain */}
                        <div className="space-y-3">
                          <div className="text-[11px] uppercase text-[#64748B] font-bold tracking-wider flex items-center justify-between">
                            <span>Problem Statements ({dom.problemStatements?.length || 0})</span>
                            <span className="text-[10px] text-[#94A3B8]">
                              Dynamic Cap = ⌈ Registered Squads / Total Statements ⌉
                            </span>
                          </div>

                          {(!dom.problemStatements || dom.problemStatements.length === 0) ? (
                            <div className="p-4 rounded-xl bg-white/[0.01] border border-dashed border-white/10 text-center text-xs text-slate-500">
                              No problem statements added to this domain yet.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-3">
                              {dom.problemStatements.map((ps, psIdx) => (
                                <div
                                  key={ps.id || psIdx}
                                  className="p-4 rounded-xl bg-[#111524] border border-white/[0.06] hover:border-[#6366F1]/30 transition-colors space-y-2"
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-white font-bold text-xs">{ps.title}</span>
                                        <span className="text-[10px] px-2 py-0.2 rounded font-mono bg-white/[0.06] text-slate-300">
                                          Cap: {ps.cap > 0 ? ps.cap : "Dynamic"}
                                        </span>
                                      </div>
                                      <p className="text-xs text-[#94A3B8] leading-relaxed line-clamp-2">
                                        {ps.description || "No description provided"}
                                      </p>
                                      {ps.attachmentUrl && (
                                        <div className="text-[10px] text-[#818CF8] flex items-center gap-1">
                                          <span>Attachment:</span>
                                          <a
                                            href={ps.attachmentUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="underline hover:text-white"
                                          >
                                            {ps.attachmentName || ps.attachmentUrl}
                                          </a>
                                        </div>
                                      )}
                                    </div>

                                    {/* Problem Statement Actions */}
                                    <div className="flex items-center gap-1.5 self-end sm:self-start">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedDomainForPs(dom.id);
                                          setIsNewPs(false);
                                          setEditingPs({ ...ps });
                                          setPsModalOpen(true);
                                        }}
                                        className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white transition-colors"
                                        title="Edit Problem Statement"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      {ps.id && (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteProblemStatement(ps.id!, ps.title)}
                                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                                          title="Delete Problem Statement"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: OVERALL RUBRICS & EVALUATION REQUIREMENTS */}
        {activeTab === "rubrics" && (
          <div className="p-6 rounded-2xl bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#6366F1]" />
                  <h3 className="text-sm font-extrabold text-[#F8FAFC]">
                    Single Unified Rubric & Overall Evaluation Setup
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/30">
                    v5.0 Unified Architecture (All Phases)
                  </span>
                </div>
                <p className="text-xs text-[#94A3B8] max-w-2xl leading-relaxed">
                  Declare the requirements, evaluation criteria, and maximum marks. In HackBridge v5.0, there is only one unified rubric for all phases. Judges move across Phase 1, Phase 2, Phase 3, and Phase 4 deliverables in their portal to evaluate teams against this single scorecard.
                </p>
              </div>

              {/* Total Marks Metric Banner */}
              <div className="flex items-center gap-3 bg-[#111524]/90 p-3.5 rounded-2xl border border-white/[0.08] shrink-0">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-[#64748B] block">Grand Total Marks</span>
                  <div className="flex items-baseline gap-1 justify-end">
                    <span className="text-2xl font-black text-white font-mono">{totalDeclaredMarks}</span>
                    <span className="text-xs font-bold text-[#818CF8]">Marks</span>
                  </div>
                </div>
                <div className="h-9 w-[1px] bg-white/[0.08]" />
                <div className="space-y-0.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 block text-center">
                    {rubricCriteria.length} Requirements
                  </span>
                  <span className="text-[9px] text-[#94A3B8] block text-center">
                    {totalDeclaredMarks === 100 ? "100-Pt Target" : "Custom Target"}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={addRubricCriterion}
                  className="px-3.5 py-2 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold transition-all shadow-md flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Evaluation Requirement</span>
                </button>
                <button
                  type="button"
                  onClick={applyDefault9Rubrics}
                  className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-[#CBD5E1] hover:text-white transition-all flex items-center gap-2"
                  title="Reset to standard 9-Point evaluation rubrics totaling 100 Marks"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#818CF8]" />
                  <span>Reset to Official 9-Point Schema (100 Marks)</span>
                </button>
              </div>

              <span className="text-[11px] text-[#64748B]">
                Reorder using arrows. Total marks are aggregated live for the jury.
              </span>
            </div>

            {/* Criteria List */}
            {rubricCriteria.length === 0 ? (
              <div className="py-12 px-4 text-center rounded-2xl bg-white/[0.02] border border-dashed border-white/[0.08] space-y-3">
                <Award className="w-8 h-8 text-[#64748B] mx-auto" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">No Evaluation Rubrics Defined</h4>
                  <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                    Configure your evaluation requirements and maximum marks so judges can grade participant submissions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={applyDefault9Rubrics}
                  className="px-4 py-2 rounded-xl bg-[#6366F1] text-white text-xs font-bold inline-flex items-center gap-2 shadow-lg"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Load Standard 9-Point Rubrics (100 Marks)</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {rubricCriteria.map((criterion, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === rubricCriteria.length - 1;
                  return (
                    <div
                      key={criterion.id || idx}
                      className="p-4 rounded-2xl bg-[#111524]/60 border border-white/[0.08] hover:border-white/20 transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3 border-b border-white/[0.04] pb-2.5">
                        <div className="flex items-center gap-2">
                          {/* Reorder Buttons */}
                          <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-lg border border-white/[0.06]">
                            <button
                              type="button"
                              onClick={() => moveRubricCriterion(idx, "up")}
                              disabled={isFirst}
                              className="p-1 rounded hover:bg-white/10 text-white disabled:opacity-20 transition-colors"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveRubricCriterion(idx, "down")}
                              disabled={isLast}
                              className="p-1 rounded hover:bg-white/10 text-white disabled:opacity-20 transition-colors"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <span className="text-xs font-mono font-bold text-[#818CF8] bg-[#6366F1]/10 px-2.5 py-1 rounded-lg border border-[#6366F1]/20">
                            #{idx + 1}
                          </span>
                          <span className="text-xs font-bold text-white truncate max-w-md">
                            {criterion.name || "Untitled Requirement"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30">
                            Max: {criterion.maxScore} marks
                          </span>
                          <span className="px-2 py-1 rounded-xl text-[11px] font-mono font-semibold bg-white/[0.04] text-[#94A3B8] border border-white/[0.06]">
                            w: {criterion.weight}x
                          </span>
                          <button
                            type="button"
                            onClick={() => removeRubricCriterion(idx)}
                            disabled={rubricCriteria.length <= 1}
                            className="p-1.5 rounded-lg text-[#64748B] hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-20"
                            title="Delete Criterion"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Inputs Row */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                        <div className="md:col-span-7 space-y-1">
                          <label className="text-[11px] uppercase text-[#94A3B8] font-bold block">
                            Requirement Title / Description:
                          </label>
                          <input
                            type="text"
                            value={criterion.name}
                            onChange={(e) => updateRubricCriterion(idx, "name", e.target.value)}
                            placeholder="e.g. Understand the Problem Statement or Architecture Diagram"
                            className={inputCls}
                            required
                          />
                        </div>

                        <div className="md:col-span-3 space-y-1">
                          <label className="text-[11px] uppercase text-[#94A3B8] font-bold block">
                            Total Marks (Max Score):
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="1"
                              max="100"
                              step="1"
                              value={criterion.maxScore}
                              onChange={(e) => updateRubricCriterion(idx, "maxScore", Number(e.target.value))}
                              className={`${inputCls} pr-14 font-mono font-bold text-white`}
                              required
                            />
                            <span className="absolute right-3 top-2.5 text-xs font-bold text-[#64748B]">
                              Marks
                            </span>
                          </div>
                        </div>

                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[11px] uppercase text-[#94A3B8] font-bold block">
                            Weight Factor:
                          </label>
                          <input
                            type="number"
                            min="0.1"
                            max="10"
                            step="0.5"
                            value={criterion.weight}
                            onChange={(e) => updateRubricCriterion(idx, "weight", Number(e.target.value))}
                            className={`${inputCls} font-mono`}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Judge Evaluation Workflow Note */}
            <div className="p-4 rounded-2xl bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-start gap-3">
              <Award className="w-5 h-5 text-[#818CF8] shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <span className="font-extrabold text-white block">
                  Jury Evaluation & Final Marks Submission Integration
                </span>
                <p className="text-[#94A3B8] leading-relaxed">
                  Judges logged into the Judge Portal (<strong className="text-white">/dashboard/judge</strong>) will evaluate participant squad submissions against these exact declared requirements. Each requirement enforces scoring between 0 and your specified maximum marks. The system aggregates all marks into the certified Grand Total (<strong className="text-white">{totalDeclaredMarks} Marks</strong>) for final leaderboard ranking.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: SQUADS & STUDENTS DETAILS LIST */}
        {activeTab === "squads" && (
          <div className="p-6 rounded-2xl bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#6366F1]" />
                  <h3 className="text-sm font-extrabold text-[#F8FAFC]">
                    Registered Squads & Student Details
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#6366F1]/20 text-[#818CF8]">
                    v3.0 Manager
                  </span>
                </div>
                <p className="text-xs text-[#94A3B8] max-w-2xl leading-relaxed">
                  Review participating teams, full student details (Student ID, Full Name, Email, Phone, College), create squads by Student IDs, and remove teams.
                </p>
              </div>

              {/* Action Buttons & Counter */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => handleExportExcel("participants")}
                  disabled={exportingType === "participants"}
                  className="px-3.5 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all shadow-md flex items-center gap-2 font-mono disabled:opacity-50"
                  title="Export complete details of team-wise participants to Microsoft Excel (.xlsx)"
                >
                  {exportingType === "participants" ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span>Export Participants (.xlsx)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTeamActionErr(null);
                    setAddTeamModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold transition-all shadow-md flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add Team by Student ID(s)</span>
                </button>
              </div>
            </div>

            {/* Alert Notices for Team Actions */}
            {teamActionMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{teamActionMsg}</span>
              </div>
            )}
            {teamActionErr && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{teamActionErr}</span>
              </div>
            )}

            {/* Search Bar & Sizing Stats */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-96">
                <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={teamSearchQuery}
                  onChange={(e) => setTeamSearchQuery(e.target.value)}
                  placeholder="Filter by squad, student ID (HB-XXXXXX), name, college..."
                  className={`${inputCls} pl-9 text-xs`}
                />
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-[#94A3B8]">
                <span>Total Squads: <strong className="text-white">{teamsList.length}</strong></span>
                <span>•</span>
                <span>
                  Total Students:{" "}
                  <strong className="text-[#818CF8]">
                    {teamsList.reduce((acc, t) => acc + 1 + (t.members?.length || 0), 0)}
                  </strong>
                </span>
              </div>
            </div>

            {/* Teams List */}
            {(() => {
              const q = teamSearchQuery.toLowerCase().trim();
              const filteredTeams = teamsList.filter((t) => {
                if (!q) return true;
                if (t.name?.toLowerCase().includes(q)) return true;
                if (t.teamId?.toLowerCase().includes(q)) return true;
                if (t.leadStudent?.hackathonId?.toLowerCase().includes(q)) return true;
                if (t.leadStudent?.user?.name?.toLowerCase().includes(q)) return true;
                if (t.leadStudent?.user?.email?.toLowerCase().includes(q)) return true;
                if (t.leadStudent?.college?.toLowerCase().includes(q)) return true;
                if (
                  t.members?.some(
                    (m: any) =>
                      m.student?.hackathonId?.toLowerCase().includes(q) ||
                      m.student?.user?.name?.toLowerCase().includes(q) ||
                      m.student?.user?.email?.toLowerCase().includes(q) ||
                      m.student?.college?.toLowerCase().includes(q)
                  )
                ) {
                  return true;
                }
                return false;
              });

              if (filteredTeams.length === 0) {
                return (
                  <div className="py-12 px-4 text-center rounded-2xl bg-white/[0.02] border border-dashed border-white/[0.08] space-y-3">
                    <Users className="w-8 h-8 text-[#64748B] mx-auto" />
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white">
                        {teamSearchQuery ? "No matching squads found" : "No Teams Registered Yet"}
                      </h4>
                      <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                        {teamSearchQuery
                          ? "Try searching with a different student ID, squad name, or college."
                          : "Participants can register through the public portal, or you can manually create a team by student IDs."}
                      </p>
                    </div>
                    {!teamSearchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setTeamActionErr(null);
                          setAddTeamModalOpen(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-[#6366F1] text-white text-xs font-bold inline-flex items-center gap-2 shadow-lg"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Add Team by Student ID(s)</span>
                      </button>
                    )}
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {filteredTeams.map((team) => {
                    const totalCount = 1 + (team.members?.length || 0);
                    return (
                      <div
                        key={team.id}
                        className="p-5 rounded-2xl bg-[#111524]/60 border border-white/[0.08] hover:border-white/20 transition-all space-y-4"
                      >
                        {/* Squad Header Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.04] pb-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-base font-extrabold text-white">
                                {team.name}
                              </h4>
                              {team.teamId && (
                                <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                  {team.teamId}
                                </span>
                              )}
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  team.status === "ACTIVE"
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                }`}
                              >
                                {team.status}
                              </span>
                              {team.domain?.name && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#6366F1]/10 text-[#818CF8] border border-[#6366F1]/20">
                                  Track: {team.domain.name}
                                </span>
                              )}
                            </div>
                            {team.problemStatement?.title && (
                              <div className="text-xs text-[#94A3B8]">
                                Problem Statement: <strong className="text-white">{team.problemStatement.title}</strong>
                              </div>
                            )}
                          </div>

                          {/* DELETE SQUAD BUTTON */}
                          <div className="shrink-0">
                            <button
                              type="button"
                              onClick={() => handleDeleteTeam(team.id, team.name)}
                              disabled={deletingTeamId === team.id}
                              className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 hover:text-red-200 border border-red-500/30 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                              title="Delete this squad and free up students' IDs"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>{deletingTeamId === team.id ? "Deleting..." : "Delete Squad"}</span>
                            </button>
                          </div>
                        </div>

                        {/* Students Details Table */}
                        <div className="space-y-2">
                          <span className="text-[11px] uppercase font-bold text-[#64748B] block">
                            Squad Members & Student Profiles ({totalCount} Students):
                          </span>
                          <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-white/[0.02] text-[#64748B] uppercase font-mono text-[10px] border-b border-white/[0.06]">
                                <tr>
                                  <th className="py-2.5 px-3">Role</th>
                                  <th className="py-2.5 px-3">Student ID</th>
                                  <th className="py-2.5 px-3">Full Name</th>
                                  <th className="py-2.5 px-3">Email</th>
                                  <th className="py-2.5 px-3">Phone</th>
                                  <th className="py-2.5 px-3">College / Institution</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/[0.04]">
                                {/* Lead Student */}
                                <tr className="hover:bg-white/[0.02] transition-colors">
                                  <td className="py-2.5 px-3">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/30">
                                      LEAD
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                                    {team.leadStudent?.hackathonId || "—"}
                                  </td>
                                  <td className="py-2.5 px-3 font-bold text-white">
                                    {team.leadStudent?.user?.name || "—"}
                                  </td>
                                  <td className="py-2.5 px-3 text-[#94A3B8] font-mono">
                                    {team.leadStudent?.user?.email || "—"}
                                  </td>
                                  <td className="py-2.5 px-3 text-[#94A3B8] font-mono">
                                    {team.leadStudent?.user?.phone || "—"}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-300">
                                    {team.leadStudent?.college || "—"}
                                  </td>
                                </tr>

                                {/* Teammates */}
                                {team.members?.map((member: any) => (
                                  <tr key={member.id || member.student?.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="py-2.5 px-3">
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/[0.06] text-[#94A3B8] border border-white/10">
                                        MEMBER
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                                      {member.student?.hackathonId || "—"}
                                    </td>
                                    <td className="py-2.5 px-3 font-semibold text-white">
                                      {member.student?.user?.name || "—"}
                                    </td>
                                    <td className="py-2.5 px-3 text-[#94A3B8] font-mono">
                                      {member.student?.user?.email || "—"}
                                    </td>
                                    <td className="py-2.5 px-3 text-[#94A3B8] font-mono">
                                      {member.student?.user?.phone || "—"}
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-300">
                                      {member.student?.college || "—"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 8: JUDGES & JURY MANAGEMENT */}
        {activeTab === "judges" && (
          <div className="p-6 rounded-2xl bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#6366F1]" />
                  <h3 className="text-sm font-extrabold text-[#F8FAFC]">
                    Hackathon Evaluation Jury & Judges
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#6366F1]/20 text-[#818CF8]">
                    v3.0 Manager
                  </span>
                </div>
                <p className="text-xs text-[#94A3B8] max-w-2xl leading-relaxed">
                  Assign evaluators specifically to this hackathon track, manage jury access clearances, and remove judges.
                </p>
              </div>

              {/* Action Button */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => handleExportExcel("judges")}
                  disabled={exportingType === "judges"}
                  className="px-3.5 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all shadow-md flex items-center gap-2 font-mono disabled:opacity-50"
                  title="Export evaluation judges roster to Microsoft Excel (.xlsx)"
                >
                  {exportingType === "judges" ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span>Export Judges (.xlsx)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setJudgeActionErr(null);
                    setAddJudgeModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold transition-all shadow-md flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add / Assign Judge</span>
                </button>
              </div>
            </div>

            {/* Alert Notices for Judge Actions */}
            {judgeActionMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{judgeActionMsg}</span>
              </div>
            )}
            {judgeActionErr && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{judgeActionErr}</span>
              </div>
            )}

            {/* Sizing Stats */}
            <div className="flex items-center justify-between gap-3 text-xs font-mono text-[#94A3B8]">
              <span>Assigned Jury Members: <strong className="text-white">{judgesList.length}</strong></span>
              <span>
                Approved:{" "}
                <strong className="text-emerald-400">
                  {judgesList.filter((j) => j.approvalStatus === "APPROVED").length}
                </strong>
              </span>
            </div>

            {/* Judges List */}
            {judgesList.length === 0 ? (
              <div className="py-12 px-4 text-center rounded-2xl bg-white/[0.02] border border-dashed border-white/[0.08] space-y-3">
                <ShieldCheck className="w-8 h-8 text-[#64748B] mx-auto" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">No Judges Assigned Yet</h4>
                  <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                    Assign evaluators to this hackathon so they can log into the Judge Portal (/dashboard/judge) and score participant deliverables.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setJudgeActionErr(null);
                    setAddJudgeModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#6366F1] text-white text-xs font-bold inline-flex items-center gap-2 shadow-lg"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add / Assign Judge for this Hackathon</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {judgesList.map((judge) => {
                  const isApproved = judge.approvalStatus === "APPROVED";
                  return (
                    <div
                      key={judge.id}
                      className="p-4 rounded-2xl bg-[#111524]/60 border border-white/[0.08] hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-extrabold text-white">
                            {judge.user?.name || "Unnamed Judge"}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isApproved
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                            }`}
                          >
                            {judge.approvalStatus}
                          </span>
                          {judge.domain && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#6366F1]/10 text-[#818CF8] border border-[#6366F1]/20">
                              Domain: {judge.domain}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#94A3B8]">
                          <span className="font-mono text-[#818CF8]">{judge.user?.email}</span>
                          <span>•</span>
                          <span>{judge.designation || "Evaluator"}</span>
                          <span>•</span>
                          <span>{judge.company || "Independent"}</span>
                        </div>
                      </div>

                      {/* Controls: Approve / Reject + Delete Judge */}
                      <div className="flex items-center gap-2 shrink-0">
                        {!isApproved && (
                          <button
                            type="button"
                            onClick={() => handleDecisionJudge(judge.id, "APPROVE")}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all"
                          >
                            Approve
                          </button>
                        )}

                        {/* DELETE JUDGE BUTTON */}
                        <button
                          type="button"
                          onClick={() => handleDeleteJudge(judge.id, judge.user?.name || judge.user?.email)}
                          disabled={deletingJudgeId === judge.id}
                          className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 hover:text-red-200 border border-red-500/30 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                          title="Remove this judge from the hackathon"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{deletingJudgeId === judge.id ? "Removing..." : "Delete Judge"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 9: PAYMENT SETUP & GATEWAY INTEGRATION */}
        {activeTab === "payment_setup" && (
          <div className="p-6 rounded-2xl bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-[#6366F1]" />
                  <h3 className="text-sm font-extrabold text-[#F8FAFC]">
                    Hackathon Payment Setup & Gateway Configuration
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#6366F1]/20 text-[#818CF8]">
                    v5.0 Hub
                  </span>
                </div>
                <p className="text-xs text-[#94A3B8] max-w-2xl leading-relaxed">
                  Configure squad registration fees, direct UPI QR scanner collection, and optional automated Razorpay checkout gateway.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSavePaymentSetup}
                disabled={savingPaymentSetup}
                className="px-5 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-50 self-start md:self-auto"
              >
                {savingPaymentSetup ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{savingPaymentSetup ? "Saving Setup..." : "Save Payment Setup"}</span>
              </button>
            </div>

            {paymentSetupMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 font-mono">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{paymentSetupMsg}</span>
              </div>
            )}
            {paymentSetupErr && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 font-mono">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{paymentSetupErr}</span>
              </div>
            )}

            {/* Fee and Mode Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase text-[#94A3B8] font-bold">
                  Registration Mode <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.paymentMode}
                  onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                  className={inputCls}
                >
                  <option value="FREE">FREE (No registration fee)</option>
                  <option value="QR">UPI QR Scanner (Direct host account transfer & UTR proof)</option>
                  <option value="RAZORPAY">Razorpay Gateway (Online cards / netbanking / auto-verify)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] uppercase text-[#94A3B8] font-bold">
                  Registration Fee per Squad (₹) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.fee}
                  onChange={(e) => setFormData({ ...formData, fee: Number(e.target.value) })}
                  className={inputCls}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] uppercase text-[#94A3B8] font-bold">
                  Host UPI ID (VPA)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.upiId}
                    onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                    placeholder="e.g. hostorg@okhdfcbank"
                    className={inputCls}
                  />
                  {formData.upiId && isValidUpiId(formData.upiId) && (
                    <span className="absolute right-3 top-2.5 text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Valid VPA
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* NPCI UPI QR Scanner Integration */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-[#818CF8]" />
                    <span>UPI QR Code Payment Display</span>
                  </h4>
                  <p className="text-[10px] text-[#94A3B8]">
                    Presented to student teams during checkout to scan with GPay, PhonePe, Paytm, or BHIM.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 bg-[#111524] p-1 rounded-xl border border-white/[0.08] text-[10px]">
                  <button
                    type="button"
                    onClick={() => setQrMode("AUTOGEN")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      qrMode === "AUTOGEN"
                        ? "bg-[#6366F1] text-white"
                        : "text-[#94A3B8] hover:text-white"
                    }`}
                  >
                    Auto-Generate
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrMode("UPLOAD")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      qrMode === "UPLOAD"
                        ? "bg-[#6366F1] text-white"
                        : "text-[#94A3B8] hover:text-white"
                    }`}
                  >
                    Upload Custom QR
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-4 flex flex-col items-center justify-center p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                  {formData.qrImageUrl ? (
                    <div className="space-y-3 text-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={formData.qrImageUrl}
                        alt="UPI Payment QR Code"
                        className="w-48 h-48 rounded-xl object-contain bg-white p-2 shadow-lg mx-auto"
                      />
                      <div className="text-[10px] text-[#94A3B8]">
                        Amount: <strong className="text-white">₹{formData.fee}</strong> · VPA:{" "}
                        <strong className="text-[#818CF8]">{formData.upiId || "None"}</strong>
                      </div>
                    </div>
                  ) : (
                    <div className="w-48 h-48 rounded-xl border border-dashed border-white/20 flex flex-col items-center justify-center text-center p-4 text-[#64748B] text-xs">
                      <QrCode className="w-8 h-8 mb-2 opacity-50" />
                      <span>Enter a valid UPI ID or upload custom QR image to preview</span>
                    </div>
                  )}
                </div>

                <div className="md:col-span-8 space-y-3">
                  {qrMode === "AUTOGEN" ? (
                    <div className="space-y-2 text-xs">
                      <p className="text-[#94A3B8] leading-relaxed">
                        The HackBridge protocol dynamically generates a high-contrast NPCI standard QR code encoding your UPI ID (<strong className="text-white">{formData.upiId || "Not set"}</strong>) and the exact registration fee (<strong className="text-white">₹{formData.fee}</strong>).
                      </p>
                      <div className="p-3 rounded-xl bg-[#111524] border border-white/[0.06] text-[11px] text-[#818CF8] space-y-1">
                        <div>• Auto-updates whenever you adjust fee or UPI ID</div>
                        <div>• Pre-populates the exact squad payment amount on student scanner apps</div>
                        <div>• Compatible with all Indian UPI applications (GPay, PhonePe, Paytm, BHIM, Cred)</div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 text-xs">
                      <p className="text-[#94A3B8]">
                        Upload your institution's official bank QR code image (PNG, JPG, WebP up to 5MB):
                      </p>
                      <label className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-white/20 hover:border-[#6366F1] bg-white/[0.02] cursor-pointer transition-colors">
                        <Upload className="w-5 h-5 text-[#818CF8] mb-1" />
                        <span className="text-xs font-bold text-white">
                          {uploadingQr ? "Processing Image..." : "Click to select QR image file"}
                        </span>
                        <span className="text-[10px] text-[#64748B] mt-0.5">PNG, JPG, or WebP</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleQrUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Razorpay Gateway Configuration */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-[#6366F1]" />
                    <span>Razorpay API Credentials (Optional Online Checkout)</span>
                  </h4>
                  <p className="text-[10px] text-[#94A3B8]">
                    Used when Payment Mode is set to RAZORPAY. Allows automated card, netbanking, and instantaneous squad activation.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleTestRazorpay}
                  disabled={testingRazorpay || !razorpayKeyId.trim()}
                  className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-40 font-mono"
                >
                  {testingRazorpay ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{testingRazorpay ? "Testing..." : "Test Connection"}</span>
                </button>
              </div>

              {razorpayTestResult && (
                <div className={`p-3 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 ${
                  razorpayTestResult.success
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-red-500/10 border-red-500/30 text-red-400"
                }`}>
                  {razorpayTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span>{razorpayTestResult.message}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase text-[#94A3B8] font-bold">
                    Razorpay Key ID
                  </label>
                  <input
                    type="text"
                    value={razorpayKeyId}
                    onChange={(e) => setRazorpayKeyId(e.target.value)}
                    placeholder="rzp_live_... or rzp_test_..."
                    className={inputCls}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase text-[#94A3B8] font-bold">
                    Razorpay Key Secret
                  </label>
                  <div className="relative">
                    <input
                      type={showRazorpaySecret ? "text" : "password"}
                      value={razorpayKeySecret}
                      onChange={(e) => setRazorpayKeySecret(e.target.value)}
                      placeholder="••••••••••••••••••••••••"
                      className={`${inputCls} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRazorpaySecret(!showRazorpaySecret)}
                      className="absolute right-3 top-2.5 text-[#94A3B8] hover:text-white"
                    >
                      {showRazorpaySecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 10: PAYMENT QUEUE & UTR VERIFICATION */}
        {activeTab === "payment_queue" && (
          <div className="p-6 rounded-2xl bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#6366F1]" />
                  <h3 className="text-sm font-extrabold text-[#F8FAFC]">
                    Squad Payment Verification Queue
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#6366F1]/20 text-[#818CF8]">
                    UTR Verifier
                  </span>
                </div>
                <p className="text-xs text-[#94A3B8] max-w-2xl leading-relaxed">
                  Review student payment proofs, inspect and confirm bank UTR numbers, issue official Team IDs (TEAM-XXXXXX), and activate squads.
                </p>
              </div>

              {/* Excel Export Button */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleExportExcel("payments")}
                  disabled={exportingType === "payments"}
                  className="px-3.5 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all shadow-md flex items-center gap-2 font-mono disabled:opacity-50"
                  title="Export complete payment queue to Microsoft Excel (.xlsx)"
                >
                  {exportingType === "payments" ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span>Export Payment Queue (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* Alert Notices */}
            {paymentActionMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 font-mono">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{paymentActionMsg}</span>
              </div>
            )}
            {paymentActionErr && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 font-mono">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{paymentActionErr}</span>
              </div>
            )}

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                <div className="text-xl font-extrabold text-white">{paymentsList.length}</div>
                <div className="text-[10px] text-[#64748B] uppercase">Total Payments</div>
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                <div className="text-xl font-extrabold text-amber-300">
                  {paymentsList.filter((p) => p.status === "PENDING").length}
                </div>
                <div className="text-[10px] text-[#64748B] uppercase">Pending UTR Review</div>
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                <div className="text-xl font-extrabold text-emerald-400">
                  {paymentsList.filter((p) => p.status === "VERIFIED").length}
                </div>
                <div className="text-[10px] text-[#64748B] uppercase">Verified & Active</div>
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                <div className="text-xl font-extrabold text-[#818CF8]">
                  ₹{paymentsList.filter((p) => p.status === "VERIFIED").reduce((sum, p) => sum + (p.amount || 0), 0)}
                </div>
                <div className="text-[10px] text-[#64748B] uppercase">Collected Amount</div>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3 text-xs font-mono">
              {(["ALL", "PENDING", "VERIFIED", "REJECTED"] as const).map((filter) => {
                const count = filter === "ALL" ? paymentsList.length : paymentsList.filter((p) => p.status === filter).length;
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setPaymentsFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                      paymentsFilter === filter
                        ? "bg-[#6366F1] text-white"
                        : "bg-white/[0.03] text-[#94A3B8] hover:text-white"
                    }`}
                  >
                    <span>{filter}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Payments List */}
            {(() => {
              const filtered = paymentsList.filter((p) => {
                if (paymentsFilter === "ALL") return true;
                return p.status === paymentsFilter;
              });

              if (filtered.length === 0) {
                return (
                  <div className="p-12 text-center text-xs font-mono text-[#64748B] space-y-2">
                    <CreditCard className="w-8 h-8 mx-auto opacity-40" />
                    <p>No payment records found matching "{paymentsFilter}" status.</p>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {filtered.map((p) => {
                    const isVerifying = verifyingPaymentId === p.id;
                    const studentUtr = p.txnRef || "";
                    const currentUtrInput = utrInputs[p.id] ?? studentUtr;
                    const isPending = p.status === "PENDING";
                    const isVerified = p.status === "VERIFIED";
                    const isRejected = p.status === "REJECTED";

                    return (
                      <div
                        key={p.id}
                        className={`p-5 rounded-2xl border transition-all space-y-4 ${
                          isPending
                            ? "bg-[#0E1222]/80 border-amber-500/30"
                            : isVerified
                            ? "bg-[#0B0E18]/60 border-emerald-500/20"
                            : "bg-[#0B0E18]/60 border-red-500/20 opacity-80"
                        }`}
                      >
                        {/* Header Details */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3 text-xs font-mono">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">{p.team?.name || "Squad"}</span>
                              {p.team?.teamId ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/30">
                                  {p.team.teamId}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                                  Awaiting Team ID
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#94A3B8]">
                              Lead: <strong className="text-white">{p.team?.leadStudent?.user?.name || "N/A"}</strong> · {p.team?.leadStudent?.user?.email || "N/A"} {p.team?.leadStudent?.user?.phone ? `· ${p.team.leadStudent.user.phone}` : ""}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-start sm:self-auto">
                            <div className="text-right">
                              <div className="text-sm font-extrabold text-white">₹{p.amount}</div>
                              <div className="text-[10px] text-[#818CF8] uppercase">{p.mode || "UPI QR"}</div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                              isVerified
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : isPending
                                ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                : "bg-red-500/10 text-red-400 border-red-500/30"
                            }`}>
                              {p.status}
                            </span>
                          </div>
                        </div>

                        {/* Screenshot Proof + UTR Verification Section */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start text-xs font-mono">
                          {/* Screenshot Proof Preview Thumbnail */}
                          <div className="md:col-span-3">
                            <div className="text-[10px] uppercase text-[#64748B] font-bold mb-1.5">
                              Payment Receipt Proof
                            </div>
                            {p.screenshotUrl ? (
                              <div
                                onClick={() => setPreviewScreenshotUrl(p.screenshotUrl)}
                                className="group relative w-full h-32 rounded-xl border border-white/[0.08] overflow-hidden bg-black/40 cursor-pointer hover:border-[#6366F1] transition-all flex items-center justify-center shadow-inner"
                                title="Click to view full screenshot proof"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={p.screenshotUrl}
                                  alt="Payment Receipt"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform opacity-90 group-hover:opacity-100"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-bold text-[11px]">
                                  <Eye className="w-4 h-4" />
                                  <span>View Receipt</span>
                                </div>
                              </div>
                            ) : (
                              <div className="w-full h-32 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center p-3 text-[#64748B] text-[11px]">
                                <AlertCircle className="w-5 h-5 mb-1 opacity-40" />
                                <span>No receipt screenshot attached</span>
                              </div>
                            )}
                          </div>

                          {/* UTR Verification Controls */}
                          <div className="md:col-span-9 space-y-3">
                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <span className="text-[11px] uppercase text-[#94A3B8] font-bold flex items-center gap-1.5">
                                  <span>Student Submitted UTR / Ref:</span>
                                  {studentUtr ? (
                                    <span className="font-bold text-white bg-[#111524] px-2.5 py-0.5 rounded border border-white/10 select-all text-xs">
                                      {studentUtr}
                                    </span>
                                  ) : (
                                    <span className="text-amber-400 font-bold italic">None provided</span>
                                  )}
                                </span>
                                <span className="text-[10px] text-[#64748B]">
                                  Submitted: {new Date(p.createdAt).toLocaleString("en-IN")}
                                </span>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[10px] uppercase text-[#818CF8] font-bold flex items-center justify-between">
                                  <span>Bank Verified UTR Number</span>
                                  <span className="text-[10px] text-[#64748B] font-normal">
                                    Matches UPI statement or netbanking credit
                                  </span>
                                </label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={currentUtrInput}
                                    onChange={(e) =>
                                      setUtrInputs({ ...utrInputs, [p.id]: e.target.value })
                                    }
                                    placeholder="Enter or confirm bank verified 12-digit UTR..."
                                    className={`${inputCls} font-bold`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleVerifyPayment(p.id, "UPDATE_UTR")}
                                    disabled={isVerifying || !currentUtrInput.trim()}
                                    className="px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white text-xs font-bold font-mono transition-colors disabled:opacity-40 whitespace-nowrap"
                                    title="Save edited UTR reference"
                                  >
                                    Update UTR
                                  </button>
                                </div>
                              </div>

                              {/* Decision Action Buttons */}
                              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/[0.06]">
                                <div className="flex items-center gap-2 text-[10px] text-[#64748B]">
                                  {p.verifiedAt && (
                                    <span>Verified on: {new Date(p.verifiedAt).toLocaleString("en-IN")}</span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  {isPending && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const reason = prompt("Enter optional rejection note (optional):");
                                          if (reason !== null) {
                                            setRejectionReasons((prev) => ({ ...prev, [p.id]: reason }));
                                            handleVerifyPayment(p.id, "REJECT");
                                          }
                                        }}
                                        disabled={isVerifying}
                                        className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-bold transition-all disabled:opacity-40"
                                      >
                                        Reject Payment
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleVerifyPayment(p.id, "APPROVE")}
                                        disabled={isVerifying}
                                        className="px-4 py-2 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-40"
                                      >
                                        {isVerifying ? (
                                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <Check className="w-3.5 h-3.5" />
                                        )}
                                        <span>Verify & Issue Team ID</span>
                                      </button>
                                    </>
                                  )}

                                  {isVerified && (
                                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Verified & Squad Activated</span>
                                    </span>
                                  )}

                                  {isRejected && (
                                    <button
                                      type="button"
                                      onClick={() => handleVerifyPayment(p.id, "APPROVE")}
                                      disabled={isVerifying}
                                      className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all"
                                    >
                                      Re-Approve Payment
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* Floating / Sticky Save Bar */}
        <div className="sticky bottom-4 p-4 rounded-2xl bg-[#0B0E18]/90 backdrop-blur-md border border-white/[0.1] shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 z-20">
          <div className="text-xs text-[#94A3B8] flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#6366F1]" />
            <span>
              Editing: <strong className="text-white">{formData.title}</strong> ({formData.status})
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <Link
              href="/dashboard/host"
              className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs text-white font-semibold transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? "Saving Changes..." : "Save All Changes"}</span>
            </button>
          </div>
        </div>
      </form>

      {/* MODAL: ADD / EDIT DOMAIN */}
      {domainModalOpen && editingDomain && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="max-w-lg w-full bg-[#0B0E18] border border-white/[0.1] rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-extrabold text-white">
                {isNewDomain ? "Add New Domain Track" : "Edit Domain Track"}
              </h3>
              <button
                onClick={() => setDomainModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] uppercase text-[#94A3B8] font-bold">Domain Name</label>
                <input
                  type="text"
                  value={editingDomain.name}
                  onChange={(e) => setEditingDomain({ ...editingDomain, name: e.target.value })}
                  placeholder="e.g. Artificial Intelligence & ML"
                  className={inputCls}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] uppercase text-[#94A3B8] font-bold">
                  Problem Statement Unlock Time (HH:MM:SS)
                </label>
                <input
                  type="datetime-local"
                  value={editingDomain.revealAt}
                  onChange={(e) => setEditingDomain({ ...editingDomain, revealAt: e.target.value })}
                  className={inputCls}
                  required
                />
                {editingDomain.revealAt && (
                  <div className="p-2.5 rounded-lg bg-[#6366F1]/10 border border-[#6366F1]/20 text-[11px] text-[#818CF8] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      Formatted Unlock Time:{" "}
                      <strong className="text-white">
                        {getUnlockTimeHHMMSS(editingDomain.revealAt)} IST
                      </strong>{" "}
                      (HH:MM:SS)
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] uppercase text-[#94A3B8] font-bold">Domain Description</label>
                <textarea
                  rows={3}
                  value={editingDomain.description || ""}
                  onChange={(e) => setEditingDomain({ ...editingDomain, description: e.target.value })}
                  placeholder="Brief summary of domain focus areas..."
                  className={textareaCls}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setDomainModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/[0.04] text-xs text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDomain}
                className="px-4 py-2 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold"
              >
                Save Domain Track
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT PROBLEM STATEMENT */}
      {psModalOpen && editingPs && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="max-w-xl w-full bg-[#0B0E18] border border-white/[0.1] rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-extrabold text-white">
                {isNewPs ? "Add Problem Statement" : "Edit Problem Statement"}
              </h3>
              <button
                onClick={() => setPsModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] uppercase text-[#94A3B8] font-bold">Statement Title</label>
                <input
                  type="text"
                  value={editingPs.title}
                  onChange={(e) => setEditingPs({ ...editingPs, title: e.target.value })}
                  placeholder="e.g. AI-Powered Smart Agriculture Disease Predictor"
                  className={inputCls}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] uppercase text-[#94A3B8] font-bold">Difficulty</label>
                  <select
                    value={editingPs.difficulty}
                    onChange={(e) => setEditingPs({ ...editingPs, difficulty: e.target.value })}
                    className={inputCls}
                  >
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] uppercase text-[#94A3B8] font-bold">
                    Squad Cap (0 for dynamic)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editingPs.cap}
                    onChange={(e) => setEditingPs({ ...editingPs, cap: Number(e.target.value) })}
                    className={inputCls}
                  />
                  <div className="text-[9px] text-[#64748B]">
                    0 defaults to automatic balancing: ⌈registered squads / statements⌉
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] uppercase text-[#94A3B8] font-bold">Description / Spec</label>
                <textarea
                  rows={4}
                  value={editingPs.description}
                  onChange={(e) => setEditingPs({ ...editingPs, description: e.target.value })}
                  placeholder="Technical specifications, requirements, expected output, and evaluation criteria..."
                  className={textareaCls}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] uppercase text-[#94A3B8] font-bold">Attachment Name</label>
                  <input
                    type="text"
                    value={editingPs.attachmentName || ""}
                    onChange={(e) => setEditingPs({ ...editingPs, attachmentName: e.target.value })}
                    placeholder="e.g. problem-spec.pdf"
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] uppercase text-[#94A3B8] font-bold">Attachment URL</label>
                  <input
                    type="url"
                    value={editingPs.attachmentUrl || ""}
                    onChange={(e) => setEditingPs({ ...editingPs, attachmentUrl: e.target.value })}
                    placeholder="https://..."
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setPsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/[0.04] text-xs text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProblemStatement}
                className="px-4 py-2 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold"
              >
                Save Problem Statement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD TEAM BY STUDENT ID(S) */}
      {addTeamModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="max-w-xl w-full bg-[#0B0E18] border border-white/[0.1] rounded-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#6366F1]" />
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    Add Squad by Student ID(s)
                  </h3>
                  <span className="text-[10px] text-[#94A3B8]">
                    Manual enrollment and team formulation for host administration
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddTeamModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.05]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {teamActionErr && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{teamActionErr}</span>
              </div>
            )}

            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] uppercase text-[#94A3B8] font-bold">
                  Squad / Team Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. Code Titans"
                  className={inputCls}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] uppercase text-[#94A3B8] font-bold">
                    Domain Track (Optional)
                  </label>
                  <select
                    value={newTeamDomainId}
                    onChange={(e) => {
                      setNewTeamDomainId(e.target.value);
                      setNewTeamPsId("");
                    }}
                    className={inputCls}
                  >
                    <option value="">-- Any / Unassigned --</option>
                    {domains?.map((d: any) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] uppercase text-[#94A3B8] font-bold">
                    Problem Statement (Optional)
                  </label>
                  <select
                    value={newTeamPsId}
                    onChange={(e) => setNewTeamPsId(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">-- None / Select Later --</option>
                    {domains
                      ?.filter((d: any) => !newTeamDomainId || d.id === newTeamDomainId)
                      .flatMap((d: any) => d.problemStatements || [])
                      .map((ps: any) => (
                        <option key={ps.id} value={ps.id}>
                          {ps.title}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Lead Student ID */}
              <div className="space-y-1 p-3.5 rounded-xl bg-white/[0.02] border border-[#6366F1]/20">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] uppercase text-[#818CF8] font-bold flex items-center gap-1.5">
                    <span>Lead Student ID</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#6366F1]/20 text-[#818CF8]">REQUIRED</span>
                  </label>
                  <span className="text-[10px] text-[#64748B]">Permanent Student ID or Email</span>
                </div>
                <input
                  type="text"
                  value={newTeamLeadId}
                  onChange={(e) => setNewTeamLeadId(e.target.value)}
                  placeholder="e.g. HB-959779 or student@college.edu"
                  className={inputCls}
                  required
                />
                <p className="text-[10px] text-[#64748B]">
                  Enter the student&apos;s registered HackBridge ID (e.g. HB-XXXXXX) or their registered email address.
                </p>
              </div>

              {/* Teammates Student IDs */}
              <div className="space-y-2 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] uppercase text-[#94A3B8] font-bold">
                    Teammate Student ID(s)
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewTeamMemberIds([...newTeamMemberIds, ""])}
                    className="text-[11px] font-bold text-[#818CF8] hover:text-[#A5B4FC] flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Member Slot</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {newTeamMemberIds.map((mId, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[#64748B] w-5 text-right">
                        #{idx + 2}
                      </span>
                      <input
                        type="text"
                        value={mId}
                        onChange={(e) => {
                          const updated = [...newTeamMemberIds];
                          updated[idx] = e.target.value;
                          setNewTeamMemberIds(updated);
                        }}
                        placeholder="e.g. HB-100234 or teammate@college.edu"
                        className={inputCls}
                      />
                      {newTeamMemberIds.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setNewTeamMemberIds(newTeamMemberIds.filter((_, i) => i !== idx));
                          }}
                          className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-white/[0.05]"
                          title="Remove slot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setAddTeamModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/[0.04] text-xs text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTeam}
                  className="px-5 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {creatingTeam ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>{creatingTeam ? "Forming Squad..." : "Create Squad & Verify Registration"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / ASSIGN JUDGE */}
      {addJudgeModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="max-w-lg w-full bg-[#0B0E18] border border-white/[0.1] rounded-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#6366F1]" />
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    Add & Assign Judge for Hackathon
                  </h3>
                  <span className="text-[10px] text-[#94A3B8]">
                    v3.0 Jury Manager
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddJudgeModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.05]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {judgeActionErr && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{judgeActionErr}</span>
              </div>
            )}

            {/* Mode Selector */}
            <div className="grid grid-cols-2 p-1 bg-white/[0.04] rounded-xl border border-white/[0.06] text-xs font-bold">
              <button
                type="button"
                onClick={() => setJudgeMode("EXISTING")}
                className={`py-2 rounded-lg transition-all ${
                  judgeMode === "EXISTING"
                    ? "bg-[#6366F1] text-white shadow"
                    : "text-[#94A3B8] hover:text-white"
                }`}
              >
                Assign Existing Judge
              </button>
              <button
                type="button"
                onClick={() => setJudgeMode("NEW")}
                className={`py-2 rounded-lg transition-all ${
                  judgeMode === "NEW"
                    ? "bg-[#6366F1] text-white shadow"
                    : "text-[#94A3B8] hover:text-white"
                }`}
              >
                Register / Invite New
              </button>
            </div>

            <form onSubmit={handleAddJudge} className="space-y-4">
              {judgeMode === "EXISTING" ? (
                <div className="space-y-1">
                  <label className="text-[11px] uppercase text-[#94A3B8] font-bold">
                    Select Platform Judge <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={selectedExistingJudgeId}
                    onChange={(e) => setSelectedExistingJudgeId(e.target.value)}
                    className={inputCls}
                    required
                  >
                    <option value="">-- Choose Judge User --</option>
                    {availableJudges.map((j: any) => (
                      <option key={j.id} value={j.id}>
                        {j.name || "Judge"} ({j.email})
                      </option>
                    ))}
                  </select>
                  {availableJudges.length === 0 && (
                    <p className="text-[10px] text-amber-300">
                      No other unassigned judge accounts found. Switch to &quot;Register / Invite New&quot; to create a new evaluator account.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase text-[#94A3B8] font-bold">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={newJudgeName}
                      onChange={(e) => setNewJudgeName(e.target.value)}
                      placeholder="e.g. Dr. Alan Turing"
                      className={inputCls}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] uppercase text-[#94A3B8] font-bold">
                        Email Address <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="email"
                        value={newJudgeEmail}
                        onChange={(e) => setNewJudgeEmail(e.target.value)}
                        placeholder="judge@domain.com"
                        className={inputCls}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] uppercase text-[#94A3B8] font-bold">
                        Initial Password
                      </label>
                      <input
                        type="text"
                        value={newJudgePassword}
                        onChange={(e) => setNewJudgePassword(e.target.value)}
                        placeholder="e.g. JudgeKey#2026"
                        className={inputCls}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] uppercase text-[#94A3B8] font-bold">
                    Designation / Title
                  </label>
                  <input
                    type="text"
                    value={newJudgeDesignation}
                    onChange={(e) => setNewJudgeDesignation(e.target.value)}
                    placeholder="e.g. Principal Architect / AI Lead"
                    className={inputCls}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] uppercase text-[#94A3B8] font-bold">
                    Company / Organization
                  </label>
                  <input
                    type="text"
                    value={newJudgeCompany}
                    onChange={(e) => setNewJudgeCompany(e.target.value)}
                    placeholder="e.g. Google / Microsoft / IIT"
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] uppercase text-[#94A3B8] font-bold">
                  Assigned Domain Track (Optional)
                </label>
                <select
                  value={newJudgeDomain}
                  onChange={(e) => setNewJudgeDomain(e.target.value)}
                  className={inputCls}
                >
                  <option value="">-- All / General Tracks --</option>
                  {domains?.map((d: any) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setAddJudgeModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/[0.04] text-xs text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingJudge}
                  className="px-5 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {addingJudge ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  <span>{addingJudge ? "Assigning..." : "Assign Judge to Hackathon"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PAYMENT SCREENSHOT PROOF PREVIEW */}
      {previewScreenshotUrl && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="max-w-2xl w-full bg-[#0B0E18] border border-white/[0.1] rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#6366F1]" />
                <span>Payment Screenshot Proof</span>
              </h3>
              <button
                type="button"
                onClick={() => setPreviewScreenshotUrl(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.06]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto rounded-xl bg-black/40 p-2 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewScreenshotUrl}
                alt="Payment Proof Screenshot"
                className="max-h-[65vh] w-auto object-contain rounded-lg shadow-md"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/[0.08] text-xs">
              <a
                href={previewScreenshotUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[#818CF8] hover:underline flex items-center gap-1 font-mono"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Original Image</span>
              </a>
              <button
                type="button"
                onClick={() => setPreviewScreenshotUrl(null)}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-bold font-mono transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
