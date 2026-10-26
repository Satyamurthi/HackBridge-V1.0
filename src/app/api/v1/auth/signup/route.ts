import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, signSessionToken, COOKIE_NAME } from "@/lib/auth";
import { generateHackathonId } from "@/lib/id-generator";
import { logAuditEvent } from "@/lib/audit";

const SignupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
  role: z.enum(["STUDENT", "HOST", "JUDGE"]),
  
  // Student specific fields
  college: z.string().optional(),
  githubUsername: z.string().optional(),
  skills: z.string().optional(),

  // Host specific fields
  orgName: z.string().optional(),
  orgType: z.enum(["college", "company"]).optional(),
  website: z.string().optional(),
  bio: z.string().optional(),

  // Judge specific fields
  hackathonId: z.string().optional(),
  designation: z.string().optional(),
  company: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = SignupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      email,
      password,
      name,
      phone,
      role,
      college,
      githubUsername,
      skills,
      orgName,
      orgType,
      website,
      bio,
      hackathonId,
      designation,
      company,
    } = parsed.data;

    // 1. Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // 2. Hash password
    const passwordHash = await hashPassword(password);

    // 3. Process role-specific validation & entity creation
    if (role === "STUDENT") {
      if (!college || college.trim().length === 0) {
        return NextResponse.json(
          { error: "College name is required for student registration" },
          { status: 400 }
        );
      }

      // Generate unique Hackathon ID
      let assignedHackathonId = "";
      let isUnique = false;
      while (!isUnique) {
        assignedHackathonId = generateHackathonId();
        const existingStudent = await prisma.studentProfile.findUnique({
          where: { hackathonId: assignedHackathonId },
        });
        if (!existingStudent) isUnique = true;
      }

      // Create student and profile
      const newUser = await prisma.user.create({
        data: {
          email: email.toLowerCase().trim(),
          passwordHash,
          name,
          phone,
          role: "STUDENT",
          status: "ACTIVE",
          studentProfile: {
            create: {
              hackathonId: assignedHackathonId,
              college,
              githubUsername,
              skills,
            },
          },
        },
        include: { studentProfile: true },
      });

      // Audit log
      await logAuditEvent({
        actorId: newUser.id,
        action: "STUDENT_SIGNUP",
        entity: "USER",
        entityId: newUser.id,
        metadata: { hackathonId: assignedHackathonId },
      });

      // Issue session token
      const token = signSessionToken({
        userId: newUser.id,
        email: newUser.email,
        role: "STUDENT",
        status: "ACTIVE",
        name: newUser.name,
        hackathonId: assignedHackathonId,
        profileId: newUser.studentProfile?.id,
      });

      const response = NextResponse.json({
        success: true,
        message: "Student account created successfully",
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          hackathonId: assignedHackathonId,
        },
      });

      response.cookies.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      });

      return response;
    }

    if (role === "HOST") {
      if (!orgName || !orgType) {
        return NextResponse.json(
          { error: "Organization name and type (college or company) are required" },
          { status: 400 }
        );
      }

      // Host starts in PENDING status until approved by Super Admin
      const newUser = await prisma.user.create({
        data: {
          email: email.toLowerCase().trim(),
          passwordHash,
          name,
          phone,
          role: "HOST",
          status: "PENDING",
          hostProfile: {
            create: {
              orgName,
              type: orgType,
              approvalStatus: "PENDING",
              website,
              bio,
            },
          },
        },
        include: { hostProfile: true },
      });

      await logAuditEvent({
        actorId: newUser.id,
        action: "HOST_SIGNUP_PENDING",
        entity: "HOST",
        entityId: newUser.hostProfile!.id,
        metadata: { orgName, orgType },
      });

      const token = signSessionToken({
        userId: newUser.id,
        email: newUser.email,
        role: "HOST",
        status: "PENDING",
        name: newUser.name,
        profileId: newUser.hostProfile?.id,
      });

      const response = NextResponse.json({
        success: true,
        message: "Host registration received. Account is pending super admin approval.",
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          approvalStatus: "PENDING",
        },
      });

      response.cookies.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      });

      return response;
    }

    if (role === "JUDGE") {
      if (!hackathonId) {
        return NextResponse.json(
          { error: "Judge registration requires a valid Hackathon ID" },
          { status: 400 }
        );
      }

      // Verify that the hackathon exists
      const targetHackathon = await prisma.hackathon.findFirst({
        where: {
          OR: [{ id: hackathonId }, { slug: hackathonId }],
        },
      });

      if (!targetHackathon) {
        return NextResponse.json(
          { error: "Invalid Hackathon ID. No active hackathon found matching this identifier." },
          { status: 404 }
        );
      }

      // Create Judge user pending host approval
      const newUser = await prisma.user.create({
        data: {
          email: email.toLowerCase().trim(),
          passwordHash,
          name,
          phone,
          role: "JUDGE",
          status: "ACTIVE",
          judgeProfiles: {
            create: {
              hackathonId: targetHackathon.id,
              approvalStatus: "PENDING",
              designation,
              company,
            },
          },
        },
      });

      await logAuditEvent({
        actorId: newUser.id,
        action: "JUDGE_REGISTRATION_REQUESTED",
        entity: "JUDGE",
        entityId: targetHackathon.id,
        metadata: { hackathonTitle: targetHackathon.title },
      });

      const token = signSessionToken({
        userId: newUser.id,
        email: newUser.email,
        role: "JUDGE",
        status: "ACTIVE",
        name: newUser.name,
        hackathonId: targetHackathon.id,
      });

      const response = NextResponse.json({
        success: true,
        message: "Judge registration submitted. Awaiting approval by the hackathon host.",
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          approvalStatus: "PENDING",
          hackathonTitle: targetHackathon.title,
        },
      });

      response.cookies.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      });

      return response;
    }

    return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
  } catch (error: any) {
    console.error("[Signup Error]:", error);
    return NextResponse.json(
      { error: "Internal server error during registration", message: error.message },
      { status: 500 }
    );
  }
}
