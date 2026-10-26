import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/v1/teams/[teamId]/result — Fetch result for a specific squad (Enforcing PRD Rule 8)
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
        result: true,
        hackathon: {
          select: { id: true, title: true, slug: true, hostId: true },
        },
        members: {
          include: { student: true },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // PRD Non-Negotiable Rule 8: Teams see only their own results. Enforce on the server.
    const isMemberOfThisTeam = team.members.some((m) => m.student.userId === session.userId);
    const isAdmin = session.role === "SUPER_ADMIN";
    let isHostOfThisTrack = false;

    if (session.role === "HOST") {
      const host = await prisma.hostProfile.findUnique({
        where: { userId: session.userId },
      });
      isHostOfThisTrack = !!host && team.hackathon.hostId === host.id;
    }

    if (!isMemberOfThisTeam && !isAdmin && !isHostOfThisTrack) {
      return NextResponse.json(
        {
          error: "PRD Non-Negotiable Rule 8 Violation: Squads are strictly prohibited from inspecting other teams' results. You can only view your own squad's certified result.",
        },
        { status: 403 }
      );
    }

    if (!team.result) {
      return NextResponse.json({
        teamId: team.id,
        officialTeamId: team.teamId,
        teamName: team.name,
        result: null,
        message: "Results for this track have not yet been certified and published by the host.",
      });
    }

    return NextResponse.json({
      teamId: team.id,
      officialTeamId: team.teamId,
      teamName: team.name,
      hackathon: team.hackathon,
      result: team.result,
    });
  } catch (error: any) {
    console.error("[Team Result GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch result" }, { status: 500 });
  }
}
