import "server-only";
import { type Supabase } from "../supabase/server";
import { deriveToken } from "../tokens";
import { DEMO_WEDDING_ID } from "../seed";
import { SMS_PER_MONTH, hasFeature } from "../plans";
import type { Plan } from "../types";
import { isDemoPhone, normalizePhone, smsText, SMS_KINDS, type SmsKind } from "./rules";
import { sendSms, smsEnabled } from "./twilio";

// Delivery of `pending` SMS rows in the outbox through Twilio.
//
// Like email (lib/email/deliver.ts), each text is rebuilt here from trusted rows:
// the household's phone on file, its current link and the wedding's names. An
// organizer inserting outbox rows directly can't text arbitrary words to arbitrary
// numbers, and the checks that cost money live here too: only weddings on a bought
// plan (never a free trial) may text, and only up to their monthly allowance.

type OutboxRow = { id: string; wedding_id: string | null; recipient: string; household_id: string | null; kind: string; event_id: string | null };

const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
/** Twilio accepts and queues requests quickly; a few at a time keeps a big send inside one request. */
const CONCURRENCY = 8;

export interface SmsResult { sent: number; failed: number; retry: number }

/** Sends pending SMS rows (optionally only one wedding's). `origin` is the site's absolute origin for links. */
export async function deliverSmsPending(admin: Supabase, opts: { origin: string; weddingId?: string; limit?: number }): Promise<SmsResult> {
  const result: SmsResult = { sent: 0, failed: 0, retry: 0 };
  if (!smsEnabled()) return result;
  const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL || opts.origin).origin;

  let q = admin.from("outbox").select("id").eq("status", "pending").eq("channel", "sms")
    .gte("created_at", new Date(Date.now() - MAX_AGE_MS).toISOString()).order("created_at").limit(opts.limit ?? 2000);
  if (opts.weddingId) q = q.eq("wedding_id", opts.weddingId);
  const { data: pending, error } = await q;
  if (error) throw new Error(`outbox: ${error.message}`);
  if (!pending?.length) return result;

  // Claim the rows: only one concurrent caller wins each one.
  const { data: claimed, error: ce } = await admin.from("outbox").update({ status: "sending" })
    .in("id", pending.map((x) => x.id)).eq("status", "pending").select("id,wedding_id,recipient,household_id,kind,event_id");
  if (ce) throw new Error(`outbox: ${ce.message}`);
  const rows = (claimed ?? []) as OutboxRow[];
  if (!rows.length) return result;

  const fail = async (ids: string[], error: string) => {
    if (!ids.length) return;
    await admin.from("outbox").update({ status: "failed", error }).in("id", ids);
    result.failed += ids.length;
  };

  // The interactive demo never texts anyone: not from the demo wedding, and not to 555 numbers.
  // (The end-to-end SMS tests text through the demo wedding on purpose: QUBOOL_SMS_DEMO_ROWS=send, tests only.)
  const demoAllowed = process.env.QUBOOL_SMS_DEMO_ROWS === "send";
  const isDemo = (r: OutboxRow) => !demoAllowed && (r.wedding_id === DEMO_WEDDING_ID || isDemoPhone(normalizePhone(r.recipient) ?? ""));
  const demo = rows.filter(isDemo).map((r) => r.id);
  if (demo.length) await admin.from("outbox").update({ status: "skipped", error: "Demo: not sent" }).in("id", demo);
  const live = rows.filter((r) => !isDemo(r));

  const ctx = await loadContext(admin, live);
  const ready: { row: OutboxRow; to: string; body: string }[] = [];
  for (const row of live) {
    const b = build(row, ctx, origin);
    if ("error" in b) await fail([row.id], b.error);
    else ready.push({ row, ...b });
  }

  // Allowances: what each wedding may still send in the last 30 days, oldest rows first.
  const used = await sentLast30Days(admin, [...new Set(ready.map((r) => r.row.wedding_id!))]);
  const sendable: typeof ready = [];
  for (const r of ready) {
    const w = ctx.weddings.get(r.row.wedding_id!)!;
    const cap = SMS_PER_MONTH[w.plan];
    const n = used.get(r.row.wedding_id!) ?? 0;
    if (n >= cap) { await fail([r.row.id], `Monthly text allowance reached (${cap} texts in 30 days).`); continue; }
    used.set(r.row.wedding_id!, n + 1);
    sendable.push(r);
  }

  const callback = new URL("/api/twilio/status", origin).toString();
  for (let i = 0; i < sendable.length; i += CONCURRENCY) {
    await Promise.all(sendable.slice(i, i + CONCURRENCY).map(async ({ row, to, body }) => {
      const res = await sendSms(to, body, callback);
      if (res.ok) {
        await admin.from("outbox").update({ status: "sent", sent_at: new Date().toISOString(), provider_id: res.sid, error: null }).eq("id", row.id);
        result.sent++;
      } else if (res.retry) {
        await admin.from("outbox").update({ status: "pending", error: res.error }).eq("id", row.id);
        result.retry++;
      } else {
        await fail([row.id], res.error);
      }
    }));
  }
  if (result.retry) console.error(`SMS: ${result.retry} texts will be retried`);
  return result;
}

