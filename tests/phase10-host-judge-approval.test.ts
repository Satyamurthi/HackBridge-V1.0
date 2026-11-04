import { describe, it, expect, beforeAll, vi } from "vitest";
import { prisma } from "../src/lib/db";
import { POST as createHackathon } from "../src/app/api/v1/hackathons/route";
import { PATCH as updateHackathon } from "../src/app/api/v1/hackathons/[id]/route";
import { POST as scoreSubmission } from "../src/app/api/v1/judge/score/route";
import { GET as getJudgeSubmissions } from "../src/app/api/v1/judge/submissions/route";
import { POST as createTeam } from "../src/app/api/v1/teams/route";
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

describe("Phase 10: Host & Judge Admin Approval Enforcement", () => {
  let pendingHostToken: string;
  let approvedHostToken: string;
  let pendingJudgeToken: string;
  let approvedJudgeToken: string;
  let pendingHostUser: any;
  let approvedHostUser: any;
  let pendingJudgeUser: any;
  let approvedJudgeUser: any;
  let hackathon: any;

  beforeAll(async () => {
    // 1. Fetch pending host
    pendingHostUser = await prisma.user.findUnique({
      where: { email: "host.techcorp@startup.io" },
      include: { hostProfile: true },
    });

    if (pendingHostUser) {
      pendingHostToken = signSessionToken({
        userId: pendingHostUser.id,
        email: pendingHostUser.email,
        role: "HOST",
        status: "PENDING",
        name: pendingHostUser.name,
        profileId: pendingHostUser.hostProfile?.id,
      });
    }

    // 2. Fetch approved host
    approvedHostUser = await prisma.user.findUnique({
      where: { email: "host.mit@college.edu" },
      include: { hostProfile: true },
    });

    if (approvedHostUser) {
      approvedHostToken = signSessionToken({
        userId: approvedHostUser.id,
        email: approvedHostUser.email,
        role: "HOST",
        status: "ACTIVE",
        name: approvedHostUser.name,
        profileId: approvedHostUser.hostProfile?.id,
      });
    }

    // 3. Find a hackathon for testing
    hackathon = await prisma.hackathon.findFirst({
      where: { hostId: approvedHostUser.hostProfile.id },
      include: { rubricCriteria: true },
    });

    // 4. Create or fetch a pending judge
    let pJudge: any = await prisma.user.findUnique({
      where: { email: "pending.judge.test@industry.com" },
      include: { judgeProfiles: true },
    });

    if (!pJudge) {
      pJudge = await prisma.user.create({
        data: {
          email: "pending.judge.test@industry.com",
          name: "Pending Judge Test",
          role: "JUDGE",
          status: "ACTIVE",
          passwordHash: "test-password-hash",
          judgeProfiles: {
            create: {
              hackathonId: hackathon.id,
              approvalStatus: "PENDING",
              designation: "Staff Engineer",
              company: "Testing Inc",
            },
          },
        },
        include: { judgeProfiles: true },
      });
    }

    pendingJudgeUser = pJudge;
    pendingJudgeToken = signSessionToken({
      userId: pendingJudgeUser.id,
      email: pendingJudgeUser.email,
      role: "JUDGE",
      status: "ACTIVE",
      name: pendingJudgeUser.name,
      hackathonId: hackathon.id,
    });

    // 5. Approved judge
    approvedJudgeUser = await prisma.user.findUnique({
      where: { email: "judge.alex@industry.com" },
      include: { judgeProfiles: true },
    });

    if (approvedJudgeUser) {
      approvedJudgeToken = signSessionToken({
        userId: approvedJudgeUser.id,
        email: approvedJudgeUser.email,
        role: "JUDGE",
        status: "ACTIVE",
        name: approvedJudgeUser.name,
        hackathonId: hackathon.id,
      });
    }
  });

  describe("Host Approval Enforcement", () => {
    it("strictly blocks unapproved host from creating a hackathon and instructs contacting 9380968402 Or Admin", async () => {
      activeSessionToken = pendingHostToken;
      const mockReq = new Request("http://localhost:3000/api/v1/hackathons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Unauthorized Hackathon Sprint",
          description: "This should fail because host is waiting for admin approval.",
          rules: "Rule 1: Be fair.",
          startAt: new Date(Date.now() + 86400000).toISOString(),
          endAt: new Date(Date.now() + 172800000).toISOString(),
          paymentMode: "FREE",
        }),
      });

      const res = await createHackathon(mockReq as any);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error).toContain("waiting for admin approval");
      expect(json.error).toContain("9380968402 Or Admin");
    });

    it("strictly blocks unapproved host from publishing a hackathon and instructs contacting 9380968402 Or Admin", async () => {
      // Create a draft hackathon for pending host directly in DB
      const draft = await prisma.hackathon.create({
        data: {
          hostId: pendingHostUser.hostProfile.id,
          title: "Pending Host Draft",
          slug: `pending-draft-${Date.now()}`,
          description: "Draft created to test publish restriction",
          rules: "Standard rules",
          startAt: new Date(Date.now() + 86400000),
          endAt: new Date(Date.now() + 172800000),
          fee: 0,
          status: "DRAFT",
        },
      });

      activeSessionToken = pendingHostToken;
      const mockReq = new Request(`http://localhost:3000/api/v1/hackathons/${draft.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "PUBLISH" }),
      });

      const res = await updateHackathon(mockReq as any, { params: { id: draft.id } });
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error.toLowerCase()).toContain("waiting for admin approval");
      expect(json.error).toContain("9380968402 Or Admin");
    });
  });

  describe("Judge Approval Enforcement", () => {
    it("strictly blocks unapproved judge from querying evaluation submissions and instructs contacting 9380968402 Or Admin", async () => {
      activeSessionToken = pendingJudgeToken;
      const mockReq = new Request("http://localhost:3000/api/v1/judge/submissions", {
        method: "GET",
      });

      const res = await getJudgeSubmissions(mockReq as any);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error).toContain("waiting for admin approval");
      expect(json.error).toContain("9380968402 Or Admin");
      expect(json.approvalStatus).toBe("PENDING");
    });

    it("strictly blocks unapproved judge from submitting rubric scores and instructs contacting 9380968402 Or Admin", async () => {
      // Find or create a submission specifically for the hackathon this judge is assigned to
      let sub = await prisma.submission.findFirst({
        where: {
          team: {
            hackathonId: hackathon.id,
          },
        },
        include: {
          team: {
            include: {
              hackathon: {
                include: { rubricCriteria: true },
              },
            },
          },
        },
      });

      if (!sub) {
        // Create a mock team & submission in this hackathon
        const lead = await prisma.studentProfile.findFirst();
        if (lead) {
          const t = await prisma.team.create({
            data: {
              hackathonId: hackathon.id,
              leadStudentId: lead.id,
              name: `Test Judge Target ${Date.now()}`,
              status: "SUBMITTED",
              submission: {
                create: {
                  link: "https://demo.example.com",
                  description: "Test submission description",
                  locked: true,
                },
              },
            },
            include: {
              hackathon: { include: { rubricCriteria: true } },
              submission: true,
            },
          });
          sub = { ...t.submission, team: t } as any;
        }
      }

      if (!sub || !sub.team.hackathon.rubricCriteria.length) return;

      const criterion = sub.team.hackathon.rubricCriteria[0];
      activeSessionToken = pendingJudgeToken;
      const mockReq = new Request("http://localhost:3000/api/v1/judge/score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          submissionId: sub.id,
          scores: [{ criterionId: criterion.id, score: 9, notes: "Excellent" }],
        }),
      });

      const res = await scoreSubmission(mockReq as any);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error).toContain("waiting for admin approval");
      expect(json.error).toContain("9380968402 Or Admin");
    });
  });

  describe("Host-Declared Registration End Time Enforcement", () => {
    let studentUser: any;
    let studentToken: string;
    let closedHackathon: any;

    beforeAll(async () => {
      studentUser = await prisma.user.create({
        data: {
          email: `reg.student.${Date.now()}@test.edu`,
          name: "Reg Test Student",
          role: "STUDENT",
          status: "ACTIVE",
          passwordHash: "test-password-hash",
          studentProfile: {
            create: {
              hackathonId: generateHackathonId(),
              college: "IIT Madras",
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

      closedHackathon = await prisma.hackathon.create({
        data: {
          hostId: approvedHostUser.hostProfile.id,
          title: "Closed Registration Arena",
          slug: `closed-reg-arena-${Date.now()}`,
          description: "Hackathon where registration end time has already elapsed",
          rules: "Standard fair rules",
          startAt: new Date(Date.now() + 86400000),
          endAt: new Date(Date.now() + 172800000),
          registrationDeadline: new Date(Date.now() - 3600000), // closed 1 hr ago
          fee: 0,
          paymentMode: "FREE",
          status: "PUBLISHED",
        },
      });
    });

    it("rejects student squad registration when declared registration end time has elapsed", async () => {
      activeSessionToken = studentToken;
      const mockReq = new Request("http://localhost:3000/api/v1/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hackathonId: closedHackathon.id,
          teamName: "Late Registrants",
        }),
      });

      const res = await createTeam(mockReq as any);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toContain("Registration for this hackathon closed");
      expect(json.error).toContain("declared by the host");
    });
  });
});
