import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { generateTeamId } from "@/lib/id-generator";
import { writeAuditLog } from "@/lib/audit";
import { createBulkNotifications } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// GET /api/v1/teams — Get teams belonging to current user or for a specific hackathon
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const hackathonId = searchParams.get("hackathonId");

    let whereClause: any = {};

    if (session.role === "STUDENT") {
      const student = await prisma.studentProfile.findUnique({
        where: { userId: session.userId },
      });
      if (!student) {
        return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
      }

      whereClause = {
        members: {
          some: { studentId: student.id },
        },
      };

      if (hackathonId) {
        whereClause.hackathonId = hackathonId;
      }
    } else if (session.role === "HOST") {
      const host = await prisma.hostProfile.findUnique({
        where: { userId: session.userId },
      });
      if (!host) {
        return NextResponse.json({ error: "Host profile not found" }, { status: 404 });
      }

      whereClause = {
        hackathon: { hostId: host.id },
      };

      if (hackathonId) {
        whereClause.hackathonId = hackathonId;
      }
    } else if (session.role === "SUPER_ADMIN") {
      if (hackathonId) {
        whereClause.hackathonId = hackathonId;
      }
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const teams = await prisma.team.findMany({
      where: whereClause,
      include: {
        hackathon: {
          select: {
            id: true,
            title: true,
            slug: true,
            fee: true,
            paymentMode: true,
            startAt: true,
            endAt: true,
            status: true,
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
          select: { id: true, title: true },
        },
        codeRepo: true,
        submission: true,
        result: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ teams });
  } catch (error: any) {
    console.error("[Teams GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch teams" }, { status: 500 });
  }
}

