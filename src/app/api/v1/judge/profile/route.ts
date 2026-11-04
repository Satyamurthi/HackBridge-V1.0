import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, hashPassword, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/v1/judge/profile — Evaluator profile, clearances, and metrics
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "JUDGE" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Judge credentials required" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        judgeProfiles: {
          include: {
            hackathon: {
              select: {
                id: true,
                title: true,
                slug: true,
                status: true,
                startAt: true,
                endAt: true,
                host: {
                  select: { orgName: true, type: true },
                },
                teams: {
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User account not found" }, { status: 404 });
    }

    const primaryProfile = user.judgeProfiles[0] || null;

    // Fetch evaluation stats
    const scores = await prisma.score.findMany({
      where: { judgeId: session.userId },
      select: {
        submissionId: true,
        isDraft: true,
      },
    });

    const uniqueCertifiedSubmissions = new Set(
      scores.filter((s) => !s.isDraft).map((s) => s.submissionId)
    );
    const uniqueDraftSubmissions = new Set(
      scores.filter((s) => s.isDraft).map((s) => s.submissionId)
    );

    const assignedHackathons = user.judgeProfiles.map((p) => ({
      id: p.hackathon.id,
      title: p.hackathon.title,
      slug: p.hackathon.slug,
      hostName: p.hackathon.host?.orgName || "Host Organization",
      hostType: p.hackathon.host?.type || "college",
      domain: p.domain || "All Tracks",
      approvalStatus: p.approvalStatus,
      startAt: p.hackathon.startAt.toISOString(),
      endAt: p.hackathon.endAt.toISOString(),
      status: p.hackathon.status,
      teamCount: p.hackathon.teams.length,
      assignedAt: p.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
      },
      judgeProfile: primaryProfile
        ? {
            id: primaryProfile.id,
            company: primaryProfile.company,
            designation: primaryProfile.designation,
            domain: primaryProfile.domain,
            approvalStatus: primaryProfile.approvalStatus,
          }
        : null,
      assignedHackathons,
      stats: {
        totalAssignedHackathons: assignedHackathons.length,
        totalCertifiedEvaluations: uniqueCertifiedSubmissions.size,
        totalDraftEvaluations: uniqueDraftSubmissions.size,
      },
    });
  } catch (error) {
    console.error("GET /api/v1/judge/profile error:", error);
    return NextResponse.json({ error: "Failed to fetch judge profile" }, { status: 500 });
  }
}

// PATCH /api/v1/judge/profile — Update evaluator profile details & security credentials
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "JUDGE" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Judge credentials required" }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, company, designation, domain, currentPassword, newPassword } = body;

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User account not found" }, { status: 404 });
    }

    // Handle password update if requested
    let updatedPasswordHash: string | undefined = undefined;
    if (newPassword) {
      if (!user.passwordHash) {
        return NextResponse.json(
          { error: "This account was authenticated with Google Sign-In. Password cannot be modified." },
          { status: 400 }
        );
      }
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Current password is required to set a new password." },
          { status: 400 }
        );
      }
      const isValid = await verifyPassword(currentPassword, user.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { error: "Current password verification failed. Please check your credentials." },
          { status: 400 }
        );
      }
      if (typeof newPassword !== "string" || newPassword.length < 8) {
        return NextResponse.json(
          { error: "New password must be at least 8 characters long." },
          { status: 400 }
        );
      }
      updatedPasswordHash = await hashPassword(newPassword);
    }

    // Update User record
    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: {
        ...(name && typeof name === "string" ? { name: name.trim() } : {}),
        ...(phone !== undefined ? { phone: phone?.trim() || null } : {}),
        ...(updatedPasswordHash ? { passwordHash: updatedPasswordHash } : {}),
      },
    });

    // Update JudgeProfile records for this user
    await prisma.judgeProfile.updateMany({
      where: { userId: session.userId },
      data: {
        ...(company !== undefined ? { company: company?.trim() || null } : {}),
        ...(designation !== undefined ? { designation: designation?.trim() || null } : {}),
        ...(domain !== undefined ? { domain: domain?.trim() || null } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Judge evaluator profile updated successfully.",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
      },
    });
  } catch (error) {
    console.error("PATCH /api/v1/judge/profile error:", error);
    return NextResponse.json({ error: "Failed to update judge profile" }, { status: 500 });
  }
}
