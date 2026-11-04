import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const FORBIDDEN_PLACEHOLDERS = [
  "Priya Sundaram",
  "HB-102938",
  "lead.priya@student.edu",
  "host.mit@college.edu",
  "judge.alex@industry.com",
  "Admin@123",
  "Password@123",
  "Phase 8 Live Arena",
  "HACKMITTEN",
  "lorem ipsum",
  "WebGL: ok",
];

function getAllFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== "node_modules" && file !== ".next" && file !== ".git") {
        getAllFiles(filePath, fileList);
      }
    } else if (/\.(tsx|ts|jsx|js|html|css)$/.test(file)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

describe("Prompt 9 Verification: Placeholder & Demo String Detection Guard", () => {
  it("should verify no forbidden demo accounts or placeholder strings exist in source code (src/)", () => {
    const srcDir = path.resolve(__dirname, "../src");
    const allSrcFiles = getAllFiles(srcDir);

    const violations: Array<{ file: string; match: string; line: number }> = [];

    for (const filePath of allSrcFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const pattern of FORBIDDEN_PLACEHOLDERS) {
          if (line.toLowerCase().includes(pattern.toLowerCase())) {
            violations.push({
              file: path.relative(path.resolve(__dirname, ".."), filePath),
              match: pattern,
              line: i + 1,
            });
          }
        }
      }
    }

    expect(
      violations,
      `Forbidden placeholders found in source files:\n${violations
        .map((v) => `  - ${v.file}:${v.line} matches "${v.match}"`)
        .join("\n")}`
    ).toHaveLength(0);
  });
});
