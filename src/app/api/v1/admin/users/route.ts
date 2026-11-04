import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET /api/v1/admin/users — List and filter platform users (SUPER_ADMIN only)
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Super Admin clearance required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const roleFilter = searchParams.get("role") || "ALL";
    const statusFilter = searchParams.get("status") || "ALL";
    const query = searchParams.get("q") || "";

    const whereClause: any = {};

    if (roleFilter !== "ALL") {
      whereClause.role = roleFilter;
    }

    if (statusFilter !== "ALL") {
      whereClause.status = statusFilter;
    }

    if (query.trim()) {
      whereClause.OR = [
        { name: { contains: query.trim() } },
        { email: { contains: query.trim() } },
        { phone: { contains: query.trim() } },
      ];
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        studentProfile: {
          select: {
            id: true,
            hackathonId: true,
            college: true,
            githubUsername: true,
            bio: true,
            skills: true,
          },
        },
        hostProfile: {
          select: {
            id: true,
            orgName: true,
            type: true,
            approvalStatus: true,
            membershipStatus: true,
            website: true,
            bio: true,
            city: true,
            address: true,
            upiId: true,
            bankAccountName: true,
            hackId: true,
          },
        },
        judgeProfiles: {
          select: {
            id: true,
            hackathonId: true,
            designation: true,
            company: true,
            approvalStatus: true,
            hackathon: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
      take: 200,
    });

    const counts = {
      total: await prisma.user.count(),
      students: await prisma.user.count({ where: { role: "STUDENT" } }),
      hosts: await prisma.user.count({ where: { role: "HOST" } }),
      judges: await prisma.user.count({ where: { role: "JUDGE" } }),
      admins: await prisma.user.count({ where: { role: "SUPER_ADMIN" } }),
      active: await prisma.user.count({ where: { status: "ACTIVE" } }),
      paused: await prisma.user.count({ where: { status: "PAUSED" } }),
      rejected: await prisma.user.count({ where: { status: "REJECTED" } }),
    };

    return NextResponse.json({ users, counts });
  } catch (error) {
    console.error("[Admin Users GET Error]:", error);
    return NextResponse.json({ error: "Failed to load platform users" }, { status: 500 });
  }
}

