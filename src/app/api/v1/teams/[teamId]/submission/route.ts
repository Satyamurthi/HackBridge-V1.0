import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createBulkNotifications } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// GET /api/v1/teams/[teamId]/submission — Fetch team submission
export async function GET(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { teamId } = params;

    const team = await prisma.team.findFirst({
      where: {
        OR: [{ id: teamId }, { teamId }],
      },
      include: {
        submission: true,
        members: { include: { student: true } },
        hackathon: true,
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const isMember = team.members.some((m) => m.student.userId === session.userId);
    const isHostOrAdmin = ["HOST", "SUPER_ADMIN", "JUDGE"].includes(session.role);

    if (!isMember && !isHostOrAdmin) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ submission: team.submission });
  } catch (error: any) {
    console.error("[Submission GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch submission" }, { status: 500 });
  }
}

// POST /api/v1/teams/[teamId]/submission — One-time immutable final submission (PRD Rule 7)
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
    const { link, fileUrl, description } = body;

    if (!description?.trim()) {
      return NextResponse.json(
        { error: "A detailed description of the project and how it works is required" },
        { status: 400 }
      );
    }

    const team = await prisma.team.findFirst({
      where: {
        OR: [{ id: teamId }, { teamId }],
      },
      include: {
        leadStudent: true,
        submission: true,
        hackathon: true,
        members: { include: { student: true } },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    if (team.leadStudent.userId !== session.userId) {
      return NextResponse.json(
        { error: "Only the designated team lead can finalize the submission" },
        { status: 403 }
      );
    }

    // PRD Non-Negotiable Rule 7: Final submission is immutable once confirmed; only the host can unlock
    if (team.submission && team.submission.locked) {
      return NextResponse.json(
        {
          error: "PRD Rule 7: Your submission has been locked and confirmed. Only the host can unlock it for revisions.",
        },
        { status: 403 }
      );
    }

    // Save submission and mark locked
    const submission = await prisma.$transaction(async (tx) => {
      const sub = await tx.submission.upsert({
        where: { teamId: team.id },
        update: {
          link: link?.trim() || null,
          fileUrl: fileUrl?.trim() || null,
          description: description.trim(),
          submittedAt: new Date(),
          locked: true,
        },
        create: {
          teamId: team.id,
          link: link?.trim() || null,
          fileUrl: fileUrl?.trim() || null,
          description: description.trim(),
          submittedAt: new Date(),
          locked: true,
        },
      });

      await tx.team.update({
        where: { id: team.id },
        data: { status: "SUBMITTED" },
      });

      return sub;
    });

    await writeAuditLog(session.userId, "TEAM_SUBMISSION_LOCKED", "team", team.id, {
      teamName: team.name,
      teamId: team.teamId,
      hackathonTitle: team.hackathon.title,
      link: link?.trim() || null,
    });

    // Notify all squad members
    const memberUserIds = team.members.map((m) => m.student.userId);
    await createBulkNotifications(memberUserIds, "SUBMISSION_LOCKED", {
      title: "Project Submission Locked",
      message: `Final project submission for "${team.hackathon.title}" has been permanently locked for evaluation.`,
      link: `/dashboard/student/arena?teamId=${team.id}`,
      metadata: { teamId: team.id, hackathonId: team.hackathon.id },
    });

    return NextResponse.json({
      success: true,
      submission,
      message: "Submission finalized and locked successfully. Recorded to audit trail.",
    });
  } catch (error: any) {
    console.error("[Submission POST Error]:", error);
    return NextResponse.json({ error: "Failed to finalize submission" }, { status: 500 });
  }
}
