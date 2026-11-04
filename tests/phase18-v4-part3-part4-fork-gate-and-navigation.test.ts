import { describe, it, expect, beforeAll, vi } from "vitest";
import fs from "fs";
import path from "path";
import { prisma } from "../src/lib/db";
import { sanitizeFolderName, OP_BASE_STORAGE_DIR } from "../src/lib/github-push";
import {
  GET as getDocuments,
  POST as postDocument,
  PATCH as patchDocuments,
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

describe("Phase 18 (v4.0): Part 3 & Part 4 Large Uploads (>2GB), Repo Forking & Final Submit Gate", () => {
  let hostUser: any;
  let hostProfile: any;
  let studentUser: any;
  let studentProfile: any;
  let studentToken: string;
  let hostToken: string;
  let hackathon: any;
  let team: any;
  let domain: any;
  let problemStatement: any;

  beforeAll(async () => {
    const hashed = await hashPassword("SecureKey#2026");

    hostUser = await prisma.user.create({
      data: {
        email: `host.v4part34.${Date.now()}@hackbridge.edu`,
        name: "Host Chapter Lead",
        phone: "9123456780",
        role: "HOST",
        status: "ACTIVE",
        passwordHash: hashed,
      },
    });

    hostProfile = await prisma.hostProfile.create({
      data: {
        userId: hostUser.id,
        orgName: "National Engineering Institute",
        type: "college",
        approvalStatus: "APPROVED",
        hackId: `HOST-${Date.now().toString().slice(-6)}`,
      },
    });

    hackathon = await prisma.hackathon.create({
      data: {
        title: "HackMitten 4.0 Final Arena",
        description: "Official HackMitten 4.0 Hackathon Arena",
        slug: `hackmitten-4-arena-${Date.now()}`,
        status: "PUBLISHED",
        hostId: hostProfile.id,
        rules: "Official HackMitten 4.0 Rules & Verification Gate Protocol",
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
        name: "Autonomous Intelligence v4",
        description: "Decentralized autonomous agents",
        hackathonId: hackathon.id,
        revealAt: new Date(Date.now() - 3600000),
      },
    });

    problemStatement = await prisma.problemStatement.create({
      data: {
        domainId: domain.id,
        title: "Distributed Fault Tolerant Consensus",
        description: "Architect high performance Raft engine",
        cap: 10,
      },
    });

    studentUser = await prisma.user.create({
      data: {
        email: `student.part34.${Date.now()}@hackbridge.edu`,
        name: "Arjun Dev Lead",
        phone: "9876543210",
        role: "STUDENT",
        status: "ACTIVE",
        passwordHash: hashed,
      },
    });

    studentProfile = await prisma.studentProfile.create({
      data: {
        userId: studentUser.id,
        college: "National Institute of Technology",
        hackathonId: `HB-${Math.floor(100000 + Math.random() * 900000)}`,
      },
    });

    team = await prisma.team.create({
      data: {
        name: "Autonomous Builders Squad",
        teamId: `TEAM-V4-${Math.floor(1000 + Math.random() * 9000)}`,
        hackathonId: hackathon.id,
        leadStudentId: studentProfile.id,
        problemStatementId: problemStatement.id,
        domainId: domain.id,
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

    studentToken = await signSessionToken({
      userId: studentUser.id,
      email: studentUser.email,
      role: "STUDENT",
      status: "ACTIVE",
      name: studentUser.name,
    });

    hostToken = await signSessionToken({
      userId: hostUser.id,
      email: hostUser.email,
      role: "HOST",
      status: "ACTIVE",
      name: hostUser.name,
    });
  });

  it("1. Part 3 accepts large files up to 3GB (>2GB) and rejects files exceeding 3GB", async () => {
    activeSessionToken = studentToken;

    // Reject > 3GB on Part 3
    const tooLargeReq = new Request(
      `http://localhost:3000/api/v1/teams/${team.id}/documents`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: 3,
          fileName: "massive_tests_suite.zip",
          fileSize: 3.2 * 1024 * 1024 * 1024, // 3.2 GB
          fileType: "application/zip",
        }),
      }
    );

    const tooLargeRes = await postDocument(tooLargeReq as any, { params: { teamId: team.id } });
    expect(tooLargeRes.status).toBe(400);
    const tooLargeData = await tooLargeRes.json();
    expect(tooLargeData.error).toContain("3GB maximum limit for Part 3");

    // Accept 2.4GB on Part 3
    const validLargeReq = new Request(
      `http://localhost:3000/api/v1/teams/${team.id}/documents`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: 3,
          fileName: "part3_code_and_testcases.zip",
          fileSize: 2.4 * 1024 * 1024 * 1024, // 2.4 GB > 2GB
          fileType: "application/zip",
          liveUrl: "https://part3-demo.hackbridge.dev",
          githubRepoUrl: "https://github.com/autonomous-squad/raft-consensus",
        }),
      }
    );

    const validRes = await postDocument(validLargeReq as any, { params: { teamId: team.id } });
    expect(validRes.status).toBe(201);
    const validData = await validRes.json();
    expect(validData.success).toBe(true);
    expect(validData.upload.fileName).toBe("part3_code_and_testcases.zip");
    expect(validData.forkedRepoUrl).toContain("raft-consensus");
  });

  it("2. Part 3 updates Live URL, forks GitHub repo into host account and syncs server README.md", async () => {
    activeSessionToken = studentToken;

    const patchReq = new Request(
      `http://localhost:3000/api/v1/teams/${team.id}/documents`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          liveUrl: "https://v4-production-arena.vercel.app",
          githubRepoUrl: "https://github.com/mit-lab/distributed-engine",
        }),
      }
    );

    const patchRes = await patchDocuments(patchReq as any, { params: { teamId: team.id } });
    expect(patchRes.status).toBe(200);
    const patchData = await patchRes.json();
    expect(patchData.success).toBe(true);
    expect(patchData.forkedRepoUrl).toContain("distributed-engine");

    // Inspect server's team README.md
    const safeHackathon = sanitizeFolderName(hackathon.title);
    const safeTeam = sanitizeFolderName(team.name);
    const readmePath = path.join(process.cwd(), safeHackathon, safeTeam, "README.md");
    expect(fs.existsSync(readmePath)).toBe(true);
    const readmeContent = fs.readFileSync(readmePath, "utf8");
    expect(readmeContent).toContain("distributed-engine");
    expect(readmeContent).toContain("https://v4-production-arena.vercel.app");
  });

  it("3. Part 4 accepts large Code ZIP archive (>2GB supported) up to 3GB", async () => {
    activeSessionToken = studentToken;

    const part4Req = new Request(
      `http://localhost:3000/api/v1/teams/${team.id}/documents`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: 4,
          fileName: "part4_complete_code.zip",
          fileSize: 2.7 * 1024 * 1024 * 1024, // 2.7 GB
          fileType: "application/zip",
          liveUrl: "https://final-v4-app.hackbridge.dev",
          githubRepoUrl: "https://github.com/deepmind-lab/agentic-mesh",
        }),
      }
    );

    const part4Res = await postDocument(part4Req as any, { params: { teamId: team.id } });
    expect(part4Res.status).toBe(201);
    const part4Data = await part4Res.json();
    expect(part4Data.success).toBe(true);
    expect(part4Data.upload.fileName).toBe("part4_complete_code.zip");
    expect(part4Data.forkedRepoUrl).toContain("agentic-mesh");
  });

  it("4. Final submission is blocked when Part 4 deliverables (Documentation .pdf & PPT .pptx) are missing", async () => {
    activeSessionToken = studentToken;

    const subReq = new Request(
      `http://localhost:3000/api/v1/teams/${team.id}/submission`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          link: "https://final-v4-app.hackbridge.dev",
          description: "Full final deliverable description",
          strictDeliverableGate: true,
        }),
      }
    );

    const subRes = await postSubmission(subReq as any, { params: { teamId: team.id } });
    expect(subRes.status).toBe(400);
    const subData = await subRes.json();
    expect(subData.error).toContain("Final submission blocked");
    expect(subData.missing).toBeDefined();
    expect(subData.missing).toContain("Complete Documentation (.pdf)");
    expect(subData.missing).toContain("Complete PPT (.pptx)");
  });

  it("5. Upload Complete Documentation (.pdf) and Complete PPT (.pptx) to Part 4", async () => {
    activeSessionToken = studentToken;

    // Upload Complete Documentation .pdf
    const docReq = new Request(
      `http://localhost:3000/api/v1/teams/${team.id}/documents`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: 4,
          fileName: "Complete_Documentation.pdf",
          fileSize: 15 * 1024 * 1024,
          fileType: "application/pdf",
        }),
      }
    );
    const docRes = await postDocument(docReq as any, { params: { teamId: team.id } });
    expect(docRes.status).toBe(201);

    // Upload Complete PPT .pptx
    const pptReq = new Request(
      `http://localhost:3000/api/v1/teams/${team.id}/documents`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: 4,
          fileName: "Complete_Presentation.pptx",
          fileSize: 22 * 1024 * 1024,
          fileType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        }),
      }
    );
    const pptRes = await postDocument(pptReq as any, { params: { teamId: team.id } });
    expect(pptRes.status).toBe(201);
  });

  it("6. Final submission succeeds and permanently locks after all Part 4 deliverables are verified", async () => {
    activeSessionToken = studentToken;

    const subReq = new Request(
      `http://localhost:3000/api/v1/teams/${team.id}/submission`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          link: "https://final-v4-app.hackbridge.dev",
          description: "All deliverables uploaded: Code ZIP, Complete Documentation PDF, and Complete PPT presentation.",
          strictDeliverableGate: true,
        }),
      }
    );

    const subRes = await postSubmission(subReq as any, { params: { teamId: team.id } });
    expect(subRes.status).toBe(200);
    const subData = await subRes.json();
    expect(subData.success).toBe(true);
    expect(subData.submission.locked).toBe(true);

    // Verify immutable Rule 7: secondary submission fails
    const secondReq = new Request(
      `http://localhost:3000/api/v1/teams/${team.id}/submission`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          link: "https://final-v4-app.hackbridge.dev",
          description: "Attempted edit on locked project",
          strictDeliverableGate: true,
        }),
      }
    );
    const secondSub = await postSubmission(secondReq as any, { params: { teamId: team.id } });
    expect(secondSub.status).toBe(403);
    const secondData = await secondSub.json();
    expect(secondData.error).toContain("PRD Rule 7");
  });
});
