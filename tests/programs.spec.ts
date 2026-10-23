import { expect, test } from "@playwright/test";
import { loadDemoSeed } from "../lib/seed-load";
import { adminClient, loginAs } from "./helpers";

// Founding Vendor and Beta applications: public forms save to the database;
// only staff (QUBOOL_STAFF_EMAILS, planner@example.com in tests) can review them.

const admin = adminClient();
const stamp = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

test.afterAll(async () => {
  await admin.from("vendor_applications").delete().like("email", "%@apply.qubool.test");
  await admin.from("vendor_applications").delete().eq("email", "vendor@example.com");
  await admin.from("beta_applications").delete().like("email", "%@apply.qubool.test");
  await loadDemoSeed(admin); // undo the founding perks given to the demo vendor
});

test("a vendor applies to the Founding 50; a second application from the same email is refused", async ({ page }) => {
  const email = `owner.${stamp()}@apply.qubool.test`;
  await page.goto("/founding-vendors");
  await expect(page.getByText(/of 50 spots left/)).toBeVisible();
  const form = page.locator("#apply");
  await form.getByLabel("Business name").fill("Saffron & Thyme Catering");
  await form.getByLabel("Category").selectOption("Catering");
  await form.getByLabel("City").fill("Houston");
  await form.getByLabel("Your name").fill("Leila Haddad");
  await form.getByLabel("Email").fill(email);
  await form.getByLabel("Instagram").fill("@saffronthyme");
  await form.getByLabel("Portfolio links").fill("saffronthyme.example.org/weddings");
  await form.getByText("Arab", { exact: true }).click();
  await form.getByRole("button", { name: "Apply to be a Founding Vendor" }).click();
  await expect(page.getByText("Application received")).toBeVisible();

  const { data } = await admin.from("vendor_applications").select("business_name,category,city,instagram,portfolio_urls,traditions,status").eq("email", email).single();
  expect(data).toEqual({
    business_name: "Saffron & Thyme Catering", category: "Catering", city: "Houston", instagram: "saffronthyme",
    portfolio_urls: ["https://saffronthyme.example.org/weddings"], traditions: ["arab"], status: "pending",
  });

  await page.goto("/founding-vendors");
  await form.getByLabel("Business name").fill("Saffron & Thyme Catering");
  await form.getByLabel("Category").selectOption("Catering");
  await form.getByLabel("City").fill("Houston");
  await form.getByLabel("Your name").fill("Leila Haddad");
  await form.getByLabel("Email").fill(email);
  await form.getByLabel("Website").fill("saffronthyme.example.org");
  await form.getByRole("button", { name: "Apply to be a Founding Vendor" }).click();
  await expect(page.getByText("We already have an application from this email")).toBeVisible();
});

test("a planner applies to the beta", async ({ page }) => {
  const email = `planner.${stamp()}@apply.qubool.test`;
  await page.goto("/beta");
  const form = page.locator("#apply");
  await form.getByRole("button", { name: /A planner/ }).click();
  await form.getByLabel("Your name").fill("Grace Okafor");
  await form.getByLabel("Email").fill(email);
  await form.getByLabel("Company").fill("Okafor Events");
  await form.getByLabel("Expected guests").fill("400");
  await form.getByLabel("Weddings per year").fill("18");
  await form.getByText("Tea ceremony", { exact: true }).click();
  await form.getByText("Family collaboration", { exact: true }).click();
  await form.getByRole("button", { name: "Request early access" }).click();
  await expect(page.getByText("Application received")).toBeVisible();

  const { data } = await admin.from("beta_applications").select("kind,company,guest_count,weddings_per_year,events,features,status").eq("email", email).single();
  expect(data).toEqual({ kind: "planner", company: "Okafor Events", guest_count: 400, weddings_per_year: 18, events: ["Tea ceremony"], features: ["Family collaboration"], status: "new" });
});

test("only staff can open /admin", async ({ page, browser }) => {
  const anon = await (await browser.newContext()).newPage();
  expect((await anon.goto("/admin"))!.status()).toBe(404);
  await loginAs(anon, "nasreen@example.com");
  expect((await anon.goto("/admin"))!.status()).toBe(404);

  await loginAs(page, "planner@example.com");
  await expect(page).toHaveURL(/\/admin/);
  await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();
});

