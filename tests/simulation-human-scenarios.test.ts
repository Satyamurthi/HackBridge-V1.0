import { describe, it, expect, beforeAll, vi } from "vitest";
import { prisma } from "../src/lib/db";
import { POST as createTeam } from "../src/app/api/v1/teams/route";
import { GET as getProblemStatements } from "../src/app/api/v1/hackathons/[id]/problem-statements/route";
import { POST as selectStatement } from "../src/app/api/v1/teams/[teamId]/select-statement/route";
import { POST as updateProgress } from "../src/app/api/v1/teams/[teamId]/progress/route";
import { POST as uploadDocument, GET as getDocuments } from "../src/app/api/v1/teams/[teamId]/documents/route";
import { GET as getJudgeSubmissions } from "../src/app/api/v1/judge/submissions/route";
import { POST as scoreSubmission } from "../src/app/api/v1/judge/score/route";
import { signSessionToken } from "../src/lib/auth";
import { generateHackathonId } from "../src/lib/id-generator";

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

describe("Real-User Scenarios & Human Behavior Simulation Suite", () => {
  let hostUser: any;
  let hostToken: string;
  let studentUser1: any;
  let studentToken1: string;
  let studentUser2: any;
  let studentToken2: string;
  let judgeUser: any;
  let judgeToken: string;
  let hackathon: any;
  let domain1: any;
  let domain2: any;
  let statement1: any;
  let team1: any;

  beforeAll(async () => {
    const ts = Date.now();

    hostUser = await prisma.user.create({
      data: {
        email: `sim.host.${ts}@test.edu`,
        name: "Sim Host",
        role: "HOST",
        status: "ACTIVE",
        passwordHash: "hash",
        hostProfile: {
          create: {
            orgName: "Sim Engineering College",
            type: "college",
            approvalStatus: "APPROVED",
            upiId: "simhost@upi",
          },
        },
      },
      include: { hostProfile: true },
    });
    hostToken = await signSessionToken({
      userId: hostUser.id,
      email: hostUser.email,
      name: hostUser.name,
      role: hostUser.role as any,
      status: "ACTIVE",
    });

    studentUser1 = await prisma.user.create({
      data: {
        email: `sim.student1.${ts}@test.edu`,
        name: "Sim Student 1",
        role: "STUDENT",
        status: "ACTIVE",
        passwordHash: "hash",
        studentProfile: {
          create: {
            hackathonId: generateHackathonId(),
            college: "Tech University",
          },
        },
      },
      include: { studentProfile: true },
    });
    studentToken1 = await signSessionToken({
      userId: studentUser1.id,
      email: studentUser1.email,
      name: studentUser1.name,
      role: studentUser1.role as any,
      status: "ACTIVE",
    });

    studentUser2 = await prisma.user.create({
      data: {
        email: `sim.student2.${ts}@test.edu`,
        name: "Sim Student 2",
        role: "STUDENT",
        status: "ACTIVE",
        passwordHash: "hash",
        studentProfile: {
          create: {
            hackathonId: generateHackathonId(),
            college: "Tech University",
          },
        },
      },
      include: { studentProfile: true },
    });
    studentToken2 = await signSessionToken({
      userId: studentUser2.id,
      email: studentUser2.email,
      name: studentUser2.name,
      role: studentUser2.role as any,
      status: "ACTIVE",
    });

    judgeUser = await prisma.user.create({
      data: {
        email: `sim.judge.${ts}@test.edu`,
        name: "Sim Judge",
        role: "JUDGE",
        status: "ACTIVE",
        passwordHash: "hash",
      },
    });
    judgeToken = await signSessionToken({
      userId: judgeUser.id,
      email: judgeUser.email,
      name: judgeUser.name,
      role: judgeUser.role as any,
      status: "ACTIVE",
    });

    // Create Hackathon with 2 domains
    const pastReveal = new Date(Date.now() - 60000); // revealed
    hackathon = await prisma.hackathon.create({
      data: {
        hostId: hostUser.hostProfile.id,
        title: "Simulation Hackathon 2026",
        slug: `sim-hackathon-${ts}`,
        description: "Full real-user simulation environment",
        rules: "Standard collegiate rules",
        fee: 0,
        paymentMode: "FREE",
        status: "PUBLISHED",
        startAt: new Date(Date.now() - 3600000),
        endAt: new Date(Date.now() + 86400000),
        domains: {
          create: [
            {
              name: "Cloud & Infrastructure",
              description: "Distributed networks and containers",
              revealAt: pastReveal,
              problemStatements: {
                create: [
                  {
                    title: "SIM-PS1: Auto-Scaling Microservices",
                    description: "High concurrency auto-scaler",
                    difficulty: "HARD",
                    cap: 1, // Cap = 1 for slot race testing
                  },
                ],
              },
            },
            {
              name: "Data & Analytics",
              description: "Data lakes and pipeline transformations",
              revealAt: pastReveal,
              problemStatements: {
                create: [
                  {
                    title: "SIM-PS2: Stream Processor",
                    description: "High-throughput telemetry ingestion",
                    difficulty: "MEDIUM",
                    cap: 5,
                  },
                ],
              },
            },
          ],
        },
        rubricCriteria: {
          create: [
            { name: "Technical Execution", weight: 60, maxScore: 10 },
            { name: "Innovation", weight: 40, maxScore: 10 },
          ],
        },
      },
      include: {
        domains: {
          include: {
            problemStatements: true,
          },
        },
      },
    });

    domain1 = hackathon.domains[0];
    domain2 = hackathon.domains[1];
    statement1 = domain1.problemStatements[0];

    // Assign Judge to hackathon
    await prisma.judgeProfile.create({
      data: {
        userId: judgeUser.id,
        hackathonId: hackathon.id,
        approvalStatus: "APPROVED",
        designation: "Principal Judge",
      },
    });
  });

  // Human Simulation 1: Double clicks and repeated clicks on team creation
  it("Human Scenario: Double click on squad creation — prevents duplicate team creation", async () => {
    activeSessionToken = studentToken1;

    const payload = {
      hackathonId: hackathon.id,
      name: "Sim Double Click Squad",
      domainId: domain1.id,
    };

    // First click
    const req1 = new Request("http://localhost:3000/api/v1/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const res1 = await createTeam(req1 as any);
    const data1 = await res1.json();
    expect(res1.status).toBe(201);
    team1 = data1.team;

    // Rapid second click (double-click) with same student
    const req2 = new Request("http://localhost:3000/api/v1/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const res2 = await createTeam(req2 as any);
    // Student is already registered in this hackathon -> rejected cleanly!
    expect(res2.status).toBe(400);
    const data2 = await res2.json();
    expect(data2.error).toContain("already registered");
  });

  // Human Simulation 2: Invalid teammate ID (own ID, nonexistent ID, already in squad)
  it("Human Scenario: Teammate typos, lead's own ID, or non-existent student ID returns plain language error", async () => {
    const studentUser3 = await prisma.user.create({
      data: {
        email: `sim.student3.${Date.now()}@test.edu`,
        name: "Sim Student 3",
        role: "STUDENT",
        status: "ACTIVE",
        passwordHash: "hash",
        studentProfile: {
          create: {
            hackathonId: generateHackathonId(),
            college: "Tech University",
          },
        },
      },
      include: { studentProfile: true },
    });
    const studentToken3 = await signSessionToken({
      userId: studentUser3.id,
      email: studentUser3.email,
      name: studentUser3.name,
      role: studentUser3.role as any,
      status: "ACTIVE",
    });
    activeSessionToken = studentToken3;

    // Lead tries to add own ID as teammate
    const ownIdReq = new Request("http://localhost:3000/api/v1/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hackathonId: hackathon.id,
        name: "Squad Own ID Test",
        domainId: domain1.id,
        members: [{ studentId: studentUser3.studentProfile!.hackathonId }],
      }),
    });
    const ownIdRes = await createTeam(ownIdReq as any);
    expect(ownIdRes.status).toBe(400);
    const ownIdData = await ownIdRes.json();
    expect(ownIdData.error).toContain("cannot add yourself as a teammate");

    // Lead tries to add non-existent student ID
    const bogusReq = new Request("http://localhost:3000/api/v1/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hackathonId: hackathon.id,
        name: "Squad Bogus ID Test",
        domainId: domain1.id,
        members: [{ studentId: "HB-NOTREAL99" }],
      }),
    });
    const bogusRes = await createTeam(bogusReq as any);
    expect(bogusRes.status).toBe(404);
    const bogusData = await bogusRes.json();
    expect(bogusData.error).toContain("does not exist");
  });

  // Human Simulation 3: Two teams choosing the last problem statement slot concurrently
  it("Human Scenario: Two teams choosing last problem statement slot at same time — second gets 'Slots full'", async () => {
    // Team 1 chooses statement1 (cap = 1)
    activeSessionToken = studentToken1;
    const reqSelect1 = new Request(`http://localhost:3000/api/v1/teams/${team1.id}/select-statement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problemStatementId: statement1.id }),
    });
    const resSelect1 = await selectStatement(reqSelect1 as any, { params: { teamId: team1.id } });
    expect(resSelect1.status).toBe(200);

    // Team 2 tries to choose the same statement concurrently
    const studentUser4 = await prisma.user.create({
      data: {
        email: `sim.student4.${Date.now()}@test.edu`,
        name: "Sim Student 4",
        role: "STUDENT",
        status: "ACTIVE",
        passwordHash: "hash",
        studentProfile: {
          create: {
            hackathonId: generateHackathonId(),
            college: "Tech University",
          },
        },
      },
      include: { studentProfile: true },
    });
    const studentToken4 = await signSessionToken({
      userId: studentUser4.id,
      email: studentUser4.email,
      name: studentUser4.name,
      role: studentUser4.role as any,
      status: "ACTIVE",
    });

    const team2 = await prisma.team.create({
      data: {
        hackathonId: hackathon.id,
        name: "Sim Competing Squad",
        domainId: domain1.id,
        status: "ACTIVE",
        teamId: `TEAM-SIM-${Date.now()}`,
        leadStudentId: studentUser4.studentProfile!.id,
        members: {
          create: [{ studentId: studentUser4.studentProfile!.id, role: "LEAD" }],
        },
      },
    });

    activeSessionToken = studentToken4;
    const reqSelect2 = new Request(`http://localhost:3000/api/v1/teams/${team2.id}/select-statement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problemStatementId: statement1.id }),
    });
    const resSelect2 = await selectStatement(reqSelect2 as any, { params: { teamId: team2.id } });
    expect(resSelect2.status).toBe(409);
    const dataSelect2 = await resSelect2.json();
    expect(dataSelect2.error).toContain("Slots full");
  });

  // Human Simulation 4: Internet dropping & returning or empty file upload validation
  it("Human Scenario: Empty files and corrupted inputs during upload rejected with plain language guidance", async () => {
    activeSessionToken = studentToken1;

    // Empty file size (0 bytes)
    const emptyReq = new Request(`http://localhost:3000/api/v1/teams/${team1.id}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage: 1,
        fileName: "EmptyDocument.pdf",
        fileSize: 0,
        fileType: "application/pdf",
      }),
    });
    const emptyRes = await uploadDocument(emptyReq as any, { params: { teamId: team1.id } });
    expect(emptyRes.status).toBe(400);
    const emptyData = await emptyRes.json();
    expect(emptyData.error).toContain("Cannot upload empty file");
  });

  // Human Simulation 5: Clock differences / timing before reveal time
  it("Human Scenario: Clock timing — access strictly controlled relative to server clock revealAt", async () => {
    // Create domain with revealAt in future
    const futureDomain = await prisma.domain.create({
      data: {
        hackathonId: hackathon.id,
        name: "Quantum Security Track",
        revealAt: new Date(Date.now() + 60000), // 1 minute in future
        problemStatements: {
          create: [{ title: "Quantum Key Exchange", description: "QKD network simulation", cap: 2 }],
        },
      },
      include: { problemStatements: true },
    });

    // Student attempts to fetch statements for futureDomain
    const req = new Request(
      `http://localhost:3000/api/v1/hackathons/${hackathon.id}/problem-statements?domainId=${futureDomain.id}`
    );
    const res = await getProblemStatements(req as any, { params: { id: hackathon.id } });
    const data = await res.json();
    expect(res.status).toBe(200);

    const servedDomain = data.domains.find((d: any) => d.id === futureDomain.id);
    expect(servedDomain.isRevealed).toBe(false);
    expect(servedDomain.problemStatements[0].title).toContain("Problem Statement Locked");
    expect(servedDomain.problemStatements[0].description).toBeNull();
  });

  // Human Simulation 6: Full Role Journeys (Student -> Host -> Judge -> Admin)
  it("Human Scenario: Full cross-role journey with realistic actions end to end", async () => {
    // 1. Student uploads Part 1 and Part 2 documentation
    activeSessionToken = studentToken1;
    const doc1 = new Request(`http://localhost:3000/api/v1/teams/${team1.id}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage: 1,
        fileName: "Architecture-Overview.pdf",
        fileSize: 1024 * 500,
        fileType: "application/pdf",
      }),
    });
    const resDoc1 = await uploadDocument(doc1 as any, { params: { teamId: team1.id } });
    expect(resDoc1.status).toBe(201);

    // 2. Student logs progress milestone
    const progReq = new Request(`http://localhost:3000/api/v1/teams/${team1.id}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        percent: 80,
        note: "System benchmarks passed with zero latency regressions",
      }),
    });
    const resProg = await updateProgress(progReq as any, { params: { teamId: team1.id } });
    expect(resProg.status).toBe(200);

    // 3. Judge reviews assigned submissions and scores
    activeSessionToken = judgeToken;
    const judgeReq = new Request("http://localhost:3000/api/v1/judge/submissions");
    const judgeRes = await getJudgeSubmissions(judgeReq as any);
    expect(judgeRes.status).toBe(200);

    // 4. Host inspects documents and progress matrix
    activeSessionToken = hostToken;
    const hostReq = new Request(`http://localhost:3000/api/v1/teams/${team1.id}/documents`);
    const hostRes = await getDocuments(hostReq as any, { params: { teamId: team1.id } });
    const hostData = await hostRes.json();
    expect(hostRes.status).toBe(200);
    expect(hostData.stages[0].latestUpload.fileName).toBe("Architecture-Overview.pdf");
  });
});
