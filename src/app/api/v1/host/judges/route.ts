import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/v1/host/judges — List judges across host's hackathons
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "HOST" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Host or Admin clearance required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const hackathonId = searchParams.get("hackathonId");
    const status = searchParams.get("status"); // PENDING, APPROVED, REJECTED

    let hostProfileId: string | undefined;

    if (session.role === "HOST") {
      const host = await prisma.hostProfile.findUnique({
        where: { userId: session.userId },
      });
      if (!host) {
        return NextResponse.json({ error: "Host profile not found" }, { status: 404 });
      }
      hostProfileId = host.id;
    }

    // Support fetching all available judges across platform for the judge picker
    const allJudges = searchParams.get("allJudges");
    if (allJudges === "true") {
      const users = await prisma.user.findMany({
        where: { role: "JUDGE" },
        select: {
          id: true,
          name: true,
          email: true,
          judgeProfiles: {
            select: {
              id: true,
              hackathonId: true,
              approvalStatus: true,
              hackathon: { select: { id: true, title: true } },
            },
          },
        },
      });
      return NextResponse.json({ availableJudges: users });
    }

    const judges = await prisma.judgeProfile.findMany({
      where: {
        ...(status ? { approvalStatus: status } : {}),
        hackathon: {
          ...(hostProfileId ? { hostId: hostProfileId } : {}),
          ...(hackathonId ? { id: hackathonId } : {}),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        hackathon: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ judges });
  } catch (error: any) {
    console.error("[Host Judges GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch judges" }, { status: 500 });
  }
}

import bcrypt from "bcryptjs";

// POST /api/v1/host/judges — Assign a judge to a hackathon with domain & password credentials
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "HOST" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Host or Admin clearance required" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { judgeUserId, judgeEmail, judgeName, name, hackathonId, designation, company, domain, password } = body;
    const resolvedName = (judgeName || name || "").trim();

    if ((!judgeUserId && !judgeEmail) || !hackathonId) {
      return NextResponse.json(
        { error: "judgeUserId (or judgeEmail) and hackathonId are required" },
        { status: 400 }
      );
    }

    // Verify hackathon ownership
    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
      include: { host: true },
    });

    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon track not found" }, { status: 404 });
    }

    if (session.role === "HOST") {
      const host = await prisma.hostProfile.findUnique({
        where: { userId: session.userId },
      });
      if (!host || hackathon.hostId !== host.id) {
        return NextResponse.json(
          { error: "You can only assign judges to your own hackathons" },
          { status: 403 }
        );
      }
    }

    const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;

    // Find or create the judge user
    let judgeUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(judgeUserId ? [{ id: judgeUserId }] : []),
          ...(judgeEmail ? [{ email: judgeEmail.trim().toLowerCase() }] : []),
        ],
      },
    });

    if (!judgeUser) {
      if (!judgeEmail) {
        return NextResponse.json({ error: "Judge email is required to register a new judge" }, { status: 400 });
      }
      judgeUser = await prisma.user.create({
        data: {
          email: judgeEmail.trim().toLowerCase(),
          name: resolvedName || (designation ? `${designation.split("/")[0].trim()} (Judge)` : judgeEmail.trim().split("@")[0]),
          role: "JUDGE",
          status: "ACTIVE",
          passwordHash: passwordHash || null,
        },
      });
    } else {
      // Update password and ensure judge role if credentials provided
      judgeUser = await prisma.user.update({
        where: { id: judgeUser.id },
        data: {
          ...(resolvedName ? { name: resolvedName } : {}),
          ...(passwordHash ? { passwordHash } : {}),
          role: "JUDGE",
          status: "ACTIVE",
        },
      });
    }

    // Upsert the judge assignment
    const judgeProfile = await prisma.judgeProfile.upsert({
      where: {
        userId_hackathonId: {
          userId: judgeUser.id,
          hackathonId: hackathon.id,
        },
      },
      create: {
        userId: judgeUser.id,
        hackathonId: hackathon.id,
        approvalStatus: "APPROVED",
        designation: designation || "Evaluator",
        company: company || "Independent",
        domain: domain || null,
      },
      update: {
        approvalStatus: "APPROVED",
        ...(designation ? { designation } : {}),
        ...(company ? { company } : {}),
        ...(domain !== undefined ? { domain } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        hackathon: { select: { id: true, title: true, slug: true } },
      },
    });

    return NextResponse.json({
      message: `Judge ${judgeUser.name} (${judgeUser.email}) successfully assigned to "${hackathon.title}"${domain ? ` [${domain}]` : ""}${password ? " with login credentials set" : ""}!`,
      judge: judgeProfile,
    });
  } catch (error: any) {
    console.error("[Host Judge Assignment POST Error]:", error);
    return NextResponse.json({ error: "Failed to assign judge" }, { status: 500 });
  }
}
