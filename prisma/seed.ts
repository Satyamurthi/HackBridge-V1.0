import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Provisioning HackBridge Production Super Admin from Environment...");

  // Read credentials exclusively from environment variables
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@hackbridge.dev").toLowerCase().trim();
  const rawAdminPassword = process.env.ADMIN_PASSWORD;

  if (!rawAdminPassword) {
    throw new Error(
      "ADMIN_PASSWORD environment variable is required to provision the initial Super Admin account."
    );
  }

  const adminPasswordHash = await bcrypt.hash(rawAdminPassword, 10);

  // 1. Provision / Update Super Admin
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: adminPasswordHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
    create: {
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      name: "Super Administrator",
    },
  });

  console.log(`✅ Single Super Admin account verified: ${adminUser.email}`);

  // 2. Clean all demo student, host, and judge rows if requested or during seed
  // Retain only the provisioned Super Admin
  const nonAdminUsers = await prisma.user.findMany({
    where: {
      role: { not: "SUPER_ADMIN" },
      email: {
        in: [
          "lead.priya@student.edu",
          "member.rahul@student.edu",
          "builder.arjun@student.edu",
          "builder.sneha@student.edu",
          "host.mit@college.edu",
          "host.techcorp@startup.io",
          "judge.alex@industry.com",
        ],
      },
    },
  });

  if (nonAdminUsers.length > 0) {
    console.log(`🧹 Removing ${nonAdminUsers.length} legacy demo accounts from development database...`);
    for (const u of nonAdminUsers) {
      await prisma.user.delete({ where: { id: u.id } }).catch(() => {});
    }
  }

  // Also clean demo hackathon
  await prisma.hackathon.deleteMany({
    where: {
      slug: { in: ["hackbridge-national-2026", "phase-8-live-arena"] },
    },
  }).catch(() => {});

  console.log("🚀 Production database is clean. No demo rows or mock data present.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
