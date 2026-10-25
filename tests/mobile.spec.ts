import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers";

// The iOS and Android apps load the site with "QuboolApp" in the user agent (capacitor.config.ts).

test.describe("in the apps", () => {
  test.use({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 QuboolApp" });

  test("open on sign-in, then the account's home, never the pricing page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/pricing");
    await expect(page).toHaveURL(/\/login$/);
    await loginAs(page, "ayesha@example.com");
    await page.goto("/");
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("offer no plan purchases", async ({ page }) => {
    await loginAs(page, "ayesha@example.com");
    await page.goto("/dashboard/billing");
    await expect(page.getByText("Plan changes aren't available in the app.")).toBeVisible();
    await expect(page.getByRole("button", { name: /Upgrade to|Switch to/ })).toHaveCount(0);
  });
});

test("in a browser, plans are still for sale", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await loginAs(page, "ayesha@example.com");
  await page.goto("/dashboard/billing");
  await expect(page.getByRole("button", { name: /Upgrade to|Switch to/ }).first()).toBeVisible();
});

test("universal-link files are JSON", async ({ request }) => {
  const aasa = await request.get("/.well-known/apple-app-site-association");
  expect(aasa.headers()["content-type"]).toContain("application/json");
  expect(await aasa.json()).toHaveProperty("applinks.details");
  const links = await request.get("/.well-known/assetlinks.json");
  expect(links.headers()["content-type"]).toContain("application/json");
  expect(Array.isArray(await links.json())).toBe(true);
});
