import { describe, it, expect, beforeAll, vi } from "vitest";
import { prisma } from "../src/lib/db";
import { POST as createTeam } from "../src/app/api/v1/teams/route";
import { GET as getProblemStatements } from "../src/app/api/v1/hackathons/[id]/problem-statements/route";
import { POST as selectStatement } from "../src/app/api/v1/teams/[teamId]/select-statement/route";
import { POST as submitProject } from "../src/app/api/v1/teams/[teamId]/submission/route";
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

describe("Phase 11: Domain-Scoped Problem Statements, Solution Submission & Judge Rubric Scoring", () => {
  let hostUser: any;
  let judgeUser: any;
  let judgeToken: string;
  let studentUser: any;
  let studentToken: string;
  let hackathon: any;
  let domainAI: any;
  let domainWeb3: any;
  let psAI: any;
  let psWeb3: any;
  let rubricCriterion1: any;
  let rubricCriterion2: any;
  let createdTeam: any;

  beforeAll(async () => {
    // 1. Create Host User & Profile
    hostUser = await prisma.user.create({
      data: {
        email: `host.phase11.${Date.now()}@arena.edu`,
        name: "Phase 11 Host",
        role: "HOST",
        status: "ACTIVE",
        passwordHash: "test-password-hash",
        hostProfile: {
          create: {
            orgName: "AI & Web3 Research Labs",
            type: "college",
            approvalStatus: "APPROVED",
            upiId: "researchlab@oksbi",
          },
        },
      },
      include: { hostProfile: true },
    });

    // 2. Create Multi-Domain Hackathon
    const pastReveal = new Date(Date.now() - 3600000); // 1 hour ago (unlocked)
    hackathon = await prisma.hackathon.create({
      data: {
        hostId: hostUser.hostProfile.id,
        title: "Frontier AI & Distributed Systems Hackathon",
        slug: `frontier-arena-${Date.now()}`,
        description: "Collegiate hackathon with domain-scoped tracks and rubric evaluation",
        rules: "Select domain at registration; problem statement reveal scoped to domain",
        startAt: new Date(Date.now() - 1800000),
        endAt: new Date(Date.now() + 86400000),
        fee: 0,
        paymentMode: "FREE",
        status: "PUBLISHED",
        domains: {
          create: [
            {
              name: "Autonomous Agents & LLMs",
              description: "Building autonomous systems and reasoning agents",
              revealAt: pastReveal,
              problemStatements: {
                create: [
                  {
                    title: "Self-Healing Distributed Systems Agent",
                    description: "Develop an autonomous agent capable of detecting and self-remediating cloud outages.",
                    cap: 5,
                  },
                ],
              },
            },
            {
              name: "Zero-Knowledge Cryptography & Web3",
              description: "ZK proofs, rollups, and verifiable computing",
              revealAt: pastReveal,
              problemStatements: {
                create: [
                  {
                    title: "Decentralized Identity with ZK Attestations",
                    description: "Implement privacy-preserving identity verification using zero-knowledge proofs.",
                    cap: 5,
                  },
                ],
              },
            },
          ],
        },
        rubricCriteria: {
          create: [
            {
              name: "Technical Architecture & Complexity",
              weight: 0.6,
              maxScore: 10.0,
            },
            {
              name: "Practical Impact & Execution",
              weight: 0.4,
              maxScore: 10.0,
            },
          ],
        },
      },
      include: {
        domains: {
          include: { problemStatements: true },
        },
        rubricCriteria: true,
      },
    });

    domainAI = hackathon.domains.find((d: any) => d.name.includes("Autonomous Agents"));
    domainWeb3 = hackathon.domains.find((d: any) => d.name.includes("Zero-Knowledge"));
    psAI = domainAI.problemStatements[0];
    psWeb3 = domainWeb3.problemStatements[0];
    rubricCriterion1 = hackathon.rubricCriteria[0];
    rubricCriterion2 = hackathon.rubricCriteria[1];

    // 3. Create Approved Judge
    judgeUser = await prisma.user.create({
      data: {
        email: `judge.phase11.${Date.now()}@eval.org`,
        name: "Dr. Evelyn Vance",
        role: "JUDGE",
        status: "ACTIVE",
        passwordHash: "test-password-hash",
        judgeProfiles: {
          create: {
            hackathonId: hackathon.id,
            approvalStatus: "APPROVED",
            designation: "Principal AI Scientist",
            company: "Frontier Labs",
          },
        },
      },
      include: { judgeProfiles: true },
    });

    judgeToken = signSessionToken({
      userId: judgeUser.id,
      email: judgeUser.email,
      role: "JUDGE",
      status: "ACTIVE",
      name: judgeUser.name,
    });

    // 4. Create Student User & Profile
    studentUser = await prisma.user.create({
      data: {
        email: `student.lead.${Date.now()}@inst.edu`,
        name: "Arjun Verma",
        role: "STUDENT",
        status: "ACTIVE",
        passwordHash: "test-password-hash",
        studentProfile: {
          create: {
            hackathonId: generateHackathonId(),
            college: "IIT Bombay",
          },
        },
      },
      include: { studentProfile: true },
    });

    studentToken = signSessionToken({
      userId: studentUser.id,
      email: studentUser.email,
      role: "STUDENT",
      status: "ACTIVE",
      name: studentUser.name,
      hackathonId: studentUser.studentProfile.hackathonId,
    });
  });

  it("Step 1: Student registers squad with pre-selected domain ('Autonomous Agents & LLMs')", async () => {
    activeSessionToken = studentToken;
    const mockReq = new Request("http://localhost:3000/api/v1/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hackathonId: hackathon.id,
        teamName: "Agentic Architects",
        domainId: domainAI.id,
      }),
    });

    const res = await createTeam(mockReq as any);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.team).toBeDefined();
    expect(data.team.domainId).toBe(domainAI.id);
    expect(data.team.teamId).toMatch(/^TEAM-[A-Z0-9]{6}$/);

    createdTeam = data.team;
  });

  it("Step 2: Problem statement reveal filters strictly to team's pre-selected domain only", async () => {
    const mockReq = new Request(
      `http://localhost:3000/api/v1/hackathons/${hackathon.id}/problem-statements?teamId=${createdTeam.id}`
    );

    const res = await getProblemStatements(mockReq as any, { params: { id: hackathon.id } });
    expect(res.status).toBe(200);
    const data = await res.json();

    // Must return ONLY the team's domain
    expect(data.domains).toBeDefined();
    expect(data.domains.length).toBe(1);
    expect(data.domains[0].id).toBe(domainAI.id);
    expect(data.domains[0].name).toBe("Autonomous Agents & LLMs");

    // The other domain (Web3) must NOT be shown to this team
    const hasWeb3 = data.domains.some((d: any) => d.id === domainWeb3.id);
    expect(hasWeb3).toBe(false);
  });

  it("Step 3: Attempting to select a problem statement from another domain is rejected", async () => {
    activeSessionToken = studentToken;
    const mockReq = new Request(
      `http://localhost:3000/api/v1/teams/${createdTeam.id}/select-statement`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemStatementId: psWeb3.id, // Belonging to Web3, while team is AI
        }),
      }
    );

    const res = await selectStatement(mockReq as any, { params: { teamId: createdTeam.id } });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("registered domain");
  });

  it("Step 4: Selecting problem statement within team's domain succeeds & auto-provisions code repository", async () => {
    activeSessionToken = studentToken;
    const mockReq = new Request(
      `http://localhost:3000/api/v1/teams/${createdTeam.id}/select-statement`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemStatementId: psAI.id, // Belonging to team's AI domain
        }),
      }
    );

    const res = await selectStatement(mockReq as any, { params: { teamId: createdTeam.id } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.team.problemStatementId).toBe(psAI.id);

    // Verify auto-provisioned code repository in database
    const repo = await prisma.codeRepo.findUnique({
      where: { teamId: createdTeam.id },
    });
    expect(repo).toBeDefined();
    expect(repo?.githubRepoUrl).toContain(`hackbridge-${createdTeam.teamId}`);
  });

  it("Step 5: Squad submits final project with source code repo, live link, and architecture", async () => {
    activeSessionToken = studentToken;
    const mockReq = new Request(
      `http://localhost:3000/api/v1/teams/${createdTeam.id}/submission`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          link: "https://agentic-architects.vercel.app",
          fileUrl: "https://storage.hackbridge.dev/binaries/agentic-agent-v1.tar.gz",
          description:
            "Implemented multi-agent consensus network using Raft protocol over WebSockets. Integrated telemetry collectors and automated failover orchestration.",
        }),
      }
    );

    const res = await submitProject(mockReq as any, { params: { teamId: createdTeam.id } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.submission).toBeDefined();
    expect(data.submission.locked).toBe(true);
    expect(data.submission.link).toBe("https://agentic-architects.vercel.app");
  });

  it("Step 6: Approved Judge fetches submissions and receives complete domain, problem statement, and artifact data", async () => {
    activeSessionToken = judgeToken;
    const mockReq = new Request(
      `http://localhost:3000/api/v1/judge/submissions?hackathonId=${hackathon.id}`
    );

    const res = await getJudgeSubmissions(mockReq as any);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.criteria).toBeDefined();
    expect(data.criteria.length).toBe(2);

    const targetSub = data.submissions.find((s: any) => s.teamId === createdTeam.id);
    expect(targetSub).toBeDefined();
    expect(targetSub.team.name).toBe("Agentic Architects");
    expect(targetSub.team.domain.name).toBe("Autonomous Agents & LLMs");
    expect(targetSub.team.problemStatement.title).toBe("Self-Healing Distributed Systems Agent");
    expect(targetSub.link).toBe("https://agentic-architects.vercel.app");
    expect(targetSub.fileUrl).toBe("https://storage.hackbridge.dev/binaries/agentic-agent-v1.tar.gz");
    expect(targetSub.team.codeRepo.githubRepoUrl).toBeDefined();
  });

  it("Step 7: Judge scores submission against host-configured weighted rubrics", async () => {
    activeSessionToken = judgeToken;

    // Get submission record
    const subRecord = await prisma.submission.findUnique({
      where: { teamId: createdTeam.id },
    });

    const mockReq = new Request("http://localhost:3000/api/v1/judge/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submissionId: subRecord?.id,
        scores: [
          {
            criterionId: rubricCriterion1.id,
            score: 9.5,
            notes: "Outstanding distributed systems architecture and fault tolerance.",
          },
          {
            criterionId: rubricCriterion2.id,
            score: 8.5,
            notes: "Clear practical value and great deployment automation.",
          },
        ],
      }),
    });

    const res = await scoreSubmission(mockReq as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.scores.length).toBe(2);

    // Verify stored scores in database
    const storedScores = await prisma.score.findMany({
      where: { submissionId: subRecord?.id },
    });
    expect(storedScores.length).toBe(2);
    const scoreMap = new Map(storedScores.map((s) => [s.criterionId, s.score]));
    expect(scoreMap.get(rubricCriterion1.id)).toBe(9.5);
    expect(scoreMap.get(rubricCriterion2.id)).toBe(8.5);
  });
});
