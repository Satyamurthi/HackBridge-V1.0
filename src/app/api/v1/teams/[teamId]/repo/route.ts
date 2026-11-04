import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { sanitizeFolderName } from "@/lib/github-push";

export const dynamic = "force-dynamic";

// GET /api/v1/teams/[teamId]/repo — Get repository and local folder status
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
        hackathon: true,
        codeRepo: true,
        members: { include: { student: true } },
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

    const safeHackathon = sanitizeFolderName(team.hackathon?.title || "Hackathon");
    const safeTeam = sanitizeFolderName(team.name || team.teamId || team.id);
    const localTeamDir = path.join(process.cwd(), safeHackathon, safeTeam);

    // Ensure the folder exists on disk
    try {
      fs.mkdirSync(localTeamDir, { recursive: true });
      fs.mkdirSync(path.join(localTeamDir, "code"), { recursive: true });
    } catch {}

    const orgName = process.env.GITHUB_ORG_NAME || "hackbridge-dev";
    const repoName = `hackbridge-${team.teamId || team.id.slice(0, 8)}`;
    const fallbackUrl = `https://github.com/${orgName}/${repoName}`;

    let repo = team.codeRepo;
    if (!repo && team.teamId) {
      repo = await prisma.codeRepo.create({
        data: {
          teamId: team.id,
          githubRepoUrl: fallbackUrl,
          storagePath: localTeamDir,
        },
      });
    } else if (repo && (!repo.storagePath || repo.storagePath.startsWith("/repos/"))) {
      repo = await prisma.codeRepo.update({
        where: { id: repo.id },
        data: { storagePath: localTeamDir },
      });
    }

    return NextResponse.json({
      repo,
      folderPath: `${safeHackathon}/${safeTeam}`,
      localPath: localTeamDir,
    });
  } catch (error: any) {
    console.error("[Repo GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch repository" }, { status: 500 });
  }
}

// POST /api/v1/teams/[teamId]/repo — Push / sync commit to local folder storage
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
    const body = await req.json().catch(() => ({}));
    const { message = "Update project code" } = body;

    const team = await prisma.team.findFirst({
      where: {
        OR: [{ id: teamId }, { teamId }],
      },
      include: {
        hackathon: true,
        codeRepo: true,
        members: { include: { student: true } },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const isMember = team.members.some((m) => m.student.userId === session.userId);
    if (!isMember) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const safeHackathon = sanitizeFolderName(team.hackathon?.title || "Hackathon");
    const safeTeam = sanitizeFolderName(team.name || team.teamId || team.id);
    const localTeamDir = path.join(process.cwd(), safeHackathon, safeTeam);

    // Ensure team directory and code directory exist
    fs.mkdirSync(localTeamDir, { recursive: true });
    fs.mkdirSync(path.join(localTeamDir, "code"), { recursive: true });

    // Generate SHA-1 commit hash
    const commitHash = crypto
      .createHash("sha1")
      .update(`${team.id}-${Date.now()}-${message}`)
      .digest("hex");

    const commitLogEntry = `[${new Date().toISOString()}] Commit ${commitHash.slice(0, 10)} by ${session.name || "Student"}: ${message}\n`;
    fs.appendFileSync(path.join(localTeamDir, "COMMITS.log"), commitLogEntry, "utf8");

    const orgName = process.env.GITHUB_ORG_NAME || "hackbridge-dev";
    const repoName = `hackbridge-${team.teamId || team.id.slice(0, 8)}`;
    const githubRepoUrl = `https://github.com/${orgName}/${repoName}`;

    const repo = await prisma.codeRepo.upsert({
      where: { teamId: team.id },
      update: {
        githubRepoUrl,
        storagePath: localTeamDir,
        commitHash,
        lastPushAt: new Date(),
      },
      create: {
        teamId: team.id,
        githubRepoUrl,
        storagePath: localTeamDir,
        commitHash,
        lastPushAt: new Date(),
      },
    });

    await writeAuditLog(session.userId, "CODE_COMMITTED", "team", team.id, {
      teamName: team.name,
      teamId: team.teamId,
      commitHash,
      message,
      folderPath: `${safeHackathon}/${safeTeam}`,
    });

    return NextResponse.json({
      success: true,
      repo,
      folderPath: `${safeHackathon}/${safeTeam}`,
      message: `Pushed commit ${commitHash.slice(0, 7)} to ${safeHackathon}/${safeTeam}`,
    });
  } catch (error: any) {
    console.error("[Repo POST Error]:", error);
    return NextResponse.json({ error: "Failed to push to repository" }, { status: 500 });
  }
}
