import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET /api/v1/hackathons/[id] — Fetch a hackathon by ID or slug (public)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const hackathon = await prisma.hackathon.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        host: {
          select: {
            orgName: true,
            type: true,
            website: true,
          },
        },
        domains: {
          include: {
            problemStatements: {
              select: {
                id: true,
                title: true,
                cap: true,
                // description hidden until revealAt passes
              },
            },
          },
        },
        rubricCriteria: {
          select: { id: true, name: true, weight: true, maxScore: true },
        },
        _count: {
          select: { teams: true, judges: true },
        },
      },
    });

    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }

    // Mask problem statement descriptions unless domain revealAt has passed
    const now = new Date();
    const sanitized = {
      ...hackathon,
      domains: hackathon.domains.map((d) => ({
        ...d,
        revealed: new Date(d.revealAt) <= now,
        problemStatements: d.problemStatements.map((ps) => ({
          ...ps,
          // Don't send description server-side until revealed
        })),
      })),
    };

    return NextResponse.json({ hackathon: sanitized });
  } catch (error: any) {
    console.error("[Hackathon GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch hackathon" }, { status: 500 });
  }
}

// PATCH /api/v1/hackathons/[id] — Update a hackathon (HOST only, must own it)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const hackathon = await prisma.hackathon.findFirst({
      where: { id: params.id, hostId: hostProfile.id },
    });
    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found or not owned by you" }, { status: 404 });
    }

    const body = await req.json();
    const { action, ...fields } = body;

    // Handle publish action specifically
    if (action === "PUBLISH") {
      if (hostProfile.approvalStatus !== "APPROVED") {
        return NextResponse.json(
          { error: "Host not approved. Super Admin approval required before publishing." },
          { status: 403 }
        );
      }
      const updated = await prisma.hackathon.update({
        where: { id: params.id },
        data: { status: "PUBLISHED" },
      });
      await writeAuditLog(session.userId, "HACKATHON_PUBLISHED", "hackathon", params.id);
      return NextResponse.json({ hackathon: updated });
    }

    if (action === "ARCHIVE") {
      const updated = await prisma.hackathon.update({
        where: { id: params.id },
        data: { status: "ARCHIVED" },
      });
      await writeAuditLog(session.userId, "HACKATHON_ARCHIVED", "hackathon", params.id);
      return NextResponse.json({ hackathon: updated });
    }

    // Generic field update (only DRAFT hackathons are editable)
    if (hackathon.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only DRAFT hackathons can be edited." },
        { status: 400 }
      );
    }

    const allowedFields = [
      "title", "description", "rules", "rulesGate", "teamMin", "teamMax",
      "fee", "paymentMode", "qrImageUrl", "upiId", "bannerUrl", "prizePool",
      "startAt", "endAt",
    ];

    const updateData: Record<string, any> = {};
    for (const key of allowedFields) {
      if (key in fields) updateData[key] = fields[key];
    }

    if (fields.startAt) updateData.startAt = new Date(fields.startAt);
    if (fields.endAt) updateData.endAt = new Date(fields.endAt);

    const updated = await prisma.hackathon.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ hackathon: updated });
  } catch (error: any) {
    console.error("[Hackathon PATCH Error]:", error);
    return NextResponse.json({ error: "Failed to update hackathon" }, { status: 500 });
  }
}

// DELETE /api/v1/hackathons/[id] — Archive (soft delete) a hackathon (HOST or ADMIN)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || !["HOST", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.hackathon.update({
      where: { id: params.id },
      data: { status: "ARCHIVED" },
    });

    await writeAuditLog(session.userId, "HACKATHON_DELETED", "hackathon", params.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Hackathon DELETE Error]:", error);
    return NextResponse.json({ error: "Failed to archive hackathon" }, { status: 500 });
  }
}
