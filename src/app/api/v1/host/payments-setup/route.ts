import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { encrypt, maskKey } from "@/lib/encryption";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET /api/v1/host/payments-setup
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "HOST" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Host authorization required" }, { status: 401 });
    }

    const host = await prisma.hostProfile.findUnique({
      where: { userId: session.userId },
    });

    if (!host) {
      return NextResponse.json({ error: "Host profile not found" }, { status: 404 });
    }

    return NextResponse.json({
      setup: {
        razorpayKeyId: host.razorpayKeyId || "",
        maskedKeyId: host.razorpayKeyId ? maskKey(host.razorpayKeyId) : "",
        hasSecret: Boolean(host.razorpayKeySecret),
        upiId: host.upiId || "",
        bankAccountName: host.bankAccountName || "",
        qrImageUrl: host.qrImageUrl || "",
        isConfigured: Boolean((host.razorpayKeyId && host.razorpayKeySecret) || (host.upiId && host.qrImageUrl)),
      },
    });
  } catch (error: any) {
    console.error("[Payments Setup GET Error]:", error);
    return NextResponse.json({ error: "Failed to load payment credentials" }, { status: 500 });
  }
}

// POST /api/v1/host/payments-setup
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "HOST" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Host authorization required" }, { status: 401 });
    }

    const host = await prisma.hostProfile.findUnique({
      where: { userId: session.userId },
    });

    if (!host) {
      return NextResponse.json({ error: "Host profile not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { razorpayKeyId, razorpayKeySecret, upiId, bankAccountName, qrImageUrl } = body;

    const updateData: any = {};

    if (razorpayKeyId !== undefined) {
      updateData.razorpayKeyId = razorpayKeyId.trim() || null;
    }

    if (razorpayKeySecret !== undefined && razorpayKeySecret.trim()) {
      // Store encrypted on server, never plain text
      updateData.razorpayKeySecret = encrypt(razorpayKeySecret.trim());
    }

    if (upiId !== undefined) {
      updateData.upiId = upiId.trim() || null;
    }

    if (bankAccountName !== undefined) {
      updateData.bankAccountName = bankAccountName.trim() || null;
    }

    if (qrImageUrl !== undefined) {
      updateData.qrImageUrl = qrImageUrl.trim() || null;
    }

    const updatedHost = await prisma.hostProfile.update({
      where: { id: host.id },
      data: updateData,
    });

    await writeAuditLog(
      session.userId,
      "UPDATE_PAYMENTS_SETUP",
      "HostProfile",
      host.id,
      {
        hasRazorpayKey: Boolean(updatedHost.razorpayKeyId),
        hasRazorpaySecret: Boolean(updatedHost.razorpayKeySecret),
        hasUpiId: Boolean(updatedHost.upiId),
        hasQrImage: Boolean(updatedHost.qrImageUrl),
      }
    );

    return NextResponse.json({
      message: "Payment credentials saved successfully",
      setup: {
        razorpayKeyId: updatedHost.razorpayKeyId || "",
        maskedKeyId: updatedHost.razorpayKeyId ? maskKey(updatedHost.razorpayKeyId) : "",
        hasSecret: Boolean(updatedHost.razorpayKeySecret),
        upiId: updatedHost.upiId || "",
        bankAccountName: updatedHost.bankAccountName || "",
        qrImageUrl: updatedHost.qrImageUrl || "",
        isConfigured: Boolean(
          (updatedHost.razorpayKeyId && updatedHost.razorpayKeySecret) ||
          (updatedHost.upiId && updatedHost.qrImageUrl)
        ),
      },
    });
  } catch (error: any) {
    console.error("[Payments Setup POST Error]:", error);
    return NextResponse.json({ error: "Failed to save payment setup" }, { status: 500 });
  }
}
