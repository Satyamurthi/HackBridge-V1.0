"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  ShieldCheck, 
  Building2, 
  Users,
  Trophy,
  Gavel,
  CreditCard,
  FileText,
  Settings,
  Activity,
  Check, 
  X, 
  Pause, 
  Play, 
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Search,
  Key,
  Server,
  Lock,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  Edit2,
  Trash2,
  Compass,
  FileSpreadsheet,
  Download,
} from "lucide-react";
import SiteContentCMS from "@/components/admin/SiteContentCMS";

type AdminTab = 
  | "users" 
  | "hackathons" 
  | "approvals" 
  | "judges" 
  | "payments" 
  | "content" 
  | "settings" 
  | "audit";

interface HostRecord {
  id: string;
  userId: string;
  orgName: string;
  type: string;
  approvalStatus: string;
  membershipStatus: string;
  website?: string | null;
  upiId?: string | null;
  bio?: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    createdAt: string;
  };
  _count?: {
    hackathons: number;
  };
}

interface AuditRecord {
  id: string;
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  metadata?: string | null;
  createdAt: string;
  actor?: {
    name: string;
    email: string;
    role: string;
  } | null;
}

interface AdminUserRecord {
  id: string;
  email: string;
  phone?: string | null;
  role: "STUDENT" | "HOST" | "JUDGE" | "SUPER_ADMIN";
  status: "ACTIVE" | "PAUSED" | "REJECTED";
  name: string;
  createdAt: string;
  studentProfile?: {
    id?: string;
    hackathonId: string;
    college?: string;
    collegeName?: string;
    course?: string;
    githubUsername?: string | null;
    bio?: string | null;
    skills?: string | null;
  } | null;
  hostProfile?: {
    id?: string;
    orgName: string;
    type: string;
    approvalStatus: string;
    upiId?: string | null;
    website?: string | null;
    bio?: string | null;
  } | null;
  judgeProfile?: {
    id?: string;
    approvalStatus: string;
    designation?: string | null;
    company?: string | null;
  } | null;
  judgeProfiles?: Array<{
    id: string;
    hackathonId: string;
    designation?: string | null;
    company?: string | null;
    approvalStatus: string;
    hackathon?: { id: string; title: string };
  }>;
}

interface AdminHackathonRecord {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  rules?: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  registrationDeadline?: string | null;
  registrationStart?: string;
  registrationEnd?: string;
  eventStart?: string;
  eventEnd?: string;
  startAt?: string;
  endAt?: string;
  fee: number;
  paymentMode?: string;
  upiId?: string | null;
  qrImageUrl?: string | null;
  bannerUrl?: string | null;
  prizePool?: string | null;
  minTeamSize?: number;
  maxTeamSize?: number;
  teamMin?: number;
  teamMax?: number;
  createdAt: string;
  host: {
    id?: string;
    orgName: string;
    type: string;
    upiId?: string | null;
    user: {
      name: string;
      email: string;
    };
  };
  _count: {
    teams: number;
    domains: number;
    judges: number;
    problems?: number;
  };
}

interface AdminJudgeRecord {
  id: string;
  userId: string;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  company?: string | null;
  designation?: string | null;
  experienceYears?: number | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    status: string;
  };
  hackathon?: {
    id: string;
    title: string;
    slug?: string;
  } | null;
  assignments?: Array<{
    id: string;
    hackathon: {
      id: string;
      title: string;
    };
  }>;
  _count?: {
    scores: number;
  };
}

