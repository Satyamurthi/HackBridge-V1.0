import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

// PATCH /api/v1/admin/hosts/[hostId] — Approve, pause, or reject a host (SUPER_ADMIN only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { hostId: string } }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Super Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { status, reason } = body; // APPROVED, PAUSED, REJECTED

    const allowedStatuses = ["APPROVED", "PAUSED", "REJECTED"];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Status must be one of: ${allowedStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const host = await prisma.hostProfile.findUnique({
      where: { id: params.hostId },
      include: { user: { select: { name: true, email: true } } },
    });

    if (!host) {
      return NextResponse.json({ error: "Host not found" }, { status: 404 });
    }

    const updated = await prisma.hostProfile.update({
      where: { id: params.hostId },
      data: { 
        approvalStatus: status,
        rejectionReason: status === "REJECTED" ? (reason || "Verification documentation failed institutional compliance check.") : null,
      },
    });

    const actionMap: Record<string, string> = {
      APPROVED: "HOST_APPROVED",
      PAUSED: "HOST_PAUSED",
      REJECTED: "HOST_REJECTED",
    };

    await writeAuditLog(
      session.userId,
      actionMap[status],
      "host",
      params.hostId,
      {
        orgName: host.orgName,
        representative: host.user.name,
        email: host.user.email,
        previousStatus: host.approvalStatus,
        newStatus: status,
      }
    );

    return NextResponse.json({ host: updated, message: `Host ${status.toLowerCase()} successfully` });
  } catch (error: any) {
    console.error("[Admin Host PATCH Error]:", error);
    return NextResponse.json({ error: "Failed to update host status" }, { status: 500 });
  }
}
