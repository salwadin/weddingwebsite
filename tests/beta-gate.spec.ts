import { expect, test } from "@playwright/test";
import { adminClient, DEMO_PASSWORD, loginAs } from "./helpers";

// Qubool is invite-only during the beta (until QUBOOL_OPEN_SIGNUP=on): couples and
// planners need an invited beta application, vendors an approved Founding Vendor one.
const admin = adminClient();
const stamp = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const users: string[] = [];

test.afterAll(async () => {
  await admin.from("beta_applications").delete().like("email", "%@gate.qubool.test");
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const u of data.users.filter((x) => x.email?.endsWith("@gate.qubool.test"))) await admin.auth.admin.deleteUser(u.id);
  for (const id of users) await admin.auth.admin.deleteUser(id).catch(() => {});
});

const accountExists = async (email: string) => !!(await admin.auth.admin.listUsers({ perPage: 1000 })).data.users.find((u) => u.email === email);

async function signUp(page: import("@playwright/test").Page, email: string) {
  await page.goto("/signup");
  await page.getByLabel("Your name").fill("Sam Rivera");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("a-good-long-password");
  await page.getByRole("button", { name: "Create account" }).click();
}

test("the site asks for early access instead of open signup", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Request early access/ }).first()).toHaveAttribute("href", "/beta");
  await expect(page.getByText("Start free")).toHaveCount(0);
  await page.goto("/pricing");
  await expect(page.getByText("$80").first()).toBeVisible();
  await expect(page.getByText("$150").first()).toBeVisible();
});

test("someone who isn't invited can't create an account", async ({ page }) => {
  const email = `uninvited.${stamp()}@gate.qubool.test`;
  await signUp(page, email);
  await expect(page.getByText(/invite-only during the beta/)).toBeVisible();
  expect(await accountExists(email)).toBe(false);

  // Applying isn't enough: staff have to invite them.
  await admin.from("beta_applications").insert({ kind: "couple", name: "Sam Rivera", email });
  await signUp(page, email);
  await expect(page.getByText(/invite-only during the beta/)).toBeVisible();
  expect(await accountExists(email)).toBe(false);
});

test("an invited beta applicant can create their account", async ({ page }) => {
  const email = `invited.${stamp()}@gate.qubool.test`;
  await admin.from("beta_applications").insert({ kind: "planner", name: "Sam Rivera", email, status: "invited", invited_at: new Date().toISOString() });
  await signUp(page, email);
  await expect(page.getByText(/sent a confirmation link/)).toBeVisible();
  expect(await accountExists(email)).toBe(true);
});

test("an existing account that wasn't invited can't create a wedding", async ({ page }) => {
  const email = `older.${stamp()}@gate.qubool.test`;
  const { data } = await admin.auth.admin.createUser({ email, password: DEMO_PASSWORD, email_confirm: true, user_metadata: { name: "Alex Kim", kind: "couple" } });
  users.push(data.user!.id);
  await loginAs(page, email);
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByLabel("First partner's name").fill("Alex");
  await page.getByLabel("Second partner's name").fill("Kim");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  for (const date of await page.locator('input[type="date"]').all()) await date.fill("2027-06-12");
  for (let i = 0; i < 5; i++) await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Create my wedding" }).click();
  await expect(page.getByText(/invite-only during the beta/)).toBeVisible();
  const { count } = await admin.from("wedding_collaborators").select("id", { count: "exact", head: true }).eq("user_id", data.user!.id);
  expect(count).toBe(0);
});

test("vendor accounts are for approved Founding Vendors", async ({ page }) => {
  const email = `vendor.${stamp()}@gate.qubool.test`;
  await page.goto("/for-vendors");
  await page.getByLabel("Business name").fill("Gate Test Florals");
  await page.getByLabel("City").fill("Austin");
  await page.getByLabel("Your name").fill("Robin Gate");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("a-good-long-password");
  await page.getByRole("button", { name: "Create free listing" }).click();
  await expect(page.getByText(/approved Founding Vendors during the beta\. Use the email/)).toBeVisible();
  expect(await accountExists(email)).toBe(false);
});
