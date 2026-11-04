import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

// GET /api/v1/host/hackathons/[hackathonId]/export?type=participants|judges|payments|all
export async function GET(
  req: NextRequest,
  { params }: { params: { hackathonId?: string; id?: string } }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "HOST" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Host or Admin access required" }, { status: 403 });
    }

    const id = params.hackathonId || params.id;
    if (!id) {
      return NextResponse.json({ error: "Hackathon ID required" }, { status: 400 });
    }
    const { searchParams } = new URL(req.url);
    const exportType = (searchParams.get("type") || "all").toLowerCase();

    // Fetch hackathon details and verify host ownership
    const hackathon = await prisma.hackathon.findUnique({
      where: { id },
      include: {
        host: true,
      },
    });

    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }

    if (session.role === "HOST") {
      const hostProfile = await prisma.hostProfile.findUnique({
        where: { userId: session.userId },
      });
      if (!hostProfile || hackathon.hostId !== hostProfile.id) {
        return NextResponse.json(
          { error: "Unauthorized access to this hackathon" },
          { status: 403 }
        );
      }
    }

    const wb = XLSX.utils.book_new();
    const safeTitle = hackathon.title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30);

    // 1. PARTICIPANTS EXPORT
    if (exportType === "participants" || exportType === "all") {
      const teams = await prisma.team.findMany({
        where: { hackathonId: id },
        include: {
          leadStudent: {
            include: {
              user: true,
            },
          },
          members: {
            include: {
              student: {
                include: {
                  user: true,
                },
              },
            },
          },
          domain: true,
          problemStatement: true,
          submission: true,
          payment: true,
        },
        orderBy: { createdAt: "asc" },
      });

      // Sheet 1A: Complete Details of Team-wise Participants (Each Member Row with complete context)
      const participantsRows: any[] = [];
      const teamsSummaryRows: any[] = [];

      teams.forEach((t, tIndex) => {
        const latestPayment = t.payment;
        const paymentStatus = latestPayment ? latestPayment.status : (hackathon.fee === 0 ? "FREE_ENTRY" : "UNPAID");
        const utrNumber = latestPayment?.txnRef || "";

        teamsSummaryRows.push({
          "S.No": tIndex + 1,
          "Team ID": t.teamId || t.id,
          "Team Name": t.name,
          "Team Status": t.status,
          "Leader Name": t.leadStudent?.user?.name || "N/A",
          "Leader Email": t.leadStudent?.user?.email || "N/A",
          "Leader Phone": t.leadStudent?.user?.phone || "N/A",
          "Leader College": t.leadStudent?.college || "N/A",
          "Total Members": (t.members.length || 0) + (t.leadStudent ? 1 : 0),
          "Domain Track": t.domain?.name || "General Track",
          "Problem Statement": t.problemStatement?.title || "Not Assigned Yet",
          "Submission Status": t.submission ? (t.submission.locked ? "Submitted (Locked)" : "Draft") : "Not Submitted",
          "Submission Link": t.submission?.link || t.submission?.fileUrl || "",
          "Payment Status": paymentStatus,
          "Submitted UTR / Txn Ref": utrNumber,
          "Registration Date": new Date(t.createdAt).toLocaleString("en-IN"),
        });

        // Add Team Leader
        if (t.leadStudent) {
          participantsRows.push({
            "Team ID": t.teamId || t.id,
            "Team Name": t.name,
            "Role": "Leader",
            "Student Name": t.leadStudent.user?.name || "N/A",
            "Student Email": t.leadStudent.user?.email || "N/A",
            "Student Phone": t.leadStudent.user?.phone || "N/A",
            "Permanent HB ID": t.leadStudent.hackathonId || "N/A",
            "College / University": t.leadStudent.college || "N/A",
            "GitHub Username": t.leadStudent.githubUsername || "",
            "Skills": t.leadStudent.skills || "",
            "Domain Track": t.domain?.name || "General Track",
            "Problem Statement": t.problemStatement?.title || "Not Assigned",
            "Payment Status": paymentStatus,
            "UTR / Txn Ref": utrNumber,
            "Team Status": t.status,
            "Joined At": new Date(t.createdAt).toLocaleString("en-IN"),
          });
        }

        // Add Team Members
        t.members.forEach((m) => {
          if (m.student) {
            participantsRows.push({
              "Team ID": t.teamId || t.id,
              "Team Name": t.name,
              "Role": "Member",
              "Student Name": m.student.user?.name || "N/A",
              "Student Email": m.student.user?.email || "N/A",
              "Student Phone": m.student.user?.phone || "N/A",
              "Permanent HB ID": m.student.hackathonId || "N/A",
              "College / University": m.student.college || "N/A",
              "GitHub Username": m.student.githubUsername || "",
              "Skills": m.student.skills || "",
              "Domain Track": t.domain?.name || "General Track",
              "Problem Statement": t.problemStatement?.title || "Not Assigned",
              "Payment Status": paymentStatus,
              "UTR / Txn Ref": utrNumber,
              "Team Status": t.status,
              "Joined At": new Date(m.joinedAt || t.createdAt).toLocaleString("en-IN"),
            });
          }
        });
      });

      const wsParticipants = XLSX.utils.json_to_sheet(participantsRows);
      XLSX.utils.book_append_sheet(wb, wsParticipants, "Team-Wise Participants");

      const wsTeams = XLSX.utils.json_to_sheet(teamsSummaryRows);
      XLSX.utils.book_append_sheet(wb, wsTeams, "Squads Overview");
    }

    // 2. JUDGES EXPORT
    if (exportType === "judges" || exportType === "all") {
      const judges = await prisma.judgeProfile.findMany({
        where: { hackathonId: id },
        include: {
          user: true,
        },
        orderBy: { createdAt: "asc" },
      });

      const judgesRows = judges.map((j, idx) => ({
        "S.No": idx + 1,
        "Judge Profile ID": j.id,
        "Name": j.user.name,
        "Email": j.user.email,
        "Phone": j.user.phone || "N/A",
        "Designation": j.designation || "Technical Evaluator",
        "Company / Organization": j.company || "Independent",
        "Assigned Domain Track": j.domain || "All Domains",
        "Approval Status": j.approvalStatus,
        "Assigned Date": new Date(j.createdAt).toLocaleString("en-IN"),
      }));

      const wsJudges = XLSX.utils.json_to_sheet(judgesRows);
      XLSX.utils.book_append_sheet(wb, wsJudges, "Judges Roster");
    }

    // 3. PAYMENT QUEUE EXPORT
    if (exportType === "payments" || exportType === "all") {
      const payments = await prisma.payment.findMany({
        where: {
          team: { hackathonId: id },
        },
        include: {
          team: {
            include: {
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

      const paymentRows = payments.map((p, idx) => ({
        "S.No": idx + 1,
        "Payment ID": p.id,
        "Team ID": p.team.teamId || p.team.id,
        "Team Name": p.team.name,
        "Team Leader": p.team.leadStudent?.user?.name || "N/A",
        "Leader Email": p.team.leadStudent?.user?.email || "N/A",
        "Leader Phone": p.team.leadStudent?.user?.phone || "N/A",
        "Amount (INR)": p.amount,
        "Payment Mode": p.mode,
        "Submitted UTR / Txn Ref": p.txnRef || "N/A",
        "Bank Verified UTR": p.status === "VERIFIED" ? (p.txnRef || "VERIFIED") : "UNVERIFIED",
        "Payment Status": p.status,
        "Payment Screenshot URL": p.screenshotUrl || "N/A",
        "Submitted Timestamp": new Date(p.createdAt).toLocaleString("en-IN"),
        "Verified Timestamp": p.verifiedAt ? new Date(p.verifiedAt).toLocaleString("en-IN") : "Pending",
      }));

      const wsPayments = XLSX.utils.json_to_sheet(paymentRows);
      XLSX.utils.book_append_sheet(wb, wsPayments, "Payment Queue");
    }

    const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const filename = `${safeTitle}_${exportType}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("[Hackathon Export Error]:", error);
    return NextResponse.json({ error: "Failed to generate Excel export" }, { status: 500 });
  }
}