async function sentLast30Days(admin: Supabase, weddingIds: string[]) {
  const counts = new Map<string, number>();
  await Promise.all(weddingIds.map(async (id) => {
    const { count } = await admin.from("outbox").select("id", { count: "exact", head: true })
      .eq("wedding_id", id).eq("channel", "sms").in("status", ["sent", "delivered"])
      .gte("sent_at", new Date(Date.now() - MONTH_MS).toISOString());
    counts.set(id, count ?? 0);
  }));
  return counts;
}

interface Context {
  weddings: Map<string, { partner1: string; partner2: string; plan: Plan }>;
  households: Map<string, { wedding_id: string; name: string; phone: string | null }>;
  tokens: Map<string, string>;
  events: Map<string, { wedding_id: string; name: string }>;
}

async function loadContext(admin: Supabase, rows: OutboxRow[]): Promise<Context> {
  const ids = (f: (r: OutboxRow) => string | null) => {
    const xs = [...new Set(rows.map(f).filter((x): x is string => !!x))];
    return xs.length ? xs : ["00000000-0000-0000-0000-000000000000"];
  };
  const [w, h, t, e] = await Promise.all([
    admin.from("weddings").select("id,partner1,partner2,plan").in("id", ids((r) => r.wedding_id)),
    admin.from("households").select("id,wedding_id,name,phone").in("id", ids((r) => r.household_id)),
    admin.from("invitation_tokens").select("id,household_id,created_at").in("household_id", ids((r) => r.household_id))
      .is("revoked_at", null).order("created_at", { ascending: false }),
    admin.from("events").select("id,wedding_id,name").in("id", ids((r) => r.event_id)),
  ]);
  for (const r of [w, h, t, e]) if (r.error) throw new Error(r.error.message);
  const tokens = new Map<string, string>();
  for (const x of t.data ?? []) if (!tokens.has(x.household_id)) tokens.set(x.household_id, x.id);
  return {
    weddings: new Map((w.data ?? []).map((x) => [x.id, x as { partner1: string; partner2: string; plan: Plan }])),
    households: new Map((h.data ?? []).map((x) => [x.id, x])),
    tokens,
    events: new Map((e.data ?? []).map((x) => [x.id, x])),
  };
}

function build(row: OutboxRow, ctx: Context, origin: string): { to: string; body: string } | { error: string } {
  if (!SMS_KINDS.includes(row.kind as SmsKind)) return { error: `Texts can't be sent for "${row.kind}"` };
  const wedding = row.wedding_id ? ctx.weddings.get(row.wedding_id) : undefined;
  // Bought plans only: weddings.plan stays "free" during a trial, so trials can't text.
  if (!wedding || !hasFeature(wedding.plan, "sms")) return { error: "Texting guests is part of Plus and Signature." };
  const h = row.household_id ? ctx.households.get(row.household_id) : undefined;
  if (!h || h.wedding_id !== row.wedding_id) return { error: "No such household" };
  const to = normalizePhone(h.phone);
  if (!to) return { error: "The household has no US or Canadian mobile number on file." };
  if (normalizePhone(row.recipient) !== to) return { error: "Recipient isn't the household's phone on file" };
  const tokenId = ctx.tokens.get(row.household_id!);
  if (!tokenId) return { error: "The household has no active invitation link" };
  const link = new URL(`/i/${deriveToken(tokenId)}`, origin).toString();
  const ev = row.event_id ? ctx.events.get(row.event_id) : undefined;
  return {
    to,
    body: smsText(row.kind as SmsKind, {
      partner1: wedding.partner1, partner2: wedding.partner2, household: h.name,
      link: row.kind === "reminder" ? `${link}?to=rsvp` : link,
      event: ev?.wedding_id === row.wedding_id ? ev.name : undefined,
    }),
  };
}
