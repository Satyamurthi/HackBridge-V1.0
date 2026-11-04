import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { pushDocumentToGitHub, sanitizeFolderName, OP_BASE_STORAGE_DIR } from "@/lib/github-push";
import { forkGitHubRepository, updateTeamReadmeAndManifest } from "@/lib/github-fork";

export const dynamic = "force-dynamic";

// Allowed MIME types & extensions per PRD / PDF specification: PDF, DOCX, PPTX, ZIP
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "application/zip",
  "application/x-zip-compressed",
  "application/octet-stream",
];

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".doc", ".pptx", ".ppt", ".zip"];

const MAX_DEFAULT_FILE_SIZE = 25 * 1024 * 1024; // 25 MB default
const LARGE_FILE_STAGES = [2, 3, 4];
const MAX_LARGE_STAGE_FILE_SIZE = 3 * 1024 * 1024 * 1024; // 3 GB for Part 2, Part 3, and Part 4 Code Archives

// GET /api/v1/teams/[teamId]/documents — Fetch document stages and history trace
export async function GET(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { teamId } = params;

    const team = await prisma.team.findFirst({
      where: {
        OR: [{ id: teamId }, { teamId }],
      },
      include: {
        members: { include: { student: true } },
        hackathon: true,
        codeRepo: true,
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const isMember = team.members.some((m) => m.student.userId === session.userId);
    const isHost = session.role === "HOST";
    const isJudge = session.role === "JUDGE";
    const isAdmin = session.role === "SUPER_ADMIN";

    if (!isMember && !isHost && !isJudge && !isAdmin) {
      return NextResponse.json(
        { error: "Access denied. Teams cannot inspect other squads' uploads." },
        { status: 403 }
      );
    }

    const allUploads = await prisma.documentUpload.findMany({
      where: { teamId: team.id },
      orderBy: { createdAt: "desc" },
    });

    // Inspect physical storage in OP and local workspace to ensure complete data retrieval
    try {
      const safeHackathon = sanitizeFolderName(team.hackathon?.title || "Hackathon");
      const safeTeam = sanitizeFolderName(team.name || team.teamId || team.id);
      const opTeamDir = path.join(OP_BASE_STORAGE_DIR, safeTeam);
      const localTeamDir = path.join(process.cwd(), safeHackathon, safeTeam);

      const existingMap = new Set(allUploads.map((u) => `${u.stage}_${u.fileName}`));

      for (const stageNum of [1, 2, 3, 4]) {
        const dirsToCheck = [
          path.join(opTeamDir, `Phase ${stageNum}`),
          path.join(localTeamDir, `Part_${stageNum}`),
        ];

        for (const dir of dirsToCheck) {
          if (!fs.existsSync(dir)) continue;
          const diskFiles = fs.readdirSync(dir).filter(
            (f) => !f.startsWith(".") && fs.statSync(path.join(dir, f)).isFile()
          );

          for (const f of diskFiles) {
            const key = `${stageNum}_${f}`;
            if (!existingMap.has(key)) {
              existingMap.add(key);
              const stat = fs.statSync(path.join(dir, f));
              const ext = path.extname(f);
              allUploads.push({
                id: `disk-${stageNum}-${encodeURIComponent(f)}`,
                teamId: team.id,
                stage: stageNum,
                version: 1,
                fileName: f,
                fileSize: stat.size,
                fileType: ext.replace(".", "").toUpperCase(),
                fileUrl: `/api/v1/teams/${team.id}/files?download=Part_${stageNum}/${encodeURIComponent(f)}`,
                uploaderId: team.members[0]?.student?.userId || "uploader",
                uploaderName: team.name ? `${team.name} Member` : "Squad Member",
                syncStatus: "Synced",
                syncError: null,
                githubCommitHash: null,
                githubRepoUrl: team.codeRepo?.githubRepoUrl || null,
                githubPath: `${safeHackathon}/${safeTeam}/Part_${stageNum}/${f}`,
                createdAt: stat.mtime,
                updatedAt: stat.mtime,
              } as any);
            }
          }
        }
      }
    } catch {}

    const now = new Date();
    const isHackathonEnded = new Date(team.hackathon.endAt) < now;

    const stageDueDates: Record<number, Date | null> = {
      1: team.hackathon.part1Due,
      2: team.hackathon.part2Due,
      3: team.hackathon.part3Due,
      4: team.hackathon.part4Due,
    };

    const hasStage1Upload = allUploads.some((u) => u.stage === 1);
    const hasStage2Upload = allUploads.some((u) => u.stage === 2);
    const hasStage3Upload = allUploads.some((u) => u.stage === 3);

    // Build 4 stages structure (Part 1, Part 2, Part 3, Part 4)
    const stages = [1, 2, 3, 4].map((stageNum) => {
      const stageUploads = allUploads
        .filter((u) => u.stage === stageNum)
        .sort((a, b) => b.version - a.version);

      const latest = stageUploads[0] || null;
      const dueDate = stageDueDates[stageNum];
      const isPastDue = dueDate ? new Date(dueDate) < now : false;

      const isBlockedByPriorStage =
        (stageNum === 2 && !hasStage1Upload) ||
        (stageNum === 3 && !hasStage2Upload) ||
        (stageNum === 4 && !hasStage3Upload);

      return {
        stage: stageNum,
        name: `Part ${stageNum}`,
        description:
          stageNum === 1
            ? "Problem Understanding & Architecture"
            : stageNum === 2
            ? "Implementation & Prototype Specs"
            : stageNum === 3
            ? "Validation, Testing & Performance"
            : "Final Deliverable & Presentation",
        dueDate: dueDate ? dueDate.toISOString() : null,
        isLocked: isHackathonEnded || isPastDue,
        isBlockedByPriorStage,
        requiredPriorStage: stageNum > 1 ? stageNum - 1 : null,
        latestUpload: latest,
        uploads: stageUploads,
        versionHistory: stageUploads,
        totalVersions: stageUploads.length,
      };
    });

    const stageLinks = {
      githubRepoUrl: team.codeRepo?.githubRepoUrl || null,
      forkedRepoUrl: team.codeRepo?.forkedRepoUrl || null,
      liveUrl: team.codeRepo?.liveUrl || null,
    };

    [1, 2, 3].forEach((idx) => {
      if (stages[idx]) {
        Object.assign(stages[idx], stageLinks);
      }
    });

    return NextResponse.json({
      teamId: team.id,
      officialTeamId: team.teamId,
      stages,
      timeline: allUploads,
      codeRepoUrl: team.codeRepo?.githubRepoUrl || null,
      forkedRepoUrl: team.codeRepo?.forkedRepoUrl || null,
      liveUrl: team.codeRepo?.liveUrl || null,
      githubRepoUrl: team.codeRepo?.githubRepoUrl || null,
      codeRepo: team.codeRepo
        ? {
            githubRepoUrl: team.codeRepo.githubRepoUrl,
            forkedRepoUrl: team.codeRepo.forkedRepoUrl,
            liveUrl: team.codeRepo.liveUrl,
            lastPushAt: team.codeRepo.lastPushAt,
            commitHash: team.codeRepo.commitHash,
          }
        : null,
    });
  } catch (error: any) {
    console.error("[Documents GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch document stages" }, { status: 500 });
  }
}

// POST /api/v1/teams/[teamId]/documents — Upload a stage document (creates new version, auto GitHub commit)
export async function POST(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "STUDENT") {
      return NextResponse.json({ error: "Student authentication required" }, { status: 401 });
    }

    const { teamId } = params;
    const contentType = req.headers.get("content-type") || "";

    let stage: any;
    let fileName: string = "";
    let fileSize: number = 0;
    let fileType: string = "";
    let mockFailure: boolean = false;
    let liveUrl: string | undefined;
    let githubRepoUrl: string | undefined;
    let fileBuffer: Buffer | undefined;
    let enforceSequentialPhases: boolean = false;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      stage = formData.get("stage");
      liveUrl = (formData.get("liveUrl") as string) || undefined;
      githubRepoUrl = (formData.get("githubRepoUrl") as string) || undefined;
      mockFailure = formData.get("mockFailure") === "true";
      enforceSequentialPhases =
        formData.get("enforceSequentialPhases") === "true" ||
        formData.get("v5SequentialGate") === "true";

      if (file) {
        fileName = file.name;
        fileSize = file.size;
        fileType = file.type;
        const arrayBuf = await file.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuf);
      }
    } else {
      const body = await req.json().catch(() => ({}));
      stage = body.stage;
      fileName = body.fileName;
      fileSize = body.fileSize;
      fileType = body.fileType;
      mockFailure = body.mockFailure;
      liveUrl = body.liveUrl;
      githubRepoUrl = body.githubRepoUrl;
      enforceSequentialPhases =
        body.enforceSequentialPhases === true || body.v5SequentialGate === true;

      if (body.fileData && typeof body.fileData === "string") {
        const base64Part = body.fileData.includes(",") ? body.fileData.split(",")[1] : body.fileData;
        try {
          fileBuffer = Buffer.from(base64Part, "base64");
        } catch {}
      }
    }

    const numStage = Number(stage);
    if (![1, 2, 3, 4].includes(numStage)) {
      return NextResponse.json(
        { error: "Invalid documentation stage. Must be Part 1, 2, 3, or 4." },
        { status: 400 }
      );
    }

    if (!fileName || typeof fileName !== "string" || !fileName.trim()) {
      return NextResponse.json({ error: "File name is required" }, { status: 400 });
    }

    // Extension & MIME validation
    const ext = "." + fileName.split(".").pop()?.toLowerCase();
    const isValidExt = ALLOWED_EXTENSIONS.includes(ext);
    const isValidMime = fileType ? ALLOWED_MIME_TYPES.includes(fileType.toLowerCase()) : isValidExt;

    if (!isValidExt || !isValidMime) {
      return NextResponse.json(
        {
          error: `Invalid file type "${ext}". Only PDF, DOCX, PPTX, and ZIP documents are permitted.`,
        },
        { status: 400 }
      );
    }

    const numSize = Number(fileSize) || 0;
    if (numSize <= 0) {
      return NextResponse.json({ error: "Cannot upload empty file" }, { status: 400 });
    }
    const isLargeStage = LARGE_FILE_STAGES.includes(numStage);
    const maxAllowedSize = isLargeStage ? MAX_LARGE_STAGE_FILE_SIZE : MAX_DEFAULT_FILE_SIZE;
    if (numSize > maxAllowedSize) {
      return NextResponse.json(
        {
          error: isLargeStage
            ? `File size exceeds the 3GB maximum limit for Part ${numStage} code archives.`
            : "File size exceeds the 25MB maximum limit.",
        },
        { status: 400 }
      );
    }

    const team = await prisma.team.findFirst({
      where: {
        OR: [{ id: teamId }, { teamId }],
      },
      include: {
        members: { include: { student: true } },
        hackathon: true,
        submission: true,
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const isMember = team.members.some((m) => m.student.userId === session.userId);
    if (!isMember) {
      return NextResponse.json(
        { error: "Only active members of this squad can upload stage documentation." },
        { status: 403 }
      );
    }

    // Require problem statement to be chosen or auto-linked from domain
    if (!team.problemStatementId) {
      if (team.domainId) {
        const defaultPs = await prisma.problemStatement.findFirst({
          where: { domainId: team.domainId },
          orderBy: { createdAt: "asc" },
        });
        if (defaultPs) {
          await prisma.team.update({
            where: { id: team.id },
            data: { problemStatementId: defaultPs.id },
          });
          team.problemStatementId = defaultPs.id;
        }
      }

      if (!team.problemStatementId) {
        return NextResponse.json(
          { error: "Problem statement must be chosen before uploading stage documentation." },
          { status: 400 }
        );
      }
    }

    // Enforce sequential phase upload dependency in V5.0
    const shouldEnforceSequential = Boolean(
      enforceSequentialPhases ||
      req.headers.get("x-v5-gate") === "true" ||
      req.headers.get("x-sequential-gate") === "true"
    );

    if (shouldEnforceSequential) {
      if (numStage === 2) {
        const stage1Uploads = await prisma.documentUpload.count({
          where: { teamId: team.id, stage: 1 },
        });
        if (stage1Uploads === 0) {
          return NextResponse.json(
            {
              error: "Phase 1 must be uploaded and submitted before Phase 2 can be unlocked for upload.",
              lockedByPriorStage: 1,
            },
            { status: 400 }
          );
        }
      } else if (numStage === 3) {
        const stage2Uploads = await prisma.documentUpload.count({
          where: { teamId: team.id, stage: 2 },
        });
        if (stage2Uploads === 0) {
          return NextResponse.json(
            {
              error: "Phase 2 must be uploaded and submitted before Phase 3 can be unlocked for upload.",
              lockedByPriorStage: 2,
            },
            { status: 400 }
          );
        }
      } else if (numStage === 4) {
        const stage3Uploads = await prisma.documentUpload.count({
          where: { teamId: team.id, stage: 3 },
        });
        if (stage3Uploads === 0) {
          return NextResponse.json(
            {
              error: "Phase 3 must be uploaded and submitted before Phase 4 can be unlocked for upload.",
              lockedByPriorStage: 3,
            },
            { status: 400 }
          );
        }
      }
    }

    // Enforce lock times
    const now = new Date();
    if (new Date(team.hackathon.endAt) < now) {
      return NextResponse.json(
        { error: "Hackathon has concluded. Stage uploads are permanently locked." },
        { status: 400 }
      );
    }

    if (team.submission?.locked) {
      return NextResponse.json(
        { error: "Final submission is locked. Further documentation uploads are disallowed." },
        { status: 400 }
      );
    }

    const stageDueDates: Record<number, Date | null> = {
      1: team.hackathon.part1Due,
      2: team.hackathon.part2Due,
      3: team.hackathon.part3Due,
      4: team.hackathon.part4Due,
    };

    const stageDueDate = stageDueDates[numStage];
    if (stageDueDate && new Date(stageDueDate) < now) {
      return NextResponse.json(
        {
          error: `Upload deadline for Part ${numStage} has expired (${new Date(
            stageDueDate
          ).toLocaleString()}).`,
        },
        { status: 400 }
      );
    }

    // Versioning: find current highest version for this stage
    const highestStageUpload = await prisma.documentUpload.findFirst({
      where: {
        teamId: team.id,
        stage: numStage,
      },
      orderBy: { version: "desc" },
    });

    const nextVersion = (highestStageUpload?.version || 0) + 1;

    // Get uploader student name
    const uploaderMember = team.members.find((m) => m.student.userId === session.userId);
    const uploaderName = session.name || `Student [${uploaderMember?.student.hackathonId || "Lead"}]`;

    // fileBuffer was already extracted above from multipart formData or JSON body


    // Process local hackathon/team folder storage (including unzipping code archives into team folder)
    const githubResult = await pushDocumentToGitHub({
      hackathonSlug: team.hackathon.slug,
      hackathonTitle: team.hackathon.title,
      teamId: team.teamId || team.id,
      teamName: team.name,
      stage: numStage,
      version: nextVersion,
      fileName: fileName.trim(),
      fileBuffer,
      uploaderName,
      mockFailure: Boolean(mockFailure),
    });

    // Create document upload record in database
    const documentUpload = await prisma.documentUpload.create({
      data: {
        teamId: team.id,
        stage: numStage,
        version: nextVersion,
        fileName: fileName.trim(),
        fileSize: numSize,
        fileType: ext.replace(".", "").toUpperCase(),
        fileUrl: `/api/v1/teams/${team.id}/files?download=Part_${numStage}/${encodeURIComponent(fileName.trim())}`,
        uploaderId: session.userId,
        uploaderName,
        syncStatus: githubResult.status,
        syncError: githubResult.error || null,
        githubCommitHash: githubResult.commitHash || null,
        githubRepoUrl: githubResult.repoUrl,
        githubPath: githubResult.filePath,
      },
    });

    // Fork student GitHub repo and update README.md / MANIFEST.json if provided
    let forkedRepoUrl: string | null = null;
    let forkResult: any = null;

    if (githubRepoUrl && typeof githubRepoUrl === "string" && githubRepoUrl.trim()) {
      forkResult = await forkGitHubRepository(githubRepoUrl.trim());
      forkedRepoUrl = forkResult.forkedRepoUrl;

      // Update team README.md and MANIFEST.json on both local server and OP storage
      updateTeamReadmeAndManifest({
        hackathonTitle: team.hackathon.title,
        teamName: team.name,
        teamId: team.teamId || team.id,
        githubRepoUrl: githubRepoUrl.trim(),
        forkedRepoUrl,
        liveUrl: liveUrl && typeof liveUrl === "string" ? liveUrl.trim() : undefined,
        forkStatus: forkResult.forkStatus,
      });
    }

    // Update codeRepo in database with local filesystem storage path and repository links
    try {
      await prisma.codeRepo.upsert({
        where: { teamId: team.id },
        update: {
          githubRepoUrl: githubRepoUrl?.trim() || githubResult.repoUrl,
          forkedRepoUrl: forkedRepoUrl || undefined,
          liveUrl: liveUrl && typeof liveUrl === "string" ? liveUrl.trim() : undefined,
          storagePath: githubResult.localDir || undefined,
          lastPushAt: new Date(),
          commitHash: githubResult.commitHash || undefined,
        },
        create: {
          teamId: team.id,
          githubRepoUrl: githubRepoUrl?.trim() || githubResult.repoUrl,
          forkedRepoUrl: forkedRepoUrl || null,
          liveUrl: liveUrl && typeof liveUrl === "string" ? liveUrl.trim() : null,
          storagePath: githubResult.localDir || `/repos/${team.teamId || team.id}`,
          commitHash: githubResult.commitHash || undefined,
          lastPushAt: new Date(),
        },
      });
    } catch (codeRepoErr: any) {
      console.warn("[CodeRepo update warning]:", codeRepoErr?.message);
    }

    await writeAuditLog(session.userId, "DOCUMENT_UPLOADED", "team", team.id, {
      teamName: team.name,
      teamId: team.teamId,
      stage: numStage,
      version: nextVersion,
      fileName,
      syncStatus: githubResult.status,
      githubRepoUrl: githubRepoUrl?.trim() || null,
      forkedRepoUrl,
      liveUrl: liveUrl?.trim() || null,
    });

    // Send notification to team members
    try {
      for (const member of team.members) {
        await prisma.notification.create({
          data: {
            userId: member.student.userId,
            type: githubResult.status === "Synced" ? "DOCUMENT_SYNCED" : "DOCUMENT_SYNC_FAILED",
            payload: JSON.stringify({
              title: `Part ${numStage} v${nextVersion} Uploaded`,
              message:
                githubResult.status === "Synced"
                  ? `${uploaderName} uploaded ${fileName}. Synced to GitHub repository.`
                  : `${uploaderName} uploaded ${fileName}. GitHub sync queued for retry.`,
              teamId: team.id,
              stage: numStage,
              version: nextVersion,
              commitHash: githubResult.commitHash,
            }),
          },
        });
      }
    } catch {}

    return NextResponse.json(
      {
        success: true,
        upload: documentUpload,
        documentUpload,
        forkedRepoUrl,
        liveUrl: liveUrl?.trim() || null,
        githubRepoUrl: githubRepoUrl?.trim() || null,
        forkResult,
        message: `Part ${numStage} v${nextVersion} uploaded successfully! ${
          githubResult.status === "Synced"
            ? "Committed to GitHub."
            : "Saved locally; GitHub sync queued for retry."
        }${forkedRepoUrl ? ` Fork registered at ${forkedRepoUrl}.` : ""}`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Document Upload POST Error]:", error);
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
  }
}

// PATCH /api/v1/teams/[teamId]/documents — Update Live URL and/or GitHub Repo URL (triggers fork & updates README.md)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { teamId } = params;
    const body = await req.json().catch(() => ({}));
    const { liveUrl, githubRepoUrl } = body;

    const team = await prisma.team.findFirst({
      where: {
        OR: [{ id: teamId }, { teamId }],
      },
      include: {
        members: { include: { student: true } },
        hackathon: true,
        codeRepo: true,
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const isMember = team.members.some((m) => m.student.userId === session.userId);
    const isHost = session.role === "HOST";
    const isAdmin = session.role === "SUPER_ADMIN";

    if (!isMember && !isHost && !isAdmin) {
      return NextResponse.json(
        { error: "Access denied. Only squad members or event hosts can update repository links." },
        { status: 403 }
      );
    }

    const trimmedLiveUrl = typeof liveUrl === "string" ? liveUrl.trim() : undefined;
    const trimmedGithubUrl = typeof githubRepoUrl === "string" ? githubRepoUrl.trim() : undefined;

    let forkResult: any = null;
    let targetForkUrl = team.codeRepo?.forkedRepoUrl || null;

    if (trimmedGithubUrl) {
      forkResult = await forkGitHubRepository(trimmedGithubUrl);
      targetForkUrl = forkResult.forkedRepoUrl;
    }

    const updatedCodeRepo = await prisma.codeRepo.upsert({
      where: { teamId: team.id },
      update: {
        githubRepoUrl: trimmedGithubUrl !== undefined ? trimmedGithubUrl : undefined,
        forkedRepoUrl: targetForkUrl || undefined,
        liveUrl: trimmedLiveUrl !== undefined ? trimmedLiveUrl : undefined,
        lastPushAt: new Date(),
      },
      create: {
        teamId: team.id,
        githubRepoUrl: trimmedGithubUrl || `https://github.com/hackbridge-dev/${team.teamId || team.id}`,
        forkedRepoUrl: targetForkUrl,
        liveUrl: trimmedLiveUrl || null,
        storagePath: `/repos/${team.teamId || team.id}`,
        lastPushAt: new Date(),
      },
    });

    // Update README.md and MANIFEST.json on both local server and OP storage
    updateTeamReadmeAndManifest({
      hackathonTitle: team.hackathon.title,
      teamName: team.name,
      teamId: team.teamId || team.id,
      githubRepoUrl: updatedCodeRepo.githubRepoUrl,
      forkedRepoUrl: updatedCodeRepo.forkedRepoUrl,
      liveUrl: updatedCodeRepo.liveUrl,
      forkStatus: forkResult ? forkResult.forkStatus : "Existing Fork",
    });

    await writeAuditLog(session.userId, "REPOSITORY_LINKS_UPDATED", "team", team.id, {
      teamName: team.name,
      teamId: team.teamId,
      liveUrl: updatedCodeRepo.liveUrl,
      githubRepoUrl: updatedCodeRepo.githubRepoUrl,
      forkedRepoUrl: updatedCodeRepo.forkedRepoUrl,
    });

    return NextResponse.json({
      success: true,
      message: `Repository and live demo links updated successfully!${
        targetForkUrl ? ` Fork registered at ${targetForkUrl}` : ""
      }`,
      codeRepo: updatedCodeRepo,
      liveUrl: updatedCodeRepo.liveUrl,
      githubRepoUrl: updatedCodeRepo.githubRepoUrl,
      forkedRepoUrl: updatedCodeRepo.forkedRepoUrl,
      forkResult,
    });
  } catch (error: any) {
    console.error("[Documents PATCH Error]:", error);
    return NextResponse.json({ error: "Failed to update repository links" }, { status: 500 });
  }
}

