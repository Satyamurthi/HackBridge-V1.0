import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
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
  createdAt?: Date;
  updatedAt?: Date;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { pageKey: string } }
) {
  try {
    const { pageKey } = params;
    const { searchParams } = new URL(req.url);
    const isPreview = searchParams.get("preview") === "true";

    const session = await getSession();
    const canPreview = isPreview && session?.role === "SUPER_ADMIN";

    let record: SiteContentRecord | null = (await prisma.siteContent.findUnique({
      where: { key: pageKey },
    })) as unknown as SiteContentRecord | null;

    if (!record) {
      const defaultPage = CMS_DEFAULT_PAGES.find((p) => p.key === pageKey);
      if (defaultPage) {
        const defaultJson = JSON.stringify(defaultPage.defaultSections);
        record = (await (prisma.siteContent as any).create({
          data: {
            key: pageKey,
            jsonValue: defaultJson,
            draftJsonValue: defaultJson,
            published: true,
            version: 1,
          },
        })) as unknown as SiteContentRecord;
      }
    }

    if (!record) {
      return NextResponse.json({ error: "Page content not found" }, { status: 404 });
    }

    const raw = canPreview && record.draftJsonValue ? record.draftJsonValue : record.jsonValue;
    let parsed: any = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = [];
    }

    return NextResponse.json(
      {
        key: record.key,
        sections: parsed,
        version: record.version,
        published: record.published,
        isPreview: canPreview,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error: any) {
    console.error("[Content GET Error]:", error);
    return NextResponse.json({ error: "Failed to load page content" }, { status: 500 });
  }
}
