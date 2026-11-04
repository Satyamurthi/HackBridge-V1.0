import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { generateHackathonId, generateTeamId, generateHostHackId } from "../src/lib/id-generator";

const prisma = new PrismaClient();

// CSV line parser handling quotes, commas, and trims
function parseCSV(text: string): Record<string, string>[] {
  const cleanText = text.replace(/^\uFEFF/, ""); // Remove UTF-8 BOM if present
  const lines = cleanText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse header
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === "," && !inQuotes) {
        result.push(cur.trim());
        cur = "";
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const rawHeaders = parseLine(lines[0]);
  const headers = rawHeaders.map((h) => h.replace(/^"+|"+$/g, "").trim());

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      const val = values[j] ? values[j].replace(/^"+|"+$/g, "").trim() : "";
      row[headers[j]] = val;
    }
    rows.push(row);
  }
  return rows;
}

const HACKMITTEN_RULES = `### IMPORTANT INSTRUCTIONS FOR PARTICIPANTS
**HACKMITTEN 3.0 — 24-HOUR NATIONAL HACKATHON**
*Organized by Department of CS&E and Department of CS&E (AI & ML)*
*In Collaboration with Vigyanlabs | 28–29 October 2026 | MIT Thandavapura, Mysuru*

Please carefully follow the instructions below:

#### 1. Reporting Time & Venue
- **Reporting Time**: Between 8:00 AM and 9:00 AM on 28 October 2026. Participants may arrive earlier.
- Report to the designated venue and follow the instructions given by the organizing committee.
- Event activities will take place in the Seminar Hall, Library, and MCA Lab. The specific location for each activity will be communicated by the organizers.
- HackMITTEN 3.0 is a 24-hour hackathon. The exact ending time will depend on the actual event start time and will be communicated by the organizers.
- Follow the official event schedule and announcements.

#### 2. First Round – Problem Understanding & Ideation
- The problem statement, along with its detailed description, will be provided at the beginning of the hackathon (Reveal at 10:00 AM).
- Each team must carefully read, analyse, and understand the problem statement before starting development.
- Teams must independently write their understanding, analysis, ideas, and proposed solution on the KG sheet provided by the organizers.
- **Device Restriction**: Mobile phones, laptops, and all other electronic devices must not be used during this round.
- **No AI / Digital Assistance**: The use of AI tools or any external digital assistance is strictly prohibited during this round.
- Complete this activity within the time allotted by the organizers.

#### 3. Team Participation
- Each team must consist of 3–4 members.
- Inter-branch and inter-college teams are allowed.
- All team members must belong to the same educational level. Diploma, UG, and PG students cannot be mixed within a team.
- Every member must actively contribute and understand the team's proposed solution.
- Maintain effective teamwork, communication, and coordination throughout the event.

#### 4. Development & Prototype
- Develop a practical and innovative solution based on the assigned problem statement.
- **Proof of Concept (PoC)**: Focus on the core features and aim to build a working prototype or Proof of Concept (PoC) within the available time.
- Test and refine your solution before the final demonstration.
- Bring your laptop, charger, necessary adapters, and other required personal accessories.
- Ensure your laptop is working properly and keep important files backed up.
- Follow any additional development-related instructions communicated by the organizers.

#### 5. Presentation & Demonstration
- Teams must present their solution and demonstrate their prototype to the jury.
- Be prepared to explain:
  1. Problem Understanding
  2. Proposed Solution
  3. Innovation & Uniqueness
  4. Technical Approach
  5. Prototype / Demo
  6. Impact, Benefits, Feasibility & Scalability
- All team members should understand the solution and be prepared to explain their contributions.
- Follow the presentation instructions and time limits announced by the organizers.

#### 6. Time Management & Submission
- Use the available 24 hours effectively.
- Plan your work from: Problem Analysis → Ideation (KG Sheet) → Development → Testing → Presentation.
- Divide responsibilities among team members and reserve time for testing and final preparation.
- Complete all required submissions within the deadline announced by the organizing committee.
- Follow the submission procedure communicated during the event.

#### 7. Rules, Discipline & Originality
- Follow all instructions given by the faculty coordinators and organizing committee.
- Projects must represent the team's own work. Plagiarism, unauthorized copying, and misrepresentation of project ownership are prohibited.
- Do not disturb or interfere with other teams.
- Treat participants, faculty, organizers, jury members, mentors, and guests respectfully.
- Use institutional facilities and equipment responsibly.
- Harassment, bullying, discrimination, unauthorized system access, and misuse of data are strictly prohibited.
- Follow venue safety instructions and report concerns to the organizing committee.
- Violations of event rules, academic integrity, or safety requirements may result in disciplinary action or disqualification.

#### 8. Food & Accommodation
- Food will be provided to all participants during the hackathon.
- Accommodation details are available on the official HackMITTEN 3.0 website. Participants should refer to the website for further information.
- Accommodation is intended for teams arriving before the event date or staying in advance. It is not available for teams arriving on the day of the event.
- Participants should plan their travel and arrival accordingly.

---
**ALL THE BEST!**
*HACKMITTEN 3.0 — Turning What If? Into Watch This.*
`;

