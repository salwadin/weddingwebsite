import "server-only";
import { randomUUID } from "node:crypto";
import { columns, fromRow, TABLES, toRow, weddingFromRow, weddingToRow, WEDDING_UPDATABLE, type Row, type TableKey } from "./rows";
import { deriveToken, tokenHashHex } from "./tokens";
import type { Supabase } from "./supabase/server";
import type { AuditEntry, Database, InviteToken, User, Wedding } from "./types";

/**
 * Persistence on Supabase Postgres.
 *
 * Organizer pages load their wedding through the signed-in user's own client
 * (`loadWedding`), so Row Level Security decides which rows arrive: a bride-side
 * organizer never receives groom-side households, an event organizer only their
 * events, and so on. Pages and the access rules in lib/access.ts then work on
 * that snapshot as plain arrays.
 *
 * Writes go through `mutate(o, fn)`: `fn` edits the snapshot exactly as before,
 * and the rows it added, changed or removed are written back with the same
 * user's client, so RLS checks every write too.
 *
 * Guests never come through here: the wedding website uses the guest_site /
 * guest_submit_rsvp / public_register RPCs (lib/site.ts, lib/actions/site.ts).
 */

const PAGE = 1000; // PostgREST's max rows per request

async function fetchAll(sb: Supabase, key: TableKey, filter: (q: any) => any, order = "id", limit = Infinity, newestFirst = false): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; from < limit; from += PAGE) {
    const to = Math.min(from + PAGE, limit) - 1;
    const { data, error } = await filter(sb.from(TABLES[key].table).select(columns(key))).order(order, { ascending: !newestFirst }).range(from, to);
    if (error) throw new Error(`${TABLES[key].table}: ${error.message}`);
    out.push(...(data as Row[]));
    if (data.length < to - from + 1) break;
  }
  return out;
}

const rowsOf = <K extends TableKey>(key: K, rows: Row[]) => rows.map((r) => fromRow(key, r)) as Database[K];

