import { describe, it, expect, beforeAll, vi } from "vitest";
import { prisma } from "../src/lib/db";
import { GET as getJudgeProfile, PATCH as patchJudgeProfile } from "../src/app/api/v1/judge/profile/route";
import { GET as getLeaderboard } from "../src/app/api/v1/host/hackathons/[hackathonId]/leaderboard/route";
import { GET as getJudgeSubmissions } from "../src/app/api/v1/judge/submissions/route";
import { hashPassword, signSessionToken } from "../src/lib/auth";
import { NextRequest } from "next/server";

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

describe("Phase 21: Judge Pages, Evaluator Profile & Arena Standings Portal", () => {
  let hostUser: any;
  let hostProfile: any;
  let judgeUser: any;
  let judgeProfile: any;
  let judgeToken: string;
  let unassignedJudgeUser: any;
  let unassignedJudgeToken: string;
  let hackathon: any;
  const initialPassword = "EvaluatorSecret@2026";
  const updatedPassword = "NewEvaluatorSecret#2026";

  beforeAll(async () => {
    const hashed = await hashPassword(initialPassword);

    // 1. Create Host
    hostUser = await prisma.user.create({
      data: {
        email: `host.phase21.${Date.now()}@hackbridge.edu`,
        name: "Host Phase 21 Lead",
        phone: "9123456799",
        role: "HOST",
        status: "ACTIVE",
        passwordHash: hashed,
      },
    });

    hostProfile = await prisma.hostProfile.create({
      data: {
        userId: hostUser.id,
        orgName: "HackBridge Phase 21 Tech Institute",
        type: "college",
        approvalStatus: "APPROVED",
      },
    });

    // 2. Create Hackathon
    hackathon = await prisma.hackathon.create({
      data: {
        hostId: hostProfile.id,
        title: "HackBridge Phase 21 Championship Arena",
        slug: `hb-phase21-arena-${Date.now()}`,
        description: "Comprehensive evaluation portal for industry judges",
        rules: "Standard Collegiate Hackathon Rules",
        status: "PUBLISHED",
        fee: 0,
        startAt: new Date(Date.now() - 3600000),
        endAt: new Date(Date.now() + 86400000 * 3),
        rubricCriteria: {
          create: [
            { name: "Technical Rigor", maxScore: 25, weight: 1.0 },
            { name: "UX & Polish", maxScore: 25, weight: 1.0 },
          ],
        },
      },
    });

    // 3. Create Approved Judge for this Hackathon
    judgeUser = await prisma.user.create({
      data: {
        email: `judge.phase21.${Date.now()}@jury.hackbridge.org`,
        name: "Dr. Elena Rostova",
        phone: "9876500021",
        role: "JUDGE",
        status: "ACTIVE",
        passwordHash: hashed,
      },
    });

    judgeProfile = await prisma.judgeProfile.create({
      data: {
        userId: judgeUser.id,
        hackathonId: hackathon.id,
        approvalStatus: "APPROVED",
        designation: "Principal AI Scientist",
        company: "DeepMind Robotics",
        domain: "AI & Distributed Systems",
      },
    });

    judgeToken = signSessionToken({
      userId: judgeUser.id,
      email: judgeUser.email,
      role: "JUDGE",
      status: "ACTIVE",
      name: judgeUser.name,
      hackathonId: hackathon.id,
      profileId: judgeProfile.id,
    });

    // 4. Create Unassigned Judge
    unassignedJudgeUser = await prisma.user.create({
      data: {
        email: `unassigned.judge.${Date.now()}@jury.hackbridge.org`,
        name: "Dr. Unassigned Jury",
        role: "JUDGE",
        status: "ACTIVE",
        passwordHash: hashed,
      },
    });

    unassignedJudgeToken = signSessionToken({
      userId: unassignedJudgeUser.id,
      email: unassignedJudgeUser.email,
      role: "JUDGE",
      status: "ACTIVE",
      name: unassignedJudgeUser.name,
    });
  });

  it("1. GET /api/v1/judge/profile rejects unauthenticated requests", async () => {
    activeSessionToken = null;
    const req = new NextRequest("http://localhost:3000/api/v1/judge/profile");
    const res = await getJudgeProfile(req);
    expect(res.status).toBe(401);
  });

  it("2. GET /api/v1/judge/profile returns evaluator credentials, assigned tracks, and metrics", async () => {
    activeSessionToken = judgeToken;
    const req = new NextRequest("http://localhost:3000/api/v1/judge/profile");
    const res = await getJudgeProfile(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.name).toBe("Dr. Elena Rostova");
    expect(data.user.email).toBe(judgeUser.email);
    expect(data.judgeProfile.company).toBe("DeepMind Robotics");
    expect(data.judgeProfile.designation).toBe("Principal AI Scientist");
    expect(data.judgeProfile.approvalStatus).toBe("APPROVED");
    expect(data.assignedHackathons.length).toBeGreaterThanOrEqual(1);
    expect(data.assignedHackathons[0].id).toBe(hackathon.id);
    expect(data.stats).toBeDefined();
    expect(typeof data.stats.totalAssignedHackathons).toBe("number");
  });

  it("3. PATCH /api/v1/judge/profile updates evaluator profile information", async () => {
    activeSessionToken = judgeToken;
    const req = new NextRequest("http://localhost:3000/api/v1/judge/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Dr. Elena Rostova, PhD",
        phone: "9876543221",
        company: "Google DeepMind",
        designation: "Distinguished Research Fellow",
        domain: "Autonomous Systems & AI",
      }),
    });

    const res = await patchJudgeProfile(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.name).toBe("Dr. Elena Rostova, PhD");

    // Verify in database
    const updatedUser = await prisma.user.findUnique({
      where: { id: judgeUser.id },
      include: { judgeProfiles: true },
    });
    expect(updatedUser?.name).toBe("Dr. Elena Rostova, PhD");
    expect(updatedUser?.judgeProfiles[0].company).toBe("Google DeepMind");
    expect(updatedUser?.judgeProfiles[0].designation).toBe("Distinguished Research Fellow");
  });

  it("4. PATCH /api/v1/judge/profile validates current password before updating", async () => {
    activeSessionToken = judgeToken;

    // Bad current password
    const badReq = new NextRequest("http://localhost:3000/api/v1/judge/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: "WrongPassword999",
        newPassword: updatedPassword,
      }),
    });

    const badRes = await patchJudgeProfile(badReq);
    expect(badRes.status).toBe(400);

    // Short new password
    const shortReq = new NextRequest("http://localhost:3000/api/v1/judge/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: initialPassword,
        newPassword: "short",
      }),
    });

    const shortRes = await patchJudgeProfile(shortReq);
    expect(shortRes.status).toBe(400);

    // Correct update
    const okReq = new NextRequest("http://localhost:3000/api/v1/judge/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: initialPassword,
        newPassword: updatedPassword,
      }),
    });

    const okRes = await patchJudgeProfile(okReq);
    expect(okRes.status).toBe(200);
    const okData = await okRes.json();
    expect(okData.success).toBe(true);
  });

  it("5. GET /api/v1/host/hackathons/[hackathonId]/leaderboard allows approved assigned judges", async () => {
    activeSessionToken = judgeToken;
    const req = new NextRequest(`http://localhost:3000/api/v1/host/hackathons/${hackathon.id}/leaderboard`);
    const res = await getLeaderboard(req, { params: { hackathonId: hackathon.id } });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.hackathon.id).toBe(hackathon.id);
    expect(Array.isArray(data.leaderboard)).toBe(true);
  });

  it("6. GET /api/v1/host/hackathons/[hackathonId]/leaderboard rejects judges not assigned to the track", async () => {
    activeSessionToken = unassignedJudgeToken;
    const req = new NextRequest(`http://localhost:3000/api/v1/host/hackathons/${hackathon.id}/leaderboard`);
    const res = await getLeaderboard(req, { params: { hackathonId: hackathon.id } });
    expect(res.status).toBe(403);
  });

  it("7. GET /api/v1/judge/submissions delivers single unified rubric policy and assigned hackathons", async () => {
    activeSessionToken = judgeToken;
    const req = new NextRequest("http://localhost:3000/api/v1/judge/submissions");
    const res = await getJudgeSubmissions(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.rubricPolicy).toBe("SINGLE_UNIFIED_ALL_PHASES");
    expect(data.assignedHackathons).toBeDefined();
    expect(data.assignedHackathons.length).toBeGreaterThanOrEqual(1);
    expect(data.judgeProfile).toBeDefined();
    expect(data.judgeProfile.company).toBe("Google DeepMind");
  });
});
