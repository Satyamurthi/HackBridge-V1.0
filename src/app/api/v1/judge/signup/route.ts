import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

// POST /api/v1/judge/signup — Judge applies to judge a specific hackathon (PRD Rule 5)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "JUDGE" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Judge authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const { hackathonId, designation, company } = body;

    if (!hackathonId) {
      return NextResponse.json(
        { error: "PRD Rule 5: A judge must provide a valid hackathon ID to apply" },
        { status: 400 }
      );
    }

    // Verify hackathon exists
    const hackathon = await prisma.hackathon.findFirst({
      where: {
        OR: [{ id: hackathonId }, { slug: hackathonId }],
      },
    });

    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }

    // Check if judge application already exists for this hackathon
    const existing = await prisma.judgeProfile.findUnique({
      where: {
        userId_hackathonId: {
          userId: session.userId,
          hackathonId: hackathon.id,
        },
      },
    });

    if (existing) {
      return NextResponse.json({
        judge: existing,
        message: `You have already applied to judge this track. Status: ${existing.approvalStatus}`,
      });
    }

    // PRD Rule 5: Judge starts with PENDING status until approved by the host
    const judge = await prisma.judgeProfile.create({
      data: {
        userId: session.userId,
        hackathonId: hackathon.id,
        approvalStatus: "PENDING",
        designation: designation?.trim() || null,
        company: company?.trim() || null,
      },
    });

    await writeAuditLog(session.userId, "JUDGE_APPLICATION_SUBMITTED", "judge", judge.id, {
      hackathonTitle: hackathon.title,
      hackathonId: hackathon.id,
      company: company?.trim() || null,
    });

    return NextResponse.json(
      {
        judge,
        message: "Judge application submitted successfully. Pending host approval.",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Judge Signup Error]:", error);
    return NextResponse.json({ error: "Failed to submit judge application" }, { status: 500 });
  }
}
