import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { hackathonId: string } }
) {
  try {
    const rawId = params.hackathonId?.trim().toUpperCase();

    if (!rawId) {
      return NextResponse.json(
        { error: "Hackathon ID is required" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const currentHackathonId = searchParams.get("currentHackathonId");

    // Lookup student by permanent Hackathon ID (HB-XXXXXX)
    const student = await prisma.studentProfile.findUnique({
      where: { hackathonId: rawId },
      include: {
        user: {
          select: { name: true, email: true },
        },
        teamMemberships: {
          include: {
            team: {
              include: {
                hackathon: {
                  select: { id: true, slug: true, title: true, endAt: true },
                },
              },
            },
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        { exists: false, error: "No student found with Hackathon ID: " + rawId },
        { status: 404 }
      );
    }

    const now = new Date();

    // Check if student belongs to an active team registration
    // Non-negotiable rule 1: A student can belong to only one active hackathon registration.
    const activeTeamMembership = student.teamMemberships.find(
      (m) =>
        (m.team.status === "ACTIVE" || m.team.status === "PENDING") &&
        new Date(m.team.hackathon.endAt) > now
    );

    const isSameHackathonPending =
      Boolean(activeTeamMembership) &&
      Boolean(currentHackathonId) &&
      (activeTeamMembership?.team.hackathonId === currentHackathonId ||
        activeTeamMembership?.team.hackathon.slug === currentHackathonId) &&
      activeTeamMembership?.team.status === "PENDING";

    const isEligible = !activeTeamMembership || isSameHackathonPending;

    let blockedReason: string | null = null;
    if (activeTeamMembership && !isSameHackathonPending) {
      blockedReason = `Student is already registered in active event "${activeTeamMembership.team.hackathon.title}" with squad "${activeTeamMembership.team.name}"`;
    }

    return NextResponse.json({
      exists: true,
      studentId: student.id,
      hackathonId: student.hackathonId,
      name: student.user.name,
      college: student.college,
      isEligible,
      isSameHackathonPending,
      activeTeam: activeTeamMembership
        ? {
            id: activeTeamMembership.team.id,
            name: activeTeamMembership.team.name,
            status: activeTeamMembership.team.status,
            hackathonTitle: activeTeamMembership.team.hackathon.title,
            hackathonSlug: activeTeamMembership.team.hackathon.slug,
          }
        : null,
      blockedReason,
    });
  } catch (error: any) {
    console.error("[Student Lookup Error]:", error);
    return NextResponse.json(
      { error: "Internal server error during student lookup" },
      { status: 500 }
    );
  }
}
