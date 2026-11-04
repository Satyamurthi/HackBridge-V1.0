import { describe, it, expect, beforeAll, vi } from "vitest";
import { prisma } from "../src/lib/db";
import { GET as getHostProfile, PATCH as patchHostProfile } from "../src/app/api/v1/host/profile/route";
import { POST as postHostNotification, GET as getHostNotifications } from "../src/app/api/v1/host/notifications/route";
import { PATCH as patchPayment } from "../src/app/api/v1/host/payments/[paymentId]/route";
import { GET as exportHackathon } from "../src/app/api/v1/host/hackathons/[hackathonId]/export/route";
import { hashPassword, signSessionToken } from "../src/lib/auth";
import { NextRequest } from "next/server";
import * as XLSX from "xlsx";

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

describe("Phase 16 (v4.0): Editable Host Profile, Cohort Push Notifications, UTR Payment Verification & Excel Export", () => {
  let hostUser: any;
  let hostProfile: any;
  let hostToken: string;

  let studentLead: any;
  let studentMember: any;
  let hackathon: any;
  let team: any;
  let payment: any;
  let judgeUser: any;
  let judgeProfile: any;

  beforeAll(async () => {
    const hashed = await hashPassword("SecureKey#2026");

    // 1. Host User & Profile
    hostUser = await prisma.user.create({
      data: {
        email: `host.v4.${Date.now()}@university.edu`,
        name: "Dean Arthur Vance",
        phone: "9876543210",
        role: "HOST",
        status: "ACTIVE",
        passwordHash: hashed,
      },
    });

    hostProfile = await prisma.hostProfile.create({
      data: {
        userId: hostUser.id,
        orgName: "Vance Institute of Technology",
        type: "college",
        approvalStatus: "APPROVED",
        hackId: `HOST-${Date.now().toString().slice(-6)}`,
        city: "Bangalore",
        address: "100 Campus Avenue",
        upiId: "vance.institute@okhdfcbank",
        bankAccountName: "Vance Tech Chapter",
      },
    });

    hostToken = signSessionToken({
      userId: hostUser.id,
      email: hostUser.email,
      role: hostUser.role,
      name: hostUser.name,
      status: hostUser.status,
    });

    // 2. Hackathon
    hackathon = await prisma.hackathon.create({
      data: {
        hostId: hostProfile.id,
        title: "National Engineering Invitational v4.0",
        slug: `national-invitational-${Date.now()}`,
        description: "High-stakes technical hackathon with verified UTR payment queue.",
        rules: "Adhere to the tournament protocol code.",
        status: "PUBLISHED",
        fee: 500,
        paymentMode: "QR",
        upiId: "vance.institute@okhdfcbank",
        startAt: new Date(Date.now() + 86400000),
        endAt: new Date(Date.now() + 172800000),
      },
    });

    // 3. Students & Team
    studentLead = await prisma.user.create({
      data: {
        email: `lead.v4.${Date.now()}@student.edu`,
        name: "Arjun Sharma",
        phone: "9123456789",
        role: "STUDENT",
        status: "ACTIVE",
        passwordHash: hashed,
      },
    });

    const leadProfile = await prisma.studentProfile.create({
      data: {
        userId: studentLead.id,
        hackathonId: `HB-${Date.now().toString().slice(-6)}`,
        college: "Delhi Technological University",
        githubUsername: "arjun-dev",
      },
    });

    studentMember = await prisma.user.create({
      data: {
        email: `member.v4.${Date.now()}@student.edu`,
        name: "Pooja Patel",
        phone: "9123456780",
        role: "STUDENT",
        status: "ACTIVE",
        passwordHash: hashed,
      },
    });

    const memberProfile = await prisma.studentProfile.create({
      data: {
        userId: studentMember.id,
        hackathonId: `HB-${(Date.now() + 1).toString().slice(-6)}`,
        college: "Delhi Technological University",
        githubUsername: "pooja-p",
      },
    });

    team = await prisma.team.create({
      data: {
        hackathonId: hackathon.id,
        leadStudentId: leadProfile.id,
        name: "CipherSquad v4",
        status: "PENDING",
        members: {
          create: [{ studentId: memberProfile.id, role: "MEMBER" }],
        },
      },
    });

    payment = await prisma.payment.create({
      data: {
        teamId: team.id,
        amount: 500,
        mode: "QR",
        status: "PENDING",
        txnRef: "UPI-428901234567",
        screenshotUrl: "https://example.com/receipt.png",
      },
    });

    // 4. Judge
    judgeUser = await prisma.user.create({
      data: {
        email: `judge.v4.${Date.now()}@evaluator.org`,
        name: "Dr. Vikram Seth",
        phone: "9988776655",
        role: "JUDGE",
        status: "ACTIVE",
        passwordHash: hashed,
      },
    });

    judgeProfile = await prisma.judgeProfile.create({
      data: {
        userId: judgeUser.id,
        hackathonId: hackathon.id,
        designation: "Principal Architect",
        company: "Meta Platforms",
        domain: "AI & Systems",
        approvalStatus: "APPROVED",
      },
    });
  });

  describe("1. Editable Host Profile (GET & PATCH)", () => {
    it("fetches the current host profile with coordinator details", async () => {
      activeSessionToken = hostToken;

      const res = await getHostProfile();
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.host).toBeDefined();
      expect(data.host.orgName).toBe("Vance Institute of Technology");
      expect(data.host.user.name).toBe("Dean Arthur Vance");
      expect(data.host.upiId).toBe("vance.institute@okhdfcbank");
    });

    it("updates and saves host organization, coordinator details, and UPI defaults", async () => {
      activeSessionToken = hostToken;

      const req = new NextRequest("http://localhost:3000/api/v1/host/profile", {
        method: "PATCH",
        body: JSON.stringify({
          orgName: "Vance Institute of Technology & AI Research",
          type: "college",
          coordinatorName: "Dean Arthur Vance Jr.",
          coordinatorPhone: "9999988888",
          city: "New Delhi",
          address: "Sector 14, Institutional Area",
          website: "https://vance-tech.edu",
          bio: "Premier engineering chapter fostering collegiate hackathon culture.",
          upiId: "vance.research@okaxis",
          bankAccountName: "Vance Innovation Council",
        }),
      });

      const res = await patchHostProfile(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.host.orgName).toBe("Vance Institute of Technology & AI Research");
      expect(data.host.city).toBe("New Delhi");
      expect(data.host.upiId).toBe("vance.research@okaxis");
      expect(data.host.user.name).toBe("Dean Arthur Vance Jr.");
      expect(data.host.user.phone).toBe("9999988888");

      // Verify DB persistence
      const freshHost = await prisma.hostProfile.findUnique({
        where: { id: hostProfile.id },
        include: { user: true },
      });
      expect(freshHost?.orgName).toBe("Vance Institute of Technology & AI Research");
      expect(freshHost?.user.name).toBe("Dean Arthur Vance Jr.");
    });
  });

  describe("2. Cohort Push Notifications (POST /api/v1/host/notifications)", () => {
    it("allows host to push broadcast notification to all participants in their hackathon", async () => {
      activeSessionToken = hostToken;

      const req = new NextRequest("http://localhost:3000/api/v1/host/notifications", {
        method: "POST",
        body: JSON.stringify({
          hackathonId: hackathon.id,
          audience: "ALL_PARTICIPANTS",
          title: "Problem Statement Reveal Warning",
          message: "All problem statements will be unlocked in 10 minutes. Prepare your team workspaces.",
          priority: "URGENT",
          link: "/dashboard/student",
        }),
      });

      const res = await postHostNotification(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.deliveredCount).toBeGreaterThanOrEqual(2); // lead + member

      // Verify lead received in-app notification
      const leadNotif = await prisma.notification.findFirst({
        where: { userId: studentLead.id },
        orderBy: { createdAt: "desc" },
      });
      expect(leadNotif).toBeDefined();
      const payload = JSON.parse(leadNotif!.payload);
      expect(payload.title).toBe("Problem Statement Reveal Warning");
      expect(payload.metadata.audience).toBe("ALL_PARTICIPANTS");

      // Verify member received in-app notification
      const memberNotif = await prisma.notification.findFirst({
        where: { userId: studentMember.id },
        orderBy: { createdAt: "desc" },
      });
      expect(memberNotif).toBeDefined();
    });

    it("allows host to push notifications targeting judges only", async () => {
      activeSessionToken = hostToken;

      const req = new NextRequest("http://localhost:3000/api/v1/host/notifications", {
        method: "POST",
        body: JSON.stringify({
          hackathonId: hackathon.id,
          audience: "JUDGES",
          title: "Evaluation Briefing Call",
          message: "Jury alignment call scheduled on Google Meet at 11 AM.",
          priority: "NORMAL",
        }),
      });

      const res = await postHostNotification(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.deliveredCount).toBe(1);

      // Verify judge received the notification
      const judgeNotif = await prisma.notification.findFirst({
        where: { userId: judgeUser.id },
        orderBy: { createdAt: "desc" },
      });
      expect(judgeNotif).toBeDefined();
      const payload = JSON.parse(judgeNotif!.payload);
      expect(payload.title).toBe("Evaluation Briefing Call");
    });
  });

  describe("3. UTR Payment Verification & Updating", () => {
    it("allows host to update UTR reference number independently via UPDATE_UTR", async () => {
      activeSessionToken = hostToken;

      const req = new NextRequest(`http://localhost:3000/api/v1/host/payments/${payment.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          action: "UPDATE_UTR",
          utrNumber: "BANK-UTR-998877665544",
        }),
      });

      const res = await patchPayment(req, { params: { paymentId: payment.id } });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.payment.txnRef).toBe("BANK-UTR-998877665544");

      const dbPay = await prisma.payment.findUnique({ where: { id: payment.id } });
      expect(dbPay?.txnRef).toBe("BANK-UTR-998877665544");
    });

    it("approves payment, stores bank verified UTR, generates Team ID, and activates squad", async () => {
      activeSessionToken = hostToken;

      const verifiedBankUtr = "BANK-CONFIRMED-889900112233";
      const req = new NextRequest(`http://localhost:3000/api/v1/host/payments/${payment.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          action: "APPROVE",
          utrNumber: verifiedBankUtr,
        }),
      });

      const res = await patchPayment(req, { params: { paymentId: payment.id } });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.teamId).toMatch(/^TEAM-[A-Z0-9]+$/);
      expect(data.utrNumber).toBe(verifiedBankUtr);

      // Verify DB status
      const updatedPay = await prisma.payment.findUnique({ where: { id: payment.id } });
      expect(updatedPay?.status).toBe("VERIFIED");
      expect(updatedPay?.txnRef).toBe(verifiedBankUtr);
      expect(updatedPay?.verifiedAt).toBeDefined();

      const updatedTeam = await prisma.team.findUnique({ where: { id: team.id } });
      expect(updatedTeam?.status).toBe("ACTIVE");
      expect(updatedTeam?.teamId).toBe(data.teamId);
    });
  });

  describe("4. Microsoft Excel (.xlsx) Reports Export", () => {
    it("exports complete team-wise participants report with all columns as .xlsx", async () => {
      activeSessionToken = hostToken;

      const req = new NextRequest(
        `http://localhost:3000/api/v1/host/hackathons/${hackathon.id}/export?type=participants`
      );

      const res = await exportHackathon(req, { params: { id: hackathon.id } });
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      expect(res.headers.get("Content-Disposition")).toContain(".xlsx");

      const arrayBuffer = await res.arrayBuffer();
      expect(arrayBuffer.byteLength).toBeGreaterThan(0);

      // Parse with xlsx library to verify sheets and rows
      const workbook = XLSX.read(Buffer.from(arrayBuffer), { type: "buffer" });
      expect(workbook.SheetNames).toContain("Team-Wise Participants");
      expect(workbook.SheetNames).toContain("Squads Overview");

      const participantsSheet = workbook.Sheets["Team-Wise Participants"];
      const rows: any[] = XLSX.utils.sheet_to_json(participantsSheet);
      expect(rows.length).toBeGreaterThanOrEqual(2); // Leader and Member

      const leaderRow = rows.find((r) => r.Role === "Leader");
      expect(leaderRow).toBeDefined();
      expect(leaderRow["Student Name"]).toBe("Arjun Sharma");
      expect(leaderRow["Student Email"]).toBe(studentLead.email);
      expect(leaderRow["Team Name"]).toBe("CipherSquad v4");
      expect(leaderRow["Payment Status"]).toBe("VERIFIED");
    });

    it("exports judges roster report as .xlsx", async () => {
      activeSessionToken = hostToken;

      const req = new NextRequest(
        `http://localhost:3000/api/v1/host/hackathons/${hackathon.id}/export?type=judges`
      );

      const res = await exportHackathon(req, { params: { id: hackathon.id } });
      expect(res.status).toBe(200);

      const arrayBuffer = await res.arrayBuffer();
      const workbook = XLSX.read(Buffer.from(arrayBuffer), { type: "buffer" });
      expect(workbook.SheetNames).toContain("Judges Roster");

      const judgesRows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets["Judges Roster"]);
      expect(judgesRows.length).toBeGreaterThanOrEqual(1);
      expect(judgesRows[0]["Name"]).toBe("Dr. Vikram Seth");
      expect(judgesRows[0]["Company / Organization"]).toBe("Meta Platforms");
    });

    it("exports payment queue with UTR verification columns as .xlsx", async () => {
      activeSessionToken = hostToken;

      const req = new NextRequest(
        `http://localhost:3000/api/v1/host/hackathons/${hackathon.id}/export?type=payments`
      );

      const res = await exportHackathon(req, { params: { id: hackathon.id } });
      expect(res.status).toBe(200);

      const arrayBuffer = await res.arrayBuffer();
      const workbook = XLSX.read(Buffer.from(arrayBuffer), { type: "buffer" });
      expect(workbook.SheetNames).toContain("Payment Queue");

      const paymentRows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets["Payment Queue"]);
      expect(paymentRows.length).toBeGreaterThanOrEqual(1);
      expect(paymentRows[0]["Team Name"]).toBe("CipherSquad v4");
      expect(paymentRows[0]["Amount (INR)"]).toBe(500);
      expect(paymentRows[0]["Submitted UTR / Txn Ref"]).toBe("BANK-CONFIRMED-889900112233");
      expect(paymentRows[0]["Payment Status"]).toBe("VERIFIED");
    });
  });
});
