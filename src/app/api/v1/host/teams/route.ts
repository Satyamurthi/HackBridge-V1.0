import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { generateTeamId } from "@/lib/id-generator";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET /api/v1/host/teams?hackathonId=... — Fetch teams with full student details for a hackathon
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "HOST" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Host or Admin clearance required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const hackathonId = searchParams.get("hackathonId");

    if (!hackathonId) {
      return NextResponse.json({ error: "hackathonId query param is required" }, { status: 400 });
    }

    // Verify host owns this hackathon
    if (session.role === "HOST") {
      const host = await prisma.hostProfile.findUnique({
        where: { userId: session.userId },
      });
      if (!host) {
        return NextResponse.json({ error: "Host profile not found" }, { status: 404 });
      }
      const hackathon = await prisma.hackathon.findUnique({
        where: { id: hackathonId },
        select: { hostId: true },
      });
      if (!hackathon || hackathon.hostId !== host.id) {
        return NextResponse.json({ error: "You can only view teams for your own hackathon track" }, { status: 403 });
      }
    }

    const teams = await prisma.team.findMany({
      where: { hackathonId },
      include: {
        leadStudent: {
          include: {
            user: {
              select: { id: true, name: true, email: true, phone: true },
            },
          },
        },
        members: {
          include: {
            student: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, phone: true },
                },
              },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
        domain: {
          select: { id: true, name: true },
        },
        problemStatement: {
          select: { id: true, title: true, code: true },
        },
        payment: {
          select: { id: true, mode: true, status: true, amount: true, createdAt: true },
        },
        documentUploads: {
          select: { id: true, stage: true, version: true, fileName: true, syncStatus: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
        submission: {
          select: { id: true, locked: true, submittedAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ teams });
  } catch (error: any) {
    console.error("[Host Teams GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch teams" }, { status: 500 });
  }
}

// POST /api/v1/host/teams — Host adds a team by Student ID(s) (HB-XXXXXX)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "HOST" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Host or Admin clearance required" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { hackathonId, name, teamName, leadStudentId, memberStudentIds = [], domainId, problemStatementId } = body;

    const resolvedTeamName = (name || teamName || "").trim();

    if (!hackathonId || !resolvedTeamName || !leadStudentId) {
      return NextResponse.json(
        { error: "hackathonId, teamName, and leadStudentId are required" },
        { status: 400 }
      );
    }

    // Verify host ownership of hackathon
    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
      include: { host: true },
    });

    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }

    let hostProfile: any = null;
    if (session.role === "HOST") {
      hostProfile = await prisma.hostProfile.findUnique({
        where: { userId: session.userId },
      });
      if (!hostProfile || hackathon.hostId !== hostProfile.id) {
        return NextResponse.json(
          { error: "You can only add teams to your own hackathon track" },
          { status: 403 }
        );
      }
    }

    // Lookup lead student by permanent Student ID (HB-XXXXXX) or email or user/profile id
    const cleanLeadId = leadStudentId.trim();
    const leadStudent = await prisma.studentProfile.findFirst({
      where: {
        OR: [
          { hackathonId: cleanLeadId.toUpperCase() },
          { user: { email: cleanLeadId.toLowerCase() } },
          { id: cleanLeadId },
          { userId: cleanLeadId },
        ],
      },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
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
        { error: `Lead student not found with ID / email: "${cleanLeadId}". Ensure student is registered with a valid Student ID (e.g. HB-XXXXXX).` },
        { status: 404 }
      );
    }

    // Check if lead student is already active in this hackathon
    const leadExistingTeam = leadStudent.teamMemberships.find(
      (m) => m.team.hackathonId === hackathon.id && (m.team.status === "ACTIVE" || m.team.status === "PENDING")
    );
    if (leadExistingTeam) {
      return NextResponse.json(
        { error: `Lead student ${leadStudent.user.name} (${leadStudent.hackathonId}) is already registered in team "${leadExistingTeam.team.name}" for this hackathon.` },
        { status: 400 }
      );
    }

    // Lookup teammate student IDs
    const resolvedMembers: Array<{ student: any; role: string }> = [
      { student: leadStudent, role: "LEAD" },
    ];
    const seenStudentIds = new Set<string>([leadStudent.id]);

    for (const rawMemberId of memberStudentIds) {
      const cleanId = String(rawMemberId).trim();
      if (!cleanId) continue;

      const memberStudent = await prisma.studentProfile.findFirst({
        where: {
          OR: [
            { hackathonId: cleanId.toUpperCase() },
            { user: { email: cleanId.toLowerCase() } },
            { id: cleanId },
            { userId: cleanId },
          ],
        },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          teamMemberships: {
            include: {
              team: {
                include: { hackathon: true },
              },
            },
          },
        },
      });

      if (!memberStudent) {
        return NextResponse.json(
          { error: `Teammate student not found with ID / email: "${cleanId}".` },
          { status: 404 }
        );
      }

      if (seenStudentIds.has(memberStudent.id)) {
        return NextResponse.json(
          { error: `Duplicate student detected in squad: ${memberStudent.user.name} (${memberStudent.hackathonId}) cannot be added twice.` },
          { status: 400 }
        );
      }

      const memberExistingTeam = memberStudent.teamMemberships.find(
        (m) => m.team.hackathonId === hackathon.id && (m.team.status === "ACTIVE" || m.team.status === "PENDING")
      );
      if (memberExistingTeam) {
        return NextResponse.json(
          { error: `Teammate student ${memberStudent.user.name} (${memberStudent.hackathonId}) is already registered in team "${memberExistingTeam.team.name}" for this hackathon.` },
          { status: 400 }
        );
      }

      seenStudentIds.add(memberStudent.id);
      resolvedMembers.push({ student: memberStudent, role: "MEMBER" });
    }

    // Sizing validation against hackathon constraints
    const totalMembers = resolvedMembers.length;
    if (totalMembers < hackathon.teamMin) {
      return NextResponse.json(
        { error: `Squad sizing under minimum. Hackathon requires at least ${hackathon.teamMin} members (provided ${totalMembers}).` },
        { status: 400 }
      );
    }
    if (totalMembers > hackathon.teamMax) {
      return NextResponse.json(
        { error: `Squad sizing exceeds maximum. Hackathon allows at most ${hackathon.teamMax} members (provided ${totalMembers}).` },
        { status: 400 }
      );
    }

    // Generate permanent Team ID (TEAM-XXXXXX)
    const officialTeamId = generateTeamId();

    // Atomically create team, member records, and verified payment entry
    const createdTeam = await prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: {
          name: resolvedTeamName,
          teamId: officialTeamId,
          hackathonId: hackathon.id,
          leadStudentId: leadStudent.id,
          domainId: domainId || null,
          problemStatementId: problemStatementId || null,
          status: "ACTIVE",
        },
      });

      // Insert all members
      for (const m of resolvedMembers) {
        await tx.teamMember.create({
          data: {
            teamId: team.id,
            studentId: m.student.id,
            role: m.role,
          },
        });
      }

      // Create verified payment record so team is immediately cleared to compete
      await tx.payment.create({
        data: {
          teamId: team.id,
          mode: hackathon.fee > 0 ? "FREE" : "FREE",
          status: "VERIFIED",
          amount: hackathon.fee,
          approvedBy: session.userId,
          verifiedAt: new Date(),
        },
      });

      return team;
    });

    await writeAuditLog(session.userId, "HOST_CREATED_TEAM", "team", createdTeam.id, {
      teamName: resolvedTeamName,
      officialTeamId,
      hackathonTitle: hackathon.title,
      memberCount: totalMembers,
    });

    return NextResponse.json({
      success: true,
      message: `Squad "${resolvedTeamName}" (${officialTeamId}) created successfully with ${totalMembers} students.`,
      team: createdTeam,
    });
  } catch (error: any) {
    console.error("[Host Teams POST Error]:", error);
    return NextResponse.json({ error: "Failed to create team" }, { status: 500 });
  }
}
