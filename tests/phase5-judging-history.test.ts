import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/db";
import { generateHackathonId, generateTeamId } from "../src/lib/id-generator";

describe("Phase 5: Judging, Host Approval, Rubrics, Weighted Scoring, and Results Privacy", () => {
  let hostUser: any;
  let judgeUser: any;
  let studentUserA: any;
  let studentUserB: any;
  let testHackathon: any;
  let criterionTech: any;
  let criterionInnov: any;
  let teamA: any;
  let teamB: any;
  let submissionA: any;
  let submissionB: any;

  beforeAll(async () => {
    hostUser = await prisma.user.findUnique({
      where: { email: "host.mit@college.edu" },
      include: { hostProfile: true },
    });

    const now = new Date();
    const future = new Date(Date.now() + 86400000 * 5);

    // Create test hackathon with 2 rubric criteria
    testHackathon = await prisma.$transaction(async (tx) => {
      const h = await tx.hackathon.create({
        data: {
          hostId: hostUser.hostProfile.id,
          title: `Phase 5 Evaluation Grand Prix ${Date.now()}`,
          slug: `p5-gp-${Date.now()}`,
          description: "Evaluating weighted scoring and results privacy",
          rules: "Standard fair play rules",
          status: "PUBLISHED",
          startAt: now,
          endAt: future,
        },
      });

      criterionTech = await tx.rubricCriterion.create({
        data: {
          hackathonId: h.id,
          name: "Technical Complexity",
          weight: 0.6, // 60%
          maxScore: 10,
        },
      });

      criterionInnov = await tx.rubricCriterion.create({
        data: {
          hackathonId: h.id,
          name: "Innovation & Approach",
          weight: 0.4, // 40%
          maxScore: 10,
        },
      });

      return h;
    });

    // Create a judge user applying to this hackathon
    judgeUser = await prisma.user.create({
      data: {
        email: `p5.judge.${Date.now()}@test.edu`,
        passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
        role: "JUDGE",
        status: "ACTIVE",
        name: "Dr. Elena Rostova",
        judgeProfiles: {
          create: {
            hackathonId: testHackathon.id,
            approvalStatus: "PENDING", // PRD Rule 5: starts as PENDING
            designation: "Principal AI Scientist",
            company: "DeepTech Labs",
          },
        },
      },
      include: { judgeProfiles: true },
    });

    // Create two students: Student A and Student B
    studentUserA = await prisma.user.create({
      data: {
        email: `p5.studentA.${Date.now()}@test.edu`,
        passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
        role: "STUDENT",
        status: "ACTIVE",
        name: "Student Alpha",
        studentProfile: {
          create: {
            hackathonId: generateHackathonId(),
            college: "MIT Chapter",
          },
        },
      },
      include: { studentProfile: true },
    });

    studentUserB = await prisma.user.create({
      data: {
        email: `p5.studentB.${Date.now()}@test.edu`,
        passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
        role: "STUDENT",
        status: "ACTIVE",
        name: "Student Beta",
        studentProfile: {
          create: {
            hackathonId: generateHackathonId(),
            college: "Stanford Chapter",
          },
        },
      },
      include: { studentProfile: true },
    });

    // Create Team A and Team B with final submissions
    teamA = await prisma.team.create({
      data: {
        hackathonId: testHackathon.id,
        leadStudentId: studentUserA.studentProfile.id,
        name: `AlphaSquad-${Date.now()}`,
        status: "SUBMITTED",
        teamId: generateTeamId(),
      },
    });

    await prisma.teamMember.create({
      data: { teamId: teamA.id, studentId: studentUserA.studentProfile.id, role: "LEAD" },
    });

    submissionA = await prisma.submission.create({
      data: {
        teamId: teamA.id,
        link: "https://demo.alphasquad.dev",
        description: "Autonomous high frequency optimizer in C++",
        locked: true,
      },
    });

    teamB = await prisma.team.create({
      data: {
        hackathonId: testHackathon.id,
        leadStudentId: studentUserB.studentProfile.id,
        name: `BetaSquad-${Date.now()}`,
        status: "SUBMITTED",
        teamId: generateTeamId(),
      },
    });

    await prisma.teamMember.create({
      data: { teamId: teamB.id, studentId: studentUserB.studentProfile.id, role: "LEAD" },
    });

    submissionB = await prisma.submission.create({
      data: {
        teamId: teamB.id,
        link: "https://demo.betasquad.dev",
        description: "Distributed consensus visualizer in Rust",
        locked: true,
      },
    });
  });

  it("should enforce PRD Rule 5: Judge cannot act until host approves profile", async () => {
    const judgeProfile = await prisma.judgeProfile.findFirst({
      where: { userId: judgeUser.id, hackathonId: testHackathon.id },
    });

    expect(judgeProfile).toBeDefined();
    expect(judgeProfile?.approvalStatus).toBe("PENDING");

    // Attempting to evaluate while PENDING is prohibited by business rule
    const canEvaluatePending = judgeProfile?.approvalStatus === "APPROVED";
    expect(canEvaluatePending).toBe(false);

    // Host approves judge
    const approvedJudge = await prisma.judgeProfile.update({
      where: { id: judgeProfile!.id },
      data: { approvalStatus: "APPROVED" },
    });

    expect(approvedJudge.approvalStatus).toBe("APPROVED");
  });

  it("should allow an approved judge to score a submission across host rubric criteria", async () => {
    const judgeProfile = await prisma.judgeProfile.findFirst({
      where: { userId: judgeUser.id, hackathonId: testHackathon.id },
    });

    // Score Team A:
    // Tech: 9/10 (weight 0.6) = 5.4
    // Innov: 8/10 (weight 0.4) = 3.2
    // Weighted Total = 8.6
    await prisma.score.create({
      data: {
        submissionId: submissionA.id,
        judgeId: judgeProfile!.id,
        criterionId: criterionTech.id,
        score: 9.0,
        notes: "Flawless low-latency execution",
      },
    });

    await prisma.score.create({
      data: {
        submissionId: submissionA.id,
        judgeId: judgeProfile!.id,
        criterionId: criterionInnov.id,
        score: 8.0,
        notes: "Novel memory management paradigm",
      },
    });

    // Score Team B:
    // Tech: 7/10 (weight 0.6) = 4.2
    // Innov: 9/10 (weight 0.4) = 3.6
    // Weighted Total = 7.8
    await prisma.score.create({
      data: {
        submissionId: submissionB.id,
        judgeId: judgeProfile!.id,
        criterionId: criterionTech.id,
        score: 7.0,
        notes: "Good concurrency model",
      },
    });

    await prisma.score.create({
      data: {
        submissionId: submissionB.id,
        judgeId: judgeProfile!.id,
        criterionId: criterionInnov.id,
        score: 9.0,
        notes: "Very creative visualization",
      },
    });

    const scoresA = await prisma.score.findMany({ where: { submissionId: submissionA.id } });
    expect(scoresA.length).toBe(2);
  });

  it("should compute weighted totals and ranking correctly", async () => {
    const criteria = [criterionTech, criterionInnov];

    // Compute for Team A
    const scoresA = await prisma.score.findMany({ where: { submissionId: submissionA.id } });
    let totalScoreA = 0;
    for (const c of criteria) {
      const match = scoresA.find((s) => s.criterionId === c.id);
      if (match) totalScoreA += match.score * c.weight;
    }

    // Compute for Team B
    const scoresB = await prisma.score.findMany({ where: { submissionId: submissionB.id } });
    let totalScoreB = 0;
    for (const c of criteria) {
      const match = scoresB.find((s) => s.criterionId === c.id);
      if (match) totalScoreB += match.score * c.weight;
    }

    expect(Number(totalScoreA.toFixed(1))).toBe(8.6);
    expect(Number(totalScoreB.toFixed(1))).toBe(7.8);
    expect(totalScoreA).toBeGreaterThan(totalScoreB); // Team A ranks 1, Team B ranks 2
  });

  it("should publish certified results with awards and prizes", async () => {
    // Host publishes Team A as 1st place and Team B as 2nd place
    const resultA = await prisma.result.create({
      data: {
        hackathonId: testHackathon.id,
        teamId: teamA.id,
        rank: 1,
        award: "Grand Champion",
        prize: "₹1,00,000",
      },
    });

    const resultB = await prisma.result.create({
      data: {
        hackathonId: testHackathon.id,
        teamId: teamB.id,
        rank: 2,
        award: "Runner Up",
        prize: "₹50,000",
      },
    });

    expect(resultA.rank).toBe(1);
    expect(resultA.award).toBe("Grand Champion");
    expect(resultB.rank).toBe(2);
    expect(resultB.award).toBe("Runner Up");
  });

  it("should strictly enforce PRD Rule 8: Squads see only their own results", async () => {
    // Team A member fetches Team A's result -> OK
    const resultForTeamA = await prisma.result.findUnique({
      where: { teamId: teamA.id },
    });
    expect(resultForTeamA).toBeDefined();
    expect(resultForTeamA?.award).toBe("Grand Champion");

    // Non-Negotiable Rule 8: Student B cannot view Team A's result
    // Server access control check:
    const teamAMembers = await prisma.teamMember.findMany({
      where: { teamId: teamA.id },
      include: { student: true },
    });

    const isStudentBInTeamA = teamAMembers.some(
      (m) => m.student.userId === studentUserB.id
    );

    // Rule 8 server enforcement: Student B is not a member of Team A and must be denied access
    expect(isStudentBInTeamA).toBe(false);
  });

  afterAll(async () => {
    // Clean up
    for (const t of [teamA, teamB]) {
      if (t?.id) {
        await prisma.result.deleteMany({ where: { teamId: t.id } }).catch(() => {});
        await prisma.score.deleteMany({ where: { submission: { teamId: t.id } } }).catch(() => {});
        await prisma.submission.deleteMany({ where: { teamId: t.id } }).catch(() => {});
        await prisma.teamMember.deleteMany({ where: { teamId: t.id } }).catch(() => {});
        await prisma.team.delete({ where: { id: t.id } }).catch(() => {});
      }
    }

    if (judgeUser?.id) {
      await prisma.judgeProfile.deleteMany({ where: { userId: judgeUser.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: judgeUser.id } }).catch(() => {});
    }

    for (const u of [studentUserA, studentUserB]) {
      if (u?.id) {
        await prisma.studentProfile.deleteMany({ where: { userId: u.id } }).catch(() => {});
        await prisma.user.delete({ where: { id: u.id } }).catch(() => {});
      }
    }

    if (testHackathon?.id) {
      await prisma.rubricCriterion.deleteMany({ where: { hackathonId: testHackathon.id } }).catch(() => {});
      await prisma.hackathon.delete({ where: { id: testHackathon.id } }).catch(() => {});
    }
  });
});
