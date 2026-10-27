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

    const body = await req.json().catch(() => ({}));
    const rawHackathonId = body.hackathonId;
    const rawTeamName = (body.teamName || body.name || "").trim();

    if (process.env.NODE_ENV !== "production") {
      console.log("[POST /api/v1/teams] Received request payload:", JSON.stringify(body, null, 2));
    }

    if (!rawHackathonId || !rawTeamName) {
      const errorMsg = "hackathonId and teamName are required";
      if (process.env.NODE_ENV !== "production") {
        console.warn("[POST /api/v1/teams] Validation failure:", errorMsg);
      }
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    // Verify hackathon exists and is published
    const hackathon = await prisma.hackathon.findFirst({
      where: {
        OR: [{ id: rawHackathonId }, { slug: rawHackathonId }],
      },
    });

    if (!hackathon) {
      const errorMsg = "Hackathon not found";
      if (process.env.NODE_ENV !== "production") {
        console.warn("[POST /api/v1/teams] Validation failure:", errorMsg);
      }
      return NextResponse.json({ error: errorMsg }, { status: 404 });
    }

    if (hackathon.status !== "PUBLISHED") {
      const errorMsg = "Hackathon is not open for applications (Status: " + hackathon.status + ")";
      if (process.env.NODE_ENV !== "production") {
        console.warn("[POST /api/v1/teams] Validation failure:", errorMsg);
      }
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    if (new Date(hackathon.endAt) <= now) {
      const errorMsg = "This hackathon has already concluded.";
      if (process.env.NODE_ENV !== "production") {
        console.warn("[POST /api/v1/teams] Validation failure:", errorMsg);
      }
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    // PRD Non-Negotiable Rule 1: A student can belong to only one active hackathon registration.
    const activeLeadMembership = leadStudent.teamMemberships.find(
      (m) =>
        (m.team.status === "ACTIVE" || m.team.status === "PENDING") &&
        new Date(m.team.hackathon.endAt) > now
    );

    if (activeLeadMembership) {
      // If student already has a PENDING draft team in THIS SAME hackathon, return/resume it seamlessly
      if (
        activeLeadMembership.team.hackathonId === hackathon.id &&
        activeLeadMembership.team.status === "PENDING"
      ) {
        if (process.env.NODE_ENV !== "production") {
          console.log(
            "[POST /api/v1/teams] Lead already has pending draft application in this hackathon. Resuming team:",
            activeLeadMembership.team.id
          );
        }
        return NextResponse.json(
          {
            team: activeLeadMembership.team,
            message: "Existing draft squad retrieved. Proceed to payment verification.",
            isExisting: true,
          },
          { status: 200 }
        );
      }

      const errorMsg = `You are already registered in an active hackathon: "${activeLeadMembership.team.hackathon.title}" with team "${activeLeadMembership.team.name}". PRD Rule 1 restricts students to one active hackathon at a time.`;
      if (process.env.NODE_ENV !== "production") {
        console.warn("[POST /api/v1/teams] Validation failure:", errorMsg);
      }
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    // Support both teammateHackathonIds (string[]) and members (array of { studentId } or { hackathonId } or string)
    let rawTeammateInputs: string[] = [];

    if (Array.isArray(body.teammateHackathonIds)) {
      rawTeammateInputs.push(...body.teammateHackathonIds.map(String));
    }
    if (Array.isArray(body.members)) {
      for (const m of body.members) {
        if (typeof m === "string") {
          rawTeammateInputs.push(m);
        } else if (m && typeof m === "object") {
          if (m.hackathonId) rawTeammateInputs.push(String(m.hackathonId));
          else if (m.studentId) rawTeammateInputs.push(String(m.studentId));
        }
      }
    }

    // Clean teammate IDs and deduplicate
    const cleanTeammateIds: string[] = Array.from(
      new Set<string>(
        rawTeammateInputs
          .map((id) => String(id || "").trim().toUpperCase())
          .filter((id) => Boolean(id))
      )
    );

    // Total squad size = lead (1) + teammates
    const totalSquadSize = 1 + cleanTeammateIds.length;

    if (totalSquadSize < hackathon.teamMin || totalSquadSize > hackathon.teamMax) {
      const errorMsg = `Team size must be between ${hackathon.teamMin} and ${hackathon.teamMax} members (currently ${totalSquadSize})`;
      if (process.env.NODE_ENV !== "production") {
        console.warn("[POST /api/v1/teams] Validation failure:", errorMsg);
      }
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    // Check that lead is not included in teammates list
    const leadHackathonIdUpper = leadStudent.hackathonId.toUpperCase();
    if (cleanTeammateIds.some((id) => id === leadHackathonIdUpper || id === leadStudent.id.toUpperCase())) {
      const errorMsg = "You cannot add yourself as a teammate";
      if (process.env.NODE_ENV !== "production") {
        console.warn("[POST /api/v1/teams] Validation failure:", errorMsg);
      }
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    // Look up and validate all teammates
    const validatedTeammates: Array<{ id: string; userId: string; name: string; hackathonId: string }> = [];

    for (const hId of cleanTeammateIds) {
      const teammateStudent = await prisma.studentProfile.findFirst({
        where: {
          OR: [
            { hackathonId: hId },
            { id: hId },
          ],
        },
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
        const errorMsg = `Teammate with Hackathon ID "${hId}" does not exist`;
        if (process.env.NODE_ENV !== "production") {
          console.warn("[POST /api/v1/teams] Validation failure:", errorMsg);
        }
        return NextResponse.json({ error: errorMsg }, { status: 404 });
      }

      // Check teammate's active hackathons
      const activeTeammateMembership = teammateStudent.teamMemberships.find(
        (m: any) =>
          (m.team.status === "ACTIVE" || m.team.status === "PENDING") &&
          new Date(m.team.hackathon.endAt) > now
      );

      if (activeTeammateMembership) {
        const errorMsg = `Teammate ${teammateStudent.user.name} (${teammateStudent.hackathonId}) is already participating in an active hackathon: "${activeTeammateMembership.team.hackathon.title}"`;
        if (process.env.NODE_ENV !== "production") {
          console.warn("[POST /api/v1/teams] Validation failure:", errorMsg);
        }
        return NextResponse.json({ error: errorMsg }, { status: 400 });
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
    const initialTeamId = generateTeamId(); // Issue official Team ID upon squad creation

    if (process.env.NODE_ENV !== "production") {
      console.log("[POST /api/v1/teams] Validation succeeded. Creating team...", {
        hackathon: hackathon.title,
        teamName: rawTeamName,
        teamId: initialTeamId,
        status: initialStatus,
        lead: leadStudent.user.name,
        teammates: validatedTeammates.map((t) => t.name),
      });
    }

    // Execute atomic team creation
    const createdTeam = await prisma.$transaction(async (tx) => {
      // Create team
      const team = await tx.team.create({
        data: {
          hackathonId: hackathon.id,
          leadStudentId: leadStudent.id,
          name: rawTeamName,
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
