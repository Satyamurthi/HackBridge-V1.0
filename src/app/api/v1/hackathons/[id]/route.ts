import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET /api/v1/hackathons/[id] — Fetch a hackathon by ID or slug (public)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const hackathon = await prisma.hackathon.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        host: {
          select: {
            orgName: true,
            type: true,
            website: true,
          },
        },
        domains: {
          include: {
            problemStatements: {
              select: {
                id: true,
                title: true,
                description: true,
                difficulty: true,
                attachmentUrl: true,
                attachmentName: true,
                cap: true,
              },
            },
          },
        },
        rubricCriteria: {
          select: { id: true, name: true, weight: true, maxScore: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        },
        _count: {
          select: { teams: true, judges: true },
        },
      },
    });

    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }

    const session = await getSession();
    let isOwnerOrAdmin = false;
    if (session) {
      if (session.role === "SUPER_ADMIN") {
        isOwnerOrAdmin = true;
      } else if (session.role === "HOST") {
        const hostProfile = await prisma.hostProfile.findUnique({
          where: { userId: session.userId },
        });
        if (hostProfile && hackathon.hostId === hostProfile.id) {
          isOwnerOrAdmin = true;
        }
      }
    }

    const now = new Date();
    const sanitized = {
      ...hackathon,
      domains: ((hackathon as any).domains || []).map((d: any) => {
        const isRevealed = new Date(d.revealAt) <= now;
        const msUntilReveal = Math.max(0, new Date(d.revealAt).getTime() - now.getTime());
        const totalSec = Math.ceil(msUntilReveal / 1000);
        const hh = String(Math.floor(totalSec / 3600)).padStart(2, "0");
        const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
        const ss = String(totalSec % 60).padStart(2, "0");
        const countdownHHMMSS = `${hh}:${mm}:${ss}`;
        const unlockTimeHHMMSS = new Date(d.revealAt).toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        });

        const canSeeDetails = isRevealed || isOwnerOrAdmin;

        return {
          ...d,
          revealed: isRevealed,
          isRevealed,
          unlockTimeHHMMSS,
          countdownHHMMSS,
          secondsUntilReveal: totalSec,
          problemStatements: (d.problemStatements || []).map((ps: any) => ({
            id: ps.id,
            title: canSeeDetails ? ps.title : "Problem Statement Locked (Reveals at Countdown Expiry)",
            description: canSeeDetails ? ps.description : null,
            difficulty: canSeeDetails ? ps.difficulty : null,
            attachmentUrl: canSeeDetails ? ps.attachmentUrl : null,
            attachmentName: canSeeDetails ? ps.attachmentName : null,
            code: canSeeDetails ? ps.code || null : null,
            overview: canSeeDetails ? ps.overview || null : null,
            mission: canSeeDetails ? ps.mission || null : null,
            resources: canSeeDetails ? ps.resources || null : null,
            metrics: canSeeDetails ? ps.metrics || null : null,
            goals: canSeeDetails ? ps.goals || null : null,
            safetyRules: canSeeDetails ? ps.safetyRules || null : null,
            evalBoundary: canSeeDetails ? ps.evalBoundary || null : null,
            cap: ps.cap,
          })),
        };
      }),
    };

    return NextResponse.json({ hackathon: sanitized, isOwnerOrAdmin });
  } catch (error: any) {
    console.error("[Hackathon GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch hackathon" }, { status: 500 });
  }
}

