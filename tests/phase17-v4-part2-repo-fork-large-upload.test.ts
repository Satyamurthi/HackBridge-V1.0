import { describe, it, expect, beforeAll, vi } from "vitest";
import fs from "fs";
import path from "path";
import { prisma } from "../src/lib/db";
import {
  parseGitHubRepoUrl,
  forkGitHubRepository,
  updateTeamReadmeAndManifest,
} from "../src/lib/github-fork";
import { sanitizeFolderName, OP_BASE_STORAGE_DIR } from "../src/lib/github-push";
import {
  GET as getDocuments,
  POST as postDocument,
  PATCH as patchDocuments,
} from "../src/app/api/v1/teams/[teamId]/documents/route";
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

describe("Phase 17 (v4.0): Part 2 Live Link, GitHub Auto-Forking to Host Account & README.md Sync", () => {
  let hostUser: any;
  let hostProfile: any;
  let studentUser: any;
  let studentProfile: any;
  let studentToken: string;
  let hostToken: string;
  let hackathon: any;
  let team: any;
  let domain: any;
  let problemStatement: any;

  beforeAll(async () => {
    const hashed = await hashPassword("SecureKey#2026");

    // 1. Host
    hostUser = await prisma.user.create({
      data: {
        email: `host.part2.${Date.now()}@hackbridge.edu`,
        name: "Host Administrator",
        phone: "9123456789",
        role: "HOST",
        status: "ACTIVE",
        passwordHash: hashed,
      },
    });

    hostProfile = await prisma.hostProfile.create({
      data: {
        userId: hostUser.id,
        orgName: "HackBridge University Host",
        type: "college",
        approvalStatus: "APPROVED",
        hackId: `HOST-${Date.now().toString().slice(-6)}`,
      },
    });

    hostToken = signSessionToken({
      userId: hostUser.id,
      email: hostUser.email,
      role: hostUser.role,
      name: hostUser.name,
      status: hostUser.status,
    });

    // 2. Hackathon
    hackathon = await prisma.hackathon.create({
      data: {
        hostId: hostProfile.id,
        title: `Hackathon v4.0 Sprint ${Date.now()}`,
        slug: `hackathon-v4-sprint-${Date.now()}`,
        description: "Part 2 Code and Deployment testing hackathon",
        rules: "Standard collegiate hackathon rules.",
        startAt: new Date(Date.now() - 3600000),
        endAt: new Date(Date.now() + 86400000),
        fee: 0,
        upiId: "host@upi",
      },
    });

    // 3. Domain & Problem Statement
    domain = await prisma.domain.create({
      data: {
        name: "Full Stack Web & Cloud",
        description: "Cloud applications and web services",
        hackathonId: hackathon.id,
        revealAt: new Date(Date.now() - 3600000),
      },
    });

    problemStatement = await prisma.problemStatement.create({
      data: {
        domainId: domain.id,
        title: "Autonomous Deployment Pipeline Engine",
        description: "Create an autonomous pipeline with live demo and public repo",
        cap: 10,
      },
    });

    // 4. Student
    studentUser = await prisma.user.create({
      data: {
        email: `student.lead.${Date.now()}@college.edu`,
        name: "Lead Developer",
        phone: "9876543211",
        role: "STUDENT",
        status: "ACTIVE",
        passwordHash: hashed,
      },
    });

    studentProfile = await prisma.studentProfile.create({
      data: {
        userId: studentUser.id,
        college: "Apex Institute of Tech",
        hackathonId: `HB-${Date.now().toString().slice(-6)}`,
      },
    });

    studentToken = signSessionToken({
      userId: studentUser.id,
      email: studentUser.email,
      role: studentUser.role,
      name: studentUser.name,
      status: studentUser.status,
    });

    // 5. Team
    team = await prisma.team.create({
      data: {
        name: `CyberForge-${Date.now().toString().slice(-4)}`,
        teamId: `TEAM-${Date.now().toString().slice(-6)}`,
        hackathonId: hackathon.id,
        domainId: domain.id,
        problemStatementId: problemStatement.id,
        leadStudentId: studentProfile.id,
      },
    });

    await prisma.teamMember.create({
      data: {
        teamId: team.id,
        studentId: studentProfile.id,
        role: "LEADER",
      },
    });
  });

  describe("Unit: GitHub URL Parser & Fork Utility", () => {
    it("should correctly parse various GitHub repository URL formats", () => {
      const httpsStandard = parseGitHubRepoUrl("https://github.com/torvalds/linux");
      expect(httpsStandard).toEqual({ owner: "torvalds", repo: "linux" });

      const withDotGit = parseGitHubRepoUrl("https://github.com/facebook/react.git");
      expect(withDotGit).toEqual({ owner: "facebook", repo: "react" });

      const withTrailingSlash = parseGitHubRepoUrl("https://github.com/vercel/next.js/");
      expect(withTrailingSlash).toEqual({ owner: "vercel", repo: "next.js" });

      const sshFormat = parseGitHubRepoUrl("git@github.com:octocat/Hello-World.git");
      expect(sshFormat).toEqual({ owner: "octocat", repo: "Hello-World" });

      const invalidUrl = parseGitHubRepoUrl("https://gitlab.com/user/project");
      expect(invalidUrl).toBeNull();

      const emptyString = parseGitHubRepoUrl("");
      expect(emptyString).toBeNull();
    });

    it("should formulate fork result and designate host account fork URL", async () => {
      const res = await forkGitHubRepository("https://github.com/student-dev/awesome-hack-app");
      expect(res.success).toBe(true);
      expect(res.originalRepoUrl).toBe("https://github.com/student-dev/awesome-hack-app");
      expect(res.repo).toBe("awesome-hack-app");
      expect(res.forkedRepoUrl).toContain("github.com/");
      expect(res.forkedRepoUrl).toContain("/awesome-hack-app");
      expect(["Forked", "Fork Registered (Host Account)"]).toContain(res.forkStatus);
    });

    it("should update team README.md and MANIFEST.json on local server and OP storage", () => {
      const updateRes = updateTeamReadmeAndManifest({
        hackathonTitle: hackathon.title,
        teamName: team.name,
        teamId: team.teamId,
        githubRepoUrl: "https://github.com/student-dev/awesome-hack-app",
        forkedRepoUrl: "https://github.com/hackbridge-dev/awesome-hack-app",
        liveUrl: "https://awesome-hack-app.vercel.app",
        forkStatus: "Forked",
      });

      expect(updateRes.success).toBe(true);
      expect(updateRes.updatedFiles.length).toBeGreaterThan(0);

      // Verify server's team README.md file contains the forked repo and live deployment link
      const safeHackathon = sanitizeFolderName(hackathon.title);
      const safeTeam = sanitizeFolderName(team.name);
      const serverReadmePath = path.join(process.cwd(), safeHackathon, safeTeam, "README.md");

      expect(fs.existsSync(serverReadmePath)).toBe(true);
      const readmeContent = fs.readFileSync(serverReadmePath, "utf8");
      expect(readmeContent).toContain("## Repository & Live Deployment Links");
      expect(readmeContent).toContain("https://github.com/hackbridge-dev/awesome-hack-app");
      expect(readmeContent).toContain("https://github.com/student-dev/awesome-hack-app");
      expect(readmeContent).toContain("https://awesome-hack-app.vercel.app");

      // Verify MANIFEST.json
      const manifestPath = path.join(process.cwd(), safeHackathon, safeTeam, "MANIFEST.json");
      expect(fs.existsSync(manifestPath)).toBe(true);
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      expect(manifest.repositoryLinks.forkedRepoUrl).toBe("https://github.com/hackbridge-dev/awesome-hack-app");
      expect(manifest.repositoryLinks.liveUrl).toBe("https://awesome-hack-app.vercel.app");
    });
  });

  describe("API: PATCH /api/v1/teams/[teamId]/documents — Standalone Live URL & GitHub Fork", () => {
    it("should allow a team member to update Live URL and GitHub Repo link, triggering fork and README sync", async () => {
      activeSessionToken = studentToken;

      const req = new NextRequest(`http://localhost:3000/api/v1/teams/${team.id}/documents`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          liveUrl: "https://cyberforge-live.web.app",
          githubRepoUrl: "https://github.com/cyberforge-team/core-engine",
        }),
      });

      const res = await patchDocuments(req, { params: { teamId: team.id } });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.liveUrl).toBe("https://cyberforge-live.web.app");
      expect(data.githubRepoUrl).toBe("https://github.com/cyberforge-team/core-engine");
      expect(data.forkedRepoUrl).toContain("core-engine");

      // Verify database persistence in CodeRepo
      const codeRepo = await prisma.codeRepo.findUnique({
        where: { teamId: team.id },
      });
      expect(codeRepo).not.toBeNull();
      expect(codeRepo?.liveUrl).toBe("https://cyberforge-live.web.app");
      expect(codeRepo?.githubRepoUrl).toBe("https://github.com/cyberforge-team/core-engine");
      expect(codeRepo?.forkedRepoUrl).toContain("core-engine");

      // Verify server's team README.md has the updated forked link
      const safeHackathon = sanitizeFolderName(hackathon.title);
      const safeTeam = sanitizeFolderName(team.name);
      const serverReadmePath = path.join(process.cwd(), safeHackathon, safeTeam, "README.md");

      expect(fs.existsSync(serverReadmePath)).toBe(true);
      const readmeText = fs.readFileSync(serverReadmePath, "utf8");
      expect(readmeText).toContain(data.forkedRepoUrl);
      expect(readmeText).toContain("https://cyberforge-live.web.app");
    });

    it("should reject unauthenticated or non-member requests to update repository links", async () => {
      activeSessionToken = null;

      const req = new NextRequest(`http://localhost:3000/api/v1/teams/${team.id}/documents`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          liveUrl: "https://malicious.link",
        }),
      });

      const res = await patchDocuments(req, { params: { teamId: team.id } });
      expect(res.status).toBe(401);
    });
  });

  describe("API: POST /api/v1/teams/[teamId]/documents — Part 2 Large Archive & Links", () => {
    it("should reject Part 2 files exceeding the 3GB limit", async () => {
      activeSessionToken = studentToken;

      const oversizedBytes = 3.5 * 1024 * 1024 * 1024; // 3.5GB
      const req = new NextRequest(`http://localhost:3000/api/v1/teams/${team.id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: 2,
          fileName: "massive_archive.zip",
          fileSize: oversizedBytes,
          fileType: "application/zip",
          fileData: "UEsDBAoAAAAAA", // dummy base64
        }),
      });

      const res = await postDocument(req, { params: { teamId: team.id } });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("3GB maximum limit for Part 2");
    });

    it("should successfully accept Part 2 upload under 3GB, fork GitHub repo, and update team README.md", async () => {
      activeSessionToken = studentToken;

      const sampleSize = 50 * 1024 * 1024; // 50MB code archive
      const req = new NextRequest(`http://localhost:3000/api/v1/teams/${team.id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: 2,
          fileName: "cyberforge_part2_code_and_screenshots.zip",
          fileSize: sampleSize,
          fileType: "application/zip",
          fileData: "UEsDBAoAAAAAA", // dummy base64
          liveUrl: "https://cyberforge-v2.prod.app",
          githubRepoUrl: "https://github.com/cyberforge-team/v2-engine",
        }),
      });

      const res = await postDocument(req, { params: { teamId: team.id } });
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.forkedRepoUrl).toContain("v2-engine");
      expect(data.liveUrl).toBe("https://cyberforge-v2.prod.app");
      expect(data.githubRepoUrl).toBe("https://github.com/cyberforge-team/v2-engine");

      // Verify DocumentUpload record created
      expect(data.upload.stage).toBe(2);
      expect(data.upload.fileName).toBe("cyberforge_part2_code_and_screenshots.zip");

      // Verify server's team README.md was refreshed with the new forked repo link
      const safeHackathon = sanitizeFolderName(hackathon.title);
      const safeTeam = sanitizeFolderName(team.name);
      const serverReadmePath = path.join(process.cwd(), safeHackathon, safeTeam, "README.md");

      expect(fs.existsSync(serverReadmePath)).toBe(true);
      const readmeText = fs.readFileSync(serverReadmePath, "utf8");
      expect(readmeText).toContain(data.forkedRepoUrl);
      expect(readmeText).toContain("https://cyberforge-v2.prod.app");
    });
  });

  describe("API: GET /api/v1/teams/[teamId]/documents — Returns Forked Repo & Live Links", () => {
    it("should return forkedRepoUrl, liveUrl, and githubRepoUrl in stage 2 and root response", async () => {
      activeSessionToken = studentToken;

      const req = new NextRequest(`http://localhost:3000/api/v1/teams/${team.id}/documents`);
      const res = await getDocuments(req, { params: { teamId: team.id } });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.forkedRepoUrl).toContain("v2-engine");
      expect(data.liveUrl).toBe("https://cyberforge-v2.prod.app");
      expect(data.githubRepoUrl).toBe("https://github.com/cyberforge-team/v2-engine");

      // Stage 2 check
      const part2 = data.stages.find((s: any) => s.stage === 2);
      expect(part2).toBeDefined();
      expect(part2.forkedRepoUrl).toContain("v2-engine");
      expect(part2.liveUrl).toBe("https://cyberforge-v2.prod.app");
      expect(part2.githubRepoUrl).toBe("https://github.com/cyberforge-team/v2-engine");
    });
  });
});
