import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

// POST /api/v1/host/hackathons/[hackathonId]/publish-results — Host publishes awards and results
export async function POST(
  req: NextRequest,
  { params }: { params: { hackathonId: string } }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "HOST" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Host or Admin clearance required" }, { status: 403 });
    }

    const { hackathonId } = params;
    const body = await req.json();
    const { results } = body;

    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json({ error: "results array is required" }, { status: 400 });
    }

    const hackathon = await prisma.hackathon.findFirst({
      where: {
        OR: [{ id: hackathonId }, { slug: hackathonId }],
      },
    });

    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }

    // Verify host ownership
    if (session.role === "HOST") {
      const host = await prisma.hostProfile.findUnique({
        where: { userId: session.userId },
      });
      if (!host || hackathon.hostId !== host.id) {
        return NextResponse.json(
          { error: "Access denied. You can only publish results for your own track." },
          { status: 403 }
        );
      }
    }

    // Upsert each result
    const savedResults = await prisma.$transaction(async (tx) => {
      const out = [];
      for (const item of results) {
        const r = await tx.result.upsert({
          where: { teamId: item.teamId },
          update: {
            rank: Number(item.rank),
            award: item.award || `Rank #${item.rank}`,
            prize: item.prize || null,
            publishedAt: new Date(),
          },
          create: {
            hackathonId: hackathon.id,
            teamId: item.teamId,
            rank: Number(item.rank),
            award: item.award || `Rank #${item.rank}`,
            prize: item.prize || null,
            publishedAt: new Date(),
          },
        });
        out.push(r);
      }
      return out;
    });

    await writeAuditLog(session.userId, "RESULTS_PUBLISHED", "hackathon", hackathon.id, {
      hackathonTitle: hackathon.title,
      winnersCount: savedResults.length,
    });

    return NextResponse.json({
      success: true,
      results: savedResults,
      message: `Results published successfully for ${hackathon.title}! ${savedResults.length} squad awards certified.`,
    });
  } catch (error: any) {
    console.error("[Publish Results Error]:", error);
    return NextResponse.json({ error: "Failed to publish results" }, { status: 500 });
  }
}
