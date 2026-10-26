import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET /api/v1/teams/[teamId]/progress — Fetch team progress timeline
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
        members: {
          include: { student: true },
        },
        hackathon: true,
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Access control:
    // Teams see their own progress.
    // Judges, host of the hackathon, and super admin see all teams' progress.
    const isMember = team.members.some((m) => m.student.userId === session.userId);
    const isHost = session.role === "HOST";
    const isJudge = session.role === "JUDGE";
    const isAdmin = session.role === "SUPER_ADMIN";

    if (!isMember && !isHost && !isJudge && !isAdmin) {
      return NextResponse.json(
        { error: "Access denied. Teams cannot inspect other squads' progress." },
        { status: 403 }
      );
    }

    const updates = await prisma.progressUpdate.findMany({
      where: { teamId: team.id },
      orderBy: { percent: "asc" },
    });

    const latest = updates.length > 0 ? updates[updates.length - 1] : null;

    return NextResponse.json({
      teamId: team.id,
      officialTeamId: team.teamId,
      currentPercent: latest?.percent ?? 0,
      latestNote: latest?.note ?? null,
      history: updates,
    });
  } catch (error: any) {
    console.error("[Progress GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
  }
}

// POST /api/v1/teams/[teamId]/progress — Log 10% step progress update
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
    const { percent, note } = body;

    // Validate 10% steps
    const validPercents = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const numPercent = Number(percent);

    if (!validPercents.includes(numPercent)) {
      return NextResponse.json(
        { error: "Progress percent must be in 10% steps (10, 20, 30 ... 100)" },
        { status: 400 }
      );
    }

    if (!note?.trim()) {
      return NextResponse.json(
        { error: "A note describing milestones achieved is required" },
        { status: 400 }
      );
    }

    const team = await prisma.team.findFirst({
      where: {
        OR: [{ id: teamId }, { teamId }],
      },
      include: {
        members: {
          include: { student: true },
        },
        progressUpdates: {
          orderBy: { percent: "desc" },
          take: 1,
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const isMember = team.members.some((m) => m.student.userId === session.userId);
    if (!isMember) {
      return NextResponse.json(
        { error: "Only members of this squad can log progress updates" },
        { status: 403 }
      );
    }

    // PRD Non-Negotiable Rule 6: Progress is never decreasing
    const currentMax = team.progressUpdates[0]?.percent ?? 0;
    if (numPercent <= currentMax) {
      return NextResponse.json(
        {
          error: `PRD Rule 6: Progress is strictly non-decreasing. Current progress is ${currentMax}%. New update must be greater than ${currentMax}%.`,
        },
        { status: 400 }
      );
    }

    const update = await prisma.progressUpdate.create({
      data: {
        teamId: team.id,
        percent: numPercent,
        note: note.trim(),
      },
    });

    await writeAuditLog(session.userId, "PROGRESS_UPDATED", "team", team.id, {
      teamName: team.name,
      teamId: team.teamId,
      percent: numPercent,
      note: note.trim(),
    });

    return NextResponse.json({
      success: true,
      progressUpdate: update,
      currentPercent: numPercent,
      message: `Progress updated to ${numPercent}%. Recorded to timeline.`,
    });
  } catch (error: any) {
    console.error("[Progress POST Error]:", error);
    return NextResponse.json({ error: "Failed to log progress" }, { status: 500 });
  }
}
