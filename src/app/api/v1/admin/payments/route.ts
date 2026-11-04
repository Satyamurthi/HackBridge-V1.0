import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { generateTeamId } from "@/lib/id-generator";

export const dynamic = "force-dynamic";

// GET /api/v1/admin/payments — List platform payments (Razorpay + UPI QR proofs)
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Super Admin clearance required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status") || "ALL";

    const whereClause: any = {};
    if (statusFilter !== "ALL") {
      whereClause.status = statusFilter;
    }

    const payments = await prisma.payment.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        team: {
          include: {
            hackathon: {
              select: {
                id: true,
                title: true,
                slug: true,
                fee: true,
                paymentMode: true,
              },
            },
            leadStudent: {
              include: {
                user: { select: { name: true, email: true } },
              },
            },
          },
        },
      },
      take: 100,
    });

    const totalRevenue = await prisma.payment.aggregate({
      where: { status: "VERIFIED" },
      _sum: { amount: true },
    });

    const counts = {
      total: await prisma.payment.count(),
      verified: await prisma.payment.count({ where: { status: "VERIFIED" } }),
      pending: await prisma.payment.count({ where: { status: "PENDING" } }),
      rejected: await prisma.payment.count({ where: { status: "REJECTED" } }),
      totalRevenue: totalRevenue._sum.amount || 0,
    };

    return NextResponse.json({ payments, counts });
  } catch (error) {
    console.error("[Admin Payments GET Error]:", error);
    return NextResponse.json({ error: "Failed to load platform payments" }, { status: 500 });
  }
}

// PATCH /api/v1/admin/payments — Verify or Reject a payment
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Super Admin clearance required" }, { status: 403 });
    }

    const body = await req.json();
    const { paymentId, status } = body;

    if (!paymentId || !["VERIFIED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Valid paymentId and status are required" }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { team: true },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
    }

    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status,
        verifiedAt: status === "VERIFIED" ? new Date() : null,
        approvedBy: session.userId,
      },
    });

    // If verified, activate the team and issue official TEAM-XXXXXX ID if missing
    if (status === "VERIFIED" && payment.team) {
      const assignedTeamId = payment.team.teamId || generateTeamId();
      await prisma.team.update({
        where: { id: payment.teamId },
        data: {
          status: "ACTIVE",
          teamId: assignedTeamId,
        },
      });
    }

    await writeAuditLog(session.userId, "ADMIN_PAYMENT_MODERATION", "Payment", paymentId, {
      newStatus: status,
      amount: payment.amount,
      teamId: payment.teamId,
    });

    return NextResponse.json({
      success: true,
      message: `Payment status set to ${status}`,
      payment: updatedPayment,
    });
  } catch (error) {
    console.error("[Admin Payments PATCH Error]:", error);
    return NextResponse.json({ error: "Failed to update payment status" }, { status: 500 });
  }
}

// DELETE /api/v1/admin/payments — Permanently remove a payment record (SUPER_ADMIN only)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Super Admin clearance required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    let paymentId = searchParams.get("id");

    if (!paymentId) {
      try {
        const body = await req.json();
        paymentId = body.paymentId || body.id;
      } catch {}
    }

    if (!paymentId) {
      return NextResponse.json({ error: "paymentId is required" }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    await prisma.payment.delete({
      where: { id: paymentId },
    });

    await writeAuditLog(session.userId, "SUPER_ADMIN_DELETE_PAYMENT", "Payment", paymentId, {
      amount: payment.amount,
      mode: payment.mode,
      teamId: payment.teamId,
      adminEmail: session.email,
    });

    return NextResponse.json({
      success: true,
      message: "Payment transaction deleted successfully",
    });
  } catch (error: any) {
    console.error("[Admin Payments DELETE Error]:", error);
    return NextResponse.json({ error: error?.message || "Failed to delete payment" }, { status: 500 });
  }
}

