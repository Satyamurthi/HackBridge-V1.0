import { describe, it, expect, beforeAll, vi } from "vitest";
import { prisma } from "../src/lib/db";
import { GET as getJudgeSubmissions } from "../src/app/api/v1/judge/submissions/route";
import { POST as scoreSubmission } from "../src/app/api/v1/judge/score/route";
import { hashPassword, signSessionToken } from "../src/lib/auth";
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

describe("Phase 20 (v5.0): Single Unified Rubric Policy Across All Phases", () => {
  let hostUser: any;
  let hostProfile: any;
  let judgeUser: any;
  let judgeProfile: any;
  let judgeToken: string;
  let hackathon: any;
  let team: any;
  let domain: any;
  let problemStatement: any;
  let criteriaList: any[] = [];
  const securePassword = "SecurePassphrase#2026";

  beforeAll(async () => {
    const hashed = await hashPassword(securePassword);

    // 1. Create Host
    hostUser = await prisma.user.create({
      data: {
        email: `host.v5rubric.${Date.now()}@hackbridge.edu`,
        name: "Host Lead v5",
        phone: "9123456788",
        role: "HOST",
        status: "ACTIVE",
        passwordHash: hashed,
      },
    });

    hostProfile = await prisma.hostProfile.create({
      data: {
        userId: hostUser.id,
        orgName: "HackBridge v5 Global Arena",
        type: "college",
        approvalStatus: "APPROVED",
        upiId: "hostv5@oksbi",
      },
    });

    // 2. Create Hackathon with Single Unified 9-Point Rubric
    hackathon = await prisma.hackathon.create({
      data: {
        hostId: hostProfile.id,
        title: `v5 Unified Rubric Hackathon ${Date.now()}`,
        slug: `v5-unified-rubric-${Date.now()}`,
        description: "Hackathon evaluating all phases on one unified rubric scorecard",
        rules: "Single unified rubric evaluates squad across Phase 1 to Phase 4",
        startAt: new Date(Date.now() - 3600000),
        endAt: new Date(Date.now() + 86400000),
        fee: 0,
        paymentMode: "FREE",
        status: "PUBLISHED",
        domains: {
          create: [
            {
              name: "Full Stack & Distributed Systems",
              description: "Distributed architectures track",
              revealAt: new Date(Date.now() - 3600000),
            },
          ],
        },
      },
      include: { domains: true },
    });

    domain = hackathon.domains[0];

    // Create 9 Unified Rubric Criteria totaling 100 max points
    const standardRubricData = [
      { name: "1. Problem Statement Comprehension", weight: 1.0, maxScore: 10 },
      { name: "2. Strategic Approach & Innovation", weight: 1.0, maxScore: 10 },
      { name: "3. System Requirements Specification", weight: 1.0, maxScore: 10 },
      { name: "4. Architecture & Engineering Design", weight: 1.0, maxScore: 10 },
      { name: "5. Core Development Execution", weight: 1.0, maxScore: 10 },
      { name: "6. Test Coverage & Quality Verification", weight: 1.0, maxScore: 10 },
      { name: "7. Production Deployment Readiness", weight: 1.0, maxScore: 10 },
      { name: "8. Technical Presentation & Showcase", weight: 1.0, maxScore: 10 },
      { name: "9. Overall Novelty & Industry Impact", weight: 2.0, maxScore: 20 },
    ];

    for (const r of standardRubricData) {
      const c = await prisma.rubricCriterion.create({
        data: {
          hackathonId: hackathon.id,
          name: r.name,
          weight: r.weight,
          maxScore: r.maxScore,
        },
      });
      criteriaList.push(c);
    }

    // 3. Create Problem Statement
    problemStatement = await prisma.problemStatement.create({
      data: {
        domainId: domain.id,
        code: "PS-V5-01",
        title: "Autonomous Resilient Cloud Mesh",
        description: "Deliver multi-phase cloud mesh architecture",
      },
    });

    // 4. Create Student & Team
    const studentUser = await prisma.user.create({
      data: {
        email: `student.v5rubric.${Date.now()}@hackbridge.edu`,
        name: "Dev Lead v5",
        role: "STUDENT",
        status: "ACTIVE",
        passwordHash: hashed,
      },
    });

    const studentProfile = await prisma.studentProfile.create({
      data: {
        userId: studentUser.id,
        college: "MIT Institute of Technology",
        hackathonId: generateHackathonId(),
      },
    });

    team = await prisma.team.create({
      data: {
        hackathonId: hackathon.id,
        domainId: domain.id,
        problemStatementId: problemStatement.id,
        leadStudentId: studentProfile.id,
        teamId: generateTeamId(),
        name: `Apex Mesh Squad ${Date.now()}`,
        status: "ACTIVE",
        submission: {
          create: {
            description: "Initial submission workspace for Apex Mesh Squad",
            locked: false,
          },
        },
      },
      include: { submission: true },
    });

    // Seed deliverables across all 4 phases
    await prisma.documentUpload.createMany({
      data: [
        {
          teamId: team.id,
          uploaderId: studentUser.id,
          stage: 1,
          fileName: "Phase1_SRS_Requirements.pdf",
          fileSize: 102400,
          fileType: "application/pdf",
          fileUrl: "/mock/phase1.pdf",
          uploaderName: "Dev Lead v5",
          version: 1,
        },
        {
          teamId: team.id,
          uploaderId: studentUser.id,
          stage: 2,
          fileName: "Phase2_Architecture_Diagram.png",
          fileSize: 204800,
          fileType: "image/png",
          fileUrl: "/mock/phase2.png",
          uploaderName: "Dev Lead v5",
          version: 1,
        },
        {
          teamId: team.id,
          uploaderId: studentUser.id,
          stage: 3,
          fileName: "Phase3_Codebase_Testing.pdf",
          fileSize: 307200,
          fileType: "application/pdf",
          fileUrl: "/mock/phase3.pdf",
          uploaderName: "Dev Lead v5",
          version: 1,
        },
        {
          teamId: team.id,
          uploaderId: studentUser.id,
          stage: 4,
          fileName: "Phase4_Final_Presentation.pdf",
          fileSize: 409600,
          fileType: "application/pdf",
          fileUrl: "/mock/phase4.pdf",
          uploaderName: "Dev Lead v5",
          version: 1,
        },
      ],
    });

    // 5. Create Judge
    judgeUser = await prisma.user.create({
      data: {
        email: `judge.v5rubric.${Date.now()}@hackbridge.edu`,
        name: "Chief Jury Evaluator",
        role: "JUDGE",
        status: "ACTIVE",
        passwordHash: hashed,
      },
    });

    judgeProfile = await prisma.judgeProfile.create({
      data: {
        userId: judgeUser.id,
        hackathonId: hackathon.id,
        domain: "Full Stack & Distributed Systems",
        approvalStatus: "APPROVED",
      },
    });

    judgeToken = await signSessionToken({
      userId: judgeUser.id,
      email: judgeUser.email,
      role: "JUDGE",
      name: judgeUser.name,
      status: "ACTIVE",
    });
  });

  it("1. Verifies that hackathon defines one unified rubric criteria set totaling 100 max points across all phases", async () => {
    const fetchedCriteria = await prisma.rubricCriterion.findMany({
      where: { hackathonId: hackathon.id },
      orderBy: { createdAt: "asc" },
    });

    expect(fetchedCriteria.length).toBe(9);
    const totalMax = fetchedCriteria.reduce((sum, c) => sum + c.maxScore, 0);
    expect(totalMax).toBe(100);
  });

  it("2. Verifies GET /api/v1/judge/submissions enforces SINGLE_UNIFIED_ALL_PHASES policy with deliverables for Phase 1..4", async () => {
    activeSessionToken = judgeToken;

    const req = new Request(
      `http://localhost:3000/api/v1/judge/submissions?hackathonId=${hackathon.id}`,
      { method: "GET" }
    ) as any;

    const res = await getJudgeSubmissions(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.rubricPolicy).toBe("SINGLE_UNIFIED_ALL_PHASES");
    expect(body.rubricMode).toBe("SINGLE_UNIFIED");
    expect(body.phasesEvaluated).toEqual([1, 2, 3, 4]);
    expect(body.version).toBe("5.0.0");
    expect(body.criteria.length).toBe(9);

    // Verify squad has all 4 phases available for deliverable inspection
    const squadItem = body.submissions.find((s: any) => s.teamId === team.id);
    expect(squadItem).toBeDefined();
    expect(squadItem.phases.length).toBe(4);
    expect(squadItem.phases.every((p: any) => p.hasUpload)).toBe(true);
  });

  it("3. Verifies POST /api/v1/judge/score allows saving draft scores on the single unified scorecard", async () => {
    activeSessionToken = judgeToken;

    // Partial draft evaluation: Judge inspects Phase 1 & Phase 2, records marks for first 3 criteria
    const draftScores = [
      { criterionId: criteriaList[0].id, score: 9.5, notes: "Phase 1: Clear problem framing" },
      { criterionId: criteriaList[1].id, score: 8.5, notes: "Phase 1: Solid initial architecture approach" },
      { criterionId: criteriaList[2].id, score: 9.0, notes: "Phase 2: Thorough SRS specification" },
    ];

    const req = new Request("http://localhost:3000/api/v1/judge/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamId: team.id,
        scores: draftScores,
        feedback: "Promising architecture across Phase 1 and Phase 2 inspection",
        isDraft: true,
      }),
    }) as any;

    const res = await scoreSubmission(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.isDraft).toBe(true);
    expect(body.rubricPolicy).toBe("SINGLE_UNIFIED_ALL_PHASES");
    expect(body.scores.length).toBe(3);
  });

  it("4. Verifies POST /api/v1/judge/score certifies all 9 unified criteria covering all phases combined", async () => {
    activeSessionToken = judgeToken;

    // Judge completes inspection of Phase 3 (code/testing) and Phase 4 (presentation), scoring all 9 criteria
    const completeScores = [
      { criterionId: criteriaList[0].id, score: 9.5, notes: "Problem statement well defined" },
      { criterionId: criteriaList[1].id, score: 9.0, notes: "Approached systematically" },
      { criterionId: criteriaList[2].id, score: 9.5, notes: "SRS documentation complete" },
      { criterionId: criteriaList[3].id, score: 9.0, notes: "Architecture diagram clear & modular" },
      { criterionId: criteriaList[4].id, score: 9.5, notes: "Code implementation robust" },
      { criterionId: criteriaList[5].id, score: 8.5, notes: "Test coverage verified" },
      { criterionId: criteriaList[6].id, score: 9.0, notes: "Ready for live deployment" },
      { criterionId: criteriaList[7].id, score: 9.5, notes: "Pitch presentation outstanding" },
      { criterionId: criteriaList[8].id, score: 19.0, notes: "Highly novel solution" },
    ];

    const req = new Request("http://localhost:3000/api/v1/judge/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamId: team.id,
        scores: completeScores,
        feedback: "Exceptional multi-phase delivery evaluated on unified rubric",
        isDraft: false,
      }),
    }) as any;

    const res = await scoreSubmission(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.isDraft).toBe(false);
    expect(body.rubricPolicy).toBe("SINGLE_UNIFIED_ALL_PHASES");
    expect(body.scores.length).toBe(9);

    // Sum of scores: 9.5 + 9.0 + 9.5 + 9.0 + 9.5 + 8.5 + 9.0 + 9.5 + 18.5 = 92.5 / 100
    const totalAwarded = body.scores.reduce((sum: number, s: any) => sum + s.score, 0);
    expect(totalAwarded).toBe(92.5);
  });

  it("5. Verifies judge submissions endpoint reflects certified evaluation across all phases", async () => {
    activeSessionToken = judgeToken;

    const req = new Request(
      `http://localhost:3000/api/v1/judge/submissions?hackathonId=${hackathon.id}`,
      { method: "GET" }
    ) as any;

    const res = await getJudgeSubmissions(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    const squadItem = body.submissions.find((s: any) => s.teamId === team.id);
    expect(squadItem.isScored).toBe(true);
    expect(squadItem.isFinalCertified).toBe(true);
    expect(squadItem.scores.length).toBe(9);
  });
});
