import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "../lib/supabase/env";
import { adminClient, DEMO_PASSWORD, loginAs } from "./helpers";

// Self-serve account deletion (lib/account.ts). Each test makes its own
// throwaway accounts, so the seeded demo is never touched.
const admin = adminClient();
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const made: string[] = [];

test.afterAll(async () => {
  for (const id of made) await admin.auth.admin.deleteUser(id).catch(() => null);
});

async function account(label: string, meta: Record<string, string> = {}) {
  const email = `${label}.${Date.now()}.${made.length}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: DEMO_PASSWORD, email_confirm: true, user_metadata: { name: label, ...meta } });
  if (error) throw error;
  made.push(data.user.id);
  return { id: data.user.id, email };
}

/** A wedding created the way onboarding does, as `email`. */
async function wedding(email: string) {
  const sb = createClient(supabaseUrl(), supabaseAnonKey(), { auth: { persistSession: false, autoRefreshToken: false } });
  await sb.auth.signInWithPassword({ email, password: DEMO_PASSWORD });
  const { data, error } = await sb.rpc("create_wedding", { p: { partner1: "Sana", partner2: "Yusuf", relationship: "Bride" } });
  if (error) throw error;
  return (data as { id: string }).id;
}

async function deleteViaUi(page: Page, path: string) {
  await page.goto(path);
  const button = page.getByRole("button", { name: "Delete my account" });
  await expect(button).toBeDisabled();
  await page.getByLabel("Type DELETE to confirm").fill("delete");
  await expect(button).toBeDisabled();
  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  await button.click();
  await page.waitForURL("**/account-deleted");
  await expect(page.getByRole("heading", { name: "Your account has been deleted" })).toBeVisible();
}

/** Setup steps must succeed, or "it's gone afterwards" proves nothing. */
const ok = <T extends { error: unknown }>(r: T) => { expect(r.error).toBeNull(); return r; };

const gone = async (userId: string) => (await admin.auth.admin.getUserById(userId)).error !== null;

test("the only administrator deletes their wedding with it; payment records stay", async ({ page }) => {
  const owner = await account("owner");
  const cousin = await account("cousin");
  const wid = await wedding(owner.email);
  ok(await admin.from("wedding_collaborators").insert({ wedding_id: wid, user_id: cousin.id, role: "viewer", relationship: "Cousin" }));
  const { data: hh } = await admin.from("households").insert({ wedding_id: wid, name: "The Khans", side: "bride" }).select("id").single();
  ok(await admin.from("guests").insert({ household_id: hh!.id, first_name: "Amina" }));
  ok(await admin.storage.from("site-photos").upload(`${wid}/cover.png`, PNG, { contentType: "image/png" }));
  ok(await admin.storage.from("invitation-art").upload(`${wid}/${randomUUID()}/card.png`, PNG, { contentType: "image/png" }));
  const session = `cs_test_delete_${Date.now()}`;
  ok(await admin.from("payments").insert({ wedding_id: wid, plan: "plus", amount: 8000, status: "paid", stripe_checkout_session_id: session, created_by: owner.id }));

  await loginAs(page, owner.email);
  await page.goto("/dashboard/settings");
  const card = page.locator("#delete-account");
  await expect(card).toContainText("Sana & Yusuf will be deleted for everyone");
  await expect(card).toContainText("1 other collaborator will lose access");
  await deleteViaUi(page, "/dashboard/settings");

  expect(await gone(owner.id)).toBe(true);
  expect((await admin.from("profiles").select("id").eq("id", owner.id)).data).toEqual([]);
  expect((await admin.from("weddings").select("id").eq("id", wid)).data).toEqual([]);
  expect((await admin.from("households").select("id").eq("id", hh!.id)).data).toEqual([]);
  expect((await admin.storage.from("site-photos").list(wid)).data).toEqual([]);
  expect((await admin.storage.from("invitation-art").list(wid)).data).toEqual([]);
  // Kept for tax and accounting, no longer linked to anyone.
  expect((await admin.from("payments").select("wedding_id,created_by,amount").eq("stripe_checkout_session_id", session)).data)
    .toEqual([{ wedding_id: null, created_by: null, amount: 8000 }]);
  // The cousin's own account is untouched.
  expect(await gone(cousin.id)).toBe(false);

  // Signed out: the dashboard sends them to log in.
  await page.goto("/dashboard");
  await page.waitForURL(/\/login/);
});

test("a wedding with another administrator carries on; only the leaver's membership goes", async ({ page }) => {
  const owner = await account("owner");
  const sister = await account("sister");
  const wid = await wedding(owner.email);
  ok(await admin.from("wedding_collaborators").insert({ wedding_id: wid, user_id: sister.id, role: "guest_manager", relationship: "Sister" }));

  // Non-administrators can reach Settings for their own account, but not the wedding's settings.
  await loginAs(page, sister.email);
  await page.goto("/dashboard/settings");
  await expect(page.getByRole("heading", { name: "Family & collaborators" })).toHaveCount(0);
  await expect(page.locator("#delete-account")).toContainText("Sana & Yusuf stays");
  await deleteViaUi(page, "/dashboard/settings");

  expect(await gone(sister.id)).toBe(true);
  expect((await admin.from("weddings").select("id").eq("id", wid)).data).toHaveLength(1);
  expect((await admin.from("wedding_collaborators").select("user_id,role").eq("wedding_id", wid)).data).toEqual([{ user_id: owner.id, role: "admin" }]);
  await admin.from("weddings").delete().eq("id", wid);
});

test("a vendor deletes their listing and inquiries; subscription records stay", async ({ page }) => {
  const vendor = await account("vendor", { kind: "vendor", business: "Deletable Blooms", category: "Florist", city: "Dallas" });
  const { data: listing } = await admin.from("listings").select("id").eq("owner_user_id", vendor.id).single();
  ok(await admin.from("inquiries").insert({ listing_id: listing!.id, from_name: "Sana", from_email: "sana@example.com", message: "Hello" }));
  const sub = `sub_test_delete_${Date.now()}`;
  ok(await admin.from("subscriptions").insert({ listing_id: listing!.id, tier: "featured", status: "canceled", amount: 1000, stripe_subscription_id: sub }));

  await loginAs(page, vendor.email);
  await expect(page.locator("#delete-account")).toContainText("Deletable Blooms and its inquiries will be deleted");
  await deleteViaUi(page, "/vendor");

  expect(await gone(vendor.id)).toBe(true);
  expect((await admin.from("listings").select("id").eq("id", listing!.id)).data).toEqual([]);
  expect((await admin.from("inquiries").select("id").eq("listing_id", listing!.id)).data).toEqual([]);
  expect((await admin.from("subscriptions").select("listing_id,amount").eq("stripe_subscription_id", sub)).data).toEqual([{ listing_id: null, amount: 1000 }]);
});

test("someone still in onboarding can delete their account", async ({ page }) => {
  const fresh = await account("fresh");
  await loginAs(page, fresh.email);
  await page.getByRole("link", { name: "Delete account" }).click();
  await deleteViaUi(page, "/account/delete");
  expect(await gone(fresh.id)).toBe(true);
});

test("the shared demo accounts can't be deleted", async ({ page }) => {
  await loginAs(page, "ayesha@example.com");
  await page.goto("/dashboard/settings");
  await expect(page.locator("#delete-account")).toContainText("can't be deleted");
  await expect(page.getByRole("button", { name: "Delete my account" })).toBeDisabled();
});
