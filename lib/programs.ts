import "server-only";
import { adminClient } from "./supabase/server";

// Founding Vendor program and Qubool Beta: shared server-side helpers.
// Applications are read and written only with the service role (see the migration).

export const FOUNDING_SPOTS = 50;

/** How many of the 50 founding spots are still open (shown on the public page). */
export async function foundingSpotsLeft() {
  const { count } = await adminClient().from("vendor_applications").select("id", { count: "exact", head: true }).not("founding_number", "is", null);
  return Math.max(0, FOUNDING_SPOTS - (count ?? 0));
}

/** An approved founding vendor's listing gets its free Featured year (once). Safe to call repeatedly. */
export async function applyFoundingPerks(email: string) {
  const { data, error } = await adminClient().rpc("apply_founding_perks", { p_email: email });
  if (error) console.error("apply_founding_perks:", error.message);
  return data === true;
}

/**
 * A beta couple or planner creating their wedding: complimentary full access (Signature, no trial
 * clock), and the application is marked joined. Only for applications staff have invited.
 */
export async function applyBetaPerks(email: string, weddingId: string) {
  const admin = adminClient();
  const { data: app } = await admin.from("beta_applications").select("id").ilike("email", email).eq("status", "invited").limit(1).maybeSingle();
  if (!app) return false;
  await admin.from("weddings").update({ plan: "signature", trial_ends_at: null }).eq("id", weddingId);
  await admin.from("beta_applications").update({ status: "joined", joined_at: new Date().toISOString() }).eq("id", app.id);
  await admin.from("audit_log").insert({ wedding_id: weddingId, actor: "Qubool", action: "plan_change", detail: "Beta: complimentary Signature access" });
  return true;
}
