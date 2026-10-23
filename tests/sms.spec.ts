import { createHmac } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { loadDemoSeed } from "../lib/seed-load";
import { isDemoPhone, normalizePhone, smsText } from "../lib/sms/rules";
import { adminClient, DEMO_EVENTS, DEMO_HOUSEHOLDS, DEMO_WEDDING_ID, loginAs } from "./helpers";
import { TWILIO_MOCK_URL, TWILIO_TEST, type SentSms } from "./twilio-mock";

// Texting guests through Twilio, against the mock API in tests/twilio-mock.ts
// (the server under test has TWILIO_* set; see playwright.config.ts).
test.afterAll(async () => { await loadDemoSeed(adminClient()); });

const admin = adminClient();
const sent = async () => (await (await fetch(`${TWILIO_MOCK_URL}/__sent`)).json()) as SentSms[];
const clearSent = () => fetch(`${TWILIO_MOCK_URL}/__sent`, { method: "DELETE" });
const cron = (page: Page) => page.request.get("/api/email/send", { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
const hh = DEMO_HOUSEHOLDS.nikkahOnly;

/** Sends "Personal invitations" for the Nikah by text, with or without the consent box ticked. */
async function textInvitations(page: Page, consent = true) {
  await page.goto(`/dashboard/invitations?event=${DEMO_EVENTS.nikkah}`);
  const card = page.locator("form").filter({ hasText: "Personal invitations" });
  await card.getByRole("combobox").selectOption("sms");
  if (consent) await card.getByRole("checkbox").check();
  await card.getByRole("button", { name: "Send to unsent" }).click();
}

test.beforeEach(async () => {
  await clearSent();
  await admin.from("weddings").update({ plan: "signature", trial_ends_at: null }).eq("id", DEMO_WEDDING_ID);
  await admin.from("outbox").delete().eq("wedding_id", DEMO_WEDDING_ID).eq("channel", "sms");
});

test("phone numbers are normalized to North American E.164, and texts always say how to opt out", () => {
  expect(normalizePhone("(214) 202-0101")).toBe("+12142020101");
  expect(normalizePhone("+1 214.202.0101")).toBe("+12142020101");
  expect(normalizePhone("12142020101")).toBe("+12142020101");
  expect(normalizePhone("+44 20 7946 0958")).toBeNull(); // toll-free numbers can't text abroad
  expect(normalizePhone("123-4567")).toBeNull();
  expect(normalizePhone("(114) 202-0101")).toBeNull(); // no area code starts with 1
  expect(isDemoPhone("+12145550144")).toBe(true);
  expect(isDemoPhone("+12142020101")).toBe(false);
  const text = smsText("invitation", { partner1: "Ayesha", partner2: "Omar", household: "The Ahmeds", link: "https://www.qubool.app/i/x" });
  expect(text).toMatch(/^Qubool: /);
  expect(text).toContain("https://www.qubool.app/i/x");
  expect(text).toMatch(/Reply STOP to opt out\.$/);
});

test("a paid wedding texts each household its own invitation link", async ({ page }) => {
  await admin.from("households").update({ phone: "(214) 202-0101", delivery_status: "not_sent" }).eq("id", hh);
  await loginAs(page, "ayesha@example.com");
  await textInvitations(page);
  await page.waitForURL(/sent=\d+/);

  const msg = (await sent()).find((m) => m.to === "+12142020101");
  expect(msg, "a text to the household's number").toBeTruthy();
  expect(msg!.from).toBe(TWILIO_TEST.from);
  expect(msg!.body).toMatch(/^Qubool: .*you're invited to the wedding of Ayesha & Omar/);
  expect(msg!.body).toMatch(/Reply STOP to opt out\.$/);
  expect(msg!.statusCallback).toMatch(/\/api\/twilio\/status$/);
  const link = msg!.body.match(/https?:\/\/\S+\/i\/[A-Za-z0-9_-]{32}/)![0];
  expect((await page.request.get(link)).status()).toBe(200);

  const { data: row } = await admin.from("outbox").select("status,provider_id,recipient").eq("household_id", hh).eq("channel", "sms").single();
  expect(row).toEqual({ status: "sent", provider_id: msg!.sid, recipient: "+12142020101" });
  await expect(page.getByText(/Texts: \d+ of 2,000 used/)).toBeVisible();
});

test("without confirming guests agreed to texts, nothing is sent", async ({ page }) => {
  await admin.from("households").update({ phone: "(214) 202-0101", delivery_status: "not_sent" }).eq("id", hh);
  await loginAs(page, "ayesha@example.com");
  await textInvitations(page, false);
  await expect(page.getByText(/tick the box confirming they agreed/)).toBeVisible();
  const { count } = await admin.from("outbox").select("id", { count: "exact", head: true }).eq("wedding_id", DEMO_WEDDING_ID).eq("channel", "sms");
  expect(count).toBe(0);
  expect(await sent()).toEqual([]);
});

test("free trials can't text, even by writing outbox rows directly", async ({ page }) => {
  await admin.from("weddings").update({ plan: "free", trial_ends_at: new Date(Date.now() + 7 * 864e5).toISOString() }).eq("id", DEMO_WEDDING_ID);
  await admin.from("households").update({ phone: "(214) 202-0101" }).eq("id", hh);
  await loginAs(page, "ayesha@example.com");
  await page.goto(`/dashboard/invitations?event=${DEMO_EVENTS.nikkah}`);
  const option = page.locator("form").filter({ hasText: "Personal invitations" }).locator("option[value=sms]");
  await expect(option).toBeDisabled();
  await expect(page.getByText(/isn't part of the free trial/)).toBeVisible();

  // Organizers can insert outbox rows under RLS; delivery still refuses them.
  const { data: row } = await admin.from("outbox").insert({ wedding_id: DEMO_WEDDING_ID, channel: "sms", recipient: "+12142020101", household_id: hh, kind: "invitation", subject: "x", body: "x" }).select("id").single();
  expect((await cron(page)).ok()).toBe(true);
  const { data: after } = await admin.from("outbox").select("status,error").eq("id", row!.id).single();
  expect(after).toEqual({ status: "failed", error: "Texting guests is part of Plus and Signature." });
  expect(await sent()).toEqual([]);
});

test("a guest who replied STOP isn't texted, and the outbox says why", async ({ page }) => {
  await admin.from("households").update({ phone: "+1 214 202 0199", delivery_status: "not_sent" }).eq("id", hh);
  await loginAs(page, "ayesha@example.com");
  await textInvitations(page);
  await page.waitForURL(/sent=\d+/);
  const { data: row } = await admin.from("outbox").select("status,error").eq("household_id", hh).eq("channel", "sms").single();
  expect(row!.status).toBe("failed");
  expect(row!.error).toMatch(/replied STOP/);
  await expect(page.getByText(/replied STOP to Qubool texts/).first()).toBeVisible();
});

test("the monthly allowance stops texts once it's used up", async ({ page }) => {
  await admin.from("weddings").update({ plan: "plus" }).eq("id", DEMO_WEDDING_ID);
  const now = new Date().toISOString();
  await admin.from("outbox").insert(Array.from({ length: 500 }, () => ({
    wedding_id: DEMO_WEDDING_ID, channel: "sms", recipient: "+12142020102", kind: "invitation", subject: "x", body: "x", status: "sent", sent_at: now,
  })));
  await admin.from("households").update({ phone: "(214) 202-0101" }).eq("id", hh);
  const { data: row } = await admin.from("outbox").insert({ wedding_id: DEMO_WEDDING_ID, channel: "sms", recipient: "+12142020101", household_id: hh, kind: "reminder", subject: "x", body: "x" }).select("id").single();
  expect((await cron(page)).ok()).toBe(true);
  const { data: after } = await admin.from("outbox").select("status,error").eq("id", row!.id).single();
  expect(after).toEqual({ status: "failed", error: "Monthly text allowance reached (500 texts in 30 days)." });
});

test("Twilio's signed delivery reports update the outbox; unsigned ones are refused", async ({ page, baseURL }) => {
  const { data: row } = await admin.from("outbox").insert({
    wedding_id: DEMO_WEDDING_ID, channel: "sms", recipient: "+12142020101", household_id: hh, kind: "invitation", subject: "x", body: "x", status: "sent", provider_id: "SMtestdelivery",
  }).select("id").single();
  const url = `${baseURL}/api/twilio/status`;
  const params = new URLSearchParams({ MessageSid: "SMtestdelivery", MessageStatus: "delivered", AccountSid: TWILIO_TEST.sid });
  const sign = (p: URLSearchParams) => createHmac("sha1", TWILIO_TEST.token).update(url + [...p.keys()].sort().map((k) => k + p.get(k)).join("")).digest("base64");
  const post = (p: URLSearchParams, signature: string) => page.request.post(url, { headers: { "content-type": "application/x-www-form-urlencoded", "x-twilio-signature": signature }, data: p.toString() });

  expect((await post(params, "bm90LXRoZS1zaWduYXR1cmU=")).status()).toBe(403);
  expect((await post(params, sign(params))).status()).toBe(204);
  expect((await admin.from("outbox").select("status").eq("id", row!.id).single()).data!.status).toBe("delivered");

  // A late "undelivered" never overwrites a confirmed delivery.
  const late = new URLSearchParams({ MessageSid: "SMtestdelivery", MessageStatus: "undelivered", ErrorCode: "30003" });
  expect((await post(late, sign(late))).status()).toBe(204);
  expect((await admin.from("outbox").select("status").eq("id", row!.id).single()).data!.status).toBe("delivered");
});
