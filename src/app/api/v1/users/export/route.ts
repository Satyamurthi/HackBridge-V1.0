import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET /api/v1/users/export — India DPDP Act compliant self-service personal data export
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const userId = session.userId;

    // Fetch complete user graph
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        phone: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        studentProfile: {
          include: {
            teamMemberships: {
              include: {
                team: {
                  include: {
                    hackathon: {
                      select: {
                        id: true,
                        title: true,
                        slug: true,
                        startAt: true,
                        endAt: true,
                      },
                    },
                    payment: {
                      select: {
                        id: true,
                        mode: true,
                        amount: true,
                        status: true,
                        txnRef: true,
                        createdAt: true,
                      },
                    },
                    codeRepo: {
                      select: {
                        githubRepoUrl: true,
                        lastPushAt: true,
                      },
                    },
                    submission: {
                      select: {
                        link: true,
                        description: true,
                        submittedAt: true,
                        locked: true,
                      },
                    },
                    result: {
                      select: {
                        rank: true,
                        award: true,
                        prize: true,
                        publishedAt: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        hostProfile: {
          include: {
            hackathons: {
              select: {
                id: true,
                title: true,
                slug: true,
                fee: true,
                paymentMode: true,
                status: true,
                startAt: true,
                endAt: true,
                createdAt: true,
              },
            },
          },
        },
        judgeProfiles: {
          include: {
            hackathon: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
          },
        },
        notifications: {
          select: {
            id: true,
            type: true,
            payload: true,
            readAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User record not found" }, { status: 404 });
    }

    // Fetch user's audit trail (actions performed)
    const auditLogs = await prisma.auditLog.findMany({
      where: { actorId: userId },
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        metadata: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const exportTimestamp = new Date().toISOString();
    const exportId = crypto.randomUUID();

    const dataManifest = {
      compliance: {
        framework: "Digital Personal Data Protection Act, 2023 (India DPDP Act)",
        provision: "Section 12: Right to Access and Data Portability for Data Principals",
        exportId,
        exportedAt: exportTimestamp,
        dataFiduciary: "HackBridge Platform Inc.",
      },
      dataPrincipal: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        accountStatus: user.status,
        phone: user.phone,
        joinedAt: user.createdAt,
        lastProfileUpdate: user.updatedAt,
      },
      profiles: {
        student: user.studentProfile
          ? {
              hackathonId: user.studentProfile.hackathonId,
              college: user.studentProfile.college,
              githubUsername: user.studentProfile.githubUsername,
              bio: user.studentProfile.bio,
              skills: user.studentProfile.skills,
            }
          : null,
        host: user.hostProfile
          ? {
              orgName: user.hostProfile.orgName,
              type: user.hostProfile.type,
              approvalStatus: user.hostProfile.approvalStatus,
              website: user.hostProfile.website,
              hackathonsCreated: user.hostProfile.hackathons,
            }
          : null,
        judge: user.judgeProfiles.map((j) => ({
          hackathonId: j.hackathonId,
          hackathonTitle: j.hackathon.title,
          approvalStatus: j.approvalStatus,
          designation: j.designation,
          company: j.company,
        })),
      },
      participations: user.studentProfile
        ? user.studentProfile.teamMemberships.map((tm) => ({
            membershipRole: tm.role,
            joinedAt: tm.joinedAt,
            team: {
              id: tm.team.id,
              teamId: tm.team.teamId,
              name: tm.team.name,
              status: tm.team.status,
              hackathon: tm.team.hackathon,
              payment: tm.team.payment,
              repository: tm.team.codeRepo,
              submission: tm.team.submission,
              result: tm.team.result,
            },
          }))
        : [],
      notifications: user.notifications.map((n) => {
        let parsed = n.payload;
        try {
          parsed = JSON.parse(n.payload);
        } catch {}
        return {
          id: n.id,
          type: n.type,
          payload: parsed,
          readAt: n.readAt,
          createdAt: n.createdAt,
        };
      }),
      auditTrail: auditLogs,
    };

    // Audit log the export itself
    await writeAuditLog(userId, "DPDP_DATA_EXPORT_REQUESTED", "user", userId, {
      exportId,
      exportedAt: exportTimestamp,
      role: user.role,
    });

    const filename = `hackbridge-data-export-${user.role.toLowerCase()}-${exportId.slice(0, 8)}.json`;

    return new NextResponse(JSON.stringify(dataManifest, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-DPDP-Export-ID": exportId,
      },
    });
  } catch (error: any) {
    console.error("[DPDP Data Export Error]:", error);
    return NextResponse.json({ error: "Failed to generate personal data export" }, { status: 500 });
  }
}
