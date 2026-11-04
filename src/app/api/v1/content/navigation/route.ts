import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  DEFAULT_SITE_NAVIGATION,
  SiteNavigationConfig,
  NavbarConfig,
  FooterConfig,
} from "@/lib/navigation-defaults";

export const dynamic = "force-dynamic";

const NAVIGATION_KEY = "site_navigation";

// GET /api/v1/content/navigation — Publicly fetch active Navbar and Footer configurations
export async function GET() {
  try {
    const record = await prisma.siteContent.findUnique({
      where: { key: NAVIGATION_KEY },
    });

    if (!record || !record.jsonValue) {
      return NextResponse.json(DEFAULT_SITE_NAVIGATION, {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      });
    }

    let parsed: any = {};
    try {
      parsed = JSON.parse(record.jsonValue);
    } catch {
      parsed = {};
    }

    const merged: SiteNavigationConfig = {
      navbar: {
        ...DEFAULT_SITE_NAVIGATION.navbar,
        ...(parsed.navbar || {}),
        announcement: {
          ...DEFAULT_SITE_NAVIGATION.navbar.announcement,
          ...(parsed.navbar?.announcement || {}),
        },
        publicNavLinks: Array.isArray(parsed.navbar?.publicNavLinks) && parsed.navbar.publicNavLinks.length > 0
          ? parsed.navbar.publicNavLinks
          : DEFAULT_SITE_NAVIGATION.navbar.publicNavLinks,
        studentNavLinks: Array.isArray(parsed.navbar?.studentNavLinks) && parsed.navbar.studentNavLinks.length > 0
          ? parsed.navbar.studentNavLinks
          : DEFAULT_SITE_NAVIGATION.navbar.studentNavLinks,
        hostNavLinks: Array.isArray(parsed.navbar?.hostNavLinks) && parsed.navbar.hostNavLinks.length > 0
          ? parsed.navbar.hostNavLinks
          : DEFAULT_SITE_NAVIGATION.navbar.hostNavLinks,
        judgeNavLinks: Array.isArray(parsed.navbar?.judgeNavLinks) && parsed.navbar.judgeNavLinks.length > 0
          ? parsed.navbar.judgeNavLinks
          : DEFAULT_SITE_NAVIGATION.navbar.judgeNavLinks,
        adminNavLinks: Array.isArray(parsed.navbar?.adminNavLinks) && parsed.navbar.adminNavLinks.length > 0
          ? parsed.navbar.adminNavLinks
          : DEFAULT_SITE_NAVIGATION.navbar.adminNavLinks,
      },
      footer: {
        ...DEFAULT_SITE_NAVIGATION.footer,
        ...(parsed.footer || {}),
        columns: Array.isArray(parsed.footer?.columns) && parsed.footer.columns.length > 0
          ? parsed.footer.columns
          : DEFAULT_SITE_NAVIGATION.footer.columns,
        socialLinks: Array.isArray(parsed.footer?.socialLinks) && parsed.footer.socialLinks.length > 0
          ? parsed.footer.socialLinks
          : DEFAULT_SITE_NAVIGATION.footer.socialLinks,
      },
    };

    return NextResponse.json(merged, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[Navigation GET Error]:", error);
    return NextResponse.json(DEFAULT_SITE_NAVIGATION, { status: 200 });
  }
}

// POST /api/v1/content/navigation — Update Navbar and Footer configuration (SUPER_ADMIN only)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Super Admin privileges required" }, { status: 403 });
    }

    const body = await req.json();
    const navbar: NavbarConfig = body.navbar || DEFAULT_SITE_NAVIGATION.navbar;
    const footer: FooterConfig = body.footer || DEFAULT_SITE_NAVIGATION.footer;

    const payloadToSave: SiteNavigationConfig = {
      navbar,
      footer,
    };

    const serialized = JSON.stringify(payloadToSave, null, 2);

    const existing = await prisma.siteContent.findUnique({
      where: { key: NAVIGATION_KEY },
    });

    const updated = await prisma.siteContent.upsert({
      where: { key: NAVIGATION_KEY },
      create: {
        key: NAVIGATION_KEY,
        jsonValue: serialized,
        draftJsonValue: serialized,
        published: true,
        version: 1,
      },
      update: {
        jsonValue: serialized,
        draftJsonValue: serialized,
        published: true,
        version: existing ? existing.version + 1 : 1,
      },
    });

    await writeAuditLog(session.userId, "UPDATE_SITE_NAVIGATION", "SiteContent", updated.id, {
      updatedBy: session.email,
      version: updated.version,
    });

    try {
      revalidatePath("/", "layout");
      revalidatePath("/");
    } catch (e) {
      console.warn("[Navigation Revalidation Warning]:", e);
    }

    return NextResponse.json({
      success: true,
      message: "Navbar and Footer configuration successfully updated!",
      config: payloadToSave,
      version: updated.version,
    });
  } catch (error: any) {
    console.error("[Navigation POST Error]:", error);
    return NextResponse.json(
      { error: "Failed to update navigation and footer configuration" },
      { status: 500 }
    );
  }
}
