import "server-only";
import { createHash } from "node:crypto";
import { siteUrl } from "../auth";
import { adminClient, type Supabase } from "../supabase/server";
import { deriveToken } from "../tokens";
import { emailEnabled, sendBatch, type OutgoingEmail } from "./resend";
import {
  collaboratorInviteEmail, inquiryEmail, invitationEmail, linkResendEmail, reminderEmail, saveTheDateEmail, type Email,
} from "./templates";

// Delivery of `pending` email rows in the outbox through Resend.
//
// Whoever writes the outbox (an organizer under RLS, the guest link re-send, or
// the invite_collaborator / send_inquiry RPCs), the email itself is rebuilt here
// from trusted rows: the household's address on file and its current link, the
// wedding's names, the pending collaborator invite. So an organizer inserting
// outbox rows directly can't use Qubool to send arbitrary text to arbitrary
// addresses. Only `inquiry` rows, which only send_inquiry() can write, carry
// their own subject and text.
//
// Called right after the Node code that queues messages, and by the cron route
// (app/api/email/send) for anything left over, e.g. after a Resend outage.

type OutboxRow = {
  id: string; wedding_id: string | null; channel: string; recipient: string; household_id: string | null;
  subject: string | null; body: string | null; kind: string; event_id: string | null; created_at: string;
};
type Built = Email | { error: string };

/** Rows older than this are never sent automatically (so turning delivery on doesn't flush a backlog). */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
/** A row left `sending` this long was interrupted mid-request; it may or may not have gone out. */
const STUCK_MS = 15 * 60 * 1000;
const BATCH = 100;

export interface DeliveryResult { sent: number; failed: number; retry: number }

/**
 * Sends pending email rows (optionally only one wedding's). `origin` is the
 * site's absolute origin for links; NEXT_PUBLIC_SITE_URL wins when set.
 * Without RESEND_API_KEY this does nothing and the rows stay pending.
 */
export async function deliverPending(admin: Supabase, opts: { origin: string; weddingId?: string; kind?: string; limit?: number }): Promise<DeliveryResult> {
  const result: DeliveryResult = { sent: 0, failed: 0, retry: 0 };
  if (!emailEnabled()) return result;
  const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL || opts.origin).origin;

  let q = admin.from("outbox").select("id").eq("status", "pending").eq("channel", "email")
    .gte("created_at", new Date(Date.now() - MAX_AGE_MS).toISOString()).order("created_at").limit(opts.limit ?? 1000);
  if (opts.weddingId) q = q.eq("wedding_id", opts.weddingId);
  if (opts.kind) q = q.eq("kind", opts.kind);
  const { data: pending, error } = await q;
  if (error) throw new Error(`outbox: ${error.message}`);
  // One Resend batch at a time (which also keeps the id lists in each query's URL short).
  for (let i = 0; i < (pending ?? []).length; i += BATCH) {
    const r = await deliverChunk(admin, pending!.slice(i, i + BATCH).map((x) => x.id), origin);
    result.sent += r.sent; result.failed += r.failed; result.retry += r.retry;
  }
  return result;
}

async function deliverChunk(admin: Supabase, ids: string[], origin: string): Promise<DeliveryResult> {
  const result: DeliveryResult = { sent: 0, failed: 0, retry: 0 };
  // Claim the rows: only one concurrent caller wins each one.
  const { data: claimed, error } = await admin.from("outbox").update({ status: "sending" }).in("id", ids).eq("status", "pending").select("*");
  if (error) throw new Error(`outbox: ${error.message}`);
  const rows = (claimed ?? []) as OutboxRow[];
  if (!rows.length) return result;

  const ctx = await loadContext(admin, rows);
  const ready: { row: OutboxRow; email: OutgoingEmail }[] = [];
  for (const row of rows) {
    const b = build(row, ctx, origin);
    if ("error" in b) {
      await finish(admin, row.id, { status: "failed", error: b.error });
      result.failed++;
    } else {
      ready.push({ row, email: { to: row.recipient, ...b, tags: { kind: row.kind } } });
    }
  }
  if (!ready.length) return result;

  const key = createHash("sha256").update(ready.map((c) => c.row.id).join(",")).digest("hex");
  const res = await sendBatch(ready.map((c) => c.email), `outbox-${key}`);
  if (res.ok) {
    const sentAt = new Date().toISOString();
    await Promise.all(ready.map((c, j) => finish(admin, c.row.id, { status: "sent", sent_at: sentAt, provider_id: res.ids[j], error: null })));
    result.sent += ready.length;
  } else {
    // Retryable (rate limit, outage): back to pending for the next run. Otherwise failed for good.
    await admin.from("outbox").update({ status: res.retry ? "pending" : "failed", error: res.error }).in("id", ready.map((c) => c.row.id));
    if (res.retry) result.retry += ready.length; else result.failed += ready.length;
    console.error(`Email batch of ${ready.length} failed: ${res.error}`);
  }
  return result;
}

