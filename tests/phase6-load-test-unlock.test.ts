import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/db";
import { generateHackathonId, generateTeamId } from "../src/lib/id-generator";

describe("Phase 6: High-Concurrency Problem Statement Unlock & Capacity Cap Load Test", () => {
  let hostUser: any;
  let testHackathon: any;
  let testDomain: any;
  let cappedStatement: any;
  const createdUserIds: string[] = [];
  const createdTeamIds: string[] = [];

  const STATEMENT_CAP = 3;
  const CONCURRENT_TEAMS_COUNT = 10;

  beforeAll(async () => {
    // 1. Get host
    hostUser = await prisma.user.findUnique({
      where: { email: "host.mit@college.edu" },
      include: { hostProfile: true },
    });

    const now = new Date();
    const past = new Date(Date.now() - 3600000); // 1 hr ago (reveal already active)
    const future = new Date(Date.now() + 86400000 * 3);

    // 2. Create test hackathon and problem statement with explicit cap = 3
    testHackathon = await prisma.hackathon.create({
      data: {
        hostId: hostUser.hostProfile.id,
        title: `Concurrency Arena ${Date.now()}`,
        slug: `concurrency-arena-${Date.now()}`,
        description: "Testing atomic row locking and cap limits under concurrency",
        rules: "Concurrent test rules",
        status: "PUBLISHED",
        startAt: now,
        endAt: future,
      },
    });

    testDomain = await prisma.domain.create({
      data: {
        hackathonId: testHackathon.id,
        name: "High Scalability AI",
        revealAt: past, // Already revealed
      },
    });

    cappedStatement = await prisma.problemStatement.create({
      data: {
        domainId: testDomain.id,
        title: "Autonomous Distributed Sharding Engine",
        description: "Design a fault-tolerant state machine supporting 100k TPS.",
        cap: STATEMENT_CAP, // Explicit cap of 3
      },
    });

    // 3. Create 10 active teams with distinct leads
    for (let i = 0; i < CONCURRENT_TEAMS_COUNT; i++) {
      const email = `concurrent.lead.${i}.${Date.now()}@test.edu`;
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash: "dummyhash",
          role: "STUDENT",
          name: `Concurrent Lead ${i}`,
          studentProfile: {
            create: {
              hackathonId: generateHackathonId(),
              college: "MIT Concurrency Lab",
            },
          },
        },
        include: { studentProfile: true },
      });
      createdUserIds.push(user.id);

      const team = await prisma.team.create({
        data: {
          hackathonId: testHackathon.id,
          leadStudentId: user.studentProfile!.id,
          name: `Concurrent Team ${i}`,
          teamId: generateTeamId(),
          status: "ACTIVE",
        },
      });
      createdTeamIds.push(team.id);
    }
  });

  afterAll(async () => {
    // Cleanup created data
    if (createdTeamIds.length > 0) {
      await prisma.codeRepo.deleteMany({ where: { teamId: { in: createdTeamIds } } });
      await prisma.teamMember.deleteMany({ where: { teamId: { in: createdTeamIds } } });
      await prisma.team.deleteMany({ where: { id: { in: createdTeamIds } } });
    }
    if (testHackathon) {
      await prisma.problemStatement.deleteMany({ where: { domainId: testDomain.id } });
      await prisma.domain.deleteMany({ where: { hackathonId: testHackathon.id } });
      await prisma.hackathon.delete({ where: { id: testHackathon.id } });
    }
    if (createdUserIds.length > 0) {
      await prisma.studentProfile.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
  });

  it(
    "should enforce atomic capacity capping when multiple teams simultaneously contest limited slots",
    async () => {
      // Simulate concurrent attempts to select the exact same capped statement
      // Each attempt runs the same atomic transaction logic used by the API
      async function attemptSelect(teamId: string, statementId: string, effectiveCap: number) {
        return prisma.$transaction(
          async (tx) => {
            const currentAssignedCount = await tx.team.count({
              where: { problemStatementId: statementId },
            });

            if (currentAssignedCount >= effectiveCap) {
              throw new Error(`SLOT_CAP_REACHED: Cap of ${effectiveCap} reached`);
            }

            const updated = await tx.team.update({
              where: { id: teamId },
              data: { problemStatementId: statementId },
            });

            await tx.codeRepo.create({
              data: {
                teamId,
                githubRepoUrl: `https://github.com/hackbridge-org/repo-${teamId}`,
                storagePath: `/repos/${teamId}`,
              },
            });

            return updated;
          },
          { timeout: 15000 }
        );
      }

      async function attemptSelectWithRetry(teamId: string, statementId: string, effectiveCap: number) {
        for (let attempt = 0; attempt < 5; attempt++) {
          try {
            return await attemptSelect(teamId, statementId, effectiveCap);
          } catch (err: any) {
            if (err.message?.includes("SLOT_CAP_REACHED")) {
              throw err;
            }
            await new Promise((r) => setTimeout(r, 60 * (attempt + 1)));
          }
        }
        return attemptSelect(teamId, statementId, effectiveCap);
      }

      // Launch all 10 concurrent requests at the exact same instant
      const selectionPromises = createdTeamIds.map((teamId) =>
        attemptSelectWithRetry(teamId, cappedStatement.id, STATEMENT_CAP)
      );

      const outcomes = await Promise.allSettled(selectionPromises);

      const fulfilled = outcomes.filter((o) => o.status === "fulfilled");
      const rejected = outcomes.filter((o) => o.status === "rejected");

      // Exactly STATEMENT_CAP (3) should succeed
      expect(fulfilled.length).toBe(STATEMENT_CAP);

      // The remaining (7) should be safely rejected with SLOT_CAP_REACHED
      expect(rejected.length).toBe(CONCURRENT_TEAMS_COUNT - STATEMENT_CAP);
      for (const r of rejected) {
        if (r.status === "rejected") {
          expect(r.reason.message).toContain("SLOT_CAP_REACHED");
        }
      }

    // Verify in database that exactly STATEMENT_CAP teams have this statement
    const dbCount = await prisma.team.count({
      where: { problemStatementId: cappedStatement.id },
    });
    expect(dbCount).toBe(STATEMENT_CAP);

    // Verify exactly STATEMENT_CAP code repos were provisioned
    const repoCount = await prisma.codeRepo.count({
      where: { teamId: { in: createdTeamIds } },
    });
    expect(repoCount).toBe(STATEMENT_CAP);
  }, 30000);
});