/** Everything about one wedding that the signed-in user may read. */
export async function loadWedding(sb: Supabase, wedding: Wedding): Promise<Database> {
  const W = wedding.id;
  const byWedding = (q: any) => q.eq("wedding_id", W);
  const [collabRows, eventRows, householdRows, vendorRows, expenseRows, taskRows, designRows, outfitRows, boardRows, outboxRows, auditRows, tokenRows, inviteRes, listingRows] = await Promise.all([
    fetchAll(sb, "collaborators", byWedding),
    fetchAll(sb, "events", byWedding),
    fetchAll(sb, "households", byWedding, "created_at"),
    fetchAll(sb, "vendors", byWedding),
    fetchAll(sb, "expenses", byWedding),
    fetchAll(sb, "tasks", byWedding),
    fetchAll(sb, "designs", byWedding),
    fetchAll(sb, "outfits", byWedding),
    fetchAll(sb, "boards", byWedding),
    fetchAll(sb, "outbox", byWedding, "created_at", 300, true),
    fetchAll(sb, "audit", byWedding, "at", 500, true),
    fetchAll(sb, "tokens", byWedding),
    sb.from("collaborator_invites").select("id,wedding_id,email,name,role,relationship,created_at").eq("wedding_id", W),
    // Promoted marketplace vendors, for recommendations on the Vendors page.
    fetchAll(sb, "listings", (q) => q.eq("published", true).neq("tier", "basic"), "id", 60),
  ]);

  const events = rowsOf("events", eventRows).sort((a, b) => a.date.localeCompare(b.date) || a.sortOrder - b.sortOrder);
  const households = rowsOf("households", householdRows);
  const hhIds = households.map((h) => h.id);
  const eventIds = new Set(events.map((e) => e.id));

  // Children of households, fetched in chunks of ids (URLs have a length limit).
  const byHousehold = async (key: "guests" | "invitations" | "rsvps") => {
    const out: Row[] = [];
    for (let i = 0; i < hhIds.length; i += 150) {
      const ids = hhIds.slice(i, i + 150);
      out.push(...await fetchAll(sb, key, (q) => q.in("household_id", ids)));
    }
    return out;
  };
  const eventIdList = [...eventIds];
  const [guestRows, invitationRows, rsvpRows, registrationRows, profileRows, privateRes] = await Promise.all([
    byHousehold("guests"), byHousehold("invitations"), byHousehold("rsvps"),
    eventIdList.length ? fetchAll(sb, "registrations", (q) => q.in("event_id", eventIdList), "created_at") : Promise.resolve([]),
    collabRows.length ? sb.from("profiles").select("id,email,name,kind,created_at").in("id", collabRows.map((c) => c.user_id as string)) : Promise.resolve({ data: [] }),
    sb.from("wedding_private").select("mahr_amount,mahr_notes").eq("wedding_id", W).maybeSingle(), // admins only (RLS)
  ]);

  const guests = rowsOf("guests", guestRows).sort((a, b) =>
    a.householdId.localeCompare(b.householdId) || Number(b.isPrimary) - Number(a.isPrimary) || Number(a.isPlusOne) - Number(b.isPlusOne)
    || Number(a.isChild) - Number(b.isChild) || a.firstName.localeCompare(b.firstName) || a.id.localeCompare(b.id));
  const priv = privateRes.data as { mahr_amount: string | null; mahr_notes: string | null } | null;

  return {
    users: ((profileRows.data ?? []) as Row[]).map((p) => ({ id: p.id, email: p.email, name: p.name, kind: p.kind, createdAt: p.created_at }) as User),
    invites: ((inviteRes.data ?? []) as Row[]).map((r) => ({ id: r.id, weddingId: r.wedding_id, email: r.email, name: r.name ?? undefined, role: r.role, relationship: r.relationship ?? "", createdAt: r.created_at }) as Database["invites"][number]),
    weddings: [{ ...wedding, ...(priv ? { mahr: { amount: priv.mahr_amount ?? "", notes: priv.mahr_notes ?? "" } } : {}) }],
    collaborators: rowsOf("collaborators", collabRows),
    events,
    households,
    guests,
    // Invitations to events this user can't see stay out of the snapshot entirely.
    invitations: rowsOf("invitations", invitationRows).filter((i) => eventIds.has(i.eventId)),
    rsvps: rowsOf("rsvps", rsvpRows).filter((r) => eventIds.has(r.eventId)),
    tokens: rowsOf("tokens", tokenRows).map((t) => ({ ...t, token: deriveToken(t.id) })),
    registrations: rowsOf("registrations", registrationRows),
    vendors: rowsOf("vendors", vendorRows),
    expenses: rowsOf("expenses", expenseRows),
    tasks: rowsOf("tasks", taskRows),
    outbox: rowsOf("outbox", outboxRows),
    audit: rowsOf("audit", auditRows),
    designs: rowsOf("designs", designRows),
    outfits: rowsOf("outfits", outfitRows),
    boards: rowsOf("boards", boardRows),
    listings: rowsOf("listings", listingRows),
    inquiries: [],
  };
}

export async function loadWeddingRow(sb: Supabase, id: string): Promise<Wedding | null> {
  const { data, error } = await sb.from("weddings").select(columns("weddings")).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? weddingFromRow(data as unknown as Row) : null;
}

// ---------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------

// Parents before children, so inserts satisfy foreign keys; deletes run in reverse.
const ORDER: TableKey[] = ["collaborators", "events", "households", "guests", "invitations", "rsvps", "tokens", "registrations",
  "vendors", "expenses", "tasks", "designs", "outfits", "boards", "outbox", "audit"];

const keyOf = (key: TableKey, x: { id: string }) => x.id;

function check(error: { message: string; code?: string } | null, what: string) {
  if (!error) return;
  if (error.code === "23505" && /weddings_slug_key/.test(error.message)) throw new Error("That web address is taken");
  if (error.code === "23505" && /weddings_custom_domain_key/.test(error.message)) throw new Error("That domain is already connected to another wedding");
  throw new Error(/row-level security|permission denied/i.test(error.message) ? "Not permitted" : `${what}: ${error.message}`);
}

/**
 * Run `fn` against the organizer's snapshot and write what it changed back to
 * Supabase as that organizer. Returns whatever `fn` returns.
 */
export async function mutate<T>(o: { sb: Supabase; d: Database }, fn: (d: Database) => T): Promise<T> {
  const before = structuredClone(o.d);
  const out = fn(o.d);
  await persist(o.sb, before, o.d);
  return out;
}

