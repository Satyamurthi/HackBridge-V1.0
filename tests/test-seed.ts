import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

export async function seedTestFixtures(prisma: PrismaClient) {
  const defaultPassword = await bcrypt.hash("Password@123", 10);
  const adminPassword = await bcrypt.hash("Admin@123", 10);

  // 1. Super Admin
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@hackbridge.dev" },
    update: { passwordHash: adminPassword },
    create: {
      email: "admin@hackbridge.dev",
      passwordHash: adminPassword,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      name: "HackBridge Super Admin",
      phone: "+91 9876543210",
    },
  });

  // 2. Approved Host
  const approvedHostUser = await prisma.user.upsert({
    where: { email: "host.mit@college.edu" },
    update: {},
    create: {
      email: "host.mit@college.edu",
      passwordHash: defaultPassword,
      role: "HOST",
      status: "ACTIVE",
      name: "Dr. Vikram Seth",
      phone: "+91 9811223344",
      hostProfile: {
        create: {
          orgName: "MIT Tech Chapter & Innovation Center",
          type: "college",
          approvalStatus: "APPROVED",
          website: "https://mit.edu/innovation",
          bio: "Autonomous engineering institution advancing hackathons and deep tech research.",
        },
      },
    },
    include: { hostProfile: true },
  });

  // 3. Pending Host
  const pendingHostUser = await prisma.user.upsert({
    where: { email: "host.techcorp@startup.io" },
    update: {},
    create: {
      email: "host.techcorp@startup.io",
      passwordHash: defaultPassword,
      role: "HOST",
      status: "PENDING",
      name: "Rohit Sharma",
      phone: "+91 9822334455",
      hostProfile: {
        create: {
          orgName: "TechCorp Global Ventures",
          type: "company",
          approvalStatus: "PENDING",
          website: "https://techcorp.io",
          bio: "Enterprise SaaS incubation hub.",
        },
      },
    },
    include: { hostProfile: true },
  });

  // 4. Test Hackathon
  const demoHackathon = await prisma.hackathon.upsert({
    where: { slug: "hackbridge-national-2026" },
    update: {
      teamMin: 2,
      teamMax: 4,
      startAt: new Date(Date.now() - 3600000),
      endAt: new Date(Date.now() + 86400000 * 2),
    },
    create: {
      hostId: approvedHostUser.hostProfile!.id,
      title: "HackBridge National Grand Arena 2026",
      slug: "hackbridge-national-2026",
      description: "Premier collegiate hackathon for testing.",
      rules: "1. Teams of 2 to 4 students.",
      rulesGate: true,
      teamMin: 2,
      teamMax: 4,
      fee: 299.0,
      paymentMode: "QR",
      upiId: "hackbridge@upi",
      status: "PUBLISHED",
      prizePool: "₹5,00,000",
      startAt: new Date(Date.now() - 3600000),
      endAt: new Date(Date.now() + 86400000 * 2),
      domains: {
        create: [
          {
            name: "AI & Distributed Systems",
            description: "Scalable inference and infrastructure.",
            revealAt: new Date(Date.now() - 1800000),
            problemStatements: {
              create: [
                {
                  title: "High-Throughput Vector Consensus Engine",
                  description: "Distributed consensus engine for vector embeddings.",
                  cap: 10,
                },
              ],
            },
          },
          {
            name: "Climate & Energy Grid",
            description: "Predictive energy microgrids.",
            revealAt: new Date(Date.now() + 7200000),
            problemStatements: {
              create: [
                {
                  title: "Predictive Renewable Load Balancer",
                  description: "Optimize renewable energy dispatching.",
                  cap: 10,
                },
              ],
            },
          },
        ],
      },
      rubricCriteria: {
        create: [
          { name: "Technical Depth & Complexity", weight: 0.35, maxScore: 10 },
          { name: "Innovation & Problem Solving", weight: 0.30, maxScore: 10 },
          { name: "UI/UX & Polish", weight: 0.20, maxScore: 10 },
          { name: "Feasibility & Production Readiness", weight: 0.15, maxScore: 10 },
        ],
      },
    },
  });

  // 5. Judge User
  await prisma.user.upsert({
    where: { email: "judge.alex@industry.com" },
    update: {},
    create: {
      email: "judge.alex@industry.com",
      passwordHash: defaultPassword,
      role: "JUDGE",
      status: "ACTIVE",
      name: "Alex Rivera",
      phone: "+91 9988776655",
      judgeProfiles: {
        create: {
          hackathonId: demoHackathon.id,
          approvalStatus: "APPROVED",
          designation: "Principal Cloud Architect",
          company: "CloudScale Systems",
        },
      },
    },
  });

  // Clean previous team memberships for pristine state
  await prisma.teamMember.deleteMany({
    where: {
      student: {
        hackathonId: { in: ["HB-102938", "HB-492019", "HB-304918", "HB-819203"] },
      },
    },
  });
  await prisma.team.deleteMany({
    where: {
      name: { in: ["Test Squad Alpha", "Team Quantum", "Team Cyber", "Squad Omega"] },
    },
  });

  // 6. Student Lead
  await prisma.user.upsert({
    where: { email: "lead.priya@student.edu" },
    update: {},
    create: {
      email: "lead.priya@student.edu",
      passwordHash: defaultPassword,
      role: "STUDENT",
      status: "ACTIVE",
      name: "Priya Sundaram",
      phone: "+91 9776655443",
      studentProfile: {
        create: {
          hackathonId: "HB-102938",
          college: "Indian Institute of Information Technology",
          githubUsername: "priya-dev",
          bio: "Full-stack distributed systems enthusiast.",
          skills: "TypeScript, Go, React, Docker, Rust",
        },
      },
    },
    include: { studentProfile: true },
  });

  // 7. Student Member
  await prisma.user.upsert({
    where: { email: "member.rahul@student.edu" },
    update: {},
    create: {
      email: "member.rahul@student.edu",
      passwordHash: defaultPassword,
      role: "STUDENT",
      status: "ACTIVE",
      name: "Rahul Verma",
      phone: "+91 9665544332",
      studentProfile: {
        create: {
          hackathonId: "HB-492019",
          college: "Indian Institute of Information Technology",
          githubUsername: "rahul-ml",
          bio: "Machine learning research fellow.",
          skills: "Python, PyTorch, Next.js, Tailwind",
        },
      },
    },
    include: { studentProfile: true },
  });

  // 8. Additional Test Students
  await prisma.user.upsert({
    where: { email: "builder.arjun@student.edu" },
    update: {},
    create: {
      email: "builder.arjun@student.edu",
      passwordHash: defaultPassword,
      role: "STUDENT",
      status: "ACTIVE",
      name: "Arjun Mehta",
      phone: "+91 9554433221",
      studentProfile: {
        create: {
          hackathonId: "HB-304918",
          college: "BITS Pilani",
          githubUsername: "arjun-rust",
          skills: "Rust, WebAssembly",
        },
      },
    },
    include: { studentProfile: true },
  });

  await prisma.user.upsert({
    where: { email: "builder.sneha@student.edu" },
    update: {},
    create: {
      email: "builder.sneha@student.edu",
      passwordHash: defaultPassword,
      role: "STUDENT",
      status: "ACTIVE",
      name: "Sneha Kapoor",
      phone: "+91 9443322110",
      studentProfile: {
        create: {
          hackathonId: "HB-819203",
          college: "Delhi Technological University",
          githubUsername: "sneha-frontend",
          skills: "Next.js, Three.js",
        },
      },
    },
    include: { studentProfile: true },
  });
}
