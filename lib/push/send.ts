import "server-only";
import { can, scopeFor } from "../access";
import { isDemoWedding } from "../demo";
import { adminClient } from "../supabase/server";
import type { Role, Side } from "../types";
import { apnsEnabled, sendApns, type PushMessage } from "./apns";
import { fcmEnabled, sendFcm } from "./fcm";

// Push notifications to the iOS and Android apps. Phones register in device_tokens
// (components/push-prompt.tsx → registerDevice). Each platform sends only when its keys
// are set (lib/push/apns.ts, lib/push/fcm.ts); without them these do nothing.
//
// The demo wedding and sample vendors never notify anyone: their accounts are shared, so
// a stranger's RSVP in the demo would reach every phone signed in to them. The tests turn
// that on with QUBOOL_PUSH_DEMO=send (playwright.config.ts).
const demoAllowed = () => process.env.QUBOOL_PUSH_DEMO === "send";

// Callers run these after the response (next/server `after`), so a slow or failing push
// service never holds up an RSVP or an inquiry.

export const pushEnabled = () => apnsEnabled() || fcmEnabled();

/** Sends `msg` to every phone of these users. Dead tokens are deleted. */
export async function pushToUsers(userIds: string[], msg: PushMessage) {
  if (!pushEnabled() || !userIds.length) return;
  const admin = adminClient();
  const { data } = await admin.from("device_tokens").select("token, platform").in("user_id", userIds);
  const rows = (data ?? []) as { token: string; platform: "ios" | "android" }[];
  const ios = apnsEnabled() ? rows.filter((r) => r.platform === "ios").map((r) => r.token) : [];
  const android = fcmEnabled() ? rows.filter((r) => r.platform === "android").map((r) => r.token) : [];
  const [ri, ra] = await Promise.all([ios.length ? sendApns(ios, msg) : [], android.length ? sendFcm(android, msg) : []]);
  const gone = [...ios.filter((_, i) => !ri[i].ok && (ri[i] as { gone: boolean }).gone), ...android.filter((_, i) => !ra[i].ok && (ra[i] as { gone: boolean }).gone)];
  if (gone.length) await admin.from("device_tokens").delete().in("token", gone);
  for (const r of [...ri, ...ra]) if (!r.ok && !r.gone) console.warn(`push: ${r.error}`);
}

/**
 * A household answered its invitation: tell the couple and the organizers who look after
 * those guests. Each person hears only about the events and side their role covers.
 */
export async function notifyRsvp(householdId: string, responses: { eventId: string; status: string }[]) {
  if (!pushEnabled() || !responses.length) return;
  const admin = adminClient();
  const { data: h } = await admin.from("households").select("name, side, wedding_id").eq("id", householdId).maybeSingle();
  if (!h || (isDemoWedding(h.wedding_id as string) && !demoAllowed())) return;
  const { data: collabs } = await admin.from("wedding_collaborators").select("user_id, role, event_ids").eq("wedding_id", h.wedding_id);
  const side = h.side as Side;

  // Group recipients by the message they get, so one send covers everyone with the same view.
  const groups = new Map<string, { msg: PushMessage; users: string[] }>();
  for (const c of (collabs ?? []) as { user_id: string; role: Role; event_ids: string[] | null }[]) {
    if (c.role === "viewer") continue;
    const scope = scopeFor(c.role, c.event_ids ?? undefined);
    if (!can(scope, "rsvps")) continue;
    if (scope.side && side !== scope.side && side !== "both") continue;
    const mine = scope.eventIds ? responses.filter((r) => scope.eventIds!.includes(r.eventId)) : responses;
    if (!mine.length) continue;
    const yes = mine.filter((r) => r.status === "attending").length, no = mine.length - yes;
    const body = [yes && `${yes} attending`, no && `${no} not attending`].filter(Boolean).join(", ");
    const key = `${yes}/${no}`;
    const g = groups.get(key) ?? { msg: { title: `${h.name} RSVP'd`, body, url: `/dashboard/guests/${householdId}` }, users: [] };
    g.users.push(c.user_id);
    groups.set(key, g);
  }
  await Promise.all([...groups.values()].map((g) => pushToUsers(g.users, g.msg)));
}

/** A couple contacted a vendor through the marketplace: tell the vendor. */
export async function notifyInquiry(listingId: string, from: string, message: string) {
  if (!pushEnabled()) return;
  const { data: l } = await adminClient().from("listings").select("owner_user_id, is_demo").eq("id", listingId).maybeSingle();
  if (!l?.owner_user_id || (l.is_demo && !demoAllowed())) return;
  const text = message.replace(/\s+/g, " ");
  await pushToUsers([l.owner_user_id as string], {
    title: `New inquiry from ${from}`,
    body: text.length > 120 ? `${text.slice(0, 119)}…` : text,
    url: "/vendor",
  });
}
