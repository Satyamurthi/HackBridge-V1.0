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

    // Lookup student by permanent Hackathon ID (HB-XXXXXX)
    const student = await prisma.studentProfile.findUnique({
      where: { hackathonId: rawId },
      include: {
        user: {
          select: { name: true, email: true },
        },
        teamMemberships: {
          include: {
            team: true,
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

    // Check if student belongs to an active team registration
    // Non-negotiable rule 1: A student can belong to only one active hackathon registration.
    const activeTeamMembership = student.teamMemberships.find(
      (m) => m.team.status === "ACTIVE" || m.team.status === "PENDING"
    );

    return NextResponse.json({
      exists: true,
      studentId: student.id,
      hackathonId: student.hackathonId,
      name: student.user.name,
      college: student.college,
      isEligible: !activeTeamMembership,
      blockedReason: activeTeamMembership
        ? "Student is already registered in an active team (" + activeTeamMembership.team.name + ")"
        : null,
    });
  } catch (error: any) {
    console.error("[Student Lookup Error]:", error);
    return NextResponse.json(
      { error: "Internal server error during student lookup" },
      { status: 500 }
    );
  }
}
