import { expect, test } from "@playwright/test";
import { loadDemoSeed } from "../lib/seed-load";
import { adminClient, DEMO_EVENTS, DEMO_WEDDING_ID, loginAs, signedIn } from "./helpers";

// Events private to one family's side: the demo's Mehndi is hosted by the bride's side
// and private to it. The groom's side organizer (Khalid) must not see it or any of its
// costs; the bride's side (Nasreen), its event organizer (Zara) and the couple still do.
// Budgets otherwise keep their rule: each side sees its own costs plus shared ones.

const admin = adminClient();
const M = DEMO_EVENTS.mehndi;
test.afterAll(async () => { await loadDemoSeed(admin); });

test.beforeAll(async () => {
  // One cost of each kind, so every budget rule has something to show or hide.
  await admin.from("expenses").delete().eq("wedding_id", DEMO_WEDDING_ID).like("description", "Side test:%");
  await admin.from("expenses").insert([
    { wedding_id: DEMO_WEDDING_ID, event_id: M, category: "Decor", description: "Side test: Mehndi swings (shared)", estimated: 900, responsibility: "both" },
    { wedding_id: DEMO_WEDDING_ID, event_id: null, category: "Attire", description: "Side test: bride's family outfits", estimated: 700, responsibility: "bride" },
    { wedding_id: DEMO_WEDDING_ID, event_id: null, category: "Attire", description: "Side test: groom's family outfits", estimated: 600, responsibility: "groom" },
    { wedding_id: DEMO_WEDDING_ID, event_id: DEMO_EVENTS.walima, category: "Venue", description: "Side test: Walima hall (shared)", estimated: 5000, responsibility: "both" },
  ]);
});

const descriptions = async (email: string) =>
  ((await (await signedIn(email)).from("expenses").select("description").like("description", "Side test:%")).data ?? []).map((x) => x.description).sort();

test("the other side's organizer can't see a private event, anything linked to it, or any of its costs", async ({ page }) => {
  const khalid = await signedIn("khalid@example.com");
  expect((await khalid.from("events").select("id").eq("id", M)).data).toEqual([]);
  for (const table of ["event_invitations", "rsvp_responses", "tasks", "invitation_designs", "expenses", "outbox"] as const) {
    const { data } = await khalid.from(table).select("event_id").eq("event_id", M);
    expect(data, table).toEqual([]);
  }
  // Budget: his own side and shared costs, never the bride's, and not the Mehndi's even though it's shared.
  expect(await descriptions("khalid@example.com")).toEqual(["Side test: Walima hall (shared)", "Side test: groom's family outfits"]);
  // He can't add costs to it either.
  const { error } = await khalid.from("expenses").insert({ wedding_id: DEMO_WEDDING_ID, event_id: M, category: "x", description: "Side test: sneaky", responsibility: "groom" });
  expect(error?.message).toMatch(/row-level security/);

  // And the dashboard shows nothing of it.
  await loginAs(page, "khalid@example.com");
  for (const path of ["/dashboard", "/dashboard/events", "/dashboard/budget", "/dashboard/checklist", "/dashboard/guests"]) {
    expect(await (await page.request.get(path)).text(), path).not.toContain("Mehndi Night");
  }
  expect((await page.request.get(`/dashboard/events/${M}`)).status()).toBe(404);
});

test("the hosting side, the event's organizer and the couple still see it", async () => {
  for (const email of ["nasreen@example.com", "zara@example.com", "ayesha@example.com"]) {
    expect((await (await signedIn(email)).from("events").select("id").eq("id", M)).data, email).toHaveLength(1);
  }
  expect(await descriptions("nasreen@example.com")).toEqual(["Side test: Mehndi swings (shared)", "Side test: Walima hall (shared)", "Side test: bride's family outfits"]);
  expect(await descriptions("ayesha@example.com")).toHaveLength(4);
});

test("the couple can make a one-side event private, or open it up, from the event page", async ({ page }) => {
  await loginAs(page, "ayesha@example.com");
  await page.goto(`/dashboard/events/${M}`);
  await page.getByLabel(/Private to the hosting family/).uncheck();
  await page.getByRole("button", { name: /Save/ }).first().click();
  await expect(page).toHaveURL(/saved=1|\/dashboard\/events/);
  await expect.poll(async () => (await admin.from("events").select("side_private").eq("id", M).single()).data!.side_private).toBe(false);
  expect((await (await signedIn("khalid@example.com")).from("events").select("id").eq("id", M)).data).toHaveLength(1);

  await page.goto(`/dashboard/events/${M}`);
  await page.getByLabel(/Private to the hosting family/).check();
  await page.getByRole("button", { name: /Save/ }).first().click();
  await expect.poll(async () => (await admin.from("events").select("side_private").eq("id", M).single()).data!.side_private).toBe(true);
  expect((await (await signedIn("khalid@example.com")).from("events").select("id").eq("id", M)).data).toEqual([]);
});