async function persist(sb: Supabase, before: Database, after: Database) {
  type Plan = { key: TableKey; inserts: Row[]; updates: Row[]; deletes: string[] };
  const plans: Plan[] = ORDER.map((key) => {
    const spec = TABLES[key];
    const old = new Map((before[key] as { id: string }[]).map((x) => [keyOf(key, x), JSON.stringify(x)]));
    const now = after[key] as { id: string }[];
    const nowIds = new Set(now.map((x) => keyOf(key, x)));
    const inserts: Row[] = [], updates: Row[] = [];
    for (const x of now) {
      const prev = old.get(keyOf(key, x));
      if (prev === undefined) inserts.push(insertRow(key, x));
      else if (prev !== JSON.stringify(x)) updates.push(toRow(key, x));
    }
    const deletes = spec.write === "upsert" ? [...old.keys()].filter((id) => !nowIds.has(id)) : [];
    return { key, inserts: spec.write === "readonly" ? [] : inserts, updates: spec.write === "append" || spec.write === "readonly" ? [] : updates, deletes };
  });

  for (const p of [...plans].reverse()) {
    for (let i = 0; i < p.deletes.length; i += 150) {
      const { error } = await sb.from(TABLES[p.key].table).delete().in("id", p.deletes.slice(i, i + 150));
      check(error, `delete ${TABLES[p.key].table}`);
    }
  }

  await persistWedding(sb, before.weddings[0], after.weddings[0]);

  for (const p of plans) {
    const spec = TABLES[p.key];
    const rows = spec.write === "upsert" ? [...p.inserts, ...p.updates] : p.inserts;
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500);
      const { error } = spec.write === "upsert"
        ? await sb.from(spec.table).upsert(batch, { onConflict: "id" })
        : await sb.from(spec.table).insert(batch);
      check(error, `save ${spec.table}`);
    }
    if (spec.write === "update") {
      for (const r of p.updates) {
        const patch = Object.fromEntries(spec.updatable!.map((c) => [c, r[c]]));
        const { error } = await sb.from(spec.table).update(patch).eq("id", r.id as string);
        check(error, `update ${spec.table}`);
      }
    }
  }
}

function insertRow(key: TableKey, x: object): Row {
  const row = toRow(key, x);
  if (key === "tokens") row.token_hash = tokenHashHex((x as InviteToken).token);
  if (key === "audit") delete row.id;
  if (key === "outbox") { delete row.status; delete row.sent_at; delete row.error; }   // delivery's columns, not the app's
  return row;
}

async function persistWedding(sb: Supabase, before?: Wedding, after?: Wedding) {
  if (!before || !after || JSON.stringify(before) === JSON.stringify(after)) return;
  const { mahr: m0, sitePassword: p0, ...b } = before;
  const { mahr: m1, sitePassword: p1, ...a } = after;
  if (JSON.stringify(b) !== JSON.stringify(a)) {
    const { data, error } = await sb.from("weddings").update(weddingToRow(after, WEDDING_UPDATABLE)).eq("id", after.id).select("id");
    check(error, "update wedding");
    if (!data?.length) throw new Error("Not permitted");
  }
  if (JSON.stringify(m0) !== JSON.stringify(m1)) {
    const { error } = await sb.from("wedding_private").upsert({ wedding_id: after.id, mahr_amount: m1?.amount ?? null, mahr_notes: m1?.notes ?? null });
    check(error, "save mahr");
  }
  if (p1 && p1 !== p0) {
    const { error } = await sb.rpc("set_site_password", { p_wedding: after.id, p_password: p1 });
    check(error, "set site password");
  }
}

// ---------------------------------------------------------------------
// Helpers used by actions
// ---------------------------------------------------------------------

/** New row id. Every table uses uuid keys. (`prefix` documents what the id is for.) */
export function uid(_prefix: string) {
  return randomUUID();
}

/** A new, active invitation link for a household. */
export function newInviteToken(householdId: string, weddingId: string): InviteToken {
  const id = randomUUID();
  return { id, token: deriveToken(id), householdId, weddingId, createdAt: new Date().toISOString(), useCount: 0 };
}

export function audit(d: Database, weddingId: string, actor: string, action: string, detail: string) {
  const entry: AuditEntry = { id: uid("aud"), weddingId, at: new Date().toISOString(), actor, action, detail };
  d.audit.unshift(entry);
}

