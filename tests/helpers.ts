import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { APIRequestContext } from "@playwright/test";
import { supabaseAnonKey, supabaseServiceKey, supabaseUrl } from "../lib/supabase/env";
import { deriveToken, tokenHashHex } from "../lib/tokens";
import { DEMO_EVENTS, DEMO_HOUSEHOLDS, DEMO_PASSWORD, DEMO_WEDDING_ID } from "../lib/seed";

export { DEMO_EVENTS, DEMO_HOUSEHOLDS, DEMO_PASSWORD, DEMO_WEDDING_ID };
export const SLUG = "ayesha-and-omar";

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
export const adminClient = () => createClient(supabaseUrl(), supabaseServiceKey(), opts);
export const anonClient = () => createClient(supabaseUrl(), supabaseAnonKey(), opts);

/** A Supabase client signed in as a seeded organizer (talks to the database directly, under RLS). */
export async function signedIn(email: string) {
  const sb = createClient(supabaseUrl(), supabaseAnonKey(), opts);
  const { error } = await sb.auth.signInWithPassword({ email, password: DEMO_PASSWORD });
  if (error) throw error;
  return sb;
}

/**
 * Details of each event that must never reach someone who isn't invited to it.
 * (Event *type* words like "Shaadi" also appear in the demo switcher's labels, so
 * we look for names, venues, addresses and ids instead.)
 */
export const PRIVATE_MARKERS: Record<keyof typeof DEMO_EVENTS, string[]> = {
  mehndi: ["Mehndi Night", "The Siddiqui Residence", "4412 Willow Bend", DEMO_EVENTS.mehndi],
  nikkah: ["Masjid Al-Noor", "1200 Crescent Ave", DEMO_EVENTS.nikkah],
  shaadi: ["The Crescent Ballroom", "2200 Ross Ave", "Chicken karahi menu", DEMO_EVENTS.shaadi],
  walima: ["Magnolia Estate", "8900 Legacy Dr", "Classic menu", DEMO_EVENTS.walima],
};

/** Raw server responses (HTML + inlined RSC payload) for the pages that list events. */
export async function siteHtml(request: APIRequestContext) {
  const pages = ["", "/events", "/rsvp", "/faq", "/story", "/travel", "/gallery"];
  const bodies = await Promise.all(pages.map(async (p) => {
    const res = await request.get(`/w/${SLUG}${p}`);
    if (!res.ok()) throw new Error(`/w/${SLUG}${p} → ${res.status()}`);
    return res.text();
  }));
  return bodies.join("\n");
}

/** Issue a fresh invitation link for a household straight in the database, as the dashboard would. */
export async function issueLink(householdId: string) {
  const id = randomUUID();
  const token = deriveToken(id);
  const { error } = await adminClient().from("invitation_tokens").insert({
    id, token_hash: tokenHashHex(token), household_id: householdId, wedding_id: DEMO_WEDDING_ID,
  });
  if (error) throw error;
  return { id, token };
}

export async function revokeLink(id: string) {
  const { error } = await adminClient().from("invitation_tokens").update({ revoked_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

/** Sign in through the real login form. */
export async function loginAs(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(dashboard|vendor|onboarding|admin)/);
}
