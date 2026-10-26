import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/v1/host/payments — List payments across all hackathons owned by host
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "HOST" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Host or Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // PENDING, VERIFIED, REJECTED
    const hackathonId = searchParams.get("hackathonId");

    let hostProfileId: string | undefined;

    if (session.role === "HOST") {
      const host = await prisma.hostProfile.findUnique({
        where: { userId: session.userId },
      });
      if (!host) {
        return NextResponse.json({ error: "Host profile not found" }, { status: 404 });
      }
      hostProfileId = host.id;
    }

    const payments = await prisma.payment.findMany({
      where: {
        ...(status ? { status } : {}),
        team: {
          hackathon: {
            ...(hostProfileId ? { hostId: hostProfileId } : {}),
            ...(hackathonId ? { id: hackathonId } : {}),
          },
        },
      },
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
            members: {
              include: {
                student: {
                  include: {
                    user: { select: { name: true, email: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ payments });
  } catch (error: any) {
    console.error("[Host Payments GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}
