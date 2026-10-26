import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createBulkNotifications } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// PATCH /api/v1/host/submissions/[submissionId]/unlock — Host unlocks a submission with mandatory audit reason (PRD Rule 7)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { submissionId: string } }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "HOST" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Host or Admin clearance required" }, { status: 403 });
    }

    const { submissionId } = params;
    const body = await req.json();
    const { unlockReason } = body;

    if (!unlockReason?.trim()) {
      return NextResponse.json(
        { error: "A clear unlockReason is required for governance audit logging" },
        { status: 400 }
      );
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        team: {
          include: {
            hackathon: true,
            leadStudent: { include: { user: true } },
            members: { include: { student: true } },
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Verify host ownership
    if (session.role === "HOST") {
      const host = await prisma.hostProfile.findUnique({
        where: { userId: session.userId },
      });
      if (!host || submission.team.hackathon.hostId !== host.id) {
        return NextResponse.json(
          { error: "You can only unlock submissions for your own hackathon track" },
          { status: 403 }
        );
      }
    }

    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        locked: false,
        unlockedBy: session.userId,
        unlockReason: unlockReason.trim(),
      },
    });

    // Also update team status back to ACTIVE so they can re-submit
    await prisma.team.update({
      where: { id: submission.teamId },
      data: { status: "ACTIVE" },
    });

    await writeAuditLog(session.userId, "SUBMISSION_UNLOCKED", "submission", submissionId, {
      teamName: submission.team.name,
      teamId: submission.team.teamId,
      hackathonTitle: submission.team.hackathon.title,
      unlockReason: unlockReason.trim(),
    });

    // Notify all squad members
    const memberUserIds = submission.team.members.map((m) => m.student.userId);
    await createBulkNotifications(memberUserIds, "SUBMISSION_UNLOCKED", {
      title: "Project Submission Unlocked",
      message: `Your project submission for "${submission.team.hackathon.title}" was unlocked by host. Reason: ${unlockReason.trim()}`,
      link: `/dashboard/student/arena?teamId=${submission.team.id}`,
      metadata: {
        teamId: submission.team.id,
        hackathonId: submission.team.hackathon.id,
        reason: unlockReason.trim(),
      },
    });

    return NextResponse.json({
      success: true,
      submission: updated,
      message: `Submission for squad ${submission.team.name} unlocked. Reason recorded in audit trail.`,
    });
  } catch (error: any) {
    console.error("[Submission Unlock Error]:", error);
    return NextResponse.json({ error: "Failed to unlock submission" }, { status: 500 });
  }
}
