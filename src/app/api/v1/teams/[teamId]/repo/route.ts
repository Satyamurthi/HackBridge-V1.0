import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET /api/v1/teams/[teamId]/repo — Get repository status
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

    let repo = team.codeRepo;
    if (!repo && team.teamId) {
      // Auto-provision if missing
      const repoName = `hackbridge-${team.teamId}`;
      repo = await prisma.codeRepo.create({
        data: {
          teamId: team.id,
          githubRepoUrl: `https://github.com/hackbridge-org/${repoName}`,
          storagePath: `/repos/${team.teamId}`,
        },
      });
    }

    return NextResponse.json({ repo });
  } catch (error: any) {
    console.error("[Repo GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch repository" }, { status: 500 });
  }
}

// POST /api/v1/teams/[teamId]/repo — Push / sync commit to repository
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

    // Generate SHA-1 commit hash
    const commitHash = crypto
      .createHash("sha1")
      .update(`${team.id}-${Date.now()}-${message}`)
      .digest("hex");

    const repoName = `hackbridge-${team.teamId || team.id.slice(0, 8)}`;

    const repo = await prisma.codeRepo.upsert({
      where: { teamId: team.id },
      update: {
        commitHash,
        lastPushAt: new Date(),
      },
      create: {
        teamId: team.id,
        githubRepoUrl: `https://github.com/hackbridge-org/${repoName}`,
        storagePath: `/repos/${team.teamId || team.id}`,
        commitHash,
        lastPushAt: new Date(),
      },
    });

    await writeAuditLog(session.userId, "CODE_COMMITTED", "team", team.id, {
      teamName: team.name,
      teamId: team.teamId,
      commitHash,
      message,
    });

    return NextResponse.json({
      success: true,
      repo,
      message: `Pushed commit ${commitHash.slice(0, 7)} to ${repo.githubRepoUrl}`,
    });
  } catch (error: any) {
    console.error("[Repo POST Error]:", error);
    return NextResponse.json({ error: "Failed to push to repository" }, { status: 500 });
  }
}
