import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET /api/v1/hackathons — Public listing with search and filters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const mode = searchParams.get("mode") || ""; // FREE, QR, RAZORPAY
    const type = searchParams.get("type") || ""; // college, company
    const status = searchParams.get("status") || "PUBLISHED"; // allow DRAFT for host preview

    // Hosts can see their own drafts if authenticated
    const session = await getSession();
    let hostFilter: any = {};
    if (status === "DRAFT" && session?.role === "HOST") {
      const hostProfile = await prisma.hostProfile.findUnique({
        where: { userId: session.userId },
      });
      if (hostProfile) {
        hostFilter = { hostId: hostProfile.id };
      }
    }

    const hackathons = await prisma.hackathon.findMany({
      where: {
        status: status === "ALL" ? undefined : status,
        ...hostFilter,
        ...(search
          ? {
              OR: [
                { title: { contains: search } },
                { description: { contains: search } },
              ],
            }
          : {}),
        ...(mode ? { paymentMode: mode } : {}),
        ...(type
          ? {
              host: { type },
            }
          : {}),
      },
      include: {
        host: {
          select: {
            orgName: true,
            type: true,
          },
        },
        domains: {
          include: {
            problemStatements: {
              select: { id: true, title: true },
            },
          },
        },
        results: {
          select: {
            id: true,
            rank: true,
            award: true,
          },
        },
        teams: {
          where: {
            submission: {
              scores: { some: {} },
            },
          },
          select: { id: true },
        },
        _count: {
          select: {
            teams: true,
          },
        },
      },
      orderBy: {
        startAt: "asc",
      },
    });

    const enrichedHackathons = hackathons.map((h: any) => ({
      ...h,
      hasWinners: Boolean((h.results && h.results.length > 0) || (h.teams && h.teams.length > 0)),
    }));

    return NextResponse.json({ hackathons: enrichedHackathons, serverTime: new Date().toISOString() });
  } catch (error: any) {
    console.error("[Hackathons API Error]:", error);
    return NextResponse.json(
      { error: "Failed to fetch hackathons" },
      { status: 500 }
    );
  }
}

// POST /api/v1/hackathons — Create a hackathon (HOST only)
// Hosts can create DRAFT hackathons even before admin approval
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "HOST") {
      return NextResponse.json({ error: "Host authentication required" }, { status: 401 });
    }

    const hostProfile = await prisma.hostProfile.findUnique({
      where: { userId: session.userId },
    });
    if (!hostProfile) {
      return NextResponse.json({ error: "Host profile not found" }, { status: 404 });
    }

    if (hostProfile.approvalStatus !== "APPROVED") {
      return NextResponse.json(
        {
          error:
            "Host account waiting for admin approval. Only approved hosts can create or host hackathons. Contact 9380968402 Or Admin.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      title,
      slug: rawSlug,
      description,
      rules,
      rulesGate = false,
      teamMin = 1,
      teamMax = 4,
      fee = 0,
      paymentMode = "FREE",
      upiId,
      qrImageUrl,
      prizePool,
      registrationDeadline,
      startAt,
      endAt,
      domains = [],
      rubricCriteria = [],
    } = body;

    // Validate required fields
    if (!title || !description || !rules || !startAt || !endAt) {
      return NextResponse.json(
        { error: "title, description, rules, startAt, and endAt are required" },
        { status: 400 }
      );
    }

    if (paymentMode === "QR") {
      if (!upiId || typeof upiId !== "string" || !upiId.trim()) {
        return NextResponse.json(
          { error: "Host UPI ID is compulsory for QR Transfer mode." },
          { status: 400 }
        );
      }
      if (!qrImageUrl || typeof qrImageUrl !== "string" || !qrImageUrl.trim()) {
        return NextResponse.json(
          { error: "QR code (auto-generated or uploaded) is compulsory for QR Transfer mode." },
          { status: 400 }
        );
      }
    }

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Invalid startAt or endAt date format" }, { status: 400 });
    }

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: "Hackathon end time must be after the start time" },
        { status: 400 }
      );
    }

    let regDeadlineDate: Date | null = null;
    if (registrationDeadline) {
      regDeadlineDate = new Date(registrationDeadline);
      if (isNaN(regDeadlineDate.getTime())) {
        return NextResponse.json({ error: "Invalid registrationDeadline date format" }, { status: 400 });
      }
      if (regDeadlineDate >= startDate) {
        return NextResponse.json(
          { error: "Registration deadline must come before the hackathon start time" },
          { status: 400 }
        );
      }
    } else {
      // Default registration deadline to start time if not provided
      regDeadlineDate = new Date(startDate.getTime() - 2 * 60 * 60 * 1000); // 2 hours before start
    }

    // Generate slug from title if not provided
    const slug =
      rawSlug ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .slice(0, 60) +
        "-" +
        Date.now().toString(36);

    // Check slug uniqueness
    const existing = await prisma.hackathon.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: "A hackathon with this slug already exists" }, { status: 409 });
    }

    // Create hackathon + domains + problem statements + rubric in one transaction
    const hackathon = await prisma.$transaction(async (tx) => {
      const h = await tx.hackathon.create({
        data: {
          hostId: hostProfile.id,
          title,
          slug,
          description,
          rules,
          rulesGate,
          teamMin: Number(teamMin),
          teamMax: Number(teamMax),
          fee: Number(fee),
          paymentMode,
          upiId: upiId ? String(upiId).trim() : null,
          qrImageUrl: qrImageUrl ? String(qrImageUrl).trim() : null,
          prizePool: prizePool || null,
          status: "DRAFT",
          registrationDeadline: regDeadlineDate,
          startAt: startDate,
          endAt: endDate,
        },
      });

      // Create domains and their problem statements
      for (const domain of domains) {
        const d = await tx.domain.create({
          data: {
            hackathonId: h.id,
            name: domain.name,
            description: domain.description || null,
            revealAt: new Date(domain.revealAt || startAt),
          },
        });

        for (const ps of domain.problemStatements || []) {
          await tx.problemStatement.create({
            data: {
              domainId: d.id,
              title: ps.title,
              description: ps.description || "",
              cap: ps.cap ? Number(ps.cap) : 0,
            },
          });
        }
      }

      // Create rubric criteria
      for (const criterion of rubricCriteria) {
        await tx.rubricCriterion.create({
          data: {
            hackathonId: h.id,
            name: criterion.name,
            weight: Number(criterion.weight) || 1.0,
            maxScore: Number(criterion.maxScore) || 10.0,
          },
        });
      }

      return h;
    });

    await writeAuditLog(session.userId, "HACKATHON_CREATED", "hackathon", hackathon.id, {
      title,
      slug,
      hostOrg: hostProfile.orgName,
    });

    return NextResponse.json({ hackathon }, { status: 201 });
  } catch (error: any) {
    console.error("[Hackathon CREATE Error]:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create hackathon" }, { status: 500 });
  }
}
