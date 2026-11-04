import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

// POST /api/v1/judge/score — Judge logs rubric scores for a team or submission
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "JUDGE" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Judge authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const { submissionId, teamId, scores, feedback } = body;
    const isDraft = body.isDraft === true || body.action === "SAVE_DRAFT";

    if ((!submissionId && !teamId) || !Array.isArray(scores) || scores.length === 0) {
      return NextResponse.json(
        { error: "submissionId or teamId, and scores array are required" },
        { status: 400 }
      );
    }

    // Verify submission or resolve by teamId with full domain details
    let submission: any = null;
    if (submissionId) {
      submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        include: {
          team: {
            include: {
              domain: true,
              problemStatement: {
                include: { domain: true },
              },
              hackathon: {
                include: { rubricCriteria: true },
              },
            },
          },
        },
      });
    }

    // If submission not found or teamId provided, check team and ensure submission record exists
    if (!submission && (teamId || submissionId)) {
      const targetTeamId = teamId || submissionId;
      const team = await prisma.team.findFirst({
        where: {
          OR: [{ id: targetTeamId }, { teamId: targetTeamId }],
        },
        include: {
          submission: true,
          domain: true,
          problemStatement: {
            include: { domain: true },
          },
          hackathon: {
            include: { rubricCriteria: true },
          },
        },
      });

      if (team) {
        if (team.submission) {
          submission = await prisma.submission.findUnique({
            where: { id: team.submission.id },
            include: {
              team: {
                include: {
                  domain: true,
                  problemStatement: {
                    include: { domain: true },
                  },
                  hackathon: {
                    include: { rubricCriteria: true },
                  },
                },
              },
            },
          });
        } else {
          // Create draft submission for scoring Phase 1-4 deliverables
          const newSub = await prisma.submission.create({
            data: {
              teamId: team.id,
              description: `Evaluation assessment in progress for squad ${team.name}`,
              locked: false,
            },
          });
          submission = {
            ...newSub,
            team: {
              ...team,
              hackathon: team.hackathon,
            },
          };
        }
      }
    }

    if (!submission) {
      return NextResponse.json({ error: "Team or submission not found" }, { status: 404 });
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
        { error: "Judge profile waiting for admin approval. Contact 9380968402 Or Admin before evaluating submissions." },
        { status: 403 }
      );
    }

    // Domain Boundary Enforcement: If the host specified a domain for this judge, only that domain's teams may be scored
    if (judgeProfile?.domain && judgeProfile.domain.trim() && session.role !== "SUPER_ADMIN") {
      const assignedDomain = judgeProfile.domain.trim().toLowerCase();
      if (assignedDomain !== "all" && assignedDomain !== "all / general tracks") {
        const teamDomain = (submission.team.domain?.name || "").trim().toLowerCase();
        const teamDomainId = (submission.team.domainId || "").trim().toLowerCase();
        const psDomain = (submission.team.problemStatement?.domain?.name || "").trim().toLowerCase();

        const isMatch =
          teamDomain === assignedDomain ||
          teamDomainId === assignedDomain ||
          psDomain === assignedDomain ||
          teamDomain.includes(assignedDomain) ||
          assignedDomain.includes(teamDomain);

        if (!isMatch) {
          return NextResponse.json(
            {
              error: `Access Denied: You are designated to evaluate teams in the "${judgeProfile.domain}" domain only. Squad "${submission.team.name}" is assigned to "${submission.team.domain?.name || "General Track"}".`,
            },
            { status: 403 }
          );
        }
      }
    }

    const validCriteria = submission.team.hackathon.rubricCriteria;
    const criterionMap = new Map<string, any>(validCriteria.map((c: any) => [c.id, c]));

    const judgeId = judgeProfile?.id || session.userId;

    // In final submission mode (not draft), ensure every criterion has been scored
    if (!isDraft) {
      for (const criterion of validCriteria) {
        const item = scores.find((s: any) => s.criterionId === criterion.id);
        if (!item || item.score === "" || item.score === null || item.score === undefined) {
          return NextResponse.json(
            { error: `Final submission requires marks for all criteria. Missing score for "${criterion.name}".` },
            { status: 400 }
          );
        }
      }
    }

    // Validate scores provided
    for (const item of scores) {
      if (isDraft && (item.score === "" || item.score === null || item.score === undefined)) {
        continue;
      }

      const criterion = criterionMap.get(item.criterionId) as any;
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
            error: `Score for "${criterion.name}" must be between 0 and ${criterion.maxScore} marks (received ${item.score})`,
          },
          { status: 400 }
        );
      }
    }

    // Atomically upsert scores with isDraft flag
    const savedScores = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const item of scores) {
        if (isDraft && (item.score === "" || item.score === null || item.score === undefined)) {
          continue;
        }

        const s = await tx.score.upsert({
          where: {
            submissionId_judgeId_criterionId: {
              submissionId: submission.id,
              judgeId,
              criterionId: item.criterionId,
            },
          },
          update: {
            score: Number(item.score),
            notes: item.notes?.trim() || feedback?.trim() || null,
            isDraft,
          },
          create: {
            submissionId: submission.id,
            judgeId,
            criterionId: item.criterionId,
            score: Number(item.score),
            notes: item.notes?.trim() || feedback?.trim() || null,
            isDraft,
          },
        });
        results.push(s);
      }
      return results;
    });

    await writeAuditLog(session.userId, isDraft ? "SUBMISSION_SCORES_DRAFT_SAVED" : "SUBMISSION_SCORED", "submission", submission.id, {
      teamName: submission.team.name,
      teamId: submission.team.teamId,
      scoresCount: savedScores.length,
      isDraft,
      hackathonTitle: submission.team.hackathon.title,
    });

    return NextResponse.json({
      success: true,
      isDraft,
      submissionId: submission.id,
      scores: savedScores,
      rubricPolicy: "SINGLE_UNIFIED_ALL_PHASES",
      version: "5.0.0",
      message: isDraft
        ? `Draft scores saved successfully for squad ${submission.team.name}. Scores remain private and hidden from students until final submission.`
        : `Final evaluation certified and submitted for squad ${submission.team.name}.`,
    });
  } catch (error: any) {
    console.error("[Score Submit Error]:", error);
    return NextResponse.json({ error: "Failed to submit scores" }, { status: 500 });
  }
}
