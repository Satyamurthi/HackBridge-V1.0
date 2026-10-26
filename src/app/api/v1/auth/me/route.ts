import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // Refresh user state from database
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        studentProfile: true,
        hostProfile: true,
        judgeProfiles: {
          include: { hackathon: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    let hackathonId = session.hackathonId;
    let approvalStatus = user.status;

    if (user.role === "STUDENT" && user.studentProfile) {
      hackathonId = user.studentProfile.hackathonId;
    } else if (user.role === "HOST" && user.hostProfile) {
      approvalStatus = user.hostProfile.approvalStatus;
    } else if (user.role === "JUDGE" && user.judgeProfiles.length > 0) {
      approvalStatus = user.judgeProfiles[0].approvalStatus;
      hackathonId = user.judgeProfiles[0].hackathonId;
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: approvalStatus,
        hackathonId,
        studentProfile: user.studentProfile,
        hostProfile: user.hostProfile,
        judgeProfiles: user.judgeProfiles,
      },
    });
  } catch (error: any) {
    console.error("[Me Error]:", error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
