import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createBulkNotifications } from "@/lib/notifications";
import { sanitizeFolderName, OP_BASE_STORAGE_DIR } from "@/lib/github-push";

export const dynamic = "force-dynamic";

// GET /api/v1/teams/[teamId]/submission — Fetch team submission
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
        submission: true,
        members: { include: { student: true } },
        hackathon: true,
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const isMember = team.members.some((m) => m.student.userId === session.userId);
    const isHostOrAdmin = ["HOST", "SUPER_ADMIN", "JUDGE"].includes(session.role);

    if (!isMember && !isHostOrAdmin) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ submission: team.submission });
  } catch (error: any) {
    console.error("[Submission GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch submission" }, { status: 500 });
  }
}

// POST /api/v1/teams/[teamId]/submission — One-time immutable final submission (PRD Rule 7)
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
    const body = await req.json();
    const { link, fileUrl, description } = body;

    if (!description?.trim()) {
      return NextResponse.json(
        { error: "A detailed description of the project and how it works is required" },
        { status: 400 }
      );
    }

    const team = await prisma.team.findFirst({
      where: {
        OR: [{ id: teamId }, { teamId }],
      },
      include: {
        leadStudent: true,
        submission: true,
        hackathon: true,
        members: { include: { student: true } },
        codeRepo: true,
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    if (team.leadStudent.userId !== session.userId) {
      return NextResponse.json(
        { error: "Only the designated team lead can finalize the submission" },
        { status: 403 }
      );
    }

    if (!team.problemStatementId) {
      return NextResponse.json(
        { error: "Squad must select an approved problem statement before submitting the final project solution." },
        { status: 400 }
      );
    }

    // V5.0: Verify all submission fields are filled when requested
    if (body.enforceAllFields || req.headers.get("x-v5-gate") === "true") {
      const missingFields: string[] = [];
      if (!description?.trim()) missingFields.push("Technical Architecture / How It Works Description");
      const effectiveLink = link?.trim() || team.codeRepo?.liveUrl || team.codeRepo?.githubRepoUrl;
      if (!effectiveLink) missingFields.push("Source Code / Live Demo URL");
      if (!fileUrl?.trim()) missingFields.push("Application Binary / APK / Release File URL");

      if (missingFields.length > 0) {
        return NextResponse.json(
          {
            error: `All submission fields must be filled before finalizing: ${missingFields.join(", ")}.`,
            missingFields,
          },
          { status: 400 }
        );
      }
    }

    // Check Part 4 deliverables if required or coming from arena
    const part4Uploads = await prisma.documentUpload.findMany({
      where: { teamId: team.id, stage: 4 },
    });

    const hasStageUploads = await prisma.documentUpload.count({
      where: { teamId: team.id },
    });

    const shouldEnforcePart4 = Boolean(
      body.strictDeliverableGate ||
      (hasStageUploads > 0 && team.hackathon?.part4Due) ||
      body.requirePart4Check
    );

    if (shouldEnforcePart4) {
      const hasPart4CodeZip = part4Uploads.some(
        (u) => u.fileType === "ZIP" || u.fileName.toLowerCase().endsWith(".zip")
      ) || Boolean(fileUrl?.toLowerCase().includes(".zip") || fileUrl?.toLowerCase().includes(".tar.gz"));

      const hasCompleteDocPdf = part4Uploads.some(
        (u) => u.fileType === "PDF" || u.fileName.toLowerCase().endsWith(".pdf")
      );

      const hasCompletePpt = part4Uploads.some(
        (u) =>
          u.fileType === "PPTX" ||
          u.fileType === "PPT" ||
          u.fileName.toLowerCase().endsWith(".pptx") ||
          u.fileName.toLowerCase().endsWith(".ppt")
      );

      const hasRepoOrLiveUrl = Boolean(
        link?.trim() ||
        team.codeRepo?.liveUrl ||
        team.codeRepo?.githubRepoUrl ||
        team.codeRepo?.forkedRepoUrl
      );

      const missing: string[] = [];
      if (!hasPart4CodeZip) missing.push("Part 4 Code ZIP Archive (>2GB Supported)");
      if (!hasCompleteDocPdf) missing.push("Complete Documentation (.pdf)");
      if (!hasCompletePpt) missing.push("Complete PPT (.pptx)");
      if (!hasRepoOrLiveUrl) missing.push("Live URL Link & Forked GitHub Repo");

      if (missing.length > 0) {
        return NextResponse.json(
          {
            error: `Final submission blocked: You must upload all Part 4 deliverables before final submission: ${missing.join(", ")}.`,
            missing,
          },
          { status: 400 }
        );
      }
    }

    if (!link?.trim() && !fileUrl?.trim()) {
      return NextResponse.json(
        { error: "Please provide a valid source code repository link, live demo, or application URL." },
        { status: 400 }
      );
    }

    // PRD Non-Negotiable Rule 7: Final submission is immutable once confirmed; only the host can unlock
    if (team.submission && team.submission.locked) {
      return NextResponse.json(
        {
          error: "PRD Rule 7: Your submission has been locked and confirmed. Only the host can unlock it for revisions.",
        },
        { status: 403 }
      );
    }

    // Save submission and mark locked
    const submission = await prisma.$transaction(async (tx) => {
      const sub = await tx.submission.upsert({
        where: { teamId: team.id },
        update: {
          link: link?.trim() || null,
          fileUrl: fileUrl?.trim() || null,
          description: description.trim(),
          submittedAt: new Date(),
          locked: true,
        },
        create: {
          teamId: team.id,
          link: link?.trim() || null,
          fileUrl: fileUrl?.trim() || null,
          description: description.trim(),
          submittedAt: new Date(),
          locked: true,
        },
      });

      await tx.team.update({
        where: { id: team.id },
        data: { status: "SUBMITTED" },
      });

      return sub;
    });

    await writeAuditLog(session.userId, "TEAM_SUBMISSION_LOCKED", "team", team.id, {
      teamName: team.name,
      teamId: team.teamId,
      hackathonTitle: team.hackathon.title,
      link: link?.trim() || null,
    });

    // Save final submission files into /run/media/mitt_phoenix/Utility_LNX/OP/<Team>/Final Submit/
    try {
      const safeTeam = sanitizeFolderName(team.name || team.teamId || team.id);
      const safeHackathon = sanitizeFolderName(team.hackathon.title || "Hackathon");
      const opFinalDir = path.join(OP_BASE_STORAGE_DIR, safeTeam, "Final Submit");
      const localFinalDir = path.join(process.cwd(), safeHackathon, safeTeam, "Part_4");

      fs.mkdirSync(opFinalDir, { recursive: true });
      fs.mkdirSync(localFinalDir, { recursive: true });

      const finalRecord = {
        teamName: team.name,
        teamId: team.teamId,
        hackathon: team.hackathon.title,
        submittedAt: new Date().toISOString(),
        leadStudentId: team.leadStudentId,
        projectLink: link?.trim() || null,
        fileUrl: fileUrl?.trim() || null,
        description: description.trim(),
      };

      const finalMarkdown = `# Final Project Submission: ${team.name}
**Team ID:** \`${team.teamId}\`  
**Hackathon:** ${team.hackathon.title}  
**Submitted At:** ${new Date().toLocaleString()}  
**Project / Live URL:** ${link || "None provided"}  
**Attachment File:** ${fileUrl || "None provided"}  

## Project Description & Solution Overview
${description.trim()}

---
*Stored automatically in OP Final Submit folder for judging and evaluation.*
`;

      fs.writeFileSync(path.join(opFinalDir, "FINAL_SUBMISSION.json"), JSON.stringify(finalRecord, null, 2), "utf8");
      fs.writeFileSync(path.join(opFinalDir, "FINAL_SUBMISSION.md"), finalMarkdown, "utf8");

      fs.writeFileSync(path.join(localFinalDir, "FINAL_SUBMISSION.json"), JSON.stringify(finalRecord, null, 2), "utf8");
      fs.writeFileSync(path.join(localFinalDir, "FINAL_SUBMISSION.md"), finalMarkdown, "utf8");
    } catch (saveErr) {
      console.error("[OP Final Submit Storage Error]:", saveErr);
    }

    // Notify all squad members
    const memberUserIds = team.members.map((m) => m.student.userId);
    await createBulkNotifications(memberUserIds, "SUBMISSION_LOCKED", {
      title: "Project Submission Locked",
      message: `Final project submission for "${team.hackathon.title}" has been permanently locked for evaluation.`,
      link: `/dashboard/student/arena/${team.id}`,
      metadata: { teamId: team.id, hackathonId: team.hackathon.id },
    });

    return NextResponse.json({
      success: true,
      submission,
      message: "Submission finalized and locked successfully. Recorded to audit trail.",
    });
  } catch (error: any) {
    console.error("[Submission POST Error]:", error);
    return NextResponse.json({ error: "Failed to finalize submission" }, { status: 500 });
  }
}