// POST /api/v1/teams — Team formation and application (by team lead)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Only authenticated students can apply and create a team" },
        { status: 401 }
      );
    }

    const leadStudent = await prisma.studentProfile.findUnique({
      where: { userId: session.userId },
      include: {
        user: { select: { name: true, email: true } },
        teamMemberships: {
          include: {
            team: {
              include: { hackathon: true },
            },
          },
        },
      },
    });

    if (!leadStudent) {
      return NextResponse.json(
        { error: "Student profile not found. Please complete profile setup." },
        { status: 404 }
      );
    }

    const now = new Date();

    // PRD Non-Negotiable Rule 1: A student can belong to only one active hackathon registration.
    const activeLeadMembership = leadStudent.teamMemberships.find(
      (m) =>
        (m.team.status === "ACTIVE" || m.team.status === "PENDING") &&
        new Date(m.team.hackathon.endAt) > now
    );

    if (activeLeadMembership) {
      return NextResponse.json(
        {
          error: `You are already registered in an active hackathon: "${activeLeadMembership.team.hackathon.title}" with team "${activeLeadMembership.team.name}". PRD Rule 1 restricts students to one active hackathon at a time.`,
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { hackathonId, teamName, teammateHackathonIds = [] } = body;

    if (!hackathonId || !teamName?.trim()) {
      return NextResponse.json(
        { error: "hackathonId and teamName are required" },
        { status: 400 }
      );
    }

    // Verify hackathon exists and is published
    const hackathon = await prisma.hackathon.findFirst({
      where: {
        OR: [{ id: hackathonId }, { slug: hackathonId }],
      },
    });

    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }

    if (hackathon.status !== "PUBLISHED") {
      return NextResponse.json(
        { error: "Hackathon is not open for applications (Status: " + hackathon.status + ")" },
        { status: 400 }
      );
    }

    if (new Date(hackathon.endAt) <= now) {
      return NextResponse.json(
        { error: "This hackathon has already concluded." },
        { status: 400 }
      );
    }

    // Clean teammate IDs
    const cleanTeammateIds: string[] = Array.from(
      new Set<string>(
        (teammateHackathonIds as any[])
          .map((id: any) => String(id || "").trim().toUpperCase())
          .filter((id: string) => Boolean(id))
      )
    );

    // Total squad size = lead (1) + teammates
    const totalSquadSize = 1 + cleanTeammateIds.length;

    if (totalSquadSize < hackathon.teamMin || totalSquadSize > hackathon.teamMax) {
      return NextResponse.json(
        {
          error: `Team size must be between ${hackathon.teamMin} and ${hackathon.teamMax} members (currently ${totalSquadSize})`,
        },
        { status: 400 }
      );
    }

    // Check that lead is not included in teammates list
    if (cleanTeammateIds.includes(leadStudent.hackathonId.toUpperCase())) {
      return NextResponse.json(
        { error: "You cannot add yourself as a teammate" },
        { status: 400 }
      );
    }

    // Look up and validate all teammates
    const validatedTeammates: Array<{ id: string; userId: string; name: string; hackathonId: string }> = [];

    for (const hId of cleanTeammateIds) {
      const teammateStudent = await prisma.studentProfile.findUnique({
        where: { hackathonId: hId as string },
        include: {
          user: { select: { name: true, email: true } },
          teamMemberships: {
            include: {
              team: {
                include: { hackathon: true },
              },
            },
          },
        },
      });

      if (!teammateStudent) {
        return NextResponse.json(
          { error: `Teammate with Hackathon ID "${hId}" does not exist` },
          { status: 404 }
        );
      }

      // Check teammate's active hackathons
      const activeTeammateMembership = teammateStudent.teamMemberships.find(
        (m: any) =>
          (m.team.status === "ACTIVE" || m.team.status === "PENDING") &&
          new Date(m.team.hackathon.endAt) > now
      );

      if (activeTeammateMembership) {
        return NextResponse.json(
          {
            error: `Teammate ${teammateStudent.user.name} (${hId}) is already participating in an active hackathon: "${activeTeammateMembership.team.hackathon.title}"`,
          },
          { status: 400 }
        );
      }

      validatedTeammates.push({
        id: teammateStudent.id,
        userId: teammateStudent.userId,
        name: teammateStudent.user.name,
        hackathonId: teammateStudent.hackathonId,
      });
    }

    const isFree = hackathon.fee === 0 || hackathon.paymentMode === "FREE";
    const initialStatus = isFree ? "ACTIVE" : "PENDING";
    const initialTeamId = isFree ? generateTeamId() : null; // Rule 3: Only after verified payment

    // Execute atomic team creation
    const createdTeam = await prisma.$transaction(async (tx) => {
      // Create team
      const team = await tx.team.create({
        data: {
          hackathonId: hackathon.id,
          leadStudentId: leadStudent.id,
          name: teamName.trim(),
          status: initialStatus,
          teamId: initialTeamId,
        },
      });

      // Add lead as TeamMember
      await tx.teamMember.create({
        data: {
          teamId: team.id,
          studentId: leadStudent.id,
          role: "LEAD",
        },
      });

      // Add each teammate
      for (const tm of validatedTeammates) {
        await tx.teamMember.create({
          data: {
            teamId: team.id,
            studentId: tm.id,
            role: "MEMBER",
          },
        });
      }

      // Create Payment record
      const payment = await tx.payment.create({
        data: {
          teamId: team.id,
          mode: hackathon.paymentMode,
          amount: hackathon.fee,
          status: isFree ? "VERIFIED" : "PENDING",
          verifiedAt: isFree ? now : null,
        },
      });

      return { ...team, payment };
    });

    await writeAuditLog(session.userId, "TEAM_APPLIED", "team", createdTeam.id, {
      teamName: createdTeam.name,
      hackathonTitle: hackathon.title,
      memberCount: totalSquadSize,
      isFree,
      teamId: initialTeamId,
    });

    // Dispatch in-app notifications to invited teammates
    if (validatedTeammates.length > 0) {
      await createBulkNotifications(
        validatedTeammates.map((t) => t.userId),
        "TEAM_INVITE",
        {
          title: "Added to Hackathon Squad",
          message: `You were added to squad "${createdTeam.name}" for "${hackathon.title}" by ${leadStudent.user.name}.`,
          link: "/dashboard/student",
          metadata: {
            teamId: createdTeam.id,
            hackathonId: hackathon.id,
            teamName: createdTeam.name,
          },
        }
      );
    }

    return NextResponse.json(
      {
        team: createdTeam,
        message: isFree
          ? "Team registration confirmed! Team ID issued."
          : "Team application created. Proceed to payment verification.",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Team Application Error]:", error);
    return NextResponse.json(
      { error: "Failed to create team application" },
      { status: 500 }
    );
  }
}
