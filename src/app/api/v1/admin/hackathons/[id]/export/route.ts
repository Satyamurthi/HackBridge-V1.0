import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, verifySessionToken } from "@/lib/auth";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/hackathons/[id]/export
 * Generates an Excel workbook (.xlsx) containing comprehensive sheets:
 * 1. Teams & Squads (with lead, domain, payment UTR, problem statement, progress)
 * 2. Students & Participants (with HB-XXXXXX ID, college, degree, contact, team role)
 * 3. Domains & Problem Statements (with cap, difficulty, allocated count, reveal time)
 * 4. Judges & Evaluation (with approval status, designation, scoring activity)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    let session = await getSession();
    if (!session) {
      const cookieHeader = req.headers.get("cookie");
      if (cookieHeader) {
        const match = cookieHeader.match(/hackbridge_session=([^;]+)/);
        if (match) {
          session = verifySessionToken(match[1]);
        }
      }
    }

    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized. Super Admin clearance required for data export." },
        { status: 403 }
      );
    }

    const { id } = params;

    // Fetch hackathon with complete relational trees
    const hackathon = await prisma.hackathon.findUnique({
      where: { id },
      include: {
        host: {
          include: {
            user: { select: { name: true, email: true, phone: true } },
          },
        },
        domains: {
          include: {
            problemStatements: {
              include: {
                teams: { select: { id: true } },
              },
            },
          },
        },
        teams: {
          include: {
            leadStudent: {
              include: {
                user: { select: { name: true, email: true, phone: true } },
              },
            },
            domain: true,
            problemStatement: true,
            payment: true,
            members: {
              include: {
                student: {
                  include: {
                    user: { select: { name: true, email: true, phone: true, status: true, createdAt: true } },
                  },
                },
              },
            },
            progressUpdates: {
              orderBy: { percent: "desc" },
              take: 1,
            },
            codeRepo: true,
            submission: true,
          },
        },
        judges: {
          include: {
            user: { select: { name: true, email: true } },
            scores: true,
          },
        },
      },
    });

    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon arena not found" }, { status: 404 });
    }

    // 1. Prepare Teams Data Sheet
    const teamsRows = hackathon.teams.map((t) => {
      const maxProgress = t.progressUpdates[0]?.combinedPercent ?? t.progressUpdates[0]?.percent ?? 0;
      return {
        "Team ID": t.teamId || "PENDING",
        "Squad Name": t.name,
        "Domain": t.domain?.name || "General",
        "Problem Statement": t.problemStatement?.title || "Not Selected",
        "Status": t.status,
        "Member Count": t.members.length,
        "Lead Name": t.leadStudent?.user?.name || "N/A",
        "Lead Email": t.leadStudent?.user?.email || "N/A",
        "Lead Phone": t.leadStudent?.user?.phone || "N/A",
        "Lead Student ID": t.leadStudent?.hackathonId || "N/A",
        "College": t.leadStudent?.college || "N/A",
        "Payment Status": t.payment?.status || "UNPAID",
        "Payment Mode": t.payment?.mode || "N/A",
        "Transaction ID / UTR": t.payment?.txnRef || "N/A",
        "Amount (INR)": t.payment?.amount ?? hackathon.fee,
        "Latest Progress %": `${maxProgress}%`,
        "GitHub Repo": t.codeRepo?.githubRepoUrl || t.codeRepo?.storagePath || "Not Linked",
        "Submission Status": t.submission ? "SUBMITTED" : "IN_PROGRESS",
        "Submission Description / Link": t.submission?.description || t.submission?.link || "N/A",
        "Registered At": t.createdAt.toISOString(),
      };
    });

    // 2. Prepare Students Data Sheet
    const studentsRows: any[] = [];
    const seenStudentIds = new Set<string>();

    for (const t of hackathon.teams) {
      for (const m of t.members) {
        const s = m.student;
        if (!s || seenStudentIds.has(s.id)) continue;
        seenStudentIds.add(s.id);

        studentsRows.push({
          "Student ID": s.hackathonId,
          "Full Name": s.user.name,
          "Email": s.user.email,
          "Phone": s.user.phone || "N/A",
          "College": s.college,
          "Skills": s.skills || "N/A",
          "Team ID": t.teamId || "PENDING",
          "Squad Name": t.name,
          "Domain": t.domain?.name || "General",
          "Role": m.role,
          "Account Status": s.user.status,
          "Registered At": s.user.createdAt.toISOString(),
        });
      }
    }

    // Sort students by Squad Name, then Role
    studentsRows.sort((a, b) => {
      if (a["Squad Name"] === b["Squad Name"]) {
        return a.Role === "LEAD" ? -1 : 1;
      }
      return a["Squad Name"].localeCompare(b["Squad Name"]);
    });

    // 3. Prepare Domains & Problems Data Sheet
    const problemsRows: any[] = [];
    for (const d of hackathon.domains) {
      if (d.problemStatements.length === 0) {
        problemsRows.push({
          "Domain Name": d.name,
          "Reveal Time (IST)": new Date(d.revealAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
          "Problem Statement Title": "No statements added yet",
          "Difficulty": "N/A",
          "Cap (Slots)": "N/A",
          "Allocated Squads": 0,
          "Slots Remaining": "N/A",
          "Attachment": "N/A",
          "Description": d.description || "",
        });
      } else {
        for (const ps of d.problemStatements) {
          const allocated = ps.teams.length;
          const slotsLeft = ps.cap > 0 ? Math.max(0, ps.cap - allocated) : "Unlimited";
          problemsRows.push({
            "Domain Name": d.name,
            "Reveal Time (IST)": new Date(d.revealAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
            "Problem Statement Title": ps.title,
            "Difficulty": ps.difficulty,
            "Cap (Slots)": ps.cap > 0 ? ps.cap : "Unlimited",
            "Allocated Squads": allocated,
            "Slots Remaining": slotsLeft,
            "Attachment": ps.attachmentUrl || "None",
            "Description": ps.description,
          });
        }
      }
    }

    // 4. Prepare Judges & Evaluation Sheet
    const judgesRows = hackathon.judges.map((j) => {
      const scoresGiven = j.scores.length;
      const avgScore = scoresGiven > 0
        ? (j.scores.reduce((sum, s) => sum + s.score, 0) / scoresGiven).toFixed(2)
        : "N/A";

      return {
        "Judge Name": j.user.name,
        "Email": j.user.email,
        "Company / Organization": j.company || "N/A",
        "Designation": j.designation || "Evaluator",
        "Approval Status": j.approvalStatus,
        "Hackathon Title": hackathon.title,
        "Squads Evaluated": scoresGiven,
        "Average Score": avgScore,
        "Joined At": j.createdAt.toISOString(),
      };
    });

    // Build XLSX Workbook
    const workbook = XLSX.utils.book_new();

    const wsTeams = XLSX.utils.json_to_sheet(teamsRows);
    const wsStudents = XLSX.utils.json_to_sheet(studentsRows);
    const wsProblems = XLSX.utils.json_to_sheet(problemsRows);
    const wsJudges = XLSX.utils.json_to_sheet(judgesRows);

    // Set auto-fit column widths
    const setColWidths = (ws: any, rows: any[]) => {
      if (rows.length === 0) return;
      const keys = Object.keys(rows[0]);
      ws["!cols"] = keys.map((key) => {
        let maxLen = key.length;
        for (const row of rows) {
          const val = row[key] ? String(row[key]) : "";
          if (val.length > maxLen) maxLen = Math.min(val.length, 40);
        }
        return { wch: Math.max(maxLen + 2, 12) };
      });
    };

    setColWidths(wsTeams, teamsRows);
    setColWidths(wsStudents, studentsRows);
    setColWidths(wsProblems, problemsRows);
    setColWidths(wsJudges, judgesRows);

    XLSX.utils.book_append_sheet(workbook, wsTeams, "Teams & Squads");
    XLSX.utils.book_append_sheet(workbook, wsStudents, "Students & Participants");
    XLSX.utils.book_append_sheet(workbook, wsProblems, "Problem Statements");
    XLSX.utils.book_append_sheet(workbook, wsJudges, "Judges & Scoring");

    // Write to Excel buffer
    const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // File name sanitized
    const safeTitle = hackathon.title.replace(/[^a-zA-Z0-9_-]/g, "_");
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `${safeTitle}_Complete_Export_${dateStr}.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("Failed to export hackathon data:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate Excel export" },
      { status: 500 }
    );
  }
}