// PATCH /api/v1/hackathons/[id] — Update a hackathon (HOST only, must own it)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const hackathon = await prisma.hackathon.findFirst({
      where: { id: params.id, hostId: hostProfile.id },
    });
    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found or not owned by you" }, { status: 404 });
    }

    const body = await req.json();
    const { action, ...fields } = body;

    // Handle publish action specifically
    if (action === "PUBLISH") {
      if (hostProfile.approvalStatus !== "APPROVED") {
        return NextResponse.json(
          { error: "Host not approved. Waiting for admin approval. Contact 9380968402 Or Admin before hosting or publishing." },
          { status: 403 }
        );
      }

      // Prompt 7.1: Block publishing a hackathon if neither Razorpay nor a QR is configured
      if (hackathon.fee > 0) {
        const hp = hostProfile as any;
        const hasRazorpay = Boolean(hp.razorpayKeyId && hp.razorpayKeySecret);
        const hasHostQr = Boolean(hp.upiId && hp.qrImageUrl);
        const hasHackathonQr = Boolean(hackathon.upiId && hackathon.qrImageUrl);
        if (!hasRazorpay && !hasHostQr && !hasHackathonQr) {
          return NextResponse.json(
            {
              error:
                "Cannot publish hackathon: Payment credentials missing. Please configure either Razorpay API keys or UPI QR in Host Payments Setup before publishing.",
            },
            { status: 400 }
          );
        }
      }

      const updated = await prisma.hackathon.update({
        where: { id: params.id },
        data: { status: "PUBLISHED" },
      });
      await writeAuditLog(session.userId, "HACKATHON_PUBLISHED", "hackathon", params.id);
      return NextResponse.json({ hackathon: updated });
    }

    if (action === "ARCHIVE") {
      const updated = await prisma.hackathon.update({
        where: { id: params.id },
        data: { status: "ARCHIVED" },
      });
      await writeAuditLog(session.userId, "HACKATHON_ARCHIVED", "hackathon", params.id);
      return NextResponse.json({ hackathon: updated });
    }

    // Host can edit each and everything of hackathons that are drafted or published
    const allowedFields = [
      "title", "slug", "description", "rules", "rulesGate", "teamMin", "teamMax",
      "fee", "paymentMode", "qrImageUrl", "upiId", "bannerUrl", "prizePool",
      "registrationDeadline", "part1Due", "part2Due", "part3Due", "part4Due", "githubOrgRepo",
      "startAt", "endAt", "status",
    ];

    const updateData: Record<string, any> = {};
    for (const key of allowedFields) {
      if (key in fields) updateData[key] = fields[key];
    }

    if (fields.registrationDeadline !== undefined) {
      updateData.registrationDeadline = fields.registrationDeadline ? new Date(fields.registrationDeadline) : null;
    }
    if (fields.startAt !== undefined && fields.startAt) {
      updateData.startAt = new Date(fields.startAt);
    }
    if (fields.endAt !== undefined && fields.endAt) {
      updateData.endAt = new Date(fields.endAt);
    }
    if (fields.part1Due !== undefined) {
      updateData.part1Due = fields.part1Due ? new Date(fields.part1Due) : null;
    }
    if (fields.part2Due !== undefined) {
      updateData.part2Due = fields.part2Due ? new Date(fields.part2Due) : null;
    }
    if (fields.part3Due !== undefined) {
      updateData.part3Due = fields.part3Due ? new Date(fields.part3Due) : null;
    }
    if (fields.part4Due !== undefined) {
      updateData.part4Due = fields.part4Due ? new Date(fields.part4Due) : null;
    }

    if (fields.fee !== undefined) updateData.fee = Number(fields.fee);
    if (fields.teamMin !== undefined) updateData.teamMin = Math.max(1, Number(fields.teamMin));
    if (fields.teamMax !== undefined) updateData.teamMax = Math.max(updateData.teamMin || hackathon.teamMin, Number(fields.teamMax));
    if (fields.rulesGate !== undefined) updateData.rulesGate = Boolean(fields.rulesGate);

    // If slug is being updated, verify uniqueness
    if (fields.slug && fields.slug !== hackathon.slug) {
      const existingSlug = await prisma.hackathon.findUnique({ where: { slug: fields.slug } });
      if (existingSlug && existingSlug.id !== hackathon.id) {
        return NextResponse.json({ error: "Slug is already in use by another hackathon" }, { status: 400 });
      }
    }

    if (fields.revealAt !== undefined && fields.revealAt) {
      const revealDate = new Date(fields.revealAt);
      await prisma.domain.updateMany({
        where: { hackathonId: params.id },
        data: { revealAt: revealDate },
      });
    }

    if (Array.isArray(fields.rubricCriteria)) {
      const incoming = fields.rubricCriteria.filter(
        (c: any) => c && typeof c.name === "string" && c.name.trim().length > 0
      );

      const existing = await prisma.rubricCriterion.findMany({
        where: { hackathonId: params.id },
        select: { id: true },
      });
      const existingIds = new Set(existing.map((e) => e.id));
      const incomingIds = new Set(incoming.filter((c: any) => c.id).map((c: any) => c.id));

      const toDelete = existing.filter((e) => !incomingIds.has(e.id)).map((e) => e.id);
      if (toDelete.length > 0) {
        await prisma.rubricCriterion.deleteMany({
          where: { id: { in: toDelete } },
        });
      }

      for (const c of incoming) {
        if (c.id && existingIds.has(c.id)) {
          await prisma.rubricCriterion.update({
            where: { id: c.id },
            data: {
              name: c.name.trim(),
              weight: Number(c.weight) || 1.0,
              maxScore: Number(c.maxScore) || 10.0,
            },
          });
        } else {
          await prisma.rubricCriterion.create({
            data: {
              hackathonId: params.id,
              name: c.name.trim(),
              weight: Number(c.weight) || 1.0,
              maxScore: Number(c.maxScore) || 10.0,
            },
          });
        }
      }
    }

    const updated = await prisma.hackathon.update({
      where: { id: params.id },
      data: updateData,
      include: {
        domains: {
          include: {
            problemStatements: true,
          },
        },
        rubricCriteria: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    await writeAuditLog(session.userId, "HOST_UPDATE_HACKATHON", "hackathon", params.id, {
      updatedFields: Object.keys(updateData),
      title: updated.title,
      status: updated.status,
    });

    return NextResponse.json({
      success: true,
      message: "Hackathon arena successfully updated",
      hackathon: updated,
    });
  } catch (error: any) {
    console.error("[Hackathon PATCH Error]:", error);
    return NextResponse.json({ error: "Failed to update hackathon" }, { status: 500 });
  }
}

// DELETE /api/v1/hackathons/[id] — Archive (soft delete) a hackathon (HOST or ADMIN)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || !["HOST", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.hackathon.update({
      where: { id: params.id },
      data: { status: "ARCHIVED" },
    });

    await writeAuditLog(session.userId, "HACKATHON_DELETED", "hackathon", params.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Hackathon DELETE Error]:", error);
    return NextResponse.json({ error: "Failed to archive hackathon" }, { status: 500 });
  }
}
