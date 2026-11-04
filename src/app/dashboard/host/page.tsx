"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  Layers,
  CreditCard,
  Users,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  FileText,
  Rocket,
  Archive,
  Check,
  Lock,
  Bell,
  User,
  X,
  FileCode,
  ShieldCheck,
  UserPlus,
  Phone,
  Mail,
  Edit2,
  Eye,
  EyeOff,
  Key,
  Sparkles,
  Send,
  Save,
  Copy
} from "lucide-react";
import HostPaymentsSetup from "@/components/host/HostPaymentsSetup";

type HostTab =
  | "hackathons"
  | "problems"
  | "judges"
  | "participants"
  | "payments"
  | "payments-setup"
  | "notifications"
  | "profile";

interface HackathonRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  fee: number;
  paymentMode: string;
  startAt: string;
  endAt: string;
  domains: Array<{
    id?: string;
    name: string;
    revealAt?: string;
    description?: string | null;
    problemStatements: Array<{ id: string; title: string; difficulty?: string; cap?: number }>;
  }>;
  _count: { teams: number; judges: number };
}

interface HostInfo {
  id: string;
  orgName: string;
  type: string;
  approvalStatus: string;
  rejectionReason?: string | null;
  hackId?: string | null;
  city?: string | null;
}

interface PaymentRow {
  id: string;
  mode: string;
  amount: number;
  status: string;
  txnRef?: string | null;
  screenshotUrl?: string | null;
  createdAt: string;
  team: {
    id: string;
    teamId: string | null;
    name: string;
    hackathon: { title: string; slug: string };
    leadStudent: { user: { name: string; email: string } };
  };
}

interface JudgeRow {
  id: string;
  designation?: string | null;
  company?: string | null;
  domain?: string | null;
  approvalStatus: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  hackathon: {
    id: string;
    title: string;
    slug: string;
  };
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-white/[0.04] text-[#94A3B8] border-white/[0.08]",
  PUBLISHED: "bg-[#6366F1]/20 text-[#818CF8] border-[#6366F1]/40 font-bold",
  ARCHIVED: "bg-amber-500/10 text-amber-300 border-amber-500/30 font-bold",
};

const JUDGE_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-300 border-amber-500/30 font-bold",
  APPROVED: "bg-[#6366F1]/20 text-[#818CF8] border-[#6366F1]/40 font-bold",
  REJECTED: "bg-rose-500/10 text-rose-300 border-rose-500/30 font-bold",
};

