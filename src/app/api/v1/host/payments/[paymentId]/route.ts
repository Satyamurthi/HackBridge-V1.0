import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { generateTeamId } from "@/lib/id-generator";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

// PATCH /api/v1/host/payments/[paymentId] — Approve or reject payment proof
export async function PATCH(
  req: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "HOST" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Host or Admin access required" }, { status: 403 });
    }

    const { paymentId } = params;
    const body = await req.json();
    const { action } = body; // "APPROVE" or "REJECT"

    if (!["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json(
        { error: "action must be APPROVE or REJECT" },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        team: {
          include: {
            hackathon: true,
            leadStudent: {
              include: { user: { select: { name: true, email: true } } },
            },
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Verify ownership if host
    if (session.role === "HOST") {
      const host = await prisma.hostProfile.findUnique({
        where: { userId: session.userId },
      });
      if (!host || payment.team.hackathon.hostId !== host.id) {
        return NextResponse.json(
          { error: "You can only manage payments for your own hackathons" },
          { status: 403 }
        );
      }
    }

    if (action === "APPROVE") {
      const officialTeamId = generateTeamId();

      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: "VERIFIED",
            approvedBy: session.userId,
            verifiedAt: new Date(),
          },
        });

        await tx.team.update({
          where: { id: payment.teamId },
          data: {
            teamId: officialTeamId,
            status: "ACTIVE",
          },
        });
      });

      await writeAuditLog(session.userId, "PAYMENT_APPROVED", "payment", paymentId, {
        teamName: payment.team.name,
        teamId: officialTeamId,
        hackathonTitle: payment.team.hackathon.title,
        amount: payment.amount,
        txnRef: payment.txnRef,
        leadEmail: payment.team.leadStudent.user.email,
      });

      return NextResponse.json({
        success: true,
        action: "APPROVE",
        teamId: officialTeamId,
        message: `Payment approved! Official Team ID ${officialTeamId} issued.`,
      });
    } else {
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: "REJECTED",
        },
      });

      await writeAuditLog(session.userId, "PAYMENT_REJECTED", "payment", paymentId, {
        teamName: payment.team.name,
        hackathonTitle: payment.team.hackathon.title,
        txnRef: payment.txnRef,
      });

      return NextResponse.json({
        success: true,
        action: "REJECT",
        message: "Payment rejected.",
      });
    }
  } catch (error: any) {
    console.error("[Host Payment PATCH Error]:", error);
    return NextResponse.json({ error: "Failed to update payment status" }, { status: 500 });
  }
}
