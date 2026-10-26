import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "../src/lib/db";
import {
  createNotification,
  createBulkNotifications,
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../src/lib/notifications";
import { GET as getNotifications, PATCH as patchNotifications } from "../src/app/api/v1/notifications/route";
import { GET as getStudentMe } from "../src/app/api/v1/students/me/route";
import { GET as getExport } from "../src/app/api/v1/users/export/route";
import { GET as getCronReminders } from "../src/app/api/v1/cron/reminders/route";
import { signSessionToken } from "../src/lib/auth";
import { NextRequest } from "next/server";
import { generateHackathonId, generateTeamId } from "../src/lib/id-generator";

let activeSessionToken: string | null = null;

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (name: string) => {
      if (name === "hackbridge_session" && activeSessionToken) {
        return { value: activeSessionToken };
      }
      return undefined;
    },
  }),
}));

describe("Phase 8: In-App Notifications, DPDP Data Portability, and Reminder Cron", () => {
  let studentUser: any;
  let teammateUser: any;
  let hostUser: any;
  let testHackathon: any;
  let testTeam: any;

  beforeAll(async () => {
    // Create dedicated isolated student lead for test isolation
    studentUser = await prisma.user.create({
      data: {
        email: `student.p8.${Date.now()}@test.edu`,
        name: "Phase 8 Student Lead",
        passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz",
        role: "STUDENT",
        status: "ACTIVE",
        studentProfile: {
          create: {
            hackathonId: generateHackathonId(),
            college: "IIIT Bangalore",
          },
        },
      },
      include: { studentProfile: true },
    });

    // Create a temporary teammate student for bulk notification testing
    teammateUser = await prisma.user.create({
      data: {
        email: `teammate.p8.${Date.now()}@test.edu`,
        name: "Phase 8 Teammate",
        passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz",
        role: "STUDENT",
        status: "ACTIVE",
        studentProfile: {
          create: {
            hackathonId: generateHackathonId(),
            college: "Stanford University",
          },
        },
      },
      include: { studentProfile: true },
    });

    hostUser = await prisma.user.findUnique({
      where: { email: "host.mit@college.edu" },
      include: { hostProfile: true },
    });

    const now = new Date();
    const future = new Date(Date.now() + 86400000 * 2);

    // Create an active hackathon for reminder cron testing
    testHackathon = await prisma.hackathon.create({
      data: {
        hostId: hostUser.hostProfile.id,
        title: `Phase 8 Live Arena ${Date.now()}`,
        slug: `p8-arena-${Date.now()}`,
        description: "Testing automated reminders and notifications",
        rules: "Standard fair play rules",
        status: "PUBLISHED",
        startAt: new Date(Date.now() - 3600000), // Started 1 hour ago
        endAt: future,
      },
    });

    // Create an active team with no recent progress
    testTeam = await prisma.team.create({
      data: {
        hackathonId: testHackathon.id,
        leadStudentId: studentUser.studentProfile.id,
        name: `Phase 8 Cron Squad ${Date.now()}`,
        status: "ACTIVE",
        teamId: generateTeamId(),
        members: {
          create: [
            { studentId: studentUser.studentProfile.id, role: "LEAD" },
            { studentId: teammateUser.studentProfile.id, role: "MEMBER" },
          ],
        },
      },
    });
  });

  afterAll(async () => {
    // Cleanup notifications and temporary records
    try {
      await prisma.notification.deleteMany({
        where: {
          userId: { in: [studentUser.id, teammateUser.id] },
        },
      });

      await prisma.teamMember.deleteMany({ where: { teamId: testTeam.id } });
      await prisma.team.deleteMany({ where: { id: testTeam.id } });
      await prisma.hackathon.deleteMany({ where: { id: testHackathon.id } });
      await prisma.studentProfile.deleteMany({ where: { userId: { in: [studentUser.id, teammateUser.id] } } });
      await prisma.user.deleteMany({ where: { id: { in: [studentUser.id, teammateUser.id] } } });
    } catch (e) {
      // Ignore cleanup error
    }
  });

  it("should dispatch and query in-app notifications with unread counters", async () => {
    // Clean initial notifications for student
    await prisma.notification.deleteMany({ where: { userId: studentUser.id } });

    // 1. Dispatch single notification
    const single = await createNotification(studentUser.id, "TEAM_INVITE", {
      title: "Team Invitation",
      message: "You were added to Squad Apollo for Web3 Grand Prix.",
      link: "/dashboard/student",
      metadata: { teamId: "test-team-1" },
    });

    expect(single).not.toBeNull();
    expect(single?.type).toBe("TEAM_INVITE");
    expect(single?.readAt).toBeNull();

    // 2. Query user notifications
    const query1 = await getUserNotifications(studentUser.id);
    expect(query1.unreadCount).toBe(1);
    expect(query1.notifications.length).toBe(1);
    expect(query1.notifications[0].payload.title).toBe("Team Invitation");

    // 3. Mark single notification as read
    const marked = await markNotificationRead(single!.id, studentUser.id);
    expect(marked).toBe(true);

    const query2 = await getUserNotifications(studentUser.id);
    expect(query2.unreadCount).toBe(0);
    expect(query2.notifications[0].readAt).not.toBeNull();

    // 4. Bulk dispatch to multiple users
    const bulkCount = await createBulkNotifications(
      [studentUser.id, teammateUser.id],
      "PAYMENT_VERIFIED",
      {
        title: "Squad Payment Verified",
        message: "Your payment has been certified! Official Team ID issued.",
        link: "/dashboard/student",
      }
    );
    expect(bulkCount).toBe(2);

    const studentQuery = await getUserNotifications(studentUser.id);
    expect(studentQuery.unreadCount).toBe(1);

    // 5. Mark all read
    const allMarked = await markAllNotificationsRead(studentUser.id);
    expect(allMarked).toBeGreaterThanOrEqual(1);

    const studentFinalQuery = await getUserNotifications(studentUser.id);
    expect(studentFinalQuery.unreadCount).toBe(0);
  });

  it("should handle Notifications API route (GET and PATCH)", async () => {
    // Generate valid signed JWT session token for authenticated student
    activeSessionToken = signSessionToken({
      userId: studentUser.id,
      email: studentUser.email,
      role: "STUDENT",
      status: "ACTIVE",
      name: studentUser.name,
      hackathonId: studentUser.studentProfile.hackathonId,
    });

    // Create an unread notification for the test
    const notif = await createNotification(studentUser.id, "SYSTEM_ALERT", {
      title: "Platform Maintenance",
      message: "Scheduled platform upgrade tonight at 02:00 UTC.",
    });

    // 1. GET /api/v1/notifications
    const getReq = new NextRequest("http://localhost:3000/api/v1/notifications");
    const getRes = await getNotifications(getReq);
    expect(getRes.status).toBe(200);

    const getData = await getRes.json();
    expect(getData.success).toBe(true);
    expect(getData.unreadCount).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(getData.notifications)).toBe(true);

    // 2. PATCH /api/v1/notifications (MARK_READ)
    const patchReq = new NextRequest("http://localhost:3000/api/v1/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "MARK_READ", notificationId: notif!.id }),
    });
    const patchRes = await patchNotifications(patchReq);
    expect(patchRes.status).toBe(200);

    const patchData = await patchRes.json();
    expect(patchData.success).toBe(true);
    expect(patchData.action).toBe("MARK_READ");

    // 3. PATCH /api/v1/notifications (MARK_ALL_READ)
    const patchAllReq = new NextRequest("http://localhost:3000/api/v1/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "MARK_ALL_READ" }),
    });
    const patchAllRes = await patchNotifications(patchAllReq);
    expect(patchAllRes.status).toBe(200);

    const patchAllData = await patchAllRes.json();
    expect(patchAllData.success).toBe(true);
    expect(patchAllData.action).toBe("MARK_ALL_READ");
  });

  it("should fetch authenticated student profile and active squad state via /api/v1/students/me", async () => {
    activeSessionToken = signSessionToken({
      userId: studentUser.id,
      email: studentUser.email,
      role: "STUDENT",
      status: "ACTIVE",
      name: studentUser.name,
      hackathonId: studentUser.studentProfile.hackathonId,
    });

    const req = new NextRequest("http://localhost:3000/api/v1/students/me");
    const res = await getStudentMe(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.student.email).toBe(studentUser.email);
    expect(data.student.college).toBe(studentUser.studentProfile.college);
    expect(data.student.hackathonId).toMatch(/^HB-[A-Z0-9]{6}$/);
    expect(typeof data.student.isEligibleForNewHackathon).toBe("boolean");
  });

  it("should deliver DPDP Act Section 12 compliant personal data manifest via /api/v1/users/export", async () => {
    activeSessionToken = signSessionToken({
      userId: studentUser.id,
      email: studentUser.email,
      role: "STUDENT",
      status: "ACTIVE",
      name: studentUser.name,
      hackathonId: studentUser.studentProfile.hackathonId,
    });

    const req = new NextRequest("http://localhost:3000/api/v1/users/export");
    const res = await getExport(req);
    expect(res.status).toBe(200);

    // Verify headers
    const contentDisposition = res.headers.get("Content-Disposition");
    expect(contentDisposition).toContain("attachment; filename=");
    expect(contentDisposition).toContain("hackbridge-data-export-student-");

    const exportIdHeader = res.headers.get("X-DPDP-Export-ID");
    expect(exportIdHeader).toBeDefined();

    // Verify JSON manifest structure
    const data = await res.json();
    expect(data.compliance.framework).toBe(
      "Digital Personal Data Protection Act, 2023 (India DPDP Act)"
    );
    expect(data.compliance.provision).toContain("Section 12");
    expect(data.compliance.dataFiduciary).toBe("HackBridge Platform Inc.");

    expect(data.dataPrincipal.id).toBe(studentUser.id);
    expect(data.dataPrincipal.email).toBe(studentUser.email);
    expect(data.profiles.student.hackathonId).toBe(studentUser.studentProfile.hackathonId);
    expect(Array.isArray(data.participations)).toBe(true);
    expect(Array.isArray(data.notifications)).toBe(true);
    expect(Array.isArray(data.auditTrail)).toBe(true);

    // Verify audit log entry was created
    const auditLog = await prisma.auditLog.findFirst({
      where: {
        actorId: studentUser.id,
        action: "DPDP_DATA_EXPORT_REQUESTED",
      },
      orderBy: { createdAt: "desc" },
    });
    expect(auditLog).not.toBeNull();
  });

  it("should execute 30-minute reminder cron and dispatch notifications to overdue squads", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/cron/reminders");
    const res = await getCronReminders(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.activeHackathonsCount).toBeGreaterThanOrEqual(1);
    expect(data.teamsOverdue).toBeGreaterThanOrEqual(1);
    expect(data.remindersDispatched).toBeGreaterThanOrEqual(1);

    // Check that a PROGRESS_REMINDER notification was received by studentUser
    const reminderNotif = await prisma.notification.findFirst({
      where: {
        userId: studentUser.id,
        type: "PROGRESS_REMINDER",
      },
      orderBy: { createdAt: "desc" },
    });

    expect(reminderNotif).not.toBeNull();
    const payload = JSON.parse(reminderNotif!.payload);
    expect(payload.title).toContain("Milestone Reminder");
  });
});