interface AdminPaymentRecord {
  id: string;
  teamId: string;
  amount: number;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  method: "UPI_QR" | "RAZORPAY";
  transactionRef: string;
  screenshotUrl?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
  team: {
    id: string;
    name: string;
    teamId?: string | null;
    leader: {
      name: string;
      email: string;
    };
    hackathon: {
      id: string;
      title: string;
      fee: number;
      host: {
        orgName: string;
      };
    };
  };
}

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");

  // Normalize tab string
  const resolveTab = (t: string | null): AdminTab => {
    if (!t) return "users";
    if (t === "hosts") return "approvals";
    if (t === "cms" || t === "nav" || t === "navigation" || t === "footer") return "content";
    if (["users", "hackathons", "approvals", "judges", "payments", "content", "settings", "audit"].includes(t)) {
      return t as AdminTab;
    }
    return "users";
  };

  const activeTab = resolveTab(rawTab);

  const setTab = (t: AdminTab) => {
    router.push(`/dashboard/admin?tab=${t}`);
  };

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Edit & Delete Modal States
  const [editingUser, setEditingUser] = useState<AdminUserRecord | null>(null);
  const [userEditForm, setUserEditForm] = useState<any>({});
  const [userEditSaving, setUserEditSaving] = useState(false);
  const [deletingUser, setDeletingUser] = useState<AdminUserRecord | null>(null);
  const [userDeleteLoading, setUserDeleteLoading] = useState(false);

  const [editingHackathon, setEditingHackathon] = useState<AdminHackathonRecord | null>(null);
  const [hackathonEditForm, setHackathonEditForm] = useState<any>({});
  const [hackathonEditSaving, setHackathonEditSaving] = useState(false);
  const [deletingHackathon, setDeletingHackathon] = useState<AdminHackathonRecord | null>(null);
  const [hackathonDeleteLoading, setHackathonDeleteLoading] = useState(false);
  const [exportingHackathonId, setExportingHackathonId] = useState<string | null>(null);

  const [deletingHost, setDeletingHost] = useState<HostRecord | null>(null);
  const [deletingJudge, setDeletingJudge] = useState<AdminJudgeRecord | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<AdminPaymentRecord | null>(null);

  // Global Pending Badges
  const [pendingBadges, setPendingBadges] = useState({
    hosts: 0,
    judges: 0,
    payments: 0,
  });

  // Users State
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");
  const [userStatusFilter, setUserStatusFilter] = useState("ALL");
  const [userSearch, setUserSearch] = useState("");
  const [userCounts, setUserCounts] = useState({
    total: 0,
    students: 0,
    hosts: 0,
    judges: 0,
    admins: 0,
    active: 0,
    paused: 0,
    rejected: 0,
  });

  // Hackathons State
  const [hackathons, setHackathons] = useState<AdminHackathonRecord[]>([]);
  const [hackathonsLoading, setHackathonsLoading] = useState(false);
  const [hackathonStatusFilter, setHackathonStatusFilter] = useState("ALL");
  const [hackathonSearch, setHackathonSearch] = useState("");
  const [hackathonCounts, setHackathonCounts] = useState({
    total: 0,
    published: 0,
    draft: 0,
    archived: 0,
  });

  // Hosts / Approvals State
  const [hosts, setHosts] = useState<HostRecord[]>([]);
  const [hostsLoading, setHostsLoading] = useState(false);
  const [hostFilter, setHostFilter] = useState("ALL");
  const [hostSearch, setHostSearch] = useState("");

  // Judges State
  const [judges, setJudges] = useState<AdminJudgeRecord[]>([]);
  const [judgesLoading, setJudgesLoading] = useState(false);
  const [judgeStatusFilter, setJudgeStatusFilter] = useState("ALL");
  const [judgeCounts, setJudgeCounts] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
  });

  // Payments State
  const [payments, setPayments] = useState<AdminPaymentRecord[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("ALL");
  const [paymentCounts, setPaymentCounts] = useState({
    total: 0,
    verified: 0,
    pending: 0,
    rejected: 0,
    totalRevenue: 0,
  });

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Platform Settings State
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [integrations, setIntegrations] = useState<any>(null);
  const [systemConfig, setSystemConfig] = useState({
    maintenanceMode: false,
    newRegistrationsOpen: true,
    maxFileUploadSizeMB: 10,
    noticeBanner: "",
  });
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Check super admin session
  useEffect(() => {
    fetch("/api/v1/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setSession(data.user);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();
      if (userRoleFilter !== "ALL") params.set("role", userRoleFilter);
      if (userStatusFilter !== "ALL") params.set("status", userStatusFilter);
      if (userSearch.trim()) params.set("q", userSearch.trim());

      const res = await fetch(`/api/v1/admin/users?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        if (data.counts) setUserCounts(data.counts);
      } else {
        const err = await res.json();
        setErrorMessage(err.error || "Failed to load users");
      }
    } catch {
      setErrorMessage("Network error loading users");
    } finally {
      setUsersLoading(false);
    }
  }, [userRoleFilter, userStatusFilter, userSearch]);

  // Fetch Hackathons
  const fetchHackathons = useCallback(async () => {
    setHackathonsLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();
      if (hackathonStatusFilter !== "ALL") params.set("status", hackathonStatusFilter);
      if (hackathonSearch.trim()) params.set("q", hackathonSearch.trim());

      const res = await fetch(`/api/v1/admin/hackathons?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setHackathons(data.hackathons || []);
        if (data.counts) setHackathonCounts(data.counts);
      } else {
        const err = await res.json();
        setErrorMessage(err.error || "Failed to load hackathons");
      }
    } catch {
      setErrorMessage("Network error loading hackathons");
    } finally {
      setHackathonsLoading(false);
    }
  }, [hackathonStatusFilter, hackathonSearch]);

  // Fetch Hosts
  const fetchHosts = useCallback(async () => {
    setHostsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/v1/admin/hosts");
      if (res.ok) {
        const data = await res.json();
        setHosts(data.hosts || []);
        const pending = (data.hosts || []).filter((h: HostRecord) => h.approvalStatus === "PENDING").length;
        setPendingBadges((prev) => ({ ...prev, hosts: pending }));
      } else {
        const err = await res.json();
        setErrorMessage(err.error || "Failed to load hosts");
      }
    } catch {
      setErrorMessage("Network error loading hosts");
    } finally {
      setHostsLoading(false);
    }
  }, []);

  // Fetch Judges
  const fetchJudges = useCallback(async () => {
    setJudgesLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();
      if (judgeStatusFilter !== "ALL") params.set("approvalStatus", judgeStatusFilter);

      const res = await fetch(`/api/v1/admin/judges?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setJudges(data.judges || []);
        if (data.counts) {
          setJudgeCounts(data.counts);
          setPendingBadges((prev) => ({ ...prev, judges: data.counts.pending || 0 }));
        }
      } else {
        const err = await res.json();
        setErrorMessage(err.error || "Failed to load judges");
      }
    } catch {
      setErrorMessage("Network error loading judges");
    } finally {
      setJudgesLoading(false);
    }
  }, [judgeStatusFilter]);

  // Fetch Payments
  const fetchPayments = useCallback(async () => {
    setPaymentsLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();
      if (paymentStatusFilter !== "ALL") params.set("status", paymentStatusFilter);

      const res = await fetch(`/api/v1/admin/payments?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
        if (data.counts) {
          setPaymentCounts(data.counts);
          setPendingBadges((prev) => ({ ...prev, payments: data.counts.pending || 0 }));
        }
      } else {
        const err = await res.json();
        setErrorMessage(err.error || "Failed to load payments");
      }
    } catch {
      setErrorMessage("Network error loading payments");
    } finally {
      setPaymentsLoading(false);
    }
  }, [paymentStatusFilter]);

  // Fetch Audit Logs
  const fetchAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await fetch("/api/v1/admin/audit?limit=60");
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch {
      // ignore
    } finally {
      setAuditLoading(false);
    }
  }, []);

  // Fetch Settings
  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch("/api/v1/admin/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.settings) setSystemConfig(data.settings);
        if (data.integrations) setIntegrations(data.integrations);
      }
    } catch {
      // ignore
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  // Trigger data load based on current activeTab
  useEffect(() => {
    if (session?.role !== "SUPER_ADMIN") return;

    if (activeTab === "users") fetchUsers();
    else if (activeTab === "hackathons") fetchHackathons();
    else if (activeTab === "approvals") fetchHosts();
    else if (activeTab === "judges") fetchJudges();
    else if (activeTab === "payments") fetchPayments();
    else if (activeTab === "settings") fetchSettings();
    else if (activeTab === "audit") fetchAuditLogs();
  }, [activeTab, session, fetchUsers, fetchHackathons, fetchHosts, fetchJudges, fetchPayments, fetchSettings, fetchAuditLogs]);

  // Background badge sync on mount
  useEffect(() => {
    if (session?.role === "SUPER_ADMIN") {
      fetchHosts();
      fetchJudges();
      fetchPayments();
    }
  }, [session, fetchHosts, fetchJudges, fetchPayments]);

  // Actions
  const handleUpdateUserStatus = async (userId: string, newStatus: string) => {
    setActionMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/v1/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        setErrorMessage(err.error || "Failed to update user status");
        return;
      }
      setActionMessage(`User account status updated to ${newStatus}. Logged to audit trail.`);
      fetchUsers();
      setTimeout(() => setActionMessage(null), 4000);
    } catch {
      setErrorMessage("Network error updating user");
    }
  };

  const handleOpenEditUser = (u: AdminUserRecord) => {
    setEditingUser(u);
    setUserEditForm({
      userId: u.id,
      name: u.name,
      email: u.email,
      phone: (u as any).phone || "",
      role: u.role,
      status: u.status,
      college: u.studentProfile?.college || (u.studentProfile as any)?.collegeName || "",
      githubUsername: u.studentProfile?.githubUsername || "",
      bio: u.studentProfile?.bio || "",
      skills: u.studentProfile?.skills || "",
      orgName: u.hostProfile?.orgName || "",
      type: u.hostProfile?.type || "college",
      upiId: (u.hostProfile as any)?.upiId || "",
      website: u.hostProfile?.website || "",
      hostApprovalStatus: u.hostProfile?.approvalStatus || "APPROVED",
      designation: u.judgeProfile?.designation || (u.judgeProfiles && u.judgeProfiles[0]?.designation) || "",
      company: u.judgeProfile?.company || (u.judgeProfiles && u.judgeProfiles[0]?.company) || "",
      judgeApprovalStatus: u.judgeProfile?.approvalStatus || (u.judgeProfiles && u.judgeProfiles[0]?.approvalStatus) || "APPROVED",
    });
  };

  const handleSaveUserModal = async () => {
    setUserEditSaving(true);
    setActionMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/v1/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userEditForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to update user");
        return;
      }
      setActionMessage(data.message || "User details saved successfully.");
      setEditingUser(null);
      fetchUsers();
      setTimeout(() => setActionMessage(null), 4000);
    } catch {
      setErrorMessage("Network error saving user details");
    } finally {
      setUserEditSaving(false);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!deletingUser) return;
    setUserDeleteLoading(true);
    setActionMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/v1/admin/users?id=${deletingUser.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to delete user");
        return;
      }
      setActionMessage(data.message || "User permanently deleted.");
      setDeletingUser(null);
      fetchUsers();
      setTimeout(() => setActionMessage(null), 4000);
    } catch {
      setErrorMessage("Network error deleting user");
    } finally {
      setUserDeleteLoading(false);
    }
  };

  const handleOpenEditHackathon = (h: AdminHackathonRecord) => {
    setEditingHackathon(h);
    setHackathonEditForm({
      hackathonId: h.id,
      title: h.title,
      slug: (h as any).slug || "",
      description: (h as any).description || "",
      rules: (h as any).rules || "",
      fee: h.fee || 0,
      paymentMode: (h as any).paymentMode || "FREE",
      upiId: (h as any).upiId || "",
      bannerUrl: (h as any).bannerUrl || "",
      prizePool: (h as any).prizePool || "",
      teamMin: (h as any).teamMin || h.minTeamSize || 1,
      teamMax: (h as any).teamMax || h.maxTeamSize || 4,
      registrationDeadline: (h as any).registrationDeadline
        ? new Date((h as any).registrationDeadline).toISOString().slice(0, 16)
        : "",
      startAt: (h as any).startAt || (h as any).eventStart
        ? new Date((h as any).startAt || (h as any).eventStart).toISOString().slice(0, 16)
        : "",
      revealAt: (h as any).domains?.[0]?.revealAt
        ? new Date((h as any).domains[0].revealAt).toISOString().slice(0, 16)
        : (h as any).startAt ? new Date((h as any).startAt).toISOString().slice(0, 16) : "",
      endAt: (h as any).endAt || (h as any).eventEnd
        ? new Date((h as any).endAt || (h as any).eventEnd).toISOString().slice(0, 16)
        : "",
      status: h.status,
    });
  };

  const handleSaveHackathonModal = async () => {
    setHackathonEditSaving(true);
    setActionMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/v1/admin/hackathons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hackathonEditForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to update hackathon");
        return;
      }
      setActionMessage(data.message || "Hackathon successfully updated.");
      setEditingHackathon(null);
      fetchHackathons();
      setTimeout(() => setActionMessage(null), 4000);
    } catch {
      setErrorMessage("Network error updating hackathon");
    } finally {
      setHackathonEditSaving(false);
    }
  };

  const handleConfirmDeleteHackathon = async () => {
    if (!deletingHackathon) return;
    setHackathonDeleteLoading(true);
    setActionMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/v1/admin/hackathons?id=${deletingHackathon.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to delete hackathon");
        return;
      }
      setActionMessage(data.message || "Hackathon permanently deleted.");
      setDeletingHackathon(null);
      fetchHackathons();
      setTimeout(() => setActionMessage(null), 4000);
    } catch {
      setErrorMessage("Network error deleting hackathon");
    } finally {
      setHackathonDeleteLoading(false);
    }
  };

  const handleExportHackathonExcel = async (hackathonId: string, title: string) => {
    try {
      setExportingHackathonId(hackathonId);
      setActionMessage(`Generating complete Excel export for "${title}" (Teams, Students, Problems, Judges)...`);
      const res = await fetch(`/api/v1/admin/hackathons/${hackathonId}/export`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setErrorMessage(err.error || "Failed to generate Excel export");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[^a-zA-Z0-9_-]/g, "_")}_Export.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setActionMessage(`Export downloaded successfully for "${title}"!`);
      setTimeout(() => setActionMessage(null), 4000);
    } catch {
      setErrorMessage("Network error generating Excel export");
    } finally {
      setExportingHackathonId(null);
    }
  };

  const handleConfirmDeleteHost = async () => {
    if (!deletingHost) return;
    try {
      const res = await fetch(`/api/v1/admin/hosts?id=${deletingHost.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to delete host");
        return;
      }
      setActionMessage("Host profile permanently deleted.");
      setDeletingHost(null);
      fetchHosts();
      setTimeout(() => setActionMessage(null), 4000);
    } catch {
      setErrorMessage("Network error deleting host");
    }
  };

  const handleConfirmDeleteJudge = async () => {
    if (!deletingJudge) return;
    try {
      const res = await fetch(`/api/v1/admin/judges?id=${deletingJudge.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to delete judge");
        return;
      }
      setActionMessage("Judge assignment permanently deleted.");
      setDeletingJudge(null);
      fetchJudges();
      setTimeout(() => setActionMessage(null), 4000);
    } catch {
      setErrorMessage("Network error deleting judge");
    }
  };

  const handleConfirmDeletePayment = async () => {
    if (!deletingPayment) return;
    try {
      const res = await fetch(`/api/v1/admin/payments?id=${deletingPayment.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to delete payment");
        return;
      }
      setActionMessage("Payment record permanently deleted.");
      setDeletingPayment(null);
      fetchPayments();
      setTimeout(() => setActionMessage(null), 4000);
    } catch {
      setErrorMessage("Network error deleting payment");
    }
  };

  const handleUpdateHackathonStatus = async (hackathonId: string, newStatus: string) => {
    setActionMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/v1/admin/hackathons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hackathonId, status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        setErrorMessage(err.error || "Failed to update hackathon status");
        return;
      }
      setActionMessage(`Hackathon lifecycle status set to ${newStatus}. Logged to audit stream.`);
      fetchHackathons();
      setTimeout(() => setActionMessage(null), 4000);
    } catch {
      setErrorMessage("Network error updating hackathon");
    }
  };

  const handleUpdateHostStatus = async (hostId: string, newStatus: "APPROVED" | "PAUSED" | "REJECTED") => {
    setActionMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/v1/admin/hosts/${hostId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        setErrorMessage(err.error || "Failed to update host status");
        return;
      }
      const data = await res.json();
      setActionMessage(`Host ${data.host?.orgName || hostId} status changed to ${newStatus}. Recorded to audit log.`);
      fetchHosts();
      setTimeout(() => setActionMessage(null), 4000);
    } catch {
      setErrorMessage("Network error updating host");
    }
  };

  const handleUpdateJudgeStatus = async (judgeId: string, approvalStatus: string) => {
    setActionMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/v1/admin/judges", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ judgeId, approvalStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        setErrorMessage(err.error || "Failed to update judge status");
        return;
      }
      setActionMessage(`Judge evaluation clearance set to ${approvalStatus}.`);
      fetchJudges();
      setTimeout(() => setActionMessage(null), 4000);
    } catch {
      setErrorMessage("Network error updating judge");
    }
  };

  const handleUpdatePaymentStatus = async (paymentId: string, status: string) => {
    setActionMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/v1/admin/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, status }),
      });
      if (!res.ok) {
        const err = await res.json();
        setErrorMessage(err.error || "Failed to update payment");
        return;
      }
      const data = await res.json();
      setActionMessage(data.message || `Payment marked as ${status}.`);
      fetchPayments();
      setTimeout(() => setActionMessage(null), 4000);
    } catch {
      setErrorMessage("Network error updating payment");
    }
  };

  const handleSaveSettings = async (updates: Partial<typeof systemConfig>) => {
    setSettingsSaving(true);
    setActionMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/v1/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res.json();
        setErrorMessage(err.error || "Failed to save settings");
        return;
      }
      const data = await res.json();
      setSystemConfig(data.settings);
      setActionMessage("Platform settings updated. Audit trail recorded.");
      setTimeout(() => setActionMessage(null), 4000);
    } catch {
      setErrorMessage("Network error updating settings");
    } finally {
      setSettingsSaving(false);
    }
  };

  // Filtered hosts client search
  const filteredHosts = hosts.filter((h) => {
    const matchesFilter = hostFilter === "ALL" || h.approvalStatus === hostFilter;
    const q = hostSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      h.orgName.toLowerCase().includes(q) ||
      h.user.name.toLowerCase().includes(q) ||
      h.user.email.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-[#6366F1] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (session?.role !== "SUPER_ADMIN") {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center font-mono">
        <ShieldCheck className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-sm text-[#94A3B8] mb-6">
          This command center requires <code>SUPER_ADMIN</code> clearance level.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center px-4 py-2 rounded-xl bg-[#6366F1] text-white text-xs font-bold hover:bg-[#4F46E5] transition-colors"
        >
          Authenticate as Admin
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full animate-fade-in">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#6366F1] uppercase tracking-wider mb-1">
            <span>HackBridge</span>
            <span>/</span>
            <span>Governance</span>
            <span>/</span>
            <span className="text-[#818CF8] font-bold">Super Admin Command</span>
          </div>
          <h1 className="text-2xl font-display font-extrabold text-[#F8FAFC]">
            Platform Oversight &amp; Governance Center
          </h1>
          <p className="text-xs text-[#94A3B8] font-mono mt-0.5">
            Authenticated as: <span className="text-[#F8FAFC] font-bold">{session.email}</span> · Full Moderation &amp; Audit Authority
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (activeTab === "users") fetchUsers();
              else if (activeTab === "hackathons") fetchHackathons();
              else if (activeTab === "approvals") fetchHosts();
              else if (activeTab === "judges") fetchJudges();
              else if (activeTab === "payments") fetchPayments();
              else if (activeTab === "settings") fetchSettings();
              else if (activeTab === "audit") fetchAuditLogs();
            }}
            className="p-2 rounded-xl bg-[#0B0E18]/70 border border-white/[0.08] hover:border-white/20 text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
            title="Refresh current data view"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="px-3 py-1.5 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/30 font-mono text-xs text-[#818CF8] flex items-center gap-2">
            <span className="text-[10px] text-[#94A3B8] uppercase">Clearance:</span>
            <span className="font-bold">SUPER_ADMIN</span>
          </div>
        </div>
      </div>

      {actionMessage && (
        <div className="mb-6 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400 flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-mono text-red-400 flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Sidebar */}
        <aside className="md:col-span-3 space-y-4">
          <nav className="p-2 rounded-2xl bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] shadow-sm space-y-1 text-xs font-mono">
            {/* Users */}
            <button
              onClick={() => setTab("users")}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center justify-between ${
                activeTab === "users"
                  ? "bg-[#6366F1] text-white font-bold shadow-sm"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4" />
                <span>Users &amp; Roles</span>
              </div>
            </button>

            {/* Hackathons */}
            <button
              onClick={() => setTab("hackathons")}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center justify-between ${
                activeTab === "hackathons"
                  ? "bg-[#6366F1] text-white font-bold shadow-sm"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Trophy className="w-4 h-4" />
                <span>Hackathons</span>
              </div>
            </button>

            {/* Host Approvals */}
            <button
              onClick={() => setTab("approvals")}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center justify-between ${
                activeTab === "approvals"
                  ? "bg-[#6366F1] text-white font-bold shadow-sm"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4" />
                <span>Host Approvals</span>
              </div>
              {pendingBadges.hosts > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === "approvals" ? "bg-white text-[#6366F1]" : "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                }`}>
                  {pendingBadges.hosts}
                </span>
              )}
            </button>

            {/* Judges */}
            <button
              onClick={() => setTab("judges")}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center justify-between ${
                activeTab === "judges"
                  ? "bg-[#6366F1] text-white font-bold shadow-sm"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Gavel className="w-4 h-4" />
                <span>Judges Roster</span>
              </div>
              {pendingBadges.judges > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === "judges" ? "bg-white text-[#6366F1]" : "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                }`}>
                  {pendingBadges.judges}
                </span>
              )}
            </button>

            {/* Payments */}
            <button
              onClick={() => setTab("payments")}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center justify-between ${
                activeTab === "payments"
                  ? "bg-[#6366F1] text-white font-bold shadow-sm"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4" />
                <span>Financial Queue</span>
              </div>
              {pendingBadges.payments > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === "payments" ? "bg-white text-[#6366F1]" : "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                }`}>
                  {pendingBadges.payments}
                </span>
              )}
            </button>

            {/* Content / CMS */}
            <button
              onClick={() => setTab("content")}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-2.5 ${
                activeTab === "content"
                  ? "bg-[#6366F1] text-white font-bold shadow-sm"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Site CMS</span>
            </button>

            {/* Platform Settings */}
            <button
              onClick={() => setTab("settings")}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-2.5 ${
                activeTab === "settings"
                  ? "bg-[#6366F1] text-white font-bold shadow-sm"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Platform Rules</span>
            </button>

            {/* Audit Trail */}
            <button
              onClick={() => setTab("audit")}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-2.5 ${
                activeTab === "audit"
                  ? "bg-[#6366F1] text-white font-bold shadow-sm"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]"
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Audit Trail</span>
            </button>
          </nav>

          {/* Quick Metrics */}
          <div className="p-4 rounded-2xl bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] shadow-sm space-y-3 font-mono text-xs">
            <div className="text-[10px] text-[#64748B] uppercase tracking-wider font-bold">
              Action Items
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#94A3B8]">Pending Hosts:</span>
              <span className="text-amber-400 font-extrabold">{pendingBadges.hosts}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#94A3B8]">Pending Judges:</span>
              <span className="text-amber-400 font-extrabold">{pendingBadges.judges}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#94A3B8]">Pending Payments:</span>
              <span className="text-amber-400 font-extrabold">{pendingBadges.payments}</span>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="md:col-span-9 space-y-6">
          {/* TAB 1: USERS */}
          {activeTab === "users" && (
            <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] rounded-2xl p-6 space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-[#F8FAFC] tracking-tight">
                    Registered Users Directory &amp; RBAC Control
                  </h2>
                  <p className="text-[11px] text-[#94A3B8] font-mono mt-0.5">
                    Search and manage student, host, and judge credentials across the platform.
                  </p>
                </div>
                <button
                  onClick={fetchUsers}
                  className="px-2.5 py-1 text-[11px] font-mono rounded-lg bg-white/[0.04] border border-white/10 text-[#94A3B8] hover:text-[#F8FAFC] self-start"
                >
                  Refresh
                </button>
              </div>

              {/* Metric Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="text-[10px] text-[#64748B] uppercase">Total Users</div>
                  <div className="text-lg font-extrabold text-[#F8FAFC]">{userCounts.total}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="text-[10px] text-[#64748B] uppercase">Students</div>
                  <div className="text-lg font-extrabold text-[#818CF8]">{userCounts.students}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="text-[10px] text-[#64748B] uppercase">Hosts</div>
                  <div className="text-lg font-extrabold text-emerald-400">{userCounts.hosts}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="text-[10px] text-[#64748B] uppercase">Judges</div>
                  <div className="text-lg font-extrabold text-amber-400">{userCounts.judges}</div>
                </div>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col lg:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#64748B]" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search by user name, email, or student ID..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#111524]/70 border border-white/[0.1] text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#6366F1] font-mono"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#111524]/60 border border-white/[0.08] text-xs font-mono">
                  {["ALL", "STUDENT", "HOST", "JUDGE", "SUPER_ADMIN"].map((r) => (
                    <button
                      key={r}
                      onClick={() => setUserRoleFilter(r)}
                      className={`px-2 py-1 rounded-lg transition-colors text-[10px] ${
                        userRoleFilter === r
                          ? "bg-[#6366F1] text-white font-bold"
                          : "text-[#94A3B8] hover:text-[#F8FAFC]"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#111524]/60 border border-white/[0.08] text-xs font-mono">
                  {["ALL", "ACTIVE", "PAUSED", "REJECTED"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setUserStatusFilter(s)}
                      className={`px-2 py-1 rounded-lg transition-colors text-[10px] ${
                        userStatusFilter === s
                          ? "bg-[#6366F1] text-white font-bold"
                          : "text-[#94A3B8] hover:text-[#F8FAFC]"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Users Table */}
              {usersLoading ? (
                <div className="p-12 text-center text-xs font-mono text-[#64748B]">
                  Loading user records...
                </div>
              ) : users.length === 0 ? (
                <div className="p-12 text-center text-xs font-mono text-[#64748B]">
                  No users match the search or filter criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/[0.08] text-[#64748B] text-[10px] uppercase">
                        <th className="py-3 px-4">User &amp; Email</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Profile Details</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Account Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-white/[0.01]">
                          <td className="py-3 px-4">
                            <div className="font-bold text-[#F8FAFC]">{u.name}</div>
                            <div className="text-[11px] text-[#94A3B8]">{u.email}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              u.role === "SUPER_ADMIN"
                                ? "bg-red-500/20 text-red-300 border border-red-500/40"
                                : u.role === "HOST"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                : u.role === "JUDGE"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                : "bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/40"
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[#94A3B8]">
                            {u.studentProfile && (
                              <div>
                                <span className="text-[10px] text-[#64748B]">ID: </span>
                                <span className="font-bold text-[#F8FAFC]">{u.studentProfile.hackathonId}</span>
                                {u.studentProfile.collegeName && (
                                  <div className="text-[10px] truncate max-w-xs">{u.studentProfile.collegeName}</div>
                                )}
                              </div>
                            )}
                            {u.hostProfile && (
                              <div>
                                <span className="font-bold text-[#F8FAFC]">{u.hostProfile.orgName}</span>
                                <span className="text-[10px] text-[#64748B]"> ({u.hostProfile.type})</span>
                              </div>
                            )}
                            {u.judgeProfile && (
                              <div>
                                <span className="text-[#F8FAFC]">{u.judgeProfile.designation || "Judge"}</span>
                                {u.judgeProfile.company && (
                                  <span className="text-[10px] text-[#64748B]"> @ {u.judgeProfile.company}</span>
                                )}
                              </div>
                            )}
                            {!u.studentProfile && !u.hostProfile && !u.judgeProfile && (
                              <span className="text-[10px] text-[#64748B]">Platform Operator</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              u.status === "ACTIVE"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : u.status === "PAUSED"
                                ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                : "bg-red-500/10 text-red-400 border border-red-500/20"
                            }`}>
                              {u.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Edit User Button */}
                              <button
                                onClick={() => handleOpenEditUser(u)}
                                className="px-2 py-1 rounded bg-[#6366F1]/15 border border-[#6366F1]/30 text-[#818CF8] hover:bg-[#6366F1]/25 font-semibold text-[10px] flex items-center gap-1 transition-colors"
                                title="Edit user profile & permissions"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Edit</span>
                              </button>

                              {/* Status Quick Actions */}
                              {u.status !== "ACTIVE" && (
                                <button
                                  onClick={() => handleUpdateUserStatus(u.id, "ACTIVE")}
                                  className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold text-[10px] hover:bg-emerald-500/20 transition-colors"
                                >
                                  Activate
                                </button>
                              )}
                              {u.status === "ACTIVE" && (
                                <button
                                  onClick={() => handleUpdateUserStatus(u.id, "PAUSED")}
                                  className="px-2 py-1 rounded bg-white/10 text-[#F8FAFC] font-semibold text-[10px] hover:bg-white/20 transition-colors"
                                >
                                  Pause
                                </button>
                              )}

                              {/* Delete User Button */}
                              <button
                                onClick={() => setDeletingUser(u)}
                                disabled={u.id === session?.userId}
                                className="p-1.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                                title={u.id === session?.userId ? "Cannot delete own active Super Admin account" : "Delete user permanently"}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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

          {/* TAB 2: HACKATHONS */}
          {activeTab === "hackathons" && (
            <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] rounded-2xl p-6 space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-[#F8FAFC] tracking-tight">
                    National Hackathons Directory &amp; Life Cycle
                  </h2>
                  <p className="text-[11px] text-[#94A3B8] font-mono mt-0.5">
                    Monitor published arenas, drafts under review, problem tracks, and participant quotas.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start">
                  <button
                    onClick={fetchHackathons}
                    className="px-2.5 py-1 text-[11px] font-mono rounded-lg bg-white/[0.04] border border-white/10 text-[#94A3B8] hover:text-[#F8FAFC]"
                  >
                    Refresh
                  </button>
                  {hackathons.length > 0 && (
                    <button
                      onClick={() => handleExportHackathonExcel(hackathons[0].id, hackathons[0].title)}
                      disabled={exportingHackathonId !== null}
                      className="px-3 py-1 text-[11px] font-mono rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 flex items-center gap-1.5 transition-colors disabled:opacity-50 font-semibold"
                      title="Export active hackathon data to Excel (.xlsx)"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>{exportingHackathonId ? "Exporting..." : "Export Excel"}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="text-[10px] text-[#64748B] uppercase">Total Arenas</div>
                  <div className="text-lg font-extrabold text-[#F8FAFC]">{hackathonCounts.total}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="text-[10px] text-[#64748B] uppercase">Published Live</div>
                  <div className="text-lg font-extrabold text-emerald-400">{hackathonCounts.published}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="text-[10px] text-[#64748B] uppercase">Draft / In Review</div>
                  <div className="text-lg font-extrabold text-amber-400">{hackathonCounts.draft}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="text-[10px] text-[#64748B] uppercase">Archived</div>
                  <div className="text-lg font-extrabold text-[#94A3B8]">{hackathonCounts.archived}</div>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#64748B]" />
                  <input
                    type="text"
                    value={hackathonSearch}
                    onChange={(e) => setHackathonSearch(e.target.value)}
                    placeholder="Search hackathon title, host organization, or domain..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#111524]/70 border border-white/[0.1] text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#6366F1] font-mono"
                  />
                </div>

                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#111524]/60 border border-white/[0.08] text-xs font-mono">
                  {["ALL", "PUBLISHED", "DRAFT", "ARCHIVED"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setHackathonStatusFilter(s)}
                      className={`px-2.5 py-1 rounded-lg transition-colors text-[11px] ${
                        hackathonStatusFilter === s
                          ? "bg-[#6366F1] text-white font-bold"
                          : "text-[#94A3B8] hover:text-[#F8FAFC]"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              {hackathonsLoading ? (
                <div className="p-12 text-center text-xs font-mono text-[#64748B]">
                  Loading hackathons list...
                </div>
              ) : hackathons.length === 0 ? (
                <div className="p-12 text-center text-xs font-mono text-[#64748B]">
                  No hackathons match the current criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/[0.08] text-[#64748B] text-[10px] uppercase">
                        <th className="py-3 px-4">Hackathon &amp; Host</th>
                        <th className="py-3 px-4">Timeline</th>
                        <th className="py-3 px-4">Stats</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Governance Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {hackathons.map((h) => (
                        <tr key={h.id} className="hover:bg-white/[0.01]">
                          <td className="py-3 px-4">
                            <div className="font-bold text-[#F8FAFC] flex items-center gap-1.5">
                              {h.title}
                              <Link
                                href={`/hackathons/${h.id}`}
                                target="_blank"
                                className="text-[#64748B] hover:text-[#818CF8]"
                                title="View Live Arena"
                              >
                                <ArrowUpRight className="w-3 h-3" />
                              </Link>
                            </div>
                            <div className="text-[11px] text-[#94A3B8]">
                              {h.host?.orgName} ({h.host?.type}) · {h.host?.user?.email}
                            </div>
                            <div className="text-[10px] text-[#64748B] mt-0.5">
                              Fee: {h.fee === 0 ? "Free Entry" : `₹${h.fee}`} · Teams: {h.minTeamSize}-{h.maxTeamSize} members
                            </div>
                          </td>
                          <td className="py-3 px-4 text-[11px] text-[#94A3B8]">
                            <div>
                              Reg: {h.registrationStart ? new Date(h.registrationStart).toLocaleDateString() : (h.registrationDeadline ? new Date(h.registrationDeadline).toLocaleDateString() : "Open")}
                              {h.registrationEnd && ` – ${new Date(h.registrationEnd).toLocaleDateString()}`}
                            </div>
                            <div className="text-[10px] text-[#64748B]">
                              Event: {h.eventStart ? new Date(h.eventStart).toLocaleDateString() : (h.startAt ? new Date(h.startAt).toLocaleDateString() : "TBD")}
                              {(h.eventEnd || h.endAt) && ` – ${new Date((h.eventEnd || h.endAt)!).toLocaleDateString()}`}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-[#94A3B8]">
                            <div className="flex items-center gap-2 text-[11px]">
                              <span>{h._count?.teams || 0} teams</span>
                              <span>·</span>
                              <span>{h._count?.problems || 0} problems</span>
                              <span>·</span>
                              <span>{h._count?.judges || 0} judges</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              h.status === "PUBLISHED"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : h.status === "DRAFT"
                                ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                : "bg-white/5 text-[#94A3B8] border border-white/10"
                            }`}>
                              {h.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Edit Hackathon */}
                              <button
                                onClick={() => handleOpenEditHackathon(h)}
                                className="px-2 py-1 rounded bg-[#6366F1]/15 border border-[#6366F1]/30 text-[#818CF8] hover:bg-[#6366F1]/25 font-semibold text-[10px] flex items-center gap-1 transition-colors"
                                title="Edit hackathon arena details"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Edit</span>
                              </button>

                              {/* Excel Export */}
                              <button
                                onClick={() => handleExportHackathonExcel(h.id, h.title)}
                                disabled={exportingHackathonId === h.id}
                                className="px-2 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 font-semibold text-[10px] flex items-center gap-1 transition-colors disabled:opacity-50"
                                title="Export complete data (Students, Teams, Problems, Judges) to Excel"
                              >
                                <FileSpreadsheet className="w-3 h-3" />
                                <span>{exportingHackathonId === h.id ? "Exporting..." : "Excel"}</span>
                              </button>

                              {h.status !== "PUBLISHED" && (
                                <button
                                  onClick={() => handleUpdateHackathonStatus(h.id, "PUBLISHED")}
                                  className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold text-[10px] hover:bg-emerald-500/20 transition-colors"
                                >
                                  Publish
                                </button>
                              )}
                              {h.status === "PUBLISHED" && (
                                <button
                                  onClick={() => handleUpdateHackathonStatus(h.id, "DRAFT")}
                                  className="px-2 py-1 rounded bg-white/10 text-[#F8FAFC] font-semibold text-[10px] hover:bg-white/20 transition-colors"
                                >
                                  Pause
                                </button>
                              )}

                              {/* Delete Hackathon */}
                              <button
                                onClick={() => setDeletingHackathon(h)}
                                className="p-1.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
                                title="Permanently delete hackathon and all child records"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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

          {/* TAB 3: HOST APPROVALS */}
          {activeTab === "approvals" && (
            <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] rounded-2xl p-6 space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-[#F8FAFC] tracking-tight">
                    Host Organization Authorization &amp; KYC Gate
                  </h2>
                  <p className="text-[11px] text-[#94A3B8] font-mono mt-0.5">
                    Colleges and companies must receive super admin clearance before hosting published hackathons.
                  </p>
                </div>
                <button
                  onClick={fetchHosts}
                  className="px-2.5 py-1 text-[11px] font-mono rounded-lg bg-white/[0.04] border border-white/10 text-[#94A3B8] hover:text-[#F8FAFC] self-start"
                >
                  Refresh
                </button>
              </div>

              {/* Search & Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#64748B]" />
                  <input
                    type="text"
                    value={hostSearch}
                    onChange={(e) => setHostSearch(e.target.value)}
                    placeholder="Search host organization, contact name, or email..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#111524]/70 border border-white/[0.1] text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#6366F1] font-mono"
                  />
                </div>

                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#111524]/60 border border-white/[0.08] text-xs font-mono">
                  {["ALL", "PENDING", "APPROVED", "PAUSED", "REJECTED"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setHostFilter(s)}
                      className={`px-2.5 py-1 rounded-lg transition-colors text-[11px] ${
                        hostFilter === s
                          ? "bg-[#6366F1] text-white font-bold"
                          : "text-[#94A3B8] hover:text-[#F8FAFC]"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              {hostsLoading ? (
                <div className="p-12 text-center text-xs font-mono text-[#64748B]">
                  Loading host directory...
                </div>
              ) : filteredHosts.length === 0 ? (
                <div className="p-12 text-center text-xs font-mono text-[#64748B]">
                  No hosts match the current filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/[0.08] text-[#64748B] text-[10px] uppercase">
                        <th className="py-3 px-4">Organization &amp; Contact</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Tracks</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Moderation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {filteredHosts.map((host) => (
                        <tr key={host.id} className="hover:bg-white/[0.01]">
                          <td className="py-3 px-4">
                            <div className="font-bold text-[#F8FAFC]">{host.orgName}</div>
                            <div className="text-[11px] text-[#94A3B8]">
                              {host.user.name} · {host.user.email}
                            </div>
                            {host.website && (
                              <a
                                href={host.website}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-[#64748B] hover:text-[#F8FAFC] flex items-center gap-1 mt-0.5"
                              >
                                {host.website} <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </td>
                          <td className="py-3 px-4 text-[#94A3B8] uppercase text-[10px]">
                            {host.type}
                          </td>
                          <td className="py-3 px-4 text-[#94A3B8]">
                            {host._count?.hackathons ?? 0}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              host.approvalStatus === "APPROVED"
                                ? "bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/40"
                                : host.approvalStatus === "PAUSED"
                                ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                : host.approvalStatus === "REJECTED"
                                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                : "bg-white/5 text-amber-300 border border-amber-500/30"
                            }`}>
                              {host.approvalStatus}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {host.approvalStatus !== "APPROVED" && (
                                <button
                                  onClick={() => handleUpdateHostStatus(host.id, "APPROVED")}
                                  className="px-2 py-1 rounded bg-[#6366F1] text-white font-semibold text-[10px] hover:bg-[#4F46E5] transition-colors"
                                >
                                  Approve
                                </button>
                              )}

                              {host.approvalStatus === "APPROVED" && (
                                <button
                                  onClick={() => handleUpdateHostStatus(host.id, "PAUSED")}
                                  className="px-2 py-1 rounded bg-white/10 text-[#F8FAFC] font-semibold text-[10px] hover:bg-white/20 transition-colors"
                                >
                                  Pause
                                </button>
                              )}

                              {host.approvalStatus !== "REJECTED" && (
                                <button
                                  onClick={() => handleUpdateHostStatus(host.id, "REJECTED")}
                                  className="px-2 py-1 rounded bg-white/5 text-[#94A3B8] hover:text-red-400 text-[10px] transition-colors"
                                >
                                  Reject
                                </button>
                              )}

                              {/* Delete Host */}
                              <button
                                onClick={() => setDeletingHost(host)}
                                className="p-1.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
                                title="Permanently delete host organization"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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

          {/* TAB 4: JUDGES */}
          {activeTab === "judges" && (
            <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] rounded-2xl p-6 space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-[#F8FAFC] tracking-tight">
                    Judge Evaluator Clearance &amp; Roster
                  </h2>
                  <p className="text-[11px] text-[#94A3B8] font-mono mt-0.5">
                    Clear technical evaluators, inspect hackathon assignments, and track submission scoring stats.
                  </p>
                </div>
                <button
                  onClick={fetchJudges}
                  className="px-2.5 py-1 text-[11px] font-mono rounded-lg bg-white/[0.04] border border-white/10 text-[#94A3B8] hover:text-[#F8FAFC] self-start"
                >
                  Refresh
                </button>
              </div>

              {/* Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="text-[10px] text-[#64748B] uppercase">Total Evaluators</div>
                  <div className="text-lg font-extrabold text-[#F8FAFC]">{judgeCounts.total}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="text-[10px] text-[#64748B] uppercase">Cleared Active</div>
                  <div className="text-lg font-extrabold text-emerald-400">{judgeCounts.approved}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="text-[10px] text-[#64748B] uppercase">Pending Clearance</div>
                  <div className="text-lg font-extrabold text-amber-400">{judgeCounts.pending}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="text-[10px] text-[#64748B] uppercase">Rejected</div>
                  <div className="text-lg font-extrabold text-[#94A3B8]">{judgeCounts.rejected}</div>
                </div>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#111524]/60 border border-white/[0.08] text-xs font-mono self-start">
                {["ALL", "PENDING", "APPROVED", "REJECTED"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setJudgeStatusFilter(s)}
                    className={`px-2.5 py-1 rounded-lg transition-colors text-[11px] ${
                      judgeStatusFilter === s
                        ? "bg-[#6366F1] text-white font-bold"
                        : "text-[#94A3B8] hover:text-[#F8FAFC]"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Table */}
              {judgesLoading ? (
                <div className="p-12 text-center text-xs font-mono text-[#64748B]">
                  Loading judges directory...
                </div>
              ) : judges.length === 0 ? (
                <div className="p-12 text-center text-xs font-mono text-[#64748B]">
                  No judges match the selected approval status.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/[0.08] text-[#64748B] text-[10px] uppercase">
                        <th className="py-3 px-4">Judge &amp; Identity</th>
                        <th className="py-3 px-4">Designation &amp; Org</th>
                        <th className="py-3 px-4">Assignments &amp; Scores</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Clearance Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {judges.map((j) => (
                        <tr key={j.id} className="hover:bg-white/[0.01]">
                          <td className="py-3 px-4">
                            <div className="font-bold text-[#F8FAFC]">{j.user.name}</div>
                            <div className="text-[11px] text-[#94A3B8]">{j.user.email}</div>
                          </td>
                          <td className="py-3 px-4 text-[#94A3B8]">
                            <div className="text-[#F8FAFC] font-semibold">{j.designation || "Evaluator"}</div>
                            <div className="text-[11px] text-[#64748B]">
                              {j.company || "Independent"} · {j.experienceYears ? `${j.experienceYears} yrs exp` : "Expert"}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-[#94A3B8]">
                            <div className="text-[#F8FAFC] font-semibold">
                              {j.hackathon?.title || (j.assignments && j.assignments[0]?.hackathon?.title) || "National Circuit"}
                            </div>
                            <div className="text-[10px] text-[#64748B]">
                              {j.assignments?.length ? `${j.assignments.length} assigned arenas` : (j.hackathon ? "1 arena assigned" : "Unassigned")} · {j._count?.scores ?? 0} scores registered
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              j.approvalStatus === "APPROVED"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : j.approvalStatus === "PENDING"
                                ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                : "bg-red-500/10 text-red-400 border border-red-500/20"
                            }`}>
                              {j.approvalStatus}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {j.approvalStatus !== "APPROVED" && (
                                <button
                                  onClick={() => handleUpdateJudgeStatus(j.id, "APPROVED")}
                                  className="px-2 py-1 rounded bg-[#6366F1] text-white font-semibold text-[10px] hover:bg-[#4F46E5] transition-colors"
                                >
                                  Approve Judge
                                </button>
                              )}
                              {j.approvalStatus === "APPROVED" && (
                                <button
                                  onClick={() => handleUpdateJudgeStatus(j.id, "REJECTED")}
                                  className="px-2 py-1 rounded bg-white/5 text-[#94A3B8] hover:text-red-400 text-[10px] transition-colors"
                                >
                                  Pause Clearance
                                </button>
                              )}

                              {/* Delete Judge Assignment */}
                              <button
                                onClick={() => setDeletingJudge(j)}
                                className="p-1.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
                                title="Delete judge profile & assignments"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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

          {/* TAB 5: PAYMENTS */}
          {activeTab === "payments" && (
            <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] rounded-2xl p-6 space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-[#F8FAFC] tracking-tight">
                    Financial Queue &amp; Fee Settlements
                  </h2>
                  <p className="text-[11px] text-[#94A3B8] font-mono mt-0.5">
                    Verify student team UPI QR &amp; Razorpay payment transactions. Verification automatically generates permanent official team IDs.
                  </p>
                </div>
                <button
                  onClick={fetchPayments}
                  className="px-2.5 py-1 text-[11px] font-mono rounded-lg bg-white/[0.04] border border-white/10 text-[#94A3B8] hover:text-[#F8FAFC] self-start"
                >
                  Refresh
                </button>
              </div>

              {/* Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="text-[10px] text-[#64748B] uppercase">Total Revenue</div>
                  <div className="text-lg font-extrabold text-emerald-400">₹{paymentCounts.totalRevenue.toLocaleString("en-IN")}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="text-[10px] text-[#64748B] uppercase">Verified Payments</div>
                  <div className="text-lg font-extrabold text-[#F8FAFC]">{paymentCounts.verified}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="text-[10px] text-[#64748B] uppercase">Pending Review</div>
                  <div className="text-lg font-extrabold text-amber-400">{paymentCounts.pending}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="text-[10px] text-[#64748B] uppercase">Rejected</div>
                  <div className="text-lg font-extrabold text-[#94A3B8]">{paymentCounts.rejected}</div>
                </div>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#111524]/60 border border-white/[0.08] text-xs font-mono self-start">
                {["ALL", "PENDING", "VERIFIED", "REJECTED"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setPaymentStatusFilter(s)}
                    className={`px-2.5 py-1 rounded-lg transition-colors text-[11px] ${
                      paymentStatusFilter === s
                        ? "bg-[#6366F1] text-white font-bold"
                        : "text-[#94A3B8] hover:text-[#F8FAFC]"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Table */}
              {paymentsLoading ? (
                <div className="p-12 text-center text-xs font-mono text-[#64748B]">
                  Loading payment transactions...
                </div>
              ) : payments.length === 0 ? (
                <div className="p-12 text-center text-xs font-mono text-[#64748B]">
                  No transactions match the selected filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/[0.08] text-[#64748B] text-[10px] uppercase">
                        <th className="py-3 px-4">Transaction / Ref</th>
                        <th className="py-3 px-4">Squad &amp; Hackathon</th>
                        <th className="py-3 px-4">Amount &amp; Method</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Verification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-white/[0.01]">
                          <td className="py-3 px-4">
                            <div className="font-bold text-[#F8FAFC]">{p.transactionRef}</div>
                            <div className="text-[10px] text-[#64748B]">{new Date(p.createdAt).toLocaleString()}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-[#F8FAFC]">
                              {p.team?.name}
                              {p.team?.teamId && (
                                <span className="text-[10px] font-mono text-[#818CF8] ml-1.5">[{p.team.teamId}]</span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#94A3B8]">
                              Leader: {p.team?.leader?.name} ({p.team?.leader?.email})
                            </div>
                            <div className="text-[10px] text-[#64748B]">
                              Arena: {p.team?.hackathon?.title} ({p.team?.hackathon?.host?.orgName})
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm font-extrabold text-[#F8FAFC]">₹{p.amount}</div>
                            <div className="text-[10px] text-[#64748B] uppercase">{p.method}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              p.status === "VERIFIED"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : p.status === "PENDING"
                                ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                : "bg-red-500/10 text-red-400 border border-red-500/20"
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {p.status !== "VERIFIED" && (
                                <button
                                  onClick={() => handleUpdatePaymentStatus(p.id, "VERIFIED")}
                                  className="px-2 py-1 rounded bg-[#6366F1] text-white font-semibold text-[10px] hover:bg-[#4F46E5] transition-colors"
                                >
                                  Verify &amp; Activate Team
                                </button>
                              )}
                              {p.status !== "REJECTED" && (
                                <button
                                  onClick={() => handleUpdatePaymentStatus(p.id, "REJECTED")}
                                  className="px-2 py-1 rounded bg-white/5 text-[#94A3B8] hover:text-red-400 text-[10px] transition-colors"
                                >
                                  Reject
                                </button>
                              )}

                              {/* Delete Payment */}
                              <button
                                onClick={() => setDeletingPayment(p)}
                                className="p-1.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
                                title="Permanently delete payment transaction"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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

          {/* TAB 6: SITE CMS / CONTENT (PAGES + NAVBAR & FOOTER) */}
          {activeTab === "content" && (
            <SiteContentCMS
              initialSection={
                rawTab === "navigation" || rawTab === "nav" || rawTab === "footer" || searchParams.get("section") === "navigation"
                  ? "navigation"
                  : "pages"
              }
            />
          )}

          {/* TAB 7: PLATFORM SETTINGS */}
          {activeTab === "settings" && (
            <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] rounded-2xl p-6 space-y-6 shadow-sm">
              <div>
                <h2 className="text-sm font-bold text-[#F8FAFC] tracking-tight">
                  Global Integrations &amp; Security Policies
                </h2>
                <p className="text-[11px] text-[#94A3B8] font-mono mt-0.5">
                  Platform architecture, zero-exposure secret verification, and operational controls.
                </p>
              </div>

              {/* Rule 9 Zero-Exposure Secret Audit */}
              <div className="space-y-3 font-mono text-xs">
                <div className="text-[10px] uppercase text-[#64748B] font-bold">
                  PRD Rule 9: Zero Secret Exposure Status
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Key className="w-3.5 h-3.5 text-[#64748B]" />
                      <span className="text-[#F8FAFC]">JWT Secret</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      integrations?.jwtSecretConfigured
                        ? "bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/30"
                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}>
                      {integrations?.jwtSecretConfigured ? "VERIFIED" : "MISSING"}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Server className="w-3.5 h-3.5 text-[#64748B]" />
                      <span className="text-[#F8FAFC]">Database Engine</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 text-[#94A3B8] border border-white/10">
                      {integrations?.databaseType || "SQLite"}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-[#64748B]" />
                      <span className="text-[#F8FAFC]">Razorpay Webhooks</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      integrations?.razorpayWebhookConfigured
                        ? "bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/30"
                        : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                    }`}>
                      {integrations?.razorpayWebhookConfigured ? "CONFIGURED" : "DEMO / QR"}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#64748B]" />
                      <span className="text-[#F8FAFC]">GitHub Org Provisioning</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      integrations?.githubTokenConfigured
                        ? "bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/30"
                        : "bg-white/5 text-[#64748B] border border-white/10"
                    }`}>
                      {integrations?.githubTokenConfigured ? "CONNECTED" : "DEV STUB"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic Operational Controls */}
              <div className="space-y-4 pt-4 border-t border-white/[0.08] font-mono text-xs">
                <div className="text-[10px] uppercase text-[#64748B] font-bold">
                  Runtime Operational Flags
                </div>

                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-[#F8FAFC] font-bold">Maintenance Mode</div>
                      <div className="text-[11px] text-[#94A3B8]">
                        Block non-admin write operations and show maintenance banner.
                      </div>
                    </div>
                    <button
                      onClick={() => handleSaveSettings({ maintenanceMode: !systemConfig.maintenanceMode })}
                      disabled={settingsSaving}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                        systemConfig.maintenanceMode
                          ? "bg-amber-500 text-black"
                          : "bg-white/5 text-[#94A3B8] hover:text-[#F8FAFC]"
                      }`}
                    >
                      {systemConfig.maintenanceMode ? "ACTIVE" : "OFF"}
                    </button>
                  </div>

                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-[#F8FAFC] font-bold">Student Registrations</div>
                      <div className="text-[11px] text-[#94A3B8]">
                        Allow new students to sign up and receive permanent Hackathon IDs.
                      </div>
                    </div>
                    <button
                      onClick={() => handleSaveSettings({ newRegistrationsOpen: !systemConfig.newRegistrationsOpen })}
                      disabled={settingsSaving}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                        systemConfig.newRegistrationsOpen
                          ? "bg-[#6366F1] text-white"
                          : "bg-white/5 text-[#94A3B8] hover:text-[#F8FAFC]"
                      }`}
                    >
                      {systemConfig.newRegistrationsOpen ? "OPEN" : "PAUSED"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Invariant Reminders */}
              <div className="space-y-3 text-xs font-mono text-[#94A3B8] pt-4 border-t border-white/[0.08]">
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="text-[#F8FAFC] font-bold">PRD Rule 1: Single Active Hackathon per Student</div>
                  <p className="text-[11px]">
                    Enforced at database and API transaction level. A student cannot register for another hackathon until their current event finishes.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="text-[#F8FAFC] font-bold">PRD Rule 4: Balanced Problem Statement Caps</div>
                  <p className="text-[11px]">
                    Automatic selection capping equal to <code>Ceil(totalTeams / totalStatements)</code> prevents clustering on easy problem statements during live reveal.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: AUDIT TRAIL */}
          {activeTab === "audit" && (
            <div className="bg-[#0B0E18]/70 backdrop-blur-md border border-white/[0.08] rounded-2xl p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#F8FAFC] tracking-tight">
                    Platform Immutable Audit Stream
                  </h2>
                  <p className="text-[11px] text-[#94A3B8] font-mono mt-0.5">
                    PRD Rule 10: All governance, auth changes, and publishing actions logged with timestamp and actor.
                  </p>
                </div>
                <button
                  onClick={fetchAuditLogs}
                  className="px-2.5 py-1 text-[11px] font-mono rounded-lg bg-white/[0.04] border border-white/10 text-[#94A3B8] hover:text-[#F8FAFC]"
                >
                  Refresh
                </button>
              </div>

              {auditLoading ? (
                <div className="p-8 text-center text-xs font-mono text-[#64748B]">
                  Loading audit events...
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-[#64748B]">
                  No audit logs recorded yet.
                </div>
              ) : (
                <div className="space-y-2 text-xs font-mono">
                  {auditLogs.map((log) => {
                    let meta: any = null;
                    try {
                      if (log.metadata) meta = JSON.parse(log.metadata);
                    } catch {
                      // ignore
                    }

                    return (
                      <div
                        key={log.id}
                        className="p-3 rounded-lg bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#F8FAFC]">{log.action}</span>
                            <span className="text-[10px] text-[#64748B]">· {log.entity} #{log.entityId.slice(0, 8)}</span>
                          </div>
                          <div className="text-[11px] text-[#94A3B8]">
                            Actor: {log.actor?.name || log.actor?.email || log.actorId} ({log.actor?.role || "SYSTEM"})
                            {meta?.orgName && ` · Org: ${meta.orgName}`}
                            {meta?.newStatus && ` · Status: ${meta.newStatus}`}
                            {meta?.title && ` · Title: ${meta.title}`}
                            {meta?.role && ` · Role: ${meta.role}`}
                            {meta?.approvalStatus && ` · Clearance: ${meta.approvalStatus}`}
                          </div>
                        </div>
                        <span className="text-[#64748B] text-[10px] shrink-0 font-mono">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: EDIT USER */}
      {/* ========================================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in font-mono text-xs">
          <div className="bg-[#0B0E18] border border-white/10 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-[#818CF8]" />
                  Edit User Account &amp; Profiles
                </h3>
                <p className="text-[11px] text-[#94A3B8]">
                  Editing user: <span className="text-white font-bold">{editingUser.email}</span>
                </p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 rounded text-[#94A3B8] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Core User Fields */}
            <div className="space-y-3">
              <div className="text-[10px] font-bold uppercase text-[#818CF8]">Core Identity</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-[#64748B] uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    value={userEditForm.name || ""}
                    onChange={(e) => setUserEditForm({ ...userEditForm, name: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#64748B] uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    value={userEditForm.email || ""}
                    onChange={(e) => setUserEditForm({ ...userEditForm, email: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#64748B] uppercase mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={userEditForm.phone || ""}
                    onChange={(e) => setUserEditForm({ ...userEditForm, phone: e.target.value })}
                    placeholder="+91..."
                    className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#64748B] uppercase mb-1">Platform Role</label>
                  <select
                    value={userEditForm.role || "STUDENT"}
                    onChange={(e) => setUserEditForm({ ...userEditForm, role: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                  >
                    <option value="STUDENT">STUDENT</option>
                    <option value="HOST">HOST</option>
                    <option value="JUDGE">JUDGE</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-[#64748B] uppercase mb-1">Account Status</label>
                  <select
                    value={userEditForm.status || "ACTIVE"}
                    onChange={(e) => setUserEditForm({ ...userEditForm, status: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PAUSED">PAUSED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Student Specific Fields */}
            {(userEditForm.role === "STUDENT" || editingUser.studentProfile) && (
              <div className="space-y-3 pt-3 border-t border-white/[0.08]">
                <div className="text-[10px] font-bold uppercase text-[#818CF8]">Student Profile</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-[#64748B] uppercase mb-1">College / University</label>
                    <input
                      type="text"
                      value={userEditForm.college || ""}
                      onChange={(e) => setUserEditForm({ ...userEditForm, college: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#64748B] uppercase mb-1">GitHub Username</label>
                    <input
                      type="text"
                      value={userEditForm.githubUsername || ""}
                      onChange={(e) => setUserEditForm({ ...userEditForm, githubUsername: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-[#64748B] uppercase mb-1">Skills</label>
                    <input
                      type="text"
                      value={userEditForm.skills || ""}
                      onChange={(e) => setUserEditForm({ ...userEditForm, skills: e.target.value })}
                      placeholder="React, Next.js, Python, Rust"
                      className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-[#64748B] uppercase mb-1">Bio</label>
                    <textarea
                      rows={2}
                      value={userEditForm.bio || ""}
                      onChange={(e) => setUserEditForm({ ...userEditForm, bio: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Host Specific Fields */}
            {(userEditForm.role === "HOST" || editingUser.hostProfile) && (
              <div className="space-y-3 pt-3 border-t border-white/[0.08]">
                <div className="text-[10px] font-bold uppercase text-[#818CF8]">Host Profile &amp; KYC</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-[#64748B] uppercase mb-1">Organization Name</label>
                    <input
                      type="text"
                      value={userEditForm.orgName || ""}
                      onChange={(e) => setUserEditForm({ ...userEditForm, orgName: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#64748B] uppercase mb-1">Organization Type</label>
                    <select
                      value={userEditForm.type || "college"}
                      onChange={(e) => setUserEditForm({ ...userEditForm, type: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                    >
                      <option value="college">College / University</option>
                      <option value="company">Company / Sponsor</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#64748B] uppercase mb-1">Host UPI ID</label>
                    <input
                      type="text"
                      value={userEditForm.upiId || ""}
                      onChange={(e) => setUserEditForm({ ...userEditForm, upiId: e.target.value })}
                      placeholder="org@okaxis"
                      className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#64748B] uppercase mb-1">Host Approval Status</label>
                    <select
                      value={userEditForm.hostApprovalStatus || "APPROVED"}
                      onChange={(e) => setUserEditForm({ ...userEditForm, hostApprovalStatus: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="APPROVED">APPROVED</option>
                      <option value="PAUSED">PAUSED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-[#64748B] uppercase mb-1">Website URL</label>
                    <input
                      type="text"
                      value={userEditForm.website || ""}
                      onChange={(e) => setUserEditForm({ ...userEditForm, website: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Judge Specific Fields */}
            {(userEditForm.role === "JUDGE" || editingUser.judgeProfile || (editingUser.judgeProfiles && editingUser.judgeProfiles.length > 0)) && (
              <div className="space-y-3 pt-3 border-t border-white/[0.08]">
                <div className="text-[10px] font-bold uppercase text-[#818CF8]">Judge Evaluator Profile</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-[#64748B] uppercase mb-1">Designation</label>
                    <input
                      type="text"
                      value={userEditForm.designation || ""}
                      onChange={(e) => setUserEditForm({ ...userEditForm, designation: e.target.value })}
                      placeholder="Principal Engineer"
                      className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#64748B] uppercase mb-1">Company / Organization</label>
                    <input
                      type="text"
                      value={userEditForm.company || ""}
                      onChange={(e) => setUserEditForm({ ...userEditForm, company: e.target.value })}
                      placeholder="Company"
                      className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#64748B] uppercase mb-1">Judge Approval Status</label>
                    <select
                      value={userEditForm.judgeApprovalStatus || "APPROVED"}
                      onChange={(e) => setUserEditForm({ ...userEditForm, judgeApprovalStatus: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="APPROVED">APPROVED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/[0.08]">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-[#94A3B8] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUserModal}
                disabled={userEditSaving}
                className="px-5 py-2 rounded-xl bg-[#6366F1] text-white font-bold hover:bg-[#4F46E5] disabled:opacity-50 transition-colors shadow-sm"
              >
                {userEditSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DELETE USER CONFIRMATION */}
      {/* ========================================================================= */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in font-mono text-xs">
          <div className="bg-[#0B0E18] border border-red-500/30 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-sm font-bold text-white">Permanently Delete User?</h3>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              You are about to delete user <span className="text-white font-bold">{deletingUser.name}</span> ({deletingUser.email}).
              This will cascade delete all linked student/host/judge profiles, squad registrations, and scores. This operation is <span className="text-red-400 font-bold">irreversible</span>.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
              <button
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-[#94A3B8] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteUser}
                disabled={userDeleteLoading}
                className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 disabled:opacity-50 transition-colors"
              >
                {userDeleteLoading ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT HACKATHON */}
      {/* ========================================================================= */}
      {editingHackathon && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in font-mono text-xs">
          <div className="bg-[#0B0E18] border border-white/10 rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-[#818CF8]" />
                  Edit Hackathon Arena &amp; Lifecycle
                </h3>
                <p className="text-[11px] text-[#94A3B8]">
                  Editing arena: <span className="text-white font-bold">{editingHackathon.title}</span>
                </p>
              </div>
              <button
                onClick={() => setEditingHackathon(null)}
                className="p-1 rounded text-[#94A3B8] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[10px] text-[#64748B] uppercase mb-1">Title</label>
                <input
                  type="text"
                  value={hackathonEditForm.title || ""}
                  onChange={(e) => setHackathonEditForm({ ...hackathonEditForm, title: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#64748B] uppercase mb-1">Slug (URL path)</label>
                <input
                  type="text"
                  value={hackathonEditForm.slug || ""}
                  onChange={(e) => setHackathonEditForm({ ...hackathonEditForm, slug: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#64748B] uppercase mb-1">Lifecycle Status</label>
                <select
                  value={hackathonEditForm.status || "DRAFT"}
                  onChange={(e) => setHackathonEditForm({ ...hackathonEditForm, status: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="PUBLISHED">PUBLISHED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] text-[#64748B] uppercase mb-1">Description</label>
                <textarea
                  rows={3}
                  value={hackathonEditForm.description || ""}
                  onChange={(e) => setHackathonEditForm({ ...hackathonEditForm, description: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] text-[#64748B] uppercase mb-1">Rules &amp; Evaluation Constraints</label>
                <textarea
                  rows={3}
                  value={hackathonEditForm.rules || ""}
                  onChange={(e) => setHackathonEditForm({ ...hackathonEditForm, rules: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#64748B] uppercase mb-1">Entry Fee (₹ INR)</label>
                <input
                  type="number"
                  value={hackathonEditForm.fee ?? 0}
                  onChange={(e) => setHackathonEditForm({ ...hackathonEditForm, fee: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#64748B] uppercase mb-1">Payment Mode</label>
                <select
                  value={hackathonEditForm.paymentMode || "FREE"}
                  onChange={(e) => setHackathonEditForm({ ...hackathonEditForm, paymentMode: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                >
                  <option value="FREE">FREE</option>
                  <option value="QR">UPI QR Code</option>
                  <option value="RAZORPAY">Razorpay Gateway</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-[#64748B] uppercase mb-1">Host UPI ID</label>
                <input
                  type="text"
                  value={hackathonEditForm.upiId || ""}
                  onChange={(e) => setHackathonEditForm({ ...hackathonEditForm, upiId: e.target.value })}
                  placeholder="org@okaxis"
                  className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#64748B] uppercase mb-1">Prize Pool / Rewards</label>
                <input
                  type="text"
                  value={hackathonEditForm.prizePool || ""}
                  onChange={(e) => setHackathonEditForm({ ...hackathonEditForm, prizePool: e.target.value })}
                  placeholder="₹1,00,000 + Cloud Grants"
                  className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#64748B] uppercase mb-1">Min Squad Members</label>
                <input
                  type="number"
                  value={hackathonEditForm.teamMin ?? 1}
                  onChange={(e) => setHackathonEditForm({ ...hackathonEditForm, teamMin: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#64748B] uppercase mb-1">Max Squad Members</label>
                <input
                  type="number"
                  value={hackathonEditForm.teamMax ?? 4}
                  onChange={(e) => setHackathonEditForm({ ...hackathonEditForm, teamMax: parseInt(e.target.value) || 4 })}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#64748B] uppercase mb-1">Registration Cutoff Deadline</label>
                <input
                  type="datetime-local"
                  value={hackathonEditForm.registrationDeadline || ""}
                  onChange={(e) => setHackathonEditForm({ ...hackathonEditForm, registrationDeadline: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#64748B] uppercase mb-1">Event Start Time</label>
                <input
                  type="datetime-local"
                  value={hackathonEditForm.startAt || ""}
                  onChange={(e) => setHackathonEditForm({ ...hackathonEditForm, startAt: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#818CF8] uppercase font-bold mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#6366F1]" /> Problem Reveal Time
                </label>
                <input
                  type="datetime-local"
                  value={hackathonEditForm.revealAt || ""}
                  onChange={(e) => setHackathonEditForm({ ...hackathonEditForm, revealAt: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-[#6366F1]/50 text-white focus:outline-none focus:border-[#818CF8]"
                />
                <span className="text-[9px] text-[#818CF8]">Unlocks statements across all tracks</span>
              </div>

              <div>
                <label className="block text-[10px] text-[#64748B] uppercase mb-1">Event End Time</label>
                <input
                  type="datetime-local"
                  value={hackathonEditForm.endAt || ""}
                  onChange={(e) => setHackathonEditForm({ ...hackathonEditForm, endAt: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] text-[#64748B] uppercase mb-1">Banner Image URL</label>
                <input
                  type="text"
                  value={hackathonEditForm.bannerUrl || ""}
                  onChange={(e) => setHackathonEditForm({ ...hackathonEditForm, bannerUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-1.5 rounded-lg bg-[#111524] border border-white/10 text-white focus:outline-none focus:border-[#6366F1]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/[0.08]">
              <button
                onClick={() => setEditingHackathon(null)}
                className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-[#94A3B8] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveHackathonModal}
                disabled={hackathonEditSaving}
                className="px-5 py-2 rounded-xl bg-[#6366F1] text-white font-bold hover:bg-[#4F46E5] disabled:opacity-50 transition-colors shadow-sm"
              >
                {hackathonEditSaving ? "Saving..." : "Save Hackathon"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: DELETE HACKATHON CONFIRMATION */}
      {/* ========================================================================= */}
      {deletingHackathon && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in font-mono text-xs">
          <div className="bg-[#0B0E18] border border-red-500/30 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-sm font-bold text-white">Permanently Delete Hackathon?</h3>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              You are about to delete hackathon <span className="text-white font-bold">{deletingHackathon.title}</span>.
              This will permanently delete all competing domains, problem statements, student squads, payments, code repositories, and evaluation scores.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
              <button
                onClick={() => setDeletingHackathon(null)}
                className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-[#94A3B8] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteHackathon}
                disabled={hackathonDeleteLoading}
                className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 disabled:opacity-50 transition-colors"
              >
                {hackathonDeleteLoading ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: DELETE HOST CONFIRMATION */}
      {/* ========================================================================= */}
      {deletingHost && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in font-mono text-xs">
          <div className="bg-[#0B0E18] border border-red-500/30 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-sm font-bold text-white">Delete Host Organization?</h3>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Delete host <span className="text-white font-bold">{deletingHost.orgName}</span> ({deletingHost.user?.email}) and their hosted hackathons?
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
              <button
                onClick={() => setDeletingHost(null)}
                className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-[#94A3B8] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteHost}
                className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 transition-colors"
              >
                Delete Host
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: DELETE JUDGE CONFIRMATION */}
      {/* ========================================================================= */}
      {deletingJudge && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in font-mono text-xs">
          <div className="bg-[#0B0E18] border border-red-500/30 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-sm font-bold text-white">Delete Judge Assignment?</h3>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Remove judge profile for <span className="text-white font-bold">{deletingJudge.user?.name || deletingJudge.user?.email}</span>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
              <button
                onClick={() => setDeletingJudge(null)}
                className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-[#94A3B8] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteJudge}
                className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 transition-colors"
              >
                Delete Judge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: DELETE PAYMENT CONFIRMATION */}
      {/* ========================================================================= */}
      {deletingPayment && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in font-mono text-xs">
          <div className="bg-[#0B0E18] border border-red-500/30 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-sm font-bold text-white">Delete Payment Record?</h3>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Permanently delete transaction <span className="text-white font-bold">{deletingPayment.transactionRef || deletingPayment.id}</span> of ₹{deletingPayment.amount}?
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
              <button
                onClick={() => setDeletingPayment(null)}
                className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-[#94A3B8] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeletePayment}
                className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 transition-colors"
              >
                Delete Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 rounded-full border-2 border-[#6366F1] border-t-transparent animate-spin" />
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}
