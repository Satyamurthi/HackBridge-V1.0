import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/v1/payments — Retrieve payment history for student or host
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (session.role === "STUDENT") {
      const student = await prisma.studentProfile.findUnique({
        where: { userId: session.userId },
      });

      if (!student) {
        return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
      }

      // Fetch all teams the student belongs to
      const teams = await prisma.team.findMany({
        where: {
          members: {
            some: { studentId: student.id },
          },
        },
        select: { id: true },
      });

      const teamIds = teams.map((t) => t.id);

      const payments = await prisma.payment.findMany({
        where: {
          teamId: { in: teamIds },
        },
        include: {
          team: {
            include: {
              hackathon: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  fee: true,
                  paymentMode: true,
                  qrImageUrl: true,
                  upiId: true,
                },
              },
              leadStudent: {
                include: {
                  user: {
                    select: { name: true, email: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const formatted = payments.map((p) => {
        const isLead = p.team.leadStudent.userId === session.userId;
        return {
          id: p.id,
          amount: p.amount,
          mode: p.mode,
          status: p.status,
          txnRef: p.txnRef,
          screenshotUrl: p.screenshotUrl,
          orderId: p.razorpayOrderId,
          paymentId: p.razorpayPaymentId,
          createdAt: p.createdAt,
          verifiedAt: p.verifiedAt,
          isLead,
          team: {
            id: p.team.id,
            teamId: p.team.teamId,
            name: p.team.name,
            status: p.team.status,
            hackathon: p.team.hackathon,
            lead: p.team.leadStudent.user,
          },
        };
      });

      return NextResponse.json({
        success: true,
        payments: formatted,
      });
    }

    if (session.role === "HOST") {
      const host = await prisma.hostProfile.findUnique({
        where: { userId: session.userId },
      });
      if (!host) {
        return NextResponse.json({ error: "Host profile not found" }, { status: 404 });
      }

      const payments = await prisma.payment.findMany({
        where: {
          team: {
            hackathon: { hostId: host.id },
          },
        },
        include: {
          team: {
            include: {
              hackathon: true,
              leadStudent: {
                include: {
                  user: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({
        success: true,
        payments,
      });
    }

    if (session.role === "SUPER_ADMIN") {
      const payments = await prisma.payment.findMany({
        include: {
          team: {
            include: {
              hackathon: true,
              leadStudent: {
                include: {
                  user: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({
        success: true,
        payments,
      });
    }

    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  } catch (error: any) {
    console.error("[Payments GET Error]:", error);
    return NextResponse.json({ error: "Failed to load payment history" }, { status: 500 });
  }
}
