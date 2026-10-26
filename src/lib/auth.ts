import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./db";

const JWT_SECRET = process.env.JWT_SECRET || "hackbridge-default-super-secret-key-32-chars";
const COOKIE_NAME = "hackbridge_session";

export interface SessionPayload {
  userId: string;
  email: string;
  role: "STUDENT" | "HOST" | "JUDGE" | "SUPER_ADMIN";
  status: string;
  name: string;
  hackathonId?: string; // For students (HB-XXXXXX) or Judges (assigned hackathon)
  profileId?: string;
}

/**
 * Hash a plain password using bcrypt with salt factor 10
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verify a plain password against hashed password
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Sign a secure JWT session token
 */
export function signSessionToken(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

/**
 * Verify and decode a JWT session token
 */
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Extract active session payload from Next.js server cookie store
 */
export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

/**
 * Verifies role-based access control.
 * Throws an Error or returns null if user is unauthorized or unapproved.
 */
export async function requireAuth(allowedRoles?: Array<"STUDENT" | "HOST" | "JUDGE" | "SUPER_ADMIN">) {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    throw new Error("FORBIDDEN_ROLE");
  }

  // Check approval rules
  if (session.role === "HOST") {
    const host = await prisma.hostProfile.findUnique({
      where: { userId: session.userId },
    });
    if (!host || host.approvalStatus !== "APPROVED") {
      throw new Error("HOST_NOT_APPROVED");
    }
  }

  if (session.role === "JUDGE") {
    const judge = await prisma.judgeProfile.findFirst({
      where: { userId: session.userId },
    });
    if (!judge || judge.approvalStatus !== "APPROVED") {
      throw new Error("JUDGE_NOT_APPROVED");
    }
  }

  return session;
}

export { COOKIE_NAME };