// Domain problem statements definitions
const DOMAIN_DEFINITIONS = [
  {
    name: "AI Ops",
    description: "Intelligent systems for observability, autonomous incident response, log intelligence, and predictive workload optimization.",
    problems: [
      {
        title: "AIOPS-01: Autonomous Anomaly Detection & Incident Remediation in Multi-Cloud Microservices",
        description: "Build an observability engine that ingests distributed telemetry streams, detects latency anomalies in real-time using unsupervised models, and triggers automated rollback/mitigation pipelines without human intervention.",
        difficulty: "HARD",
      },
      {
        title: "AIOPS-02: Predictive Resource Autoscaling & Log Intelligence Engine",
        description: "Develop a proactive autoscaling system that forecasts traffic spikes 30 minutes in advance using transformer-based time-series forecasting, clustering high-cardinality logs to reduce cloud egress costs by 40%.",
        difficulty: "HARD",
      },
      {
        title: "AIOPS-03: LLM-Assisted Root Cause Analysis and Observability Co-pilot",
        description: "Create an on-premise LLM agent that synthesizes distributed traces, kernel metrics, and deployment diffs to produce actionable root-cause incident reports within 60 seconds of an outage.",
        difficulty: "MEDIUM",
      },
      {
        title: "AIOPS-04: Green Computing Intelligent Workload Orchestrator",
        description: "Design an AI scheduler that dynamically shifts batch workloads across server nodes based on thermal output, renewable energy availability, and cooling telemetry.",
        difficulty: "MEDIUM",
      },
      {
        title: "AIOPS-05: Automated CI/CD Canary Health Scoring and Regression Predictor",
        description: "Build a deployment telemetry evaluator that calculates canary health indices from synthetic probes and user session metrics, predicting subtle software regressions.",
        difficulty: "EASY",
      },
    ],
  },
  {
    name: "Cyber Security",
    description: "Zero trust architectures, threat intelligence correlation, cryptographic invariants, and automated vulnerability auditing.",
    problems: [
      {
        title: "CYBER-01: Zero Trust Network Access & Lateral Movement Detection",
        description: "Develop an agentless network monitor that analyzes encrypted VPC flow logs and identity tokens to detect unauthorized lateral traversal and credential dumping in enterprise enclaves.",
        difficulty: "HARD",
      },
      {
        title: "CYBER-02: Automated Software Supply Chain & CI/CD Vulnerability Attestation",
        description: "Implement a SLSA Level 3 compliant provenance verifier that scans npm/PyPI dependencies, detects malicious obfuscation, and generates verifiable cryptographic SBOMs before build execution.",
        difficulty: "MEDIUM",
      },
      {
        title: "CYBER-03: Smart API Gateway Threat Intelligence Correlator",
        description: "Construct a high-throughput WAF plugin that detects distributed credential stuffing and API parameter tampering using behavioral fingerprinting and dynamic rate-limiting.",
        difficulty: "EASY",
      },
    ],
  },
  {
    name: "Agriculture",
    description: "Precision agritech, computer vision plant pathology, smart irrigation, and transparent farm-to-table supply chains.",
    problems: [
      {
        title: "AGRI-01: Precision Irrigation & IoT Soil Nutrient Optimization Mesh",
        description: "Engineer an offline-first IoT mesh network that measures soil moisture, electrical conductivity, and microclimate data to deliver dynamic drip irrigation recommendations via SMS/voice in regional languages.",
        difficulty: "HARD",
      },
      {
        title: "AGRI-02: Edge AI Crop Pathology & Nutrient Deficiency Diagnostics",
        description: "Build a lightweight mobile computer vision model (under 15MB) that detects foliar diseases and pest infestations across 20+ staple crops directly on farmers' smartphones without cloud connectivity.",
        difficulty: "MEDIUM",
      },
      {
        title: "AGRI-03: Decentralized Farm-to-Market Price Forecasting & Produce Tracking",
        description: "Create an open digital marketplace aggregating APMC mandi prices with predictive yield analytics, eliminating intermediary arbitrage and guaranteeing verifiable payment settlements.",
        difficulty: "EASY",
      },
    ],
  },
  {
    name: "Health Care",
    description: "Privacy-preserving patient telemetry, automated clinical triage, federated analytics, and hospital workflow optimization.",
    problems: [
      {
        title: "HEALTH-01: Privacy-Preserving Federated Clinical Record Exchange & Disease Prediction",
        description: "Develop a HIPAA-compliant federated learning system allowing regional hospitals to train collaborative diagnostic models without centralizing sensitive patient EHR records.",
        difficulty: "HARD",
      },
      {
        title: "HEALTH-02: Continuous Remote ICU Telemetry & Early Sepsis Warning Engine",
        description: "Design an algorithmic bedside monitor that tracks vitals, arterial blood gas trends, and lactate levels to forecast clinical sepsis 4 hours before acute septic shock manifestation.",
        difficulty: "HARD",
      },
      {
        title: "HEALTH-03: AI Medical Imaging Triage Assistant for Rural Diagnostics",
        description: "Construct an edge-deployable DICOM analysis system that screens chest X-rays for pneumonia, tuberculosis, and pneumothorax, prioritizing urgent emergency cases in understaffed clinics.",
        difficulty: "MEDIUM",
      },
    ],
  },
  {
    name: "Cloud Computing",
    description: "Distributed systems, serverless disaster recovery, high-performance edge compute, and sovereign multi-cloud governance.",
    problems: [
      {
        title: "CLOUD-01: Multi-Cloud Serverless Disaster Recovery & Global Latency Optimizer",
        description: "Create an active-active global router that dynamically migrates stateless serverless executions between AWS, GCP, and local data centers during regional cloud outages in under 500ms.",
        difficulty: "HARD",
      },
      {
        title: "CLOUD-02: Distributed Edge AI Inferencing Mesh for Low-Power Devices",
        description: "Build a decentralized compute broker that partitions large ONNX neural networks across heterogeneous edge nodes (Raspberry Pis, smartphones) based on instantaneous thermal and bandwidth availability.",
        difficulty: "MEDIUM",
      },
      {
        title: "CLOUD-03: Automated Cloud FinOps Invariant & Egress Leakage Detector",
        description: "Develop an automated policy engine that tracks multi-tenant egress charges and orphaned cloud volumes in real time, auto-terminating unattached resources and enforcing strict budget quotas.",
        difficulty: "EASY",
      },
    ],
  },
  {
    name: "Enterprise ERP",
    description: "Next-generation ERP, intelligent demand forecasting, automated invoice reconciliation, and workforce allocation.",
    problems: [
      {
        title: "ERP-01: Autonomous 3-Way Invoice Matching & Fraud Prevention Pipeline",
        description: "Engineer an OCR and reconciliation engine that matches vendor purchase orders, warehouse goods received notes, and multi-currency tax invoices, detecting duplicate and fraudulent billing automatically.",
        difficulty: "HARD",
      },
      {
        title: "ERP-02: Smart Supply Chain Inventory Reorder & Lead-Time Predictor",
        description: "Build a probabilistic inventory optimizer that models global shipping disruptions, seasonal demand spikes, and supplier reliability to prevent stock-outs while minimizing holding warehouse costs.",
        difficulty: "MEDIUM",
      },
      {
        title: "ERP-03: Dynamic Enterprise Workforce Skill Matrix & Resource Allocation",
        description: "Develop an enterprise planning platform that matches incoming client deliverables with developer proficiencies, availability, and billing rates to assemble optimal engineering squads.",
        difficulty: "MEDIUM",
      },
      {
        title: "ERP-04: Real-time GST/VAT Audit Trail & Compliance Verification Gateway",
        description: "Implement a tamper-evident financial ledger that verifies tax computations, generates cryptographically signed e-invoices, and prepares instant filing audit summaries.",
        difficulty: "EASY",
      },
    ],
  },
  {
    name: "Banking",
    description: "High-velocity fraud detection, instant UPI risk scoring, verifiable credit underwriting, and anti-money laundering.",
    problems: [
      {
        title: "BANK-01: Real-Time Fraud Detection Engine for UPI & High-Velocity Digital Payments",
        description: "Design a sub-10ms transactional fraud scoring pipeline that evaluates device fingerprinting, geovelocity anomalies, and recipient risk scores during peak payment throughput of 10,000 TPS.",
        difficulty: "HARD",
      },
      {
        title: "BANK-02: Alternative Data Credit Underwriting & Cashflow Scoring for MSMEs",
        description: "Develop an objective credit evaluation model using GST returns, utility payment histories, and merchant UPI turnover to extend working capital loans to thin-file informal businesses.",
        difficulty: "MEDIUM",
      },
      {
        title: "BANK-03: Verifiable Anti-Money Laundering (AML) Transaction Graph Correlator",
        description: "Build a graph analytics engine that uncovers circular fund routing, smurfing structures, and mule account clusters across multi-bank transaction histories.",
        difficulty: "HARD",
      },
    ],
  },
];

