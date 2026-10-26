import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

// POST /api/v1/judge/score — Judge logs rubric scores for a submission
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "JUDGE" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Judge authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const { submissionId, scores } = body;

    if (!submissionId || !Array.isArray(scores) || scores.length === 0) {
      return NextResponse.json(
        { error: "submissionId and scores array are required" },
        { status: 400 }
      );
    }

    // Verify submission
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        team: {
          include: {
            hackathon: {
              include: { rubricCriteria: true },
            },
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Verify judge profile
    const judgeProfile = await prisma.judgeProfile.findUnique({
      where: {
        userId_hackathonId: {
          userId: session.userId,
          hackathonId: submission.team.hackathonId,
        },
      },
    });

    if (!judgeProfile && session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "You are not assigned as a judge for this hackathon track" },
        { status: 403 }
      );
    }

    // PRD Rule 5: Judge cannot act until approved
    if (judgeProfile && judgeProfile.approvalStatus !== "APPROVED" && session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "PRD Rule 5: Your judge profile is pending approval. You cannot submit scores." },
        { status: 403 }
      );
    }

    const validCriteria = submission.team.hackathon.rubricCriteria;
    const criterionMap = new Map(validCriteria.map((c) => [c.id, c]));

    const judgeId = judgeProfile?.id || session.userId;

    // Validate scores
    for (const item of scores) {
      const criterion = criterionMap.get(item.criterionId);
      if (!criterion) {
        return NextResponse.json(
          { error: `Invalid rubric criterion: ${item.criterionId}` },
          { status: 400 }
        );
      }

      const scoreNum = Number(item.score);
      if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > criterion.maxScore) {
        return NextResponse.json(
          {
            error: `Score for "${criterion.name}" must be between 0 and ${criterion.maxScore} (received ${item.score})`,
          },
          { status: 400 }
        );
      }
    }

    // Atomically upsert scores
    const savedScores = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const item of scores) {
        const s = await tx.score.upsert({
          where: {
            submissionId_judgeId_criterionId: {
              submissionId,
              judgeId,
              criterionId: item.criterionId,
            },
          },
          update: {
            score: Number(item.score),
            notes: item.notes?.trim() || null,
          },
          create: {
            submissionId,
            judgeId,
            criterionId: item.criterionId,
            score: Number(item.score),
            notes: item.notes?.trim() || null,
          },
        });
        results.push(s);
      }
      return results;
    });

    await writeAuditLog(session.userId, "SUBMISSION_SCORED", "submission", submissionId, {
      teamName: submission.team.name,
      teamId: submission.team.teamId,
      scoresCount: savedScores.length,
      hackathonTitle: submission.team.hackathon.title,
    });

    return NextResponse.json({
      success: true,
      scores: savedScores,
      message: `Scores logged successfully for squad ${submission.team.name}.`,
    });
  } catch (error: any) {
    console.error("[Score Submit Error]:", error);
    return NextResponse.json({ error: "Failed to submit scores" }, { status: 500 });
  }
}
