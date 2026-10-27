import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/v1/host/hackathons — List hackathons created by the authenticated host
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "HOST") {
      return NextResponse.json({ error: "Host authentication required" }, { status: 401 });
    }

    const hostProfile = await prisma.hostProfile.findUnique({
      where: { userId: session.userId },
    });
    if (!hostProfile) {
      return NextResponse.json({ error: "Host profile not found" }, { status: 404 });
    }

    const hackathons = await prisma.hackathon.findMany({
      where: { hostId: hostProfile.id },
      include: {
        domains: {
          include: {
            problemStatements: {
              select: { id: true, title: true },
            },
          },
        },
        _count: {
          select: {
            teams: true,
            judges: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      hackathons,
      host: {
        id: hostProfile.id,
        orgName: hostProfile.orgName,
        type: hostProfile.type,
        approvalStatus: hostProfile.approvalStatus,
        rejectionReason: hostProfile.rejectionReason,
        hackId: hostProfile.hackId,
        city: hostProfile.city,
      },
    });
  } catch (error: any) {
    console.error("[Host Hackathons GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch host hackathons" }, { status: 500 });
  }
}
