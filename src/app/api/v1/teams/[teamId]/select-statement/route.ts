import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

// POST /api/v1/teams/[teamId]/select-statement — Atomic problem statement selection with balanced allocation cap
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
    const { problemStatementId } = body;

    if (!problemStatementId) {
      return NextResponse.json({ error: "problemStatementId is required" }, { status: 400 });
    }

    // Verify team
    const team = await prisma.team.findFirst({
      where: {
        OR: [{ id: teamId }, { teamId }],
      },
      include: {
        leadStudent: true,
        hackathon: {
          include: {
            domains: {
              include: { problemStatements: true },
            },
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    if (team.leadStudent.userId !== session.userId) {
      return NextResponse.json(
        { error: "Only the designated team lead can select a problem statement" },
        { status: 403 }
      );
    }

    if (team.status !== "ACTIVE" || !team.teamId) {
      return NextResponse.json(
        { error: "Team registration and payment must be verified before selecting a problem statement" },
        { status: 403 }
      );
    }

    if (team.problemStatementId) {
      return NextResponse.json(
        { error: "A problem statement has already been selected. Selection is final." },
        { status: 400 }
      );
    }

    // Find the problem statement and its domain
    const statement = await prisma.problemStatement.findUnique({
      where: { id: problemStatementId },
      include: {
        domain: true,
      },
    });

    if (!statement || statement.domain.hackathonId !== team.hackathonId) {
      return NextResponse.json(
        { error: "Invalid problem statement for this hackathon track" },
        { status: 400 }
      );
    }

    // PRD Rule 4: Verify server clock has passed revealAt
    const now = new Date();
    if (new Date(statement.domain.revealAt) > now) {
      return NextResponse.json(
        {
          error: `This problem statement is locked until countdown expires at ${new Date(
            statement.domain.revealAt
          ).toLocaleTimeString("en-IN")}`,
        },
        { status: 400 }
      );
    }

    // Compute dynamic balanced allocation cap: Ceil(totalTeams / totalStatements)
    const totalActiveTeams = await prisma.team.count({
      where: {
        hackathonId: team.hackathonId,
        status: { in: ["ACTIVE", "SUBMITTED"] },
      },
    });

    const totalStatements = team.hackathon.domains.reduce(
      (sum, d) => sum + d.problemStatements.length,
      0
    );

    const dynamicCap = totalStatements > 0
      ? Math.max(1, Math.ceil((totalActiveTeams || 1) / totalStatements))
      : 10;

    const effectiveCap = statement.cap > 0 ? statement.cap : dynamicCap;

    // Execute atomic selection inside transaction
    const result = await prisma.$transaction(async (tx) => {
      // Re-count teams assigned to this statement inside transaction
      const currentAssignedCount = await tx.team.count({
        where: {
          problemStatementId,
        },
      });

      if (currentAssignedCount >= effectiveCap) {
        throw new Error(
          `SLOT_CAP_REACHED: Problem statement "${statement.title}" has reached its balanced allocation cap of ${effectiveCap} teams. Please select an available statement.`
        );
      }

      // Assign statement
      const updatedTeam = await tx.team.update({
        where: { id: team.id },
        data: {
          problemStatementId,
        },
      });

      // Auto-provision Code Repository record if not already present
      const repoName = `hackbridge-${team.teamId}`;
      await tx.codeRepo.upsert({
        where: { teamId: team.id },
        update: {},
        create: {
          teamId: team.id,
          githubRepoUrl: `https://github.com/hackbridge-org/${repoName}`,
          storagePath: `/repos/${team.teamId}`,
        },
      });

      return updatedTeam;
    });

    await writeAuditLog(session.userId, "PROBLEM_STATEMENT_SELECTED", "team", team.id, {
      teamName: team.name,
      teamId: team.teamId,
      statementTitle: statement.title,
      domainName: statement.domain.name,
    });

    return NextResponse.json({
      success: true,
      team: result,
      statement: {
        id: statement.id,
        title: statement.title,
        description: statement.description,
        domain: statement.domain.name,
      },
      message: `Problem statement "${statement.title}" selected successfully! Repository provisioned.`,
    });
  } catch (error: any) {
    console.error("[Select Statement Error]:", error);
    if (error.message?.startsWith("SLOT_CAP_REACHED")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Failed to select problem statement" },
      { status: 500 }
    );
  }
}
