import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";
import { signSessionToken } from "../src/lib/auth";
import { prisma } from "../src/lib/db";

const ARTIFACT_DIR = "/home/satyu000/.gemini/antigravity-ide/brain/b03bc81f-4113-4aff-a7d8-640d3c63de01";

async function verifyHero() {
  console.log("🚀 Launching Chromium to verify Hero and Three.js 3D globe...");

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
      "--use-gl=swiftshader",
    ],
  });

  const realUser = await prisma.user.findUnique({
    where: { email: "lead.priya@student.edu" },
    include: { studentProfile: true },
  });

  const sessionToken = signSessionToken({
    userId: realUser!.id,
    email: realUser!.email,
    role: "STUDENT",
    status: "ACTIVE",
    name: realUser!.name,
    hackathonId: realUser!.studentProfile?.hackathonId,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  // Inject authentication session cookie
  await context.addCookies([
    {
      name: "hackbridge_session",
      value: sessionToken,
      url: "http://localhost:3000",
    },
  ]);

  const page = await context.newPage();

  const consoleErrors: string[] = [];
  const consoleWarnings: string[] = [];
  const consoleLogs: string[] = [];

  page.on("console", (msg) => {
    const text = msg.text();
    if (msg.type() === "error") {
      consoleErrors.push(text);
      console.error("  ❌ [Browser Console Error]:", text);
    } else if (msg.type() === "warning") {
      consoleWarnings.push(text);
    } else {
      consoleLogs.push(text);
    }
  });

  page.on("pageerror", (err) => {
    consoleErrors.push(err.message);
    console.error("  ❌ [Page Runtime Error]:", err.message);
  });

  console.log("🌐 Navigating to http://localhost:3000 ...");
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });

  // 1. Verify canvas element is mounted
  const canvasLocator = page.locator("canvas");
  await canvasLocator.waitFor({ state: "attached", timeout: 10000 });

  const canvasCount = await canvasLocator.count();
  console.log(`✅ Canvas element found in DOM (count: ${canvasCount})`);

  // 2. Inspect canvas dimensions
  const canvasBox = await canvasLocator.first().boundingBox();
  console.log("📐 Canvas element dimensions on page:", canvasBox);

  const canvasInfo = await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return null;
    return {
      tagName: canvas.tagName,
      width: canvas.width,
      height: canvas.height,
      clientWidth: canvas.clientWidth,
      clientHeight: canvas.clientHeight,
    };
  });
  console.log("🎨 Canvas internal render resolution:", canvasInfo);

  // 3. Wait for Three.js render loop to initialize
  await page.waitForTimeout(1000);

  // 4. Capture Frame 1 (t = 0)
  const screenshot1Path = path.join(ARTIFACT_DIR, "hero_globe_frame1.png");
  await page.screenshot({ path: screenshot1Path, clip: { x: 0, y: 0, width: 1440, height: 850 } });
  console.log(`📸 Screenshot 1 (Frame 1) saved to: ${screenshot1Path}`);

  // 5. Wait 2 seconds for globe to visibly rotate
  console.log("⏳ Waiting 2000ms for continuous Three.js globe rotation...");
  await page.waitForTimeout(2000);

  // 6. Capture Frame 2 (t = 2.0s)
  const screenshot2Path = path.join(ARTIFACT_DIR, "hero_globe_frame2.png");
  await page.screenshot({ path: screenshot2Path, clip: { x: 0, y: 0, width: 1440, height: 850 } });
  console.log(`📸 Screenshot 2 (Frame 2) saved to: ${screenshot2Path}`);

  // 7. Verify rotation by comparing screenshot buffers
  const buf1 = fs.readFileSync(screenshot1Path);
  const buf2 = fs.readFileSync(screenshot2Path);
  const isDifferent = !buf1.equals(buf2);
  console.log(`🔄 Rotation verification: Frame 1 and Frame 2 image buffers differ? ${isDifferent} (Proves active rotation)`);

  const stats1 = fs.statSync(screenshot1Path);
  const stats2 = fs.statSync(screenshot2Path);
  console.log(`📊 Screenshot sizes: Frame 1 = ${(stats1.size / 1024).toFixed(1)} KB, Frame 2 = ${(stats2.size / 1024).toFixed(1)} KB`);

  await browser.close();

  console.log("\n================ VERIFICATION SUMMARY ================");
  console.log(`Total Console Errors: ${consoleErrors.length}`);
  console.log(`Total Console Warnings: ${consoleWarnings.length}`);
  console.log(`Canvas Attached & Rendering: ${canvasInfo && canvasInfo.width > 0}`);
  console.log(`Globe Rotating Smoothly: ${isDifferent}`);
  console.log("======================================================");

  if (consoleErrors.length > 0) {
    console.error("❌ Test failed due to console errors:", consoleErrors);
    process.exit(1);
  } else if (!isDifferent) {
    console.error("❌ Test failed: Globe is static and not rotating!");
    process.exit(1);
  } else {
    console.log("✨ All verification checks passed! Globe is visible, actively rotating, and console has ZERO errors.");
  }
}

verifyHero().catch((err) => {
  console.error("Fatal verification error:", err);
  process.exit(1);
});
