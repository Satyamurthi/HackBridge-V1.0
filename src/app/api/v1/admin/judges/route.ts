import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET /api/v1/admin/judges — List all judge assignments and approvals
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Super Admin clearance required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter =
      searchParams.get("approvalStatus") || searchParams.get("status") || "ALL";

    const whereClause: any = {};
    if (statusFilter !== "ALL") {
      whereClause.approvalStatus = statusFilter;
    }

    const judges = await prisma.judgeProfile.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
          },
        },
        hackathon: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        _count: {
          select: {
            scores: true,
          },
        },
      },
    });

    const formattedJudges = judges.map((j) => ({
      ...j,
      assignments: j.hackathon ? [{ id: j.id, hackathon: j.hackathon }] : [],
    }));

    const counts = {
      total: await prisma.judgeProfile.count(),
      approved: await prisma.judgeProfile.count({ where: { approvalStatus: "APPROVED" } }),
      pending: await prisma.judgeProfile.count({ where: { approvalStatus: "PENDING" } }),
      rejected: await prisma.judgeProfile.count({ where: { approvalStatus: "REJECTED" } }),
    };

    return NextResponse.json({ judges: formattedJudges, counts });
  } catch (error) {
    console.error("[Admin Judges GET Error]:", error);
    return NextResponse.json({ error: "Failed to load judges" }, { status: 500 });
  }
}

// PATCH /api/v1/admin/judges — Approve, reject, or edit judge assignment details
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Super Admin clearance required" }, { status: 403 });
    }

    const body = await req.json();
    const { judgeId, approvalStatus, designation, company } = body;

    if (!judgeId) {
      return NextResponse.json({ error: "judgeId is required" }, { status: 400 });
    }

    const updateData: any = {};
    if (approvalStatus) updateData.approvalStatus = approvalStatus;
    if (designation !== undefined) updateData.designation = designation;
    if (company !== undefined) updateData.company = company;

    const updated = await prisma.judgeProfile.update({
      where: { id: judgeId },
      data: updateData,
      include: { user: { select: { email: true, name: true } } },
    });

    await writeAuditLog(session.userId, "UPDATE_JUDGE_PROFILE", "JudgeProfile", judgeId, {
      updateData,
      judgeEmail: updated.user?.email,
      adminEmail: session.email,
    });

    return NextResponse.json({
      success: true,
      message: `Judge ${updated.user?.name || updated.user?.email} updated successfully`,
      judge: updated,
    });
  } catch (error) {
    console.error("[Admin Judges PATCH Error]:", error);
    return NextResponse.json({ error: "Failed to update judge profile" }, { status: 500 });
  }
}

// DELETE /api/v1/admin/judges — Delete judge profile assignment (SUPER_ADMIN only)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Super Admin clearance required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    let judgeId = searchParams.get("id");

    if (!judgeId) {
      try {
        const body = await req.json();
        judgeId = body.judgeId || body.id;
      } catch {}
    }

    if (!judgeId) {
      return NextResponse.json({ error: "judgeId is required" }, { status: 400 });
    }

    const judge = await prisma.judgeProfile.findUnique({
      where: { id: judgeId },
      include: { user: { select: { name: true, email: true } } },
    });

    if (!judge) {
      return NextResponse.json({ error: "Judge profile not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.score.deleteMany({ where: { judgeId } });
      await tx.judgeProfile.delete({ where: { id: judgeId } });
    });

    await writeAuditLog(session.userId, "SUPER_ADMIN_DELETE_JUDGE", "JudgeProfile", judgeId, {
      deletedEmail: judge.user?.email,
      adminEmail: session.email,
    });

    return NextResponse.json({
      success: true,
      message: `Judge assignment for ${judge.user?.name || judge.user?.email} removed successfully`,
    });
  } catch (error: any) {
    console.error("[Admin Judges DELETE Error]:", error);
    return NextResponse.json({ error: error?.message || "Failed to delete judge" }, { status: 500 });
  }
}
