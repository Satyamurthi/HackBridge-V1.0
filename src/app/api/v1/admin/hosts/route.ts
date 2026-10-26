import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/v1/admin/hosts — List all host profiles with status (SUPER_ADMIN only)
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Super Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || ""; // PENDING, APPROVED, PAUSED, REJECTED

    const hosts = await prisma.hostProfile.findMany({
      where: status ? { approvalStatus: status } : {},
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            hackathons: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({ hosts });
  } catch (error: any) {
    console.error("[Admin Hosts GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch hosts" }, { status: 500 });
  }
}
