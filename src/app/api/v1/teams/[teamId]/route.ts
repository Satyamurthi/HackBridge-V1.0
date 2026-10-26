import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/v1/teams/[teamId] — Fetch team details with members, payment, and hackathon
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
        hackathon: {
          include: {
            host: {
              select: {
                id: true,
                orgName: true,
                type: true,
                website: true,
              },
            },
          },
        },
        leadStudent: {
          include: {
            user: { select: { name: true, email: true } },
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
        payment: true,
        problemStatement: {
          include: {
            domain: { select: { name: true, revealAt: true } },
          },
        },
        codeRepo: true,
        submission: true,
        result: true,
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Access control: Caller must be a team member, hackathon host, or super admin
    const isMember = team.members.some((m) => m.student.userId === session.userId);
    let isHost = false;
    if (session.role === "HOST") {
      const hostProfile = await prisma.hostProfile.findUnique({
        where: { userId: session.userId },
      });
      isHost = !!hostProfile && team.hackathon.host.id === hostProfile.id;
    }
    const isAdmin = session.role === "SUPER_ADMIN";

    if (!isMember && !isHost && !isAdmin && session.role !== "JUDGE") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ team });
  } catch (error: any) {
    console.error("[Team GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch team" }, { status: 500 });
  }
}
