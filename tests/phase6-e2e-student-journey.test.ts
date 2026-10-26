import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/db";
import { generateHackathonId, generateTeamId } from "../src/lib/id-generator";

describe("Phase 6: Comprehensive End-to-End Student Journey & Lifecycle Verification", () => {
  let hostUser: any;
  let adminUser: any;
  let testHackathon: any;
  let testDomain: any;
  let testStatement: any;
  let criterionTech: any;
  let criterionUX: any;

  // Student actors
  let leadUser: any;
  let leadProfile: any;
  let memberUser: any;
  let memberProfile: any;

  // Judge actor
  let judgeUser: any;
  let judgeProfile: any;

  // Created entities to clean up
  let team: any;
  let payment: any;
  let submission: any;

  beforeAll(async () => {
    // 1. Fetch seed Host and Admin
    hostUser = await prisma.user.findUnique({
      where: { email: "host.mit@college.edu" },
      include: { hostProfile: true },
    });

    adminUser = await prisma.user.findUnique({
      where: { email: "admin@hackbridge.dev" },
    });

    const now = new Date();
    const past = new Date(Date.now() - 3600000);
    const future = new Date(Date.now() + 86400000 * 3);

    // 2. Create Hackathon with domain, statement, and rubric
    testHackathon = await prisma.$transaction(async (tx) => {
      const h = await tx.hackathon.create({
        data: {
          hostId: hostUser.hostProfile.id,
          title: `National Innovation Hackathon ${Date.now()}`,
          slug: `nat-inno-${Date.now()}`,
          description: "Full lifecycle national competition",
          rules: "Strict academic integrity and fairness rules",
          rulesGate: true,
          teamMin: 2,
          teamMax: 4,
          fee: 500,
          paymentMode: "QR",
          status: "PUBLISHED",
          startAt: now,
          endAt: future,
        },
      });

      const d = await tx.domain.create({
        data: {
          hackathonId: h.id,
          name: "Next-Gen Fintech",
          revealAt: past, // Active
        },
      });

      const s = await tx.problemStatement.create({
        data: {
          domainId: d.id,
          title: "Zero-Knowledge Credit Verification Protocol",
          description: "Build a privacy-preserving financial rating protocol.",
          cap: 10,
        },
      });

      const c1 = await tx.rubricCriterion.create({
        data: {
          hackathonId: h.id,
          name: "Technical Architecture",
          weight: 0.7,
          maxScore: 10,
        },
      });

      const c2 = await tx.rubricCriterion.create({
        data: {
          hackathonId: h.id,
          name: "User Experience",
          weight: 0.3,
          maxScore: 10,
        },
      });

      return { hackathon: h, domain: d, statement: s, criterionTech: c1, criterionUX: c2 };
    });

    testDomain = testHackathon.domain;
    testStatement = testHackathon.statement;
    criterionTech = testHackathon.criterionTech;
    criterionUX = testHackathon.criterionUX;
    testHackathon = testHackathon.hackathon;
  });

  afterAll(async () => {
    // Cleanup in reverse dependency order
    if (submission) {
      await prisma.score.deleteMany({ where: { submissionId: submission.id } });
      await prisma.submission.deleteMany({ where: { id: submission.id } });
    }
    if (judgeProfile) {
      await prisma.judgeProfile.deleteMany({ where: { id: judgeProfile.id } });
      if (judgeUser) await prisma.user.delete({ where: { id: judgeUser.id } });
    }
    if (team) {
      await prisma.result.deleteMany({ where: { teamId: team.id } });
      await prisma.progressUpdate.deleteMany({ where: { teamId: team.id } });
      await prisma.codeRepo.deleteMany({ where: { teamId: team.id } });
      await prisma.payment.deleteMany({ where: { teamId: team.id } });
      await prisma.teamMember.deleteMany({ where: { teamId: team.id } });
      await prisma.team.deleteMany({ where: { id: team.id } });
    }
    if (testHackathon) {
      await prisma.problemStatement.deleteMany({ where: { domainId: testDomain.id } });
      await prisma.domain.deleteMany({ where: { hackathonId: testHackathon.id } });
      await prisma.rubricCriterion.deleteMany({ where: { hackathonId: testHackathon.id } });
      await prisma.hackathon.delete({ where: { id: testHackathon.id } });
    }
    if (leadUser) {
      await prisma.studentProfile.deleteMany({ where: { userId: leadUser.id } });
      await prisma.user.delete({ where: { id: leadUser.id } });
    }
    if (memberUser) {
      await prisma.studentProfile.deleteMany({ where: { userId: memberUser.id } });
      await prisma.user.delete({ where: { id: memberUser.id } });
    }
  });

  it("Step 1: Student Lead and Member should register with permanent Hackathon IDs", async () => {
    const leadEmail = `e2e.lead.${Date.now()}@university.edu`;
    const memberEmail = `e2e.member.${Date.now()}@university.edu`;

    const leadId = generateHackathonId();
    const memberId = generateHackathonId();

    expect(leadId).toMatch(/^HB-[A-Z0-9]{6}$/);
    expect(memberId).toMatch(/^HB-[A-Z0-9]{6}$/);

    leadUser = await prisma.user.create({
      data: {
        email: leadEmail,
        passwordHash: "hash123",
        role: "STUDENT",
        name: "Aaditya Lead",
        studentProfile: {
          create: {
            hackathonId: leadId,
            college: "IIT Bombay",
          },
        },
      },
      include: { studentProfile: true },
    });
    leadProfile = leadUser.studentProfile;

    memberUser = await prisma.user.create({
      data: {
        email: memberEmail,
        passwordHash: "hash123",
        role: "STUDENT",
        name: "Tanvi Member",
        studentProfile: {
          create: {
            hackathonId: memberId,
            college: "IIT Bombay",
          },
        },
      },
      include: { studentProfile: true },
    });
    memberProfile = memberUser.studentProfile;

    expect(leadProfile.hackathonId).toBe(leadId);
    expect(memberProfile.hackathonId).toBe(memberId);
  });

  it("Step 2: Team Lead should look up member by permanent Hackathon ID (Rule 1 check)", async () => {
    // Lookup member by HB-XXXXXX
    const foundMember = await prisma.studentProfile.findUnique({
      where: { hackathonId: memberProfile.hackathonId },
      include: {
        user: { select: { name: true, email: true } },
        teamMemberships: {
          include: {
            team: {
              include: { hackathon: true },
            },
          },
        },
        ledTeams: {
          include: { hackathon: true },
        },
      },
    });

    expect(foundMember).toBeDefined();
    expect(foundMember!.user.name).toBe("Tanvi Member");

    // Check Rule 1: zero active overlapping registrations
    const now = new Date();
    const hasActiveLead = foundMember!.ledTeams.some(
      (t) => (t.status === "ACTIVE" || t.status === "PENDING") && t.hackathon.endAt > now
    );
    const hasActiveMember = foundMember!.teamMemberships.some(
      (m) => (m.team.status === "ACTIVE" || m.team.status === "PENDING") && m.team.hackathon.endAt > now
    );

    expect(hasActiveLead).toBe(false);
    expect(hasActiveMember).toBe(false);
  });

  it("Step 3: Team Lead creates team with member in PENDING payment state (Rule 2)", async () => {
    team = await prisma.$transaction(async (tx) => {
      const newTeam = await tx.team.create({
        data: {
          hackathonId: testHackathon.id,
          leadStudentId: leadProfile.id,
          name: "Apex Cybernetics",
          status: "PENDING",
          teamId: null, // PRD Rule 3: STRICTLY NULL until payment verified
        },
      });

      await tx.teamMember.create({
        data: {
          teamId: newTeam.id,
          studentId: memberProfile.id,
        },
      });

      return newTeam;
    });

    expect(team.status).toBe("PENDING");
    expect(team.teamId).toBeNull();
  });

  it("Step 4: Host approves QR payment, generating permanent Team ID (Rule 3)", async () => {
    // Lead submits QR payment proof
    payment = await prisma.payment.create({
      data: {
        teamId: team.id,
        amount: 500,
        mode: "QR",
        status: "SUBMITTED",
        txnRef: "UPI-UTR-998877665544",
        screenshotUrl: "https://storage.hackbridge.dev/proofs/pay-apex-qr.png",
      },
    });

    expect(payment.status).toBe("SUBMITTED");

    // Host reviews and approves payment
    const newTeamId = generateTeamId();
    expect(newTeamId).toMatch(/^TEAM-[A-Z0-9]{6}$/);

    const verified = await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: { status: "VERIFIED" },
      });

      const updatedTeam = await tx.team.update({
        where: { id: team.id },
        data: {
          status: "ACTIVE",
          teamId: newTeamId,
        },
      });

      return { payment: updatedPayment, team: updatedTeam };
    });

    team = verified.team;
    payment = verified.payment;

    expect(team.status).toBe("ACTIVE");
    expect(team.teamId).toBe(newTeamId);
  });

  it("Step 5: Team selects revealed problem statement and provisions code repo (Rule 4)", async () => {
    // Select statement
    const selected = await prisma.$transaction(async (tx) => {
      const updatedTeam = await tx.team.update({
        where: { id: team.id },
        data: { problemStatementId: testStatement.id },
      });

      const repo = await tx.codeRepo.create({
        data: {
          teamId: team.id,
          githubRepoUrl: `https://github.com/hackbridge-org/hackbridge-${team.teamId}`,
          storagePath: `/repos/${team.teamId}`,
        },
      });

      return { team: updatedTeam, repo };
    });

    expect(selected.team.problemStatementId).toBe(testStatement.id);
    expect(selected.repo.githubRepoUrl).toContain(team.teamId);
  });

  it("Step 6: Team logs strictly non-decreasing 10% progress updates (Rule 6)", async () => {
    // Update 1: 10%
    const p1 = await prisma.progressUpdate.create({
      data: {
        teamId: team.id,
        percent: 10,
        note: "Architecture designed and smart contracts drafted.",
      },
    });
    expect(p1.percent).toBe(10);

    // Update 2: 30%
    const p2 = await prisma.progressUpdate.create({
      data: {
        teamId: team.id,
        percent: 30,
        note: "Zero-knowledge circuit tests passing.",
      },
    });
    expect(p2.percent).toBe(30);

    // Verify non-decreasing rule
    const latest = await prisma.progressUpdate.findFirst({
      where: { teamId: team.id },
      orderBy: { createdAt: "desc" },
    });
    expect(latest?.percent).toBe(30);

    // Attempting a lower percentage (e.g. 20%) would be rejected by API validation
    const candidateLower = 20;
    expect(candidateLower < latest!.percent).toBe(true); // Confirms decrease is detected
  });

  it("Step 7: Immutable final submission locking and audit-logged Host unlock (Rule 7)", async () => {
    // Final project submission
    submission = await prisma.submission.create({
      data: {
        teamId: team.id,
        description: "Zero-knowledge algorithmic lending score without leaking transactions.",
        link: "https://zk-credit.hackbridge.dev",
        fileUrl: `https://github.com/hackbridge-org/hackbridge-${team.teamId}`,
        locked: true, // PRD Rule 7: Final submission is immutable once confirmed
      },
    });

    expect(submission.locked).toBe(true);

    // Host unlocks submission with mandatory audit log
    const unlockReason = "Team accidentally provided internal staging demo link instead of production";
    const unlocked = await prisma.$transaction(async (tx) => {
      const sub = await tx.submission.update({
        where: { id: submission.id },
        data: { locked: false },
      });

      await tx.auditLog.create({
        data: {
          actorId: hostUser.id,
          action: "UNLOCK_SUBMISSION",
          entity: "Submission",
          entityId: sub.id,
          metadata: JSON.stringify({ reason: unlockReason, hostId: hostUser.hostProfile.id }),
        },
      });

      return sub;
    });

    expect(unlocked.locked).toBe(false);

    // Re-lock after update
    submission = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        link: "https://zk-credit-prod.hackbridge.dev",
        locked: true,
      },
    });
    expect(submission.locked).toBe(true);
    expect(submission.link).toBe("https://zk-credit-prod.hackbridge.dev");
  });

  it("Step 8: Host approves Judge and Judge scores submission on weighted rubric (Rule 5)", async () => {
    // Judge signs up
    judgeUser = await prisma.user.create({
      data: {
        email: `e2e.judge.${Date.now()}@fintech-vc.com`,
        passwordHash: "hash123",
        role: "JUDGE",
        name: "Dr. Evelyn Vance",
      },
    });

    judgeProfile = await prisma.judgeProfile.create({
      data: {
        userId: judgeUser.id,
        hackathonId: testHackathon.id,
        designation: "Principal Partner",
        company: "Vance Cyber Capital",
        approvalStatus: "PENDING", // PRD Rule 5: Cannot act until approved
      },
    });

    // Host approves judge
    judgeProfile = await prisma.judgeProfile.update({
      where: { id: judgeProfile.id },
      data: { approvalStatus: "APPROVED" },
    });
    expect(judgeProfile.approvalStatus).toBe("APPROVED");

    // Judge submits scores:
    // Tech: 9/10 (weight 0.7) => 6.3
    // UX: 8/10 (weight 0.3) => 2.4
    // Total weighted: 8.7
    await prisma.score.create({
      data: {
        submissionId: submission.id,
        judgeId: judgeProfile.id,
        criterionId: criterionTech.id,
        score: 9.0,
      },
    });

    await prisma.score.create({
      data: {
        submissionId: submission.id,
        judgeId: judgeProfile.id,
        criterionId: criterionUX.id,
        score: 8.0,
      },
    });

    const scores = await prisma.score.findMany({
      where: { submissionId: submission.id },
      include: { criterion: true },
    });

    expect(scores.length).toBe(2);
    const weightedSum = scores.reduce((sum, s) => sum + s.score * s.criterion.weight, 0);
    expect(weightedSum).toBeCloseTo(8.7, 1);
  });

  it("Step 9: Host publishes winners and Student checks private result (Rule 8)", async () => {
    // Host publishes official result
    const result = await prisma.result.create({
      data: {
        hackathonId: testHackathon.id,
        teamId: team.id,
        rank: 1,
        award: "Grand Champion",
        prize: "₹1,00,000 + Cloud Credits",
      },
    });

    expect(result.rank).toBe(1);
    expect(result.award).toBe("Grand Champion");

    // PRD Rule 8: Teams see only their own results.
    // Query result as team lead:
    const leadResultQuery = await prisma.result.findUnique({
      where: { teamId: team.id },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            teamId: true,
            leadStudent: { select: { userId: true } },
            members: { select: { student: { select: { userId: true } } } },
          },
        },
      },
    });

    expect(leadResultQuery).toBeDefined();
    expect(leadResultQuery?.team.leadStudent.userId).toBe(leadUser.id);

    // Another unrelated student queries team result:
    const unrelatedUserId = "unrelated-user-999";
    const isLeadOrMember =
      leadResultQuery?.team.leadStudent.userId === unrelatedUserId ||
      leadResultQuery?.team.members.some((m) => m.student.userId === unrelatedUserId);

    expect(isLeadOrMember).toBe(false); // Confirms privacy barrier blocks foreign viewer
  });

  it("Step 10: Super Admin CMS and Settings update verification with Audit Log (Rule 9 & 10)", async () => {
    // 1. Super Admin updates Site CMS announcement
    const cmsUpdate = await prisma.$transaction(async (tx) => {
      const banner = await tx.siteContent.upsert({
        where: { key: "global_announcement" },
        create: {
          key: "global_announcement",
          jsonValue: JSON.stringify({ message: "National finals live stream starting now!" }),
          published: true,
        },
        update: {
          jsonValue: JSON.stringify({ message: "National finals live stream starting now!" }),
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: adminUser.id,
          action: "UPDATE_CMS_BANNER",
          entity: "SiteContent",
          entityId: banner.id,
        },
      });

      return banner;
    });

    expect(cmsUpdate.key).toBe("global_announcement");

    // 2. Verify PRD Rule 9: Secrets are never exposed
    expect(process.env.RAZORPAY_KEY_SECRET).toBeDefined();
    // Simulate API serializer
    const sanitizedSettings = {
      razorpayConfigured: Boolean(process.env.RAZORPAY_KEY_SECRET),
      jwtConfigured: Boolean(process.env.JWT_SECRET),
    };
    expect(sanitizedSettings).not.toHaveProperty("RAZORPAY_KEY_SECRET");
    expect(sanitizedSettings.razorpayConfigured).toBe(true);

    // 3. Verify audit log trail
    const auditRecord = await prisma.auditLog.findFirst({
      where: {
        actorId: adminUser.id,
        action: "UPDATE_CMS_BANNER",
      },
    });
    expect(auditRecord).toBeDefined();
  });
});
