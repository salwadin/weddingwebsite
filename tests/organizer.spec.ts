import { expect, test } from "@playwright/test";
import { loadDemoSeed } from "../lib/seed-load";
import { deriveToken } from "../lib/tokens";
import { adminClient, DEMO_HOUSEHOLDS, DEMO_WEDDING_ID, loginAs, PRIVATE_MARKERS, siteHtml, SLUG } from "./helpers";

// The dashboard's write paths, end to end: form → server action → organizer's own
// Supabase session (RLS) → database. These change the demo wedding, so it's re-seeded afterwards.
test.afterAll(async () => { await loadDemoSeed(adminClient()); });

const admin = adminClient();

test("an administrator's household edits are saved", async ({ page }) => {
  await loginAs(page, "ayesha@example.com");
  await page.goto(`/dashboard/guests/${DEMO_HOUSEHOLDS.nikkahOnly}`);
  await page.getByLabel("Notes").fill("Prefers a WhatsApp reminder");
  await page.getByLabel("Add members").fill("Musa Qureshi (child)");
  await page.getByRole("button", { name: "Save details" }).click();
  await page.waitForURL(/saved=1/);

  const { data: h } = await admin.from("households").select("notes").eq("id", DEMO_HOUSEHOLDS.nikkahOnly).single();
  expect(h!.notes).toBe("Prefers a WhatsApp reminder");
  const { data: g } = await admin.from("guests").select("first_name,is_child").eq("household_id", DEMO_HOUSEHOLDS.nikkahOnly);
  expect(g).toContainEqual({ first_name: "Musa", is_child: true });
  const { data: log } = await admin.from("audit_log").select("actor,action").eq("wedding_id", DEMO_WEDDING_ID).order("at", { ascending: false }).limit(1);
  expect(log).toEqual([{ actor: "Ayesha Siddiqui", action: "household_update" }]);
});

test("issuing a new invitation link disables the old one", async ({ page }) => {
  const active = async () => (await admin.from("invitation_tokens").select("id").eq("household_id", DEMO_HOUSEHOLDS.nikkahShaadi).is("revoked_at", null)).data!;
  const [old] = await active();
  await loginAs(page, "ayesha@example.com");
  await page.goto(`/dashboard/guests/${DEMO_HOUSEHOLDS.nikkahShaadi}`);
  await page.getByRole("button", { name: "Issue new link" }).click();
  await page.waitForURL(/saved=1/);

  const now = await active();
  expect(now).toHaveLength(1);
  expect(now[0].id).not.toBe(old.id);
  await expect(page.getByText(`/i/${deriveToken(now[0].id)}`).first()).toBeVisible(); // the dashboard can still show the link

  const guest = await page.context().browser()!.newContext();
  const gp = await guest.newPage();
  await gp.goto(`/i/${deriveToken(old.id)}`);
  await expect(gp).toHaveURL(/\/invite-expired$/);
  await gp.goto(`/i/${deriveToken(now[0].id)}`);
  await expect(gp).toHaveURL(new RegExp(`/w/${SLUG}/invitation$`));
  expect(await siteHtml(gp.request)).toContain(PRIVATE_MARKERS.shaadi[0]);
  await guest.close();
});

test("a password-protected website shows nothing until the password is entered", async ({ page, browser }) => {
  await loginAs(page, "ayesha@example.com");
  await page.goto("/dashboard/website");
  await page.getByLabel("Require a password for the public website").check();
  await page.getByLabel("Website password").fill("chai2027");
  await page.getByRole("button", { name: "Save website" }).click();
  await page.waitForURL(/saved=1/);
  const { data: w } = await admin.from("weddings").select("password_protected,site_password_hash").eq("id", DEMO_WEDDING_ID).single();
  expect(w!.password_protected).toBe(true);
  expect(w!.site_password_hash).toMatch(/^\$2[aby]\$/); // bcrypt, never the plain password

  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto(`/w/${SLUG}`);
  await expect(visitor.getByText("This website is password protected")).toBeVisible();
  expect(await (await visitor.request.get(`/w/${SLUG}/events`)).text()).not.toContain(PRIVATE_MARKERS.nikkah[0]);
  await visitor.getByPlaceholder("Website password").fill("wrong");
  await visitor.getByRole("button", { name: "Enter" }).click();
  await expect(visitor.getByText("That password doesn't look right.")).toBeVisible();
  await visitor.getByPlaceholder("Website password").fill("chai2027");
  await visitor.getByRole("button", { name: "Enter" }).click();
  await expect(visitor.getByText("This website is password protected")).toHaveCount(0);
  expect(await siteHtml(visitor.request)).toContain(PRIVATE_MARKERS.nikkah[0]);
  // Unlocking with the password is not an invitation: private events stay hidden.
  expect(await siteHtml(visitor.request)).not.toContain(PRIVATE_MARKERS.shaadi[0]);
  await admin.from("weddings").update({ password_protected: false }).eq("id", DEMO_WEDDING_ID);
});

