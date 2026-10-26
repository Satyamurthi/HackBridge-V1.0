import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/v1/host/hackathons/[hackathonId]/leaderboard — Host/Admin only: computed weighted scores and rankings
export async function GET(
  req: NextRequest,
  { params }: { params: { hackathonId: string } }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "HOST" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Host or Admin clearance required" }, { status: 403 });
    }

    const { hackathonId } = params;

    const hackathon = await prisma.hackathon.findFirst({
      where: {
        OR: [{ id: hackathonId }, { slug: hackathonId }],
      },
      include: {
        rubricCriteria: true,
        host: true,
      },
    });

    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }

    if (session.role === "HOST") {
      const host = await prisma.hostProfile.findUnique({
        where: { userId: session.userId },
      });
      if (!host || hackathon.hostId !== host.id) {
        return NextResponse.json(
          { error: "Access denied. You can only view the leaderboard for your own track." },
          { status: 403 }
        );
      }
    }

    // Fetch all submissions with scores
    const submissions = await prisma.submission.findMany({
      where: {
        team: { hackathonId: hackathon.id },
      },
      include: {
        team: {
          include: {
            problemStatement: true,
            leadStudent: { include: { user: { select: { name: true, email: true } } } },
            result: true,
          },
        },
        scores: {
          include: {
            criterion: true,
            judge: { include: { user: { select: { name: true } } } },
          },
        },
      },
    });

    // Compute weighted scores for each submission
    const scoredSquads = submissions.map((sub) => {
      // Group scores by criterion
      let totalWeightedScore = 0;
      let totalWeights = 0;

      for (const criterion of hackathon.rubricCriteria) {
        const criterionScores = sub.scores.filter((s) => s.criterionId === criterion.id);
        if (criterionScores.length > 0) {
          const avgScore =
            criterionScores.reduce((sum, s) => sum + s.score, 0) / criterionScores.length;
          totalWeightedScore += avgScore * criterion.weight;
          totalWeights += criterion.weight;
        }
      }

      const finalScore = totalWeights > 0 ? Number((totalWeightedScore / totalWeights).toFixed(2)) : 0;

      return {
        submissionId: sub.id,
        teamId: sub.team.id,
        officialTeamId: sub.team.teamId,
        teamName: sub.team.name,
        leadName: sub.team.leadStudent.user.name,
        problemStatement: sub.team.problemStatement?.title || "N/A",
        scoreCount: sub.scores.length,
        finalScore,
        publishedResult: sub.team.result,
      };
    });

    // Sort descending by finalScore to determine ranking
    scoredSquads.sort((a, b) => b.finalScore - a.finalScore);

    const rankedSquads = scoredSquads.map((squad, index) => ({
      ...squad,
      computedRank: index + 1,
    }));

    return NextResponse.json({
      hackathon: {
        id: hackathon.id,
        title: hackathon.title,
        rubricCriteria: hackathon.rubricCriteria,
      },
      totalSubmissions: submissions.length,
      leaderboard: rankedSquads,
    });
  } catch (error: any) {
    console.error("[Leaderboard GET Error]:", error);
    return NextResponse.json({ error: "Failed to compute leaderboard" }, { status: 500 });
  }
}
