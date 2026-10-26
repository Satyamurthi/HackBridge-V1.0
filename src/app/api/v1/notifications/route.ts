import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/notifications";

export const dynamic = "force-dynamic";

// GET /api/v1/notifications — Retrieve current user's in-app alerts and unread count
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "30", 10);

    const data = await getUserNotifications(session.userId, Math.min(limit, 100));

    return NextResponse.json({
      success: true,
      unreadCount: data.unreadCount,
      notifications: data.notifications,
    });
  } catch (error: any) {
    console.error("[Notifications GET Error]:", error);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}

// PATCH /api/v1/notifications — Mark notification(s) as read
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const { action, notificationId } = body;

    if (action === "MARK_ALL_READ") {
      const updatedCount = await markAllNotificationsRead(session.userId);
      return NextResponse.json({
        success: true,
        action: "MARK_ALL_READ",
        updatedCount,
      });
    }

    if (action === "MARK_READ" || notificationId) {
      const targetId = notificationId || body.id;
      if (!targetId) {
        return NextResponse.json({ error: "notificationId is required" }, { status: 400 });
      }

      const ok = await markNotificationRead(targetId, session.userId);
      if (!ok) {
        return NextResponse.json({ error: "Notification not found or unauthorized" }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        action: "MARK_READ",
        notificationId: targetId,
      });
    }

    return NextResponse.json({ error: "Invalid action. Expected MARK_READ or MARK_ALL_READ" }, { status: 400 });
  } catch (error: any) {
    console.error("[Notifications PATCH Error]:", error);
    return NextResponse.json({ error: "Failed to update notification state" }, { status: 500 });
  }
}
