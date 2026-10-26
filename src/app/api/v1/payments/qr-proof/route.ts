import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

// POST /api/v1/payments/qr-proof — Team lead submits QR proof (UTR / transaction reference)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "STUDENT") {
      return NextResponse.json({ error: "Student authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const { teamId, txnRef, screenshotUrl } = body;

    if (!teamId || !txnRef?.trim()) {
      return NextResponse.json(
        { error: "teamId and txnRef (Transaction Reference / UTR) are required" },
        { status: 400 }
      );
    }

    // Verify caller is lead of this team
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
        { error: "Only the designated team lead can submit payment verification" },
        { status: 403 }
      );
    }

    if (!team.payment) {
      return NextResponse.json({ error: "No payment record found for this team" }, { status: 404 });
    }

    if (team.payment.status === "VERIFIED") {
      return NextResponse.json(
        { error: "Payment is already verified and confirmed" },
        { status: 400 }
      );
    }

    const updatedPayment = await prisma.payment.update({
      where: { id: team.payment.id },
      data: {
        txnRef: txnRef.trim(),
        screenshotUrl: screenshotUrl?.trim() || null,
        status: "PENDING", // awaiting host review
      },
    });

    await writeAuditLog(session.userId, "PAYMENT_PROOF_SUBMITTED", "payment", updatedPayment.id, {
      teamId: team.id,
      teamName: team.name,
      txnRef: txnRef.trim(),
      amount: updatedPayment.amount,
      hackathonTitle: team.hackathon.title,
    });

    return NextResponse.json({
      success: true,
      payment: updatedPayment,
      message: "Proof submitted successfully. Awaiting host verification.",
    });
  } catch (error: any) {
    console.error("[QR Proof Submit Error]:", error);
    return NextResponse.json({ error: "Failed to submit payment proof" }, { status: 500 });
  }
}
