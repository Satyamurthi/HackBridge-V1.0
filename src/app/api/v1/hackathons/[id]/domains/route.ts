import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET /api/v1/hackathons/[id]/domains — list domains (public, returns all with PS titles)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const hackathon = await prisma.hackathon.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        domains: {
          include: {
            problemStatements: {
              select: { id: true, title: true, difficulty: true, attachmentUrl: true, attachmentName: true, cap: true },
              orderBy: { createdAt: "asc" },
            },
            _count: {
              select: { registeredTeams: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }

    return NextResponse.json({ domains: (hackathon as any).domains || [] });
  } catch (error: any) {
    console.error("[Domains GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch domains" }, { status: 500 });
  }
}

// POST /api/v1/hackathons/[id]/domains — host creates a domain with problem statements
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "HOST" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Host authentication required" }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { name, description, revealAt, problemStatements } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Domain name is required" }, { status: 400 });
    }

    if (!revealAt) {
      return NextResponse.json({ error: "Domain reveal time (revealAt) is required" }, { status: 400 });
    }

    // Verify the hackathon belongs to this host
    const hackathon = await prisma.hackathon.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: { host: true },
    });

    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }

    if (session.role === "HOST") {
      const hostProfile = await prisma.hostProfile.findUnique({
        where: { userId: session.userId },
      });
      if (!hostProfile || hackathon.hostId !== hostProfile.id) {
        return NextResponse.json({ error: "You can only manage your own hackathons" }, { status: 403 });
      }
    }

    // Create domain with problem statements
    const domain = await prisma.domain.create({
      data: {
        hackathonId: hackathon.id,
        name: name.trim(),
        description: description?.trim() || null,
        revealAt: new Date(revealAt),
        problemStatements: {
          create: Array.isArray(problemStatements)
            ? problemStatements
                .filter((ps: any) => ps?.title?.trim())
                .map((ps: any) => ({
                  title: ps.title.trim(),
                  description: ps.description?.trim() || "",
                  difficulty: ps.difficulty || "MEDIUM",
                  attachmentUrl: ps.attachmentUrl || null,
                  attachmentName: ps.attachmentName || null,
                  cap: Number(ps.cap) || 0,
                }))
            : [],
        },
      },
      include: {
        problemStatements: true,
        _count: {
          select: { registeredTeams: true },
        },
      },
    });

    await writeAuditLog(session.userId, "DOMAIN_CREATED", "domain", domain.id, {
      hackathonTitle: hackathon.title,
      domainName: domain.name,
      statementsCount: (domain as any).problemStatements?.length || 0,
    });

    return NextResponse.json({
      success: true,
      domain,
      message: `Domain "${domain.name}" created with ${(domain as any).problemStatements?.length || 0} problem statements.`,
    });
  } catch (error: any) {
    console.error("[Domain Create Error]:", error);
    return NextResponse.json({ error: "Failed to create domain" }, { status: 500 });
  }
}

// DELETE /api/v1/hackathons/[id]/domains?domainId=xxx — host deletes a domain
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "HOST" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Host authentication required" }, { status: 401 });
    }

    const { id } = params;
    const { searchParams } = new URL(req.url);
    const domainId = searchParams.get("domainId");

    if (!domainId) {
      return NextResponse.json({ error: "domainId query parameter is required" }, { status: 400 });
    }

    const domain = await prisma.domain.findUnique({
      where: { id: domainId },
      include: { hackathon: { include: { host: true } } },
    });

    if (!domain || domain.hackathon.id !== id && domain.hackathon.slug !== id) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    if (session.role === "HOST") {
      const hostProfile = await prisma.hostProfile.findUnique({ where: { userId: session.userId } });
      if (!hostProfile || domain.hackathon.hostId !== hostProfile.id) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    await prisma.domain.delete({ where: { id: domainId } });

    return NextResponse.json({ success: true, message: "Domain deleted" });
  } catch (error: any) {
    console.error("[Domain Delete Error]:", error);
    return NextResponse.json({ error: "Failed to delete domain" }, { status: 500 });
  }
}

// PATCH /api/v1/hackathons/[id]/domains — host updates a domain's details and revealAt time
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "HOST" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Host authentication required" }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { domainId, name, description, revealAt } = body;

    if (!domainId) {
      return NextResponse.json({ error: "domainId is required" }, { status: 400 });
    }

    const domain = await prisma.domain.findUnique({
      where: { id: domainId },
      include: { hackathon: { include: { host: true } } },
    });

    if (!domain || (domain.hackathon.id !== id && domain.hackathon.slug !== id)) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    if (session.role === "HOST") {
      const hostProfile = await prisma.hostProfile.findUnique({ where: { userId: session.userId } });
      if (!hostProfile || domain.hackathon.hostId !== hostProfile.id) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    const updateData: Record<string, any> = {};
    if (name?.trim()) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (revealAt) {
      updateData.revealAt = new Date(revealAt);
    }

    const updated = await prisma.domain.update({
      where: { id: domainId },
      data: updateData,
      include: {
        problemStatements: true,
      },
    });

    await writeAuditLog(session.userId, "DOMAIN_UPDATED", "domain", domainId, {
      hackathonTitle: domain.hackathon.title,
      domainName: updated.name,
      revealAt: updated.revealAt.toISOString(),
    });

    return NextResponse.json({
      success: true,
      domain: updated,
      message: `Domain "${updated.name}" updated successfully.`,
    });
  } catch (error: any) {
    console.error("[Domain Update Error]:", error);
    return NextResponse.json({ error: "Failed to update domain" }, { status: 500 });
  }
}

