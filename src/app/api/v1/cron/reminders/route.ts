import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createBulkNotifications } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// GET or POST /api/v1/cron/reminders — Scheduled worker for 30-minute progress interval checks
export async function GET(req: NextRequest) {
  return handleReminders(req);
}

export async function POST(req: NextRequest) {
  return handleReminders(req);
}

async function handleReminders(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Optional secret guard in production
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized cron trigger" }, { status: 401 });
    }

    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    // Find hackathons active right now
    const activeHackathons = await prisma.hackathon.findMany({
      where: {
        status: "PUBLISHED",
        startAt: { lte: now },
        endAt: { gt: now },
      },
      include: {
        teams: {
          where: {
            status: "ACTIVE",
          },
          include: {
            members: {
              include: {
                student: true,
              },
            },
            progressUpdates: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
            submission: {
              select: { locked: true },
            },
          },
        },
      },
    });

    let remindersDispatched = 0;
    let teamsOverdue = 0;

    for (const hackathon of activeHackathons) {
      for (const team of hackathon.teams) {
        // Skip teams that have already submitted
        if (team.submission?.locked) {
          continue;
        }

        const latestUpdate = team.progressUpdates[0];
        const isOverdue =
          !latestUpdate || new Date(latestUpdate.createdAt) < thirtyMinutesAgo;

        if (isOverdue) {
          teamsOverdue++;
          const studentUserIds = team.members.map((m) => m.student.userId);

          const dispatched = await createBulkNotifications(
            studentUserIds,
            "PROGRESS_REMINDER",
            {
              title: `Milestone Reminder: ${team.name}`,
              message: `It has been over 30 minutes since your team logged a milestone progress update in "${hackathon.title}". Please log your current 10% checkpoint.`,
              link: `/dashboard/student/arena/${team.id}`,
              metadata: {
                teamId: team.id,
                hackathonId: hackathon.id,
                currentPercent: latestUpdate?.percent || 0,
              },
            }
          );

          remindersDispatched += dispatched;
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      activeHackathonsCount: activeHackathons.length,
      teamsOverdue,
      remindersDispatched,
    });
  } catch (error: any) {
    console.error("[Cron Reminders Error]:", error);
    return NextResponse.json({ error: "Failed to run reminder schedule" }, { status: 500 });
  }
}