test("public registrations update instead of double-counting the same email", async ({ page }) => {
  const register = async () => {
    await page.goto(`/w/${SLUG}/rsvp`);
    await page.getByPlaceholder("Full name").fill("Hiba Test");
    await page.getByPlaceholder("Email", { exact: true }).fill("hiba.test@example.com");
    await page.getByRole("button", { name: /coming|waitlist/ }).click();
  };
  await register();
  await expect(page.getByText("We look forward to seeing you")).toBeVisible();
  await register();
  await expect(page.getByText("we've updated it rather than adding a duplicate")).toBeVisible();
  const { data } = await admin.from("public_registrations").select("id").eq("email", "hiba.test@example.com");
  expect(data).toHaveLength(1);
});

test("a collaborator invited by email joins once they verify that email", async ({ page }) => {
  const email = `cousin.${Date.now()}@example.com`;
  await loginAs(page, "ayesha@example.com");
  await page.goto("/dashboard/settings");
  await page.getByLabel("Name").fill("Bilal Siddiqui");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Relationship").fill("Bride's cousin");
  await page.getByLabel("Role").selectOption("guest_manager");
  await page.getByRole("button", { name: "Send invite" }).click();
  await expect(page.getByText(email).first()).toBeVisible();
  expect((await admin.from("collaborator_invites").select("role").eq("email", email)).data).toEqual([{ role: "guest_manager" }]);

  const { data: created } = await admin.auth.admin.createUser({ email, password: "a-test-password-1", email_confirm: true });
  try {
    const { data: c } = await admin.from("wedding_collaborators").select("role,relationship").eq("user_id", created.user!.id);
    expect(c).toEqual([{ role: "guest_manager", relationship: "Bride's cousin" }]);
    expect((await admin.from("collaborator_invites").select("id").eq("email", email)).data).toEqual([]);
  } finally {
    await admin.auth.admin.deleteUser(created.user!.id);
  }
});

test("planning tools save: outfits, design studio and CSV import", async ({ page }) => {
  await loginAs(page, "ayesha@example.com");

  const { data: outfit } = await admin.from("outfits").select("id,pieces").eq("wedding_id", DEMO_WEDDING_ID).limit(1).single();
  await page.goto(`/dashboard/outfits/${outfit!.id}`);
  await page.getByLabel("Add pieces").fill("Clutch");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.waitForURL(/saved=1/);
  const { data: after } = await admin.from("outfits").select("pieces").eq("id", outfit!.id).single();
  expect((after!.pieces as { name: string }[]).map((p) => p.name)).toEqual([...(outfit!.pieces as { name: string }[]).map((p) => p.name), "Clutch"]);

  const { data: board } = await admin.from("boards").select("id,items").eq("wedding_id", DEMO_WEDDING_ID).eq("kind", "moodboard").limit(1).single();
  await page.goto(`/dashboard/studio/${board!.id}`);
  await page.getByRole("button", { name: /note/i }).first().click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  const { data: saved } = await admin.from("boards").select("items").eq("id", board!.id).single();
  expect((saved!.items as unknown[]).length).toBe((board!.items as unknown[]).length + 1);

  await page.goto("/dashboard/guests/import");
  await page.getByRole("button", { name: "Import households" }).click();
  await expect(page.getByText(/Imported 2 households/)).toBeVisible();
  const { data: imported } = await admin.from("households").select("id,name,invitation_tokens(id)").eq("wedding_id", DEMO_WEDDING_ID).eq("email", "javed.ahmed@example.com");
  expect(imported).toHaveLength(1);
  expect(imported![0].invitation_tokens).toHaveLength(1); // every new household gets its own link
});

test("vendors edit their listing and receive inquiries from the marketplace", async ({ page, browser }) => {
  const { data: l } = await admin.from("listings").select("id,name,views").eq("name", "Noor Light Studios").single();

  const couple = await (await browser.newContext()).newPage(); // not signed in
  // Noor Light is a sample vendor: only visible inside the demo.
  expect((await couple.goto(`/marketplace/${l!.id}`))!.status()).toBe(404);
  await couple.goto("/demo/marketplace");
  await couple.goto(`/marketplace/${l!.id}`);
  await couple.getByLabel("Your name").fill("Amina Test");
  await couple.getByLabel("Email").fill("amina.test@example.com");
  await couple.getByLabel("Message").fill("Do you have availability for a Nikah in June?");
  await couple.getByRole("button", { name: "Send inquiry" }).click();
  await expect(couple.getByText(/^Sent!/)).toBeVisible();
  expect((await admin.from("listings").select("views").eq("id", l!.id).single()).data!.views).toBeGreaterThan(l!.views);

  await loginAs(page, "vendor@example.com");
  await expect(page).toHaveURL(/\/vendor/);
  await expect(page.getByText("Do you have availability for a Nikah in June?")).toBeVisible();
  // Each "Mark …" button sets its own status.
  const item = page.locator("li", { hasText: "Do you have availability for a Nikah in June?" });
  await item.getByRole("button", { name: "Mark booked" }).click();
  await expect.poll(async () => (await admin.from("inquiries").select("status").eq("message", "Do you have availability for a Nikah in June?").single()).data!.status).toBe("booked");
  await page.getByLabel("Tagline").fill("Documentary photography, all-female team on request.");
  await page.getByRole("button", { name: "Save listing" }).click();
  await page.waitForURL(/saved=1/);
  expect((await admin.from("listings").select("tagline").eq("id", l!.id).single()).data!.tagline).toBe("Documentary photography, all-female team on request.");
});
