import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET /api/v1/admin/hackathons — List and filter all hackathons (SUPER_ADMIN only)
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Super Admin clearance required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status") || "ALL";
    const query = searchParams.get("q") || "";

    const whereClause: any = {};
    if (statusFilter !== "ALL") {
      whereClause.status = statusFilter;
    }
    if (query.trim()) {
      whereClause.OR = [
        { title: { contains: query.trim() } },
        { slug: { contains: query.trim() } },
        { description: { contains: query.trim() } },
      ];
    }

    const hackathons = await prisma.hackathon.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        host: {
          select: {
            id: true,
            orgName: true,
            type: true,
            approvalStatus: true,
            upiId: true,
            user: { select: { email: true, name: true } },
          },
        },
        _count: {
          select: {
            teams: true,
            domains: true,
            judges: true,
            rubricCriteria: true,
          },
        },
      },
      take: 100,
    });

    const counts = {
      total: await prisma.hackathon.count(),
      published: await prisma.hackathon.count({ where: { status: "PUBLISHED" } }),
      draft: await prisma.hackathon.count({ where: { status: "DRAFT" } }),
      archived: await prisma.hackathon.count({ where: { status: "ARCHIVED" } }),
    };

    return NextResponse.json({ hackathons, counts });
  } catch (error) {
    console.error("[Admin Hackathons GET Error]:", error);
    return NextResponse.json({ error: "Failed to load hackathons" }, { status: 500 });
  }
}

// PATCH /api/v1/admin/hackathons — Full update of any hackathon field (SUPER_ADMIN only)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Super Admin clearance required" }, { status: 403 });
    }

    const body = await req.json();
    const {
      hackathonId,
      title,
      slug,
      description,
      rules,
      fee,
      paymentMode,
      upiId,
      qrImageUrl,
      bannerUrl,
      prizePool,
      teamMin,
      teamMax,
      registrationDeadline,
      startAt,
      endAt,
      status,
    } = body;

    if (!hackathonId) {
      return NextResponse.json({ error: "hackathonId is required" }, { status: 400 });
    }

    const existing = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (slug !== undefined) updateData.slug = slug;
    if (description !== undefined) updateData.description = description;
    if (rules !== undefined) updateData.rules = rules;
    if (fee !== undefined) updateData.fee = parseFloat(fee) || 0.0;
    if (paymentMode !== undefined) updateData.paymentMode = paymentMode;
    if (upiId !== undefined) updateData.upiId = upiId;
    if (qrImageUrl !== undefined) updateData.qrImageUrl = qrImageUrl;
    if (bannerUrl !== undefined) updateData.bannerUrl = bannerUrl;
    if (prizePool !== undefined) updateData.prizePool = prizePool;
    if (teamMin !== undefined) updateData.teamMin = parseInt(teamMin) || 1;
    if (teamMax !== undefined) updateData.teamMax = parseInt(teamMax) || 4;
    if (registrationDeadline !== undefined) {
      updateData.registrationDeadline = registrationDeadline ? new Date(registrationDeadline) : null;
    }
    if (startAt !== undefined) updateData.startAt = new Date(startAt);
    if (endAt !== undefined) updateData.endAt = new Date(endAt);
    if (status !== undefined) updateData.status = status;

    if (body.revealAt !== undefined && body.revealAt) {
      const revealDate = new Date(body.revealAt);
      await prisma.domain.updateMany({
        where: { hackathonId },
        data: { revealAt: revealDate },
      });
    }

    const updated = await prisma.hackathon.update({
      where: { id: hackathonId },
      data: updateData,
      include: {
        host: {
          select: { orgName: true },
        },
      },
    });

    await writeAuditLog(session.userId, "SUPER_ADMIN_UPDATE_HACKATHON", "Hackathon", hackathonId, {
      updatedFields: updateData,
      title: updated.title,
      adminEmail: session.email,
    });

    return NextResponse.json({
      success: true,
      message: `Hackathon "${updated.title}" updated successfully`,
      hackathon: updated,
    });
  } catch (error: any) {
    console.error("[Admin Hackathons PATCH Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update hackathon" },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/admin/hackathons — Permanently delete a hackathon and cascade all related data (SUPER_ADMIN only)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Super Admin clearance required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    let hackathonId = searchParams.get("id");

    if (!hackathonId) {
      try {
        const body = await req.json();
        hackathonId = body.hackathonId || body.id;
      } catch {
        // Body was empty or already consumed
      }
    }

    if (!hackathonId) {
      return NextResponse.json({ error: "hackathonId is required for deletion" }, { status: 400 });
    }

    const targetHackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
      include: {
        host: { select: { orgName: true } },
        teams: { select: { id: true } },
      },
    });

    if (!targetHackathon) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }

    // Safely delete all cascading data in transaction
    await prisma.$transaction(async (tx) => {
      const teamIds = targetHackathon.teams.map((t) => t.id);
      if (teamIds.length > 0) {
        await tx.score.deleteMany({ where: { submission: { teamId: { in: teamIds } } } });
        await tx.submission.deleteMany({ where: { teamId: { in: teamIds } } });
        await tx.payment.deleteMany({ where: { teamId: { in: teamIds } } });
        await tx.progressUpdate.deleteMany({ where: { teamId: { in: teamIds } } });
        await tx.codeRepo.deleteMany({ where: { teamId: { in: teamIds } } });
        await tx.result.deleteMany({ where: { hackathonId } });
        await tx.teamMember.deleteMany({ where: { teamId: { in: teamIds } } });
        await tx.team.deleteMany({ where: { hackathonId } });
      }

      await tx.rubricCriterion.deleteMany({ where: { hackathonId } });
      await tx.judgeProfile.deleteMany({ where: { hackathonId } });
      await tx.problemStatement.deleteMany({ where: { domain: { hackathonId } } });
      await tx.domain.deleteMany({ where: { hackathonId } });
      await tx.hackathon.delete({ where: { id: hackathonId } });
    });

    await writeAuditLog(session.userId, "SUPER_ADMIN_DELETE_HACKATHON", "Hackathon", hackathonId, {
      deletedTitle: targetHackathon.title,
      deletedSlug: targetHackathon.slug,
      hostOrg: targetHackathon.host?.orgName,
      adminEmail: session.email,
    });

    return NextResponse.json({
      success: true,
      message: `Hackathon "${targetHackathon.title}" and all related teams, submissions, and domains have been permanently deleted.`,
    });
  } catch (error: any) {
    console.error("[Admin Hackathons DELETE Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete hackathon" },
      { status: 500 }
    );
  }
}
