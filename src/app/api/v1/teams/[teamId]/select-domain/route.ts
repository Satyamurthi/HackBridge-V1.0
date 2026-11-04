import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

// POST /api/v1/teams/[teamId]/select-domain — Team lead pre-selects a competing domain
// This must happen at/after registration. Domain selection is not final until problem statement is chosen.
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
    const { domainId } = body;

    if (!domainId) {
      return NextResponse.json({ error: "domainId is required" }, { status: 400 });
    }

    // Verify team
    const team = await prisma.team.findFirst({
      where: { OR: [{ id: teamId }, { teamId }] },
      include: {
        leadStudent: true,
        hackathon: {
          include: { domains: true },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Only the team lead can change the domain
    if (team.leadStudent.userId !== session.userId) {
      return NextResponse.json(
        { error: "Only the team lead can select the competing domain" },
        { status: 403 }
      );
    }

    // Cannot change domain after problem statement is locked in
    if (team.problemStatementId) {
      return NextResponse.json(
        { error: "Domain cannot be changed after a problem statement has been selected" },
        { status: 400 }
      );
    }

    // Verify the domain belongs to this hackathon
    const domain = team.hackathon.domains.find((d) => d.id === domainId);
    if (!domain) {
      return NextResponse.json(
        { error: "Domain does not belong to this hackathon" },
        { status: 400 }
      );
    }

    // Update team domain selection
    const updatedTeam = await prisma.team.update({
      where: { id: team.id },
      data: { domainId },
    });

    await writeAuditLog(session.userId, "TEAM_DOMAIN_SELECTED", "team", team.id, {
      teamName: team.name,
      domainName: domain.name,
    });

    return NextResponse.json({
      success: true,
      team: updatedTeam,
      domain: { id: domain.id, name: domain.name, description: domain.description },
      message: `Domain "${domain.name}" selected for squad "${team.name}".`,
    });
  } catch (error: any) {
    console.error("[Team Select Domain Error]:", error);
    return NextResponse.json({ error: "Failed to select domain" }, { status: 500 });
  }
}
