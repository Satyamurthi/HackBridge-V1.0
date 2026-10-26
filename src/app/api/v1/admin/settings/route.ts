import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/v1/admin/settings — Return system settings & health metadata (SUPER_ADMIN only)
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Super Admin access required" }, { status: 403 });
    }

    // PRD Rule 9: Secrets are NEVER exposed across client APIs. Only status flags/masked indicators.
    const secretAudit = {
      jwtSecretConfigured: Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 16),
      databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
      databaseType: process.env.DATABASE_URL?.startsWith("postgres") ? "PostgreSQL" : "SQLite",
      razorpayKeyIdConfigured: Boolean(process.env.RAZORPAY_KEY_ID),
      razorpaySecretConfigured: Boolean(process.env.RAZORPAY_KEY_SECRET),
      razorpayWebhookConfigured: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET),
      githubTokenConfigured: Boolean(process.env.GITHUB_TOKEN),
      githubOrgConfigured: Boolean(process.env.GITHUB_ORG),
      redisUrlConfigured: Boolean(process.env.REDIS_URL),
    };

    // Load dynamic system toggles from siteContent
    const settingsRecord = await prisma.siteContent.findUnique({
      where: { key: "system_settings" },
    });

    let systemConfig = {
      maintenanceMode: false,
      newRegistrationsOpen: true,
      maxFileUploadSizeMB: 10,
      statementRevealGracePeriodSec: 0,
      noticeBanner: "",
    };

    if (settingsRecord?.jsonValue) {
      try {
        systemConfig = { ...systemConfig, ...JSON.parse(settingsRecord.jsonValue) };
      } catch {
        // use defaults
      }
    }

    return NextResponse.json({
      settings: systemConfig,
      integrations: secretAudit,
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Admin Settings GET Error]:", error);
    return NextResponse.json({ error: "Failed to load system settings" }, { status: 500 });
  }
}

// PATCH /api/v1/admin/settings — Update system settings (SUPER_ADMIN only, logs audit)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Super Admin access required" }, { status: 403 });
    }

    const updates = await req.json();

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.siteContent.findUnique({
        where: { key: "system_settings" },
      });

      let currentConfig: any = {};
      if (existing?.jsonValue) {
        try {
          currentConfig = JSON.parse(existing.jsonValue);
        } catch {}
      }

      const merged = { ...currentConfig, ...updates };

      const updated = await tx.siteContent.upsert({
        where: { key: "system_settings" },
        create: {
          key: "system_settings",
          jsonValue: JSON.stringify(merged),
          published: true,
          version: 1,
        },
        update: {
          jsonValue: JSON.stringify(merged),
          version: existing ? existing.version + 1 : 1,
        },
      });

      // PRD Rule 10: Audit Log
      await tx.auditLog.create({
        data: {
          actorId: session.userId,
          action: "UPDATE_SYSTEM_SETTINGS",
          entity: "SystemSettings",
          entityId: "system_settings",
          metadata: JSON.stringify(updates),
        },
      });

      return merged;
    });

    return NextResponse.json({ success: true, settings: result });
  } catch (error: any) {
    console.error("[Admin Settings PATCH Error]:", error);
    return NextResponse.json({ error: "Failed to update system settings" }, { status: 500 });
  }
}
