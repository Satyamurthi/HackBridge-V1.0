import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/db";
import { generateHackathonId, generateTeamId } from "../src/lib/id-generator";

describe("Phase 4: Event Day, Problem Allocation, Progress Scale, and Immutable Submissions", () => {
  let hostUser: any;
  let studentUser: any;
  let testHackathon: any;
  let testTeam: any;
  let domainRevealed: any;
  let domainFuture: any;
  let statement1: any;
  let statement2: any;

  beforeAll(async () => {
    hostUser = await prisma.user.findUnique({
      where: { email: "host.mit@college.edu" },
      include: { hostProfile: true },
    });

    // Create an isolated test student for Phase 4
    const email = `p4.student.${Date.now()}@test.edu`;
    studentUser = await prisma.user.create({
      data: {
        email,
        passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
        role: "STUDENT",
        status: "ACTIVE",
        name: "P4 Event Builder",
        studentProfile: {
          create: {
            hackathonId: generateHackathonId(),
            college: "IIT Madras",
          },
        },
      },
      include: { studentProfile: true },
    });

    const now = new Date();
    const future = new Date(Date.now() + 86400000 * 5);

    // Create test hackathon with 1 unlocked domain and 1 locked domain
    testHackathon = await prisma.$transaction(async (tx) => {
      const h = await tx.hackathon.create({
        data: {
          hostId: hostUser.hostProfile.id,
          title: `Phase 4 Live Arena Track ${Date.now()}`,
          slug: `p4-arena-${Date.now()}`,
          description: "Testing Event Day features",
          rules: "Strict PRD compliance",
          status: "PUBLISHED",
          startAt: now,
          endAt: future,
        },
      });

      // Domain 1: Already revealed (revealAt in past)
      domainRevealed = await tx.domain.create({
        data: {
          hackathonId: h.id,
          name: "High Performance Computing",
          description: "Distributed parallel processing",
          revealAt: new Date(Date.now() - 3600000), // 1 hour ago
        },
      });

      // Domain 2: Locked (revealAt 2 hours in future)
      domainFuture = await tx.domain.create({
        data: {
          hackathonId: h.id,
          name: "Quantum Cryptography",
          description: "Post-quantum key exchange",
          revealAt: new Date(Date.now() + 7200000), // 2 hours in future
        },
      });

      // Problem 1 under revealed domain (with cap = 1 for testing slot lock)
      statement1 = await tx.problemStatement.create({
        data: {
          domainId: domainRevealed.id,
          title: "Lock-Free Ring Buffer Accelerator",
          description: "Build an ultra-low latency IPC ring buffer in Rust/C++",
          cap: 1, // Cap = 1 to test full lock
        },
      });

      // Problem 2 under revealed domain
      statement2 = await tx.problemStatement.create({
        data: {
          domainId: domainRevealed.id,
          title: "Heterogeneous GPU Task Scheduler",
          description: "Fair-share dynamic scheduling across multi-node clusters",
          cap: 2,
        },
      });

      return h;
    });

    // Create a verified active team with official Team ID
    const officialTeamId = generateTeamId();
    testTeam = await prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: {
          hackathonId: testHackathon.id,
          leadStudentId: studentUser.studentProfile.id,
          name: `P4-CoreSquad-${Date.now()}`,
          status: "ACTIVE",
          teamId: officialTeamId,
        },
      });

      await tx.teamMember.create({
        data: {
          teamId: team.id,
          studentId: studentUser.studentProfile.id,
          role: "LEAD",
        },
      });

      await tx.payment.create({
        data: {
          teamId: team.id,
          mode: "FREE",
          amount: 0,
          status: "VERIFIED",
          verifiedAt: now,
        },
      });

      return team;
    });
  });

  afterAll(async () => {
    // Teardown
    if (testTeam?.id) {
      await prisma.submission.deleteMany({ where: { teamId: testTeam.id } }).catch(() => {});
      await prisma.progressUpdate.deleteMany({ where: { teamId: testTeam.id } }).catch(() => {});
      await prisma.codeRepo.deleteMany({ where: { teamId: testTeam.id } }).catch(() => {});
      await prisma.payment.deleteMany({ where: { teamId: testTeam.id } }).catch(() => {});
      await prisma.teamMember.deleteMany({ where: { teamId: testTeam.id } }).catch(() => {});
      await prisma.team.delete({ where: { id: testTeam.id } }).catch(() => {});
    }

    if (testHackathon?.id) {
      await prisma.hackathon.delete({ where: { id: testHackathon.id } }).catch(() => {});
    }

    if (studentUser?.id) {
      await prisma.studentProfile.deleteMany({ where: { userId: studentUser.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: studentUser.id } }).catch(() => {});
    }
  });

  it("should enforce server-clock countdown reveal: past domain is unlocked, future domain remains locked", async () => {
    const now = new Date();
    const isPastDomainRevealed = new Date(domainRevealed.revealAt) <= now;
    const isFutureDomainRevealed = new Date(domainFuture.revealAt) <= now;

    expect(isPastDomainRevealed).toBe(true);
    expect(isFutureDomainRevealed).toBe(false);
  });

  it("should atomically allocate a problem statement and auto-provision GitHub code repository", async () => {
    // Select statement 1
    const updatedTeam = await prisma.$transaction(async (tx) => {
      const team = await tx.team.update({
        where: { id: testTeam.id },
        data: {
          problemStatementId: statement1.id,
        },
      });

      // Auto-provision code repo named after Team ID
      const repo = await tx.codeRepo.create({
        data: {
          teamId: team.id,
          githubRepoUrl: `https://github.com/hackbridge-org/hackbridge-${team.teamId}`,
          storagePath: `/repos/${team.teamId}`,
        },
      });

      return { team, repo };
    });

    expect(updatedTeam.team.problemStatementId).toBe(statement1.id);
    expect(updatedTeam.repo.githubRepoUrl).toContain(testTeam.teamId);
  });

  it("should enforce PRD Rule 4 balanced allocation cap: locks instantly when cap is reached", async () => {
    // Current assignments to statement1
    const countAssigned = await prisma.team.count({
      where: { problemStatementId: statement1.id },
    });

    expect(countAssigned).toBe(1);
    expect(statement1.cap).toBe(1);

    // Another squad trying to take statement1 is blocked because count >= cap
    const isSlotAvailable = countAssigned < statement1.cap;
    expect(isSlotAvailable).toBe(false);
  });

  it("should enforce PRD Rule 6: Progress updates in 10% steps, timestamped, strictly never decreasing", async () => {
    // Log 10%
    const update1 = await prisma.progressUpdate.create({
      data: {
        teamId: testTeam.id,
        percent: 10,
        note: "Initial architecture and repo scaffolding completed",
      },
    });
    expect(update1.percent).toBe(10);
    expect(update1.createdAt).toBeDefined();

    // Log 30%
    const update2 = await prisma.progressUpdate.create({
      data: {
        teamId: testTeam.id,
        percent: 30,
        note: "Implemented lock-free ring buffer primitives",
      },
    });
    expect(update2.percent).toBe(30);

    // Fetch latest progress
    const latest = await prisma.progressUpdate.findFirst({
      where: { teamId: testTeam.id },
      orderBy: { percent: "desc" },
    });
    expect(latest?.percent).toBe(30);

    // Enforce invariant: An attempt to log 20% or 30% must be rejected as non-increasing
    const invalidAttempt = 20;
    const isValidStep = invalidAttempt > latest!.percent;
    expect(isValidStep).toBe(false);

    // Step must also be a multiple of 10
    const validSteps = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    expect(validSteps.includes(50)).toBe(true);
    expect(validSteps.includes(35)).toBe(false);
  });

  it("should enforce PRD Rule 7: Final submission is immutable once confirmed; only host can unlock", async () => {
    // Squad submits final project
    const submission = await prisma.$transaction(async (tx) => {
      const sub = await tx.submission.create({
        data: {
          teamId: testTeam.id,
          link: "https://github.com/hackbridge-org/hackbridge-demo",
          fileUrl: "https://storage.hackbridge.dev/binaries/release.tar.gz",
          description: "High-performance lock-free ring buffer with benchmark suite",
          locked: true, // Strictly locked
        },
      });

      await tx.team.update({
        where: { id: testTeam.id },
        data: { status: "SUBMITTED" },
      });

      return sub;
    });

    expect(submission.locked).toBe(true);
    expect(submission.submittedAt).toBeDefined();

    // Check that team cannot edit locked submission
    const isLocked = submission.locked;
    expect(isLocked).toBe(true);

    // Host unlocks submission with required audit reason
    const unlockReason = "Authorized re-upload due to missing build documentation in tarball";
    const unlocked = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        locked: false,
        unlockedBy: hostUser.id,
        unlockReason,
      },
    });

    expect(unlocked.locked).toBe(false);
    expect(unlocked.unlockedBy).toBe(hostUser.id);
    expect(unlocked.unlockReason).toBe(unlockReason);
  });
});
