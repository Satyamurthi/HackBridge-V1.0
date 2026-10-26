import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/v1/admin/site-content — Fetch site content (public or filtered by key)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (key) {
      const content = await prisma.siteContent.findUnique({
        where: { key },
      });
      if (!content) {
        return NextResponse.json({ error: "Content key not found" }, { status: 404 });
      }
      return NextResponse.json({ content });
    }

    const contents = await prisma.siteContent.findMany({
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ contents });
  } catch (error: any) {
    console.error("[SiteContent GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch site content" }, { status: 500 });
  }
}

// POST /api/v1/admin/site-content — Upsert site content (SUPER_ADMIN only, logs audit)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Super Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { key, jsonValue, published = true } = body;

    if (!key || typeof key !== "string" || !key.trim()) {
      return NextResponse.json({ error: "Content key is required" }, { status: 400 });
    }

    if (typeof jsonValue !== "string") {
      return NextResponse.json({ error: "jsonValue must be a valid serialized JSON string" }, { status: 400 });
    }

    // Verify valid JSON
    try {
      JSON.parse(jsonValue);
    } catch {
      return NextResponse.json({ error: "jsonValue must be parseable JSON" }, { status: 400 });
    }

    const content = await prisma.$transaction(async (tx) => {
      const existing = await tx.siteContent.findUnique({ where: { key: key.trim() } });
      const record = await tx.siteContent.upsert({
        where: { key: key.trim() },
        create: {
          key: key.trim(),
          jsonValue,
          published: Boolean(published),
          version: 1,
        },
        update: {
          jsonValue,
          published: Boolean(published),
          version: existing ? existing.version + 1 : 1,
        },
      });

      // PRD Rule 10: Audit Log
      await tx.auditLog.create({
        data: {
          actorId: session.userId,
          action: "UPDATE_SITE_CONTENT",
          entity: "SiteContent",
          entityId: record.id,
          metadata: JSON.stringify({
            key: record.key,
            version: record.version,
            published: record.published,
          }),
        },
      });

      return record;
    });

    return NextResponse.json({ success: true, content });
  } catch (error: any) {
    console.error("[SiteContent POST Error]:", error);
    return NextResponse.json({ error: "Failed to update site content" }, { status: 500 });
  }
}
