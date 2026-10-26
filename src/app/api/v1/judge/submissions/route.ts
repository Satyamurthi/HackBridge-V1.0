import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/v1/judge/submissions — Submissions assigned to the authenticated approved judge
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "JUDGE" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Judge authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedHackathonId = searchParams.get("hackathonId");

    // Fetch judge profile for this hackathon
    const judgeProfiles = await prisma.judgeProfile.findMany({
      where: {
        userId: session.userId,
        ...(requestedHackathonId ? { hackathonId: requestedHackathonId } : {}),
      },
      include: {
        hackathon: {
          include: {
            rubricCriteria: true,
          },
        },
      },
    });

    if (judgeProfiles.length === 0 && session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "No hackathon track assignments found for this judge account" },
        { status: 404 }
      );
    }

    const activeProfile = judgeProfiles[0];

    // PRD Rule 5: Host and judge accounts cannot act until approved
    if (activeProfile && activeProfile.approvalStatus !== "APPROVED" && session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        {
          error: "PRD Rule 5: Your judge credentials are pending host approval for this hackathon. You cannot evaluate submissions until authorized.",
          approvalStatus: activeProfile.approvalStatus,
        },
        { status: 403 }
      );
    }

    const hackathonId = activeProfile?.hackathonId || requestedHackathonId;
    if (!hackathonId) {
      return NextResponse.json({ error: "hackathonId is required" }, { status: 400 });
    }

    const criteria = activeProfile?.hackathon.rubricCriteria || [];

    // Fetch all submissions for this hackathon
    const submissions = await prisma.submission.findMany({
      where: {
        team: {
          hackathonId,
        },
      },
      include: {
        team: {
          include: {
            problemStatement: true,
            codeRepo: true,
            leadStudent: { include: { user: { select: { name: true, email: true } } } },
            members: { include: { student: { include: { user: { select: { name: true } } } } } },
          },
        },
        scores: {
          where: activeProfile ? { judgeId: activeProfile.id } : {},
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    return NextResponse.json({
      hackathon: activeProfile?.hackathon,
      approvalStatus: activeProfile?.approvalStatus || "APPROVED",
      judgeId: activeProfile?.id,
      criteria,
      submissions,
    });
  } catch (error: any) {
    console.error("[Judge Submissions Error]:", error);
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
  }
}
