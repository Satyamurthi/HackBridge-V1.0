import { describe, it, expect, beforeAll, vi } from "vitest";
import { prisma } from "../src/lib/db";
import { GET as getHackathonLeaderboard } from "../src/app/api/v1/hackathons/[id]/leaderboard/route";
import { GET as getTeams } from "../src/app/api/v1/teams/route";
import { GET as getHackathons } from "../src/app/api/v1/hackathons/route";
import { isV5Enabled } from "../src/lib/version-gate";
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

describe("Phase 22: In-Hackathon Leaderboard with Gold/Silver/Bronze Trophies & Winners Green Indicator (v5.0 Gate & Host Approval)", () => {
  let hostUser: any;
  let hostProfile: any;
  let hostToken: string;
  let hackathon: any;
  let judgeUser: any;
  let judgeProfile: any;
  let judgeToken: string;

  let team1: any;
  let team2: any;
  let team3: any;
  let team4: any;

  let student1User: any;
  let student1Token: string;

  beforeAll(async () => {
    const hashed = await hashPassword("SecureArenaPass#2026");

    // 1. Host
    hostUser = await prisma.user.create({
      data: {
        email: `host.phase22.${Date.now()}@hackbridge.edu`,
        name: "Host Phase 22 Directorate",
        phone: "9123456788",
        role: "HOST",
        status: "ACTIVE",
        passwordHash: hashed,
      },
    });

    hostProfile = await prisma.hostProfile.create({
      data: {
        userId: hostUser.id,
        orgName: "HackBridge National Grand Arena",
        type: "college",
        approvalStatus: "APPROVED",
      },
    });

    hostToken = signSessionToken({
      userId: hostUser.id,
      email: hostUser.email,
      role: hostUser.role,
      name: hostUser.name,
      status: "ACTIVE",
    });

    // 2. Hackathon
    hackathon = await prisma.hackathon.create({
      data: {
        hostId: hostProfile.id,
        title: `Grand National Hackathon 2026 ${Date.now()}`,
        slug: `grand-hackathon-${Date.now()}`,
        description: "Official Hackathon with Live In-Arena Standings & Trophy Recognition",
        rules: "Standard fair judging rules",
        teamMin: 1,
        teamMax: 4,
        fee: 0,
        status: "PUBLISHED",
        startAt: new Date(Date.now() - 3600 * 1000 * 24),
        endAt: new Date(Date.now() + 3600 * 1000 * 48),
      },
    });

    // 3. Rubric Criterion (Max 100)
    await prisma.rubricCriterion.create({
      data: {
        hackathonId: hackathon.id,
        name: "Technical Excellence",
        maxScore: 100,
      },
    });

    // 4. Judge
    judgeUser = await prisma.user.create({
      data: {
        email: `judge.phase22.${Date.now()}@hackbridge.edu`,
        name: "Chief Evaluator Phase 22",
        phone: "9123456787",
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
        designation: "Principal Architect",
        company: "Apex Tech Labs",
      },
    });

    judgeToken = signSessionToken({
      userId: judgeUser.id,
      email: judgeUser.email,
      role: judgeUser.role,
      name: judgeUser.name,
      status: "ACTIVE",
    });

    // 5. Create 4 Student Leads & Teams
    const createTeamWithLead = async (idx: number, squadName: string) => {
      const studentUser = await prisma.user.create({
        data: {
          email: `student.lead.${idx}.${Date.now()}@hackbridge.edu`,
          name: `Lead Architect ${idx}`,
          phone: `912345000${idx}`,
          role: "STUDENT",
          status: "ACTIVE",
          passwordHash: hashed,
        },
      });

      const studentProfile = await prisma.studentProfile.create({
        data: {
          userId: studentUser.id,
          hackathonId: `HB-${Math.floor(100000 + Math.random() * 900000)}`,
          college: `State Engineering College ${idx}`,
        },
      });

      const team = await prisma.team.create({
        data: {
          hackathonId: hackathon.id,
          leadStudentId: studentProfile.id,
          name: squadName,
          status: "SUBMITTED",
        },
      });

      await prisma.teamMember.create({
        data: {
          teamId: team.id,
          studentId: studentProfile.id,
          role: "LEAD",
        },
      });

      return { studentUser, studentProfile, team };
    };

    const t1 = await createTeamWithLead(1, "Alpha Cyber Pioneers");
    const t2 = await createTeamWithLead(2, "Beta Quantum Knights");
    const t3 = await createTeamWithLead(3, "Gamma Matrix Builders");
    const t4 = await createTeamWithLead(4, "Delta Horizon Creators");

    team1 = t1.team;
    team2 = t2.team;
    team3 = t3.team;
    team4 = t4.team;

    student1User = t1.studentUser;
    student1Token = signSessionToken({
      userId: student1User.id,
      email: student1User.email,
      role: student1User.role,
      name: student1User.name,
      status: "ACTIVE",
    });
  });

  it("1. Version Gate: isolates v4.0 baseline from v5.0 features cleanly", () => {
    // Default context (promoted to v5.0 production baseline)
    expect(isV5Enabled()).toBe(true);

    // Explicit v4 header or query
    expect(isV5Enabled({ searchParams: new URLSearchParams("v=4.0") })).toBe(false);
    expect(
      isV5Enabled({
        headers: new Headers({ "x-hackbridge-version": "4.0" }),
      })
    ).toBe(false);

    // v5 flag via search params
    expect(isV5Enabled({ searchParams: new URLSearchParams("v=5.0") })).toBe(true);

    // v5 flag via HTTP headers
    expect(
      isV5Enabled({
        headers: new Headers({ "x-hackbridge-version": "5.0" }),
      })
    ).toBe(true);
    expect(
      isV5Enabled({
        headers: new Headers({ "x-v5-gate": "true" }),
      })
    ).toBe(true);
    expect(
      isV5Enabled({
        headers: new Headers({ "x-v5-leaderboard": "true" }),
      })
    ).toBe(true);
  });

  it("2. Leaderboard API: returns hasScores: false when no judge marks exist yet", async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/v1/hackathons/${hackathon.id}/leaderboard`,
      {
        headers: { "x-hackbridge-version": "5.0" },
      }
    );

    const res = await getHackathonLeaderboard(req, {
      params: { id: hackathon.id },
    });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.hasScores).toBe(false);
    expect(data.leaderboard).toHaveLength(0);
    expect(data.winners).toHaveLength(0);
  });

  it("3. Leaderboard API: students cannot see marks until Host approves results, then reveals Trophies", async () => {
    const crit = await prisma.rubricCriterion.findFirst({
      where: { hackathonId: hackathon.id },
    });

    const sub1 = await prisma.submission.create({
      data: {
        teamId: team1.id,
        link: "https://github.com/alphacyber/final-repo",
        description: "Alpha Cyber advanced security pipeline",
      },
    });
    await prisma.score.create({
      data: {
        submissionId: sub1.id,
        judgeId: judgeProfile.id,
        criterionId: crit!.id,
        score: 95,
        notes: "Outstanding work and immaculate security boundaries",
        isDraft: false,
      },
    });

    const sub2 = await prisma.submission.create({
      data: {
        teamId: team2.id,
        link: "https://github.com/betaquantum/final-repo",
        description: "Beta Quantum high throughput ledger",
      },
    });
    await prisma.score.create({
      data: {
        submissionId: sub2.id,
        judgeId: judgeProfile.id,
        criterionId: crit!.id,
        score: 88,
        notes: "Solid architecture and great benchmarks",
        isDraft: false,
      },
    });

    const sub3 = await prisma.submission.create({
      data: {
        teamId: team3.id,
        link: "https://github.com/gammamatrix/final-repo",
        description: "Gamma Matrix distributed analytics",
      },
    });
    await prisma.score.create({
      data: {
        submissionId: sub3.id,
        judgeId: judgeProfile.id,
        criterionId: crit!.id,
        score: 75,
        notes: "Very good prototype with clear documentation",
        isDraft: false,
      },
    });

    const sub4 = await prisma.submission.create({
      data: {
        teamId: team4.id,
        link: "https://github.com/deltahorizon/final-repo",
        description: "Delta Horizon creative cloud interface",
      },
    });
    await prisma.score.create({
      data: {
        submissionId: sub4.id,
        judgeId: judgeProfile.id,
        criterionId: crit!.id,
        score: 62,
        notes: "Needs more automated testing and complete deployment",
        isDraft: false,
      },
    });

    // STEP A: Student attempts to see leaderboard BEFORE Host approves results
    activeSessionToken = student1Token;
    const studentReqBefore = new NextRequest(
      `http://localhost:3000/api/v1/hackathons/${hackathon.id}/leaderboard`,
      {
        headers: { "x-hackbridge-version": "5.0" },
      }
    );

    const studentResBefore = await getHackathonLeaderboard(studentReqBefore, {
      params: { id: hackathon.id },
    });
    expect(studentResBefore.status).toBe(200);

    const studentDataBefore = await studentResBefore.json();
    expect(studentDataBefore.hasScores).toBe(true);
    expect(studentDataBefore.isHostApproved).toBe(false);
    expect(studentDataBefore.resultsApproved).toBe(false);
    // Student CANNOT see marks until Host approves results!
    expect(studentDataBefore.leaderboard).toHaveLength(0);
    expect(studentDataBefore.winners).toHaveLength(0);

    // STEP B: Host inspects leaderboard BEFORE approving (Host CAN inspect computed standings)
    activeSessionToken = hostToken;
    const hostReq = new NextRequest(
      `http://localhost:3000/api/v1/hackathons/${hackathon.id}/leaderboard`,
      {
        headers: { "x-hackbridge-version": "5.0" },
      }
    );
    const hostRes = await getHackathonLeaderboard(hostReq, {
      params: { id: hackathon.id },
    });
    expect(hostRes.status).toBe(200);
    const hostData = await hostRes.json();
    expect(hostData.hasScores).toBe(true);
    expect(hostData.leaderboard).toHaveLength(4);
    expect(hostData.leaderboard[0].finalScore).toBe(95);

    // STEP C: Host APPROVES and publishes official results
    await prisma.result.createMany({
      data: [
        { hackathonId: hackathon.id, teamId: team1.id, rank: 1, award: "1st Place Winner - Gold Trophy" },
        { hackathonId: hackathon.id, teamId: team2.id, rank: 2, award: "2nd Place Winner - Silver Trophy" },
        { hackathonId: hackathon.id, teamId: team3.id, rank: 3, award: "3rd Place Winner - Bronze Trophy" },
        { hackathonId: hackathon.id, teamId: team4.id, rank: 4, award: "Runner Up" },
      ],
    });

    // STEP D: Student now requests leaderboard AFTER Host approves results
    activeSessionToken = student1Token;
    const studentReqAfter = new NextRequest(
      `http://localhost:3000/api/v1/hackathons/${hackathon.id}/leaderboard`,
      {
        headers: { "x-hackbridge-version": "5.0" },
      }
    );
    const studentResAfter = await getHackathonLeaderboard(studentReqAfter, {
      params: { id: hackathon.id },
    });
    expect(studentResAfter.status).toBe(200);
    const studentDataAfter = await studentResAfter.json();

    expect(studentDataAfter.isHostApproved).toBe(true);
    expect(studentDataAfter.resultsApproved).toBe(true);
    expect(studentDataAfter.leaderboard).toHaveLength(4);

    // Verify ordering and trophy assignments
    const [first, second, third, fourth] = studentDataAfter.leaderboard;

    // Rank 1: Gold Trophy
    expect(first.teamId).toBe(team1.id);
    expect(first.rank).toBe(1);
    expect(first.finalScore).toBe(95);
    expect(first.trophy).toBe("GOLD");
    expect(first.isWinner).toBe(true);
    expect(first.award).toBe("1st Place Winner - Gold Trophy");

    // Rank 2: Silver Trophy
    expect(second.teamId).toBe(team2.id);
    expect(second.rank).toBe(2);
    expect(second.finalScore).toBe(88);
    expect(second.trophy).toBe("SILVER");
    expect(second.isWinner).toBe(true);
    expect(second.award).toBe("2nd Place Winner - Silver Trophy");

    // Rank 3: Bronze Trophy
    expect(third.teamId).toBe(team3.id);
    expect(third.rank).toBe(3);
    expect(third.finalScore).toBe(75);
    expect(third.trophy).toBe("BRONZE");
    expect(third.isWinner).toBe(true);
    expect(third.award).toBe("3rd Place Winner - Bronze Trophy");

    // Rank 4: Runner-up (No Trophy)
    expect(fourth.teamId).toBe(team4.id);
    expect(fourth.rank).toBe(4);
    expect(fourth.finalScore).toBe(62);
    expect(fourth.trophy).toBeNull();
    expect(fourth.isWinner).toBe(false);

    // Winners array contains top 3
    expect(studentDataAfter.winners).toHaveLength(3);
    expect(studentDataAfter.winners[0].teamId).toBe(team1.id);
    expect(studentDataAfter.winners[1].teamId).toBe(team2.id);
    expect(studentDataAfter.winners[2].teamId).toBe(team3.id);
  });

  it("4. Teams & Hackathons API: provides isWinner and hackathonHasWinners tags for green indicators after host approval", async () => {
    activeSessionToken = student1Token;

    // Fetch student's teams under v5 header
    const v5TeamsReq = new NextRequest(
      "http://localhost:3000/api/v1/teams",
      {
        headers: { "x-hackbridge-version": "5.0" },
      }
    );
    const v5TeamsRes = await getTeams(v5TeamsReq);
    expect(v5TeamsRes.status).toBe(200);
    const v5TeamsData = await v5TeamsRes.json();

    const studentTeam = v5TeamsData.teams.find((t: any) => t.id === team1.id);
    expect(studentTeam).toBeDefined();
    expect(studentTeam.isWinner).toBe(true);
    expect(studentTeam.hackathonHasWinners).toBe(true);

    // Fetch hackathons under v5
    const v5HackathonsReq = new NextRequest(
      "http://localhost:3000/api/v1/hackathons",
      {
        headers: { "x-hackbridge-version": "5.0" },
      }
    );
    const v5HackathonsRes = await getHackathons(v5HackathonsReq);
    expect(v5HackathonsRes.status).toBe(200);
    const v5HackathonsData = await v5HackathonsRes.json();

    const targetHackathon = v5HackathonsData.hackathons.find(
      (h: any) => h.id === hackathon.id
    );
    expect(targetHackathon).toBeDefined();
    expect(targetHackathon.hasWinners).toBe(true);
  });
});
