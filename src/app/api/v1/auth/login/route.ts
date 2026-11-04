import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword, signSessionToken, COOKIE_NAME } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  role: z.enum(["STUDENT", "HOST", "JUDGE", "ADMIN", "SUPER_ADMIN"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password, role } = parsed.data;

    // 1. Find user by email with related role profiles
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        studentProfile: true,
        hostProfile: true,
        judgeProfiles: {
          include: { hackathon: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password credentials" },
        { status: 401 }
      );
    }

    // 2. Verify password
    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "This account was registered using Google. Please sign in with Google." },
        { status: 400 }
      );
    }
    const passwordMatch = await verifyPassword(password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Invalid email or password credentials" },
        { status: 401 }
      );
    }

    // Strict persona validation: Ensure only allowed role can login through specific portal
    if (role) {
      if (role === "STUDENT" && user.role !== "STUDENT") {
        return NextResponse.json(
          {
            error:
              "Access denied: This login portal is strictly reserved for Students. Please select the Host, Judge, or Admin tab to sign in.",
          },
          { status: 403 }
        );
      } else if (
        role === "HOST" &&
        user.role !== "HOST" &&
        user.role !== "SUPER_ADMIN"
      ) {
        return NextResponse.json(
          {
            error:
              "Access denied: This login portal is strictly reserved for Hackathon Hosts. Please select the Student, Judge, or Admin tab.",
          },
          { status: 403 }
        );
      } else if (
        role === "JUDGE" &&
        user.role !== "JUDGE" &&
        user.role !== "SUPER_ADMIN"
      ) {
        return NextResponse.json(
          {
            error:
              "Access denied: This login portal is strictly reserved for Evaluators & Judges. Please select your assigned portal.",
          },
          { status: 403 }
        );
      } else if (
        (role === "ADMIN" || role === "SUPER_ADMIN") &&
        user.role !== "SUPER_ADMIN"
      ) {
        return NextResponse.json(
          {
            error:
              "Access denied: This login portal is strictly for Platform Administrators.",
          },
          { status: 403 }
        );
      }
    }

    // 3. Check role status
    let hackathonId: string | undefined = undefined;
    let approvalStatus: string = user.status;

    if (user.role === "STUDENT" && user.studentProfile) {
      hackathonId = user.studentProfile.hackathonId;
    } else if (user.role === "HOST" && user.hostProfile) {
      approvalStatus = user.hostProfile.approvalStatus;
    } else if (user.role === "JUDGE" && user.judgeProfiles.length > 0) {
      approvalStatus = user.judgeProfiles[0].approvalStatus;
      hackathonId = user.judgeProfiles[0].hackathonId;
    }

    // 4. Log audit event
    await logAuditEvent({
      actorId: user.id,
      action: "USER_LOGIN",
      entity: "USER",
      entityId: user.id,
      metadata: { role: user.role, email: user.email },
    });

    // 5. Generate session token
    const token = signSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role as any,
      status: approvalStatus,
      name: user.name,
      hackathonId,
      profileId: user.studentProfile?.id || user.hostProfile?.id,
    });

    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: approvalStatus,
        hackathonId,
      },
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error("[Login Error]:", error);
    return NextResponse.json(
      { error: "Internal server error during login", message: error.message },
      { status: 500 }
    );
  }
}
