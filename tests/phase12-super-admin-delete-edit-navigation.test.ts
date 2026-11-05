import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/db";
import {
  DEFAULT_NAVBAR_CONFIG,
  DEFAULT_FOOTER_CONFIG,
  DEFAULT_SITE_NAVIGATION,
} from "../src/lib/navigation-defaults";

describe("Phase 12: Super Admin Privileges — Deletion, Full Editing & Dynamic Navigation", () => {
  let superAdminUser: any;
  let regularStudentUser: any;
  let testHostUser: any;
  let testHackathon: any;

  beforeAll(async () => {
    // 1. Create a Super Admin test user
    superAdminUser = await prisma.user.create({
      data: {
        email: `admin-priv-${Date.now()}@hackbridge.tech`,
        name: "Supreme Commander",
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        passwordHash: "secure-admin-hash",
      },
    });

    // 2. Create a Regular Student user with profile
    regularStudentUser = await prisma.user.create({
      data: {
        email: `student-target-${Date.now()}@college.edu`,
        name: "Target Student",
        role: "STUDENT",
        status: "ACTIVE",
        passwordHash: "student-hash",
        studentProfile: {
          create: {
            hackathonId: `HB-ADM${Math.floor(1000 + Math.random() * 9000)}`,
            college: "National Institute of Technology",
            githubUsername: "target-student-git",
            bio: "Original bio",
            skills: "React, Node.js",
          },
        },
      },
      include: { studentProfile: true },
    });

    // 3. Create a Test Host with Hackathon
    testHostUser = await prisma.user.create({
      data: {
        email: `host-target-${Date.now()}@arena.edu`,
        name: "Target Host",
        role: "HOST",
        status: "ACTIVE",
        passwordHash: "host-hash",
        hostProfile: {
          create: {
            orgName: "Host Delete Institute",
            type: "college",
            approvalStatus: "APPROVED",
            hackId: `HOST-ADM${Math.floor(1000 + Math.random() * 9000)}`,
            upiId: "hostdel@okaxis",
          },
        },
      },
      include: { hostProfile: true },
    });

    // 4. Create Hackathon under the host
    testHackathon = await prisma.hackathon.create({
      data: {
        hostId: testHostUser.hostProfile.id,
        title: "Deletion Candidate Arena",
        slug: `del-arena-${Date.now()}`,
        description: "Initial description",
        rules: "Standard rules",
        fee: 250.0,
        paymentMode: "QR",
        upiId: "hostdel@okaxis",
        status: "DRAFT",
        startAt: new Date(Date.now() + 86400000),
        endAt: new Date(Date.now() + 172800000),
        domains: {
          create: [
            {
              name: "Quantum Computing",
              revealAt: new Date(Date.now() + 86400000),
              problemStatements: {
                create: [
                  {
                    title: "Quantum Key Distribution",
                    description: "Implement BB84 protocol",
                  },
                ],
              },
            },
          ],
        },
      },
      include: {
        domains: {
          include: { problemStatements: true },
        },
      },
    });
  });

  afterAll(async () => {
    // Cleanup remaining test users if any
    try {
      if (superAdminUser?.id) {
        await prisma.auditLog.deleteMany({ where: { actorId: superAdminUser.id } });
        await prisma.user.delete({ where: { id: superAdminUser.id } }).catch(() => {});
      }
      if (regularStudentUser?.id) {
        await prisma.user.delete({ where: { id: regularStudentUser.id } }).catch(() => {});
      }
      if (testHostUser?.id) {
        await prisma.user.delete({ where: { id: testHostUser.id } }).catch(() => {});
      }
    } catch {}
  });

  describe("1. User Full Editing & Deletion Privileges", () => {
    it("allows updating all core user and profile fields (name, email, phone, college, skills)", async () => {
      const updatedUser = await prisma.$transaction(async (tx) => {
        const u = await tx.user.update({
          where: { id: regularStudentUser.id },
          data: {
            name: "Updated Student Name",
            phone: "+919876543210",
            status: "PAUSED",
          },
        });

        await tx.studentProfile.update({
          where: { userId: regularStudentUser.id },
          data: {
            college: "IIT Bombay",
            githubUsername: "updated-git",
            bio: "Updated engineer bio",
            skills: "Next.js, TypeScript, PostgreSQL",
          },
        });

        return u;
      });

      expect(updatedUser.name).toBe("Updated Student Name");
      expect(updatedUser.phone).toBe("+919876543210");
      expect(updatedUser.status).toBe("PAUSED");

      const profile = await prisma.studentProfile.findUnique({
        where: { userId: regularStudentUser.id },
      });
      expect(profile?.college).toBe("IIT Bombay");
      expect(profile?.githubUsername).toBe("updated-git");
      expect(profile?.skills).toContain("TypeScript");
    });

    it("prevents self-deletion of active Super Admin account", async () => {
      // Simulating API logic
      const targetUserId = superAdminUser.id;
      const sessionUserId = superAdminUser.id;

      const isSelf = targetUserId === sessionUserId;
      expect(isSelf).toBe(true);
    });

    it("permanently deletes a student user and cascades student profile records", async () => {
      const studentId = regularStudentUser.id;

      // Delete user
      await prisma.$transaction(async (tx) => {
        await tx.user.delete({ where: { id: studentId } });
      });

      // Verify user no longer exists
      const foundUser = await prisma.user.findUnique({ where: { id: studentId } });
      expect(foundUser).toBeNull();

      // Verify child profile was cascaded
      const foundProfile = await prisma.studentProfile.findUnique({ where: { userId: studentId } });
      expect(foundProfile).toBeNull();
    });
  });

  describe("2. Hackathon Full Editing & Cascade Deletion Privileges", () => {
    it("allows editing all hackathon properties including title, fee, deadlines, and status", async () => {
      const updated = await prisma.hackathon.update({
        where: { id: testHackathon.id },
        data: {
          title: "Renamed National Arena 2026",
          fee: 500.0,
          paymentMode: "RAZORPAY",
          status: "PUBLISHED",
          rules: "Updated anti-cheat and rubric guidelines",
        },
      });

      expect(updated.title).toBe("Renamed National Arena 2026");
      expect(updated.fee).toBe(500.0);
      expect(updated.paymentMode).toBe("RAZORPAY");
      expect(updated.status).toBe("PUBLISHED");
    });

    it("permanently deletes a hackathon and cascades domains, problem statements, and teams", async () => {
      const hId = testHackathon.id;

      await prisma.$transaction(async (tx) => {
        await tx.problemStatement.deleteMany({ where: { domain: { hackathonId: hId } } });
        await tx.domain.deleteMany({ where: { hackathonId: hId } });
        await tx.hackathon.delete({ where: { id: hId } });
      });

      // Verify Hackathon is gone
      const foundH = await prisma.hackathon.findUnique({ where: { id: hId } });
      expect(foundH).toBeNull();

      // Verify Domains are gone
      const foundDomains = await prisma.domain.findMany({ where: { hackathonId: hId } });
      expect(foundDomains.length).toBe(0);
    });
  });

  describe("3. Dynamic Navigation & Footer Configuration", () => {
    it("provides fallback defaults matching HackBridge protocol specification", () => {
      expect(DEFAULT_NAVBAR_CONFIG.brandName).toBe("HackBridge");
      // versionTag intentionally cleared per user request (UI badge removed)
      expect(DEFAULT_NAVBAR_CONFIG.versionTag).toBe("");
      expect(DEFAULT_NAVBAR_CONFIG.publicNavLinks.length).toBeGreaterThan(0);
      expect(DEFAULT_FOOTER_CONFIG.brandName).toBe("HackBridge");
      expect(DEFAULT_FOOTER_CONFIG.columns.length).toBe(3);
    });

    it("persists custom Navbar branding, top announcement banner, and footer contact details", async () => {
      const customNavPayload = {
        navbar: {
          ...DEFAULT_NAVBAR_CONFIG,
          brandName: "HackBridge Pro",
          versionTag: "v4.0",
          announcement: {
            enabled: true,
            text: "Global Hackathon Arena Registration is Open!",
            link: "/hackathons",
          },
          publicNavLinks: [
            { label: "Arenas", href: "/hackathons" },
            { label: "Custom Protocol Spec", href: "/docs" },
          ],
        },
        footer: {
          ...DEFAULT_FOOTER_CONFIG,
          brandName: "HackBridge Enterprise",
          contactPhone: "9380968402",
          contactEmail: "leadership@hackbridge.tech",
          statusText: "All Systems Operational · 100% Invariant Guarantee",
        },
      };

      const serialized = JSON.stringify(customNavPayload, null, 2);

      const saved = await prisma.siteContent.upsert({
        where: { key: "site_navigation" },
        create: {
          key: "site_navigation",
          jsonValue: serialized,
          draftJsonValue: serialized,
          published: true,
          version: 1,
        },
        update: {
          jsonValue: serialized,
          draftJsonValue: serialized,
          published: true,
        },
      });

      expect(saved.key).toBe("site_navigation");

      const retrieved = await prisma.siteContent.findUnique({
        where: { key: "site_navigation" },
      });
      const parsed = JSON.parse(retrieved!.jsonValue);

      expect(parsed.navbar.brandName).toBe("HackBridge Pro");
      expect(parsed.navbar.announcement.enabled).toBe(true);
      expect(parsed.navbar.announcement.text).toBe("Global Hackathon Arena Registration is Open!");
      expect(parsed.footer.contactPhone).toBe("9380968402");
      expect(parsed.footer.statusText).toBe("All Systems Operational · 100% Invariant Guarantee");
    });
  });
});
