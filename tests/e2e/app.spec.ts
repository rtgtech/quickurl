import { expect, test } from "@playwright/test";

test("home page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Turn long links into short, sharp codes." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Visit" })).toBeVisible();
});

test("mobile menu is available", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Menu" })).toBeVisible();
});

test("docs page renders toc and key sections", async ({ page }) => {
  await page.goto("/docs");
  await expect(page.getByRole("heading", { name: "QuickURL Documentation" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Documentation sections" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "/shorten" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "LifeCycle" })).toBeVisible();
});

test("docs mobile jump menu is available", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/docs");
  await expect(page.getByLabel("Jump to section")).toBeVisible();
});

test("dashboard auth flow placeholder", async ({ page }) => {
  test.skip(!process.env.PLAYWRIGHT_E2E_AUTH, "Set PLAYWRIGHT_E2E_AUTH=1 after seeding Firebase test users.");
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Manage your links." })).toBeVisible();
});
