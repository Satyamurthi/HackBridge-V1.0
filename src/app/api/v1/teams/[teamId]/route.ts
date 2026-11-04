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
        domain: {
          select: { id: true, name: true, description: true, revealAt: true },
        },
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
    let isHost = false;
    if (session.role === "HOST") {
      const host = await prisma.hostProfile.findUnique({
        where: { userId: session.userId },
      });
      if (host) {
        const hackathon = await prisma.hackathon.findUnique({
          where: { id: team.hackathonId },
          select: { hostId: true },
        });
        if (hackathon && hackathon.hostId === host.id) {
          isHost = true;
        }
      }
    }

    if (!isLead && !isAdmin && !isHost) {
      return NextResponse.json(
        { error: "Only the designated team lead, host, or admin can delete this squad" },
        { status: 403 }
      );
    }

    if (!isHost && !isAdmin && team.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending draft applications can be discarded by participants" },
        { status: 400 }
      );
    }

    // Atomically delete team and associated payment and deliverable records
    await prisma.$transaction(async (tx) => {
      const sub = await tx.submission.findUnique({ where: { teamId: team.id } });
      if (sub) {
        await tx.score.deleteMany({ where: { submissionId: sub.id } });
        await tx.submission.delete({ where: { id: sub.id } });
      }
      await tx.result.deleteMany({ where: { teamId: team.id } });
      await tx.codeRepo.deleteMany({ where: { teamId: team.id } });
      await tx.documentUpload.deleteMany({ where: { teamId: team.id } });
      await tx.progressUpdate.deleteMany({ where: { teamId: team.id } });
      await tx.payment.deleteMany({ where: { teamId: team.id } });
      await tx.teamMember.deleteMany({ where: { teamId: team.id } });
      await tx.notification.deleteMany({
        where: { payload: { contains: team.id } },
      });
      await tx.team.delete({ where: { id: team.id } });
    });

    return NextResponse.json({
      success: true,
      message: `Squad ${team.name} successfully deleted and registrations released.`,
    });
  } catch (error: any) {
    console.error("[Team DELETE Error]:", error);
    return NextResponse.json(
      { error: "Failed to delete squad" },
      { status: 500 }
    );
  }
}
