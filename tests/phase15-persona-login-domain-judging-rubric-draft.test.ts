import { describe, it, expect, beforeAll, vi } from "vitest";
import { prisma } from "../src/lib/db";
import { POST as loginRoute } from "../src/app/api/v1/auth/login/route";
import { GET as getJudgeSubmissions } from "../src/app/api/v1/judge/submissions/route";
import { POST as scoreSubmission } from "../src/app/api/v1/judge/score/route";
import { GET as getLeaderboard } from "../src/app/api/v1/host/hackathons/[hackathonId]/leaderboard/route";
import { GET as getTeamResult } from "../src/app/api/v1/teams/[teamId]/result/route";
import { hashPassword, signSessionToken } from "../src/lib/auth";
import { generateHackathonId, generateTeamId } from "../src/lib/id-generator";

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

describe("Phase 15: Persona-Enforced Login, Domain-Filtered Judging & Rubric Draft Scoring", () => {
  let studentUser: any;
  let hostUser: any;
  let judgeUserAI: any;
  let judgeTokenAI: string;
  let hackathon: any;
  let domainAI: any;
  let domainRobotics: any;
  let teamAI: any;
  let teamRobotics: any;
  let subAI: any;
  let subRobotics: any;
  let crit1: any;
  let crit2: any;
  const secureTestPassword = "SecurePassphrase#2026";

  beforeAll(async () => {
    const hashed = await hashPassword(secureTestPassword);

    // 1. Create Student User
    studentUser = await prisma.user.create({
      data: {
        email: `student.phase15.${Date.now()}@arena.edu`,
        name: "Devin Student",
        role: "STUDENT",
        status: "ACTIVE",
        passwordHash: hashed,
        studentProfile: {
          create: {
            hackathonId: generateHackathonId(),
            college: "Stanford Tech",
          },
        },
      },
      include: { studentProfile: true },
    });

    // 2. Create Host User
    hostUser = await prisma.user.create({
      data: {
        email: `host.phase15.${Date.now()}@arena.edu`,
        name: "Dean Host",
        role: "HOST",
        status: "ACTIVE",
        passwordHash: hashed,
        hostProfile: {
          create: {
            orgName: "Frontier Hack Labs",
            type: "college",
            approvalStatus: "APPROVED",
            upiId: "frontier@oksbi",
          },
        },
      },
      include: { hostProfile: true },
    });

    // 3. Create Multi-Domain Hackathon with Rubric Criteria
    hackathon = await prisma.hackathon.create({
      data: {
        hostId: hostUser.hostProfile.id,
        title: `Frontier Hackathon Arena ${Date.now()}`,
        slug: `frontier-hack-${Date.now()}`,
        description: "Hackathon with domain-scoped judging and draft rubric marks",
        rules: "Standard evaluation rules",
        startAt: new Date(Date.now() - 3600000),
        endAt: new Date(Date.now() + 86400000),
        fee: 0,
        paymentMode: "FREE",
        status: "PUBLISHED",
        domains: {
          create: [
            {
              name: "Artificial Intelligence & ML",
              description: "AI, Agents, and Neural Network Track",
              revealAt: new Date(Date.now() - 3600000),
            },
            {
              name: "Autonomous Robotics",
              description: "Embedded Systems and Robotics Track",
              revealAt: new Date(Date.now() - 3600000),
            },
          ],
        },
        rubricCriteria: {
          create: [
            {
              name: "Technical Innovation & Architecture",
              weight: 0.6,
              maxScore: 10.0,
            },
            {
              name: "Presentation & Execution",
              weight: 0.4,
              maxScore: 10.0,
            },
          ],
        },
      },
      include: {
        domains: true,
        rubricCriteria: true,
      },
    });

    domainAI = hackathon.domains.find((d: any) => d.name.includes("Artificial Intelligence"));
    domainRobotics = hackathon.domains.find((d: any) => d.name.includes("Robotics"));
    crit1 = hackathon.rubricCriteria[0];
    crit2 = hackathon.rubricCriteria[1];

    // 4. Create Judge User assigned strictly to "Artificial Intelligence & ML" domain
    judgeUserAI = await prisma.user.create({
      data: {
        email: `judge.ai.phase15.${Date.now()}@eval.org`,
        name: "Prof. Alan Turing",
        role: "JUDGE",
        status: "ACTIVE",
        passwordHash: hashed,
        judgeProfiles: {
          create: {
            hackathonId: hackathon.id,
            approvalStatus: "APPROVED",
            designation: "AI Evaluator Lead",
            company: "Deep Thought Inc",
            domain: "Artificial Intelligence & ML", // Host-specified domain
          },
        },
      },
      include: { judgeProfiles: true },
    });

    judgeTokenAI = signSessionToken({
      userId: judgeUserAI.id,
      email: judgeUserAI.email,
      role: "JUDGE",
      status: "ACTIVE",
      name: judgeUserAI.name,
    });

    // 5. Create Team in AI Track
    teamAI = await prisma.team.create({
      data: {
        hackathonId: hackathon.id,
        teamId: generateTeamId(),
        name: `Neural Synthesizers ${Date.now()}`,
        status: "ACTIVE",
        domainId: domainAI.id,
        leadStudentId: studentUser.studentProfile.id,
        members: {
          create: {
            studentId: studentUser.studentProfile.id,
            role: "LEAD",
          },
        },
      },
    });

    subAI = await prisma.submission.create({
      data: {
        teamId: teamAI.id,
        description: "AI Neural Synthesis System",
        locked: true,
        link: "https://neural-ai.demo.dev",
      },
    });

    // 6. Create Team in Robotics Track
    teamRobotics = await prisma.team.create({
      data: {
        hackathonId: hackathon.id,
        teamId: generateTeamId(),
        name: `RoboNav Dynamics ${Date.now()}`,
        status: "ACTIVE",
        domainId: domainRobotics.id,
        leadStudentId: studentUser.studentProfile.id,
      },
    });

    subRobotics = await prisma.submission.create({
      data: {
        teamId: teamRobotics.id,
        description: "Autonomous Rover Firmware",
        locked: true,
        link: "https://robonav.demo.dev",
      },
    });
  });

  // ==========================================
  // SECTION 1: STRICT PERSONA-ENFORCED LOGIN
  // ==========================================
  describe("Section 1: Strict Persona-Enforced Login", () => {
    it("Student portal rejects a Host trying to log in", async () => {
      const mockReq = new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: hostUser.email,
          password: secureTestPassword,
          role: "STUDENT", // Trying to login through Student portal
        }),
      });

      const res = await loginRoute(mockReq as any);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("strictly reserved for Students");
    });

    it("Student portal rejects a Judge trying to log in", async () => {
      const mockReq = new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: judgeUserAI.email,
          password: secureTestPassword,
          role: "STUDENT",
        }),
      });

      const res = await loginRoute(mockReq as any);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("strictly reserved for Students");
    });

    it("Student portal successfully allows a verified Student to log in", async () => {
      const mockReq = new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: studentUser.email,
          password: secureTestPassword,
          role: "STUDENT",
        }),
      });

      const res = await loginRoute(mockReq as any);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user.role).toBe("STUDENT");
    });

    it("Host portal rejects a Student trying to log in", async () => {
      const mockReq = new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: studentUser.email,
          password: secureTestPassword,
          role: "HOST",
        }),
      });

      const res = await loginRoute(mockReq as any);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("strictly reserved for Hackathon Hosts");
    });

    it("Judge portal rejects a Student trying to log in", async () => {
      const mockReq = new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: studentUser.email,
          password: secureTestPassword,
          role: "JUDGE",
        }),
      });

      const res = await loginRoute(mockReq as any);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("strictly reserved for Evaluators & Judges");
    });
  });

  // ==========================================
  // SECTION 2: DOMAIN-FILTERED JUDGING
  // ==========================================
  describe("Section 2: Domain-Filtered Judging", () => {
    it("Judge with assigned domain only receives squads belonging to that domain", async () => {
      activeSessionToken = judgeTokenAI;
      const mockReq = new Request(
        `http://localhost:3000/api/v1/judge/submissions?hackathonId=${hackathon.id}`
      );

      const res = await getJudgeSubmissions(mockReq as any);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.assignedDomain).toBe("Artificial Intelligence & ML");
      // Must include teamAI
      const foundAI = data.submissions.some((s: any) => s.teamId === teamAI.id);
      expect(foundAI).toBe(true);

      // Must NOT include teamRobotics
      const foundRobo = data.submissions.some((s: any) => s.teamId === teamRobotics.id);
      expect(foundRobo).toBe(false);
    });

    it("Judge attempting to score a squad from an unauthorized domain is rejected with 403", async () => {
      activeSessionToken = judgeTokenAI;
      const mockReq = new Request("http://localhost:3000/api/v1/judge/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: teamRobotics.id,
          submissionId: subRobotics.id,
          scores: [
            { criterionId: crit1.id, score: 8.0 },
            { criterionId: crit2.id, score: 7.5 },
          ],
        }),
      });

      const res = await scoreSubmission(mockReq as any);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Access Denied");
      expect(data.error).toContain("Artificial Intelligence & ML");
    });
  });

  // ==========================================
  // SECTION 3: RUBRIC DRAFT MARKS & PRIVACY
  // ==========================================
  describe("Section 3: Rubric Draft Scoring and Privacy", () => {
    it("Allows saving partial/half marks as draft without requiring all criteria", async () => {
      activeSessionToken = judgeTokenAI;
      const mockReq = new Request("http://localhost:3000/api/v1/judge/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: teamAI.id,
          submissionId: subAI.id,
          isDraft: true,
          scores: [
            // Only scoring criterion 1 with half marks (5.5)
            {
              criterionId: crit1.id,
              score: 5.5,
              notes: "Partial draft marks: Solid architectural foundation",
            },
          ],
        }),
      });

      const res = await scoreSubmission(mockReq as any);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.isDraft).toBe(true);
      expect(data.message).toContain("Draft scores saved successfully");

      // Verify in DB that isDraft is true
      const dbScore = await prisma.score.findFirst({
        where: { submissionId: subAI.id, criterionId: crit1.id },
      });
      expect(dbScore).toBeDefined();
      expect(dbScore?.score).toBe(5.5);
      expect(dbScore?.isDraft).toBe(true);
    });

    it("Host leaderboard excludes draft scores from official ranking calculations", async () => {
      const hostToken = signSessionToken({
        userId: hostUser.id,
        email: hostUser.email,
        role: "HOST",
        status: "ACTIVE",
        name: hostUser.name,
      });

      activeSessionToken = hostToken;
      const mockReq = new Request(
        `http://localhost:3000/api/v1/host/hackathons/${hackathon.id}/leaderboard`
      );

      const res = await getLeaderboard(mockReq as any, { params: { hackathonId: hackathon.id } });
      expect(res.status).toBe(200);
      const data = await res.json();

      const aiLeaderboardEntry = data.leaderboard.find((s: any) => s.teamId === teamAI.id);
      // Since teamAI only has draft marks, finalScore in official leaderboard must be 0
      expect(aiLeaderboardEntry.finalScore).toBe(0);
    });

    it("Students cannot view results or preliminary marks until published by host", async () => {
      const studentToken = signSessionToken({
        userId: studentUser.id,
        email: studentUser.email,
        role: "STUDENT",
        status: "ACTIVE",
        name: studentUser.name,
      });

      activeSessionToken = studentToken;
      const mockReq = new Request(`http://localhost:3000/api/v1/teams/${teamAI.id}/result`);

      const res = await getTeamResult(mockReq as any, { params: { teamId: teamAI.id } });
      expect(res.status).toBe(200);
      const data = await res.json();

      // Student sees null result and notification that results are not published
      expect(data.result).toBeNull();
      expect(data.message).toContain("Results for this track have not yet been certified and published");
    });

    it("Updating draft marks preserves and updates previous score without losing old data", async () => {
      activeSessionToken = judgeTokenAI;
      const mockReq = new Request("http://localhost:3000/api/v1/judge/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: teamAI.id,
          submissionId: subAI.id,
          isDraft: true,
          scores: [
            // Update criterion 1 from 5.5 to 8.5
            {
              criterionId: crit1.id,
              score: 8.5,
              notes: "Updated draft marks after prototype demo",
            },
            // Add criterion 2 draft
            {
              criterionId: crit2.id,
              score: 7.5,
              notes: "Good presentation",
            },
          ],
        }),
      });

      const res = await scoreSubmission(mockReq as any);
      expect(res.status).toBe(200);

      const scores = await prisma.score.findMany({
        where: { submissionId: subAI.id },
      });
      expect(scores.length).toBe(2);
      const score1 = scores.find((s) => s.criterionId === crit1.id);
      expect(score1?.score).toBe(8.5);
      expect(score1?.notes).toContain("Updated draft marks");
    });

    it("Final submission marks all scores certified with isDraft=false", async () => {
      activeSessionToken = judgeTokenAI;
      const mockReq = new Request("http://localhost:3000/api/v1/judge/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: teamAI.id,
          submissionId: subAI.id,
          isDraft: false,
          scores: [
            { criterionId: crit1.id, score: 9.5, notes: "Final certified: Outstanding" },
            { criterionId: crit2.id, score: 9.0, notes: "Final certified: Flawless demo" },
          ],
        }),
      });

      const res = await scoreSubmission(mockReq as any);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.isDraft).toBe(false);

      const scores = await prisma.score.findMany({
        where: { submissionId: subAI.id },
      });
      expect(scores.every((s) => s.isDraft === false)).toBe(true);
    });
  });
});
