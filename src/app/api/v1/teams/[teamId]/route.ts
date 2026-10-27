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

// DELETE /api/v1/teams/[teamId] — Discard or cancel a pending draft application
export async function DELETE(
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
        leadStudent: true,
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const isLead = team.leadStudent.userId === session.userId;
    const isAdmin = session.role === "SUPER_ADMIN";

    if (!isLead && !isAdmin) {
      return NextResponse.json(
        { error: "Only the designated team lead can discard this application" },
        { status: 403 }
      );
    }

    if (team.status !== "PENDING" && !isAdmin) {
      return NextResponse.json(
        { error: "Only pending draft applications can be discarded" },
        { status: 400 }
      );
    }

    // Atomically delete team and associated payment records
    await prisma.$transaction(async (tx) => {
      await tx.payment.deleteMany({ where: { teamId: team.id } });
      await tx.teamMember.deleteMany({ where: { teamId: team.id } });
      await tx.notification.deleteMany({
        where: { payload: { contains: team.id } },
      });
      await tx.team.delete({ where: { id: team.id } });
    });

    return NextResponse.json({
      success: true,
      message: "Pending draft squad application successfully discarded",
    });
  } catch (error: any) {
    console.error("[Team DELETE Error]:", error);
    return NextResponse.json(
      { error: "Failed to discard draft application" },
      { status: 500 }
    );
  }
}