function HostDashboardContent() {
  const searchParams = useSearchParams();
  const tabQuery = searchParams.get("tab") as HostTab | null;

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hackathons, setHackathons] = useState<HackathonRow[]>([]);
  const [hostInfo, setHostInfo] = useState<HostInfo | null>(null);
  const [activeTab, setActiveTab] = useState<HostTab>("hackathons");
  const [publishing, setPublishing] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Payments queue states
  const [payments, setPayments] = useState<PaymentRow[]>([]);

  // Judges panel states
  const [judges, setJudges] = useState<JudgeRow[]>([]);

  // Participants & Teams states
  const [teams, setTeams] = useState<any[]>([]);

  // Notifications states
  const [notifications, setNotifications] = useState<any[]>([]);

  // Judge Assignment states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignHackathonId, setAssignHackathonId] = useState("");
  const [assignJudgeEmail, setAssignJudgeEmail] = useState("");
  const [assignDesignation, setAssignDesignation] = useState("Technical Evaluator");
  const [assignCompany, setAssignCompany] = useState("");
  const [assignDomain, setAssignDomain] = useState("");
  const [assignPassword, setAssignPassword] = useState("");
  const [showAssignPassword, setShowAssignPassword] = useState(false);
  const [availableJudges, setAvailableJudges] = useState<any[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignResult, setAssignResult] = useState<{ success: boolean; message: string } | null>(null);

  // Host Profile Form state
  const [profileForm, setProfileForm] = useState({
    orgName: "",
    type: "college",
    coordinatorName: "",
    coordinatorPhone: "",
    city: "",
    address: "",
    website: "",
    bio: "",
    upiId: "",
    bankAccountName: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileActionMsg, setProfileActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Push Notifications state
  const [broadcastHackathonId, setBroadcastHackathonId] = useState("ALL");
  const [broadcastAudience, setBroadcastAudience] = useState("ALL_PARTICIPANTS");
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastPriority, setBroadcastPriority] = useState("NORMAL");
  const [broadcastLink, setBroadcastLink] = useState("/dashboard/student");
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{ success: boolean; message: string } | null>(null);

  // Sync tab from query param
  useEffect(() => {
    if (tabQuery) {
      if (
        [
          "hackathons",
          "problems",
          "judges",
          "participants",
          "payments",
          "payments-setup",
          "notifications",
          "profile",
        ].includes(tabQuery)
      ) {
        setActiveTab(tabQuery);
      }
    }
  }, [tabQuery]);

  const loadData = useCallback(async () => {
    const [meRes, hacksRes, paymentsRes, judgesRes, teamsRes, notifsRes, profileRes] = await Promise.all([
      fetch("/api/v1/auth/me"),
      fetch("/api/v1/host/hackathons"),
      fetch("/api/v1/host/payments"),
      fetch("/api/v1/host/judges"),
      fetch("/api/v1/teams"),
      fetch("/api/v1/notifications"),
      fetch("/api/v1/host/profile"),
    ]);

    if (meRes.ok) {
      const d = await meRes.json();
      if (d?.user) setSession(d.user);
    }

    if (hacksRes.ok) {
      const d = await hacksRes.json();
      setHackathons(d.hackathons || []);
      if (!hostInfo && d.host) setHostInfo(d.host);
    }

    if (profileRes.ok) {
      const pd = await profileRes.json();
      if (pd?.host) {
        setHostInfo(pd.host);
        setProfileForm({
          orgName: pd.host.orgName || "",
          type: pd.host.type || "college",
          coordinatorName: pd.host.user?.name || "",
          coordinatorPhone: pd.host.user?.phone || "",
          city: pd.host.city || "",
          address: pd.host.address || "",
          website: pd.host.website || "",
          bio: pd.host.bio || "",
          upiId: pd.host.upiId || "",
          bankAccountName: pd.host.bankAccountName || "",
        });
      }
    }

    if (paymentsRes.ok) {
      const d = await paymentsRes.json();
      setPayments(d.payments || []);
    }

    if (judgesRes.ok) {
      const d = await judgesRes.json();
      setJudges(d.judges || []);
    }

    if (teamsRes.ok) {
      const d = await teamsRes.json();
      setTeams(d.teams || []);
    }

    if (notifsRes.ok) {
      const d = await notifsRes.json();
      setNotifications(d.notifications || []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileActionMsg(null);
    try {
      const res = await fetch("/api/v1/host/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });
      const data = await res.json();
      if (res.ok) {
        setProfileActionMsg({ type: "success", text: "Host profile updated and saved successfully!" });
        setHostInfo(data.host);
        if (data.host?.user?.name) {
          setSession((prev: any) => (prev ? { ...prev, name: data.host.user.name } : prev));
        }
      } else {
        setProfileActionMsg({ type: "error", text: data.error || "Failed to update profile." });
      }
    } catch {
      setProfileActionMsg({ type: "error", text: "Network error occurred while saving profile." });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePushNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;
    setBroadcasting(true);
    setBroadcastResult(null);
    try {
      const res = await fetch("/api/v1/host/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hackathonId: broadcastHackathonId,
          audience: broadcastAudience,
          title: broadcastTitle.trim(),
          message: broadcastMessage.trim(),
          priority: broadcastPriority,
          link: broadcastLink.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setBroadcastResult({
          success: true,
          message: data.message || `Successfully pushed notification to ${data.deliveredCount} user(s).`,
        });
        setBroadcastTitle("");
        setBroadcastMessage("");
        const notifsRes = await fetch("/api/v1/notifications");
        if (notifsRes.ok) {
          const nd = await notifsRes.json();
          setNotifications(nd.notifications || []);
        }
      } else {
        setBroadcastResult({
          success: false,
          message: data.error || "Failed to push notification.",
        });
      }
    } catch {
      setBroadcastResult({
        success: false,
        message: "Network error occurred while pushing notification.",
      });
    } finally {
      setBroadcasting(false);
    }
  };

  const handlePublish = async (id: string) => {
    setPublishing(id);
    try {
      const res = await fetch(`/api/v1/hackathons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "PUBLISH" }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMsg(`"${data.hackathon.title}" published successfully.`);
        await loadData();
      } else {
        setActionMsg(`Error: ${data.error}`);
      }
    } finally {
      setPublishing(null);
      setTimeout(() => setActionMsg(null), 4000);
    }
  };

  const handleJudgeDecision = async (judgeId: string, action: "APPROVE" | "REJECT") => {
    try {
      const res = await fetch(`/api/v1/host/judges/${judgeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMsg(data.message || `Judge ${action === "APPROVE" ? "approved" : "rejected"} successfully.`);
        loadData();
      } else {
        setActionMsg(`Error: ${data.error}`);
      }
    } catch {
      setActionMsg("Failed to update judge status");
    } finally {
      setTimeout(() => setActionMsg(null), 4000);
    }
  };

  const handlePaymentDecision = async (paymentId: string, action: "APPROVE" | "REJECT") => {
    try {
      const res = await fetch(`/api/v1/host/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMsg(
          action === "APPROVE"
            ? `Payment verified! Team ID ${data.teamId} issued.`
            : "Payment rejected."
        );
        loadData();
      } else {
        setActionMsg(`Error: ${data.error}`);
      }
    } catch {
      setActionMsg("Network error updating payment");
    } finally {
      setTimeout(() => setActionMsg(null), 4000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full bg-transparent">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-3 space-y-3">
            <div className="h-40 rounded-2xl bg-[#0B0E18]/70 border border-white/[0.08] animate-pulse" />
          </div>
          <div className="md:col-span-9 space-y-4">
            <div className="h-28 rounded-2xl bg-[#0B0E18]/70 border border-white/[0.08] animate-pulse" />
            <div className="h-64 rounded-2xl bg-[#0B0E18]/70 border border-white/[0.08] animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!session || session.role !== "HOST") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[60vh] bg-transparent">
        <div className="w-12 h-12 rounded-xl bg-[#0B0E18]/70 border border-white/[0.08] shadow-sm flex items-center justify-center mb-4">
          <Building2 className="w-6 h-6 text-[#6366F1]" />
        </div>
        <h1 className="font-display text-xl font-extrabold text-[#F8FAFC] mb-2 tracking-tight">Host Authorization Required</h1>
        <p className="text-sm text-[#94A3B8] mb-6 max-w-sm">
          Please authenticate with an approved Host account to access the organizer console.
        </p>
        <Link href="/login" className="px-5 py-2.5 rounded-xl bg-[#6366F1] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#4F46E5] shadow-sm transition-all">
          Host Sign In
        </Link>
      </div>
    );
  }

  const profile = hostInfo || session.hostProfile || {};
  const isApproved = profile.approvalStatus === "APPROVED";
  const isPending = !profile.approvalStatus || profile.approvalStatus === "PENDING";
  const isRejected = profile.approvalStatus === "REJECTED";

  if (isRejected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 min-h-[70vh] bg-transparent text-[#F8FAFC]">
        <div className="max-w-lg w-full p-8 sm:p-10 rounded-3xl bg-[#0B0E18]/70 backdrop-blur-md border border-red-500/30 shadow-2xl space-y-6 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-[11px] font-mono text-red-400 font-bold">
              <span>APPLICATION STATUS: REJECTED</span>
            </div>
            <h1 className="font-display text-2xl font-extrabold text-[#F8FAFC]">
              Host Application Rejected
            </h1>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Your institutional host registration for <strong className="text-white">{profile.orgName}</strong> did not pass Super Admin verification.
            </p>
          </div>

          {/* Rejection Reason Card */}
          <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 text-left space-y-1.5 font-mono">
            <span className="text-[10px] uppercase text-red-400 font-bold tracking-wider">
              Rejection Reason Provided by Super Admin:
            </span>
            <p className="text-xs text-red-200 leading-relaxed">
              {profile.rejectionReason || "Verification documentation failed institutional compliance check or accreditation criteria was incomplete."}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-left space-y-2 font-mono">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
              <Phone className="w-4 h-4 text-amber-400" />
              <span>Contact Admin For Appeal</span>
            </div>
            <p className="text-xs text-amber-200/90 leading-relaxed">
              Contact <a href="tel:9380968402" className="text-white font-bold underline hover:text-[#818CF8]">9380968402</a> Or <a href="mailto:admin@hackbridge.dev" className="text-white font-bold underline hover:text-[#818CF8]">Admin</a> to discuss your application review.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href="tel:9380968402"
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-bold border border-amber-500/40 transition-colors flex items-center gap-1.5"
              >
                📞 Call 9380968402
              </a>
              <a
                href="https://wa.me/919380968402?text=Hello%20Admin,%20my%20host%20application%20was%20rejected."
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/40 transition-colors flex items-center gap-1.5"
              >
                💬 WhatsApp Admin
              </a>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs font-mono text-[#94A3B8] text-left space-y-1">
            <div>Organisation: <span className="text-white font-bold">{profile.orgName}</span></div>
            <div>Identifier: <span className="text-[#818CF8] font-bold">{profile.hackId || session.hackathonId || "N/A"}</span></div>
            <div>Representative: <span className="text-white">{session.name} ({session.email})</span></div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/register/college"
              className="w-full sm:w-1/2 py-3 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold text-xs uppercase tracking-wider transition-colors text-center"
            >
              Re-apply as College
            </Link>
            <Link
              href="/register/company"
              className="w-full sm:w-1/2 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white font-semibold text-xs uppercase tracking-wider transition-colors text-center"
            >
              Re-apply as Company
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Gatekeeper: If host is not approved, they CANNOT access or host hackathons.
  if (!isApproved) {
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
              If admin approves, then only you can access the management console or host hackathons. Your host registration for <strong className="text-white">{profile.orgName || "your organization"}</strong> is currently waiting for admin approval.
            </p>
          </div>

          {/* Contact Admin Notice Card */}
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-left space-y-3 font-mono">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
              <Phone className="w-4 h-4 text-amber-400" />
              <span>Contact Admin For Fast Approval</span>
            </div>
            <p className="text-xs text-amber-200/90 leading-relaxed">
              Waiting for admin approval. Contact <a href="tel:9380968402" className="text-white font-bold underline hover:text-[#818CF8]">9380968402</a> Or <a href="mailto:admin@hackbridge.dev" className="text-white font-bold underline hover:text-[#818CF8]">Admin</a> to approve your host account and begin hosting hackathons.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href="tel:9380968402"
                className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-bold border border-amber-500/40 transition-colors flex items-center gap-2"
              >
                📞 Call 9380968402
              </a>
              <a
                href={`https://wa.me/919380968402?text=${encodeURIComponent(`Hello Admin, my host registration for "${profile.orgName || 'Host'}" is waiting for admin approval. Please approve my account to access and host hackathons.`)}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/40 transition-colors flex items-center gap-2"
              >
                💬 WhatsApp Admin
              </a>
              <a
                href={`mailto:admin@hackbridge.dev?subject=${encodeURIComponent(`Host Account Approval Request - ${profile.orgName || 'Host'}`)}`}
                className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-bold border border-white/10 transition-colors flex items-center gap-2"
              >
                ✉️ Email Admin
              </a>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs font-mono text-[#94A3B8] text-left space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[#64748B]">Organisation:</span>
              <span className="text-white font-bold">{profile.orgName || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">HACK ID:</span>
              <span className="text-[#818CF8] font-bold">{profile.hackId || session.hackathonId || "PENDING"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Representative:</span>
              <span className="text-white">{session.name} ({session.email})</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={loadData}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
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

  const draftCount = hackathons.filter((h) => h.status === "DRAFT").length;
  const publishedCount = hackathons.filter((h) => h.status === "PUBLISHED").length;
  const totalTeams = hackathons.reduce((sum, h) => sum + (h._count?.teams ?? 0), 0);
  const pendingPaymentsCount = payments.filter((p) => p.status === "PENDING" && p.txnRef).length;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full bg-transparent">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-white/[0.08] gap-4">
        <div className="space-y-1">
          <div className="text-[11px] font-mono text-[#64748B] uppercase tracking-wider flex items-center gap-2">
            <span>HackBridge</span><span>/</span>
            <span>Host Chapter</span><span>/</span>
            <span className="text-[#6366F1] font-bold">Management Console</span>
          </div>
          <h1 className="font-display text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
            {profile.orgName || "Host Organizer Console"}
          </h1>
          <p className="text-sm text-[#94A3B8]">
            Coordinator: {session.name} ({session.email}) · Type: {profile.type || "Collegiate"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-[11px] font-mono font-extrabold border ${
            isApproved
              ? "bg-[#6366F1]/20 text-[#818CF8] border-[#6366F1]/40"
              : "bg-amber-500/10 text-amber-300 border-amber-500/30"
          }`}>
            STATUS: {profile.approvalStatus || "PENDING"}
          </span>
          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-[#0B0E18]/70 border border-white/[0.08] shadow-sm text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#111524] transition-colors"
            title="Refresh console"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pending Approval Notice */}
      {isPending && (
        <div className="mb-8 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-3 shadow-sm">
          <Clock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-extrabold text-amber-300">Super Admin Review Pending</span>
            <p className="text-amber-200/80 leading-relaxed text-[11px]">
              New host chapters cannot publish hackathons until approved by the Super Admin governance panel.
              You may prepare draft hackathon tracks in the interim.
            </p>
          </div>
        </div>
      )}

      {/* Action Message */}
      {actionMsg && (
        <div className={`mb-6 p-3.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 shadow-sm ${
          actionMsg.startsWith("Error")
            ? "bg-red-500/10 border-red-500/20 text-red-400"
            : "bg-[#6366F1]/10 border-[#6366F1]/30 text-[#818CF8]"
        }`}>
          {actionMsg.startsWith("Error") ? (
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#6366F1]" />
          )}
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Published", value: publishedCount, color: "text-[#F8FAFC]" },
          { label: "Drafts", value: draftCount, color: "text-[#94A3B8]" },
          { label: "Total Squads", value: totalTeams, color: "text-[#6366F1]" },
          { label: "Pending Payments", value: pendingPaymentsCount, color: "text-amber-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="p-4 rounded-2xl bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] shadow-sm text-center">
            <div className={`text-2xl font-extrabold font-display ${color}`}>{value}</div>
            <div className="text-[10px] font-mono text-[#64748B] uppercase font-bold mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Sidebar Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Sidebar */}
        <aside className="md:col-span-3 space-y-4">
          <nav className="p-2 rounded-2xl bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] shadow-sm space-y-1 text-xs font-mono">
            <button
              onClick={() => setActiveTab("hackathons")}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center justify-between ${
                activeTab === "hackathons"
                  ? "bg-[#6366F1] text-white font-bold shadow-sm"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4" />
                <span>My Hackathons</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${activeTab === "hackathons" ? "bg-white/20 text-white" : "bg-white/[0.06] text-[#94A3B8]"}`}>{hackathons.length}</span>
            </button>

            <button
              onClick={() => setActiveTab("notifications")}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center justify-between ${
                activeTab === "notifications"
                  ? "bg-[#6366F1] text-white font-bold shadow-sm"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4" />
                <span>Notifications</span>
              </div>
              {notifications.filter((n) => !n.readAt).length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#6366F1] text-white">
                  {notifications.filter((n) => !n.readAt).length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-2.5 ${
                activeTab === "profile"
                  ? "bg-[#6366F1] text-white font-bold shadow-sm"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]"
              }`}
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </button>
          </nav>

          <div className="p-4 rounded-2xl bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] shadow-sm space-y-2 text-xs font-mono">
            <div className="text-[10px] uppercase text-[#64748B] tracking-wider font-bold">Quick Actions</div>
            <Link
              href="/dashboard/host/create"
              className="w-full py-2.5 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#F8FAFC] hover:bg-[#6366F1] hover:text-white hover:border-[#6366F1] transition-all flex items-center gap-2 text-xs font-mono font-bold shadow-sm"
            >
              <Plus className="w-4 h-4 text-[#6366F1] group-hover:text-white" /> New Hackathon
            </Link>
          </div>
        </aside>

        {/* Right Content */}
        <main className="md:col-span-9 space-y-6">
          {/* Hackathons Tab */}
          {activeTab === "hackathons" && (
            <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-[#F8FAFC] tracking-tight">Managed Hackathon Tracks</h2>
                  <p className="text-xs text-[#64748B] font-mono mt-0.5">
                    {hackathons.length} total track{hackathons.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <Link
                  href="/dashboard/host/create"
                  className="px-3.5 py-2 rounded-xl bg-[#6366F1] text-white font-bold text-xs flex items-center gap-1.5 transition-all hover:bg-[#4F46E5] shadow-sm font-mono uppercase tracking-wider"
                >
                  <Plus className="w-4 h-4" /> New Track
                </Link>
              </div>

              {hackathons.length === 0 ? (
                <div className="p-12 text-center space-y-3 font-mono">
                  <FileText className="w-8 h-8 text-[#64748B] mx-auto" />
                  <p className="text-xs text-[#94A3B8]">No hackathon tracks created yet.</p>
                  <Link
                    href="/dashboard/host/create"
                    className="inline-flex items-center gap-1.5 text-xs text-[#6366F1] font-bold hover:underline"
                  >
                    Launch the Hackathon Builder Wizard →
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/[0.08] bg-[#111524]/60 text-[#94A3B8] uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-4 font-bold">Track Title</th>
                        <th className="py-3 px-4 font-bold">Status</th>
                        <th className="py-3 px-4 font-bold">Domains</th>
                        <th className="py-3 px-4 font-bold">Squads</th>
                        <th className="py-3 px-4 font-bold">Fee</th>
                        <th className="py-3 px-4 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {hackathons.map((h) => (
                        <tr key={h.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4 font-bold text-[#F8FAFC]">
                            <div className="flex items-center gap-2">
                              <span>{h.title}</span>
                              {h.status === "PUBLISHED" && (
                                <Link
                                  href={`/hackathons/${h.slug}`}
                                  target="_blank"
                                  className="text-[#64748B] hover:text-[#6366F1]"
                                  title="View Public Listing"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Link>
                              )}
                            </div>
                            <div className="text-[11px] text-[#64748B] font-normal">
                              {new Date(h.startAt).toLocaleDateString()} – {new Date(h.endAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] border font-extrabold ${STATUS_COLORS[h.status] || "bg-white/[0.04] text-[#94A3B8]"}`}>
                              {h.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-[#94A3B8] font-semibold">
                            {h.domains?.length ?? 0}
                          </td>
                          <td className="py-3.5 px-4 text-[#94A3B8] font-semibold">
                            {h._count?.teams ?? 0}
                          </td>
                          <td className="py-3.5 px-4 text-[#94A3B8] font-semibold">
                            {h.fee === 0 || h.paymentMode === "FREE" ? "Free" : `₹${h.fee}`}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link
                                href={`/dashboard/host/edit/${h.id}`}
                                className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-[#6366F1] hover:text-white border border-white/[0.08] text-[#F8FAFC] font-bold text-[10px] transition-all flex items-center gap-1 shadow-sm font-mono"
                                title="Edit hackathon details, rules, domains, and problem statements"
                              >
                                <Edit2 className="w-3 h-3" /> Edit
                              </Link>

                              {h.status === "DRAFT" && (
                                <button
                                  onClick={() => handlePublish(h.id)}
                                  disabled={publishing === h.id || !isApproved}
                                  className="px-3 py-1.5 rounded-xl bg-[#6366F1] text-white font-bold text-[10px] hover:bg-[#4F46E5] shadow-sm transition-all disabled:opacity-40 flex items-center gap-1 font-mono uppercase tracking-wider"
                                  title={!isApproved ? "Super Admin approval required to publish" : "Publish to live platform"}
                                >
                                  {publishing === h.id ? (
                                    <span className="animate-spin">⌛</span>
                                  ) : (
                                    <Rocket className="w-3 h-3" />
                                  )}
                                  Publish
                                </button>
                              )}

                              {h.status === "PUBLISHED" && (
                                <div className="flex items-center gap-1.5">
                                  <Link
                                    href={`/dashboard/host/arena/${h.id}`}
                                    className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-[#6366F1] hover:text-white border border-white/[0.08] text-[#F8FAFC] font-bold text-[10px] transition-all flex items-center gap-1 shadow-sm font-mono"
                                  >
                                    Arena Command
                                  </Link>
                                  <span className="text-[#818CF8] font-bold text-[10px] flex items-center gap-1 bg-[#6366F1]/20 px-2 py-0.5 rounded-full border border-[#6366F1]/30">
                                    <CheckCircle2 className="w-3 h-3 text-[#6366F1]" /> Live
                                  </span>
                                </div>
                              )}

                              {h.status === "ARCHIVED" && (
                                <span className="text-[#64748B] text-[10px] flex items-center gap-1">
                                  <Archive className="w-3 h-3" /> Archived
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === "payments" && (
            <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-[#F8FAFC] tracking-tight">Payment Review Queue</h2>
                  <p className="text-xs text-[#64748B] font-mono mt-0.5">
                    PRD Rule 3: Official Team ID (TEAM-XXXXXX) is generated only upon verified payment.
                  </p>
                </div>
                <Link
                  href="/dashboard/host/payments"
                  className="text-xs font-mono font-bold text-[#6366F1] hover:underline flex items-center gap-1"
                >
                  Full View →
                </Link>
              </div>

              {payments.length === 0 ? (
                <div className="p-12 text-center text-xs font-mono text-[#64748B]">
                  No payment records yet across your hackathons.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/[0.08] bg-[#111524]/60 text-[#94A3B8] uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-4 font-bold">Squad</th>
                        <th className="py-3 px-4 font-bold">Track</th>
                        <th className="py-3 px-4 font-bold">Amount</th>
                        <th className="py-3 px-4 font-bold">UTR Reference</th>
                        <th className="py-3 px-4 font-bold">Status / Team ID</th>
                        <th className="py-3 px-4 font-bold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4 font-bold text-[#F8FAFC]">
                            <div>{p.team.name}</div>
                            <div className="text-[10px] text-[#64748B] font-normal">
                              {p.team.leadStudent.user.email}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-[#94A3B8]">
                            {p.team.hackathon.title}
                          </td>
                          <td className="py-3.5 px-4 text-[#F8FAFC] font-extrabold">
                            ₹{p.amount}
                          </td>
                          <td className="py-3.5 px-4">
                            {p.txnRef ? (
                              <span className="font-bold text-[#F8FAFC] bg-[#111524]/80 px-2 py-0.5 rounded border border-white/[0.08] select-all text-[11px]">
                                {p.txnRef}
                              </span>
                            ) : (
                              <span className="text-[#64748B] text-[10px]">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {p.status === "VERIFIED" ? (
                              <div className="space-y-0.5">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/40">
                                  VERIFIED
                                </span>
                                {p.team.teamId && (
                                  <div className="text-[11px] font-extrabold text-[#6366F1]">
                                    {p.team.teamId}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                                {p.status}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {p.status === "PENDING" && (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handlePaymentDecision(p.id, "APPROVE")}
                                  className="px-2.5 py-1 rounded-lg bg-[#6366F1] text-white font-bold text-[10px] hover:bg-[#4F46E5] shadow-sm transition-all flex items-center gap-1 font-mono uppercase"
                                >
                                  <Check className="w-3 h-3" /> Approve
                                </button>
                                <button
                                  onClick={() => handlePaymentDecision(p.id, "REJECT")}
                                  className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[#94A3B8] hover:text-red-400 text-[10px] font-bold transition-colors font-mono uppercase"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Judges Tab */}
          {activeTab === "judges" && (
            <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] rounded-2xl shadow-sm overflow-hidden space-y-4">
              <div className="p-5 border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-extrabold text-[#F8FAFC] tracking-tight">
                    Judge Evaluation Panel Management
                  </h2>
                  <p className="text-xs text-[#64748B] font-mono mt-0.5">
                    PRD Rule 5: Judges must be assigned to specific hackathons and confirmed before scoring submissions.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs font-mono text-[#94A3B8]">
                    Total Evaluators: <span className="text-[#F8FAFC] font-extrabold">{judges.length}</span>
                  </div>
                  <button
                    onClick={async () => {
                      setShowAssignModal(true);
                      setAssignResult(null);
                      if (hackathons.length > 0 && !assignHackathonId) {
                        setAssignHackathonId(hackathons[0].id);
                      }
                      try {
                        const res = await fetch("/api/v1/host/judges?allJudges=true");
                        if (res.ok) {
                          const d = await res.json();
                          setAvailableJudges(d.availableJudges || []);
                        }
                      } catch {}
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Assign Judge
                  </button>
                </div>
              </div>

              {/* Assign Judge Modal / Panel */}
              {showAssignModal && (
                <div className="mx-5 p-5 rounded-2xl bg-[#111524] border border-[#6366F1]/40 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-white uppercase">
                      <UserPlus className="w-4 h-4 text-[#818CF8]" />
                      <span>Assign Judge to Hackathon Track</span>
                    </div>
                    <button
                      onClick={() => setShowAssignModal(false)}
                      className="p-1 rounded-lg text-[#94A3B8] hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {assignResult && (
                    <div
                      className={`p-3 rounded-xl border text-xs flex items-center gap-2 font-mono ${
                        assignResult.success
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                          : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                      }`}
                    >
                      {assignResult.success ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      <span>{assignResult.message}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                    <div className="space-y-1">
                      <label className="text-[#94A3B8] uppercase text-[10px]">Select Track</label>
                      <select
                        value={assignHackathonId}
                        onChange={(e) => {
                          setAssignHackathonId(e.target.value);
                          setAssignDomain("");
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-[#0B0E18] border border-white/[0.08] text-white focus:outline-none focus:border-[#6366F1]"
                      >
                        {hackathons.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.title} ({h.status})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[#94A3B8] uppercase text-[10px]">Assigned Domain</label>
                      <select
                        value={assignDomain}
                        onChange={(e) => setAssignDomain(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#0B0E18] border border-white/[0.08] text-white focus:outline-none focus:border-[#6366F1]"
                      >
                        <option value="">All Domains (Global Evaluator)</option>
                        {(() => {
                          const activeTrack = hackathons.find((h) => h.id === assignHackathonId) || hackathons[0];
                          return activeTrack?.domains?.map((d) => (
                            <option key={d.name} value={d.name}>
                              {d.name}
                            </option>
                          ));
                        })()}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[#94A3B8] uppercase text-[10px]">Judge Email</label>
                      {availableJudges.length > 0 ? (
                        <div className="space-y-1.5">
                          <input
                            type="email"
                            list="judge-emails-list"
                            value={assignJudgeEmail}
                            onChange={(e) => setAssignJudgeEmail(e.target.value)}
                            placeholder="judge@domain.com or select below"
                            className="w-full px-3 py-2 rounded-xl bg-[#0B0E18] border border-white/[0.08] text-white focus:outline-none focus:border-[#6366F1]"
                          />
                          <datalist id="judge-emails-list">
                            {availableJudges.map((u) => (
                              <option key={u.id} value={u.email}>
                                {u.name} ({u.email})
                              </option>
                            ))}
                          </datalist>
                        </div>
                      ) : (
                        <input
                          type="email"
                          value={assignJudgeEmail}
                          onChange={(e) => setAssignJudgeEmail(e.target.value)}
                          placeholder="judge@domain.com"
                          className="w-full px-3 py-2 rounded-xl bg-[#0B0E18] border border-white/[0.08] text-white focus:outline-none focus:border-[#6366F1]"
                        />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[#94A3B8] uppercase text-[10px]">Judge Password</label>
                        <button
                          type="button"
                          onClick={() => {
                            const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
                            let pass = "Judge@HM3#";
                            for (let i = 0; i < 4; i++) {
                              pass += chars.charAt(Math.floor(Math.random() * chars.length));
                            }
                            setAssignPassword(pass);
                          }}
                          className="text-[10px] text-[#818CF8] hover:text-[#A5B4FC] flex items-center gap-1 font-mono transition-colors"
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          Generate
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showAssignPassword ? "text" : "password"}
                          value={assignPassword}
                          onChange={(e) => setAssignPassword(e.target.value)}
                          placeholder="Set login password for judge"
                          className="w-full px-3 py-2 pr-9 rounded-xl bg-[#0B0E18] border border-white/[0.08] text-white focus:outline-none focus:border-[#6366F1]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAssignPassword(!showAssignPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-white"
                        >
                          {showAssignPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[#94A3B8] uppercase text-[10px]">Designation</label>
                      <input
                        type="text"
                        value={assignDesignation}
                        onChange={(e) => setAssignDesignation(e.target.value)}
                        placeholder="e.g. Lead Engineer / Professor"
                        className="w-full px-3 py-2 rounded-xl bg-[#0B0E18] border border-white/[0.08] text-white focus:outline-none focus:border-[#6366F1]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[#94A3B8] uppercase text-[10px]">Company / Institution</label>
                      <input
                        type="text"
                        value={assignCompany}
                        onChange={(e) => setAssignCompany(e.target.value)}
                        placeholder="e.g. Tech Corp / Department"
                        className="w-full px-3 py-2 rounded-xl bg-[#0B0E18] border border-white/[0.08] text-white focus:outline-none focus:border-[#6366F1]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAssignModal(false)}
                      className="px-3.5 py-2 rounded-xl bg-white/[0.04] text-[#94A3B8] hover:text-white font-mono text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={assignLoading || !assignJudgeEmail || !assignHackathonId}
                      onClick={async () => {
                        setAssignLoading(true);
                        setAssignResult(null);
                        try {
                          const res = await fetch("/api/v1/host/judges", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              hackathonId: assignHackathonId,
                              judgeEmail: assignJudgeEmail.trim(),
                              designation: assignDesignation.trim(),
                              company: assignCompany.trim(),
                              domain: assignDomain.trim(),
                              password: assignPassword.trim(),
                            }),
                          });
                          const data = await res.json();
                          if (res.ok) {
                            setAssignResult({ success: true, message: data.message });
                            setAssignJudgeEmail("");
                            setAssignPassword("");
                            setAssignDomain("");
                            await loadData();
                          } else {
                            setAssignResult({ success: false, message: data.error || "Failed to assign judge." });
                          }
                        } catch {
                          setAssignResult({ success: false, message: "Network error assigning judge." });
                        } finally {
                          setAssignLoading(false);
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-mono text-xs font-bold transition-all disabled:opacity-50"
                    >
                      {assignLoading ? "Assigning..." : "Confirm Assignment"}
                    </button>
                  </div>
                </div>
              )}

              {judges.length === 0 ? (
                <div className="p-12 text-center text-xs font-mono text-[#64748B] space-y-2">
                  <div>No judge applications or assignments registered yet for your hackathons.</div>
                  <div className="text-xs text-[#64748B]">
                    Click &quot;Assign Judge&quot; above to link any registered evaluator directly to your track.
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/[0.08] bg-[#111524]/60 text-[#94A3B8] uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-4 font-bold">Judge Name</th>
                        <th className="py-3 px-4 font-bold">Organization / Designation</th>
                        <th className="py-3 px-4 font-bold">Assigned Track</th>
                        <th className="py-3 px-4 font-bold">Status</th>
                        <th className="py-3 px-4 font-bold text-right">Decision</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {judges.map((j) => (
                        <tr key={j.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4 font-bold text-[#F8FAFC]">
                            <div>{j.user.name}</div>
                            <div className="text-[10px] text-[#64748B] font-normal">
                              {j.user.email}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-[#94A3B8]">
                            <div>{j.company || "Independent Evaluator"}</div>
                            <div className="text-[10px] text-[#64748B]">
                              {j.designation || "Senior Technical Judge"}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-[#F8FAFC]">
                            <Link
                              href={`/hackathons/${j.hackathon.slug}`}
                              className="hover:text-[#6366F1] font-semibold transition-colors flex items-center gap-1"
                            >
                              {j.hackathon.title}
                              <ExternalLink className="w-3 h-3 text-[#64748B]" />
                            </Link>
                            {j.domain && (
                              <div className="mt-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#6366F1]/15 border border-[#6366F1]/30 text-[#A5B4FC]">
                                  Domain: {j.domain}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] border font-extrabold ${
                                JUDGE_STATUS_COLORS[j.approvalStatus] || "bg-white/[0.04] text-[#94A3B8]"
                              }`}
                            >
                              {j.approvalStatus}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {j.approvalStatus === "PENDING" ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleJudgeDecision(j.id, "APPROVE")}
                                  className="px-2.5 py-1 rounded-lg bg-[#6366F1] text-white font-bold text-[10px] hover:bg-[#4F46E5] shadow-sm transition-all flex items-center gap-1 font-mono uppercase"
                                >
                                  <Check className="w-3 h-3" /> Approve
                                </button>
                                <button
                                  onClick={() => handleJudgeDecision(j.id, "REJECT")}
                                  className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[#94A3B8] hover:text-red-400 text-[10px] font-bold transition-colors font-mono uppercase"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-2 text-[10px] text-[#64748B] font-mono">
                                {j.approvalStatus === "APPROVED" ? (
                                  <button
                                    onClick={() => handleJudgeDecision(j.id, "REJECT")}
                                    className="text-[#94A3B8] hover:text-red-400 text-[10px] font-bold transition-colors underline"
                                  >
                                    Revoke
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleJudgeDecision(j.id, "APPROVE")}
                                    className="text-[#94A3B8] hover:text-[#818CF8] text-[10px] font-bold transition-colors underline"
                                  >
                                    Re-approve
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Payments Setup Tab */}
          {activeTab === "payments-setup" && <HostPaymentsSetup />}

          {/* Problem Statements Tab */}
          {activeTab === "problems" && (
            <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] rounded-2xl shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div>
                  <h2 className="text-base font-extrabold text-[#F8FAFC]">
                    Problem Statements & Allocation Cap
                  </h2>
                  <p className="text-xs text-[#64748B] font-mono mt-0.5">
                    Atomic row locking active: allocation cap = ⌈ registered squads / problem statements ⌉
                  </p>
                </div>
                <Link
                  href="/dashboard/host/create"
                  className="px-3 py-1.5 rounded-xl bg-[#6366F1] text-white font-mono text-xs font-bold hover:bg-[#4F46E5]"
                >
                  + Add Track
                </Link>
              </div>

              {hackathons.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-[#64748B]">
                  No hackathons or problem statements published yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {hackathons.map((h) => (
                    <div key={h.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-white/[0.04] gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{h.title}</span>
                          <span className="text-[10px] font-mono text-[#818CF8] px-2 py-0.5 rounded bg-[#6366F1]/10 border border-[#6366F1]/20">
                            {h.domains?.length || 0} Domains
                          </span>
                        </div>
                        <Link
                          href={`/dashboard/host/edit/${h.id}`}
                          className="text-xs font-bold font-mono text-[#818CF8] hover:text-white flex items-center gap-1 transition-colors self-start sm:self-auto"
                        >
                          <Edit2 className="w-3 h-3" /> Edit Domains & Statements →
                        </Link>
                      </div>

                      <div className="space-y-3">
                        {h.domains?.map((d, dIdx) => {
                          const unlockHHMMSS = d.revealAt
                            ? new Date(d.revealAt).toLocaleTimeString("en-IN", {
                                timeZone: "Asia/Kolkata",
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                                hour12: false,
                              })
                            : "--:--:--";

                          const diff = d.revealAt ? new Date(d.revealAt).getTime() - Date.now() : 0;
                          const isUnlocked = diff <= 0;
                          const totalSec = Math.max(0, Math.floor(diff / 1000));
                          const hh = String(Math.floor(totalSec / 3600)).padStart(2, "0");
                          const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
                          const ss = String(totalSec % 60).padStart(2, "0");
                          const countdownHHMMSS = `${hh}:${mm}:${ss}`;

                          return (
                            <div key={dIdx} className="p-3.5 rounded-xl bg-[#111524] border border-white/[0.06] space-y-2">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <span className="text-xs font-mono font-bold text-white">{d.name}</span>
                                <div className="text-[11px] font-mono text-[#818CF8] flex items-center gap-2">
                                  <Clock className="w-3 h-3 text-[#6366F1]" />
                                  <span>Unlock Time: <strong className="text-white">{unlockHHMMSS} IST</strong> (HH:MM:SS)</span>
                                  <span className={`px-2 py-0.2 rounded text-[10px] font-bold border ${
                                    isUnlocked
                                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                                      : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                  }`}>
                                    {isUnlocked ? "UNLOCKED" : `COUNTDOWN: ${countdownHHMMSS}`}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-1.5 pt-1">
                                {(!d.problemStatements || d.problemStatements.length === 0) ? (
                                  <div className="text-[11px] text-[#64748B] italic">No statements in this domain yet.</div>
                                ) : (
                                  d.problemStatements.map((ps: any, pIdx: number) => (
                                    <div key={pIdx} className="text-xs text-white/90 flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[#6366F1] font-bold">·</span>
                                        <span>{ps.title}</span>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Participants Tab */}
          {activeTab === "participants" && (
            <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] rounded-2xl shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div>
                  <h2 className="text-base font-extrabold text-[#F8FAFC]">
                    Registered Squads & Participants
                  </h2>
                  <p className="text-xs text-[#64748B] font-mono mt-0.5">
                    PRD Rule 1: Single active registration enforced per builder.
                  </p>
                </div>
                <div className="text-xs font-mono text-[#94A3B8]">
                  Total Squads: <span className="text-white font-bold">{teams.length}</span>
                </div>
              </div>

              {teams.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-[#64748B]">
                  No participant squads registered yet across your tracks.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/[0.08] text-[#94A3B8] uppercase text-[10px]">
                        <th className="py-2.5 px-3 font-bold">Squad Name</th>
                        <th className="py-2.5 px-3 font-bold">Track</th>
                        <th className="py-2.5 px-3 font-bold">Members</th>
                        <th className="py-2.5 px-3 font-bold">Status</th>
                        <th className="py-2.5 px-3 font-bold">Payment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {teams.map((t: any) => (
                        <tr key={t.id} className="hover:bg-white/[0.02]">
                          <td className="py-3 px-3 font-bold text-white">
                            <div>{t.name}</div>
                            <div className="text-[10px] text-[#64748B]">{t.teamId || "Draft"}</div>
                          </td>
                          <td className="py-3 px-3 text-[#94A3B8]">{t.hackathon?.title}</td>
                          <td className="py-3 px-3 text-[#94A3B8]">{t.members?.length || 1} builders</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#6366F1]/20 text-[#818CF8]">
                              {t.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-[#94A3B8]">
                            {t.payment?.status || (t.hackathon?.fee === 0 ? "Free Track" : "Unpaid")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              {/* Broadcast Notification Composer */}
              <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] rounded-2xl shadow-sm p-6 space-y-5">
                <div className="border-b border-white/[0.08] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-extrabold text-[#F8FAFC] flex items-center gap-2">
                      <Send className="w-4 h-4 text-[#6366F1]" />
                      Broadcast Notification to Cohort
                    </h2>
                    <p className="text-xs text-[#64748B] font-mono mt-0.5">
                      Instantly push priority in-app announcements directly to student and judge dashboard notification trays
                    </p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30 font-bold self-start sm:self-auto">
                    Live Push
                  </span>
                </div>

                {broadcastResult && (
                  <div className={`p-3.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 ${
                    broadcastResult.success
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : "bg-red-500/10 border-red-500/30 text-red-400"
                  }`}>
                    {broadcastResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <span>{broadcastResult.message}</span>
                  </div>
                )}

                <form onSubmit={handlePushNotification} className="space-y-4 text-xs font-mono">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase text-[#94A3B8] font-bold">Target Hackathon</label>
                      <select
                        value={broadcastHackathonId}
                        onChange={(e) => setBroadcastHackathonId(e.target.value)}
                        className="w-full bg-[#111524] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#6366F1]"
                      >
                        <option value="ALL">All My Hackathons (Global Cohort)</option>
                        {hackathons.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.title} ({h._count.teams} teams)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase text-[#94A3B8] font-bold">Target Audience</label>
                      <select
                        value={broadcastAudience}
                        onChange={(e) => setBroadcastAudience(e.target.value)}
                        className="w-full bg-[#111524] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#6366F1]"
                      >
                        <option value="ALL_PARTICIPANTS">All Participants (Team Leads & Members)</option>
                        <option value="TEAM_LEADS">Team Leads Only</option>
                        <option value="JUDGES">Assigned Evaluation Judges Only</option>
                        <option value="ALL">Everyone (Participants + Judges)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase text-[#94A3B8] font-bold">Priority / Type</label>
                      <select
                        value={broadcastPriority}
                        onChange={(e) => setBroadcastPriority(e.target.value)}
                        className="w-full bg-[#111524] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#6366F1]"
                      >
                        <option value="NORMAL">Normal Announcement</option>
                        <option value="URGENT">Urgent / Time-Critical</option>
                        <option value="SYSTEM_ALERT">System Alert</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase text-[#94A3B8] font-bold">Notification Title</label>
                    <input
                      type="text"
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      placeholder="e.g. Problem Statements Reveal in 15 Minutes / Checkpoint 1 Submissions Open"
                      required
                      className="w-full bg-[#111524] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#6366F1]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase text-[#94A3B8] font-bold">Notification Message</label>
                    <textarea
                      rows={3}
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      placeholder="Type the announcement details to be delivered directly to participants' notifications tray..."
                      required
                      className="w-full bg-[#111524] border border-white/[0.08] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#6366F1]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase text-[#94A3B8] font-bold">Action Link (Optional)</label>
                      <input
                        type="text"
                        value={broadcastLink}
                        onChange={(e) => setBroadcastLink(e.target.value)}
                        placeholder="e.g. /dashboard/student or /hackathons/my-hackathon"
                        className="w-full bg-[#111524] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#6366F1]"
                      />
                    </div>

                    <div className="sm:pt-5 flex justify-end">
                      <button
                        type="submit"
                        disabled={broadcasting || !broadcastTitle.trim() || !broadcastMessage.trim()}
                        className="px-5 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold text-xs transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                      >
                        {broadcasting ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>{broadcasting ? "Pushing Broadcast..." : "Push Notification"}</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Host Notifications Inbox */}
              <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] rounded-2xl shadow-sm p-6 space-y-4">
                <div className="border-b border-white/[0.08] pb-3 flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-[#F8FAFC] flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#818CF8]" />
                    Host Activity & System Alerts
                  </h3>
                  <span className="text-[10px] font-mono text-[#64748B]">
                    {notifications.length} logged
                  </span>
                </div>

                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-xs font-mono text-[#64748B]">
                    No notifications recorded yet.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {notifications.map((n: any) => (
                      <div
                        key={n.id}
                        className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-start justify-between gap-3 text-xs font-mono"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[#818CF8] font-bold uppercase">{n.type}</span>
                            {n.payload?.title && (
                              <strong className="text-white text-xs">{n.payload.title}</strong>
                            )}
                          </div>
                          <p className="text-[#94A3B8]">
                            {typeof n.payload === "string"
                              ? n.payload
                              : n.payload?.message || JSON.stringify(n.payload)}
                          </p>
                        </div>
                        <span className="text-[10px] text-[#64748B] whitespace-nowrap">
                          {new Date(n.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] rounded-2xl shadow-sm p-6 space-y-6">
              <div className="border-b border-white/[0.08] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-extrabold text-[#F8FAFC] flex items-center gap-2">
                    <User className="w-4 h-4 text-[#6366F1]" />
                    Organizer Chapter Profile
                  </h2>
                  <p className="text-xs text-[#64748B] font-mono mt-0.5">
                    Edit institutional identity, coordinator details, and payment credentials
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30 font-bold">
                    {profile.hackId || session.hackathonId || "HOST-ACTIVE"}
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
                    profile.approvalStatus === "APPROVED"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                  }`}>
                    {profile.approvalStatus || "PENDING"}
                  </span>
                </div>
              </div>

              {profileActionMsg && (
                <div className={`p-3.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 ${
                  profileActionMsg.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-red-500/10 border-red-500/30 text-red-400"
                }`}>
                  {profileActionMsg.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span>{profileActionMsg.text}</span>
                </div>
              )}

              {/* Editable Profile Form */}
              <form onSubmit={handleSaveProfile} className="space-y-6 text-xs font-mono">
                {/* Organization Details */}
                <div className="space-y-4">
                  <div className="text-[11px] uppercase tracking-wider text-[#6366F1] font-bold">
                    Institution & Chapter Details
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase text-[#94A3B8] font-bold">
                        Organization / College Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={profileForm.orgName}
                        onChange={(e) => setProfileForm({ ...profileForm, orgName: e.target.value })}
                        required
                        placeholder="e.g. Stanford University / TechCorp Labs"
                        className="w-full bg-[#111524] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#6366F1]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase text-[#94A3B8] font-bold">
                        Chapter Type <span className="text-red-400">*</span>
                      </label>
                      <select
                        value={profileForm.type}
                        onChange={(e) => setProfileForm({ ...profileForm, type: e.target.value })}
                        className="w-full bg-[#111524] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#6366F1]"
                      >
                        <option value="college">Collegiate Institution / University</option>
                        <option value="company">Enterprise / Startup / Community</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase text-[#94A3B8] font-bold">
                        City / Campus Location
                      </label>
                      <input
                        type="text"
                        value={profileForm.city}
                        onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                        placeholder="e.g. Bangalore, Karnataka"
                        className="w-full bg-[#111524] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#6366F1]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase text-[#94A3B8] font-bold">
                        Official Website
                      </label>
                      <input
                        type="url"
                        value={profileForm.website}
                        onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
                        placeholder="https://example.edu"
                        className="w-full bg-[#111524] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#6366F1]"
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-[10px] uppercase text-[#94A3B8] font-bold">
                        Campus / Institutional Address
                      </label>
                      <input
                        type="text"
                        value={profileForm.address}
                        onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                        placeholder="e.g. 100 Innovation Boulevard, Tech Park, Phase 1"
                        className="w-full bg-[#111524] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#6366F1]"
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-[10px] uppercase text-[#94A3B8] font-bold">
                        Chapter Bio / Mission Statement
                      </label>
                      <textarea
                        rows={2}
                        value={profileForm.bio}
                        onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                        placeholder="Brief overview of your organizing committee, developer club, or institutional arena..."
                        className="w-full bg-[#111524] border border-white/[0.08] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#6366F1]"
                      />
                    </div>
                  </div>
                </div>

                {/* Coordinator & Contact Info */}
                <div className="pt-4 border-t border-white/[0.06] space-y-4">
                  <div className="text-[11px] uppercase tracking-wider text-[#6366F1] font-bold">
                    Official Coordinator & Verification Contact
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase text-[#94A3B8] font-bold">
                        Coordinator Full Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={profileForm.coordinatorName}
                        onChange={(e) => setProfileForm({ ...profileForm, coordinatorName: e.target.value })}
                        required
                        placeholder="e.g. Dr. Ramesh Kumar"
                        className="w-full bg-[#111524] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#6366F1]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase text-[#94A3B8] font-bold">
                        Coordinator Phone Number
                      </label>
                      <input
                        type="tel"
                        value={profileForm.coordinatorPhone}
                        onChange={(e) => setProfileForm({ ...profileForm, coordinatorPhone: e.target.value })}
                        placeholder="e.g. 9876543210"
                        className="w-full bg-[#111524] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#6366F1]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase text-[#94A3B8] font-bold">
                        Official Login Email (Read Only)
                      </label>
                      <input
                        type="email"
                        value={session?.email || ""}
                        disabled
                        className="w-full bg-[#111524]/60 border border-white/[0.04] rounded-xl px-3.5 py-2.5 text-xs text-[#94A3B8] cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase text-[#94A3B8] font-bold">
                        Permanent Host ID
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={profile.hackId || "HOST-PENDING"}
                          disabled
                          className="w-full bg-[#111524]/60 border border-white/[0.04] rounded-xl px-3.5 py-2.5 text-xs text-[#818CF8] font-bold cursor-not-allowed"
                        />
                        {profile.hackId && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(profile.hackId);
                              alert("Copied Host ID!");
                            }}
                            className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white"
                            title="Copy Host ID"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Banking & UPI Defaults */}
                <div className="pt-4 border-t border-white/[0.06] space-y-4">
                  <div className="text-[11px] uppercase tracking-wider text-[#6366F1] font-bold">
                    Default Payment & Payout Setup
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase text-[#94A3B8] font-bold">
                        Default Host UPI ID
                      </label>
                      <input
                        type="text"
                        value={profileForm.upiId}
                        onChange={(e) => setProfileForm({ ...profileForm, upiId: e.target.value })}
                        placeholder="e.g. hostorganizer@okaxis"
                        className="w-full bg-[#111524] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#6366F1]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase text-[#94A3B8] font-bold">
                        Bank Beneficiary / Account Name
                      </label>
                      <input
                        type="text"
                        value={profileForm.bankAccountName}
                        onChange={(e) => setProfileForm({ ...profileForm, bankAccountName: e.target.value })}
                        placeholder="e.g. IEEE Student Chapter Account"
                        className="w-full bg-[#111524] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#6366F1]"
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-4 border-t border-white/[0.06] flex items-center justify-end gap-3">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-6 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold text-xs transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                  >
                    {savingProfile ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>{savingProfile ? "Saving Profile..." : "Save Profile Changes"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function HostDashboard() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 rounded-full border-2 border-[#6366F1] border-t-transparent animate-spin" />
        </div>
      }
    >
      <HostDashboardContent />
    </Suspense>
  );
}
