import { describe, it, expect, beforeAll, vi } from "vitest";
import { prisma } from "../src/lib/db";
import {
  GET as getDocuments,
  POST as postDocument,
} from "../src/app/api/v1/teams/[teamId]/documents/route";
import { POST as postSubmission } from "../src/app/api/v1/teams/[teamId]/submission/route";
import { hashPassword, signSessionToken } from "../src/lib/auth";

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

describe("Phase 19 (v5.0): Sequential Phase Upload Blocking & Mandatory Submission Fields Gate", () => {
  let hostUser: any;
  let hostProfile: any;
  let studentUser: any;
  let studentProfile: any;
  let studentToken: string;
  let hackathon: any;
  let team: any;
  let domain: any;
  let problemStatement: any;

  beforeAll(async () => {
    const hashed = await hashPassword("SecureKey#2026");

    hostUser = await prisma.user.create({
      data: {
        email: `host.v5seq.${Date.now()}@hackbridge.edu`,
        name: "Host Chapter Lead v5",
        phone: "9123456799",
        role: "HOST",
        status: "ACTIVE",
        passwordHash: hashed,
      },
    });

    hostProfile = await prisma.hostProfile.create({
      data: {
        userId: hostUser.id,
        orgName: "National Engineering Institute v5",
        type: "college",
        approvalStatus: "APPROVED",
        hackId: `HOST-V5-${Date.now().toString().slice(-6)}`,
      },
    });

    hackathon = await prisma.hackathon.create({
      data: {
        title: "HackMitten 5.0 Official Arena",
        description: "Official HackMitten 5.0 Hackathon Arena with Sequential Phase Gate",
        slug: `hackmitten-5-arena-${Date.now()}`,
        status: "PUBLISHED",
        hostId: hostProfile.id,
        rules: "Official HackMitten 5.0 Sequential Phase Rules",
        fee: 0,
        startAt: new Date(Date.now() - 3600000),
        endAt: new Date(Date.now() + 86400000 * 3),
        part1Due: new Date(Date.now() + 3600000 * 6),
        part2Due: new Date(Date.now() + 3600000 * 12),
        part3Due: new Date(Date.now() + 3600000 * 18),
        part4Due: new Date(Date.now() + 3600000 * 24),
      },
    });

    domain = await prisma.domain.create({
      data: {
        name: "Autonomous Cyber-Physical Systems v5",
        description: "Autonomous robotics and hardware-software systems",
        hackathonId: hackathon.id,
        revealAt: new Date(Date.now() - 3600000),
      },
    });

    problemStatement = await prisma.problemStatement.create({
      data: {
        domainId: domain.id,
        title: "V5 Intelligent Edge Coordinator",
        description: "Edge coordinating agent with zero latency tolerance",
        cap: 10,
      },
    });

    studentUser = await prisma.user.create({
      data: {
        email: `lead.v5seq.${Date.now()}@hackbridge.edu`,
        name: "Captain Sequential V5",
        phone: "9123456788",
        role: "STUDENT",
        status: "ACTIVE",
        passwordHash: hashed,
      },
    });

    studentProfile = await prisma.studentProfile.create({
      data: {
        userId: studentUser.id,
        college: "MIT Institute of Technology",
        hackathonId: `HB-${Math.floor(100000 + Math.random() * 900000)}`,
      },
    });

    studentToken = await signSessionToken({
      userId: studentUser.id,
      email: studentUser.email,
      role: "STUDENT",
      name: studentUser.name,
      status: "ACTIVE",
    });

    team = await prisma.team.create({
      data: {
        teamId: `TEAM-V5-${Math.floor(1000 + Math.random() * 9000)}`,
        name: `Squad Sequential Alpha ${Date.now()}`,
        hackathonId: hackathon.id,
        leadStudentId: studentProfile.id,
        domainId: domain.id,
        problemStatementId: problemStatement.id,
        status: "ACTIVE",
      },
    });

    await prisma.teamMember.create({
      data: {
        teamId: team.id,
        studentId: studentProfile.id,
        role: "LEADER",
      },
    });
  });

  it("1. GET /api/v1/teams/[teamId]/documents exposes isBlockedByPriorStage=true for Phase 2 before Phase 1 is uploaded", async () => {
    activeSessionToken = studentToken;

    const req = new Request(`http://localhost:3000/api/v1/teams/${team.id}/documents`, {
      method: "GET",
    });

    const res = await getDocuments(req as any, { params: { teamId: team.id } });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.stages).toBeDefined();

    const stage1 = data.stages.find((s: any) => s.stage === 1);
    const stage2 = data.stages.find((s: any) => s.stage === 2);

    expect(stage1.isBlockedByPriorStage).toBe(false);
    expect(stage2.isBlockedByPriorStage).toBe(true);
    expect(stage2.requiredPriorStage).toBe(1);
  });

  it("2. Uploading Phase 2 without prior Phase 1 returns HTTP 400 with sequential gate error", async () => {
    activeSessionToken = studentToken;

    const req = new Request(`http://localhost:3000/api/v1/teams/${team.id}/documents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-v5-gate": "true",
      },
      body: JSON.stringify({
        stage: 2,
        fileName: "phase2-code.zip",
        fileSize: 1024 * 500,
        fileType: "application/zip",
        enforceSequentialPhases: true,
      }),
    });

    const res = await postDocument(req as any, { params: { teamId: team.id } });
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toContain("Phase 1 must be uploaded and submitted before Phase 2 can be unlocked for upload.");
    expect(data.lockedByPriorStage).toBe(1);
  });

  it("3. Uploading Phase 1 document succeeds and satisfies Phase 1 requirement", async () => {
    activeSessionToken = studentToken;

    const req = new Request(`http://localhost:3000/api/v1/teams/${team.id}/documents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-v5-gate": "true",
      },
      body: JSON.stringify({
        stage: 1,
        fileName: "phase1-architecture-specs.pdf",
        fileSize: 1024 * 300,
        fileType: "application/pdf",
        enforceSequentialPhases: true,
      }),
    });

    const res = await postDocument(req as any, { params: { teamId: team.id } });
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.upload.stage).toBe(1);
    expect(data.upload.version).toBe(1);
  });

  it("4. Phase 2 upload now succeeds once Phase 1 is submitted", async () => {
    activeSessionToken = studentToken;

    const req = new Request(`http://localhost:3000/api/v1/teams/${team.id}/documents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-v5-gate": "true",
      },
      body: JSON.stringify({
        stage: 2,
        fileName: "phase2-core-engine.zip",
        fileSize: 1024 * 800,
        fileType: "application/zip",
        liveUrl: "https://v5-demo.hackbridge.in",
        githubRepoUrl: "https://github.com/myteam/hackathon-v5-project",
        enforceSequentialPhases: true,
      }),
    });

    const res = await postDocument(req as any, { params: { teamId: team.id } });
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.upload.stage).toBe(2);
    expect(data.upload.version).toBe(1);
  });

  it("5. Sequential phase progression holds for Stage 3 & Stage 4 (Stage 4 blocked if Stage 3 missing)", async () => {
    activeSessionToken = studentToken;

    // Stage 4 attempt before Stage 3 is uploaded
    const reqStage4Blocked = new Request(`http://localhost:3000/api/v1/teams/${team.id}/documents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-v5-gate": "true",
      },
      body: JSON.stringify({
        stage: 4,
        fileName: "phase4-final-package.zip",
        fileSize: 1024 * 1000,
        fileType: "application/zip",
        enforceSequentialPhases: true,
      }),
    });

    const resStage4Blocked = await postDocument(reqStage4Blocked as any, { params: { teamId: team.id } });
    expect(resStage4Blocked.status).toBe(400);

    const dataBlocked = await resStage4Blocked.json();
    expect(dataBlocked.error).toContain("Phase 3 must be uploaded and submitted before Phase 4 can be unlocked for upload.");
    expect(dataBlocked.lockedByPriorStage).toBe(3);

    // Upload Stage 3
    const reqStage3 = new Request(`http://localhost:3000/api/v1/teams/${team.id}/documents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-v5-gate": "true",
      },
      body: JSON.stringify({
        stage: 3,
        fileName: "phase3-testing-suite.zip",
        fileSize: 1024 * 700,
        fileType: "application/zip",
        enforceSequentialPhases: true,
      }),
    });

    const resStage3 = await postDocument(reqStage3 as any, { params: { teamId: team.id } });
    expect(resStage3.status).toBe(201);

    // Now Stage 4 upload succeeds
    const reqStage4 = new Request(`http://localhost:3000/api/v1/teams/${team.id}/documents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-v5-gate": "true",
      },
      body: JSON.stringify({
        stage: 4,
        fileName: "phase4-final-code.zip",
        fileSize: 1024 * 1200,
        fileType: "application/zip",
        enforceSequentialPhases: true,
      }),
    });

    const resStage4 = await postDocument(reqStage4 as any, { params: { teamId: team.id } });
    expect(resStage4.status).toBe(201);
  });

  it("6. Final Submission in v5.0 rejects submission if any required field is missing", async () => {
    activeSessionToken = studentToken;

    // Seed remaining Part 4 deliverables (doc & ppt)
    await prisma.documentUpload.createMany({
      data: [
        {
          teamId: team.id,
          stage: 4,
          version: 2,
          fileName: "Part4-Comprehensive-Report.pdf",
          fileSize: 1024 * 400,
          fileType: "PDF",
          fileUrl: "/storage/teams/v5-report.pdf",
          uploaderId: studentProfile.id,
          uploaderName: "Captain Sequential V5",
          syncStatus: "Synced",
        },
        {
          teamId: team.id,
          stage: 4,
          version: 3,
          fileName: "Part4-Pitch-Deck.pptx",
          fileSize: 1024 * 600,
          fileType: "PPTX",
          fileUrl: "/storage/teams/v5-deck.pptx",
          uploaderId: studentProfile.id,
          uploaderName: "Captain Sequential V5",
          syncStatus: "Synced",
        },
      ],
    });

    // Attempt submission missing Binary URL (fileUrl)
    const reqMissingBinary = new Request(`http://localhost:3000/api/v1/teams/${team.id}/submission`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-v5-gate": "true",
      },
      body: JSON.stringify({
        link: "https://demo.hackbridge.in/v5-robotics",
        description: "Autonomous edge drone dispatching and telemetry processing system with sub-10ms response time.",
        enforceAllFields: true,
        strictDeliverableGate: true,
      }),
    });

    const resMissingBinary = await postSubmission(reqMissingBinary as any, { params: { teamId: team.id } });
    expect(resMissingBinary.status).toBe(400);

    const dataMissing = await resMissingBinary.json();
    expect(dataMissing.error).toContain("All submission fields must be filled before finalizing");
    expect(dataMissing.missingFields).toContain("Application Binary / APK / Release File URL");
  });

  it("7. Final Submission succeeds and freezes permanently when all fields and Part 4 deliverables are satisfied", async () => {
    activeSessionToken = studentToken;

    const reqValidSubmit = new Request(`http://localhost:3000/api/v1/teams/${team.id}/submission`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-v5-gate": "true",
      },
      body: JSON.stringify({
        link: "https://demo.hackbridge.in/v5-robotics",
        fileUrl: "https://releases.hackbridge.in/downloads/v5-edge-daemon.apk",
        description: "Comprehensive autonomous edge coordinator architecture with real-time sensor fusion, zero-trust cryptographic audit trails, and automated failover.",
        enforceAllFields: true,
        strictDeliverableGate: true,
      }),
    });

    const resValidSubmit = await postSubmission(reqValidSubmit as any, { params: { teamId: team.id } });
    expect(resValidSubmit.status).toBe(200);

    const data = await resValidSubmit.json();
    expect(data.submission).toBeDefined();
    expect(data.submission.link).toBe("https://demo.hackbridge.in/v5-robotics");
    expect(data.submission.fileUrl).toBe("https://releases.hackbridge.in/downloads/v5-edge-daemon.apk");
    expect(data.submission.locked).toBe(true);

    // Verify database record has locked status
    const dbSub = await prisma.submission.findUnique({
      where: { teamId: team.id },
    });
    expect(dbSub?.locked).toBe(true);
  });
});