/**
 * Sends what a server action just queued. Never throws: the messages are in the
 * outbox either way, and the cron route retries anything left pending.
 */
export async function deliverNow(filter: { weddingId?: string; kind?: string }) {
  if (!emailEnabled()) return;
  try {
    await deliverPending(adminClient(), { origin: await siteUrl("/"), ...filter });
  } catch (e) {
    console.error("Email delivery failed:", e);
  }
}

/** Marks rows stuck in `sending` (the process died mid-request) as failed, rather than risk sending twice. */
export async function failStuck(admin: Supabase) {
  const { data } = await admin.from("outbox")
    .update({ status: "failed", error: "Interrupted while sending. Check the Resend dashboard before re-sending." })
    .eq("status", "sending").lt("created_at", new Date(Date.now() - STUCK_MS).toISOString()).select("id");
  return data?.length ?? 0;
}

async function finish(admin: Supabase, id: string, patch: Record<string, unknown>) {
  const { error } = await admin.from("outbox").update(patch).eq("id", id);
  if (error) console.error(`outbox ${id}: ${error.message}`);
}

// ---------- building each email from trusted rows ----------

interface Context {
  weddings: Map<string, { partner1: string; partner2: string }>;
  households: Map<string, { wedding_id: string; name: string; email: string | null }>;
  tokens: Map<string, string>;   // household id → newest active token id
  events: Map<string, { wedding_id: string; name: string }>;
  invites: Map<string, { invitedBy: string | null }>;   // `${wedding}:${email}` → pending collaborator invite
  members: Set<string>;          // `${wedding}:${email}` of existing collaborators
  admins: Map<string, string>;   // wedding id → an administrator's user id
  names: Map<string, string>;    // profile id → name
}

const uniq = (xs: (string | null)[]) => [...new Set(xs.filter((x): x is string => !!x))];
const key = (w: string | null, email: string) => `${w}:${email.trim().toLowerCase()}`;

