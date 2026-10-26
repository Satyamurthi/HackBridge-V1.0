import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { generateTeamId } from "@/lib/id-generator";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

// POST /api/v1/payments/razorpay/verify — Verifies payment and generates official Team ID
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "STUDENT") {
      return NextResponse.json({ error: "Student authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const { teamId, razorpayOrderId, razorpayPaymentId, razorpaySignature, isSandbox } = body;

    if (!teamId || !razorpayOrderId) {
      return NextResponse.json(
        { error: "teamId and razorpayOrderId are required" },
        { status: 400 }
      );
    }

    const team = await prisma.team.findFirst({
      where: {
        OR: [{ id: teamId }, { teamId }],
      },
      include: {
        leadStudent: true,
        payment: true,
        hackathon: true,
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    if (team.leadStudent.userId !== session.userId) {
      return NextResponse.json(
        { error: "Only the designated team lead can complete payment" },
        { status: 403 }
      );
    }

    if (team.payment?.status === "VERIFIED" && team.teamId) {
      return NextResponse.json({
        success: true,
        teamId: team.teamId,
        message: "Payment already verified",
      });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Verify cryptographic signature if in production with secret configured
    if (keySecret && !isSandbox && !razorpayOrderId.startsWith("order_mock_")) {
      const expectedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");

      if (expectedSignature !== razorpaySignature) {
        return NextResponse.json(
          { error: "Invalid payment signature verification" },
          { status: 400 }
        );
      }
    }

    const officialTeamId = generateTeamId();
    const paymentId = razorpayPaymentId || `pay_mock_${Date.now()}`;

    // Atomically activate team and verify payment
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { teamId: team.id },
        data: {
          razorpayPaymentId: paymentId,
          razorpayOrderId,
          status: "VERIFIED",
          verifiedAt: new Date(),
        },
      });

      await tx.team.update({
        where: { id: team.id },
        data: {
          teamId: officialTeamId,
          status: "ACTIVE",
        },
      });
    });

    await writeAuditLog(session.userId, "PAYMENT_VERIFIED", "team", team.id, {
      teamName: team.name,
      teamId: officialTeamId,
      hackathonTitle: team.hackathon.title,
      paymentMode: "RAZORPAY",
      razorpayPaymentId: paymentId,
      amount: team.payment?.amount,
    });

    return NextResponse.json({
      success: true,
      teamId: officialTeamId,
      message: `Payment verified successfully! Official Team ID ${officialTeamId} issued.`,
    });
  } catch (error: any) {
    console.error("[Razorpay Verify Error]:", error);
    return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 });
  }
}
