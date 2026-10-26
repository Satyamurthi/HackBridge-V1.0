import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

// PATCH /api/v1/host/judges/[judgeId] — Host approves or rejects a judge applicant (PRD Rule 5)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { judgeId: string } }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "HOST" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Host or Admin clearance required" }, { status: 403 });
    }

    const { judgeId } = params;
    const body = await req.json();
    const { action } = body; // "APPROVE" or "REJECT"

    if (!["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json({ error: "action must be APPROVE or REJECT" }, { status: 400 });
    }

    const judge = await prisma.judgeProfile.findUnique({
      where: { id: judgeId },
      include: {
        hackathon: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!judge) {
      return NextResponse.json({ error: "Judge application not found" }, { status: 404 });
    }

    // Verify host ownership
    if (session.role === "HOST") {
      const host = await prisma.hostProfile.findUnique({
        where: { userId: session.userId },
      });
      if (!host || judge.hackathon.hostId !== host.id) {
        return NextResponse.json(
          { error: "You can only manage judges for your own hackathon track" },
          { status: 403 }
        );
      }
    }

    const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

    const updated = await prisma.judgeProfile.update({
      where: { id: judgeId },
      data: { approvalStatus: newStatus },
    });

    await writeAuditLog(
      session.userId,
      action === "APPROVE" ? "JUDGE_APPROVED" : "JUDGE_REJECTED",
      "judge",
      judgeId,
      {
        judgeName: judge.user.name,
        judgeEmail: judge.user.email,
        hackathonTitle: judge.hackathon.title,
        status: newStatus,
      }
    );

    return NextResponse.json({
      success: true,
      judge: updated,
      message: `Judge ${judge.user.name} has been ${newStatus.toLowerCase()}.`,
    });
  } catch (error: any) {
    console.error("[Judge Decision Error]:", error);
    return NextResponse.json({ error: "Failed to update judge status" }, { status: 500 });
  }
}
