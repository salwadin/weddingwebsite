import { expect, test } from "@playwright/test";
import { DEMO_WEDDING_ID } from "../lib/seed";
import { adminClient, loginAs } from "./helpers";

// Staff manage the people on any wedding from /admin?tab=weddings (planner@example.com is staff in tests).
const admin = adminClient();
const email = `cousin.${Date.now()}@people.qubool.test`;

test.afterAll(async () => {
  await admin.from("collaborator_invites").delete().like("email", "%@people.qubool.test");
  await admin.from("wedding_collaborators").update({ role: "bride_organizer" }).eq("wedding_id", DEMO_WEDDING_ID).eq("relationship", "Bride's mother");
});

test("staff add someone to a wedding, then cancel the invitation", async ({ page }) => {
  await loginAs(page, "planner@example.com");
  await page.goto("/admin?tab=weddings&q=ayesha");
  const card = page.locator("div.rounded-2xl", { hasText: "qubool.app/w/" }).first();
  await card.getByLabel("Name").fill("Omar");
  await card.getByLabel("Email").fill(email);
  await card.getByLabel("Role").last().selectOption("groom_organizer");
  await card.getByRole("button", { name: "Add person" }).click();
  await expect(card.getByText(email)).toBeVisible();

  const { data: inv } = await admin.from("collaborator_invites").select("role,wedding_id").eq("email", email).single();
  expect(inv).toEqual({ role: "groom_organizer", wedding_id: DEMO_WEDDING_ID });
  const { count } = await admin.from("outbox").select("id", { count: "exact", head: true }).eq("recipient", email).eq("kind", "collaborator_invite");
  expect(count).toBe(1);

  await card.locator("li", { hasText: email }).getByRole("button", { name: "Cancel" }).click();
  await expect(card.getByText(email)).toHaveCount(0);
  const { count: left } = await admin.from("collaborator_invites").select("id", { count: "exact", head: true }).eq("email", email);
  expect(left).toBe(0);
});

test("staff change someone's role on a wedding", async ({ page }) => {
  await loginAs(page, "planner@example.com");
  await page.goto("/admin?tab=weddings&q=nasreen");
  const row = page.locator("li", { hasText: "nasreen@example.com" }).first();
  await row.getByLabel("Role").selectOption("viewer");
  await row.getByRole("button", { name: "Save" }).click();
  await expect.poll(async () => (await admin.from("wedding_collaborators").select("role").eq("wedding_id", DEMO_WEDDING_ID).eq("relationship", "Bride's mother").single()).data?.role).toBe("viewer");
});

test("'Let someone in' with a wedding chosen adds them to that wedding", async ({ page }) => {
  const guestEmail = `brother.${Date.now()}@people.qubool.test`;
  await loginAs(page, "planner@example.com");
  await page.goto("/admin?tab=beta");
  const form = page.locator("div.rounded-2xl", { hasText: "Let someone in" });
  await form.getByLabel("Name").fill("Bilal");
  await form.getByLabel("Email").fill(guestEmail);
  await form.getByLabel("Wedding").selectOption({ label: "Ayesha & Omar" });
  await form.getByLabel("Role on the wedding").selectOption("guest_manager");
  await form.getByRole("button", { name: "Invite", exact: true }).click();
  await expect.poll(async () => (await admin.from("collaborator_invites").select("role,wedding_id").eq("email", guestEmail).maybeSingle()).data)
    .toEqual({ role: "guest_manager", wedding_id: DEMO_WEDDING_ID });
  const { count } = await admin.from("beta_applications").select("id", { count: "exact", head: true }).eq("email", guestEmail);
  expect(count).toBe(0);
});
