import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/db";
import { GET as exportHackathon } from "../src/app/api/v1/admin/hackathons/[id]/export/route";
import { signSessionToken } from "../src/lib/auth";
import * as XLSX from "xlsx";

describe("Phase 14: Hackathon Multi-Sheet Excel Export & Governance Invariants", () => {
  let adminToken: string;
  let studentToken: string;
  let testHackathon: any;

  beforeAll(async () => {
    // Generate auth tokens
    adminToken = signSessionToken({
      userId: "sa-test-uuid",
      email: "superadmin-test@hackbridge.dev",
      role: "SUPER_ADMIN",
      name: "Governance Admin",
      status: "ACTIVE",
    });

    studentToken = signSessionToken({
      userId: "student-test-uuid",
      email: "student-test@college.edu",
      role: "STUDENT",
      name: "Student Tester",
      status: "ACTIVE",
    });

    // Create a temporary test host & hackathon in test.db
    const hostUser = await prisma.user.create({
      data: {
        email: `host-${Date.now()}@college.edu`,
        name: "Test Host College",
        role: "HOST",
        status: "ACTIVE",
      },
    });

    const hostProfile = await prisma.hostProfile.create({
      data: {
        userId: hostUser.id,
        orgName: "Test Host College",
        type: "college",
        approvalStatus: "APPROVED",
        upiId: "satyu@ptaxis",
      },
    });

    testHackathon = await prisma.hackathon.create({
      data: {
        title: "Test Collegiate Hackathon Arena",
        slug: `test-arena-${Date.now()}`,
        description: "Test description for arena export validation",
        rules: "1. Rule one. 2. Rule two.",
        rulesGate: true,
        fee: 400.0,
        paymentMode: "UPI",
        upiId: "satyu@ptaxis",
        teamMin: 3,
        teamMax: 4,
        registrationDeadline: new Date(Date.now() + 86400000),
        startAt: new Date(Date.now() + 3600000),
        endAt: new Date(Date.now() + 90000000),
        status: "PUBLISHED",
        hostId: hostProfile.id,
        domains: {
          create: [
            {
              name: "AI Ops Track",
              description: "AI telemetry track",
              revealAt: new Date(Date.now() + 7200000),
              problemStatements: {
                create: [
                  {
                    title: "AI Track PS 1",
                    description: "Autonomous incident resolution",
                    difficulty: "HARD",
                    cap: 5,
                  },
                ],
              },
            },
          ],
        },
      },
      include: {
        domains: {
          include: { problemStatements: true },
        },
      },
    });

    // Create a test lead student & team
    const studentUser = await prisma.user.create({
      data: {
        email: `lead-${Date.now()}@student.edu`,
        name: "Lead Builder",
        phone: "+919876543210",
        role: "STUDENT",
        status: "ACTIVE",
      },
    });

    const studentProfile = await prisma.studentProfile.create({
      data: {
        userId: studentUser.id,
        hackathonId: `HB-${Math.floor(100000 + Math.random() * 900000)}`,
        college: "Test Engineering College",
        skills: "AI Ops, TypeScript",
      },
    });

    const testTeam = await prisma.team.create({
      data: {
        name: "Alpha Squad",
        teamId: `TEAM-${Math.floor(100000 + Math.random() * 900000)}`,
        hackathonId: testHackathon.id,
        domainId: testHackathon.domains[0].id,
        leadStudentId: studentProfile.id,
        status: "ACTIVE",
        members: {
          create: [
            {
              studentId: studentProfile.id,
              role: "LEAD",
            },
          ],
        },
        payment: {
          create: {
            mode: "QR",
            status: "VERIFIED",
            amount: 400.0,
            txnRef: "UTR987654321",
            verifiedAt: new Date(),
          },
        },
      },
    });
  });

  afterAll(async () => {
    try {
      if (testHackathon?.id) {
        await prisma.hackathon.delete({ where: { id: testHackathon.id } });
      }
    } catch {}
  });

  it("1. Rejects non-Super-Admin callers from accessing the Excel export endpoint (403)", async () => {
    const req = new Request(
      `http://localhost:3000/api/v1/admin/hackathons/${testHackathon.id}/export`,
      {
        headers: {
          cookie: `hackbridge_session=${studentToken}`,
        },
      }
    );

    const res = await exportHackathon(req as any, { params: { id: testHackathon.id } });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("Super Admin clearance required");
  });

  it("2. Super Admin generates a valid multi-sheet Excel workbook (.xlsx)", async () => {
    const req = new Request(
      `http://localhost:3000/api/v1/admin/hackathons/${testHackathon.id}/export`,
      {
        headers: {
          cookie: `hackbridge_session=${adminToken}`,
        },
      }
    );

    const res = await exportHackathon(req as any, { params: { id: testHackathon.id } });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    expect(res.headers.get("Content-Disposition")).toContain(".xlsx");

    const arrayBuffer = await res.arrayBuffer();
    expect(arrayBuffer.byteLength).toBeGreaterThan(1000);

    const wb = XLSX.read(Buffer.from(arrayBuffer), { type: "buffer" });
    expect(wb.SheetNames).toEqual([
      "Teams & Squads",
      "Students & Participants",
      "Problem Statements",
      "Judges & Scoring",
    ]);

    // Check Teams & Squads Sheet
    const teamsData: any[] = XLSX.utils.sheet_to_json(wb.Sheets["Teams & Squads"]);
    expect(teamsData.length).toBeGreaterThanOrEqual(1);
    const firstTeam = teamsData[0];
    expect(firstTeam["Squad Name"]).toBe("Alpha Squad");
    expect(firstTeam["Domain"]).toBe("AI Ops Track");
    expect(firstTeam["Payment Status"]).toBe("VERIFIED");
    expect(firstTeam["Transaction ID / UTR"]).toBe("UTR987654321");
    expect(firstTeam["Team ID"]).toMatch(/^TEAM-[A-Z0-9]+$/);

    // Check Students & Participants Sheet
    const studentsData: any[] = XLSX.utils.sheet_to_json(wb.Sheets["Students & Participants"]);
    expect(studentsData.length).toBeGreaterThanOrEqual(1);
    const firstStudent = studentsData[0];
    expect(firstStudent["Full Name"]).toBe("Lead Builder");
    expect(firstStudent["Role"]).toBe("LEAD");
    expect(firstStudent["Student ID"]).toMatch(/^HB-[A-Z0-9]+$/);

    // Check Problem Statements Sheet
    const problemsData: any[] = XLSX.utils.sheet_to_json(wb.Sheets["Problem Statements"]);
    expect(problemsData.length).toBeGreaterThanOrEqual(1);
    expect(problemsData[0]["Problem Statement Title"]).toBe("AI Track PS 1");
    expect(problemsData[0]["Difficulty"]).toBe("HARD");
  });

  it("3. Validates Hackathon UPI payment config and Rules Gate invariant", async () => {
    const fetched = await prisma.hackathon.findUnique({
      where: { id: testHackathon.id },
      include: { host: true },
    });

    expect(fetched?.upiId).toBe("satyu@ptaxis");
    expect(fetched?.paymentMode).toBe("UPI");
    expect(fetched?.rulesGate).toBe(true);
    expect(fetched?.teamMin).toBe(3);
    expect(fetched?.teamMax).toBe(4);
  });
});
