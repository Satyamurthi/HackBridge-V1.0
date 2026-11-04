import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { createBulkNotifications, createNotification } from "@/lib/notifications";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET /api/v1/host/notifications — List host notifications and broadcast history
export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== "HOST" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Host or Admin access required" }, { status: 403 });
    }

    // Notifications received by the host
    const notifications = await prisma.notification.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const parsed = notifications.map((n) => {
      let payload = n.payload;
      try {
        payload = JSON.parse(n.payload);
      } catch {
        // keep string
      }
      return {
        ...n,
        payload,
      };
    });

    return NextResponse.json({ notifications: parsed });
  } catch (error: any) {
    console.error("[Host Notifications GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

// POST /api/v1/host/notifications — Push / Broadcast notification to participants or judges
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "HOST" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Host or Admin access required" }, { status: 403 });
    }

    const host = await prisma.hostProfile.findUnique({
      where: { userId: session.userId },
      include: { hackathons: { select: { id: true, title: true } } },
    });

    if (!host) {
      return NextResponse.json({ error: "Host profile not found" }, { status: 404 });
    }

    const body = await req.json();
    const { hackathonId, audience, title, message, link, priority } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: "Title and message are required" },
        { status: 400 }
      );
    }

    // Verify hackathon belongs to host if specified
    const hostHackathonIds = host.hackathons.map((h) => h.id);
    let targetHackathonIds: string[] = [];

    if (hackathonId && hackathonId !== "ALL") {
      if (!hostHackathonIds.includes(hackathonId) && session.role !== "SUPER_ADMIN") {
        return NextResponse.json(
          { error: "Unauthorized for specified hackathon" },
          { status: 403 }
        );
      }
      targetHackathonIds = [hackathonId];
    } else {
      targetHackathonIds = hostHackathonIds;
    }

    if (targetHackathonIds.length === 0) {
      return NextResponse.json(
        { error: "No active hackathons found for broadcasting" },
        { status: 400 }
      );
    }

    const targetUserIds = new Set<string>();

    const targetAudience = audience || "ALL_PARTICIPANTS"; // ALL_PARTICIPANTS, TEAM_LEADS, JUDGES, ALL

    // 1. Collect Team Leads and Members
    if (["ALL_PARTICIPANTS", "TEAM_LEADS", "ALL"].includes(targetAudience)) {
      const teams = await prisma.team.findMany({
        where: {
          hackathonId: { in: targetHackathonIds },
        },
        include: {
          leadStudent: { select: { userId: true } },
          members: {
            include: {
              student: { select: { userId: true } },
            },
          },
        },
      });

      for (const t of teams) {
        if (t.leadStudent?.userId) {
          targetUserIds.add(t.leadStudent.userId);
        }
        if (targetAudience !== "TEAM_LEADS") {
          for (const m of t.members) {
            if (m.student?.userId) {
              targetUserIds.add(m.student.userId);
            }
          }
        }
      }
    }

    // 2. Collect Judges
    if (["JUDGES", "ALL"].includes(targetAudience)) {
      const judges = await prisma.judgeProfile.findMany({
        where: {
          hackathonId: { in: targetHackathonIds },
        },
        select: { userId: true },
      });

      for (const j of judges) {
        if (j.userId) {
          targetUserIds.add(j.userId);
        }
      }
    }

    const userIdsArray = Array.from(targetUserIds);

    const payload = {
      title: String(title).trim(),
      message: String(message).trim(),
      link: link || undefined,
      metadata: {
        broadcastBy: session.userId,
        hostOrg: host.orgName,
        audience: targetAudience,
        priority: priority || "NORMAL",
        hackathonId: hackathonId || "ALL",
        sentAt: new Date().toISOString(),
      },
    };

    let deliveredCount = 0;
    if (userIdsArray.length > 0) {
      deliveredCount = await createBulkNotifications(
        userIdsArray,
        "SYSTEM_ALERT",
        payload
      );
    }

    // Also notify the host with broadcast confirmation
    await createNotification(session.userId, "SYSTEM_ALERT", {
      title: `Broadcast Dispatched: ${title}`,
      message: `Successfully pushed notification to ${deliveredCount} recipient(s) across target audience (${targetAudience}).`,
      metadata: payload.metadata,
    });

    await writeAuditLog(session.userId, "NOTIFICATION_BROADCAST", "host", host.id, {
      title,
      targetAudience,
      deliveredCount,
      targetHackathons: targetHackathonIds.length,
    });

    return NextResponse.json({
      success: true,
      message: `Notification successfully pushed to ${deliveredCount} user(s).`,
      deliveredCount,
      audience: targetAudience,
    });
  } catch (error: any) {
    console.error("[Host Notifications POST Error]:", error);
    return NextResponse.json({ error: "Failed to push broadcast notification" }, { status: 500 });
  }
}
