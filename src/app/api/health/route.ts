import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/health — Automated production health & telemetry check
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  let dbStatus = "unreachable";
  let dbLatencyMs = -1;

  try {
    const dbStart = Date.now();
    await prisma.user.count();
    dbLatencyMs = Date.now() - dbStart;
    dbStatus = "healthy";
  } catch (error: any) {
    console.error("[Health Check Database Error]:", error);
    dbStatus = "error";
  }

  const isHealthy = dbStatus === "healthy";
  const statusCode = isHealthy ? 200 : 503;

  const memory = process.memoryUsage();

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      totalLatencyMs: Date.now() - startTime,
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        engine: process.env.DATABASE_URL?.startsWith("postgres") ? "PostgreSQL" : "SQLite",
      },
      system: {
        nodeVersion: process.version,
        memoryUsageMB: {
          heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
          rss: Math.round(memory.rss / 1024 / 1024),
        },
      },
      integrations: {
        jwtConfigured: Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 16),
        razorpayConfigured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
        githubConfigured: Boolean(process.env.GITHUB_TOKEN),
      },
    },
    { status: statusCode }
  );
}
