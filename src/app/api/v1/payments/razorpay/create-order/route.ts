import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/v1/payments/razorpay/create-order — Create Razorpay order
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "STUDENT") {
      return NextResponse.json({ error: "Student authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const { teamId } = body;

    if (!teamId) {
      return NextResponse.json({ error: "teamId is required" }, { status: 400 });
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
        { error: "Only the designated team lead can initiate checkout" },
        { status: 403 }
      );
    }

    if (team.payment?.status === "VERIFIED") {
      return NextResponse.json(
        { error: "Team payment has already been verified" },
        { status: 400 }
      );
    }

    const amountInINR = team.payment?.amount || team.hackathon.fee || 0;
    const amountInPaise = Math.round(amountInINR * 100);

    const keyId = process.env.RAZORPAY_KEY_ID || "rzp_test_mock_hackbridge";
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    let orderId: string;

    // If real keys are present and not mock, call Razorpay Orders API
    if (keySecret && !keyId.includes("mock")) {
      const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: "INR",
          receipt: `rcpt_${team.id.slice(0, 8)}`,
          notes: {
            teamId: team.id,
            teamName: team.name,
            hackathonTitle: team.hackathon.title,
          },
        }),
      });

      if (!rzpRes.ok) {
        const rzpErr = await rzpRes.json();
        console.error("[Razorpay API Error]:", rzpErr);
        throw new Error(rzpErr.error?.description || "Razorpay order creation failed");
      }

      const rzpData = await rzpRes.json();
      orderId = rzpData.id;
    } else {
      // Deterministic sandbox mock order ID for testing / development without live merchant keys
      orderId = `order_mock_${Date.now()}_${team.id.slice(0, 6)}`;
    }

    // Update payment record with orderId
    await prisma.payment.update({
      where: { teamId: team.id },
      data: {
        razorpayOrderId: orderId,
        mode: "RAZORPAY",
      },
    });

    return NextResponse.json({
      orderId,
      amount: amountInPaise,
      amountINR: amountInINR,
      currency: "INR",
      keyId,
      isSandbox: !keySecret || keyId.includes("mock"),
      hackathonTitle: team.hackathon.title,
      teamName: team.name,
    });
  } catch (error: any) {
    console.error("[Razorpay Create Order Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create payment order" },
      { status: 500 }
    );
  }
}
