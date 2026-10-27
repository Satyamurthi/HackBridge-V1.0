import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting HackBridge Seed Data Insertion...");

  // 1. Password Hashes
  const defaultPassword = await bcrypt.hash("Password@123", 10);
  const adminPassword = await bcrypt.hash("Admin@123", 10);

  // 2. Super Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@hackbridge.dev" },
    update: {},
    create: {
      email: "admin@hackbridge.dev",
      passwordHash: adminPassword,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      name: "HackBridge Super Admin",
      phone: "+91 9876543210",
    },
  });
  console.log("✅ Super Admin created:", adminUser.email);

  // 3. Approved Host (MIT Tech Chapter)
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
  console.log("✅ Approved Host created:", approvedHostUser.email);

  // 4. Pending Host (TechCorp Ventures)
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
  console.log("✅ Pending Host created:", pendingHostUser.email);

  // 5. Create Demo Hackathon published by Approved Host
  const demoHackathon = await prisma.hackathon.upsert({
    where: { slug: "hackbridge-national-2026" },
    update: { teamMin: 2, teamMax: 4 },
    create: {
      hostId: approvedHostUser.hostProfile!.id,
      title: "HackBridge National Grand Arena 2026",
      slug: "hackbridge-national-2026",
      description: "India's premier collegiate hackathon uniting 5,000 top builders, engineers, and researchers to solve mission-critical challenges in AI, Systems, and Climate Tech.",
      rules: "1. Teams must consist of 2 to 4 verified students.\n2. All code written must be pushed to the designated Team GitHub repository.\n3. Problem statements are revealed simultaneously at the designated countdown time.\n4. Decisions of the judging panel are final.",
      rulesGate: true,
      teamMin: 2,
      teamMax: 4,
      fee: 299.0, // INR
      paymentMode: "QR", // Demo QR mode
      upiId: "hackbridge@upi",
      qrImageUrl: "https://images.unsplash.com/photo-1595079672139-545c0255d140?auto=format&fit=crop&w=500&q=80",
      status: "PUBLISHED",
      bannerUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
      prizePool: "₹5,00,000",
      startAt: new Date(Date.now() - 3600000), // Started 1 hour ago for live testing
      endAt: new Date(Date.now() + 86400000 * 2), // Ends in 2 days
      domains: {
        create: [
          {
            name: "AI & Distributed Systems",
            description: "Scalable inference, autonomous agents, and fault-tolerant infrastructure.",
            revealAt: new Date(Date.now() - 1800000), // Revealed 30 mins ago
            problemStatements: {
              create: [
                {
                  title: "High-Throughput Vector Consensus Engine",
                  description: "Build an ultra-low latency distributed consensus engine capable of indexing 100k vector embeddings per second across edge nodes.",
                  cap: 10,
                },
                {
                  title: "Autonomous Agentic Code Security Auditor",
                  description: "Develop a proactive vulnerability auditing bot that scans Pull Requests for OWASP Top 10 zero-days and generates verified regression patches.",
                  cap: 10,
                },
              ],
            },
          },
          {
            name: "Climate & Energy Grid",
            description: "Predictive energy microgrids and carbon verification systems.",
            revealAt: new Date(Date.now() + 7200000), // Reveals in 2 hours
            problemStatements: {
              create: [
                {
                  title: "Predictive Renewable Load Balancer",
                  description: "Optimize real-time renewable solar and wind storage dispatching using historical weather telemetry.",
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
  console.log("✅ Demo Hackathon created:", demoHackathon.title);

  // 6. Approved Judge User
  const judgeUser = await prisma.user.upsert({
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
  console.log("✅ Approved Judge created:", judgeUser.email);

  // 7. Student Lead User (with permanent Hackathon ID)
  const studentLead = await prisma.user.upsert({
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
  console.log("✅ Student Lead created:", studentLead.email, "Hackathon ID: HB-102938");

  // 8. Student Member User (with permanent Hackathon ID)
  const studentMember = await prisma.user.upsert({
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
  console.log("✅ Student Member created:", studentMember.email, "Hackathon ID: HB-492019");

  // 9. Additional Test Students for Squad Formation Testing
  const studentArjun = await prisma.user.upsert({
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
          bio: "Systems programmer and Rust developer.",
          skills: "Rust, WebAssembly, Go, Distributed Systems",
        },
      },
    },
    include: { studentProfile: true },
  });
  console.log("✅ Test Student created: builder.arjun@student.edu, Hackathon ID: HB-304918");

  const studentSneha = await prisma.user.upsert({
    where: { email: "builder.sneha@student.edu" },
    update: {},
    create: {
      email: "builder.sneha@student.edu",
      passwordHash: defaultPassword,
      role: "STUDENT",
      status: "ACTIVE",
      name: "Sneha Patel",
      phone: "+91 9443322110",
      studentProfile: {
        create: {
          hackathonId: "HB-581920",
          college: "IIT Delhi",
          githubUsername: "sneha-cloud",
          bio: "Cloud infrastructure and distributed computing engineer.",
          skills: "Kubernetes, Terraform, AWS, TypeScript",
        },
      },
    },
    include: { studentProfile: true },
  });
  console.log("✅ Test Student created: builder.sneha@student.edu, Hackathon ID: HB-581920");

  const studentRohan = await prisma.user.upsert({
    where: { email: "builder.rohan@student.edu" },
    update: {},
    create: {
      email: "builder.rohan@student.edu",
      passwordHash: defaultPassword,
      role: "STUDENT",
      status: "ACTIVE",
      name: "Rohan Deshmukh",
      phone: "+91 9332211009",
      studentProfile: {
        create: {
          hackathonId: "HB-772910",
          college: "NIT Trichy",
          githubUsername: "rohan-sec",
          bio: "Smart contract auditor and backend developer.",
          skills: "Solidity, Node.js, PostgreSQL, Security Auditing",
        },
      },
    },
    include: { studentProfile: true },
  });
  console.log("✅ Test Student created: builder.rohan@student.edu, Hackathon ID: HB-772910");

  // 10. Student already in another active hackathon (for Invariant Rule 1 Testing)
  const busyStudent = await prisma.user.upsert({
    where: { email: "busy.kabir@student.edu" },
    update: {},
    create: {
      email: "busy.kabir@student.edu",
      passwordHash: defaultPassword,
      role: "STUDENT",
      status: "ACTIVE",
      name: "Kabir Sharma",
      phone: "+91 9221100998",
      studentProfile: {
        create: {
          hackathonId: "HB-999111",
          college: "IIIT Bangalore",
          githubUsername: "kabir-ai",
          bio: "AI research and computer vision.",
          skills: "PyTorch, CUDA, Python",
        },
      },
    },
    include: { studentProfile: true },
  });

  // Second active hackathon where Kabir is already registered
  const concurrentHackathon = await prisma.hackathon.upsert({
    where: { slug: "ai-systems-grand-prix-2026" },
    update: {},
    create: {
      hostId: approvedHostUser.hostProfile!.id,
      title: "AI Systems Grand Prix 2026",
      slug: "ai-systems-grand-prix-2026",
      description: "Concurrent national arena for autonomous agents.",
      rules: "Standard fair play rules.",
      rulesGate: false,
      teamMin: 1,
      teamMax: 4,
      fee: 0,
      paymentMode: "FREE",
      status: "PUBLISHED",
      startAt: new Date(Date.now() - 3600000),
      endAt: new Date(Date.now() + 86400000 * 3),
    },
  });

  // Create team in concurrent hackathon with Kabir as active member
  const existingTeam = await prisma.team.findFirst({
    where: { hackathonId: concurrentHackathon.id, name: "Autonomous Core" },
  });
  if (!existingTeam) {
    const kabirTeam = await prisma.team.create({
      data: {
        hackathonId: concurrentHackathon.id,
        leadStudentId: busyStudent.studentProfile!.id,
        name: "Autonomous Core",
        status: "ACTIVE",
        teamId: "TEAM-KABIR1",
      },
    });
    await prisma.teamMember.create({
      data: {
        teamId: kabirTeam.id,
        studentId: busyStudent.studentProfile!.id,
        role: "LEAD",
      },
    });
    await prisma.payment.create({
      data: {
        teamId: kabirTeam.id,
        mode: "FREE",
        amount: 0,
        status: "VERIFIED",
        verifiedAt: new Date(),
      },
    });
  }
  console.log("✅ Busy Student created in concurrent hackathon: busy.kabir@student.edu, Hackathon ID: HB-999111");

  // 11. Initial Site Content CMS Blocks
  await prisma.siteContent.upsert({
    where: { key: "landing_hero" },
    update: {},
    create: {
      key: "landing_hero",
      jsonValue: JSON.stringify({
        headline: "Where Next-Gen Builders Bridge Into Tomorrow",
        subheadline: "The unified competitive hackathon platform powering high-velocity collegiate developers, automated team allocations, real-time code verification, and fair judging.",
        bannerTag: "V1.0 PRODUCTION READY · LIVE ARENA",
      }),
      version: 1,
      published: true,
    },
  });
  console.log("✅ Default CMS blocks created");

  console.log("🎉 HackBridge Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
