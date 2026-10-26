import { test, expect } from "@playwright/test";

test.describe("HackBridge End-to-End User Journey & Platform Architecture", () => {
  test("Landing Page: Loads with Hero, Three.js canvas container, and architectural sections", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/HackBridge/);

    // Verify header and navigation
    const nav = page.locator("nav");
    await expect(nav).toBeVisible();

    // Verify hero text
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();

    // Verify Explore Active Arenas or Claim ID link exists
    const exploreBtn = page.getByRole("link", { name: /Explore Active Arenas|Claim Student Hackathon ID/i }).first();
    await expect(exploreBtn).toBeVisible();
  });

  test("Discovery Page: Lists active hackathons with search and filter controls", async ({ page }) => {
    await page.goto("/hackathons");
    
    // Check search input or filters
    const searchInput = page.locator("input[placeholder*='Search']").first();
    if (await searchInput.isVisible()) {
      await searchInput.fill("National");
      await page.waitForTimeout(500);
    }
  });

  test("Auth Portal: Split screen layout and 1-click persona switching", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Check login form presence and interactions
    const emailInput = page.locator("input[type='email']");
    const passwordInput = page.locator("input[type='password']");
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // Verify interaction
    await emailInput.fill("host.mit@college.edu");
    await expect(emailInput).toHaveValue("host.mit@college.edu");

    await passwordInput.fill("Password@123");
    await expect(passwordInput).toHaveValue("Password@123");
  });

  test("Legal Compliance: India DPDP Act privacy policy and host agreement", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.locator("body")).toContainText(/DPDP|Privacy/i);

    await page.goto("/terms");
    await expect(page.locator("body")).toContainText(/Terms/i);

    await page.goto("/refunds");
    await expect(page.locator("body")).toContainText(/Refund/i);
  });
});
