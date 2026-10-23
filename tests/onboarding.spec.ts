import { expect, test } from "@playwright/test";
import { adminClient, DEMO_PASSWORD, loginAs } from "./helpers";

// A new couple sets up their wedding: inclusive wording, their own events (not tied to
// either side), any look (or "later"), and no stock photo or cultural pattern by default.

const admin = adminClient();
const email = `couple.${Date.now()}@onboarding.qubool.test`;
let userId = "";

test.beforeAll(async () => {
  const { data, error } = await admin.auth.admin.createUser({ email, password: DEMO_PASSWORD, email_confirm: true, user_metadata: { name: "Jordan Lee", kind: "couple" } });
  if (error) throw error;
  userId = data.user.id;
});
test.afterAll(async () => {
  const { data: w } = await admin.from("wedding_collaborators").select("wedding_id").eq("user_id", userId);
  for (const r of w ?? []) await admin.from("weddings").delete().eq("id", r.wedding_id);
  await admin.auth.admin.deleteUser(userId);
});

test("a couple adds their own event, picks 'customize later', and starts with a clean, photo-free site", async ({ page }) => {
  await loginAs(page, email);
  await expect(page).toHaveURL(/\/onboarding/);
  await expect(page.getByRole("heading", { name: /Welcome, Jordan! Who's getting married\?/ })).toBeVisible();
  await expect(page.getByText("Assalamu alaikum")).toHaveCount(0);
  await page.getByLabel("First partner's name").fill("Jordan");
  await page.getByLabel("Second partner's name").fill("Priya");
  await page.getByRole("button", { name: "Continue" }).click();

  // Events: keep the starting point's ceremony, add our own "Shaalima".
  await page.getByLabel("Your own event's name").fill("Shaalima");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByText("Your own event", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  // Dates for every chosen event.
  for (const date of await page.locator('input[type="date"]').all()) await date.fill("2027-06-12");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click(); // visibility: keep the suggestions

  await expect(page.getByText(/South Asian/)).toHaveCount(0);
  await page.getByRole("button", { name: /I'll customize it later/ }).click();
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Continue" }).click(); // guests, invitations
  await expect(page.getByRole("heading", { name: "Ready to share" })).toBeVisible();
  await page.getByRole("button", { name: "Create my wedding" }).click();
  await page.waitForURL(/\/dashboard/);

  const { data: c } = await admin.from("wedding_collaborators").select("wedding_id").eq("user_id", userId).single();
  const { data: w } = await admin.from("weddings").select("hero_image,theme,slug").eq("id", c!.wedding_id).single();
  expect(w!.hero_image).toBe("");
  expect(w!.theme.pattern).toBe("none");
  const { data: ev } = await admin.from("events").select("name,type,host_side,visibility").eq("wedding_id", c!.wedding_id).eq("name", "Shaalima").single();
  expect(ev).toEqual({ name: "Shaalima", type: "custom", host_side: "both", visibility: "invite" });

  // The public site: a plain cover (no stock photo) and no motif backgrounds or arch frames.
  const html = await (await page.request.get(`/w/${w!.slug}`)).text();
  expect(html).not.toContain("images.unsplash.com");
  expect(html).not.toContain("jali-bg");
  expect(html).not.toContain("arch-mask");
});
