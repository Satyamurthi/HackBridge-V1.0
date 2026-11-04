import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET /api/v1/hackathons/[id]/problem-statements — Fetch statements with server clock reveal and balanced allocation caps
// Query param: teamId — if provided, filter to show only the team's pre-selected domain's statements
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(req.url);
    const teamIdFilter = searchParams.get("teamId") || null;

    const hackathon = await prisma.hackathon.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        domains: {
          include: {
            problemStatements: {
              include: {
                teams: {
                  select: { id: true, name: true, teamId: true },
                },
              },
            },
          },
        },
        _count: {
          select: {
            teams: true,
          },
        },
      },
    });

    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }

    // If teamId provided, look up team's pre-selected domain to filter
    let teamSelectedDomainId: string | null = null;
    if (teamIdFilter) {
      const teamData = await prisma.team.findFirst({
        where: { OR: [{ id: teamIdFilter }, { teamId: teamIdFilter }] },
        select: { domainId: true },
      });
      if ((teamData as any)?.domainId) {
        teamSelectedDomainId = (teamData as any).domainId;
      }
    }

    // Count verified active teams
    const totalActiveTeams = await prisma.team.count({
      where: {
        hackathonId: hackathon.id,
        status: { in: ["ACTIVE", "SUBMITTED"] },
      },
    });

    // Count all problem statements in this hackathon
    const totalStatements = hackathon.domains.reduce(
      (sum, d) => sum + d.problemStatements.length,
      0
    );

    // PRD Non-Negotiable Rule 4: Cap per statement = ceil(teams / statements)
    const dynamicCap = totalStatements > 0
      ? Math.max(1, Math.ceil((totalActiveTeams || 1) / totalStatements))
      : 10;

    const now = new Date();

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

    // If a specific domainId is requested alongside teamId, ensure it matches team's bound domain
    const requestedDomainId = searchParams.get("domainId");
    if (teamSelectedDomainId && requestedDomainId && requestedDomainId !== teamSelectedDomainId) {
      return NextResponse.json(
        { error: "Access denied. Squads may only inspect problem statements within their registered domain." },
        { status: 403 }
      );
    }

    // Filter domains: show only team's pre-selected domain if teamId filter was given
    const domainsToServe = teamSelectedDomainId
      ? hackathon.domains.filter((d) => d.id === teamSelectedDomainId)
      : requestedDomainId
      ? hackathon.domains.filter((d) => d.id === requestedDomainId)
      : hackathon.domains;

    const sanitizedDomains = domainsToServe.map((domain) => {
      const isRevealed = new Date(domain.revealAt) <= now;
      const canSeeDetails = isRevealed || isOwnerOrAdmin;
      const msUntilReveal = Math.max(0, new Date(domain.revealAt).getTime() - now.getTime());
      const totalSec = Math.ceil(msUntilReveal / 1000);
      const hh = String(Math.floor(totalSec / 3600)).padStart(2, "0");
      const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
      const ss = String(totalSec % 60).padStart(2, "0");
      const countdownHHMMSS = `${hh}:${mm}:${ss}`;
      const unlockTimeHHMMSS = new Date(domain.revealAt).toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });

      return {
        id: domain.id,
        name: domain.name,
        description: canSeeDetails ? domain.description : null,
        revealAt: domain.revealAt,
        unlockTimeHHMMSS,
        countdownHHMMSS,
        isRevealed,
        secondsUntilReveal: totalSec,
        problemStatements: domain.problemStatements.map((ps) => {
          const assignedCount = ps.teams.length;
          const effectiveCap = ps.cap > 0 ? ps.cap : dynamicCap;
          const isFull = assignedCount >= effectiveCap;

          return {
            id: ps.id,
            // Strictly hide title and content before revealAt passes for non-hosts (Rule 3)
            title: canSeeDetails ? ps.title : "Problem Statement Locked (Reveals at Countdown Expiry)",
            description: canSeeDetails ? ps.description : null,
            difficulty: canSeeDetails ? (ps as any).difficulty || "MEDIUM" : null,
            attachmentUrl: canSeeDetails ? (ps as any).attachmentUrl || null : null,
            attachmentName: canSeeDetails ? (ps as any).attachmentName || null : null,
            code: canSeeDetails ? (ps as any).code || null : null,
            overview: canSeeDetails ? (ps as any).overview || null : null,
            mission: canSeeDetails ? (ps as any).mission || null : null,
            resources: canSeeDetails ? (ps as any).resources || null : null,
            metrics: canSeeDetails ? (ps as any).metrics || null : null,
            goals: canSeeDetails ? (ps as any).goals || null : null,
            safetyRules: canSeeDetails ? (ps as any).safetyRules || null : null,
            evalBoundary: canSeeDetails ? (ps as any).evalBoundary || null : null,
            cap: effectiveCap,
            assignedCount,
            slotsRemaining: Math.max(0, effectiveCap - assignedCount),
            isFull,
            isRevealed,
          };
        }),
      };
    });

    return NextResponse.json({
      hackathonId: hackathon.id,
      title: hackathon.title,
      totalActiveTeams,
      totalStatements,
      dynamicCap,
      teamSelectedDomainId,
      domains: sanitizedDomains,
    });
  } catch (error: any) {
    console.error("[Problem Statements GET Error]:", error);
    return NextResponse.json(
      { error: "Failed to fetch problem statements" },
      { status: 500 }
    );
  }
}

