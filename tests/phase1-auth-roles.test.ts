import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { generateHackathonId, isValidHackathonId, generateTeamId } from "../src/lib/id-generator";
import { hashPassword, verifyPassword, signSessionToken, verifySessionToken } from "../src/lib/auth";
import { prisma } from "../src/lib/db";

describe("Phase 1 Foundation: ID Generators & Validation", () => {
  it("should generate a valid permanent student Hackathon ID format (HB-XXXXXX)", () => {
    const id = generateHackathonId();
    expect(id).toMatch(/^HB-[A-Z0-9]{6}$/);
    expect(isValidHackathonId(id)).toBe(true);
  });

  it("should correctly reject invalid Hackathon IDs", () => {
    expect(isValidHackathonId("HB-123")).toBe(false);
    expect(isValidHackathonId("INVALID-ID")).toBe(false);
    expect(isValidHackathonId("HB-1234567")).toBe(false);
    expect(isValidHackathonId("")).toBe(false);
  });

  it("should generate a valid Team ID format (TEAM-XXXXXX)", () => {
    const teamId = generateTeamId();
    expect(teamId).toMatch(/^TEAM-[A-Z0-9]{6}$/);
  });
});

describe("Phase 1 Foundation: Cryptography & Session Tokens", () => {
  it("should hash and verify passwords securely", async () => {
    const raw = "SuperSecretPassword123!";
    const hash = await hashPassword(raw);
    expect(hash).not.toBe(raw);
    expect(await verifyPassword(raw, hash)).toBe(true);
    expect(await verifyPassword("WrongPassword", hash)).toBe(false);
  });

  it("should sign and verify role-based JWT session tokens", () => {
    const payload = {
      userId: "test-user-uuid",
      email: "student@test.edu",
      role: "STUDENT" as const,
      status: "ACTIVE",
      name: "Test Student",
      hackathonId: "HB-998877",
    };

    const token = signSessionToken(payload);
    expect(typeof token).toBe("string");

    const decoded = verifySessionToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.email).toBe(payload.email);
    expect(decoded?.role).toBe("STUDENT");
    expect(decoded?.hackathonId).toBe("HB-998877");
  });
});

describe("Phase 1 Gate: All Four Roles Database Entities & Seed Verification", () => {
  it("should verify Super Admin exists in database and can authenticate", async () => {
    const admin = await prisma.user.findUnique({
      where: { email: "admin@hackbridge.dev" },
    });
    expect(admin).not.toBeNull();
    expect(admin?.role).toBe("SUPER_ADMIN");
    expect(admin?.status).toBe("ACTIVE");
    const match = await verifyPassword("Admin@123", admin!.passwordHash);
    expect(match).toBe(true);
  });

  it("should verify Approved Host exists with HostProfile and approved status", async () => {
    const host = await prisma.user.findUnique({
      where: { email: "host.mit@college.edu" },
      include: { hostProfile: true },
    });
    expect(host).not.toBeNull();
    expect(host?.role).toBe("HOST");
    expect(host?.hostProfile?.approvalStatus).toBe("APPROVED");
    expect(host?.hostProfile?.type).toBe("college");
  });

  it("should verify Pending Host exists with PENDING approval status", async () => {
    const pendingHost = await prisma.user.findUnique({
      where: { email: "host.techcorp@startup.io" },
      include: { hostProfile: true },
    });
    expect(pendingHost).not.toBeNull();
    expect(pendingHost?.role).toBe("HOST");
    expect(pendingHost?.hostProfile?.approvalStatus).toBe("PENDING");
  });

  it("should verify Judge exists and is assigned to a hackathon with approval status", async () => {
    const judge = await prisma.user.findUnique({
      where: { email: "judge.alex@industry.com" },
      include: { judgeProfiles: true },
    });
    expect(judge).not.toBeNull();
    expect(judge?.role).toBe("JUDGE");
    expect(judge?.judgeProfiles.length).toBeGreaterThan(0);
    expect(judge?.judgeProfiles[0].approvalStatus).toBe("APPROVED");
  });

  it("should verify Student Lead exists with permanent Hackathon ID", async () => {
    const lead = await prisma.user.findUnique({
      where: { email: "lead.priya@student.edu" },
      include: { studentProfile: true },
    });
    expect(lead).not.toBeNull();
    expect(lead?.role).toBe("STUDENT");
    expect(lead?.studentProfile?.hackathonId).toBe("HB-102938");
    expect(isValidHackathonId(lead!.studentProfile!.hackathonId)).toBe(true);
  });

  it("should verify Student Member exists with permanent Hackathon ID", async () => {
    const member = await prisma.user.findUnique({
      where: { email: "member.rahul@student.edu" },
      include: { studentProfile: true },
    });
    expect(member).not.toBeNull();
    expect(member?.role).toBe("STUDENT");
    expect(member?.studentProfile?.hackathonId).toBe("HB-492019");
    expect(isValidHackathonId(member!.studentProfile!.hackathonId)).toBe(true);
  });
});

describe("Phase 1 Business Rules: One Student One Hackathon Constraint", () => {
  it("should correctly detect when a student is already in an active registration", async () => {
    const student = await prisma.studentProfile.findUnique({
      where: { hackathonId: "HB-102938" },
      include: { teamMemberships: { include: { team: true } } },
    });
    expect(student).not.toBeNull();

    // Check active membership helper logic
    const hasActiveTeam = student!.teamMemberships.some(
      (m) => m.team.status === "ACTIVE" || m.team.status === "PENDING"
    );
    // Priya has not joined an active team yet in the initial seed
    expect(hasActiveTeam).toBe(false);
  });
});
