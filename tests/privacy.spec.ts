import { expect, test, type Page } from "@playwright/test";
import {
  adminClient, anonClient, DEMO_EVENTS, DEMO_HOUSEHOLDS, issueLink, loginAs, PRIVATE_MARKERS, revokeLink, signedIn, siteHtml, SLUG,
} from "./helpers";

// The platform's core rule: an event's details reach a visitor only if the event
// is public or their household is invited to it. These tests read the raw server
// responses (HTML plus the inlined React Server Components payload), not just
// what's visible, so a hidden-but-serialized event would fail them.

type EventKey = keyof typeof DEMO_EVENTS;
const ALL: EventKey[] = ["mehndi", "nikkah", "shaadi", "walima"];

async function expectOnly(page: Page, allowed: EventKey[]) {
  const html = await siteHtml(page.request);
  for (const key of ALL) {
    for (const marker of PRIVATE_MARKERS[key]) {
      if (allowed.includes(key)) expect(html, `${key} should be visible`).toContain(marker);
      else expect(html, `${key} leaked "${marker}"`).not.toContain(marker);
    }
  }
}

test.describe("wedding website visibility", () => {
  test("a public visitor sees only the public Nikkah", async ({ page }) => {
    await page.goto("/demo/public");
    await expect(page).toHaveURL(new RegExp(`/w/${SLUG}$`));
    await expect(page.getByText("This page has been personalized")).toHaveCount(0);
    await expectOnly(page, ["nikkah"]);
  });

  const guests: [string, string, EventKey[]][] = [
    ["nikkah", "Mr. Imran Qureshi & Family", ["nikkah"]],
    ["shaadi", "Dr. Sana Malik & Mr. Faisal Malik", ["nikkah", "shaadi"]],
    ["all", "Mr. and Mrs. Tariq Siddiqui & Family", ["mehndi", "nikkah", "shaadi", "walima"]],
  ];
  for (const [mode, household, allowed] of guests) {
    test(`the "${mode}" demo guest sees exactly their own events`, async ({ page }) => {
      await page.goto(`/demo/${mode}`); // follows the household's real /i/<token> link
      await expect(page).toHaveURL(new RegExp(`/w/${SLUG}$`));
      await expect(page.getByText(household).first()).toBeVisible();
      await expectOnly(page, allowed);
    });
  }

  test("a guessed private event URL is a 404, exactly like a nonexistent one", async ({ page }) => {
    await page.goto("/demo/public");
    for (const id of [DEMO_EVENTS.mehndi, DEMO_EVENTS.shaadi, DEMO_EVENTS.walima, "00000000-0000-4000-8000-000000000000", "not-a-uuid"]) {
      const res = await page.request.get(`/w/${SLUG}/events/${id}`);
      expect(res.status(), id).toBe(404);
      // The 404 page echoes the requested URL (so the id itself appears), but nothing about the event.
      const body = await res.text();
      for (const key of ["mehndi", "shaadi", "walima"] as const) for (const m of PRIVATE_MARKERS[key].slice(0, -1)) expect(body).not.toContain(m);
    }
    expect((await page.request.get(`/w/${SLUG}/events/${DEMO_EVENTS.nikkah}`)).status()).toBe(200);

    // An invited guest still can't open an event they aren't invited to.
    await page.goto("/demo/nikkah");
    expect((await page.request.get(`/w/${SLUG}/events/${DEMO_EVENTS.shaadi}`)).status()).toBe(404);
    await page.goto("/demo/all");
    expect((await page.request.get(`/w/${SLUG}/events/${DEMO_EVENTS.shaadi}`)).status()).toBe(200);
  });

  test("a revoked invitation link falls back to the public view", async ({ page }) => {
    const link = await issueLink(DEMO_HOUSEHOLDS.nikkahShaadi);
    await page.goto(`/i/${link.token}`);
    await expect(page).toHaveURL(new RegExp(`/w/${SLUG}$`));
    await expectOnly(page, ["nikkah", "shaadi"]);

    await revokeLink(link.id);
    // The browser still holds the old token in its cookie: it now gets the public view.
    await page.goto(`/w/${SLUG}`);
    await expect(page.getByText("This page has been personalized")).toHaveCount(0);
    await expectOnly(page, ["nikkah"]);
    expect((await page.request.get(`/w/${SLUG}/events/${DEMO_EVENTS.shaadi}`)).status()).toBe(404);
    // And the link itself no longer opens anything.
    await page.goto(`/i/${link.token}`);
    await expect(page).toHaveURL(/\/invite-expired$/);
  });

  test("anonymous visitors have no direct table access, only the guest RPCs", async () => {
    const anon = anonClient();
    for (const table of ["weddings", "events", "households", "guests", "event_invitations", "rsvp_responses", "invitation_tokens", "public_registrations", "wedding_private", "audit_log", "profiles"]) {
      const { data, error } = await anon.from(table).select("*").limit(1);
      expect(error?.message, table).toMatch(/permission denied/);
      expect(data).toBeNull();
    }
    const { data } = await anon.rpc("guest_site", { p_slug: SLUG });
    expect((data as { events: { name: string }[] }).events.map((e) => e.name)).toEqual(["Nikkah"]);
  });
});

test.describe("organizer permissions", () => {
  test("a bride-side organizer can't open a groom-side household", async ({ page }) => {
    const pick = async (side: string) => (await adminClient().from("households").select("id,name").eq("side", side).order("id").limit(1).single()).data!;
    const groom = await pick("groom"), bride = await pick("bride");
    const html = (s: string) => s.replace(/&/g, "&amp;");

    await loginAs(page, "nasreen@example.com");

    const own = await page.request.get(`/dashboard/guests/${bride.id}`);
    expect(own.status()).toBe(200);
    expect(await own.text()).toContain(html(bride.name));
    const other = await page.request.get(`/dashboard/guests/${groom.id}`);
    expect(other.status()).toBe(404);
    expect(await other.text()).not.toContain(html(groom.name));
    const list = await (await page.request.get("/dashboard/guests")).text();
    expect(list).not.toContain(html(groom.name));

    // The database enforces the same rule on its own (RLS), whatever the app does.
    const sb = await signedIn("nasreen@example.com");
    const { data: seen } = await sb.from("households").select("id").eq("id", groom.id);
    expect(seen).toEqual([]);
    const { data: changed } = await sb.from("households").update({ notes: "edited by bride side" }).eq("id", groom.id).select("id");
    expect(changed).toEqual([]);
    const { error: insertError } = await sb.from("households").insert({ wedding_id: (await adminClient().from("weddings").select("id").eq("slug", SLUG).single()).data!.id, name: "Sneaky", side: "groom" });
    expect(insertError?.message).toMatch(/row-level security/);
    const { data: guests } = await sb.from("guests").select("id").eq("household_id", groom.id);
    expect(guests).toEqual([]);
  });

  test("only administrators can read the Mahr, and nobody can change the plan directly", async () => {
    for (const email of ["nasreen@example.com", "khalid@example.com", "hamza@example.com", "planner@example.com"]) {
      const sb = await signedIn(email);
      const { data } = await sb.from("wedding_private").select("mahr_amount");
      expect(data, email).toEqual([]);
    }
    const ayesha = await signedIn("ayesha@example.com");
    expect((await ayesha.from("wedding_private").select("mahr_amount")).data).toHaveLength(1);
    const { error } = await ayesha.from("weddings").update({ plan: "signature" }).eq("slug", SLUG);
    expect(error?.message).toMatch(/permission denied/);
  });
});
