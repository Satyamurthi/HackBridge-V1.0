import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { CMS_DEFAULT_PAGES } from "@/lib/cms-defaults";

export const dynamic = "force-dynamic";

export interface SiteContentRecord {
  id: string;
  key: string;
  jsonValue: string;
  draftJsonValue?: string | null;
  version: number;
  published: boolean;
  history?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// GET /api/v1/admin/site-content — Fetch site content (SUPER_ADMIN or public query)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    const session = await getSession();

    if (key) {
      let content: SiteContentRecord | null = (await prisma.siteContent.findUnique({
        where: { key },
      })) as unknown as SiteContentRecord | null;

      // If not yet saved in database, seed with default structure
      if (!content) {
        const defaultDef = CMS_DEFAULT_PAGES.find((p) => p.key === key);
        if (defaultDef) {
          const defaultJson = JSON.stringify(defaultDef.defaultSections, null, 2);
          content = (await (prisma.siteContent as any).create({
            data: {
              key,
              jsonValue: defaultJson,
              draftJsonValue: defaultJson,
              published: true,
              version: 1,
            },
          })) as unknown as SiteContentRecord;
        }
      }

      if (!content) {
        return NextResponse.json({ error: "Content key not found" }, { status: 404 });
      }

      // If non-admin requests, return only published jsonValue
      if (!session || session.role !== "SUPER_ADMIN") {
        return NextResponse.json({
          content: {
            key: content.key,
            jsonValue: content.jsonValue,
            version: content.version,
            published: content.published,
          },
        });
      }

      // Super Admin receives draft, published, and version history
      return NextResponse.json({ content });
    }

    // List all CMS pages for Admin Panel in canonical fixed order
    let contents: SiteContentRecord[] = (await prisma.siteContent.findMany()) as unknown as SiteContentRecord[];

    // Auto-seed missing default pages so admin has all pages listed
    const existingKeys = new Set(contents.map((c) => c.key));
    for (const def of CMS_DEFAULT_PAGES) {
      if (!existingKeys.has(def.key)) {
        const defaultJson = JSON.stringify(def.defaultSections, null, 2);
        const created: SiteContentRecord = (await (prisma.siteContent as any).create({
          data: {
            key: def.key,
            jsonValue: defaultJson,
            draftJsonValue: defaultJson,
            published: true,
            version: 1,
          },
        })) as unknown as SiteContentRecord;
        contents.push(created);
      }
    }

    // Canonical display order: Home is ALWAYS first
    const CANONICAL_ORDER = [
      "page_landing",
      "page_arenas",
      "page_about",
      "page_docs",
      "page_legal",
      "page_404",
      "page_500",
    ];

    // Filter out legacy unmapped keys (like landing_hero) from tabs, but ensure page_landing has the latest
    const filteredPages = contents.filter((c) => c.key !== "landing_hero" && c.key !== "global_announcement");

    // Sort strictly by CANONICAL_ORDER
    filteredPages.sort((a, b) => {
      const idxA = CANONICAL_ORDER.indexOf(a.key);
      const idxB = CANONICAL_ORDER.indexOf(b.key);
      const posA = idxA === -1 ? 999 : idxA;
      const posB = idxB === -1 ? 999 : idxB;
      return posA - posB;
    });

    return NextResponse.json({ contents: filteredPages, defaultPages: CMS_DEFAULT_PAGES });
  } catch (error: any) {
    console.error("[SiteContent GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch site content" }, { status: 500 });
  }
}

