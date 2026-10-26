import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/v1/hackathons/[id]/problem-statements — Fetch statements with server clock reveal and balanced allocation caps
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const hackathon = await prisma.hackathon.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        domains: {
          include: {
            problemStatements: {
              include: {
                teams: {
                  select: { id: true, name: true, teamId: true },
                },
              },
            },
          },
        },
        _count: {
          select: {
            teams: true,
          },
        },
      },
    });

    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }

    // Count verified active teams
    const totalActiveTeams = await prisma.team.count({
      where: {
        hackathonId: hackathon.id,
        status: { in: ["ACTIVE", "SUBMITTED"] },
      },
    });

    // Count all problem statements in this hackathon
    const totalStatements = hackathon.domains.reduce(
      (sum, d) => sum + d.problemStatements.length,
      0
    );

    // PRD Non-Negotiable Rule 4: Cap per statement = ceil(teams / statements)
    // Minimum cap of 1 if active teams > 0, or default reasonable capacity
    const dynamicCap = totalStatements > 0
      ? Math.max(1, Math.ceil((totalActiveTeams || 1) / totalStatements))
      : 10;

    const now = new Date();

    const sanitizedDomains = hackathon.domains.map((domain) => {
      const isRevealed = new Date(domain.revealAt) <= now;
      const msUntilReveal = Math.max(0, new Date(domain.revealAt).getTime() - now.getTime());

      return {
        id: domain.id,
        name: domain.name,
        description: isRevealed ? domain.description : null,
        revealAt: domain.revealAt,
        isRevealed,
        secondsUntilReveal: Math.ceil(msUntilReveal / 1000),
        problemStatements: domain.problemStatements.map((ps) => {
          const assignedCount = ps.teams.length;
          const effectiveCap = ps.cap > 0 ? ps.cap : dynamicCap;
          const isFull = assignedCount >= effectiveCap;

          return {
            id: ps.id,
            title: ps.title,
            // Mask description until revealAt passes (Rule 4)
            description: isRevealed ? ps.description : null,
            cap: effectiveCap,
            assignedCount,
            slotsRemaining: Math.max(0, effectiveCap - assignedCount),
            isFull,
            isRevealed,
          };
        }),
      };
    });

    return NextResponse.json({
      hackathonId: hackathon.id,
      title: hackathon.title,
      totalActiveTeams,
      totalStatements,
      dynamicCap,
      domains: sanitizedDomains,
    });
  } catch (error: any) {
    console.error("[Problem Statements GET Error]:", error);
    return NextResponse.json(
      { error: "Failed to fetch problem statements" },
      { status: 500 }
    );
  }
}
