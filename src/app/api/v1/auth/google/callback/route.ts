import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signSessionToken, COOKIE_NAME } from "@/lib/auth";
import { generateHackathonId, generateHostHackId } from "@/lib/id-generator";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const googleError = searchParams.get("error");

  const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const baseUrl = appUrl.replace(/\/$/, "");

  // If user cancelled or Google returned an error
  if (googleError) {
    const errorMsg =
      googleError === "access_denied"
        ? "Google sign-in was cancelled."
        : `Google sign-in error: ${googleError}`;
    return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(errorMsg)}`);
  }

  if (!code) {
    return NextResponse.redirect(
      `${baseUrl}/login?error=${encodeURIComponent("Missing authorization code from Google.")}`
    );
  }

  // Parse state
  let statePayload = { role: "STUDENT", orgType: "", action: "login" };
  if (state) {
    try {
      const decoded = Buffer.from(state, "base64url").toString("utf-8");
      statePayload = JSON.parse(decoded);
    } catch {
      // ignore state parse error
    }
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${baseUrl}/api/v1/auth/google/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${baseUrl}/login?error=${encodeURIComponent(
        "Google OAuth credentials are not configured on this server. Check SETUP.md."
      )}`
    );
  }

  try {
    // 1. Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const tokenErr = await tokenRes.text();
      console.error("[Google OAuth Token Exchange Error]:", tokenErr);
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent(
          "Failed to exchange Google authorization code. Please try again."
        )}`
      );
    }

    const tokens = await tokenRes.json();

    // 2. Fetch Google user profile info
    const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userinfoRes.ok) {
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent("Failed to retrieve Google user profile.")}`
      );
    }

    const googleUser = await userinfoRes.json();
    const email = googleUser.email?.toLowerCase().trim();
    const googleId = googleUser.sub;
    const name = googleUser.name || "Google User";
    const avatarUrl = googleUser.picture || null;

    if (!email) {
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent("No email address provided by Google account.")}`
      );
    }

    if (!googleUser.email_verified) {
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent(
          "Unverified Google accounts are not permitted for security compliance."
        )}`
      );
    }

interface UserSessionRecord {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  avatarUrl?: string | null;
  googleId?: string | null;
  provider?: string | null;
  studentProfile?: {
    id: string;
    hackathonId: string;
    college?: string | null;
  } | null;
  hostProfile?: {
    id: string;
    hackId?: string | null;
  } | null;
  judgeProfiles?: any[];
}

    // 3. Lookup existing user by googleId or email
    let user: UserSessionRecord | null = await (prisma.user as any).findFirst({
      where: {
        OR: [{ googleId }, { email }],
      },
      include: {
        studentProfile: true,
        hostProfile: true,
        judgeProfiles: true,
      },
    });

    let targetRedirect = "/dashboard/student";

    if (user) {
      // Returning user: link Google ID if missing
      if (!user.googleId) {
        user = await (prisma.user as any).update({
          where: { id: user.id },
          data: {
            googleId,
            provider: user.provider || "google",
            avatarUrl: user.avatarUrl || avatarUrl,
          },
          include: {
            studentProfile: true,
            hostProfile: true,
            judgeProfiles: true,
          },
        });
      }

      if (user) {
        await writeAuditLog(user.id, "GOOGLE_LOGIN", "User", user.id, {
          email: user.email,
          role: user.role,
        });

        // Role-specific redirect
        if (user.role === "SUPER_ADMIN") {
          targetRedirect = "/dashboard/admin";
        } else if (user.role === "HOST") {
          targetRedirect = "/dashboard/host";
        } else if (user.role === "JUDGE") {
          targetRedirect = "/dashboard/judge";
        } else {
          targetRedirect = "/dashboard/student";
        }
      }
    } else {
      // New user registration via Google OAuth
      const requestedRole = statePayload.role || "STUDENT";

      if (requestedRole === "HOST") {
        // Generate permanent Host ID
        let assignedHostId = "";
        let isHostUnique = false;
        while (!isHostUnique) {
          assignedHostId = generateHostHackId();
          const existing = await prisma.hostProfile.findUnique({
            where: { hackId: assignedHostId },
          });
          if (!existing) isHostUnique = true;
        }

        user = await (prisma.user as any).create({
          data: {
            email,
            name,
            role: "HOST",
            status: "PENDING",
            avatarUrl,
            googleId,
            provider: "google",
            hostProfile: {
              create: {
                orgName: `${name}'s Organization`,
                type: (statePayload.orgType || "college").toLowerCase(),
                hackId: assignedHostId,
                approvalStatus: "PENDING",
              },
            },
          },
          include: { hostProfile: true, studentProfile: true, judgeProfiles: true },
        });

        if (user) {
          await writeAuditLog(user.id, "GOOGLE_SIGNUP_HOST_PENDING", "User", user.id, {
            email,
            hackId: assignedHostId,
          });
        }

        targetRedirect = "/dashboard/host";
      } else if (requestedRole === "JUDGE") {
        user = await (prisma.user as any).create({
          data: {
            email,
            name,
            role: "JUDGE",
            status: "PENDING",
            avatarUrl,
            googleId,
            provider: "google",
          },
          include: { judgeProfiles: true, hostProfile: true, studentProfile: true },
        });

        if (user) {
          await writeAuditLog(user.id, "GOOGLE_SIGNUP_JUDGE_PENDING", "User", user.id, { email });
        }
        targetRedirect = "/dashboard/judge";
      } else {
        // Default to STUDENT role
        let assignedHackathonId = "";
        let isUnique = false;
        while (!isUnique) {
          assignedHackathonId = generateHackathonId();
          const existing = await prisma.studentProfile.findUnique({
            where: { hackathonId: assignedHackathonId },
          });
          if (!existing) isUnique = true;
        }

        user = await (prisma.user as any).create({
          data: {
            email,
            name,
            role: "STUDENT",
            status: "ACTIVE",
            avatarUrl,
            googleId,
            provider: "google",
            studentProfile: {
              create: {
                hackathonId: assignedHackathonId,
                college: "", // Uncompleted profile
              },
            },
          },
          include: { studentProfile: true, hostProfile: true, judgeProfiles: true },
        });

        if (user) {
          await writeAuditLog(user.id, "GOOGLE_SIGNUP_STUDENT", "User", user.id, {
            email,
            hackathonId: assignedHackathonId,
          });
        }

        // Redirect new student to profile completion
        targetRedirect = "/dashboard/student/profile?complete=true&new=true";
      }
    }

    if (!user) {
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent("Failed to establish user record.")}`
      );
    }

    // 4. Sign JWT session cookie
    const token = signSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role as any,
      status: user.status,
      name: user.name,
      hackathonId: user.studentProfile?.hackathonId,
      profileId: user.studentProfile?.id || user.hostProfile?.id,
    });

    const response = NextResponse.redirect(`${baseUrl}${targetRedirect}`);
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error("[Google OAuth Callback Error]:", error);
    return NextResponse.redirect(
      `${baseUrl}/login?error=${encodeURIComponent(
        "An unexpected error occurred during Google authentication."
      )}`
    );
  }
}
