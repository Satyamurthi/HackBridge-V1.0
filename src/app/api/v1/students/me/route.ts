import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/v1/students/me — Fetch active student's profile, permanent ID, and active squad status
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "STUDENT") {
      return NextResponse.json({ error: "Student session required" }, { status: 401 });
    }

    const student = await prisma.studentProfile.findUnique({
      where: { userId: session.userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatarUrl: true,
            status: true,
            createdAt: true,
          },
        },
        teamMemberships: {
          include: {
            team: {
              include: {
                hackathon: {
                  select: {
                    id: true,
                    title: true,
                    slug: true,
                    startAt: true,
                    endAt: true,
                    status: true,
                  },
                },
                problemStatement: {
                  select: { id: true, title: true },
                },
                codeRepo: {
                  select: { githubRepoUrl: true },
                },
                submission: {
                  select: { locked: true, submittedAt: true },
                },
              },
            },
          },
          orderBy: { joinedAt: "desc" },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    const now = new Date();
    // Rule 1 check: Active hackathon registration
    const activeMembership = student.teamMemberships.find(
      (m) =>
        (m.team.status === "ACTIVE" || m.team.status === "PENDING") &&
        new Date(m.team.hackathon.endAt) > now
    );

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        userId: student.userId,
        hackathonId: student.hackathonId,
        college: student.college,
        githubUsername: student.githubUsername,
        bio: student.bio,
        skills: student.skills,
        name: student.user.name,
        email: student.user.email,
        phone: student.user.phone,
        status: student.user.status,
        memberSince: student.createdAt,
        activeRegistration: activeMembership
          ? {
              teamId: activeMembership.team.teamId,
              teamName: activeMembership.team.name,
              role: activeMembership.role,
              hackathonTitle: activeMembership.team.hackathon.title,
              hackathonSlug: activeMembership.team.hackathon.slug,
              endAt: activeMembership.team.hackathon.endAt,
              status: activeMembership.team.status,
            }
          : null,
        isEligibleForNewHackathon: !activeMembership,
      },
    });
  } catch (error: any) {
    console.error("[Students ME GET Error]:", error);
    return NextResponse.json({ error: "Failed to load student profile" }, { status: 500 });
  }
}

// PATCH /api/v1/students/me — Update editable student profile fields
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "STUDENT") {
      return NextResponse.json({ error: "Student session required" }, { status: 401 });
    }

    const body = await req.json();
    const { college, githubUsername, bio, skills, phone, name } = body;

    // Update User record if name or phone provided
    const userUpdateData: any = {};
    if (typeof name === "string" && name.trim()) userUpdateData.name = name.trim();
    if (typeof phone === "string") userUpdateData.phone = phone.trim();

    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({
        where: { id: session.userId },
        data: userUpdateData,
      });
    }

    // Update StudentProfile record
    const profileUpdateData: any = {};
    if (typeof college === "string" && college.trim()) profileUpdateData.college = college.trim();
    if (typeof githubUsername === "string") {
      // Strip @ if included
      profileUpdateData.githubUsername = githubUsername.trim().replace(/^@/, "");
    }
    if (typeof bio === "string") profileUpdateData.bio = bio.trim();
    if (typeof skills === "string") profileUpdateData.skills = skills.trim();

    const updatedStudent = await prisma.studentProfile.update({
      where: { userId: session.userId },
      data: profileUpdateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      student: {
        id: updatedStudent.id,
        hackathonId: updatedStudent.hackathonId,
        college: updatedStudent.college,
        githubUsername: updatedStudent.githubUsername,
        bio: updatedStudent.bio,
        skills: updatedStudent.skills,
        name: updatedStudent.user.name,
        email: updatedStudent.user.email,
        phone: updatedStudent.user.phone,
      },
    });
  } catch (error: any) {
    console.error("[Students ME PATCH Error]:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
