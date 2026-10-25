import "server-only";
import { DEMO_WEDDING_ID } from "./seed";
import { paymentsEnabled, stripe } from "./stripe";
import type { Supabase } from "./supabase/server";

// Self-serve account deletion (Settings → Delete account, and the vendor portal).
//
// What goes, with the service-role client, in this order:
//  1. Vendor promotion subscriptions are cancelled in Stripe first, so nobody is
//     billed for an account that no longer exists. If Stripe fails, nothing is deleted.
//  2. Weddings this person is the only administrator of are deleted for everyone,
//     with everything in them (guests, events, RSVPs, budget…) and their uploaded
//     photos and invitation art. A wedding with another administrator is kept:
//     only this person's membership goes, like an administrator removing them.
//  3. Their vendor listing (and the inquiries couples sent it).
//  4. The Supabase Auth user, which takes their profile and memberships with it.
// Payment records stay (wedding/listing link cleared) for tax and accounting.

export interface DeletionPlan {
  /** Weddings that will be deleted, and how many other people plan them. */
  deleteWeddings: { id: string; name: string; others: number }[];
  /** Weddings that keep going without this person. */
  leaveWeddings: { id: string; name: string }[];
  listings: { id: string; name: string }[];
}

const LIVE = ["active", "trialing", "past_due"];

export async function deletionPlan(admin: Supabase, userId: string): Promise<DeletionPlan> {
  const { data: mine } = await admin.from("wedding_collaborators").select("wedding_id").eq("user_id", userId);
  const ids = (mine ?? []).map((m) => m.wedding_id as string);
  const plan: DeletionPlan = { deleteWeddings: [], leaveWeddings: [], listings: [] };
  if (ids.length) {
    const [{ data: weddings }, { data: members }] = await Promise.all([
      admin.from("weddings").select("id,partner1,partner2").in("id", ids),
      admin.from("wedding_collaborators").select("wedding_id,user_id,role").in("wedding_id", ids),
    ]);
    for (const w of weddings ?? []) {
      const name = `${w.partner1} & ${w.partner2}`;
      const others = (members ?? []).filter((m) => m.wedding_id === w.id && m.user_id !== userId);
      // The shared demo wedding is never deleted by a visitor.
      if (w.id === DEMO_WEDDING_ID || others.some((m) => m.role === "admin")) plan.leaveWeddings.push({ id: w.id, name });
      else plan.deleteWeddings.push({ id: w.id, name, others: others.length });
    }
  }
  const { data: listings } = await admin.from("listings").select("id,name").eq("owner_user_id", userId);
  plan.listings = (listings ?? []).map((l) => ({ id: l.id as string, name: l.name as string }));
  return plan;
}

/** Every file under `prefix/` in a bucket (Storage lists one folder level at a time). */
async function filesUnder(admin: Supabase, bucket: string, prefix: string): Promise<string[]> {
  const out: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000, offset });
    if (error) throw new Error(error.message);
    for (const f of data ?? []) {
      const path = `${prefix}/${f.name}`;
      if (f.id) out.push(path);
      else out.push(...(await filesUnder(admin, bucket, path))); // a folder (invitation art is per event)
    }
    if ((data?.length ?? 0) < 1000) return out;
  }
}

async function removeWeddingFiles(admin: Supabase, weddingId: string) {
  for (const bucket of ["site-photos", "invitation-art"]) {
    const paths = await filesUnder(admin, bucket, weddingId);
    for (let i = 0; i < paths.length; i += 500) {
      const { error } = await admin.storage.from(bucket).remove(paths.slice(i, i + 500));
      if (error) throw new Error(error.message);
    }
  }
}

function must<T extends { error: { message: string } | null }>(r: T): T {
  if (r.error) throw new Error(r.error.message);
  return r;
}

/** Delete everything listed above for this user, then the user. Throws if anything fails. */
export async function deleteAccount(admin: Supabase, userId: string, email: string) {
  const plan = await deletionPlan(admin, userId);
  const listingIds = plan.listings.map((l) => l.id);
  const weddingIds = plan.deleteWeddings.map((w) => w.id);

  // 1. Stripe: stop vendor billing, and close any Checkout still open so it can't complete afterwards.
  if (paymentsEnabled()) {
    const subs = listingIds.length
      ? must(await admin.from("subscriptions").select("id,status,stripe_subscription_id,stripe_checkout_session_id").in("listing_id", listingIds)).data ?? []
      : [];
    for (const s of subs) {
      if (s.stripe_subscription_id && LIVE.includes(s.status)) {
        try {
          await stripe().subscriptions.cancel(s.stripe_subscription_id, { prorate: false, invoice_now: false });
        } catch (e) {
          if ((e as { code?: string }).code !== "resource_missing") throw e;
        }
        must(await admin.from("subscriptions").update({ status: "canceled", updated_at: new Date().toISOString() }).eq("id", s.id));
      }
    }
    const pendingPayments = weddingIds.length
      ? must(await admin.from("payments").select("stripe_checkout_session_id").in("wedding_id", weddingIds).eq("status", "pending")).data ?? []
      : [];
    const open = [...subs.filter((s) => s.status === "pending"), ...pendingPayments].map((s) => s.stripe_checkout_session_id).filter(Boolean) as string[];
    // Best effort: an already-expired or completed session can't be expired, which is fine.
    await Promise.all(open.map((id) => stripe().checkout.sessions.expire(id).catch(() => null)));
  }

  // 2. Weddings they alone run: files first, then the rows (everything else cascades).
  for (const id of weddingIds) await removeWeddingFiles(admin, id);
  if (weddingIds.length) must(await admin.from("weddings").delete().in("id", weddingIds));

  // 3. Their listing (inquiries cascade; subscriptions keep their row, unlinked).
  if (listingIds.length) must(await admin.from("listings").delete().in("id", listingIds));
  // Vendor notifications queued to them aren't tied to a wedding.
  if (email) must(await admin.from("outbox").delete().is("wedding_id", null).eq("recipient", email));

  // 4. The account itself: profile and remaining memberships cascade.
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
  return plan;
}
