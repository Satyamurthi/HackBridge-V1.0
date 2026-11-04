import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET /api/v1/host/profile — Fetch current host profile and user details
export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== "HOST" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Host or Admin access required" }, { status: 403 });
    }

    const host = await prisma.hostProfile.findUnique({
      where: { userId: session.userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            status: true,
          },
        },
      },
    });

    if (!host) {
      return NextResponse.json({ error: "Host profile not found" }, { status: 404 });
    }

    return NextResponse.json({ host });
  } catch (error: any) {
    console.error("[Host Profile GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch host profile" }, { status: 500 });
  }
}

// PATCH /api/v1/host/profile — Update host profile details and coordinator info
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "HOST" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Host or Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const {
      orgName,
      type,
      website,
      bio,
      city,
      address,
      upiId,
      bankAccountName,
      coordinatorName,
      coordinatorPhone,
    } = body;

    const host = await prisma.hostProfile.findUnique({
      where: { userId: session.userId },
    });

    if (!host) {
      return NextResponse.json({ error: "Host profile not found" }, { status: 404 });
    }

    // Update HostProfile and optionally User (for coordinator name & phone)
    const updated = await prisma.$transaction(async (tx) => {
      if (coordinatorName !== undefined || coordinatorPhone !== undefined) {
        await tx.user.update({
          where: { id: session.userId },
          data: {
            ...(coordinatorName !== undefined ? { name: String(coordinatorName).trim() } : {}),
            ...(coordinatorPhone !== undefined ? { phone: String(coordinatorPhone).trim() } : {}),
          },
        });
      }

      return tx.hostProfile.update({
        where: { id: host.id },
        data: {
          ...(orgName !== undefined ? { orgName: String(orgName).trim() } : {}),
          ...(type !== undefined ? { type: String(type).trim() } : {}),
          ...(website !== undefined ? { website: website ? String(website).trim() : null } : {}),
          ...(bio !== undefined ? { bio: bio ? String(bio).trim() : null } : {}),
          ...(city !== undefined ? { city: city ? String(city).trim() : null } : {}),
          ...(address !== undefined ? { address: address ? String(address).trim() : null } : {}),
          ...(upiId !== undefined ? { upiId: upiId ? String(upiId).trim() : null } : {}),
          ...(bankAccountName !== undefined ? { bankAccountName: bankAccountName ? String(bankAccountName).trim() : null } : {}),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
              status: true,
            },
          },
        },
      });
    });

    await writeAuditLog(session.userId, "HOST_PROFILE_UPDATED", "host_profile", host.id, {
      orgName: updated.orgName,
      type: updated.type,
      city: updated.city,
    });

    return NextResponse.json({
      success: true,
      message: "Host profile updated successfully",
      host: updated,
    });
  } catch (error: any) {
    console.error("[Host Profile PATCH Error]:", error);
    return NextResponse.json({ error: "Failed to update host profile" }, { status: 500 });
  }
}
