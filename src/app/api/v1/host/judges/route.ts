import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/v1/host/judges — List judges across host's hackathons
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "HOST" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Host or Admin clearance required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const hackathonId = searchParams.get("hackathonId");
    const status = searchParams.get("status"); // PENDING, APPROVED, REJECTED

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

    const judges = await prisma.judgeProfile.findMany({
      where: {
        ...(status ? { approvalStatus: status } : {}),
        hackathon: {
          ...(hostProfileId ? { hostId: hostProfileId } : {}),
          ...(hackathonId ? { id: hackathonId } : {}),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        hackathon: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ judges });
  } catch (error: any) {
    console.error("[Host Judges GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch judges" }, { status: 500 });
  }
}