// POST /api/v1/hackathons/[id]/problem-statements — Host adds a problem statement
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "HOST" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Host clearance required" }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { domainId, title, description, difficulty, cap, attachmentUrl, attachmentName } = body;

    if (!domainId || !title?.trim()) {
      return NextResponse.json({ error: "domainId and title are required" }, { status: 400 });
    }

    const hackathon = await prisma.hackathon.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: { host: true },
    });
    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }

    if (session.role === "HOST") {
      const hostProfile = await prisma.hostProfile.findUnique({ where: { userId: session.userId } });
      if (!hostProfile || hackathon.hostId !== hostProfile.id) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    const domain = await prisma.domain.findFirst({
      where: { id: domainId, hackathonId: hackathon.id },
    });
    if (!domain) {
      return NextResponse.json({ error: "Domain not found in this hackathon" }, { status: 404 });
    }

    const created = await prisma.problemStatement.create({
      data: {
        domainId,
        title: title.trim(),
        description: description?.trim() || "",
        difficulty: difficulty || "MEDIUM",
        cap: Number(cap) || 0,
        attachmentUrl: attachmentUrl || null,
        attachmentName: attachmentName || null,
      },
    });

    await writeAuditLog(session.userId, "PROBLEM_STATEMENT_CREATED", "problem_statement", created.id, {
      hackathonTitle: hackathon.title,
      domainName: domain.name,
      title: created.title,
    });

    return NextResponse.json({
      success: true,
      statement: created,
      message: "Problem statement successfully added",
    });
  } catch (error: any) {
    console.error("[Problem Statement POST Error]:", error);
    return NextResponse.json({ error: "Failed to create problem statement" }, { status: 500 });
  }
}

// PATCH /api/v1/hackathons/[id]/problem-statements — Host edits a problem statement
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "HOST" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Host clearance required" }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { statementId, title, description, difficulty, cap, attachmentUrl, attachmentName } = body;

    if (!statementId) {
      return NextResponse.json({ error: "statementId is required" }, { status: 400 });
    }

    const statement = await prisma.problemStatement.findUnique({
      where: { id: statementId },
      include: { domain: { include: { hackathon: true } } },
    });

    if (!statement || (statement.domain.hackathon.id !== id && statement.domain.hackathon.slug !== id)) {
      return NextResponse.json({ error: "Problem statement not found" }, { status: 404 });
    }

    if (session.role === "HOST") {
      const hostProfile = await prisma.hostProfile.findUnique({ where: { userId: session.userId } });
      if (!hostProfile || statement.domain.hackathon.hostId !== hostProfile.id) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    const updateData: Record<string, any> = {};
    if (title?.trim()) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || "";
    if (difficulty) updateData.difficulty = difficulty;
    if (cap !== undefined) updateData.cap = Number(cap);
    if (attachmentUrl !== undefined) updateData.attachmentUrl = attachmentUrl || null;
    if (attachmentName !== undefined) updateData.attachmentName = attachmentName || null;

    const updated = await prisma.problemStatement.update({
      where: { id: statementId },
      data: updateData,
    });

    await writeAuditLog(session.userId, "PROBLEM_STATEMENT_UPDATED", "problem_statement", statementId, {
      title: updated.title,
      domainName: statement.domain.name,
    });

    return NextResponse.json({
      success: true,
      statement: updated,
      message: "Problem statement updated successfully",
    });
  } catch (error: any) {
    console.error("[Problem Statement PATCH Error]:", error);
    return NextResponse.json({ error: "Failed to update problem statement" }, { status: 500 });
  }
}

// DELETE /api/v1/hackathons/[id]/problem-statements?statementId=xxx — Host deletes a problem statement
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "HOST" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Host clearance required" }, { status: 401 });
    }

    const { id } = params;
    const { searchParams } = new URL(req.url);
    const statementId = searchParams.get("statementId");

    if (!statementId) {
      return NextResponse.json({ error: "statementId query parameter is required" }, { status: 400 });
    }

    const statement = await prisma.problemStatement.findUnique({
      where: { id: statementId },
      include: { domain: { include: { hackathon: true } } },
    });

    if (!statement || (statement.domain.hackathon.id !== id && statement.domain.hackathon.slug !== id)) {
      return NextResponse.json({ error: "Problem statement not found" }, { status: 404 });
    }

    if (session.role === "HOST") {
      const hostProfile = await prisma.hostProfile.findUnique({ where: { userId: session.userId } });
      if (!hostProfile || statement.domain.hackathon.hostId !== hostProfile.id) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    await prisma.problemStatement.delete({ where: { id: statementId } });

    return NextResponse.json({ success: true, message: "Problem statement deleted" });
  } catch (error: any) {
    console.error("[Problem Statement DELETE Error]:", error);
    return NextResponse.json({ error: "Failed to delete problem statement" }, { status: 500 });
  }
}
