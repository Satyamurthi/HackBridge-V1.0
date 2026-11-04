import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sanitizeFolderName, OP_BASE_STORAGE_DIR } from "@/lib/github-push";

export const dynamic = "force-dynamic";

// GET /api/v1/judge/submissions — Teams and submissions assigned to the authenticated approved judge
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "JUDGE" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Judge authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedHackathonId = searchParams.get("hackathonId");

    // Fetch judge profile for this hackathon
    const judgeProfiles = await prisma.judgeProfile.findMany({
      where: {
        userId: session.userId,
        ...(requestedHackathonId ? { hackathonId: requestedHackathonId } : {}),
      },
      include: {
        hackathon: {
          include: {
            rubricCriteria: true,
          },
        },
      },
    });

    if (judgeProfiles.length === 0 && session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "No hackathon track assignments found for this judge account" },
        { status: 404 }
      );
    }

    const activeProfile = judgeProfiles[0];

    // PRD Rule 5: Host and judge accounts cannot act until approved
    if (activeProfile && activeProfile.approvalStatus !== "APPROVED" && session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        {
          error: "Your judge credentials are waiting for admin approval. Contact 9380968402 Or Admin to activate your evaluation access.",
          approvalStatus: activeProfile.approvalStatus,
        },
        { status: 403 }
      );
    }

    const hackathonId = activeProfile?.hackathonId || requestedHackathonId;
    if (!hackathonId) {
      return NextResponse.json({ error: "hackathonId is required" }, { status: 400 });
    }

    // Fetch rubric criteria
    const criteria = await prisma.rubricCriterion.findMany({
      where: { hackathonId },
      orderBy: { createdAt: "asc" },
    });

    // Fetch all registered teams for this hackathon (evaluates full cohort, Phase 1 to Phase 4)
    const teams = await prisma.team.findMany({
      where: {
        hackathonId,
      },
      include: {
        domain: true,
        problemStatement: {
          include: {
            domain: true,
          },
        },
        codeRepo: true,
        leadStudent: {
          include: {
            user: { select: { name: true, email: true, phone: true } },
          },
        },
        members: {
          include: {
            student: {
              include: {
                user: { select: { name: true, email: true } },
              },
            },
          },
        },
        documentUploads: {
          orderBy: { createdAt: "desc" },
        },
        progressUpdates: {
          orderBy: { createdAt: "desc" },
        },
        submission: {
          include: {
            scores: {
              where: activeProfile ? { judgeId: activeProfile.id } : {},
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Filter teams to the judge's assigned domain if one was specified by the host
    const assignedDomain = (activeProfile?.domain || "").trim();
    const hasDomainRestriction = Boolean(
      assignedDomain &&
      assignedDomain.toLowerCase() !== "all" &&
      assignedDomain.toLowerCase() !== "all / general tracks"
    );

    const eligibleTeams = hasDomainRestriction
      ? teams.filter((team) => {
          const target = assignedDomain.toLowerCase();
          const tDomain = (team.domain?.name || "").trim().toLowerCase();
          const tDomainId = (team.domainId || "").trim().toLowerCase();
          const psDomain = (team.problemStatement?.domain?.name || "").trim().toLowerCase();
          return (
            tDomain === target ||
            tDomainId === target ||
            psDomain === target ||
            tDomain.includes(target) ||
            target.includes(tDomain)
          );
        })
      : teams;

    // Map each team with Phase 1..Phase 4 structured document slots and OP disk inspection
    const teamItems = eligibleTeams.map((team) => {
      // Group uploads by stage: 1, 2, 3, 4
      const phaseUploads: Record<number, any[]> = { 1: [], 2: [], 3: [], 4: [] };
      for (const u of team.documentUploads) {
        if (phaseUploads[u.stage]) {
          phaseUploads[u.stage].push(u);
        }
      }

      // Check physical OP folder for uploaded files
      const safeTeam = sanitizeFolderName(team.name);
      const opDir = path.join(OP_BASE_STORAGE_DIR, safeTeam);
      const fsPhases: Record<number, any[]> = { 1: [], 2: [], 3: [], 4: [] };
      let fsFinalSubmit: any[] = [];

      try {
        if (fs.existsSync(opDir)) {
          for (let st = 1; st <= 4; st++) {
            const pDir = path.join(opDir, `Phase ${st}`);
            if (fs.existsSync(pDir)) {
              const files = fs.readdirSync(pDir).filter((f) => !f.startsWith("."));
              for (const f of files) {
                const fPath = path.join(pDir, f);
                const stat = fs.statSync(fPath);
                fsPhases[st].push({
                  fileName: f,
                  fileSize: stat.size,
                  fileUrl: `/api/v1/teams/${team.id}/files?download=Phase%20${st}/${encodeURIComponent(f)}`,
                  uploadedAt: stat.mtime.toISOString(),
                });
              }
            }
          }
          const fsDir = path.join(opDir, "Final Submit");
          if (fs.existsSync(fsDir)) {
            const files = fs.readdirSync(fsDir).filter((f) => !f.startsWith("."));
            for (const f of files) {
              const fPath = path.join(fsDir, f);
              const stat = fs.statSync(fPath);
              fsFinalSubmit.push({
                fileName: f,
                fileSize: stat.size,
                fileUrl: `/api/v1/teams/${team.id}/files?download=Final%20Submit/${encodeURIComponent(f)}`,
                uploadedAt: stat.mtime.toISOString(),
              });
            }
          }
        }
      } catch {}

      // Build structured Phase 1 through Phase 4 slots
      const phases = [1, 2, 3, 4].map((stageNum) => {
        const dbList = phaseUploads[stageNum] || [];
        const fsList = fsPhases[stageNum] || [];
        const latestDb = dbList[0] || null;
        const latestFs = fsList[0] || null;

        const hasUpload = Boolean(latestDb || latestFs);
        const fileName = latestDb?.fileName || latestFs?.fileName || null;
        const fileSize = latestDb?.fileSize || latestFs?.fileSize || 0;
        const fileUrl =
          latestDb?.fileUrl ||
          (fileName
            ? `/api/v1/teams/${team.id}/files?download=Phase%20${stageNum}/${encodeURIComponent(fileName)}`
            : null);
        const ext = fileName ? "." + fileName.split(".").pop()?.toLowerCase() : null;
        const fileType = latestDb?.fileType || (ext ? ext.replace(".", "").toUpperCase() : null);
        const version = latestDb?.version || (hasUpload ? 1 : 0);
        const uploaderName = latestDb?.uploaderName || "Squad Participant";
        const uploadedAt = latestDb?.createdAt ? new Date(latestDb.createdAt).toISOString() : latestFs?.uploadedAt || null;

        return {
          stage: stageNum,
          name: `Phase ${stageNum}`,
          title:
            stageNum === 1
              ? "Problem Understanding & Ideation"
              : stageNum === 2
              ? "Technical Architecture & System Design"
              : stageNum === 3
              ? "Implementation, Prototype & PoC"
              : "Innovation, Presentation & Final Deliverable",
          hasUpload,
          latestUpload: hasUpload
            ? {
                fileName,
                fileSize,
                fileType,
                fileUrl,
                version,
                uploaderName,
                createdAt: uploadedAt,
              }
            : null,
          allUploads: dbList,
        };
      });

      const scores = team.submission?.scores || [];
      const isDraftSaved = scores.some((s) => s.isDraft);
      const isFinalCertified = scores.length >= criteria.length && scores.length > 0 && !isDraftSaved;
      const isScored = scores.length > 0;
      const progressPercent =
        team.progressUpdates[0]?.combinedPercent ?? team.progressUpdates[0]?.percent ?? 0;

      return {
        id: team.submission?.id || team.id,
        teamId: team.id,
        submissionId: team.submission?.id || null,
        description:
          team.submission?.description || `Live Hackathon Workspace for Squad ${team.name}`,
        submittedAt: team.submission?.submittedAt?.toISOString() || team.createdAt.toISOString(),
        locked: team.submission?.locked ?? false,
        link: team.submission?.link || null,
        fileUrl: team.submission?.fileUrl || null,
        team: {
          id: team.id,
          teamId: team.teamId,
          name: team.name,
          status: team.status,
          college: team.leadStudent?.college || "Participating College",
          domain: team.domain,
          problemStatement: team.problemStatement,
          codeRepo: team.codeRepo,
          leadStudent: team.leadStudent,
          members: team.members,
          progressPercent,
          lastProgressUpdate: team.progressUpdates[0]?.createdAt || null,
        },
        phases,
        scores,
        isScored,
        isDraftSaved,
        isFinalCertified,
      };
    });

    // Fetch all assigned hackathons for this judge account to support multi-track switching
    const allJudgeProfiles = await prisma.judgeProfile.findMany({
      where: { userId: session.userId },
      include: {
        hackathon: {
          include: {
            host: { select: { orgName: true, type: true } },
            _count: { select: { teams: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const assignedHackathons = allJudgeProfiles.map((jp) => ({
      id: jp.hackathon.id,
      title: jp.hackathon.title,
      slug: jp.hackathon.slug,
      hostName: jp.hackathon.host?.orgName || "Hackathon Organizer",
      hostType: jp.hackathon.host?.type || "college",
      domain: jp.domain || "All / General Tracks",
      approvalStatus: jp.approvalStatus,
      startAt: jp.hackathon.startAt,
      endAt: jp.hackathon.endAt,
      status: jp.hackathon.status,
      teamCount: jp.hackathon._count?.teams || 0,
      isCurrent: jp.hackathon.id === hackathonId,
    }));

    return NextResponse.json({
      hackathon: activeProfile?.hackathon,
      approvalStatus: activeProfile?.approvalStatus || "APPROVED",
      judgeId: activeProfile?.id,
      assignedDomain: hasDomainRestriction ? assignedDomain : null,
      judgeProfile: {
        id: activeProfile?.id,
        designation: activeProfile?.designation || "Jury Evaluator",
        company: activeProfile?.company || "Evaluation Committee",
        domain: activeProfile?.domain || null,
        approvalStatus: activeProfile?.approvalStatus || "APPROVED",
      },
      assignedHackathons,
      criteria,
      submissions: teamItems,
      rubricPolicy: "SINGLE_UNIFIED_ALL_PHASES",
      rubricMode: "SINGLE_UNIFIED",
      phasesEvaluated: [1, 2, 3, 4],
      version: "5.0.0",
    });
  } catch (error: any) {
    console.error("[Judge Submissions Error]:", error);
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
  }
}
