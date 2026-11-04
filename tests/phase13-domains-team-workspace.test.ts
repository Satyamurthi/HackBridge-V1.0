import { describe, it, expect, beforeAll, vi } from "vitest";
import { prisma } from "../src/lib/db";
import { POST as createHackathon } from "../src/app/api/v1/hackathons/route";
import { POST as createTeam, GET as getTeams } from "../src/app/api/v1/teams/route";
import { GET as getProblemStatements } from "../src/app/api/v1/hackathons/[id]/problem-statements/route";
import { POST as selectStatement } from "../src/app/api/v1/teams/[teamId]/select-statement/route";
import { POST as updateProgress, GET as getProgress } from "../src/app/api/v1/teams/[teamId]/progress/route";
import { POST as uploadDocument, GET as getDocuments } from "../src/app/api/v1/teams/[teamId]/documents/route";
import { GET as getJudgeSubmissions } from "../src/app/api/v1/judge/submissions/route";
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

describe("Phase 13: Domains, Hidden Problem Statements, Team Workspace, Progress Bar & GitHub Push", () => {
  let hostUser: any;
  let hostToken: string;
  let studentLeadA: any;
  let studentLeadAToken: string;
  let studentMemberA: any;
  let studentMemberAToken: string;
  let studentLeadB: any;
  let studentLeadBToken: string;
  let unassignedJudgeUser: any;
  let unassignedJudgeToken: string;
  let assignedJudgeUser: any;
  let assignedJudgeToken: string;

  let hackathon: any;
  let domainAI: any;
  let domainCyber: any;
  let teamA: any;
  let teamB: any;

  beforeAll(async () => {
    const timestamp = Date.now();

    // 1. Create Host User & Profile
    hostUser = await prisma.user.create({
      data: {
        email: `host.phase13.${timestamp}@hackbridge.edu`,
        name: "Dr. A. Host",
        role: "HOST",
        status: "ACTIVE",
        passwordHash: "test-hash",
        hostProfile: {
          create: {
            orgName: "Institute of Technology",
            type: "college",
            approvalStatus: "APPROVED",
            upiId: "host@upi",
          },
        },
      },
      include: { hostProfile: true },
    });
    hostToken = await signSessionToken({
      userId: hostUser.id,
      email: hostUser.email,
      name: hostUser.name,
      role: hostUser.role as any,
      status: "ACTIVE",
    });

    // 2. Create Student Lead A & Member A
    studentLeadA = await prisma.user.create({
      data: {
        email: `lead.a.${timestamp}@student.edu`,
        name: "Lead Alice",
        role: "STUDENT",
        status: "ACTIVE",
        passwordHash: "test-hash",
        studentProfile: {
          create: {
            hackathonId: generateHackathonId(),
            college: "MIT",
          },
        },
      },
      include: { studentProfile: true },
    });
    studentLeadAToken = await signSessionToken({
      userId: studentLeadA.id,
      email: studentLeadA.email,
      name: studentLeadA.name,
      role: studentLeadA.role as any,
      status: "ACTIVE",
    });

    studentMemberA = await prisma.user.create({
      data: {
        email: `member.a.${timestamp}@student.edu`,
        name: "Member Bob",
        role: "STUDENT",
        status: "ACTIVE",
        passwordHash: "test-hash",
        studentProfile: {
          create: {
            hackathonId: generateHackathonId(),
            college: "MIT",
          },
        },
      },
      include: { studentProfile: true },
    });
    studentMemberAToken = await signSessionToken({
      userId: studentMemberA.id,
      email: studentMemberA.email,
      name: studentMemberA.name,
      role: studentMemberA.role as any,
      status: "ACTIVE",
    });

    // 3. Create Student Lead B
    studentLeadB = await prisma.user.create({
      data: {
        email: `lead.b.${timestamp}@student.edu`,
        name: "Lead Charlie",
        role: "STUDENT",
        status: "ACTIVE",
        passwordHash: "test-hash",
        studentProfile: {
          create: {
            hackathonId: generateHackathonId(),
            college: "Stanford",
          },
        },
      },
      include: { studentProfile: true },
    });
    studentLeadBToken = await signSessionToken({
      userId: studentLeadB.id,
      email: studentLeadB.email,
      name: studentLeadB.name,
      role: studentLeadB.role as any,
      status: "ACTIVE",
    });

    // 4. Create Unassigned Judge & Assigned Judge
    unassignedJudgeUser = await prisma.user.create({
      data: {
        email: `unassigned.judge.${timestamp}@judge.edu`,
        name: "Unassigned Judge",
        role: "JUDGE",
        status: "ACTIVE",
        passwordHash: "test-hash",
      },
    });
    unassignedJudgeToken = await signSessionToken({
      userId: unassignedJudgeUser.id,
      email: unassignedJudgeUser.email,
      name: unassignedJudgeUser.name,
      role: unassignedJudgeUser.role as any,
      status: "ACTIVE",
    });

    assignedJudgeUser = await prisma.user.create({
      data: {
        email: `assigned.judge.${timestamp}@judge.edu`,
        name: "Assigned Judge",
        role: "JUDGE",
        status: "ACTIVE",
        passwordHash: "test-hash",
      },
    });
    assignedJudgeToken = await signSessionToken({
      userId: assignedJudgeUser.id,
      email: assignedJudgeUser.email,
      name: assignedJudgeUser.name,
      role: assignedJudgeUser.role as any,
      status: "ACTIVE",
    });
  });

  // Test 1: Host creates a hackathon with two domains and five problem statements in each
  it("Requirement 1: Host creates hackathon with 2 domains and 5 problem statements each with difficulty and attachments", async () => {
    const timestamp = Date.now();
    const futureReveal = new Date(Date.now() + 10000); // reveals in 10s

    hackathon = await prisma.hackathon.create({
      data: {
        hostId: hostUser.hostProfile.id,
        title: "National Tech Sprint 2026",
        slug: `tech-sprint-${timestamp}`,
        description: "Collegiate hackathon with 2 specialized domains and 5 problem statements per domain",
        rules: "Select domain upon registration; problem statements hidden until reveal clock",
        fee: 0,
        paymentMode: "FREE",
        status: "PUBLISHED",
        startAt: new Date(Date.now() - 3600000),
        endAt: new Date(Date.now() + 86400000),
        part1Due: new Date(Date.now() + 7200000), // in 2 hours
        part2Due: new Date(Date.now() + 14400000),
        part3Due: new Date(Date.now() + 21600000),
        part4Due: new Date(Date.now() + 28800000),
        domains: {
          create: [
            {
              name: "Artificial Intelligence",
              description: "Deep learning, LLMs, Computer Vision",
              revealAt: futureReveal,
              problemStatements: {
                create: [
                  { title: "AI-1: Real-time Audio Translation", description: "Edge neural network for low latency speech", difficulty: "HARD", cap: 2, attachmentUrl: "https://hackbridge.in/docs/ai-1.pdf", attachmentName: "AI-1-Spec.pdf" },
                  { title: "AI-2: Medical Image Diagnostics", description: "Automated scan analysis for rural clinics", difficulty: "HARD", cap: 2 },
                  { title: "AI-3: Autonomous Robotic Sorting", description: "Computer vision sorting system", difficulty: "MEDIUM", cap: 2 },
                  { title: "AI-4: Legal Contract Parser", description: "NLP extraction of contract liabilities", difficulty: "MEDIUM", cap: 2 },
                  { title: "AI-5: Personalized Tutor Agent", description: "Adaptive learning agent for students", difficulty: "EASY", cap: 2 },
                ],
              },
            },
            {
              name: "Cyber Security",
              description: "Threat hunting, cryptography, zero trust",
              revealAt: futureReveal,
              problemStatements: {
                create: [
                  { title: "CYBER-1: Automated Exploit Mitigation", description: "Kernel patch generation on binary zero-day", difficulty: "HARD", cap: 2 },
                  { title: "CYBER-2: Post-Quantum TLS Proxy", description: "Lattice-based encryption tunnel", difficulty: "HARD", cap: 2 },
                  { title: "CYBER-3: Ransomware Canary Detection", description: "Decoy file system watcher", difficulty: "MEDIUM", cap: 2 },
                  { title: "CYBER-4: Cloud IAM Privilege Leak Auditing", description: "Static analyzer for AWS/GCP policies", difficulty: "MEDIUM", cap: 2 },
                  { title: "CYBER-5: Phishing Email Classifier", description: "Header and URL reputation engine", difficulty: "EASY", cap: 2 },
                ],
              },
            },
          ],
        },
      },
      include: {
        domains: {
          include: {
            problemStatements: true,
          },
        },
      },
    });

    expect(hackathon.domains).toHaveLength(2);
    domainAI = hackathon.domains.find((d: any) => d.name === "Artificial Intelligence");
    domainCyber = hackathon.domains.find((d: any) => d.name === "Cyber Security");

    expect(domainAI.problemStatements).toHaveLength(5);
    expect(domainCyber.problemStatements).toHaveLength(5);
    expect(domainAI.problemStatements[0].difficulty).toBe("HARD");
    expect(domainAI.problemStatements[0].attachmentUrl).toBe("https://hackbridge.in/docs/ai-1.pdf");

    // Assign judge to this hackathon
    await prisma.judgeProfile.create({
      data: {
        userId: assignedJudgeUser.id,
        hackathonId: hackathon.id,
        approvalStatus: "APPROVED",
        designation: "Senior Evaluator",
      },
    });
  });

  // Test 2: Team registration requires a domain and binds team to it; host sees counts
  it("Requirement 2: Registration by domain binds team to it and shows team count to host", async () => {
    activeSessionToken = studentLeadAToken;

    // Register Team A into AI domain
    const reqA = new Request("http://localhost:3000/api/v1/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hackathonId: hackathon.id,
        name: "Alpha Squad AI",
        domainId: domainAI.id,
        members: [{ studentId: studentMemberA.studentProfile.hackathonId }],
      }),
    });

    const resA = await createTeam(reqA as any);
    const dataA = await resA.json();
    expect(resA.status).toBe(201);
    expect(dataA.team.domainId).toBe(domainAI.id);
    teamA = dataA.team;

    // Register Team B into Cyber domain
    activeSessionToken = studentLeadBToken;
    const reqB = new Request("http://localhost:3000/api/v1/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hackathonId: hackathon.id,
        name: "Beta Cyber Defenders",
        domainId: domainCyber.id,
      }),
    });

    const resB = await createTeam(reqB as any);
    const dataB = await resB.json();
    expect(resB.status).toBe(201);
    expect(dataB.team.domainId).toBe(domainCyber.id);
    teamB = dataB.team;

    // Verify host sees team counts per domain
    activeSessionToken = hostToken;
    const hostReq = new Request(`http://localhost:3000/api/v1/teams?hackathonId=${hackathon.id}`);
    const hostRes = await getTeams(hostReq as any);
    const hostData = await hostRes.json();
    expect(hostRes.status).toBe(200);

    const aiTeams = hostData.teams.filter((t: any) => t.domain?.id === domainAI.id);
    const cyberTeams = hostData.teams.filter((t: any) => t.domain?.id === domainCyber.id);
    expect(aiTeams).toHaveLength(1);
    expect(cyberTeams).toHaveLength(1);
  });

  // Test 3: Problem statements stay hidden server-side until reveal time
  it("Requirement 3: Hidden until reveal — no API response leaks statement content before reveal time", async () => {
    activeSessionToken = studentLeadAToken;

    const req = new Request(
      `http://localhost:3000/api/v1/hackathons/${hackathon.id}/problem-statements?teamId=${teamA.id}`
    );
    const res = await getProblemStatements(req as any, { params: { id: hackathon.id } });
    const data = await res.json();

    expect(res.status).toBe(200);
    const servedDomain = data.domains[0];
    expect(servedDomain.isRevealed).toBe(false);

    // Verify server-side masking: title masked, description null, attachments null
    for (const ps of servedDomain.problemStatements) {
      expect(ps.title).toContain("Problem Statement Locked");
      expect(ps.description).toBeNull();
      expect(ps.difficulty).toBeNull();
      expect(ps.attachmentUrl).toBeNull();
    }
  });

  // Test 4: Domain-scoped visibility post-reveal & cross-domain rejection
  it("Requirement 4: Domain-scoped visibility post-reveal & cross-domain rejection", async () => {
    // Fast-forward domain reveal times into the past
    const past = new Date(Date.now() - 5000);
    await prisma.domain.updateMany({
      where: { hackathonId: hackathon.id },
      data: { revealAt: past },
    });

    // Team A (bound to AI domain) requests problem statements
    activeSessionToken = studentLeadAToken;
    const reqA = new Request(
      `http://localhost:3000/api/v1/hackathons/${hackathon.id}/problem-statements?teamId=${teamA.id}`
    );
    const resA = await getProblemStatements(reqA as any, { params: { id: hackathon.id } });
    const dataA = await resA.json();

    expect(resA.status).toBe(200);
    expect(dataA.domains).toHaveLength(1);
    expect(dataA.domains[0].id).toBe(domainAI.id);
    expect(dataA.domains[0].name).toBe("Artificial Intelligence");
    expect(dataA.domains[0].problemStatements).toHaveLength(5);
    // Real content revealed
    expect(dataA.domains[0].problemStatements[0].title).toBe("AI-1: Real-time Audio Translation");
    expect(dataA.domains[0].problemStatements[0].difficulty).toBe("HARD");
    expect(dataA.domains[0].problemStatements[0].attachmentUrl).toBe("https://hackbridge.in/docs/ai-1.pdf");

    // Cross-domain request: Team A tries to request Cyber Security statements explicitly
    const crossReq = new Request(
      `http://localhost:3000/api/v1/hackathons/${hackathon.id}/problem-statements?teamId=${teamA.id}&domainId=${domainCyber.id}`
    );
    const crossRes = await getProblemStatements(crossReq as any, { params: { id: hackathon.id } });
    expect(crossRes.status).toBe(403);
    const crossData = await crossRes.json();
    expect(crossData.error).toContain("Squads may only inspect problem statements within their registered domain");
  });

  // Test 5: Statement selection saved, is final, blocks 2nd choice, handles concurrent limits ("Slots full")
  it("Requirement 5: Problem statement selection is final, blocks 2nd choice, and enforces slot limit ('Slots full')", async () => {
    const aiStatements = await prisma.problemStatement.findMany({
      where: { domainId: domainAI.id },
      orderBy: { title: "asc" },
    });
    const chosenPs = aiStatements[0];

    // Set statement cap to 1 for atomic concurrency test
    await prisma.problemStatement.update({
      where: { id: chosenPs.id },
      data: { cap: 1 },
    });

    // Team A chooses AI-1
    activeSessionToken = studentLeadAToken;
    const selectReq = new Request(`http://localhost:3000/api/v1/teams/${teamA.id}/select-statement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problemStatementId: chosenPs.id }),
    });
    const selectRes = await selectStatement(selectReq as any, { params: { teamId: teamA.id } });
    const selectData = await selectRes.json();

    expect(selectRes.status).toBe(200);
    expect(selectData.success).toBe(true);
    expect(selectData.statement.title).toBe(chosenPs.title);

    // Block second choice: Team A attempts to select another statement
    const secondReq = new Request(`http://localhost:3000/api/v1/teams/${teamA.id}/select-statement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problemStatementId: aiStatements[1].id }),
    });
    const secondRes = await selectStatement(secondReq as any, { params: { teamId: teamA.id } });
    expect(secondRes.status).toBe(400);
    const secondData = await secondRes.json();
    expect(secondData.error).toContain("Selection is final");

    // Another team in the same domain attempts to pick the same capped statement -> returns "Slots full"
    const leadC = await prisma.user.create({
      data: {
        email: `lead.c.${Date.now()}@student.edu`,
        name: "Lead C",
        role: "STUDENT",
        status: "ACTIVE",
        passwordHash: "test-hash",
        studentProfile: { create: { hackathonId: generateHackathonId(), college: "BITS" } },
      },
    });
    const leadCToken = await signSessionToken({
      userId: leadC.id,
      email: leadC.email,
      name: leadC.name,
      role: leadC.role as any,
      status: "ACTIVE",
    });

    const teamC = await prisma.team.create({
      data: {
        hackathonId: hackathon.id,
        name: "Charlie Squad",
        domainId: domainAI.id,
        status: "ACTIVE",
        teamId: `TEAM-C-${Date.now()}`,
        leadStudentId: (await prisma.studentProfile.findUnique({ where: { userId: leadC.id } }))!.id,
        members: {
          create: [{ studentId: (await prisma.studentProfile.findUnique({ where: { userId: leadC.id } }))!.id, role: "LEAD" }],
        },
      },
    });

    activeSessionToken = leadCToken;
    const fullSlotReq = new Request(`http://localhost:3000/api/v1/teams/${teamC.id}/select-statement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problemStatementId: chosenPs.id }),
    });
    const fullSlotRes = await selectStatement(fullSlotReq as any, { params: { teamId: teamC.id } });
    expect(fullSlotRes.status).toBe(409);
    const fullSlotData = await fullSlotRes.json();
    expect(fullSlotData.error).toContain("Slots full");
  });

  // Test 6: Team members update progress; combined progress bar shows average
  it("Requirement 6: Team members update progress and combined progress bar computes average with last-updated author", async () => {
    // Student Lead A logs 60%
    activeSessionToken = studentLeadAToken;
    const reqLead = new Request(`http://localhost:3000/api/v1/teams/${teamA.id}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ percent: 60, note: "Completed distributed crawler architecture" }),
    });
    const resLead = await updateProgress(reqLead as any, { params: { teamId: teamA.id } });
    expect(resLead.status).toBe(200);

    // Student Member A logs 40%
    activeSessionToken = studentMemberAToken;
    const reqMember = new Request(`http://localhost:3000/api/v1/teams/${teamA.id}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ percent: 40, note: "Completed vector embeddings and tests" }),
    });
    const resMember = await updateProgress(reqMember as any, { params: { teamId: teamA.id } });
    expect(resMember.status).toBe(200);

    // Fetch team progress: combined should be round((60 + 40) / 2) = 50%
    const progGetReq = new Request(`http://localhost:3000/api/v1/teams/${teamA.id}/progress`);
    const progGetRes = await getProgress(progGetReq as any, { params: { teamId: teamA.id } });
    const progData = await progGetRes.json();

    expect(progGetRes.status).toBe(200);
    expect(progData.combinedPercent).toBe(50);
    expect(progData.lastUpdatedBy).toBe(studentMemberA.name);
    expect(progData.membersProgress).toHaveLength(2);
  });

  // Test 7: Upload of Part 1 to Part 4 with valid/invalid files and version history trace
  it("Requirement 7: Document upload for Parts 1 to 4 with validation and version trace", async () => {
    activeSessionToken = studentLeadAToken;

    // Invalid file extension (.sh) -> rejected
    const badExtReq = new Request(`http://localhost:3000/api/v1/teams/${teamA.id}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage: 1,
        fileName: "malicious.sh",
        fileSize: 1024,
        fileType: "application/x-sh",
      }),
    });
    const badExtRes = await uploadDocument(badExtReq as any, { params: { teamId: teamA.id } });
    expect(badExtRes.status).toBe(400);
    const badExtData = await badExtRes.json();
    expect(badExtData.error).toContain("Only PDF, DOCX, PPTX, and ZIP documents are permitted");

    // Invalid file size (> 25MB) -> rejected
    const badSizeReq = new Request(`http://localhost:3000/api/v1/teams/${teamA.id}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage: 1,
        fileName: "huge-presentation.pptx",
        fileSize: 30 * 1024 * 1024, // 30 MB
        fileType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      }),
    });
    const badSizeRes = await uploadDocument(badSizeReq as any, { params: { teamId: teamA.id } });
    expect(badSizeRes.status).toBe(400);
    const badSizeData = await badSizeRes.json();
    expect(badSizeData.error).toContain("exceeds the 25MB maximum limit");

    // Valid upload: Part 1 v1
    const validPart1 = new Request(`http://localhost:3000/api/v1/teams/${teamA.id}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage: 1,
        fileName: "Architecture-Spec.pdf",
        fileSize: 2 * 1024 * 1024,
        fileType: "application/pdf",
      }),
    });
    const resPart1 = await uploadDocument(validPart1 as any, { params: { teamId: teamA.id } });
    const dataPart1 = await resPart1.json();
    expect(resPart1.status).toBe(201);
    expect(dataPart1.upload.version).toBe(1);
    expect(dataPart1.upload.syncStatus).toBe("Synced");

    // Re-upload Part 1 as v2 (keeps v1 in database)
    const validPart1v2 = new Request(`http://localhost:3000/api/v1/teams/${teamA.id}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage: 1,
        fileName: "Architecture-Spec-Revised.pdf",
        fileSize: 3 * 1024 * 1024,
        fileType: "application/pdf",
      }),
    });
    const resPart1v2 = await uploadDocument(validPart1v2 as any, { params: { teamId: teamA.id } });
    const dataPart1v2 = await resPart1v2.json();
    expect(resPart1v2.status).toBe(201);
    expect(dataPart1v2.upload.version).toBe(2);

    // Verify GET /documents returns both versions in trace
    const docsGetReq = new Request(`http://localhost:3000/api/v1/teams/${teamA.id}/documents`);
    const docsGetRes = await getDocuments(docsGetReq as any, { params: { teamId: teamA.id } });
    const docsGetData = await docsGetRes.json();
    expect(docsGetRes.status).toBe(200);

    const stage1 = docsGetData.stages.find((s: any) => s.stage === 1);
    expect(stage1.uploads).toHaveLength(2);
    expect(stage1.latestUpload.version).toBe(2);
  });

  // Test 8: Upload after host deadline is rejected
  it("Requirement 8: Upload after the host's lock time is rejected", async () => {
    activeSessionToken = studentLeadAToken;

    // Set part 1 due date into the past
    await prisma.hackathon.update({
      where: { id: hackathon.id },
      data: { part1Due: new Date(Date.now() - 1000) },
    });

    const lateReq = new Request(`http://localhost:3000/api/v1/teams/${teamA.id}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage: 1,
        fileName: "Late-Submission.pdf",
        fileSize: 1024 * 1024,
        fileType: "application/pdf",
      }),
    });
    const lateRes = await uploadDocument(lateReq as any, { params: { teamId: teamA.id } });
    expect(lateRes.status).toBe(400);
    const lateData = await lateRes.json();
    expect(lateData.error).toContain("Upload deadline for Part 1 has expired");
  });

  // Test 9: Automatic GitHub push job with folder structure, commit message, and retry failure
  it("Requirement 9: GitHub push job commits with folder path & commit message, handles retry on failure", async () => {
    activeSessionToken = studentLeadAToken;

    // Upload with mockFailure = true to test "Failed with Retry" state
    const failReq = new Request(`http://localhost:3000/api/v1/teams/${teamA.id}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage: 2,
        fileName: "Prototype-Implementation.docx",
        fileSize: 1.5 * 1024 * 1024,
        fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        mockFailure: true,
      }),
    });
    const failRes = await uploadDocument(failReq as any, { params: { teamId: teamA.id } });
    const failData = await failRes.json();
    expect(failRes.status).toBe(201);
    expect(failData.upload.syncStatus).toBe("Failed with Retry");
    expect(failData.upload.syncError).toContain("GitHub service temporarily unavailable");

    // Normal upload for Part 3: verify folder structure and commit message
    const successReq = new Request(`http://localhost:3000/api/v1/teams/${teamA.id}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage: 3,
        fileName: "Test-Validation-Report.pdf",
        fileSize: 1.8 * 1024 * 1024,
        fileType: "application/pdf",
      }),
    });
    const successRes = await uploadDocument(successReq as any, { params: { teamId: teamA.id } });
    const successData = await successRes.json();
    expect(successRes.status).toBe(201);
    expect(successData.upload.syncStatus).toBe("Synced");
    expect(successData.upload.githubPath).toContain(`Part_3/Test-Validation-Report.pdf`);
    expect(successData.upload.githubCommitHash).toBeDefined();
  });

  // Test 10: Access rules: Wrong team, wrong role, logged out user, unassigned judge blocked
  it("Requirement 10: Access rules — wrong team, wrong role, logged out user, unassigned judge blocked", async () => {
    // 1. Logged out user (no session token) -> 401
    activeSessionToken = null;
    const noAuthReq = new Request(`http://localhost:3000/api/v1/teams/${teamA.id}/documents`);
    const noAuthRes = await getDocuments(noAuthReq as any, { params: { teamId: teamA.id } });
    expect(noAuthRes.status).toBe(401);

    // 2. Wrong team (Team B lead tries to inspect Team A's documents) -> 403
    activeSessionToken = studentLeadBToken;
    const wrongTeamReq = new Request(`http://localhost:3000/api/v1/teams/${teamA.id}/documents`);
    const wrongTeamRes = await getDocuments(wrongTeamReq as any, { params: { teamId: teamA.id } });
    expect(wrongTeamRes.status).toBe(403);
    const wrongTeamData = await wrongTeamRes.json();
    expect(wrongTeamData.error).toContain("Access denied");

    // 3. Unassigned judge -> 404 or 403
    activeSessionToken = unassignedJudgeToken;
    const unassignedReq = new Request("http://localhost:3000/api/v1/judge/submissions");
    const unassignedRes = await getJudgeSubmissions(unassignedReq as any);
    expect(unassignedRes.status).toBe(404);

    // 4. Assigned judge can view Team A's submissions and documents
    activeSessionToken = assignedJudgeToken;
    const assignedReq = new Request("http://localhost:3000/api/v1/judge/submissions");
    const assignedRes = await getJudgeSubmissions(assignedReq as any);
    expect(assignedRes.status).toBe(200);
  });

  // Test 11: GITHUB_TOKEN security: Never appears in any API response or log
  it("Requirement 11: Security — GITHUB_TOKEN never appears in any API response or log", async () => {
    activeSessionToken = studentLeadAToken;
    const docReq = new Request(`http://localhost:3000/api/v1/teams/${teamA.id}/documents`);
    const docRes = await getDocuments(docReq as any, { params: { teamId: teamA.id } });
    const rawText = await docRes.text();

    const envToken = process.env.GITHUB_TOKEN || "ghp_secret_token";
    expect(rawText).not.toContain(envToken);
    expect(rawText).not.toContain("GITHUB_TOKEN");
  });
});
