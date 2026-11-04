import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isV5Enabled } from "@/lib/version-gate";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/v1/hackathons/[id]/leaderboard — Public & student arena leaderboard
// Displays overall leaderboard once judges add marks; top 3 squads receive gold, silver, and bronze trophies
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(req.url);

    const v5Active = isV5Enabled({
      headers: req.headers,
      searchParams,
    });

    const hackathon = await prisma.hackathon.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        rubricCriteria: {
          select: { id: true, name: true, weight: true, maxScore: true },
        },
      },
    });

    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }

    const totalDeclaredMarks =
      hackathon.rubricCriteria.reduce((sum, c) => sum + (c.maxScore || 10), 0) || 100;

    // Fetch all submissions with scores for teams in this hackathon
    const submissions = await prisma.submission.findMany({
      where: {
        team: { hackathonId: hackathon.id },
      },
      include: {
        team: {
          include: {
            domain: { select: { id: true, name: true } },
            problemStatement: { select: { id: true, title: true, code: true } },
            leadStudent: {
              include: { user: { select: { name: true, email: true } } },
            },
            result: true,
          },
        },
        scores: true,
      },
    });

    // Filter to submissions that have judge scores
    const scoredSubmissions = submissions.filter((sub) => sub.scores && sub.scores.length > 0);

    if (scoredSubmissions.length === 0) {
      return NextResponse.json({
        hasScores: false,
        isHostApproved: false,
        resultsApproved: false,
        hackathon: {
          id: hackathon.id,
          title: hackathon.title,
          slug: hackathon.slug,
        },
        maxMarks: totalDeclaredMarks,
        totalScoredSquads: 0,
        leaderboard: [],
        winners: [],
        v5Active,
      });
    }

    const approvedResults = await prisma.result.findMany({
      where: { hackathonId: hackathon.id },
    });
    const isHostApproved = approvedResults.length > 0;

    const session = await getSession();
    const isHostOrAdminOrJudge = Boolean(
      session &&
        (session.role === "HOST" ||
          session.role === "SUPER_ADMIN" ||
          session.role === "JUDGE")
    );

    // V5.0 Rule: After the host approves the results, then only students can see their marks
    if (v5Active && !isHostApproved && !isHostOrAdminOrJudge) {
      return NextResponse.json({
        hasScores: true,
        isHostApproved: false,
        resultsApproved: false,
        message:
          "Judges have submitted marks. Individual marks, overall standings, and trophy awards will appear once the host approves and publishes the official results.",
        hackathon: {
          id: hackathon.id,
          title: hackathon.title,
          slug: hackathon.slug,
        },
        maxMarks: totalDeclaredMarks,
        totalScoredSquads: scoredSubmissions.length,
        leaderboard: [],
        winners: [],
        v5Active,
      });
    }

    // Compute total score for each squad (preferring certified non-draft scores)
    const rankedSquads = scoredSubmissions
      .map((sub) => {
        const certifiedScores = sub.scores.filter((s) => !s.isDraft);
        const scoresToUse = certifiedScores.length > 0 ? certifiedScores : sub.scores;

        const totalScore = scoresToUse.reduce(
          (sum, s) => sum + (Number(s.score) || 0),
          0
        );

        const roundedScore = Math.round(totalScore * 10) / 10;
        const isDraft = certifiedScores.length === 0;

        return {
          submissionId: sub.id,
          teamId: sub.team.id,
          officialTeamId: sub.team.teamId || `SQUAD-${sub.team.id.slice(0, 6)}`,
          teamName: sub.team.name,
          college: sub.team.leadStudent?.college || null,
          leadName: sub.team.leadStudent?.user?.name || "Squad Lead",
          domain: sub.team.domain?.name || null,
          problemStatement: sub.team.problemStatement?.title || null,
          problemCode: sub.team.problemStatement?.code || null,
          finalScore: roundedScore,
          maxMarks: totalDeclaredMarks,
          percentage: Math.min(
            100,
            Math.round((roundedScore / (totalDeclaredMarks || 100)) * 100)
          ),
          isDraft,
          scoreCount: scoresToUse.length,
          publishedResult: sub.team.result
            ? {
                rank: sub.team.result.rank,
                award: sub.team.result.award,
                prize: sub.team.result.prize,
              }
            : null,
        };
      })
      .sort((a, b) => {
        // Sort by finalScore descending
        if (b.finalScore !== a.finalScore) {
          return b.finalScore - a.finalScore;
        }
        return a.teamName.localeCompare(b.teamName);
      });

    // Assign computed ranks and trophy designations for Top 3
    const leaderboard = rankedSquads.map((squad, index) => {
      const computedRank = squad.publishedResult?.rank || index + 1;
      let trophy: "GOLD" | "SILVER" | "BRONZE" | null = null;
      let isWinner = false;

      if (computedRank === 1) {
        trophy = "GOLD";
        isWinner = true;
      } else if (computedRank === 2) {
        trophy = "SILVER";
        isWinner = true;
      } else if (computedRank === 3) {
        trophy = "BRONZE";
        isWinner = true;
      }

      return {
        ...squad,
        rank: computedRank,
        computedRank,
        trophy,
        isWinner,
        award:
          squad.publishedResult?.award ||
          (computedRank === 1
            ? "1st Place Winner - Gold Trophy"
            : computedRank === 2
            ? "2nd Place Winner - Silver Trophy"
            : computedRank === 3
            ? "3rd Place Winner - Bronze Trophy"
            : `Rank #${computedRank}`),
        awardLabel:
          squad.publishedResult?.award ||
          (computedRank === 1
            ? "Grand Champion (1st Place)"
            : computedRank === 2
            ? "1st Runner Up (2nd Place)"
            : computedRank === 3
            ? "2nd Runner Up (3rd Place)"
            : `Rank #${computedRank}`),
      };
    });

    const winners = leaderboard.filter((s) => s.isWinner);

    return NextResponse.json({
      hasScores: true,
      isHostApproved: Boolean(isHostApproved),
      resultsApproved: Boolean(isHostApproved),
      hackathon: {
        id: hackathon.id,
        title: hackathon.title,
        slug: hackathon.slug,
      },
      maxMarks: totalDeclaredMarks,
      totalScoredSquads: leaderboard.length,
      leaderboard,
      winners,
      v5Active,
    });
  } catch (error) {
    console.error("GET /api/v1/hackathons/[id]/leaderboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch hackathon leaderboard" },
      { status: 500 }
    );
  }
}
