"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Clock,
  CheckCircle2,
  Lock,
  Terminal,
  Code2,
  FileCode,
  Layers,
  ArrowLeft,
  AlertCircle,
  Check,
  RefreshCw,
  ExternalLink,
  Send,
  AlertTriangle,
  GitBranch,
  TrendingUp,
  FileCheck,
  Target,
  ChevronRight,
  Sparkles,
  Upload,
  Download,
  FileText,
  CheckCheck,
  History,
  Paperclip,
  ChevronDown,
  ChevronUp,
  Folder,
  Copy,
  FileArchive,
  Globe,
  GitFork,
  ArrowRight,
  Trophy,
} from "lucide-react";
import HackathonLeaderboardCard from "@/components/hackathons/HackathonLeaderboardCard";
import { isV5Enabled } from "@/lib/version-gate";

function formatSpeed(bytesPerSec: number): string {
  if (!bytesPerSec || bytesPerSec <= 0) return "0 KB/s";
  if (bytesPerSec >= 1024 * 1024) {
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  }
  return `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
}

function formatEta(seconds: number): string {
  if (!seconds || seconds <= 0 || !isFinite(seconds)) return "calculating...";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const remSec = seconds % 60;
  return `${mins}m ${remSec}s`;
}

function formatFileSizeMB(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 MB";
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ProblemStatementItem {
  id: string;
  title: string;
  description: string | null;
  difficulty?: "EASY" | "MEDIUM" | "HARD" | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  code?: string | null;
  overview?: string | null;
  mission?: string | null;
  resources?: string | null;
  metrics?: string | null;
  goals?: string | null;
  safetyRules?: string | null;
  evalBoundary?: string | null;
  cap: number;
  assignedCount: number;
  slotsRemaining: number;
  isFull: boolean;
  isRevealed: boolean;
}

interface DomainItem {
  id: string;
  name: string;
  description: string | null;
  revealAt: string;
  isRevealed: boolean;
  secondsUntilReveal: number;
  problemStatements: ProblemStatementItem[];
}

export default function StudentArenaPage() {
  const params = useParams();
  const teamIdParam = params?.teamId as string;

  const [session, setSession] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [domains, setDomains] = useState<DomainItem[]>([]);
  const [allDomains, setAllDomains] = useState<DomainItem[]>([]);
  const [selectedStatement, setSelectedStatement] = useState<any>(null);

  // Domain pre-selection (before hackathon start)
  const [selectingDomainId, setSelectingDomainId] = useState<string | null>(null);
  const [domainSelectionError, setDomainSelectionError] = useState<string | null>(null);
  const [domainSelectionSuccess, setDomainSelectionSuccess] = useState<string | null>(null);

  // Statement selection states
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [activeReviewPs, setActiveReviewPs] = useState<ProblemStatementItem | null>(null);
  const [statementConfirmModal, setStatementConfirmModal] = useState<ProblemStatementItem | null>(null);
  const [expandedPs, setExpandedPs] = useState<Record<string, boolean>>({});

  // Progress states (Combined bar + individual member breakdown)
  const [currentPercent, setCurrentPercent] = useState<number>(0);
  const [combinedPercent, setCombinedPercent] = useState<number>(0);
  const [membersProgress, setMembersProgress] = useState<any[]>([]);
  const [lastUpdatedBy, setLastUpdatedBy] = useState<string | null>(null);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string | null>(null);
  const [progressHistory, setProgressHistory] = useState<any[]>([]);
  const [nextPercent, setNextPercent] = useState<number>(10);
  const [progressNote, setProgressNote] = useState("");
  const [loggingProgress, setLoggingProgress] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string | null>(null);
  const [progressErr, setProgressErr] = useState<string | null>(null);

  // Documentation Stages (Parts 1 to 4)
  const [documentStages, setDocumentStages] = useState<any[]>([]);
  const [uploadingStage, setUploadingStage] = useState<number | null>(null);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [expandedHistory, setExpandedHistory] = useState<Record<number, boolean>>({});

  // Part 2 Repository, Fork & Live Link states
  const [part2LiveUrl, setPart2LiveUrl] = useState("");
  const [part2GithubRepoUrl, setPart2GithubRepoUrl] = useState("");
  const [part2ForkedRepoUrl, setPart2ForkedRepoUrl] = useState("");
  const [savingPart2Links, setSavingPart2Links] = useState(false);
  const [savePart2LinksMsg, setSavePart2LinksMsg] = useState<string | null>(null);
  const [savePart2LinksErr, setSavePart2LinksErr] = useState<string | null>(null);
  const [copiedForkUrl, setCopiedForkUrl] = useState(false);

  // Upload progress state (Progress %, Size, Speed, ETA)
  const [uploadProgress, setUploadProgress] = useState<{
    stage: number;
    percent: number;
    loaded: number;
    total: number;
    speedBps: number;
    etaSec: number;
  } | null>(null);

  // Repo states
  const [repo, setRepo] = useState<any>(null);
  const [committing, setCommitting] = useState(false);
  const [commitMsg, setCommitMsg] = useState("Implement core algorithm logic");
  const [repoMsg, setRepoMsg] = useState<string | null>(null);

  // Local storage & files states
  const [teamFiles, setTeamFiles] = useState<any[]>([]);
  const [folderInfo, setFolderInfo] = useState<{ folderPath?: string; absolutePath?: string; summary?: any } | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);
  const [fileFilter, setFileFilter] = useState<"all" | "code" | "docs">("all");

  // Submission states
  const [submission, setSubmission] = useState<any>(null);
  const [subLink, setSubLink] = useState("");
  const [subFileUrl, setSubFileUrl] = useState("");
  const [subDescription, setSubDescription] = useState("");
  const [submittingFinal, setSubmittingFinal] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [subError, setSubError] = useState<string | null>(null);
  const [subSuccess, setSubSuccess] = useState<string | null>(null);

  // Release v5.0 gate
  const [v5Active, setV5Active] = useState(false);
  useEffect(() => {
    setV5Active(isV5Enabled());
  }, []);

  // Active view tab
  type TabType = "domain" | "statement" | "progress" | "documents" | "timeline" | "repo" | "submission" | "leaderboard";
  const [activeTab, setActiveTab] = useState<TabType>("domain");

  // Fetch team, progress, documents, repo, submission
  const loadTeamData = useCallback(async () => {
    if (!teamIdParam) return;
    try {
      const res = await fetch(`/api/v1/teams/${teamIdParam}`);
      if (res.ok) {
        const d = await res.json();
        setTeam(d.team);
        if (d.team?.problemStatement) {
          setSelectedStatement(d.team.problemStatement);
        }

        // Fetch all domains for domain selection step
        const allDomRes = await fetch(`/api/v1/hackathons/${d.team.hackathonId}/domains`);
        if (allDomRes.ok) {
          const allDomData = await allDomRes.json();
          setAllDomains(allDomData.domains || []);
        }

        // Fetch domains/problem statements filtered by team's pre-selected domain
        const psRes = await fetch(
          `/api/v1/hackathons/${d.team.hackathonId}/problem-statements?teamId=${d.team.id}`
        );
        if (psRes.ok) {
          const psData = await psRes.json();
          setDomains(psData.domains || []);
        }

        let loadedCombined = 0;
        let hasLoadedUploads = false;

        // Fetch progress and member breakdown
        const progRes = await fetch(`/api/v1/teams/${d.team.id}/progress`);
        if (progRes.ok) {
          const progData = await progRes.json();
          loadedCombined = progData.combinedPercent ?? 0;
          setCombinedPercent(loadedCombined);
          setCurrentPercent(loadedCombined);
          setMembersProgress(progData.membersProgress || []);
          setLastUpdatedBy(progData.lastUpdatedBy || null);
          setLastUpdatedTime(progData.lastUpdated || null);
          setProgressHistory(progData.history || []);
        }

        // Fetch 4-part documentation stages
        const docRes = await fetch(`/api/v1/teams/${d.team.id}/documents`);
        if (docRes.ok) {
          const docData = await docRes.json();
          setDocumentStages(docData.stages || []);
          hasLoadedUploads = docData.stages?.some((s: any) => (s.uploads && s.uploads.length > 0) || s.latestUpload);
          if (docData.liveUrl) setPart2LiveUrl(docData.liveUrl);
          if (docData.githubRepoUrl) setPart2GithubRepoUrl(docData.githubRepoUrl);
          if (docData.forkedRepoUrl) setPart2ForkedRepoUrl(docData.forkedRepoUrl);
        }

        if (d.team?.codeRepo) {
          if (d.team.codeRepo.liveUrl) setPart2LiveUrl((prev) => prev || d.team.codeRepo.liveUrl);
          if (d.team.codeRepo.githubRepoUrl) setPart2GithubRepoUrl((prev) => prev || d.team.codeRepo.githubRepoUrl);
          if (d.team.codeRepo.forkedRepoUrl) setPart2ForkedRepoUrl((prev) => prev || d.team.codeRepo.forkedRepoUrl);
        }

        // Fetch repo and folder status
        const repoRes = await fetch(`/api/v1/teams/${d.team.id}/repo`);
        if (repoRes.ok) {
          const repoData = await repoRes.json();
          setRepo(repoData.repo);
        }

        // Fetch local folder files & code
        try {
          const filesRes = await fetch(`/api/v1/teams/${d.team.id}/files`);
          if (filesRes.ok) {
            const filesData = await filesRes.json();
            setTeamFiles(filesData.files || []);
            setFolderInfo({
              folderPath: filesData.folderPath,
              absolutePath: filesData.absolutePath,
              summary: filesData.summary,
            });
          }
        } catch {}

        // Fetch submission
        const subRes = await fetch(`/api/v1/teams/${d.team.id}/submission`);
        if (subRes.ok) {
          const subData = await subRes.json();
          if (subData.submission) {
            setSubmission(subData.submission);
            setSubLink(subData.submission.link || "");
            setSubFileUrl(subData.submission.fileUrl || "");
            setSubDescription(subData.submission.description || "");
          }
        }

        // Auto-navigate to appropriate tab if not already on one
        const hasAnyActivity =
          !!d.team?.problemStatement ||
          !!d.team?.problemStatementId ||
          loadedCombined > 0 ||
          hasLoadedUploads;

        if (hasAnyActivity) {
          // Keep current tab or default to progress
          setActiveTab((prev) => (["progress", "documents", "timeline", "repo", "submission"].includes(prev) ? prev : "progress"));
        } else if (d.team.domainId) {
          setActiveTab((prev) => (prev === "domain" ? "statement" : prev));
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [teamIdParam]);

  const fetchTeamFiles = useCallback(async () => {
    if (!teamIdParam) return;
    setLoadingFiles(true);
    try {
      const res = await fetch(`/api/v1/teams/${teamIdParam}/files`);
      if (res.ok) {
        const data = await res.json();
        setTeamFiles(data.files || []);
        setFolderInfo({
          folderPath: data.folderPath,
          absolutePath: data.absolutePath,
          summary: data.summary,
        });
      }
    } catch {} finally {
      setLoadingFiles(false);
    }
  }, [teamIdParam]);

  useEffect(() => {
    fetch("/api/v1/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (d?.user) setSession(d.user);
      })
      .catch(() => {});

    loadTeamData();
  }, [loadTeamData]);

  // Periodic poll for statement countdown, live unlocks, and slot capacity updates
  useEffect(() => {
    if (!team?.domainId) return;
    const timer = setInterval(() => {
      if (team?.hackathonId) {
        fetch(`/api/v1/hackathons/${team.hackathonId}/problem-statements?teamId=${team.id}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (d?.domains) {
              setDomains(d.domains);
              if (activeReviewPs) {
                for (const dom of d.domains) {
                  const updatedPs = dom.problemStatements?.find((p: any) => p.id === activeReviewPs.id);
                  if (updatedPs) {
                    setActiveReviewPs(updatedPs);
                  }
                }
              }
            }
          })
          .catch(() => {});
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [team, activeReviewPs]);

  // Handle domain pre-selection
  const handleSelectDomain = async (domainId: string) => {
    setSelectingDomainId(domainId);
    setDomainSelectionError(null);
    setDomainSelectionSuccess(null);

    try {
      const res = await fetch(`/api/v1/teams/${team.id}/select-domain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setDomainSelectionError(data.error || "Failed to select domain");
        return;
      }

      setDomainSelectionSuccess(`Domain "${data.domain.name}" selected! You will see only this domain's problem statements at reveal time.`);
      await loadTeamData();
      setTimeout(() => {
        setActiveTab("statement");
        setDomainSelectionSuccess(null);
      }, 1500);
    } catch {
      setDomainSelectionError("Network error selecting domain");
    } finally {
      setSelectingDomainId(null);
    }
  };

  // Open full detail view for reviewing a statement
  const handleReviewStatement = (ps: ProblemStatementItem) => {
    setSelectionError(null);
    setActiveReviewPs(ps);
  };

  // Submit and lock problem statement selection (Only Team Leader is allowed)
  const handleExecuteStatementSubmit = async (ps: ProblemStatementItem) => {
    if (!isLead) {
      setSelectionError("Only the Team Leader is authorized to submit the problem statement selection.");
      return;
    }
    if (ps.isFull) {
      setSelectionError("Maximum capacity reached for this problem statement. Please go back and select another available track.");
      return;
    }
    setSelectingId(ps.id);
    setSelectionError(null);

    try {
      const res = await fetch(`/api/v1/teams/${team.id}/select-statement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemStatementId: ps.id, allowSwitch: true }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSelectionError(data.error || "Failed to select problem statement");
        await loadTeamData();
        return;
      }

      setSelectedStatement(data.statement);
      setActiveReviewPs(null);
      await loadTeamData();
      setActiveTab("progress");
    } catch {
      setSelectionError("Network error selecting statement");
    } finally {
      setSelectingId(null);
    }
  };

  // Handle logging individual progress update
  const handleLogProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progressNote.trim()) return;

    setLoggingProgress(true);
    setProgressMsg(null);
    setProgressErr(null);

    try {
      const res = await fetch(`/api/v1/teams/${team.id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          percent: nextPercent,
          note: progressNote.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setProgressErr(data.error || "Failed to log progress");
        return;
      }

      setProgressMsg(`Personal progress logged at ${nextPercent}%! Team combined bar updated.`);
      setProgressNote("");
      await loadTeamData();
      setTimeout(() => setProgressMsg(null), 4000);
    } catch {
      setProgressErr("Network error logging progress");
    } finally {
      setLoggingProgress(false);
    }
  };

  // Handle document upload for Part 1 - 4 with real-time speed, ETA, and progress bar
  const handleUploadDocument = async (stageNum: number, file: File) => {
    setUploadingStage(stageNum);
    setUploadErr(null);
    setUploadMsg(null);
    setUploadProgress({
      stage: stageNum,
      percent: 0,
      loaded: 0,
      total: file.size,
      speedBps: 0,
      etaSec: 0,
    });

    try {
      const allowedExts = [".pdf", ".docx", ".doc", ".pptx", ".ppt", ".zip"];
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!allowedExts.includes(ext)) {
        setUploadErr(`Invalid file type "${ext}". Only PDF, DOCX, PPTX, and ZIP documents are permitted.`);
        setUploadingStage(null);
        setUploadProgress(null);
        return;
      }

      // 3GB allowed for Part 2, Part 3, and Part 4 (>2GB supported), 25MB for other phases
      const isLargeStage = [2, 3, 4].includes(stageNum);
      const maxSize = isLargeStage ? 3 * 1024 * 1024 * 1024 : 25 * 1024 * 1024;
      if (file.size > maxSize) {
        setUploadErr(
          isLargeStage
            ? `File size exceeds the 3GB maximum limit for Part ${stageNum} archives.`
            : "File size exceeds 25MB maximum limit."
        );
        setUploadingStage(null);
        setUploadProgress(null);
        return;
      }

      // V5.0: Sequential phase progression validation
      if (stageNum === 2) {
        const hasPhase1 = documentStages.find((s) => s.stage === 1)?.latestUpload;
        if (!hasPhase1) {
          setUploadErr("Phase 1 must be uploaded and submitted before Phase 2 can be unlocked for upload.");
          setUploadingStage(null);
          setUploadProgress(null);
          return;
        }
      } else if (stageNum === 3) {
        const hasPhase2 = documentStages.find((s) => s.stage === 2)?.latestUpload;
        if (!hasPhase2) {
          setUploadErr("Phase 2 must be uploaded and submitted before Phase 3 can be unlocked for upload.");
          setUploadingStage(null);
          setUploadProgress(null);
          return;
        }
      } else if (stageNum === 4) {
        const hasPhase3 = documentStages.find((s) => s.stage === 3)?.latestUpload;
        if (!hasPhase3) {
          setUploadErr("Phase 3 must be uploaded and submitted before Phase 4 can be unlocked for upload.");
          setUploadingStage(null);
          setUploadProgress(null);
          return;
        }
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("stage", String(stageNum));
      formData.append("enforceSequentialPhases", "true");
      if ([2, 3, 4].includes(stageNum)) {
        if (part2LiveUrl.trim()) formData.append("liveUrl", part2LiveUrl.trim());
        if (part2GithubRepoUrl.trim()) formData.append("githubRepoUrl", part2GithubRepoUrl.trim());
      }

      const xhr = new XMLHttpRequest();
      const startTime = Date.now();

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
          const elapsedSec = (Date.now() - startTime) / 1000;
          const speedBps = elapsedSec > 0 ? event.loaded / elapsedSec : 0;
          const remainingBytes = Math.max(0, event.total - event.loaded);
          const etaSec = speedBps > 0 ? Math.ceil(remainingBytes / speedBps) : 0;

          setUploadProgress({
            stage: stageNum,
            percent,
            loaded: event.loaded,
            total: event.total,
            speedBps,
            etaSec,
          });
        }
      };

      xhr.onload = async () => {
        try {
          const data = JSON.parse(xhr.responseText || "{}");
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadProgress({
              stage: stageNum,
              percent: 100,
              loaded: file.size,
              total: file.size,
              speedBps: 0,
              etaSec: 0,
            });

            if (data.forkedRepoUrl) {
              setPart2ForkedRepoUrl(data.forkedRepoUrl);
            }
            if (data.liveUrl) {
              setPart2LiveUrl(data.liveUrl);
            }
            if (data.githubRepoUrl) {
              setPart2GithubRepoUrl(data.githubRepoUrl);
            }

            setUploadMsg(
              `Part ${stageNum} (v${data.upload?.version || 1}) uploaded successfully! ${
                data.forkedRepoUrl ? `Repository forked to: ${data.forkedRepoUrl}` : ""
              }`
            );
            await loadTeamData();
            await fetchTeamFiles();
            setTimeout(() => {
              setUploadMsg(null);
              setUploadProgress(null);
            }, 6000);
          } else {
            setUploadErr(data.error || "Failed to upload document");
            setUploadProgress(null);
          }
        } catch {
          setUploadErr("Failed to parse server upload response");
          setUploadProgress(null);
        } finally {
          setUploadingStage(null);
        }
      };

      xhr.onerror = () => {
        setUploadErr("Network error during document upload");
        setUploadingStage(null);
        setUploadProgress(null);
      };

      xhr.open("POST", `/api/v1/teams/${team.id}/documents`);
      xhr.send(formData);
    } catch {
      setUploadErr("Failed to initiate file upload.");
      setUploadingStage(null);
      setUploadProgress(null);
    }
  };

  // Handle saving Live URL & GitHub Public Repo Link (triggers fork and updates team README.md)
  const handleSavePart2Links = async () => {
    if (!part2GithubRepoUrl.trim() && !part2LiveUrl.trim()) {
      setSavePart2LinksErr("Please provide at least a Live URL or a GitHub Public Repository link.");
      return;
    }

    setSavingPart2Links(true);
    setSavePart2LinksErr(null);
    setSavePart2LinksMsg(null);

    try {
      const res = await fetch(`/api/v1/teams/${team.id}/documents`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          liveUrl: part2LiveUrl.trim(),
          githubRepoUrl: part2GithubRepoUrl.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSavePart2LinksErr(data.error || "Failed to update repository and live links.");
        return;
      }

      if (data.forkedRepoUrl) {
        setPart2ForkedRepoUrl(data.forkedRepoUrl);
      }
      setSavePart2LinksMsg(
        `Links saved! ${
          data.forkedRepoUrl
            ? `Repository forked into host account: ${data.forkedRepoUrl} & README.md updated.`
            : "Team README.md and MANIFEST updated."
        }`
      );
      await loadTeamData();
      setTimeout(() => setSavePart2LinksMsg(null), 6000);
    } catch {
      setSavePart2LinksErr("Network error updating repository links.");
    } finally {
      setSavingPart2Links(false);
    }
  };

  // Handle code push simulation
  const handlePushCommit = async () => {
    setCommitting(true);
    setRepoMsg(null);

    try {
      const res = await fetch(`/api/v1/teams/${team.id}/repo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: commitMsg }),
      });

      const data = await res.json();
      if (res.ok) {
        setRepoMsg(data.message);
        await loadTeamData();
        setTimeout(() => setRepoMsg(null), 4000);
      }
    } catch {
      // ignore
    } finally {
      setCommitting(false);
    }
  };

  const handleFinalSubmit = async () => {
    setSubmittingFinal(true);
    setSubError(null);
    setSubSuccess(null);

    const finalProjectLink = subLink.trim() || part2LiveUrl.trim() || part2GithubRepoUrl.trim() || undefined;

    if (!finalProjectLink || !subFileUrl.trim() || !subDescription.trim()) {
      setSubError("All fields are mandatory in v5.0: Source Code / Live Demo URL, Binary/Release URL, and Architecture Write-Up must all be filled before submitting.");
      setConfirmModal(false);
      setSubmittingFinal(false);
      return;
    }

    try {
      const res = await fetch(`/api/v1/teams/${team.id}/submission`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-v5-gate": "true",
        },
        body: JSON.stringify({
          link: finalProjectLink,
          fileUrl: subFileUrl.trim() || undefined,
          description: subDescription.trim(),
          strictDeliverableGate: true,
          enforceAllFields: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubError(data.error || "Submission failed");
        setConfirmModal(false);
        return;
      }

      setSubSuccess("Final submission confirmed and locked! Recorded to audit trail.");
      setConfirmModal(false);
      await loadTeamData();
    } catch {
      setSubError("Network error completing submission");
    } finally {
      setSubmittingFinal(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-16">
        <div className="h-64 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
        <h1 className="font-display text-lg font-bold text-white mb-2">Squad Workspace Not Found</h1>
        <Link href="/dashboard/student" className="text-xs font-mono text-[#6366F1] hover:underline">
          ← Back to Console
        </Link>
      </div>
    );
  }

  const isHostOrAdmin = session?.role === "HOST" || session?.role === "SUPER_ADMIN";
  const currentUserId = session?.userId || session?.id || session?.studentProfile?.userId;
  const currentStudentProfileId = session?.studentProfile?.id;
  const isLead = isHostOrAdmin || Boolean(
    (currentUserId && (team.leadStudent?.userId === currentUserId || team.leadStudent?.user?.id === currentUserId)) ||
    (currentStudentProfileId && (team.leadStudentId === currentStudentProfileId || team.leadStudent?.id === currentStudentProfileId))
  );
  const isMember = isLead || Boolean(
    team.members?.some(
      (m: any) =>
        (currentUserId && (m.student?.userId === currentUserId || m.student?.user?.id === currentUserId)) ||
        (currentStudentProfileId && m.studentId === currentStudentProfileId)
    )
  );
  const canSelect = isLead || isMember || isHostOrAdmin;

  const isSubmissionLocked = submission?.locked;
  const hasDomain = !!team.domainId;
  const currentStatement =
    selectedStatement ||
    team?.problemStatement ||
    (team?.problemStatementId
      ? domains.flatMap((d) => d.problemStatements || []).find((p) => p.id === team.problemStatementId)
      : null);
  const hasStatement = !!team.problemStatementId || !!currentStatement;
  const hasUploadedDocs = documentStages.some((s) => (s.uploads && s.uploads.length > 0) || s.latestUpload);
  const hasActivity = combinedPercent > 0 || hasUploadedDocs || progressHistory.length > 0;
  const canAccessLaterStages = hasStatement || hasActivity;

  // Part 4 Deliverables Verification Gate Checklist
  const part4StageObj = documentStages.find((s) => s.stage === 4);
  const part4UploadsList = part4StageObj?.uploads || [];
  const hasPart4Code = part4UploadsList.some(
    (u: any) => u.fileType === "ZIP" || u.fileName?.toLowerCase().endsWith(".zip")
  );
  const hasPart4Doc = part4UploadsList.some(
    (u: any) => u.fileType === "PDF" || u.fileName?.toLowerCase().endsWith(".pdf")
  );
  const hasPart4Ppt = part4UploadsList.some(
    (u: any) =>
      u.fileType === "PPTX" ||
      u.fileType === "PPT" ||
      u.fileName?.toLowerCase().endsWith(".pptx") ||
      u.fileName?.toLowerCase().endsWith(".ppt")
  );
  const hasPart4LiveOrRepo = Boolean(
    subLink.trim() || part2LiveUrl.trim() || part2GithubRepoUrl.trim() || part2ForkedRepoUrl.trim()
  );
  const isPart4GateSatisfied = hasPart4Code && hasPart4Doc && hasPart4Ppt && hasPart4LiveOrRepo;

  const hasSubLink = Boolean(subLink.trim() || part2LiveUrl.trim() || part2GithubRepoUrl.trim());
  const hasSubBinary = Boolean(subFileUrl.trim());
  const hasSubDesc = Boolean(subDescription.trim());
  const allSubmissionFieldsFilled = hasSubLink && hasSubBinary && hasSubDesc;

  const handleTabChange = (targetTab: TabType) => {
    if (!canAccessLaterStages && ["progress", "documents", "timeline", "repo", "submission", "leaderboard"].includes(targetTab)) {
      setSelectionError("⚠️ Please select and submit your problem statement in Step 2 first before advancing to subsequent stages.");
      setActiveTab("statement");
      return;
    }
    setActiveTab(targetTab);
  };

  // Workflow steps
  const steps = [
    { key: "domain", label: "1. Domain", done: hasDomain, tab: "domain" as const },
    { key: "statement", label: "2. Problem Statement", done: hasStatement, tab: "statement" as const },
    { key: "progress", label: "3. Progress Bar", done: combinedPercent > 0, tab: "progress" as const },
    { key: "documents", label: "4. Documentation", done: hasUploadedDocs, tab: "documents" as const },
    { key: "timeline", label: "5. Timeline Trace", done: progressHistory.length > 0 || hasUploadedDocs, tab: "timeline" as const },
    { key: "repo", label: "6. Squad Files & Code", done: !!repo || teamFiles.length > 0, tab: "repo" as const },
    { key: "submission", label: "7. Submit", done: isSubmissionLocked, tab: "submission" as const },
    ...(v5Active ? [{ key: "leaderboard", label: "8. Leaderboard", done: false, tab: "leaderboard" as const }] : []),
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full space-y-8">
      {/* Top Breadcrumb & Status */}
      <div>
        <Link
          href="/dashboard/student"
          className="text-xs font-mono text-slate-500 hover:text-white flex items-center gap-1.5 transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Student Console
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div className="space-y-1">
            <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <span>{team.hackathon.title}</span>
              <span>/</span>
              <span className="text-white">Live Event Arena</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-white tracking-tight flex items-center gap-3">
              <span>Squad: {team.name}</span>
              {team.teamId && (
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {team.teamId}
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Lead: {team.leadStudent.user.name} · Squad Size: {team.members?.length ?? 1} · Status: {team.status}
              {team.domain && (
                <> · <span className="text-[#818CF8] font-bold">Domain: {team.domain.name}</span></>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadTeamData}
              className="p-2 rounded-lg bg-white/[0.04] border border-white/10 text-slate-400 hover:text-white transition-colors"
              title="Refresh Workspace"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <div className="text-right">
              <div className="text-[10px] font-mono text-slate-500 uppercase">Team Combined Progress</div>
              <div className="text-sm font-bold font-mono text-white flex items-center gap-1.5 justify-end">
                <TrendingUp className="w-3.5 h-3.5 text-[#6366F1]" />
                {combinedPercent}%
              </div>
            </div>
          </div>
        </div>

        {/* Workflow Progress Steps */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1">
          {steps.map((step, idx) => {
            const isGated = !canAccessLaterStages && ["progress", "documents", "timeline", "repo", "submission"].includes(step.tab);
            return (
              <React.Fragment key={step.key}>
                <button
                  onClick={() => handleTabChange(step.tab)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold whitespace-nowrap transition-all ${
                    activeTab === step.tab
                      ? "bg-[#6366F1] text-white shadow-lg shadow-[#6366F1]/20"
                      : isGated
                      ? "bg-white/[0.02] text-slate-500 border border-white/5 opacity-60"
                      : step.done
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                      : "bg-white/[0.04] text-slate-400 border border-white/10 hover:text-white"
                  }`}
                >
                  {isGated ? (
                    <Lock className="w-3 h-3 text-slate-500" />
                  ) : step.done ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <span className="w-3 h-3 rounded-full bg-white/20 flex items-center justify-center text-[9px]">
                      {idx + 1}
                    </span>
                  )}
                  {step.label}
                </button>
                {idx < steps.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Navigation Sidebar */}
        <aside className="md:col-span-3 space-y-4">
          <nav className="p-2 rounded-xl bg-[#0B0E18] border border-white/[0.08] space-y-1 text-xs font-mono">
            <button
              onClick={() => handleTabChange("domain")}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                activeTab === "domain"
                  ? "bg-white text-black font-bold"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2">
                <Target className="w-3.5 h-3.5" />
                <span>1. Domain Selection</span>
              </div>
              {hasDomain && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
            </button>

            <button
              onClick={() => handleTabChange("statement")}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                activeTab === "statement"
                  ? "bg-white text-black font-bold"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2">
                <FileCode className="w-3.5 h-3.5" />
                <span>2. Problem Statement</span>
              </div>
              {hasStatement && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
            </button>

            <button
              onClick={() => handleTabChange("progress")}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                activeTab === "progress"
                  ? "bg-white text-black font-bold"
                  : !canAccessLaterStages
                  ? "text-slate-500 opacity-60 hover:bg-white/5"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2">
                {!canAccessLaterStages ? <Lock className="w-3.5 h-3.5 text-slate-500" /> : <TrendingUp className="w-3.5 h-3.5" />}
                <span>3. Progress Bar</span>
              </div>
              <span className="text-[10px] opacity-70 font-bold">{combinedPercent}%</span>
            </button>

            <button
              onClick={() => handleTabChange("documents")}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                activeTab === "documents"
                  ? "bg-white text-black font-bold"
                  : !canAccessLaterStages
                  ? "text-slate-500 opacity-60 hover:bg-white/5"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2">
                {!canAccessLaterStages ? <Lock className="w-3.5 h-3.5 text-slate-500" /> : <FileText className="w-3.5 h-3.5" />}
                <span>4. Documentation</span>
              </div>
              {hasUploadedDocs && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
            </button>

            <button
              onClick={() => handleTabChange("timeline")}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                activeTab === "timeline"
                  ? "bg-white text-black font-bold"
                  : !canAccessLaterStages
                  ? "text-slate-500 opacity-60 hover:bg-white/5"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2">
                {!canAccessLaterStages ? <Lock className="w-3.5 h-3.5 text-slate-500" /> : <History className="w-3.5 h-3.5" />}
                <span>5. Timeline Trace</span>
              </div>
              <span className="text-[10px] opacity-70">{progressHistory.length}</span>
            </button>

            <button
              onClick={() => handleTabChange("repo")}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                activeTab === "repo"
                  ? "bg-white text-black font-bold"
                  : !canAccessLaterStages
                  ? "text-slate-500 opacity-60 hover:bg-white/5"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2">
                {!canAccessLaterStages ? <Lock className="w-3.5 h-3.5 text-slate-500" /> : <GitBranch className="w-3.5 h-3.5" />}
                <span>6. Code Repository</span>
              </div>
              <span className="text-[10px] opacity-70">Git</span>
            </button>

            <button
              onClick={() => handleTabChange("submission")}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                activeTab === "submission"
                  ? "bg-white text-black font-bold"
                  : !canAccessLaterStages
                  ? "text-slate-500 opacity-60 hover:bg-white/5"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2">
                {!canAccessLaterStages ? <Lock className="w-3.5 h-3.5 text-slate-500" /> : <FileCheck className="w-3.5 h-3.5" />}
                <span>7. Final Submission</span>
              </div>
              {isSubmissionLocked && <Lock className="w-3 h-3 text-amber-400" />}
            </button>

            {v5Active && (
              <button
                onClick={() => handleTabChange("leaderboard")}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                  activeTab === "leaderboard"
                    ? "bg-white text-black font-bold"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>8. Leaderboard</span>
                </div>
                <span className="text-[10px] text-amber-400 font-bold uppercase">v5.0</span>
              </button>
            )}
          </nav>
        </aside>

        {/* Right Main Content */}
        <main className="md:col-span-9 space-y-6">

          {/* TAB 0: DOMAIN SELECTION */}
          {activeTab === "domain" && (
            <div className="space-y-6">
              {domainSelectionError && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-mono text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{domainSelectionError}</span>
                </div>
              )}
              {domainSelectionSuccess && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{domainSelectionSuccess}</span>
                </div>
              )}

              {/* Already Selected */}
              {hasDomain ? (
                <div className="p-6 rounded-2xl bg-[#0B0E18] border border-emerald-500/30 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      Competing Domain Confirmed
                    </div>
                    {!hasStatement && isLead && (
                      <span className="text-[10px] font-mono text-slate-400">
                        (Can change until problem statement is selected)
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Target className="w-5 h-5 text-[#6366F1]" />
                      <div>
                        <h2 className="font-display text-xl font-bold text-white tracking-tight">
                          {team.domain.name}
                        </h2>
                        {team.domain.description && (
                          <p className="text-xs text-slate-400 font-mono mt-1">
                            {team.domain.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-[#6366F1]/10 border border-[#6366F1]/20 text-xs font-mono text-[#818CF8]">
                      <Sparkles className="w-3.5 h-3.5 inline mr-1.5" />
                      At problem statement reveal time, only this domain&apos;s problem statements will be shown to your squad.
                    </div>
                  </div>

                  {/* Allow changing domain if no statement selected yet */}
                  {!hasStatement && isLead && allDomains.length > 1 && (
                    <div className="pt-2 border-t border-white/[0.06]">
                      <div className="text-[11px] font-mono text-slate-500 mb-3">Change Domain (optional):</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {allDomains
                          .filter((d) => d.id !== team.domainId)
                          .map((d) => (
                            <button
                              key={d.id}
                              onClick={() => handleSelectDomain(d.id)}
                              disabled={selectingDomainId === d.id}
                              className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.08] text-left hover:border-[#6366F1]/40 transition-all text-xs font-mono text-slate-300 hover:text-white disabled:opacity-40"
                            >
                              {selectingDomainId === d.id ? "Selecting..." : d.name}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      onClick={() => setActiveTab("statement")}
                      className="px-5 py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-slate-200 transition-colors flex items-center gap-2"
                    >
                      Continue to Problem Statement →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-6 rounded-2xl bg-[#0B0E18] border border-white/[0.08]">
                    <div className="flex items-center gap-3 mb-4">
                      <Target className="w-5 h-5 text-[#6366F1]" />
                      <div>
                        <h2 className="text-sm font-bold text-white tracking-tight">
                          Select Your Competing Domain
                        </h2>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {isLead
                            ? "As team lead, select the domain your squad will compete in. At reveal time, only your domain's problem statements will appear."
                            : "Waiting for team lead to select the competing domain."}
                        </p>
                      </div>
                    </div>

                    {allDomains.length === 0 ? (
                      <div className="p-8 text-center text-xs font-mono text-slate-500 bg-white/[0.01] rounded-xl border border-dashed border-white/10">
                        No domains configured for this hackathon yet. Contact the host.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {allDomains.map((d) => (
                          <div
                            key={d.id}
                            className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-[#6366F1]/40 transition-all space-y-3"
                          >
                            <div>
                              <div className="font-bold text-white text-sm">{d.name}</div>
                              {d.description && (
                                <p className="text-[11px] text-slate-400 font-mono mt-1 leading-relaxed">
                                  {d.description}
                                </p>
                              )}
                              <div className="mt-2 text-[10px] font-mono text-slate-500">
                                {d.problemStatements.length} problem statement(s) in this domain
                              </div>
                            </div>
                            {isLead && !hasStatement && (
                              <button
                                onClick={() => handleSelectDomain(d.id)}
                                disabled={selectingDomainId === d.id}
                                className="w-full py-2 rounded-lg bg-[#6366F1] text-white font-bold text-xs hover:bg-[#4F46E5] transition-colors disabled:opacity-40"
                              >
                                {selectingDomainId === d.id ? "Selecting..." : `Select "${d.name}"`}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 1: PROBLEM STATEMENT SELECTION & REVEAL */}
          {activeTab === "statement" && (
            <div className="space-y-6">
              {selectionError && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-mono text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{selectionError}</span>
                </div>
              )}

              {/* No domain selected yet */}
              {!hasDomain && (
                <div className="p-8 rounded-2xl bg-[#0B0E18] border border-amber-500/30 text-center space-y-3">
                  <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                  <h3 className="font-bold text-white">Domain Not Selected</h3>
                  <p className="text-xs text-slate-400 font-mono max-w-sm mx-auto">
                    Your squad must select a competing domain before you can see problem statements at reveal time.
                  </p>
                  <button
                    onClick={() => setActiveTab("domain")}
                    className="px-4 py-2 rounded-xl bg-[#6366F1] text-white font-bold text-xs"
                  >
                    ← Go Back to Domain Selection
                  </button>
                </div>
              )}

              {/* View A: Complete Description View for a Selected/Inspected Problem Statement */}
              {activeReviewPs ? (
                <div className="p-6 rounded-2xl bg-[#0B0E18] border border-white/[0.08] space-y-6">
                  {/* Top Navigation & Slot Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/[0.08] gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveReviewPs(null)}
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-mono transition-colors w-fit"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>← Go Back to Problem Statement List</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {activeReviewPs.id === currentStatement?.id ? (
                        <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Currently Selected Statement
                        </span>
                      ) : activeReviewPs.isFull ? (
                        <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5" /> Maximum Slots Reached (Blocked)
                        </span>
                      ) : (
                        <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Slots Remaining: {activeReviewPs.slotsRemaining} / {activeReviewPs.cap}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Blocked Alert Banner if Maximum Slots Reached */}
                  {activeReviewPs.isFull && activeReviewPs.id !== currentStatement?.id && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-300 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="font-bold text-red-200">This Problem Statement is Blocked</div>
                        <p className="text-[11px] text-red-300/90 leading-relaxed">
                          Another team has already claimed the available slot(s) for this problem statement ({activeReviewPs.assignedCount} / {activeReviewPs.cap} slots filled). The submit button is disabled. Please click &quot;Go Back&quot; below and choose another track.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Title & Track Code */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {activeReviewPs.code && (
                        <span className="px-3 py-1 rounded-lg bg-[#6366F1]/20 border border-[#6366F1]/40 text-[#818CF8] text-xs font-mono font-bold">
                          {activeReviewPs.code}
                        </span>
                      )}
                      <h2 className="font-display text-xl font-bold text-white tracking-tight">
                        {activeReviewPs.title}
                      </h2>
                    </div>
                  </div>

                  {/* Complete Description Sections */}
                  <div className="space-y-4">
                    {/* Overview / Description */}
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-1.5">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-[#818CF8] font-bold flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Problem Statement Overview & Description</span>
                      </div>
                      <p className="text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                        {activeReviewPs.overview || activeReviewPs.description || "No description provided."}
                      </p>
                    </div>

                    {/* Mission */}
                    {activeReviewPs.mission && (
                      <div className="p-4 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/30 space-y-1.5">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-[#A5B4FC] font-bold flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5" />
                          <span>Mission Objective & Expected Deliverables</span>
                        </div>
                        <p className="text-xs text-white font-mono leading-relaxed whitespace-pre-wrap">
                          {activeReviewPs.mission}
                        </p>
                      </div>
                    )}

                    {/* Structured Specifications Grid */}
                    {(activeReviewPs.resources || activeReviewPs.metrics || activeReviewPs.goals || activeReviewPs.safetyRules || activeReviewPs.evalBoundary) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {activeReviewPs.resources && (
                          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-1">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1">
                              📦 Provided Resources & Technical Documentation
                            </span>
                            <p className="text-[11px] text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                              {activeReviewPs.resources}
                            </p>
                          </div>
                        )}
                        {activeReviewPs.metrics && (
                          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-1">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1">
                              📊 Success Metrics & KPIs
                            </span>
                            <p className="text-[11px] text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                              {activeReviewPs.metrics}
                            </p>
                          </div>
                        )}
                        {activeReviewPs.goals && (
                          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-1">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold flex items-center gap-1">
                              🚀 Goals & Stretch Targets
                            </span>
                            <p className="text-[11px] text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                              {activeReviewPs.goals}
                            </p>
                          </div>
                        )}
                        {activeReviewPs.safetyRules && (
                          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-1">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1">
                              🛡️ Safety Rules & Sandbox Isolation Constraints
                            </span>
                            <p className="text-[11px] text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                              {activeReviewPs.safetyRules}
                            </p>
                          </div>
                        )}
                        {activeReviewPs.evalBoundary && (
                          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-1 md:col-span-2">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
                              ⚖️ Evaluation Boundary & Out-of-Scope Definitions
                            </span>
                            <p className="text-[11px] text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                              {activeReviewPs.evalBoundary}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Attachment Link */}
                    {activeReviewPs.attachmentUrl && (
                      <div className="pt-1">
                        <a
                          href={activeReviewPs.attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-xs font-mono text-[#818CF8] hover:underline bg-[#6366F1]/10 px-3.5 py-2 rounded-xl border border-[#6366F1]/20"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>Attachment: {activeReviewPs.attachmentName || "View Reference Document"}</span>
                          <ExternalLink className="w-3 h-3 ml-0.5" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Bar: Go Back and Submit Buttons */}
                  <div className="pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => setActiveReviewPs(null)}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-mono font-bold text-xs transition-colors flex items-center justify-center gap-2 border border-white/10"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>← Go Back</span>
                    </button>

                    {/* Team Leader submit / choose button */}
                    {activeReviewPs.id === currentStatement?.id ? (
                      <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-3">
                        <span className="text-[11px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          Currently confirmed statement for your squad
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveReviewPs(null)}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono font-bold text-xs transition-colors"
                        >
                          Done Reviewing
                        </button>
                      </div>
                    ) : !activeReviewPs.isFull ? (
                      isLead ? (
                        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-3">
                          <span className="text-[11px] font-mono text-slate-400">
                            Select this problem statement for your squad (managed in background).
                          </span>
                          <button
                            type="button"
                            onClick={() => handleExecuteStatementSubmit(activeReviewPs)}
                            disabled={selectingId === activeReviewPs.id}
                            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-mono font-bold text-xs transition-colors disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-[#6366F1]/20"
                          >
                            {selectingId === activeReviewPs.id ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Saving Selection...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                                <span>{hasStatement ? "Switch to This Statement & Save →" : "Choose This Problem Statement →"}</span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono text-xs">
                          <Lock className="w-4 h-4 shrink-0 text-amber-400" />
                          <span>Read-Only Mode: You can review all details, but only your Team Leader ({team.leadStudent?.user?.name || "Lead"}) has access to submit.</span>
                        </div>
                      )
                    ) : (
                      <div className="text-right">
                        <span className="text-xs font-mono text-red-400 font-bold bg-red-500/10 px-4 py-2 rounded-xl border border-red-500/20 inline-flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5" /> Maximum Slots Reached: Submit Disabled (Please Go Back)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Current Selected Statement (if chosen) */}
                  {hasStatement && currentStatement && (
                    <div className="p-6 rounded-2xl bg-[#0B0E18] border border-emerald-500/30 space-y-4">
                      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                        <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          Currently Selected Problem Statement
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">
                          ACTIVE SQUAD SELECTION
                        </span>
                      </div>

                      {team.domain && (
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <Target className="w-3.5 h-3.5 text-[#6366F1]" />
                          <span className="text-slate-400">Domain:</span>
                          <span className="text-[#818CF8] font-bold">{team.domain.name}</span>
                        </div>
                      )}

                      <div className="space-y-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          {currentStatement.code && (
                            <span className="px-2.5 py-1 rounded bg-[#6366F1]/20 border border-[#6366F1]/40 text-[#818CF8] text-[10px] font-mono font-bold">
                              {currentStatement.code}
                            </span>
                          )}
                          <h2 className="font-display text-xl font-bold text-white tracking-tight">
                            {currentStatement.title}
                          </h2>
                        </div>

                        {currentStatement.overview && (
                          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-1">
                            <div className="text-[10px] font-mono uppercase tracking-wider text-[#818CF8] font-bold flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5" />
                              <span>Problem Statement Overview</span>
                            </div>
                            <p className="text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                              {currentStatement.overview}
                            </p>
                          </div>
                        )}

                        {currentStatement.mission && (
                          <div className="p-3.5 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/30 space-y-1">
                            <div className="text-[10px] font-mono uppercase tracking-wider text-[#A5B4FC] font-bold flex items-center gap-1.5">
                              <Target className="w-3.5 h-3.5" />
                              <span>Mission Objective</span>
                            </div>
                            <p className="text-xs text-white font-mono leading-relaxed whitespace-pre-wrap">
                              {currentStatement.mission}
                            </p>
                          </div>
                        )}

                        {(currentStatement.resources || currentStatement.metrics || currentStatement.goals || currentStatement.safetyRules || currentStatement.evalBoundary) ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            {currentStatement.resources && (
                              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-1">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1">
                                  📦 Provided Resources & Datasets
                                </span>
                                <p className="text-[11px] text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                                  {currentStatement.resources}
                                </p>
                              </div>
                            )}
                            {currentStatement.metrics && (
                              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-1">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1">
                                  📊 Success Metrics & Rubric
                                </span>
                                <p className="text-[11px] text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                                  {currentStatement.metrics}
                                </p>
                              </div>
                            )}
                            {currentStatement.goals && (
                              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-1">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold flex items-center gap-1">
                                  🚀 Goals & Deliverables
                                </span>
                                <p className="text-[11px] text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                                  {currentStatement.goals}
                                </p>
                              </div>
                            )}
                            {currentStatement.safetyRules && (
                              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-1">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1">
                                  🛡️ Safety, Security & Compliance
                                </span>
                                <p className="text-[11px] text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                                  {currentStatement.safetyRules}
                                </p>
                              </div>
                            )}
                            {currentStatement.evalBoundary && (
                              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-1 md:col-span-2">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
                                  ⚖️ Evaluation Boundary & Scope
                                </span>
                                <p className="text-[11px] text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                                  {currentStatement.evalBoundary}
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                            {currentStatement.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 flex flex-wrap gap-3">
                        <button
                          onClick={() => setActiveTab("progress")}
                          className="px-5 py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-slate-200 transition-colors flex items-center gap-2"
                        >
                          Go to Progress Bar →
                        </button>
                        <button
                          onClick={() => setActiveTab("documents")}
                          className="px-5 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white font-bold text-xs hover:bg-white/10 transition-colors flex items-center gap-2"
                        >
                          Go to Documentation Stages →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Available Problem Statements in Domain */}
                  {hasDomain && (
                    <div className="space-y-6">
                      <div className="border-b border-white/[0.06] pb-3">
                        <h2 className="text-sm font-bold text-white tracking-tight">
                          {team.domain?.name} — Available Problem Statements
                        </h2>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {hasStatement && currentStatement
                            ? "Browse and select any problem statement from your domain below to inspect full details or update your squad's choice in the background."
                            : "Select a problem statement below to review its full specifications and confirm your squad's choice."}
                        </p>
                      </div>

                      {domains.length === 0 && (
                        <div className="p-8 rounded-2xl bg-[#0B0E18] border border-white/[0.08] text-center space-y-3">
                          <Lock className="w-8 h-8 text-amber-400 mx-auto" />
                          <h3 className="font-bold text-white">Problem Statements Not Yet Revealed</h3>
                          <p className="text-xs text-slate-400 font-mono max-w-sm mx-auto">
                            Statements stay hidden server-side until the reveal time. They will unlock automatically using the server clock.
                          </p>
                        </div>
                      )}

                      {domains.map((domain) => (
                        <div
                          key={domain.id}
                          className="p-6 rounded-2xl bg-[#0B0E18] border border-white/[0.08] space-y-4"
                        >
                          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-2">
                                <Target className="w-3.5 h-3.5 text-[#6366F1]" />
                                <span>{domain.name}</span>
                                {domain.isRevealed ? (
                                  <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    Revealed & Unlocked
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                                    <Lock className="w-2.5 h-2.5" /> Hidden until reveal
                                  </span>
                                )}
                              </div>
                              {domain.description && (
                                <p className="text-[11px] text-slate-400 mt-1 font-mono">
                                  {domain.description}
                                </p>
                              )}
                            </div>

                            {!domain.isRevealed && (
                              <div className="text-right font-mono">
                                <span className="text-[10px] text-slate-500 uppercase">Unlocks In (HH:MM:SS)</span>
                                <div className="text-xs text-amber-400 font-bold tracking-wider">
                                  {(() => {
                                    const sec = Math.max(0, domain.secondsUntilReveal || 0);
                                    const hh = String(Math.floor(sec / 3600)).padStart(2, "0");
                                    const mm = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
                                    const ss = String(sec % 60).padStart(2, "0");
                                    return `${hh}:${mm}:${ss}`;
                                  })()}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  Unlock Time: {new Date(domain.revealAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })} IST
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Clean Problem Statements List */}
                          <div className="grid grid-cols-1 gap-3">
                            {domain.problemStatements.map((ps) => (
                              <div
                                key={ps.id}
                                onClick={() => domain.isRevealed && handleReviewStatement(ps)}
                                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                                  ps.id === currentStatement?.id
                                    ? "bg-emerald-500/[0.04] border-emerald-500/40"
                                    : ps.isFull
                                    ? "bg-red-500/[0.02] border-red-500/20 hover:border-red-500/40"
                                    : "bg-white/[0.02] border-white/[0.08] hover:border-[#6366F1]/50 hover:bg-[#6366F1]/[0.02]"
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="space-y-1.5 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {ps.code && (
                                        <span className="px-2.5 py-0.5 rounded bg-[#6366F1]/20 border border-[#6366F1]/40 text-[#818CF8] text-[10px] font-mono font-bold">
                                          {ps.code}
                                        </span>
                                      )}
                                      <h3 className="text-xs font-bold text-white font-mono">
                                        {ps.title}
                                      </h3>
                                      {ps.id === currentStatement?.id ? (
                                        <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" /> Active Squad Selection
                                        </span>
                                      ) : ps.isFull ? (
                                        <span className="text-[9px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-bold flex items-center gap-1">
                                          <Lock className="w-2.5 h-2.5" /> Blocked (Slots Full)
                                        </span>
                                      ) : (
                                        <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                                          Slots Available: {ps.slotsRemaining} / {ps.cap}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="shrink-0 flex items-center gap-3">
                                    {domain.isRevealed && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleReviewStatement(ps);
                                        }}
                                        className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition-colors flex items-center gap-1.5 ${
                                          ps.id === currentStatement?.id
                                            ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/40"
                                            : ps.isFull
                                            ? "bg-white/5 text-slate-400 hover:text-white border border-white/10"
                                            : "bg-[#6366F1] text-white hover:bg-[#4F46E5] shadow-sm shadow-[#6366F1]/20"
                                        }`}
                                      >
                                        <span>
                                          {ps.id === currentStatement?.id
                                            ? "View Current Details"
                                            : ps.isFull
                                            ? "View Details (Blocked)"
                                            : isLead
                                            ? "Select & View Description →"
                                            : "Read Full Description →"}
                                        </span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PROGRESS BAR (Combined Team Progress & Individual Member Updates) */}
          {activeTab === "progress" && (
            <div className="p-6 rounded-2xl bg-[#0B0E18] border border-white/[0.08] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/[0.06] pb-3 gap-2">
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#6366F1]" />
                    Team Combined Progress Bar
                  </h2>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Team members update their own completion percentage, and the team bar shows the combined progress with the last-updated timestamp and author.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold font-mono text-emerald-400">
                    {combinedPercent}%
                  </div>
                  {lastUpdatedTime && (
                    <div className="text-[10px] text-slate-400 font-mono">
                      Updated: {new Date(lastUpdatedTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      {lastUpdatedBy ? ` by ${lastUpdatedBy}` : ""}
                    </div>
                  )}
                </div>
              </div>

              {/* Selected problem context */}
              {selectedStatement && (
                <div className="p-3 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20 text-xs font-mono">
                  <div className="text-[10px] text-slate-500 uppercase mb-1">Building Solution For</div>
                  <div className="font-bold text-white">{selectedStatement.title}</div>
                  {team.domain && <div className="text-[#818CF8] text-[11px] mt-0.5">Domain: {team.domain.name}</div>}
                </div>
              )}

              {!hasStatement && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-mono text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Select a problem statement first before logging progress.
                </div>
              )}

              {progressMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400 flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{progressMsg}</span>
                </div>
              )}

              {progressErr && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-mono text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{progressErr}</span>
                </div>
              )}

              {/* Combined Progress Bar Display */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Combined Squad Progress</span>
                  <span className="text-white font-bold">{combinedPercent}%</span>
                </div>
                <div className="w-full bg-white/5 h-4 rounded-full overflow-hidden border border-white/10 p-0.5">
                  <div
                    className="bg-gradient-to-r from-[#6366F1] to-emerald-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${combinedPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100% Complete</span>
                </div>
              </div>

              {/* Individual Members' Completion Breakdown */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center justify-between">
                  <span>Squad Member Completion Breakdown</span>
                  <span className="text-[10px] text-slate-400 lowercase font-normal">
                    (combined = average of all members)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {membersProgress.map((m) => (
                    <div
                      key={m.memberId}
                      className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-2 font-mono text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{m.name}</span>
                            {m.role === "LEAD" && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/30">
                                LEAD
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500">{m.hackathonId}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-emerald-400">{m.percent}%</span>
                          <div className="text-[9px] text-slate-500">
                            {m.lastUpdated ? new Date(m.lastUpdated).toLocaleTimeString() : "Pending"}
                          </div>
                        </div>
                      </div>

                      <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#6366F1] h-full rounded-full transition-all"
                          style={{ width: `${m.percent}%` }}
                        />
                      </div>

                      {m.note && (
                        <div className="text-[10px] text-slate-400 bg-white/[0.02] p-2 rounded border border-white/5 truncate">
                          &quot;{m.note}&quot;
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Member Self Progress Updater Form */}
              {hasStatement && !isSubmissionLocked && (
                <form onSubmit={handleLogProgress} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white font-mono">
                      Update Your Own Completion Percentage
                    </span>
                    <select
                      value={nextPercent}
                      onChange={(e) => setNextPercent(Number(e.target.value))}
                      className="px-2.5 py-1 text-xs font-mono bg-white/[0.03] border border-white/10 rounded-lg text-white focus:outline-none"
                    >
                      {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((p) => (
                        <option key={p} value={p}>
                          {p}%
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-slate-400 block">
                      Milestone Notes / Changelog <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      required
                      value={progressNote}
                      onChange={(e) => setProgressNote(e.target.value)}
                      placeholder="e.g., Completed authentication flow, integrated database models, wired frontend api..."
                      rows={2}
                      className="w-full px-3 py-2 text-xs font-mono bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-white/30"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loggingProgress || !progressNote.trim()}
                    className="w-full py-2.5 rounded-xl bg-white text-black font-bold text-xs font-mono hover:bg-slate-200 transition-colors disabled:opacity-40"
                  >
                    {loggingProgress ? "Updating Progress..." : `Confirm & Log ${nextPercent}% Personal Progress`}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: DOCUMENTATION (4 Stages: Part 1, Part 2, Part 3, Part 4 & GitHub Sync) */}
          {activeTab === "documents" && (
            <div className="p-6 rounded-2xl bg-[#0B0E18] border border-white/[0.08] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/[0.06] pb-3 gap-2">
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#6366F1]" />
                    Four-Stage Documentation Upload
                  </h2>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Stage-by-stage document submission with live upload progress (speed, ETA, %), GitHub repository auto-forking to host account, and squad folder synchronization.
                  </p>
                </div>
                <div className="text-[10px] font-mono text-slate-400 bg-white/5 px-2.5 py-1 rounded">
                  Parts 2, 3 & 4: Up to 3GB ZIP Archive (&gt;2GB Supported) · Part 1: Max 25MB
                </div>
              </div>

              {uploadMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400 flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{uploadMsg}</span>
                </div>
              )}

              {uploadErr && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-mono text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadErr}</span>
                </div>
              )}

              {/* 4 Stages Cards */}
              <div className="grid grid-cols-1 gap-4">
                {documentStages.map((stage) => {
                  const latest = stage.latestUpload;
                  const isExpanded = !!expandedHistory[stage.stage];
                  const isBlockedByPrior = Boolean(
                    stage.isBlockedByPriorStage ||
                    (stage.stage === 2 && !documentStages.find((s) => s.stage === 1)?.latestUpload) ||
                    (stage.stage === 3 && !documentStages.find((s) => s.stage === 2)?.latestUpload) ||
                    (stage.stage === 4 && !documentStages.find((s) => s.stage === 3)?.latestUpload)
                  );

                  return (
                    <div
                      key={stage.stage}
                      className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-4 font-mono text-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{stage.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-400">
                              {stage.description}
                            </span>
                          </div>
                          {stage.dueDate && (
                            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>Due: {new Date(stage.dueDate).toLocaleString()}</span>
                              {stage.isPastDue && (
                                <span className="text-red-400 font-bold">(Deadline Passed)</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2">
                          {latest ? (
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[10px]">
                                v{latest.version} Uploaded
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded font-bold text-[10px] border ${
                                  latest.syncStatus === "Synced"
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : latest.syncStatus === "Pending"
                                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                    : "bg-red-500/10 text-red-400 border-red-500/20"
                                }`}
                              >
                                {latest.syncStatus === "Synced"
                                  ? "Folder Synced"
                                  : latest.syncStatus === "Pending"
                                  ? "Sync Pending"
                                  : "Failed with Retry"}
                              </span>
                            </div>
                          ) : isBlockedByPrior ? (
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold text-[10px] flex items-center gap-1">
                              <Lock className="w-3 h-3 text-amber-400" />
                              Locked (Phase {stage.stage - 1} Required)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-white/5 text-slate-500 text-[10px]">
                              Pending Upload
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Sequential Lock Banner */}
                      {isBlockedByPrior && (
                        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2.5">
                          <Lock className="w-4 h-4 shrink-0 text-amber-400" />
                          <div>
                            <span className="font-bold">Sequential Stage Lock (v5.0): </span>
                            <span>
                              Phase {stage.stage} upload is blocked until Phase {stage.stage - 1} is uploaded and submitted. Complete Phase {stage.stage - 1} to unlock this stage.
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Latest Upload Info */}
                      {latest && (
                        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5 text-[#818CF8]" />
                              <span className="text-white font-bold">{latest.fileName}</span>
                              <span className="text-slate-500 text-[10px]">
                                ({(latest.fileSize / 1024 / 1024).toFixed(2)} MB · {latest.fileType})
                              </span>
                            </div>
                            <span className="text-slate-400 text-[10px]">
                              v{latest.version} by {latest.uploaderName}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/[0.04] text-[10px]">
                            <span className="text-slate-500">
                              Uploaded: {new Date(latest.createdAt).toLocaleString()}
                            </span>
                            {latest.githubCommitHash && (
                              <div className="flex items-center gap-1.5 text-slate-400">
                                <span>Commit:</span>
                                <code className="bg-white/5 px-1.5 py-0.5 rounded text-white font-mono">
                                  {latest.githubCommitHash.slice(0, 8)}
                                </code>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Parts 2, 3 & 4: Live URL Link & GitHub Public Repo Fork Panel */}
                      {[2, 3, 4].includes(stage.stage) && (
                        <div className="p-4 rounded-xl bg-[#6366F1]/5 border border-[#6366F1]/20 space-y-3 mt-1">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-white/[0.06] pb-2.5">
                            <div className="flex items-center gap-2">
                              <GitFork className="w-4 h-4 text-[#818CF8]" />
                              <span className="font-bold text-white text-xs">
                                Live Deployment URL & GitHub Public Repo Fork
                              </span>
                            </div>
                            <span className="text-[10px] text-[#818CF8] bg-[#6366F1]/10 px-2 py-0.5 rounded border border-[#6366F1]/20 font-mono">
                              Part {stage.stage} Automatic Fork & README.md Sync
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-400 font-mono">
                            Add your project&apos;s live demo URL and public GitHub repository. Upon saving or uploading Part {stage.stage}, your repository is automatically forked into the host account, and the forked link is written to the server&apos;s team README.md and MANIFEST.
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            <div>
                              <label className="text-[10px] text-slate-300 font-bold block mb-1 flex items-center gap-1.5">
                                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                                <span>Live Project URL Link</span>
                              </label>
                              <input
                                type="url"
                                value={part2LiveUrl}
                                onChange={(e) => setPart2LiveUrl(e.target.value)}
                                placeholder="https://your-live-demo.vercel.app"
                                className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-[#6366F1]"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-300 font-bold block mb-1 flex items-center gap-1.5">
                                <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
                                <span>GitHub Public Repository Link</span>
                              </label>
                              <input
                                type="url"
                                value={part2GithubRepoUrl}
                                onChange={(e) => setPart2GithubRepoUrl(e.target.value)}
                                placeholder="https://github.com/myteam/hackathon-project"
                                className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-[#6366F1]"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                            <div className="flex-1">
                              {savePart2LinksMsg && (
                                <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 font-mono">
                                  <Check className="w-3.5 h-3.5 shrink-0" />
                                  <span>{savePart2LinksMsg}</span>
                                </div>
                              )}
                              {savePart2LinksErr && (
                                <div className="text-[11px] text-red-400 flex items-center gap-1.5 font-mono">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  <span>{savePart2LinksErr}</span>
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              disabled={savingPart2Links || (!part2GithubRepoUrl.trim() && !part2LiveUrl.trim())}
                              onClick={handleSavePart2Links}
                              className="px-3.5 py-1.5 rounded-lg bg-[#6366F1] text-white font-bold text-xs hover:bg-[#4F46E5] transition-colors flex items-center gap-1.5 disabled:opacity-40 self-end sm:self-auto shrink-0"
                            >
                              {savingPart2Links ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <GitFork className="w-3.5 h-3.5" />
                              )}
                              <span>{savingPart2Links ? "Forking Repo..." : "Save Links & Fork Repo"}</span>
                            </button>
                          </div>

                          {/* Forked Host Repository Showcase Card */}
                          {part2ForkedRepoUrl && (
                            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 space-y-1.5 mt-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>Host Account Fork Active</span>
                                </div>
                                <span className="text-[9px] font-mono text-emerald-400/90 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                                  Server README.md Synced
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2 bg-black/40 p-2 rounded border border-emerald-500/20">
                                <div className="truncate text-white font-mono text-[11px]">
                                  {part2ForkedRepoUrl}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(part2ForkedRepoUrl);
                                      setCopiedForkUrl(true);
                                      setTimeout(() => setCopiedForkUrl(false), 2000);
                                    }}
                                    className="p-1 rounded hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                                    title="Copy forked URL"
                                  >
                                    {copiedForkUrl ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <a
                                    href={part2ForkedRepoUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 rounded hover:bg-white/10 text-emerald-400 hover:text-emerald-300 transition-colors"
                                    title="Open Fork in GitHub"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              </div>
                              <p className="text-[10px] text-slate-400">
                                Mirrored repository stored in server&apos;s team <code className="bg-white/5 px-1 rounded text-white">README.md</code> and verified in <code className="bg-white/5 px-1 rounded text-white">MANIFEST.json</code>.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Real-time Dynamic Upload Progress Bar with Speed, ETA, and % */}
                      {uploadProgress && uploadProgress.stage === stage.stage && (
                        <div className="p-4 rounded-xl bg-white/[0.03] border border-[#6366F1]/40 space-y-2.5 font-mono">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white font-bold flex items-center gap-2">
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#818CF8]" />
                              Uploading {stage.name} Archive...
                            </span>
                            <span className="text-[#818CF8] font-bold text-sm">
                              {uploadProgress.percent}%
                            </span>
                          </div>

                          {/* Gradient Animated Progress Bar */}
                          <div className="w-full h-3 rounded-full bg-black/60 overflow-hidden border border-white/10 relative">
                            <div
                              className="h-full bg-gradient-to-r from-[#6366F1] via-[#818CF8] to-emerald-400 rounded-full transition-all duration-200"
                              style={{ width: `${uploadProgress.percent}%` }}
                            />
                          </div>

                          {/* Metrics Grid: Size, Speed, ETA */}
                          <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400 pt-1 border-t border-white/5">
                            <div>
                              <span className="text-slate-500 block">Uploaded / Total:</span>
                              <span className="text-white font-bold">
                                {formatFileSizeMB(uploadProgress.loaded)} / {formatFileSizeMB(uploadProgress.total)}
                              </span>
                            </div>
                            <div className="text-center">
                              <span className="text-slate-500 block">Upload Speed:</span>
                              <span className="text-emerald-400 font-bold">
                                {formatSpeed(uploadProgress.speedBps)}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-slate-500 block">Est. Time Remaining:</span>
                              <span className="text-amber-400 font-bold">
                                {formatEta(uploadProgress.etaSec)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Actions: Upload & View History */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <div>
                          {stage.uploads?.length > 1 && (
                            <button
                              onClick={() =>
                                setExpandedHistory((prev) => ({
                                  ...prev,
                                  [stage.stage]: !prev[stage.stage],
                                }))
                              }
                              className="text-[11px] text-[#818CF8] hover:underline flex items-center gap-1"
                            >
                              <History className="w-3 h-3" />
                              <span>
                                {isExpanded ? "Hide" : "View"} Version History ({stage.uploads.length} versions)
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>

                        {!stage.isLocked && (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full justify-end">
                            {isBlockedByPrior ? (
                              <button
                                type="button"
                                disabled
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-500 font-bold text-xs cursor-not-allowed opacity-60"
                                title={`Upload and submit Phase ${stage.stage - 1} first`}
                              >
                                <Lock className="w-3.5 h-3.5 text-slate-500" />
                                <span>Upload Blocked: Phase {stage.stage - 1} Required First</span>
                              </button>
                            ) : (
                              <>
                                {stage.stage === 2 && (
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      ZIP Code Archive + Running Screenshots (&gt;2GB supported)
                                    </span>
                                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white text-black font-bold text-xs hover:bg-slate-200 transition-colors">
                                      <Upload className="w-3 h-3" />
                                      <span>{latest ? `Re-upload Part 2 ZIP (v${latest.version + 1})` : "Upload Part 2 ZIP (>2GB Supported)"}</span>
                                      <input
                                        type="file"
                                        accept=".zip"
                                        className="hidden"
                                        disabled={uploadingStage === stage.stage}
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleUploadDocument(stage.stage, file);
                                        }}
                                      />
                                    </label>
                                  </div>
                                )}

                                {stage.stage === 3 && (
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[10px] text-slate-400 font-mono mr-1">
                                      ZIP (&gt;2GB: Code + Testcase.pdf)
                                    </span>
                                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white text-black font-bold text-xs hover:bg-slate-200 transition-colors">
                                      <Upload className="w-3 h-3" />
                                      <span>Upload Part 3 ZIP (&gt;2GB Supported)</span>
                                      <input
                                        type="file"
                                        accept=".zip"
                                        className="hidden"
                                        disabled={uploadingStage === stage.stage}
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleUploadDocument(stage.stage, file);
                                        }}
                                      />
                                    </label>
                                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white font-bold text-xs transition-colors">
                                      <Upload className="w-3 h-3" />
                                      <span>Upload Testcase (.pdf)</span>
                                      <input
                                        type="file"
                                        accept=".pdf"
                                        className="hidden"
                                        disabled={uploadingStage === stage.stage}
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleUploadDocument(stage.stage, file);
                                        }}
                                      />
                                    </label>
                                  </div>
                                )}

                                {stage.stage === 4 && (
                                  <div className="flex flex-col gap-2 w-full sm:w-auto">
                                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                                      <span className={`px-2 py-0.5 rounded border flex items-center gap-1 ${hasPart4Code ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-white/5 border-white/10 text-slate-400"}`}>
                                        {hasPart4Code ? <Check className="w-3 h-3" /> : <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                                        Code ZIP: {hasPart4Code ? "Uploaded" : "Required"}
                                      </span>
                                      <span className={`px-2 py-0.5 rounded border flex items-center gap-1 ${hasPart4Doc ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-white/5 border-white/10 text-slate-400"}`}>
                                        {hasPart4Doc ? <Check className="w-3 h-3" /> : <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                                        Doc (.pdf): {hasPart4Doc ? "Uploaded" : "Required"}
                                      </span>
                                      <span className={`px-2 py-0.5 rounded border flex items-center gap-1 ${hasPart4Ppt ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-white/5 border-white/10 text-slate-400"}`}>
                                        {hasPart4Ppt ? <Check className="w-3 h-3" /> : <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                                        PPT (.pptx): {hasPart4Ppt ? "Uploaded" : "Required"}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white text-black font-bold text-xs hover:bg-slate-200 transition-colors">
                                        <Upload className="w-3 h-3" />
                                        <span>Part 4 Code ZIP (&gt;2GB)</span>
                                        <input
                                          type="file"
                                          accept=".zip"
                                          className="hidden"
                                          disabled={uploadingStage === stage.stage}
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleUploadDocument(stage.stage, file);
                                          }}
                                        />
                                      </label>
                                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors">
                                        <Upload className="w-3 h-3" />
                                        <span>Complete Doc (.pdf)</span>
                                        <input
                                          type="file"
                                          accept=".pdf"
                                          className="hidden"
                                          disabled={uploadingStage === stage.stage}
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleUploadDocument(stage.stage, file);
                                          }}
                                        />
                                      </label>
                                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors">
                                        <Upload className="w-3 h-3" />
                                        <span>Complete PPT (.pptx)</span>
                                        <input
                                          type="file"
                                          accept=".pptx,.ppt"
                                          className="hidden"
                                          disabled={uploadingStage === stage.stage}
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleUploadDocument(stage.stage, file);
                                          }}
                                        />
                                      </label>
                                    </div>
                                  </div>
                                )}

                                {stage.stage === 1 && (
                                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white text-black font-bold text-xs hover:bg-slate-200 transition-colors">
                                    <Upload className="w-3 h-3" />
                                    <span>{latest ? `Re-upload as v${latest.version + 1}` : `Upload ${stage.name}`}</span>
                                    <input
                                      type="file"
                                      accept=".pdf,.docx,.doc,.pptx,.ppt,.zip"
                                      className="hidden"
                                      disabled={uploadingStage === stage.stage}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleUploadDocument(stage.stage, file);
                                      }}
                                    />
                                  </label>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Expandable Version History Trace */}
                      {isExpanded && stage.uploads?.length > 1 && (
                        <div className="pt-2 border-t border-white/[0.06] space-y-2">
                          <div className="text-[10px] text-slate-400 uppercase">Prior Version Trace</div>
                          <div className="space-y-1.5">
                            {stage.uploads.slice(1).map((hist: any) => (
                              <div
                                key={hist.id}
                                className="p-2 rounded bg-white/[0.01] border border-white/5 flex items-center justify-between text-[11px]"
                              >
                                <div>
                                  <span className="font-bold text-slate-300">v{hist.version}: </span>
                                  <span className="text-slate-400">{hist.fileName}</span>
                                  <span className="text-slate-500 text-[10px] ml-2">
                                    by {hist.uploaderName}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-500">
                                  {new Date(hist.createdAt).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: TIMELINE TRACE */}
          {activeTab === "timeline" && (
            <div className="p-6 rounded-2xl bg-[#0B0E18] border border-white/[0.08] space-y-6">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                    <History className="w-4 h-4 text-[#6366F1]" />
                    Squad Activity & Trace Timeline
                  </h2>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Unified chronological trace showing every progress update, document upload, and version bump for host and judge review.
                  </p>
                </div>
              </div>

              {progressHistory.length === 0 && !hasUploadedDocs ? (
                <div className="p-8 text-center text-xs font-mono text-slate-500 bg-white/[0.01] rounded-xl border border-dashed border-white/10">
                  No trace logged yet. Updates and uploads will appear here automatically.
                </div>
              ) : (
                <div className="space-y-3 font-mono text-xs">
                  {/* Progress Updates */}
                  {progressHistory.map((p) => (
                    <div
                      key={`prog-${p.id}`}
                      className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/30">
                            Progress {p.percent}%
                          </span>
                          <span className="text-white font-bold">{p.studentName || "Team Member"}</span>
                        </div>
                        <p className="text-slate-300 text-[11px] leading-relaxed">
                          &quot;{p.note}&quot;
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {new Date(p.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}

                  {/* Document Uploads */}
                  {documentStages.flatMap((s) => s.uploads || []).map((u: any) => (
                    <div
                      key={`doc-${u.id}`}
                      className="p-3.5 rounded-xl bg-white/[0.02] border border-emerald-500/20 flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Part {u.stage} v{u.version}
                          </span>
                          <span className="text-white font-bold">{u.fileName}</span>
                          <span className="text-slate-400 text-[10px]">by {u.uploaderName}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2">
                          <span>Status: {u.syncStatus}</span>
                          {u.githubCommitHash && (
                            <span>· Commit: {u.githubCommitHash.slice(0, 8)}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {new Date(u.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: LOCAL CODE WORKSPACE & TEAM FOLDER */}
          {activeTab === "repo" && (
            <div className="p-6 rounded-2xl bg-[#0B0E18] border border-white/[0.08] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/[0.06] pb-3 gap-2">
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                    <Folder className="w-4 h-4 text-emerald-400" />
                    Local Squad Workspace & Code Storage
                  </h2>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    All documents, stage submissions, and unzipped source codes are placed inside your team&apos;s dedicated local folder.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                    LOCAL DISK STORAGE
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-300">
                    ZERO RATE LIMITS
                  </span>
                </div>
              </div>

              {repoMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400 flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{repoMsg}</span>
                </div>
              )}

              {/* Directory Information Card */}
              <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5 space-y-4 font-mono text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                  <div>
                    <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Dedicated Squad Directory</div>
                    <div className="text-white text-sm font-bold flex items-center gap-2 mt-0.5">
                      <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{folderInfo?.folderPath || `${team.hackathon?.title || "Hackathon"} / ${team.name}`}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const p = folderInfo?.absolutePath || folderInfo?.folderPath || "";
                      if (p) {
                        navigator.clipboard.writeText(p);
                        setCopiedPath(true);
                        setTimeout(() => setCopiedPath(false), 2000);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-[11px] flex items-center gap-1.5 self-start sm:self-auto transition-colors"
                  >
                    {copiedPath ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPath ? "Copied Path!" : "Copy Folder Path"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                    <span className="text-slate-500 uppercase text-[9px] block">Total Files</span>
                    <span className="text-white font-bold text-base mt-0.5 block">
                      {folderInfo?.summary?.totalFiles ?? teamFiles.length}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                    <span className="text-slate-500 uppercase text-[9px] block">Unzipped Code Files</span>
                    <span className="text-emerald-400 font-bold text-base mt-0.5 block">
                      {folderInfo?.summary?.codeFiles ?? teamFiles.filter((f) => f.category === "Source Code").length}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                    <span className="text-slate-500 uppercase text-[9px] block">Stage Documents</span>
                    <span className="text-indigo-400 font-bold text-base mt-0.5 block">
                      {folderInfo?.summary?.documentFiles ?? teamFiles.filter((f) => f.category.startsWith("Part ") || f.category.startsWith("Phase ") || f.category === "Final Submit").length}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                    <span className="text-slate-500 uppercase text-[9px] block">Latest Commit Hash</span>
                    <span className="text-amber-400 font-bold text-xs mt-1 block select-all truncate">
                      {repo?.commitHash ? repo.commitHash.slice(0, 10) : "Initialized"}
                    </span>
                  </div>
                </div>

                {folderInfo?.absolutePath && (
                  <div className="text-[10px] text-slate-400 bg-black/40 p-2.5 rounded-lg border border-white/5 flex items-center justify-between overflow-hidden">
                    <span className="text-slate-500 shrink-0 mr-2 font-bold uppercase">Host Location:</span>
                    <span className="truncate text-slate-300 select-all font-mono">{folderInfo.absolutePath}</span>
                  </div>
                )}
              </div>

              {/* Live Files & Unzipped Code Explorer */}
              <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5 space-y-4 font-mono text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-indigo-400" />
                      Files & Source Code Stored in Team Folder
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Submissions and code archives are automatically extracted here.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Filters */}
                    <div className="flex items-center bg-white/5 p-0.5 rounded-lg text-[10px] border border-white/5">
                      <button
                        onClick={() => setFileFilter("all")}
                        className={`px-2 py-1 rounded transition-colors ${fileFilter === "all" ? "bg-white text-black font-bold" : "text-slate-400 hover:text-white"}`}
                      >
                        All ({teamFiles.length})
                      </button>
                      <button
                        onClick={() => setFileFilter("code")}
                        className={`px-2 py-1 rounded transition-colors ${fileFilter === "code" ? "bg-white text-black font-bold" : "text-slate-400 hover:text-white"}`}
                      >
                        Code ({folderInfo?.summary?.codeFiles ?? teamFiles.filter((f) => f.category === "Source Code").length})
                      </button>
                      <button
                        onClick={() => setFileFilter("docs")}
                        className={`px-2 py-1 rounded transition-colors ${fileFilter === "docs" ? "bg-white text-black font-bold" : "text-slate-400 hover:text-white"}`}
                      >
                        Docs ({folderInfo?.summary?.documentFiles ?? teamFiles.filter((f) => f.category.startsWith("Part ") || f.category.startsWith("Phase ") || f.category === "Final Submit").length})
                      </button>
                    </div>

                    <button
                      onClick={fetchTeamFiles}
                      disabled={loadingFiles}
                      title="Refresh file tree"
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingFiles ? "animate-spin text-[#6366F1]" : ""}`} />
                    </button>
                  </div>
                </div>

                {/* File list */}
                {teamFiles.length === 0 ? (
                  <div className="p-8 text-center rounded-xl bg-white/[0.01] border border-dashed border-white/10 space-y-2">
                    <Folder className="w-8 h-8 text-slate-600 mx-auto" />
                    <div className="text-slate-300 font-bold text-xs">No files uploaded yet</div>
                    <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                      Upload your Phase 1–4 submissions or source code .ZIP archive in the Documentation tab. Files will be stored directly into your dedicated OP folder.
                    </p>
                    <button
                      onClick={() => setActiveTab("documents")}
                      className="mt-3 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors inline-flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Go to Documentation Tab
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.04] max-h-96 overflow-y-auto pr-1">
                    {teamFiles
                      .filter((f) => {
                        if (fileFilter === "code") return f.category === "Source Code";
                        if (fileFilter === "docs") return f.category.startsWith("Part ") || f.category.startsWith("Phase ") || f.category === "Final Submit";
                        return true;
                      })
                      .map((f, idx) => (
                        <div
                          key={idx}
                          className="py-2.5 px-3 rounded-lg hover:bg-white/[0.03] flex items-center justify-between gap-3 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {f.category === "Source Code" ? (
                              <Code2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : f.extension === ".zip" ? (
                              <FileArchive className="w-4 h-4 text-amber-400 shrink-0" />
                            ) : (
                              <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <div className="text-white font-bold truncate text-[11px]">{f.relativePath}</div>
                              <div className="text-[9px] text-slate-500 flex items-center gap-2 mt-0.5">
                                <span className={`px-1.5 py-0.2 rounded font-bold ${
                                  f.category === "Source Code"
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : f.category.startsWith("Part ")
                                    ? "bg-indigo-500/10 text-indigo-400"
                                    : "bg-white/5 text-slate-400"
                                }`}>
                                  {f.category}
                                </span>
                                <span>{f.sizeFormatted}</span>
                                <span>·</span>
                                <span>{new Date(f.modifiedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                              </div>
                            </div>
                          </div>

                          <a
                            href={f.downloadUrl}
                            download={f.name}
                            className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-[10px] font-bold flex items-center gap-1 shrink-0 transition-colors"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download</span>
                          </a>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Commit Trigger */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3 font-mono">
                <div className="text-xs font-bold text-white">Record Local Code Commit / Sync</div>
                <input
                  type="text"
                  value={commitMsg}
                  onChange={(e) => setCommitMsg(e.target.value)}
                  placeholder="Commit message..."
                  className="w-full px-3 py-2 text-xs bg-white/[0.03] border border-white/10 rounded-lg text-white focus:outline-none"
                />
                <button
                  onClick={handlePushCommit}
                  disabled={committing || !commitMsg.trim()}
                  className="px-4 py-2 rounded-lg bg-white text-black font-bold text-xs hover:bg-slate-200 transition-colors disabled:opacity-40 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {committing ? "Saving..." : "Record Commit to Folder"}
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: FINAL IMMUTABLE SUBMISSION */}
          {activeTab === "submission" && (
            <div className="p-6 rounded-2xl bg-[#0B0E18] border border-white/[0.08] space-y-6">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight">
                    Final Project Submission
                  </h2>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Final submission is immutable once confirmed; only the host can unlock.
                  </p>
                </div>
                {isSubmissionLocked ? (
                  <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> LOCKED & CONFIRMED
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-white/5 text-slate-400 border border-white/10">
                    PENDING FINAL SUBMISSION
                  </span>
                )}
              </div>

              {subSuccess && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{subSuccess}</span>
                </div>
              )}

              {subError && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-mono text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{subError}</span>
                </div>
              )}

              {/* Submission Form */}
              {isSubmissionLocked ? (
                <div className="p-6 rounded-xl bg-white/[0.02] border border-white/5 space-y-4 font-mono text-xs">
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Project Successfully Submitted
                  </div>
                  {submission?.link && (
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">Live Demo Link</div>
                      <a
                        href={submission.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#6366F1] hover:underline"
                      >
                        {submission.link}
                      </a>
                    </div>
                  )}
                  {submission?.fileUrl && (
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">Application Binary / APK</div>
                      <a
                        href={submission.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#6366F1] hover:underline"
                      >
                        {submission.fileUrl}
                      </a>
                    </div>
                  )}
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Architecture Write-Up</div>
                    <p className="text-slate-300 whitespace-pre-wrap mt-1">
                      {submission?.description}
                    </p>
                  </div>

                  {v5Active && team?.hackathonId && (
                    <div className="mt-8 pt-6 border-t border-white/10">
                      <HackathonLeaderboardCard
                        hackathonId={team.hackathonId}
                        hackathonTitle={team.hackathon?.title}
                      />
                    </div>
                  )}
                </div>
              ) : (
                hasStatement && (
                  <div className="space-y-4 font-mono text-xs">
                    <div className="space-y-1.5">
                      <label className="text-slate-300 block flex items-center justify-between">
                        <span>Source Code / Live Demo URL</span>
                        <span className={`text-[10px] ${hasSubLink ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}`}>
                          {hasSubLink ? "✓ Completed" : "* Required"}
                        </span>
                      </label>
                      <input
                        type="url"
                        value={subLink}
                        onChange={(e) => setSubLink(e.target.value)}
                        placeholder="https://github.com/... or https://demo.hackbridge.in"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-white/30"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-300 block flex items-center justify-between">
                        <span>Application Binary / APK / Release File URL</span>
                        <span className={`text-[10px] ${hasSubBinary ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}`}>
                          {hasSubBinary ? "✓ Completed" : "* Required"}
                        </span>
                      </label>
                      <input
                        type="url"
                        value={subFileUrl}
                        onChange={(e) => setSubFileUrl(e.target.value)}
                        placeholder="https://.../app-release.apk or hosted binary URL"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-white/30"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-300 block flex items-center justify-between">
                        <span>How It Works & Technical Architecture</span>
                        <span className={`text-[10px] ${hasSubDesc ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}`}>
                          {hasSubDesc ? "✓ Completed" : "* Required"}
                        </span>
                      </label>
                      <textarea
                        required
                        value={subDescription}
                        onChange={(e) => setSubDescription(e.target.value)}
                        placeholder="Describe your solution: system design, key features, technical challenges overcome, how to run the project, and how it solves the problem statement..."
                        rows={6}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-white/30 leading-relaxed"
                      />
                    </div>

                    {/* Required Submission Fields Gate (v5.0) */}
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3 font-mono text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white uppercase text-[11px] flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-[#818CF8]" />
                          Required Submission Fields (v5.0 Gate)
                        </span>
                        {allSubmissionFieldsFilled ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            ALL FIELDS COMPLETED
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            MANDATORY FIELDS MISSING
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400">
                        In v5.0, all submission fields must be filled before the team can submit and freeze the project:
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                        <div className={`p-2.5 rounded-lg border flex items-center justify-between ${hasSubLink ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border-red-500/30 text-red-300"}`}>
                          <span className="flex items-center gap-1.5 truncate">
                            {hasSubLink ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                            Source / Demo URL
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/40">
                            {hasSubLink ? "FILLED" : "REQUIRED"}
                          </span>
                        </div>

                        <div className={`p-2.5 rounded-lg border flex items-center justify-between ${hasSubBinary ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border-red-500/30 text-red-300"}`}>
                          <span className="flex items-center gap-1.5 truncate">
                            {hasSubBinary ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                            Binary / APK URL
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/40">
                            {hasSubBinary ? "FILLED" : "REQUIRED"}
                          </span>
                        </div>

                        <div className={`p-2.5 rounded-lg border flex items-center justify-between ${hasSubDesc ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border-red-500/30 text-red-300"}`}>
                          <span className="flex items-center gap-1.5 truncate">
                            {hasSubDesc ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                            Write-Up
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/40">
                            {hasSubDesc ? "FILLED" : "REQUIRED"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Part 4 Deliverables Verification Gate Checklist */}
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3 font-mono text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white uppercase text-[11px] flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-[#818CF8]" />
                          Part 4 Deliverables Verification Gate
                        </span>
                        {isPart4GateSatisfied ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            ALL DELIVERABLES READY
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            INCOMPLETE — SUBMIT LOCKED
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400">
                        Per evaluation protocol, squads must upload all Part 4 deliverables before final submission can be finalized and locked:
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                        <div className={`p-2.5 rounded-lg border flex items-center justify-between ${hasPart4Code ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border-red-500/30 text-red-300"}`}>
                          <span className="flex items-center gap-2">
                            {hasPart4Code ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                            Part 4 Code ZIP Archive (&gt;2GB Supported)
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/40">
                            {hasPart4Code ? "UPLOADED" : "MISSING"}
                          </span>
                        </div>

                        <div className={`p-2.5 rounded-lg border flex items-center justify-between ${hasPart4Doc ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border-red-500/30 text-red-300"}`}>
                          <span className="flex items-center gap-2">
                            {hasPart4Doc ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                            Complete Documentation (.pdf)
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/40">
                            {hasPart4Doc ? "UPLOADED" : "MISSING"}
                          </span>
                        </div>

                        <div className={`p-2.5 rounded-lg border flex items-center justify-between ${hasPart4Ppt ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border-red-500/30 text-red-300"}`}>
                          <span className="flex items-center gap-2">
                            {hasPart4Ppt ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                            Complete PPT (.pptx)
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/40">
                            {hasPart4Ppt ? "UPLOADED" : "MISSING"}
                          </span>
                        </div>

                        <div className={`p-2.5 rounded-lg border flex items-center justify-between ${hasPart4LiveOrRepo ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border-red-500/30 text-red-300"}`}>
                          <span className="flex items-center gap-2">
                            {hasPart4LiveOrRepo ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                            Live URL Link & Forked Repo
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/40">
                            {hasPart4LiveOrRepo ? "REGISTERED" : "MISSING"}
                          </span>
                        </div>
                      </div>

                      {!isPart4GateSatisfied && (
                        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-white/5">
                          <span className="text-[10px] text-amber-400">
                            Upload the missing deliverables in the Documentation tab under Part 4.
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveTab("documents")}
                            className="px-3 py-1 rounded bg-[#6366F1]/20 hover:bg-[#6366F1]/30 text-[#818CF8] hover:text-white border border-[#6366F1]/40 text-[10px] font-bold transition-colors flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                          >
                            <span>Go to Documentation (Part 4)</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setConfirmModal(true)}
                        disabled={!allSubmissionFieldsFilled || !isPart4GateSatisfied || !isLead}
                        className="w-full py-3.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-slate-200 transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        {!allSubmissionFieldsFilled
                          ? "Fill All Required Submission Fields to Finalize"
                          : !isPart4GateSatisfied
                          ? "Complete Part 4 Deliverables to Finalize"
                          : "Lock & Finalize Submission"}
                      </button>
                      {!isLead && (
                        <p className="text-[10px] text-amber-400 text-center mt-2">
                          Only the team lead ({team.leadStudent.user.name}) can finalize the submission.
                        </p>
                      )}
                    </div>
                  </div>
                )
              )}

              {/* Confirmation Modal */}
              {confirmModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-[#0B0E18] border border-white/20 rounded-2xl p-6 max-w-md w-full space-y-4 font-mono text-xs">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
                      <Lock className="w-5 h-5" />
                    </div>

                    <div className="text-center space-y-1">
                      <h3 className="text-sm font-bold text-white">Confirm Final Submission Locking</h3>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        After confirmation, your submission is permanently frozen. The form and uploads lock instantly, and can only be unlocked by explicit host authorization.
                      </p>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => setConfirmModal(false)}
                        className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleFinalSubmit}
                        disabled={submittingFinal}
                        className="flex-1 py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-slate-200 transition-colors"
                      >
                        {submittingFinal ? "Locking..." : "Confirm & Freeze"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 8: LEADERBOARD (v5.0) */}
          {v5Active && activeTab === "leaderboard" && (
            <div className="space-y-6">
              <HackathonLeaderboardCard
                hackathonId={team?.hackathonId}
                hackathonTitle={team?.hackathon?.title}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
