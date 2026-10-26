import "server-only";
import { isStaffEmail } from "./staff";
import { adminClient } from "./supabase/server";

// Founding Vendor program and Qubool Beta: shared server-side helpers.
// Applications are read and written only with the service role (see the migration).

export const FOUNDING_SPOTS = 50;

/** Qubool is invite-only during the beta. Set QUBOOL_OPEN_SIGNUP=on to let anyone sign up. */
export const openSignup = () => process.env.QUBOOL_OPEN_SIGNUP === "on";

/**
 * May this email create an account (or a wedding) while Qubool is invite-only?
 * Couples and planners: a beta application staff have invited (or that already joined).
 * Vendors: an approved Founding Vendor application. Staff always may.
 */
export async function mayJoin(email: string, kind: "couple" | "vendor") {
  if (openSignup() || isStaffEmail(email)) return true;
  const admin = adminClient();
  const { count } = kind === "vendor"
    ? await admin.from("vendor_applications").select("id", { count: "exact", head: true }).eq("email", email).eq("status", "approved")
    : await admin.from("beta_applications").select("id", { count: "exact", head: true }).eq("email", email).in("status", ["invited", "joined"]);
  return (count ?? 0) > 0;
}

export const INVITE_ONLY = "Qubool is invite-only during the beta. Use the email you applied with, or request early access at qubool.app/beta and we'll email you when it's your turn.";
export const VENDORS_INVITE_ONLY = "Vendor accounts are open to approved Founding Vendors during the beta. Use the email you applied with, or apply at qubool.app/founding-vendors.";

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
