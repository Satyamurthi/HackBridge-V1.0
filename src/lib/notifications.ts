import { prisma } from "./db";

export type NotificationType =
  | "TEAM_INVITE"
  | "PAYMENT_VERIFIED"
  | "PAYMENT_REJECTED"
  | "SUBMISSION_LOCKED"
  | "SUBMISSION_UNLOCKED"
  | "RESULTS_PUBLISHED"
  | "PROGRESS_REMINDER"
  | "SYSTEM_ALERT";

export interface NotificationPayload {
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
}

export interface ParsedNotification {
  id: string;
  userId: string;
  type: string;
  payload: NotificationPayload;
  readAt: Date | null;
  createdAt: Date;
}

/**
 * Dispatch an in-app notification to a single user.
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  payload: NotificationPayload
) {
  try {
    const record = await prisma.notification.create({
      data: {
        userId,
        type,
        payload: JSON.stringify(payload),
      },
    });
    return record;
  } catch (error) {
    console.error(`[Notification Service] Failed to dispatch notification to user ${userId}:`, error);
    return null;
  }
}

/**
 * Dispatch an in-app notification to multiple users simultaneously.
 */
export async function createBulkNotifications(
  userIds: string[],
  type: NotificationType,
  payload: NotificationPayload
): Promise<number> {
  const cleanIds = Array.from(new Set(userIds.filter(Boolean)));
  if (cleanIds.length === 0) return 0;

  try {
    const payloadStr = JSON.stringify(payload);
    const created = await prisma.notification.createMany({
      data: cleanIds.map((userId) => ({
        userId,
        type,
        payload: payloadStr,
      })),
    });
    return created.count;
  } catch (error) {
    console.error("[Notification Service] Bulk dispatch error:", error);
    return 0;
  }
}

/**
 * Retrieve notifications for a specific user, sorted newest first.
 */
export async function getUserNotifications(
  userId: string,
  limit = 30
): Promise<{ notifications: ParsedNotification[]; unreadCount: number }> {
  try {
    const [rawList, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId, readAt: null },
      }),
    ]);

    const notifications: ParsedNotification[] = rawList.map((item) => {
      let parsedPayload: NotificationPayload;
      try {
        parsedPayload = JSON.parse(item.payload);
      } catch {
        parsedPayload = { title: item.type, message: item.payload };
      }

      return {
        id: item.id,
        userId: item.userId,
        type: item.type,
        payload: parsedPayload,
        readAt: item.readAt,
        createdAt: item.createdAt,
      };
    });

    return { notifications, unreadCount };
  } catch (error) {
    console.error(`[Notification Service] Failed to get notifications for ${userId}:`, error);
    return { notifications: [], unreadCount: 0 };
  }
}

/**
 * Mark a single notification as read, ensuring ownership match.
 */
export async function markNotificationRead(
  notificationId: string,
  userId: string
): Promise<boolean> {
  try {
    const result = await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
    return result.count > 0;
  } catch (error) {
    console.error(`[Notification Service] Failed to mark ${notificationId} read:`, error);
    return false;
  }
}

/**
 * Mark all unread notifications for a user as read.
 */
export async function markAllNotificationsRead(userId: string): Promise<number> {
  try {
    const result = await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return result.count;
  } catch (error) {
    console.error(`[Notification Service] Failed to mark all read for ${userId}:`, error);
    return 0;
  }
}