async function seedHackmitten() {
  console.log("🚀 Starting HACKMITTEN 3.0 Provisioning & Student Ingestion...");

  // 1. Host Account
  const hostEmail = "hodaimlmitt@mitmysore.in";
  const hostPassword = "password123"; // also supports 12345678
  const hostPasswordHash = await bcrypt.hash("12345678", 10);
  const hostName = "MAHARAJA INSTITUTE OF TECHNOLOGY TANDAVAPURA";

  console.log(`👤 Upserting Host: ${hostEmail}...`);
  const hostUser = await prisma.user.upsert({
    where: { email: hostEmail },
    update: {
      name: hostName,
      passwordHash: hostPasswordHash,
      role: "HOST",
      status: "ACTIVE",
    },
    create: {
      email: hostEmail,
      name: hostName,
      passwordHash: hostPasswordHash,
      role: "HOST",
      status: "ACTIVE",
    },
  });

  const hostProfile = await prisma.hostProfile.upsert({
    where: { userId: hostUser.id },
    update: {
      orgName: hostName,
      type: "college",
      approvalStatus: "APPROVED",
      membershipStatus: "ACTIVE",
      upiId: "satyu@ptaxis",
      bankAccountName: "Maharaja Education Trust",
      city: "Mysuru",
      address: "MIT Thandavapura, Nanjangud Road, Mysuru, Karnataka 571302",
      website: "https://mitmysore.in",
    },
    create: {
      userId: hostUser.id,
      orgName: hostName,
      type: "college",
      approvalStatus: "APPROVED",
      membershipStatus: "ACTIVE",
      upiId: "satyu@ptaxis",
      hackId: generateHostHackId(),
      bankAccountName: "Maharaja Education Trust",
      city: "Mysuru",
      address: "MIT Thandavapura, Nanjangud Road, Mysuru, Karnataka 571302",
      website: "https://mitmysore.in",
    },
  });
  console.log(`✅ Host Profile configured: ${hostProfile.orgName} (ID: ${hostProfile.id})`);

  // 2. Hackathon Model
  const slug = "hackmitten-3-0";
  // Dates specified:
  // Registration: 1st of this month (2026-10-01) to 25th of this month (2026-10-25)
  // Start: Today 9:00 AM (2026-10-28 09:00 IST -> 03:30 UTC)
  // Reveal: Today 10:00 AM (2026-10-28 10:00 IST -> 04:30 UTC)
  // End: 24h later (2026-10-29 09:00 IST -> 03:30 UTC)
  const registrationStart = new Date("2026-10-01T00:00:00.000Z");
  const registrationDeadline = new Date("2026-10-25T23:59:59.000Z");
  const startAt = new Date("2026-10-28T03:30:00.000Z");
  const revealAt = new Date("2026-10-28T04:30:00.000Z");
  const endAt = new Date("2026-10-29T03:30:00.000Z");

  console.log(`🏆 Upserting Hackathon: HACKMITTEN 3.0 (${slug})...`);
  const hackathon = await prisma.hackathon.upsert({
    where: { slug },
    update: {
      title: "HACKMITTEN 3.0",
      description: "HACKMITTEN 3.0 — 24-HOUR NATIONAL HACKATHON organized by Department of CS&E and Department of CS&E (AI & ML), Maharaja Institute of Technology Thandavapura in Collaboration with Vigyanlabs | 28–29 October 2026 | MIT Thandavapura, Mysuru.",
      rules: HACKMITTEN_RULES,
      rulesGate: true,
      fee: 400.0,
      paymentMode: "UPI",
      upiId: "satyu@ptaxis",
      teamMin: 3,
      teamMax: 4,
      registrationDeadline,
      startAt,
      endAt,
      status: "PUBLISHED",
      prizePool: "₹1,00,000+ & Industry Sponsorships",
      hostId: hostProfile.id,
    },
    create: {
      title: "HACKMITTEN 3.0",
      slug,
      description: "HACKMITTEN 3.0 — 24-HOUR NATIONAL HACKATHON organized by Department of CS&E and Department of CS&E (AI & ML), Maharaja Institute of Technology Thandavapura in Collaboration with Vigyanlabs | 28–29 October 2026 | MIT Thandavapura, Mysuru.",
      rules: HACKMITTEN_RULES,
      rulesGate: true,
      fee: 400.0,
      paymentMode: "UPI",
      upiId: "satyu@ptaxis",
      teamMin: 3,
      teamMax: 4,
      registrationDeadline,
      startAt,
      endAt,
      status: "PUBLISHED",
      prizePool: "₹1,00,000+ & Industry Sponsorships",
      hostId: hostProfile.id,
    },
  });
  console.log(`✅ Hackathon created: ${hackathon.title} (ID: ${hackathon.id})`);

  // 3. Create or Match Domains & Problem Statements
  const domainMap = new Map<string, any>();

  for (const def of DOMAIN_DEFINITIONS) {
    let domain = await prisma.domain.findFirst({
      where: {
        hackathonId: hackathon.id,
        name: def.name,
      },
    });

    if (!domain) {
      domain = await prisma.domain.create({
        data: {
          hackathonId: hackathon.id,
          name: def.name,
          description: def.description,
          revealAt: revealAt,
        },
      });
    } else {
      domain = await prisma.domain.update({
        where: { id: domain.id },
        data: {
          revealAt: revealAt,
          description: def.description,
        },
      });
    }

    domainMap.set(def.name, domain);

    // Calculate slots cap based on registered teams in CSV
    // AI Ops: 43 teams / 5 = 9 cap
    // Agriculture: 13 / 3 = 5 cap
    // Banking: 8 / 3 = 3 cap
    // Cloud: 11 / 3 = 4 cap
    // Cyber: 13 / 3 = 5 cap
    // ERP: 19 / 4 = 5 cap
    // Health: 9 / 3 = 3 cap
    for (const p of def.problems) {
      const existingPs = await prisma.problemStatement.findFirst({
        where: {
          domainId: domain.id,
          title: p.title,
        },
      });

      const statementCap = def.name === "AI Ops" ? 10 : 6;

      if (!existingPs) {
        await prisma.problemStatement.create({
          data: {
            domainId: domain.id,
            title: p.title,
            description: p.description,
            difficulty: p.difficulty,
            cap: statementCap,
          },
        });
      }
    }
    console.log(`  📁 Domain configured: ${def.name} with ${def.problems.length} statements`);
  }

  // 4. Ingest Registrations CSV
  const csvPath = path.resolve(process.cwd(), "hackmitten-registrations-2026-10-27.csv");
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found at ${csvPath}`);
  }

  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const rows = parseCSV(csvContent);
  console.log(`\n📋 Parsing ${rows.length} team registrations from CSV...`);

  const studentDefaultPasswordHash = await bcrypt.hash("Welcome@123", 10);
  let teamsCreatedCount = 0;
  let studentsCreatedCount = 0;

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const teamName = row["teamName"]?.trim() || `Squad-${idx + 1}`;
    const domainName = row["domain"]?.trim();
    const college = row["college"]?.trim() || "Engineering College";
    const transactionId = row["transactionId"]?.trim() || `UTR-${Date.now()}-${idx}`;
    const memberCount = parseInt(row["memberCount"] || "4", 10);

    const targetDomain = domainMap.get(domainName);
    if (!targetDomain) {
      console.warn(`  ⚠️ Unknown domain "${domainName}" for team "${teamName}". Skipping.`);
      continue;
    }

    // Process Members (1 to 4)
    const teamMembersToLink: { studentId: string; role: "LEAD" | "MEMBER" }[] = [];
    let leadStudentProfileId = "";

    for (let m = 1; m <= Math.min(memberCount, 4); m++) {
      const email = row[`member${m}_email`]?.trim().toLowerCase();
      const name = row[`member${m}_name`]?.trim();
      const phone = row[`member${m}_phone`]?.trim();
      const memCollege = row[`member${m}_college`]?.trim() || college;
      const memDegree = row[`member${m}_degree`]?.trim() || row["degree"] || "B.E. / B.Tech";

      if (!email || !name) continue;

      // Upsert User
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name,
            phone: phone || null,
            passwordHash: studentDefaultPasswordHash,
            role: "STUDENT",
            status: "ACTIVE",
          },
        });
        studentsCreatedCount++;
      }

      // Upsert StudentProfile
      let profile = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
      if (!profile) {
        let uniqueHackathonId = generateHackathonId();
        // Ensure collision resistance
        while (await prisma.studentProfile.findUnique({ where: { hackathonId: uniqueHackathonId } })) {
          uniqueHackathonId = generateHackathonId();
        }

        profile = await prisma.studentProfile.create({
          data: {
            userId: user.id,
            hackathonId: uniqueHackathonId,
            college: memCollege,
            skills: `${domainName}, Engineering, Problem Solving`,
          },
        });
      }

      if (m === 1) {
        leadStudentProfileId = profile.id;
        teamMembersToLink.push({ studentId: profile.id, role: "LEAD" });
      } else {
        teamMembersToLink.push({ studentId: profile.id, role: "MEMBER" });
      }
    }

    if (!leadStudentProfileId) {
      console.warn(`  ⚠️ Team "${teamName}" has no valid team lead. Skipping.`);
      continue;
    }

    // Check if team already registered for this hackathon
    const existingTeam = await prisma.team.findFirst({
      where: {
        hackathonId: hackathon.id,
        name: teamName,
      },
    });

    if (!existingTeam) {
      let uniqueTeamId = generateTeamId();
      while (await prisma.team.findUnique({ where: { teamId: uniqueTeamId } })) {
        uniqueTeamId = generateTeamId();
      }

      const team = await prisma.team.create({
        data: {
          teamId: uniqueTeamId,
          hackathonId: hackathon.id,
          leadStudentId: leadStudentProfileId,
          domainId: targetDomain.id,
          name: teamName,
          status: "ACTIVE",
        },
      });

      // Link members
      for (const tm of teamMembersToLink) {
        await prisma.teamMember.create({
          data: {
            teamId: team.id,
            studentId: tm.studentId,
            role: tm.role,
          },
        });
      }

      // Create verified payment
      await prisma.payment.create({
        data: {
          teamId: team.id,
          amount: 400.0,
          status: "VERIFIED",
          mode: "QR",
          txnRef: transactionId,
          verifiedAt: new Date(),
        },
      });

      teamsCreatedCount++;
      if (teamsCreatedCount % 20 === 0 || teamsCreatedCount === rows.length) {
        console.log(`  ⚡ Ingested ${teamsCreatedCount}/${rows.length} squads...`);
      }
    }
  }

  // 5. Add Judges from Vigyanlabs and MIT Thandavapura
  console.log("\n⚖️ Provisioning Judges for HACKMITTEN 3.0...");
  const judgesData = [
    {
      name: "Dr. Murali Ambati",
      email: "judge.murali@vigyanlabs.com",
      company: "Vigyanlabs Innovations",
      designation: "Chief Technology Architect",
    },
    {
      name: "Prof. S. R. Bharadwaj",
      email: "judge.bharadwaj@mitmysore.in",
      company: "Maharaja Institute of Technology",
      designation: "Professor & Head, Computer Science & Engineering",
    },
    {
      name: "Ananya Deshmukh",
      email: "judge.ananya@cybersecurity.in",
      company: "National Threat Intelligence Enclave",
      designation: "Senior Principal Security Auditor",
    },
  ];

  for (const jd of judgesData) {
    let judgeUser = await prisma.user.findUnique({ where: { email: jd.email } });
    if (!judgeUser) {
      judgeUser = await prisma.user.create({
        data: {
          email: jd.email,
          name: jd.name,
          passwordHash: studentDefaultPasswordHash,
          role: "JUDGE",
          status: "ACTIVE",
        },
      });
    }

    const existingJudgeProfile = await prisma.judgeProfile.findUnique({
      where: {
        userId_hackathonId: {
          userId: judgeUser.id,
          hackathonId: hackathon.id,
        },
      },
    });

    if (!existingJudgeProfile) {
      await prisma.judgeProfile.create({
        data: {
          userId: judgeUser.id,
          hackathonId: hackathon.id,
          approvalStatus: "APPROVED",
          company: jd.company,
          designation: jd.designation,
        },
      });
    }
  }
  console.log(`✅ ${judgesData.length} Evaluators / Judges bound to HACKMITTEN 3.0`);

  console.log("\n=======================================================");
  console.log("🎉 HACKMITTEN 3.0 INGESTION COMPLETE!");
  console.log(`• Hackathon Title: ${hackathon.title}`);
  console.log(`• Host Account: ${hostEmail} (Password: 12345678)`);
  console.log(`• Total Domains: ${domainMap.size}`);
  console.log(`• Total Squads Ingested: ${teamsCreatedCount}`);
  console.log(`• Total Student Accounts: ${studentsCreatedCount}`);
  console.log(`• UPI ID: satyu@ptaxis (Payment Status: VERIFIED)`);
  console.log(`• Rules Gate: Enabled (${HACKMITTEN_RULES.length} chars)`);
  console.log("=======================================================\n");
}

seedHackmitten()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