// PATCH /api/v1/admin/users — Modify all user account details & profiles (SUPER_ADMIN only)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Super Admin clearance required" }, { status: 403 });
    }

    const body = await req.json();
    const {
      userId,
      name,
      email,
      phone,
      role,
      status,
      // Student Profile edits
      college,
      githubUsername,
      bio,
      skills,
      // Host Profile edits
      orgName,
      type: hostType,
      website,
      upiId,
      hostApprovalStatus,
      // Judge Profile edits
      designation,
      company,
      judgeApprovalStatus,
    } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: true,
        hostProfile: true,
        judgeProfiles: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Build user table updates
    const userUpdate: any = {};
    if (name !== undefined) userUpdate.name = name;
    if (email !== undefined) userUpdate.email = email;
    if (phone !== undefined) userUpdate.phone = phone;
    if (role !== undefined) userUpdate.role = role;
    if (status !== undefined) userUpdate.status = status;

    const updatedUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: userId },
        data: userUpdate,
      });

      // Update student profile if user is student or has a student profile
      if (existingUser.studentProfile) {
        const studentUpdate: any = {};
        if (college !== undefined) studentUpdate.college = college;
        if (githubUsername !== undefined) studentUpdate.githubUsername = githubUsername;
        if (bio !== undefined) studentUpdate.bio = bio;
        if (skills !== undefined) studentUpdate.skills = skills;

        if (Object.keys(studentUpdate).length > 0) {
          await tx.studentProfile.update({
            where: { id: existingUser.studentProfile.id },
            data: studentUpdate,
          });
        }
      }

      // Update host profile if user is host or has a host profile
      if (existingUser.hostProfile) {
        const hostUpdate: any = {};
        if (orgName !== undefined) hostUpdate.orgName = orgName;
        if (hostType !== undefined) hostUpdate.type = hostType;
        if (website !== undefined) hostUpdate.website = website;
        if (upiId !== undefined) hostUpdate.upiId = upiId;
        if (hostApprovalStatus !== undefined) hostUpdate.approvalStatus = hostApprovalStatus;

        if (Object.keys(hostUpdate).length > 0) {
          await tx.hostProfile.update({
            where: { id: existingUser.hostProfile.id },
            data: hostUpdate,
          });
        }
      }

      // Update judge profile if judge
      if (existingUser.judgeProfiles.length > 0) {
        const judgeUpdate: any = {};
        if (designation !== undefined) judgeUpdate.designation = designation;
        if (company !== undefined) judgeUpdate.company = company;
        if (judgeApprovalStatus !== undefined) judgeUpdate.approvalStatus = judgeApprovalStatus;

        if (Object.keys(judgeUpdate).length > 0) {
          await tx.judgeProfile.updateMany({
            where: { userId },
            data: judgeUpdate,
          });
        }
      }

      return u;
    });

    await writeAuditLog(session.userId, "SUPER_ADMIN_UPDATE_USER", "User", userId, {
      updatedFields: body,
      adminEmail: session.email,
    });

    return NextResponse.json({
      success: true,
      message: `User ${updatedUser.name} (${updatedUser.email}) updated successfully`,
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("[Admin Users PATCH Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update user account" },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/admin/users — Permanently delete a user and cascade records (SUPER_ADMIN only)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Super Admin clearance required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    let userId = searchParams.get("id");

    if (!userId) {
      try {
        const body = await req.json();
        userId = body.userId || body.id;
      } catch {
        // Body was empty or already consumed
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "userId is required for deletion" }, { status: 400 });
    }

    // Safety: Super Admin cannot delete their own active account
    if (userId === session.userId) {
      return NextResponse.json(
        { error: "Security Restriction: You cannot delete your own active Super Admin account." },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: {
          include: {
            ledTeams: { select: { id: true } },
          },
        },
        hostProfile: {
          include: {
            hackathons: { select: { id: true } },
          },
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Safely delete user using a clean transaction
    await prisma.$transaction(async (tx) => {
      // 1. If student led teams, delete payments/members/progress/code repos/submissions first if foreign keys need
      if (targetUser.studentProfile?.ledTeams?.length) {
        const teamIds = targetUser.studentProfile.ledTeams.map((t) => t.id);
        await tx.submission.deleteMany({ where: { teamId: { in: teamIds } } });
        await tx.payment.deleteMany({ where: { teamId: { in: teamIds } } });
        await tx.progressUpdate.deleteMany({ where: { teamId: { in: teamIds } } });
        await tx.codeRepo.deleteMany({ where: { teamId: { in: teamIds } } });
        await tx.teamMember.deleteMany({ where: { teamId: { in: teamIds } } });
        await tx.team.deleteMany({ where: { id: { in: teamIds } } });
      }

      // 2. If host has hackathons, delete associated hackathon child records
      if (targetUser.hostProfile?.hackathons?.length) {
        const hackathonIds = targetUser.hostProfile.hackathons.map((h) => h.id);
        for (const hId of hackathonIds) {
          const hTeams = await tx.team.findMany({ where: { hackathonId: hId }, select: { id: true } });
          const hTeamIds = hTeams.map((t) => t.id);
          if (hTeamIds.length) {
            await tx.submission.deleteMany({ where: { teamId: { in: hTeamIds } } });
            await tx.payment.deleteMany({ where: { teamId: { in: hTeamIds } } });
            await tx.teamMember.deleteMany({ where: { teamId: { in: hTeamIds } } });
            await tx.team.deleteMany({ where: { id: { in: hTeamIds } } });
          }
          await tx.rubricCriterion.deleteMany({ where: { hackathonId: hId } });
          await tx.problemStatement.deleteMany({ where: { domain: { hackathonId: hId } } });
          await tx.domain.deleteMany({ where: { hackathonId: hId } });
          await tx.hackathon.delete({ where: { id: hId } });
        }
      }

      // 3. Delete user notifications and audit logs where user was actor
      await tx.notification.deleteMany({ where: { userId } });

      // 4. Delete the User record itself (cascades student, host, judge profiles)
      await tx.user.delete({
        where: { id: userId },
      });
    });

    await writeAuditLog(session.userId, "SUPER_ADMIN_DELETE_USER", "User", userId, {
      deletedUserEmail: targetUser.email,
      deletedUserName: targetUser.name,
      deletedUserRole: targetUser.role,
      adminEmail: session.email,
    });

    return NextResponse.json({
      success: true,
      message: `User ${targetUser.name} (${targetUser.email}) and all associated records permanently deleted.`,
    });
  } catch (error: any) {
    console.error("[Admin Users DELETE Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete user account" },
      { status: 500 }
    );
  }
}