// POST /api/v1/admin/site-content — Save Draft, Publish, or Rollback (SUPER_ADMIN only)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Super Admin authorization required" }, { status: 403 });
    }

    const body = await req.json();
    const { key, action = "PUBLISH", jsonValue, draftJsonValue, targetVersion } = body;

    if (!key || typeof key !== "string" || !key.trim()) {
      return NextResponse.json({ error: "Page or section key is required" }, { status: 400 });
    }

    const trimmedKey = key.trim();

    // 1. ROLLBACK ACTION
    if (action === "ROLLBACK") {
      const existing: SiteContentRecord | null = (await prisma.siteContent.findUnique({
        where: { key: trimmedKey },
      })) as unknown as SiteContentRecord | null;

      if (!existing || !existing.history) {
        return NextResponse.json({ error: "No version history available for rollback" }, { status: 400 });
      }

      let historyArray: any[] = [];
      try {
        historyArray = JSON.parse(existing.history);
      } catch {
        historyArray = [];
      }

      const target = historyArray.find((h: any) => h.version === targetVersion);
      if (!target) {
        return NextResponse.json(
          { error: `Version ${targetVersion} not found in historical revisions` },
          { status: 404 }
        );
      }

      // Rollback updates current published and draft to target version
      const updated: SiteContentRecord = (await (prisma.siteContent as any).update({
        where: { key: trimmedKey },
        data: {
          jsonValue: target.jsonValue,
          draftJsonValue: target.jsonValue,
          version: existing.version + 1,
          published: true,
        },
      })) as unknown as SiteContentRecord;

      await writeAuditLog(session.userId, "CMS_ROLLBACK", "SiteContent", updated.id, {
        key: trimmedKey,
        restoredVersion: targetVersion,
        newVersion: updated.version,
      });

      try {
        revalidatePath("/", "layout");
        revalidatePath("/");
        revalidatePath("/hackathons");
        revalidatePath("/about");
        revalidatePath("/docs");
      } catch (err) {
        console.warn("[CMS Revalidate Warning]:", err);
      }

      return NextResponse.json({
        success: true,
        message: `Rolled back to version ${targetVersion}`,
        content: updated,
      });
    }

    // 2. SAVE DRAFT ONLY ACTION (when explicitly saving draft without publishing live)
    if (action === "SAVE_DRAFT" && !body.publishLive) {
      const valueToSave = draftJsonValue || jsonValue;
      if (typeof valueToSave !== "string") {
        return NextResponse.json({ error: "draftJsonValue must be serialized JSON" }, { status: 400 });
      }

      // Validate JSON
      try {
        JSON.parse(valueToSave);
      } catch {
        return NextResponse.json({ error: "Draft content contains invalid JSON" }, { status: 400 });
      }

      const updated: SiteContentRecord = (await (prisma.siteContent as any).upsert({
        where: { key: trimmedKey },
        create: {
          key: trimmedKey,
          jsonValue: valueToSave,
          draftJsonValue: valueToSave,
          published: false,
          version: 1,
        },
        update: {
          draftJsonValue: valueToSave,
        },
      })) as unknown as SiteContentRecord;

      if (trimmedKey === "page_landing" || trimmedKey === "landing_hero") {
        const counterpartKey = trimmedKey === "page_landing" ? "landing_hero" : "page_landing";
        try {
          await (prisma.siteContent as any).upsert({
            where: { key: counterpartKey },
            create: {
              key: counterpartKey,
              jsonValue: valueToSave,
              draftJsonValue: valueToSave,
              published: false,
              version: 1,
            },
            update: {
              draftJsonValue: valueToSave,
            },
          });
        } catch {}
      }

      return NextResponse.json({
        success: true,
        message: "Draft saved successfully. (Not published to live yet)",
        content: updated,
      });
    }

    // 3. PUBLISH / SAVE_AND_PUBLISH ACTION (Saves and pushes directly to live site)
    const valueToPublish = jsonValue || draftJsonValue;
    if (typeof valueToPublish !== "string") {
      return NextResponse.json({ error: "Content must be serialized JSON" }, { status: 400 });
    }

    try {
      JSON.parse(valueToPublish);
    } catch {
      return NextResponse.json({ error: "Content contains invalid JSON" }, { status: 400 });
    }

    const existing: SiteContentRecord | null = (await prisma.siteContent.findUnique({
      where: { key: trimmedKey },
    })) as unknown as SiteContentRecord | null;

    // Build historical entry
    let history: any[] = [];
    if (existing?.history) {
      try {
        history = JSON.parse(existing.history);
      } catch {
        history = [];
      }
    }
    if (existing) {
      history.unshift({
        version: existing.version,
        jsonValue: existing.jsonValue,
        publishedAt: existing.updatedAt.toISOString(),
        publishedBy: session.userId,
      });
      // Retain up to 20 past versions
      history = history.slice(0, 20);
    }

    const record: SiteContentRecord = (await (prisma.siteContent as any).upsert({
      where: { key: trimmedKey },
      create: {
        key: trimmedKey,
        jsonValue: valueToPublish,
        draftJsonValue: valueToPublish,
        published: true,
        version: 1,
        history: JSON.stringify(history),
      },
      update: {
        jsonValue: valueToPublish,
        draftJsonValue: valueToPublish,
        published: true,
        version: existing ? existing.version + 1 : 1,
        history: JSON.stringify(history),
      },
    })) as unknown as SiteContentRecord;

    // Bidirectional sync for landing_hero and page_landing to guarantee live homepage portrayal
    if (trimmedKey === "page_landing" || trimmedKey === "landing_hero") {
      const counterpartKey = trimmedKey === "page_landing" ? "landing_hero" : "page_landing";
      try {
        await (prisma.siteContent as any).upsert({
          where: { key: counterpartKey },
          create: {
            key: counterpartKey,
            jsonValue: valueToPublish,
            draftJsonValue: valueToPublish,
            published: true,
            version: record.version,
            history: JSON.stringify(history),
          },
          update: {
            jsonValue: valueToPublish,
            draftJsonValue: valueToPublish,
            published: true,
            version: record.version,
            history: JSON.stringify(history),
          },
        });
      } catch (syncErr) {
        console.warn("[Counterpart Sync Warning]:", syncErr);
      }
    }

    await writeAuditLog(session.userId, "CMS_PUBLISH", "SiteContent", record.id, {
      key: trimmedKey,
      version: record.version,
    });

    try {
      revalidatePath("/", "layout");
      revalidatePath("/", "page");
      revalidatePath("/");
      revalidatePath("/hackathons");
      revalidatePath("/about");
      revalidatePath("/docs");
      revalidatePath("/legal");
    } catch (err) {
      console.warn("[CMS Revalidate Warning]:", err);
    }

    return NextResponse.json({
      success: true,
      message: `Page "${trimmedKey}" successfully saved and published live! (v${record.version})`,
      content: record,
    });
  } catch (error: any) {
    console.error("[SiteContent POST Error]:", error);
    return NextResponse.json({ error: "Failed to process CMS update" }, { status: 500 });
  }
}