test("staff approve a founding vendor: numbered, emailed, and the listing is Featured free for a year", async ({ page }) => {
  // The demo vendor applies, so the approval can apply perks to an existing listing.
  await admin.from("vendor_applications").delete().eq("email", "vendor@example.com");
  const { data: app } = await admin.from("vendor_applications").insert({
    business_name: "Noor Light Studios", category: "Photography", city: "Dallas", contact_name: "Mahnoor", email: "vendor@example.com",
  }).select("id").single();
  await admin.from("listings").update({ tier: "basic", founding_until: null, founding_number: null }).eq("name", "Noor Light Studios");

  await loginAs(page, "planner@example.com");
  await page.goto("/admin?tab=vendors&status=pending");
  const card = page.locator("div.rounded-2xl", { hasText: "Noor Light Studios" }).filter({ has: page.getByRole("button", { name: /Approve/ }) });
  await card.getByRole("button", { name: /Approve/ }).click();
  await expect(page.locator("div.rounded-2xl", { hasText: "Noor Light Studios" })).toHaveCount(0); // leaves the pending list
  await page.goto("/admin?tab=vendors&status=approved");
  await expect(page.locator("div.rounded-2xl", { hasText: "Noor Light Studios" }).getByText(/Founding #\d+/)).toBeVisible();

  const { data: a } = await admin.from("vendor_applications").select("status,founding_number,reviewed_by").eq("id", app!.id).single();
  expect(a!.status).toBe("approved");
  expect(a!.founding_number).toBeGreaterThanOrEqual(1);
  expect(a!.reviewed_by).toBe("planner@example.com");
  const { data: l } = await admin.from("listings").select("tier,founding_number,founding_until").eq("name", "Noor Light Studios").single();
  expect(l!.tier).toBe("featured");
  expect(l!.founding_number).toBe(a!.founding_number);
  const months = (new Date(l!.founding_until).getTime() - Date.now()) / (30.4 * 864e5);
  expect(months).toBeGreaterThan(11.5);
  const { data: mail } = await admin.from("outbox").select("kind,subject").eq("recipient", "vendor@example.com").eq("kind", "founding_approved");
  expect(mail![0].subject).toBe(`Welcome to the Founding 50 · Vendor #${a!.founding_number}`);
});

test("staff invite a beta applicant", async ({ page }) => {
  const email = `couple.${stamp()}@apply.qubool.test`;
  const { data: app } = await admin.from("beta_applications").insert({ kind: "couple", name: "Mei Chen", email, guest_count: 180 }).select("id").single();
  await loginAs(page, "planner@example.com");
  await page.goto("/admin?tab=beta&status=new");
  const card = page.locator("div.rounded-2xl", { hasText: "Mei Chen" }).filter({ has: page.getByRole("button", { name: "Invite" }) });
  await card.getByRole("button", { name: "Invite" }).click();
  await expect(page.locator("div.rounded-2xl", { hasText: "Mei Chen" })).toHaveCount(0); // leaves the "new" list once the invite is saved
  await page.goto("/admin?tab=beta&status=invited");
  await expect(page.getByText("Mei Chen")).toBeVisible();
  const { data } = await admin.from("beta_applications").select("status,invited_at").eq("id", app!.id).single();
  expect(data!.status).toBe("invited");
  expect(data!.invited_at).toBeTruthy();
  const { data: mail } = await admin.from("outbox").select("kind").eq("recipient", email);
  expect(mail).toEqual([{ kind: "beta_invite" }]);

  // Resending straight away (an impatient double click) doesn't email them again.
  const invited = page.locator("div.rounded-2xl", { hasText: "Mei Chen" }).filter({ has: page.getByRole("button", { name: "Resend invite" }) });
  await invited.getByRole("button", { name: "Resend invite" }).click();
  await expect(invited.getByRole("button", { name: "Resend invite" })).toBeEnabled(); // pending state cleared: the action finished
  const { data: after } = await admin.from("outbox").select("kind").eq("recipient", email);
  expect(after).toHaveLength(1);
});
