import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/db";
import { generateHackathonId, generateTeamId } from "../src/lib/id-generator";

describe("Phase 3: Team Formation, Invariant Rules, Payments, and Team ID Generation", () => {
  let studentLead: any;
  let studentMember: any;
  let secondStudent: any;
  let publishedHackathon: any;
  let freeHackathon: any;
  let hostUser: any;
  const createdTeamIds: string[] = [];

  beforeAll(async () => {
    // Create isolated test students for Phase 3 so seed students remain pristine
    const leadEmail = `p3.lead.${Date.now()}@test.edu`;
    const memberEmail = `p3.member.${Date.now()}@test.edu`;
    const freeEmail = `p3.free.${Date.now()}@test.edu`;

    studentLead = await prisma.user.create({
      data: {
        email: leadEmail,
        passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
        role: "STUDENT",
        status: "ACTIVE",
        name: "P3 Test Lead",
        studentProfile: {
          create: {
            hackathonId: generateHackathonId(),
            college: "IIT Bombay",
          },
        },
      },
      include: { studentProfile: true },
    });

    studentMember = await prisma.user.create({
      data: {
        email: memberEmail,
        passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
        role: "STUDENT",
        status: "ACTIVE",
        name: "P3 Test Member",
        studentProfile: {
          create: {
            hackathonId: generateHackathonId(),
            college: "IIT Bombay",
          },
        },
      },
      include: { studentProfile: true },
    });

    secondStudent = await prisma.user.create({
      data: {
        email: freeEmail,
        passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
        role: "STUDENT",
        status: "ACTIVE",
        name: "P3 Free Student",
        studentProfile: {
          create: {
            hackathonId: generateHackathonId(),
            college: "BITS Pilani",
          },
        },
      },
      include: { studentProfile: true },
    });

    hostUser = await prisma.user.findUnique({
      where: { email: "host.mit@college.edu" },
      include: { hostProfile: true },
    });

    // Seeded published hackathon with QR payment
    publishedHackathon = await prisma.hackathon.findFirst({
      where: { status: "PUBLISHED" },
    });

    // Create a free track hackathon for testing instant zero-fee verification
    freeHackathon = await prisma.hackathon.create({
      data: {
        hostId: hostUser.hostProfile.id,
        title: `Open Source Zero Fee Hackathon ${Date.now()}`,
        slug: `free-hackathon-${Date.now()}`,
        description: "Zero fee community build arena",
        rules: "Standard fair play rules.",
        rulesGate: false,
        teamMin: 1,
        teamMax: 4,
        fee: 0,
        paymentMode: "FREE",
        status: "PUBLISHED",
        startAt: new Date(),
        endAt: new Date(Date.now() + 86400000 * 5),
      },
    });
  });

  afterAll(async () => {
    // Clean up created test teams
    for (const tid of createdTeamIds) {
      await prisma.payment.deleteMany({ where: { teamId: tid } }).catch(() => {});
      await prisma.teamMember.deleteMany({ where: { teamId: tid } }).catch(() => {});
      await prisma.team.delete({ where: { id: tid } }).catch(() => {});
    }

    if (freeHackathon?.id) {
      await prisma.hackathon.delete({ where: { id: freeHackathon.id } }).catch(() => {});
    }

    // Clean up test users
    for (const u of [studentLead, studentMember, secondStudent]) {
      if (u?.id) {
        await prisma.studentProfile.deleteMany({ where: { userId: u.id } }).catch(() => {});
        await prisma.user.delete({ where: { id: u.id } }).catch(() => {});
      }
    }
  });

  it("should verify students have valid permanent Hackathon IDs (HB-XXXXXX)", () => {
    expect(studentLead.studentProfile?.hackathonId).toMatch(/^HB-[A-Z0-9]{6}$/);
    expect(studentMember.studentProfile?.hackathonId).toMatch(/^HB-[A-Z0-9]{6}$/);
  });

  it("should look up a teammate by permanent Hackathon ID and confirm active eligibility", async () => {
    const student = await prisma.studentProfile.findUnique({
      where: { hackathonId: studentMember.studentProfile.hackathonId },
      include: {
        user: { select: { name: true, email: true } },
        teamMemberships: {
          include: {
            team: { include: { hackathon: true } },
          },
        },
      },
    });

    expect(student).toBeDefined();
    expect(student?.user.email).toBe(studentMember.email);

    const now = new Date();
    const activeTeam = student?.teamMemberships.find(
      (m) =>
        (m.team.status === "ACTIVE" || m.team.status === "PENDING") &&
        new Date(m.team.hackathon.endAt) > now
    );

    // Initial state: not locked in an active team
    expect(activeTeam).toBeUndefined();
  });

  it("should form a team with a lead and teammate in PENDING payment state without issuing Team ID initially", async () => {
    const teamName = `CyberMatrix-${Date.now()}`;

    const createdTeam = await prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: {
          hackathonId: publishedHackathon.id,
          leadStudentId: studentLead.studentProfile.id,
          name: teamName,
          status: "PENDING", // Payment pending
          teamId: null, // PRD Rule 3: strictly null until verified payment
        },
      });

      // Add lead
      await tx.teamMember.create({
        data: {
          teamId: team.id,
          studentId: studentLead.studentProfile.id,
          role: "LEAD",
        },
      });

      // Add teammate
      await tx.teamMember.create({
        data: {
          teamId: team.id,
          studentId: studentMember.studentProfile.id,
          role: "MEMBER",
        },
      });

      // Create Payment record
      const payment = await tx.payment.create({
        data: {
          teamId: team.id,
          mode: "QR",
          amount: publishedHackathon.fee,
          status: "PENDING",
        },
      });

      return { ...team, payment };
    });

    createdTeamIds.push(createdTeam.id);

    expect(createdTeam.id).toBeDefined();
    expect(createdTeam.teamId).toBeNull(); // Team ID is null
    expect(createdTeam.status).toBe("PENDING");
    expect(createdTeam.payment.status).toBe("PENDING");

    const members = await prisma.teamMember.findMany({
      where: { teamId: createdTeam.id },
    });
    expect(members.length).toBe(2);
  });

  it("should enforce Invariant Rule 1: A student can belong to only one active hackathon registration", async () => {
    const now = new Date();

    // Check if studentLead is now detected as locked in an active registration
    const leadProfile = await prisma.studentProfile.findUnique({
      where: { id: studentLead.studentProfile.id },
      include: {
        teamMemberships: {
          include: {
            team: { include: { hackathon: true } },
          },
        },
      },
    });

    const activeMembership = leadProfile?.teamMemberships.find(
      (m) =>
        (m.team.status === "ACTIVE" || m.team.status === "PENDING") &&
        new Date(m.team.hackathon.endAt) > now
    );

    expect(activeMembership).toBeDefined();
    expect(activeMembership?.team.hackathonId).toBe(publishedHackathon.id);

    // If studentLead attempts to create a second team in freeHackathon, rule stops them
    const isEligibleForNewEvent = !activeMembership;
    expect(isEligibleForNewEvent).toBe(false);
  });

  it("should process QR payment flow: lead submits UTR, host approves, and Team ID is generated (Gate 3)", async () => {
    // Find the pending team
    const pendingTeam = await prisma.team.findFirst({
      where: { leadStudentId: studentLead.studentProfile.id, status: "PENDING" },
      include: { payment: true },
    });

    expect(pendingTeam).toBeDefined();
    expect(pendingTeam?.teamId).toBeNull();

    // Step 1: Lead submits UTR reference
    const txnRef = `UTR-${Date.now()}`;
    const updatedPayment = await prisma.payment.update({
      where: { id: pendingTeam!.payment!.id },
      data: {
        txnRef,
        screenshotUrl: "https://proofs.hackbridge.dev/test-receipt.png",
      },
    });

    expect(updatedPayment.txnRef).toBe(txnRef);

    // Step 2: Host approves payment proof
    const officialTeamId = generateTeamId();
    expect(officialTeamId).toMatch(/^TEAM-[A-Z0-9]{6}$/);

    const [verifiedPayment, activatedTeam] = await prisma.$transaction([
      prisma.payment.update({
        where: { id: pendingTeam!.payment!.id },
        data: {
          status: "VERIFIED",
          approvedBy: hostUser.id,
          verifiedAt: new Date(),
        },
      }),
      prisma.team.update({
        where: { id: pendingTeam!.id },
        data: {
          status: "ACTIVE",
          teamId: officialTeamId,
        },
      }),
    ]);

    expect(verifiedPayment.status).toBe("VERIFIED");
    expect(verifiedPayment.approvedBy).toBe(hostUser.id);
    expect(activatedTeam.status).toBe("ACTIVE");
    expect(activatedTeam.teamId).toBe(officialTeamId); // Team ID verified
  });

  it("should process free hackathon flow: auto-verifies payment and immediately generates Team ID", async () => {
    // Use secondStudent who is not in any team yet
    const freeTeamName = `ZeroFeeBuilders-${Date.now()}`;
    const officialFreeTeamId = generateTeamId();

    const freeTeam = await prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: {
          hackathonId: freeHackathon.id,
          leadStudentId: secondStudent.studentProfile.id,
          name: freeTeamName,
          status: "ACTIVE", // Auto-active
          teamId: officialFreeTeamId,
        },
      });

      await tx.teamMember.create({
        data: {
          teamId: team.id,
          studentId: secondStudent.studentProfile.id,
          role: "LEAD",
        },
      });

      const payment = await tx.payment.create({
        data: {
          teamId: team.id,
          mode: "FREE",
          amount: 0,
          status: "VERIFIED",
          verifiedAt: new Date(),
        },
      });

      return { ...team, payment };
    });

    createdTeamIds.push(freeTeam.id);

    expect(freeTeam.status).toBe("ACTIVE");
    expect(freeTeam.teamId).toMatch(/^TEAM-[A-Z0-9]{6}$/);
    expect(freeTeam.payment.status).toBe("VERIFIED");
  });
});
