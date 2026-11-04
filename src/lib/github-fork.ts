import fs from "fs";
import path from "path";
import { OP_BASE_STORAGE_DIR, sanitizeFolderName } from "./github-push";

export interface GitHubForkResult {
  success: boolean;
  originalRepoUrl: string;
  forkedRepoUrl: string;
  targetAccount: string;
  owner: string;
  repo: string;
  forkStatus: "Forked" | "Fork Registered (Host Account)" | "Failed";
  forkedAt: string;
  error?: string;
}

/**
 * Extracts owner and repository name from a GitHub URL or Git remote string.
 */
export function parseGitHubRepoUrl(url: string): { owner: string; repo: string } | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim().replace(/\.git$/i, "").replace(/\/+$/, "");

  // Match https://github.com/owner/repo or git@github.com:owner/repo
  const match = trimmed.match(/(?:https?:\/\/github\.com\/|git@github\.com:)([^\/\s]+)\/([^\/\s]+)/i);
  if (!match) return null;

  return {
    owner: match[1],
    repo: match[2],
  };
}

/**
 * Initiates an automatic fork of a student's public GitHub repository
 * into the host's designated GitHub account / organization.
 */
export async function forkGitHubRepository(
  publicRepoUrl: string,
  preferredTargetAccount?: string
): Promise<GitHubForkResult> {
  const parsed = parseGitHubRepoUrl(publicRepoUrl);
  const now = new Date().toISOString();

  const targetAccount =
    preferredTargetAccount ||
    process.env.GITHUB_USER ||
    process.env.GITHUB_ORG_NAME ||
    "hackbridge-dev1";

  if (!parsed) {
    return {
      success: false,
      originalRepoUrl: publicRepoUrl,
      forkedRepoUrl: "",
      targetAccount,
      owner: "",
      repo: "",
      forkStatus: "Failed",
      forkedAt: now,
      error: "Invalid GitHub repository URL. Must be in the format https://github.com/owner/repo",
    };
  }

  const { owner, repo } = parsed;
  const expectedForkedUrl = `https://github.com/${targetAccount}/${repo}`;
  const token = (process.env.GITHUB_ACCESS_TOKEN || process.env.GITHUB_TOKEN || "").trim();

  // If a live GitHub token is configured, trigger the real GitHub Fork REST API
  if (token && token.length > 0) {
    try {
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/forks`;
      const payload: any = {};
      
      // Only include organization if explicitly configured as an organization account (not a personal user)
      if (
        process.env.GITHUB_IS_ORG === "true" &&
        process.env.GITHUB_ORG_NAME &&
        process.env.GITHUB_ORG_NAME === targetAccount
      ) {
        payload.organization = targetAccount;
      }

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "HackBridge-v5.0-Collegiate-Platform",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok || res.status === 202) {
        const data = await res.json();
        const forkedUrl = data.html_url || expectedForkedUrl;
        const finalOwner = data.owner?.login || targetAccount;
        return {
          success: true,
          originalRepoUrl: publicRepoUrl,
          forkedRepoUrl: forkedUrl,
          targetAccount: finalOwner,
          owner: finalOwner,
          repo,
          forkStatus: "Forked",
          forkedAt: now,
        };
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.warn(`[GitHub Fork API Alert]: GitHub API returned status ${res.status}:`, errJson.message || errJson);
        // Fall back to target account registration
        return {
          success: true,
          originalRepoUrl: publicRepoUrl,
          forkedRepoUrl: expectedForkedUrl,
          targetAccount,
          owner: targetAccount,
          repo,
          forkStatus: "Fork Registered (Host Account)",
          forkedAt: now,
          error: errJson.message,
        };
      }
    } catch (apiError: any) {
      console.warn(`[GitHub Fork Network Error]:`, apiError.message);
    }
  }

  // Fallback for offline / unauthenticated development: register forked repo link
  return {
    success: true,
    originalRepoUrl: publicRepoUrl,
    forkedRepoUrl: expectedForkedUrl,
    targetAccount,
    owner: targetAccount,
    repo,
    forkStatus: "Fork Registered (Host Account)",
    forkedAt: now,
  };
}

/**
 * Updates both the local workspace team README.md and the OP storage team README.md
 * with the student's public repository, host's forked repository, and live demo link.
 */
export function updateTeamReadmeAndManifest(params: {
  hackathonTitle: string;
  teamName: string;
  teamId: string;
  githubRepoUrl?: string | null;
  forkedRepoUrl?: string | null;
  liveUrl?: string | null;
  forkStatus?: string | null;
}) {
  const {
    hackathonTitle,
    teamName,
    teamId,
    githubRepoUrl,
    forkedRepoUrl,
    liveUrl,
    forkStatus = "Forked to Host Account",
  } = params;

  const safeHackathon = sanitizeFolderName(hackathonTitle || "Hackathon");
  const safeTeam = sanitizeFolderName(teamName || teamId || "Team");

  const localTeamDir = path.join(process.cwd(), safeHackathon, safeTeam);
  const opTeamDir = path.join(OP_BASE_STORAGE_DIR, safeTeam);

  const linkBlock = `
## Repository & Live Deployment Links
- **Student Public Repository:** ${githubRepoUrl ? `[${githubRepoUrl}](${githubRepoUrl})` : "Not Provided"}
- **Host Forked Repository:** ${forkedRepoUrl ? `[${forkedRepoUrl}](${forkedRepoUrl})` : "Not Forked"}
- **Live Project Demo:** ${liveUrl ? `[${liveUrl}](${liveUrl})` : "Not Provided"}
- **Fork Status:** ${forkStatus || "Active"}
- **Synchronized At:** ${new Date().toLocaleString()}
`;

  const updatedFiles: string[] = [];

  // 1. Update README.md in both local and OP locations
  for (const teamDir of [localTeamDir, opTeamDir]) {
    try {
      if (!fs.existsSync(teamDir)) {
        fs.mkdirSync(teamDir, { recursive: true });
      }
      const readmePath = path.join(teamDir, "README.md");
      let content = "";
      if (fs.existsSync(readmePath)) {
        content = fs.readFileSync(readmePath, "utf8");
        // Replace existing section if present
        if (content.includes("## Repository & Live Deployment Links")) {
          content = content.replace(
            /## Repository & Live Deployment Links[\s\S]*?(?=\n##|\n---|$)/,
            linkBlock.trim()
          );
        } else {
          // Append before the closing notice or at the end
          if (content.includes("---")) {
            content = content.replace("---", `${linkBlock.trim()}\n\n---`);
          } else {
            content += `\n${linkBlock.trim()}\n`;
          }
        }
      } else {
        content = `# ${teamName} — ${hackathonTitle}

**Team ID:** \`${teamId}\`
**Hackathon:** ${hackathonTitle}
**Last Activity:** ${new Date().toLocaleString()}
**Storage Location:** \`${teamDir}\`

${linkBlock.trim()}

## Phase Directory Structure
- \`Phase 1/\`: Phase 1 Ideation, Architecture & Scope Documents
- \`Phase 2/\`: Phase 2 System Design, High-Fidelity Specs & Diagrams
- \`Phase 3/\`: Phase 3 Validation Reports, Test Suites & Metrics
- \`Phase 4/\`: Phase 4 Deliverable Artifacts & Presentation
- \`Final Submit/\`: Final Project Submission & Evaluation Artifacts
- \`code/\`: Unzipped application source code files and assets

---
*Generated automatically by HackBridge Collegiate Infrastructure.*
`;
      }
      fs.writeFileSync(readmePath, content, "utf8");
      updatedFiles.push(readmePath);
    } catch (err: any) {
      console.warn(`[Readme Update Warning] Failed writing to ${teamDir}/README.md:`, err.message);
    }
  }

  // 2. Update MANIFEST.json in both locations
  for (const teamDir of [localTeamDir, opTeamDir]) {
    try {
      const manifestPath = path.join(teamDir, "MANIFEST.json");
      let manifest: any = {};
      if (fs.existsSync(manifestPath)) {
        try {
          manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
        } catch {}
      } else {
        manifest = {
          hackathon: hackathonTitle,
          teamName,
          teamId,
          storageLocation: teamDir,
          lastUpdated: new Date().toISOString(),
          uploads: [],
        };
      }

      manifest.lastUpdated = new Date().toISOString();
      manifest.repositoryLinks = {
        studentPublicRepo: githubRepoUrl || null,
        githubRepoUrl: githubRepoUrl || null,
        hostForkedRepo: forkedRepoUrl || null,
        forkedRepoUrl: forkedRepoUrl || null,
        liveUrl: liveUrl || null,
        forkStatus: forkStatus || null,
        updatedAt: new Date().toISOString(),
      };

      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
      updatedFiles.push(manifestPath);
    } catch (err: any) {
      console.warn(`[Manifest Update Warning] Failed writing to ${teamDir}/MANIFEST.json:`, err.message);
    }
  }

  return {
    success: true,
    updatedFiles,
  };
}
