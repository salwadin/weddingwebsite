import { createHmac, randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { loadDemoSeed } from "../lib/seed-load";
import { adminClient, DEMO_EVENTS, DEMO_HOUSEHOLDS, DEMO_WEDDING_ID, loginAs, signedIn, SLUG } from "./helpers";
import { RESEND_MOCK_URL, type SentEmail } from "./resend-mock";

// Email delivery through Resend, against the mock API in tests/resend-mock.ts
// (the server under test has RESEND_API_KEY set; see playwright.config.ts).
test.afterAll(async () => { await loadDemoSeed(adminClient()); });

const admin = adminClient();
const sent = async () => (await (await fetch(`${RESEND_MOCK_URL}/__sent`)).json()) as SentEmail[];
const clearSent = () => fetch(`${RESEND_MOCK_URL}/__sent`, { method: "DELETE" });
const linkIn = (html: string) => html.match(/href="(http[^"]+\/i\/[A-Za-z0-9_-]{32}[^"]*)"/)?.[1];

/** Signs a Resend (Svix) webhook the way Resend does, with the server's secret. */
function signed(body: object, secret = process.env.RESEND_WEBHOOK_SECRET!, at = Date.now()) {
  const payload = JSON.stringify(body), id = `msg_${randomUUID()}`, ts = String(Math.floor(at / 1000));
  const sig = createHmac("sha256", Buffer.from(secret.replace(/^whsec_/, ""), "base64")).update(`${id}.${ts}.${payload}`).digest("base64");
  return { data: payload, headers: { "content-type": "application/json", "svix-id": id, "svix-timestamp": ts, "svix-signature": `v1,${sig}` } };
}
const cron = (request: APIRequestContext, auth = `Bearer ${process.env.CRON_SECRET}`) => request.get("/api/email/send", { headers: { authorization: auth } });

test.beforeEach(async () => { await clearSent(); });

test("sending invitations from the dashboard emails each household a working absolute link", async ({ page, browser }) => {
  const hh = DEMO_HOUSEHOLDS.nikkahOnly;
  await admin.from("households").update({ delivery_status: "not_sent" }).eq("id", hh);
  const { data: h } = await admin.from("households").select("email,name").eq("id", hh).single();

  await loginAs(page, "ayesha@example.com");
  await page.goto(`/dashboard/invitations?event=${DEMO_EVENTS.nikkah}`);
  const card = page.locator("form").filter({ hasText: "Personal invitations" });
  await card.getByRole("combobox").selectOption("email");
  await card.getByRole("button", { name: "Send to unsent" }).click();
  await page.waitForURL(/sent=\d+/);
  await expect(page.getByText(/messages sent/)).toBeVisible();

  const mail = (await sent()).find((m) => m.to[0] === h!.email);
  expect(mail, `an email to ${h!.email}`).toBeTruthy();
  expect(mail!.from).toBe("Qubool <invitations@qubool.test>");
  expect(mail!.subject).toBe("You're invited · Ayesha & Omar");
  expect(mail!.text).toContain(`Assalamu alaikum ${h!.name},`);
  const link = linkIn(mail!.html)!;
  expect(link).toMatch(/^http:\/\/localhost:\d+\/i\//);
  expect(mail!.text).toContain(link);

  const { data: row } = await admin.from("outbox").select("status,provider_id,sent_at,error,body").eq("household_id", hh).eq("kind", "invitation").single();
  expect(row).toMatchObject({ status: "sent", provider_id: mail!.id, error: null });
  expect(row!.sent_at).toBeTruthy();
  expect(row!.body).toContain(link); // the outbox text uses the same absolute link
  expect((await admin.from("households").select("delivery_status").eq("id", hh).single()).data!.delivery_status).toBe("sent");
  await expect(page.getByText("sent", { exact: true }).first()).toBeVisible(); // the outbox shows delivery

  // The emailed link opens the guest's invitation in a fresh browser.
  const guest = await (await browser.newContext()).newPage();
  await guest.goto(link);
  await expect(guest).toHaveURL(new RegExp(`/w/${SLUG}`));
  await expect(guest.getByText("Masjid Al-Noor").first()).toBeVisible();
});

test("a bounce reported by Resend marks the household bounced; bad signatures are rejected", async ({ request }) => {
  const hh = DEMO_HOUSEHOLDS.nikkahShaadi;
  const providerId = `re_${randomUUID()}`;
  const { data: h } = await admin.from("households").update({ delivery_status: "sent" }).eq("id", hh).select("email").single();
  await admin.from("outbox").insert({
    wedding_id: DEMO_WEDDING_ID, channel: "email", recipient: h!.email, household_id: hh, subject: "You're invited", body: "", kind: "invitation",
    status: "sent", provider_id: providerId, sent_at: new Date().toISOString(),
  });
  const event = { type: "email.bounced", created_at: new Date().toISOString(), data: { email_id: providerId, to: [h!.email], bounce: { type: "Permanent", subType: "General", message: "Mailbox does not exist" } } };

  const forged = signed(event, "whsec_" + Buffer.from("not-the-secret").toString("base64"));
  expect((await request.post("/api/resend/webhook", forged)).status()).toBe(400);
  expect((await request.post("/api/resend/webhook", signed(event, undefined, Date.now() - 10 * 60_000))).status()).toBe(400); // replayed
  expect((await admin.from("households").select("delivery_status").eq("id", hh).single()).data!.delivery_status).toBe("sent");

  const res = await request.post("/api/resend/webhook", signed(event));
  expect(res.status()).toBe(200);
  expect((await admin.from("households").select("delivery_status").eq("id", hh).single()).data!.delivery_status).toBe("bounced");
  const { data: row } = await admin.from("outbox").select("status,error").eq("provider_id", providerId).single();
  expect(row).toEqual({ status: "bounced", error: "Permanent · General · Mailbox does not exist" });

  // A late "delivered" doesn't undo the bounce.
  await request.post("/api/resend/webhook", signed({ type: "email.delivered", data: { email_id: providerId } }));
  expect((await admin.from("outbox").select("status").eq("provider_id", providerId).single()).data!.status).toBe("bounced");
});

test("the cron route sends what's pending, rebuilt from trusted rows, and needs its secret", async ({ request }) => {
  const hh = DEMO_HOUSEHOLDS.allEvents;
  const { data: h } = await admin.from("households").select("email").eq("id", hh).single();
  // An organizer queues messages under RLS. One is legitimate; one tries to mail a stranger.
  const sb = await signedIn("ayesha@example.com");
  const ok = randomUUID(), forged = randomUUID();
  const { error } = await sb.from("outbox").insert([
    { id: ok, wedding_id: DEMO_WEDDING_ID, channel: "email", recipient: h!.email, household_id: hh, subject: "x", body: "x", kind: "reminder", event_id: DEMO_EVENTS.walima },
    { id: forged, wedding_id: DEMO_WEDDING_ID, channel: "email", recipient: "stranger@example.net", household_id: hh, subject: "Win a prize", body: "spam", kind: "invitation" },
  ]);
  expect(error).toBeNull();
  // ...and can't mark anything as already sent.
  expect((await sb.from("outbox").insert({ wedding_id: DEMO_WEDDING_ID, channel: "email", recipient: h!.email, kind: "invitation", status: "sent" })).error).not.toBeNull();

  expect((await request.get("/api/email/send")).status()).toBe(401);
  expect((await cron(request, "Bearer wrong")).status()).toBe(401);
  const res = await cron(request);
  expect(res.status()).toBe(200);
  expect(await res.json()).toMatchObject({ enabled: true, sent: 1, failed: 1 });

  const mails = await sent();
  expect(mails.map((m) => m.to[0])).toEqual([h!.email]);
  expect(mails[0].subject).toBe("Kind reminder to RSVP · Walima");
  expect(linkIn(mails[0].html)).toMatch(/\/i\/[A-Za-z0-9_-]{32}\?to=rsvp$/);
  const { data: rows } = await admin.from("outbox").select("id,status,error").in("id", [ok, forged]);
  expect(rows!.find((r) => r.id === ok)!.status).toBe("sent");
  expect(rows!.find((r) => r.id === forged)).toMatchObject({ status: "failed", error: "Recipient isn't the household's email on file" });

  // Nothing left: a second run sends nothing.
  expect(await (await cron(request)).json()).toMatchObject({ sent: 0 });
});

test("a guest who lost their link gets it by email; a collaborator invite is emailed too", async ({ page }) => {
  const hh = DEMO_HOUSEHOLDS.nikkahOnly;
  const { data: h } = await admin.from("households").select("email").eq("id", hh).single();
  await page.goto(`/w/${SLUG}/rsvp`);
  await page.getByPlaceholder("Email or phone your invitation was sent to").fill(h!.email!.toUpperCase());
  await page.getByRole("button", { name: "Send my link" }).click();
  await expect(page.getByText(/we've just sent your personal link/)).toBeVisible();
  await expect.poll(async () => (await sent()).length).toBe(1);
  const [lookup] = await sent();
  expect(lookup.to).toEqual([h!.email]);
  expect(lookup.subject).toBe("Your invitation from Ayesha & Omar");
  expect(linkIn(lookup.html)).toMatch(/^http:\/\/localhost:\d+\/i\//);

  await clearSent();
  const email = `planner.${Date.now()}@example.com`;
  await loginAs(page, "ayesha@example.com");
  await page.goto("/dashboard/settings");
  await page.getByLabel("Name").fill("Sana Planner");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Role").selectOption("guest_manager");
  await page.getByRole("button", { name: "Send invite" }).click();
  await expect.poll(async () => (await sent()).map((m) => m.to[0])).toEqual([email]);
  const [invite] = await sent();
  expect(invite.subject).toBe("Ayesha Siddiqui invited you to help plan Ayesha & Omar's wedding");
  expect(invite.html).toMatch(/href="http:\/\/localhost:\d+\/signup"/);
  expect((await admin.from("outbox").select("kind,status").eq("recipient", email).single()).data).toEqual({ kind: "collaborator_invite", status: "sent" });
});

test("a rejected send is recorded as failed and not retried", async ({ request }) => {
  const hh = DEMO_HOUSEHOLDS.nikkahShaadi;
  const bad = `guest+reject.${Date.now()}@example.com`;
  await admin.from("households").update({ email: bad }).eq("id", hh);
  const id = randomUUID();
  await admin.from("outbox").insert({ id, wedding_id: DEMO_WEDDING_ID, channel: "email", recipient: bad, household_id: hh, subject: "", body: "", kind: "save_the_date" });
  expect(await (await cron(request)).json()).toMatchObject({ sent: 0, failed: 1 });
  const { data: row } = await admin.from("outbox").select("status,error").eq("id", id).single();
  expect(row).toEqual({ status: "failed", error: "Resend 422: Invalid `to` field" });
  expect(await sent()).toEqual([]);
});
