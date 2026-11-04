import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET /api/v1/admin/hosts — List all host profiles with status (SUPER_ADMIN only)
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Super Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || ""; // PENDING, APPROVED, PAUSED, REJECTED

    const hosts = await prisma.hostProfile.findMany({
      where: status ? { approvalStatus: status } : {},
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            hackathons: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ hosts });
  } catch (error: any) {
    console.error("[Admin Hosts GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch hosts" }, { status: 500 });
  }
}

// PATCH /api/v1/admin/hosts — Update host profile details or approval status
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Super Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { hostId, orgName, type, approvalStatus, website, upiId, bio } = body;

    if (!hostId) {
      return NextResponse.json({ error: "hostId is required" }, { status: 400 });
    }

    const updateData: any = {};
    if (orgName !== undefined) updateData.orgName = orgName;
    if (type !== undefined) updateData.type = type;
    if (approvalStatus !== undefined) updateData.approvalStatus = approvalStatus;
    if (website !== undefined) updateData.website = website;
    if (upiId !== undefined) updateData.upiId = upiId;
    if (bio !== undefined) updateData.bio = bio;

    const updated = await prisma.hostProfile.update({
      where: { id: hostId },
      data: updateData,
      include: { user: { select: { email: true, name: true } } },
    });

    await writeAuditLog(session.userId, "UPDATE_HOST_PROFILE", "HostProfile", hostId, {
      updatedFields: updateData,
      orgName: updated.orgName,
      adminEmail: session.email,
    });

    return NextResponse.json({
      success: true,
      message: `Host profile ${updated.orgName} updated successfully`,
      host: updated,
    });
  } catch (error: any) {
    console.error("[Admin Hosts PATCH Error]:", error);
    return NextResponse.json({ error: error?.message || "Failed to update host" }, { status: 500 });
  }
}

// DELETE /api/v1/admin/hosts — Delete host profile and cascaded records (SUPER_ADMIN only)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Super Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    let hostId = searchParams.get("id");

    if (!hostId) {
      try {
        const body = await req.json();
        hostId = body.hostId || body.id;
      } catch {}
    }

    if (!hostId) {
      return NextResponse.json({ error: "hostId is required" }, { status: 400 });
    }

    const host = await prisma.hostProfile.findUnique({
      where: { id: hostId },
      include: {
        hackathons: { select: { id: true } },
        user: { select: { name: true, email: true } },
      },
    });

    if (!host) {
      return NextResponse.json({ error: "Host profile not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Delete hackathons if any
      for (const h of host.hackathons) {
        const teams = await tx.team.findMany({ where: { hackathonId: h.id }, select: { id: true } });
        const teamIds = teams.map((t) => t.id);
        if (teamIds.length) {
          await tx.submission.deleteMany({ where: { teamId: { in: teamIds } } });
          await tx.payment.deleteMany({ where: { teamId: { in: teamIds } } });
          await tx.teamMember.deleteMany({ where: { teamId: { in: teamIds } } });
          await tx.team.deleteMany({ where: { id: { in: teamIds } } });
        }
        await tx.rubricCriterion.deleteMany({ where: { hackathonId: h.id } });
        await tx.problemStatement.deleteMany({ where: { domain: { hackathonId: h.id } } });
        await tx.domain.deleteMany({ where: { hackathonId: h.id } });
        await tx.hackathon.delete({ where: { id: h.id } });
      }

      await tx.hostProfile.delete({ where: { id: hostId } });
    });

    await writeAuditLog(session.userId, "SUPER_ADMIN_DELETE_HOST", "HostProfile", hostId, {
      deletedOrg: host.orgName,
      userEmail: host.user?.email,
      adminEmail: session.email,
    });

    return NextResponse.json({
      success: true,
      message: `Host profile ${host.orgName} permanently deleted`,
    });
  } catch (error: any) {
    console.error("[Admin Hosts DELETE Error]:", error);
    return NextResponse.json({ error: error?.message || "Failed to delete host" }, { status: 500 });
  }
}
