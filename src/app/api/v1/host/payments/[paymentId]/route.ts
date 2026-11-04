import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { generateTeamId } from "@/lib/id-generator";
import { writeAuditLog } from "@/lib/audit";
import { createNotification, createBulkNotifications } from "@/lib/notifications";

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
    const { action, utrNumber, txnRef, rejectionReason } = body; // "APPROVE", "REJECT", "UPDATE_UTR"

    if (!["APPROVE", "REJECT", "UPDATE_UTR"].includes(action)) {
      return NextResponse.json(
        { error: "action must be APPROVE, REJECT, or UPDATE_UTR" },
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
            members: {
              include: {
                student: true,
              },
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

    if (action === "UPDATE_UTR") {
      const cleanUtr = (utrNumber || txnRef || "").trim();
      const updated = await prisma.payment.update({
        where: { id: paymentId },
        data: {
          txnRef: cleanUtr || payment.txnRef,
        },
      });

      return NextResponse.json({
        success: true,
        action: "UPDATE_UTR",
        payment: updated,
        message: "UTR reference updated successfully.",
      });
    }

    if (action === "APPROVE") {
      const officialTeamId = generateTeamId();
      const verifiedUtr = (utrNumber || txnRef || "").trim() || payment.txnRef;

      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: "VERIFIED",
            approvedBy: session.userId,
            verifiedAt: new Date(),
            ...(verifiedUtr ? { txnRef: verifiedUtr } : {}),
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
        txnRef: verifiedUtr,
        leadEmail: payment.team.leadStudent.user.email,
      });

      // Dispatch in-app notifications to all squad members
      const memberUserIds = payment.team.members.map((m) => m.student.userId);
      await createBulkNotifications(memberUserIds, "PAYMENT_VERIFIED", {
        title: "Payment Verified & Squad Activated",
        message: `Your payment for "${payment.team.hackathon.title}" has been verified! Official Team ID ${officialTeamId} issued.`,
        link: "/dashboard/student",
        metadata: {
          teamId: officialTeamId,
          hackathonTitle: payment.team.hackathon.title,
          utrNumber: verifiedUtr,
        },
      });

      return NextResponse.json({
        success: true,
        action: "APPROVE",
        teamId: officialTeamId,
        utrNumber: verifiedUtr,
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
        rejectionReason: rejectionReason || "Payment proof could not be verified",
      });

      // Dispatch rejection notification to team lead
      await createNotification(payment.team.leadStudent.userId, "PAYMENT_REJECTED", {
        title: "Payment Verification Rejected",
        message: rejectionReason
          ? `Payment for team "${payment.team.name}" was rejected: ${rejectionReason}. Please re-submit verification.`
          : `Payment proof for team "${payment.team.name}" was rejected. Please review payment requirements or re-upload.`,
        link: "/dashboard/student",
        metadata: {
          teamId: payment.teamId,
          hackathonTitle: payment.team.hackathon.title,
          rejectionReason,
        },
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