async function loadContext(admin: Supabase, rows: OutboxRow[]): Promise<Context> {
  const weddingIds = uniq(rows.map((r) => r.wedding_id));
  const householdIds = uniq(rows.map((r) => r.household_id));
  const eventIds = uniq(rows.map((r) => r.event_id));
  const collabRows = rows.filter((r) => r.kind === "collaborator_invite" && r.wedding_id);
  const none = ["00000000-0000-0000-0000-000000000000"];

  const [w, h, t, e, inv, mem] = await Promise.all([
    admin.from("weddings").select("id,partner1,partner2").in("id", weddingIds.length ? weddingIds : none),
    admin.from("households").select("id,wedding_id,name,email").in("id", householdIds.length ? householdIds : none),
    admin.from("invitation_tokens").select("id,household_id,created_at").in("household_id", householdIds.length ? householdIds : none)
      .is("revoked_at", null).order("created_at", { ascending: false }),
    admin.from("events").select("id,wedding_id,name").in("id", eventIds.length ? eventIds : none),
    admin.from("collaborator_invites").select("wedding_id,email,invited_by").in("wedding_id", collabRows.length ? uniq(collabRows.map((r) => r.wedding_id)) : none),
    admin.from("wedding_collaborators").select("wedding_id,user_id,role").order("invited_at").in("wedding_id", collabRows.length ? uniq(collabRows.map((r) => r.wedding_id)) : none),
  ]);
  for (const r of [w, h, t, e, inv, mem]) if (r.error) throw new Error(r.error.message);

  const tokens = new Map<string, string>();
  for (const x of t.data ?? []) if (!tokens.has(x.household_id)) tokens.set(x.household_id, x.id);
  const invites = new Map((inv.data ?? []).map((x) => [key(x.wedding_id, x.email), { invitedBy: x.invited_by as string | null }]));
  const admins = new Map<string, string>();
  for (const x of mem.data ?? []) if (x.role === "admin" && !admins.has(x.wedding_id)) admins.set(x.wedding_id, x.user_id);
  const profileIds = uniq([...[...invites.values()].map((x) => x.invitedBy), ...(mem.data ?? []).map((x) => x.user_id as string)]);
  const { data: profiles, error: pe } = profileIds.length ? await admin.from("profiles").select("id,name,email").in("id", profileIds) : { data: [], error: null };
  if (pe) throw new Error(pe.message);
  const emailOf = new Map((profiles ?? []).map((x) => [x.id as string, x.email as string]));
  const members = new Set((mem.data ?? []).map((x) => key(x.wedding_id, emailOf.get(x.user_id) ?? "")));

  return {
    weddings: new Map((w.data ?? []).map((x) => [x.id, x])),
    households: new Map((h.data ?? []).map((x) => [x.id, x])),
    tokens, invites, members, admins,
    events: new Map((e.data ?? []).map((x) => [x.id, x])),
    names: new Map((profiles ?? []).map((x) => [x.id, x.name as string])),
  };
}

function build(row: OutboxRow, ctx: Context, origin: string): Built {
  const url = (path: string) => new URL(path, origin).toString();
  const wedding = row.wedding_id ? ctx.weddings.get(row.wedding_id) : undefined;

  switch (row.kind) {
    case "invitation": case "save_the_date": case "reminder": case "verification": {
      const h = row.household_id ? ctx.households.get(row.household_id) : undefined;
      if (!wedding || !h || h.wedding_id !== row.wedding_id) return { error: "No such household" };
      if (!h.email || h.email.trim().toLowerCase() !== row.recipient.trim().toLowerCase()) return { error: "Recipient isn't the household's email on file" };
      const tokenId = ctx.tokens.get(row.household_id!);
      if (!tokenId) return { error: "The household has no active invitation link" };
      const link = url(`/i/${deriveToken(tokenId)}`);
      const o = { wedding, household: h.name, link };
      if (row.kind === "invitation") return invitationEmail(o);
      if (row.kind === "save_the_date") return saveTheDateEmail(o);
      if (row.kind === "verification") return linkResendEmail(o);
      const ev = row.event_id ? ctx.events.get(row.event_id) : undefined;
      return reminderEmail({ ...o, link: `${link}?to=rsvp`, event: ev?.wedding_id === row.wedding_id ? ev.name : undefined });
    }
    case "collaborator_invite": {
      if (!wedding) return { error: "No such wedding" };
      const k = key(row.wedding_id, row.recipient);
      const invite = ctx.invites.get(k);
      const member = ctx.members.has(k);
      if (!invite && !member) return { error: "No collaborator invitation for this address" };
      // Already-added collaborators have no invite row saying who added them; an administrator did.
      const by = invite ? invite.invitedBy : ctx.admins.get(row.wedding_id!);
      const inviter = (by && ctx.names.get(by)) || "Someone";
      return collaboratorInviteEmail({ wedding, inviter: inviter.slice(0, 80), hasAccount: !invite, link: url(invite ? "/signup" : "/login") });
    }
    case "inquiry": {
      // Written only by send_inquiry() (organizers can only insert rows with a wedding_id).
      if (row.wedding_id) return { error: "Unexpected inquiry row" };
      return inquiryEmail({ subject: row.subject ?? "New inquiry", message: row.body ?? "", link: url("/vendor") });
    }
    default:
      return { error: `No email template for "${row.kind}"` };
  }
}
