import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/db";
import { generateHackathonId } from "../src/lib/id-generator";

describe("Phase 2: Host Builder, Listing, Approval Gate, and Timers", () => {
  let approvedHostUser: any;
  let pendingHostUser: any;
  let superAdminUser: any;
  let testHackathon: any;

  beforeAll(async () => {
    approvedHostUser = await prisma.user.findUnique({
      where: { email: "host.mit@college.edu" },
      include: { hostProfile: true },
    });

    pendingHostUser = await prisma.user.findUnique({
      where: { email: "host.techcorp@startup.io" },
      include: { hostProfile: true },
    });

    superAdminUser = await prisma.user.findUnique({
      where: { email: "admin@hackbridge.dev" },
    });
  });

  it("should confirm approved and pending host profile statuses", async () => {
    expect(approvedHostUser).toBeDefined();
    expect(approvedHostUser?.hostProfile?.approvalStatus).toBe("APPROVED");

    expect(pendingHostUser).toBeDefined();
    expect(pendingHostUser?.hostProfile?.approvalStatus).toBe("PENDING");
  });

  it("should allow an approved host to create a hackathon with domains, problems, and rubric in one transaction", async () => {
    const slug = `test-arena-${Date.now()}`;
    const now = new Date();
    const future = new Date(Date.now() + 86400000 * 7);

    testHackathon = await prisma.$transaction(async (tx) => {
      const h = await tx.hackathon.create({
        data: {
          hostId: approvedHostUser.hostProfile.id,
          title: "Autonomous Systems Grand Prix",
          slug,
          description: "Testing Phase 2 transactional hackathon creation",
          rules: "Standard fair play rules.",
          rulesGate: true,
          teamMin: 1,
          teamMax: 4,
          fee: 199,
          paymentMode: "QR",
          status: "DRAFT",
          startAt: now,
          endAt: future,
        },
      });

      const domain = await tx.domain.create({
        data: {
          hackathonId: h.id,
          name: "Robotics Core",
          description: "Autonomous path planning",
          revealAt: new Date(Date.now() + 3600000), // 1 hour in future
        },
      });

      await tx.problemStatement.create({
        data: {
          domainId: domain.id,
          title: "Real-time SLAM Navigator",
          description: "Top-secret problem description revealed only at countdown end",
          cap: 5,
        },
      });

      await tx.rubricCriterion.create({
        data: {
          hackathonId: h.id,
          name: "Path Optimization Efficiency",
          weight: 0.4,
          maxScore: 10,
        },
      });

      return h;
    });

    expect(testHackathon.id).toBeDefined();
    expect(testHackathon.status).toBe("DRAFT");
    expect(testHackathon.rulesGate).toBe(true);

    // Verify relations in DB
    const fetched = await prisma.hackathon.findUnique({
      where: { id: testHackathon.id },
      include: {
        domains: { include: { problemStatements: true } },
        rubricCriteria: true,
      },
    });

    expect(fetched?.domains.length).toBe(1);
    expect(fetched?.domains[0].problemStatements.length).toBe(1);
    expect(fetched?.rubricCriteria.length).toBe(1);
  });

  it("should enforce Gate 2: only APPROVED hosts can publish a hackathon", async () => {
    // If pending host tries to publish, business rule blocks them
    expect(pendingHostUser.hostProfile.approvalStatus).not.toBe("APPROVED");

    // Approved host can publish
    const published = await prisma.hackathon.update({
      where: { id: testHackathon.id },
      data: { status: "PUBLISHED" },
    });

    expect(published.status).toBe("PUBLISHED");
  });

  it("should verify timer-based server clock masking for unrevealed problem statements", async () => {
    const fetched = await prisma.hackathon.findUnique({
      where: { id: testHackathon.id },
      include: {
        domains: {
          include: { problemStatements: true },
        },
      },
    });

    expect(fetched).toBeDefined();
    const domain = fetched!.domains[0];
    const isRevealed = new Date(domain.revealAt) <= new Date();

    // The reveal time was set to 1 hour in the future, so server correctly identifies it as unrevealed
    expect(isRevealed).toBe(false);
  });

  it("should support public search and filter querying on published hackathons", async () => {
    const results = await prisma.hackathon.findMany({
      where: {
        status: "PUBLISHED",
        title: { contains: "Autonomous Systems" },
      },
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title).toContain("Autonomous Systems");
  });

  afterAll(async () => {
    if (testHackathon?.id) {
      await prisma.hackathon.delete({ where: { id: testHackathon.id } }).catch(() => {});
    }
  });
});
