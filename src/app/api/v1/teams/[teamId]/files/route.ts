import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sanitizeFolderName, OP_BASE_STORAGE_DIR } from "@/lib/github-push";

export const dynamic = "force-dynamic";

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function getContentType(ext: string): string {
  switch (ext.toLowerCase()) {
    case ".pdf":
      return "application/pdf";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case ".pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case ".zip":
      return "application/zip";
    case ".json":
      return "application/json";
    case ".js":
    case ".ts":
    case ".jsx":
    case ".tsx":
      return "text/javascript";
    case ".py":
      return "text/x-python";
    case ".html":
      return "text/html";
    case ".css":
      return "text/css";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    default:
      return "application/octet-stream";
  }
}

// GET /api/v1/teams/[teamId]/files — List or download files stored in <Hackathon>/<Team>/
export async function GET(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { teamId } = params;
    const { searchParams } = new URL(req.url);
    const downloadRelPath = searchParams.get("download");

    const team = await prisma.team.findFirst({
      where: { OR: [{ id: teamId }, { teamId }] },
      include: {
        hackathon: true,
        leadStudent: true,
        members: { include: { student: true } },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const isMember =
      (team.leadStudent && team.leadStudent.userId === session.userId) ||
      team.members.some((m) => m.student.userId === session.userId);
    const isStaff = ["HOST", "SUPER_ADMIN", "JUDGE"].includes(session.role);

    if (!isMember && !isStaff) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const safeHackathon = sanitizeFolderName(team.hackathon?.title || "Hackathon");
    const safeTeam = sanitizeFolderName(team.name || team.teamId || team.id);
    const opTeamDir = path.join(OP_BASE_STORAGE_DIR, safeTeam);
    const localTeamDir = path.join(process.cwd(), safeHackathon, safeTeam);
    const primaryDir = fs.existsSync(opTeamDir) ? opTeamDir : localTeamDir;

    // If downloading a specific file:
    if (downloadRelPath) {
      const normalized = path.normalize(downloadRelPath).replace(/^(\.\.(\/|\\|$))+/, "");
      let fullFilePath = path.join(opTeamDir, normalized);

      if (!fs.existsSync(fullFilePath) || !fs.statSync(fullFilePath).isFile()) {
        fullFilePath = path.join(localTeamDir, normalized);
      }

      // Prevent directory traversal
      const isValidOp = fullFilePath.startsWith(opTeamDir) && fs.existsSync(fullFilePath);
      const isValidLocal = fullFilePath.startsWith(localTeamDir) && fs.existsSync(fullFilePath);

      if ((!isValidOp && !isValidLocal) || !fs.statSync(fullFilePath).isFile()) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }

      const fileBuffer = fs.readFileSync(fullFilePath);
      const fileName = path.basename(fullFilePath);
      const ext = path.extname(fullFilePath);
      const contentType = getContentType(ext);

      return new Response(fileBuffer, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
          "Content-Length": fileBuffer.length.toString(),
        },
      });
    }

    // Otherwise, scan and return the file tree
    const files: Array<{
      name: string;
      relativePath: string;
      size: number;
      sizeFormatted: string;
      category: string;
      extension: string;
      modifiedAt: string;
      downloadUrl: string;
    }> = [];
    const teamDbId = team.id;
    const seenRelPaths = new Set<string>();

    function walk(dir: string, baseDir: string) {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(baseDir, fullPath).replace(/\\/g, "/");

        if (
          relPath.startsWith(".git") ||
          relPath.includes("node_modules") ||
          relPath.includes(".DS_Store")
        ) {
          continue;
        }

        if (entry.isDirectory()) {
          walk(fullPath, baseDir);
        } else if (entry.isFile()) {
          if (seenRelPaths.has(relPath)) continue;
          seenRelPaths.add(relPath);

          const stat = fs.statSync(fullPath);
          const ext = path.extname(entry.name);

          let category = "General";
          if (relPath.startsWith("Phase 1") || relPath.startsWith("Part_1")) category = "Phase 1";
          else if (relPath.startsWith("Phase 2") || relPath.startsWith("Part_2")) category = "Phase 2";
          else if (relPath.startsWith("Phase 3") || relPath.startsWith("Part_3")) category = "Phase 3";
          else if (relPath.startsWith("Phase 4") || relPath.startsWith("Part_4")) category = "Phase 4";
          else if (relPath.startsWith("Final Submit")) category = "Final Submit";
          else if (relPath.startsWith("code/")) category = "Source Code";

          files.push({
            name: entry.name,
            relativePath: relPath,
            size: stat.size,
            sizeFormatted: formatBytes(stat.size),
            category,
            extension: ext.toLowerCase(),
            modifiedAt: stat.mtime.toISOString(),
            downloadUrl: `/api/v1/teams/${teamDbId}/files?download=${encodeURIComponent(relPath)}`,
          });
        }
      }
    }

    // Scan OP storage first
    if (fs.existsSync(opTeamDir)) {
      walk(opTeamDir, opTeamDir);
    }
    // Also scan local workspace for any extra files
    if (fs.existsSync(localTeamDir)) {
      walk(localTeamDir, localTeamDir);
    }

    const codeFiles = files.filter((f) => f.category === "Source Code").length;
    const documentFiles = files.filter(
      (f) => f.category.startsWith("Phase ") || f.category.startsWith("Part ") || f.category === "Final Submit"
    ).length;

    return NextResponse.json({
      success: true,
      hackathon: safeHackathon,
      teamName: safeTeam,
      folderPath: primaryDir,
      absolutePath: primaryDir,
      files,
      summary: {
        totalFiles: files.length,
        codeFiles,
        documentFiles,
      },
    });
  } catch (error: any) {
    console.error("[Team Files Error]:", error);
    return NextResponse.json({ error: "Failed to list team files" }, { status: 500 });
  }
}
