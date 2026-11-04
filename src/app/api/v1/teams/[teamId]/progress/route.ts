import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET /api/v1/teams/[teamId]/progress — Fetch team progress with individual breakdown and combined team bar
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
          include: {
            student: {
              include: { user: true },
            },
          },
        },
        hackathon: true,
        submission: true,
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Access control:
    // Teams see their own progress.
    // Host of the hackathon, assigned judges, and super admin see progress.
    // Other teams get 403.
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

    const allUpdates = await prisma.progressUpdate.findMany({
      where: { teamId: team.id },
      orderBy: { createdAt: "desc" },
    });

    // Compute each member's latest percentage
    const membersProgress = team.members.map((m) => {
      const memberLatestUpdate = allUpdates.find(
        (u) => u.studentId === m.student.id || u.studentName?.includes(m.student.hackathonId)
      );

      return {
        memberId: m.id,
        studentId: m.student.id,
        hackathonId: m.student.hackathonId,
        name: m.student.user.name,
        role: m.role,
        percent: memberLatestUpdate?.percent ?? 0,
        lastUpdated: memberLatestUpdate?.createdAt ?? null,
        note: memberLatestUpdate?.note ?? null,
      };
    });

    // Calculate combined team progress: average of all members' latest percentages
    const totalMembers = team.members.length || 1;
    const sumPercents = membersProgress.reduce((sum, m) => sum + m.percent, 0);
    const calculatedCombined = Math.round(sumPercents / totalMembers);

    const latestOverallUpdate = allUpdates[0] || null;

    return NextResponse.json({
      teamId: team.id,
      officialTeamId: team.teamId,
      combinedPercent: calculatedCombined,
      lastUpdated: latestOverallUpdate?.createdAt ?? null,
      lastUpdatedBy: latestOverallUpdate?.studentName ?? null,
      latestNote: latestOverallUpdate?.note ?? null,
      membersProgress,
      history: allUpdates.reverse(), // chronological timeline
      isLocked: Boolean(team.submission?.locked || new Date(team.hackathon.endAt) < new Date()),
    });
  } catch (error: any) {
    console.error("[Progress GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
  }
}

// POST /api/v1/teams/[teamId]/progress — Member updates their own completion percentage
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
    const { percent, note } = body;

    const numPercent = Number(percent);
    if (isNaN(numPercent) || numPercent < 0 || numPercent > 100) {
      return NextResponse.json(
        { error: "Progress percent must be between 0 and 100" },
        { status: 400 }
      );
    }

    if (!note || typeof note !== "string" || !note.trim()) {
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
          include: {
            student: {
              include: { user: true },
            },
          },
        },
        hackathon: true,
        submission: true,
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const currentMember = team.members.find((m) => m.student.userId === session.userId);
    if (!currentMember) {
      return NextResponse.json(
        { error: "Only members of this squad can log progress updates" },
        { status: 403 }
      );
    }

    // Require statement selection or auto-link from registered domain
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
          { error: "A problem statement must be selected before updating team progress" },
          { status: 400 }
        );
      }
    }

    // Lock check: hackathon ended or submission locked
    const now = new Date();
    if (new Date(team.hackathon.endAt) < now) {
      return NextResponse.json(
        { error: "Hackathon has concluded. Progress updates are locked." },
        { status: 400 }
      );
    }

    if (team.submission?.locked) {
      return NextResponse.json(
        { error: "Final submission is locked. Progress updates are disallowed." },
        { status: 400 }
      );
    }

    // Fetch previous updates to calculate new combined percent
    const allUpdates = await prisma.progressUpdate.findMany({
      where: { teamId: team.id },
      orderBy: { createdAt: "desc" },
    });

    // Member-level non-decreasing check:
    const memberPreviousUpdate = allUpdates.find((u) => u.studentId === currentMember.student.id);
    const memberCurrentPercent = memberPreviousUpdate?.percent ?? 0;
    if (numPercent < memberCurrentPercent) {
      return NextResponse.json(
        {
          error: `Progress is non-decreasing. Your previous logged progress was ${memberCurrentPercent}%. New update must be ≥ ${memberCurrentPercent}%.`,
        },
        { status: 400 }
      );
    }

    // Calculate new combined progress across all members
    const totalMembers = team.members.length || 1;
    let sumPercents = numPercent; // this member's new percent
    for (const m of team.members) {
      if (m.student.id !== currentMember.student.id) {
        const u = allUpdates.find((up) => up.studentId === m.student.id);
        sumPercents += u?.percent ?? 0;
      }
    }
    const newCombinedPercent = Math.round(sumPercents / totalMembers);

    const studentDisplayName = currentMember.student.user.name;

    const update = await prisma.progressUpdate.create({
      data: {
        teamId: team.id,
        studentId: currentMember.student.id,
        studentName: studentDisplayName,
        percent: numPercent,
        combinedPercent: newCombinedPercent,
        note: note.trim(),
      },
    });

    await writeAuditLog(session.userId, "PROGRESS_UPDATED", "team", team.id, {
      teamName: team.name,
      teamId: team.teamId,
      studentName: studentDisplayName,
      memberPercent: numPercent,
      combinedPercent: newCombinedPercent,
      note: note.trim(),
    });

    return NextResponse.json({
      success: true,
      progressUpdate: update,
      memberPercent: numPercent,
      combinedPercent: newCombinedPercent,
      lastUpdated: update.createdAt,
      lastUpdatedBy: studentDisplayName,
      message: `Progress logged by ${studentDisplayName}: ${numPercent}%. Combined squad progress: ${newCombinedPercent}%.`,
    });
  } catch (error: any) {
    console.error("[Progress POST Error]:", error);
    return NextResponse.json({ error: "Failed to log progress" }, { status: 500 });
  }
}
