// Loads the Ayesha & Omar sample wedding into Supabase with the service role.
// Used by `npm run seed` (scripts/seed.ts), the demo "Reset" button, and the tests.
// Safe to run again: it replaces the demo wedding and the seeded marketplace
// listings, and keeps the demo accounts (resetting their passwords).
import type { SupabaseClient } from "@supabase/supabase-js";
import { toRow, weddingToRow, type Row, type TableKey } from "./rows";
import { buildSeed, DEMO_PASSWORD, DEMO_WEDDING_ID, SEED_USERS } from "./seed";
import { tokenHashHex } from "./tokens";
import type { Database } from "./types";

async function ensureUsers(admin: SupabaseClient) {
  const existing = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) if (u.email) existing.set(u.email.toLowerCase(), u.id);
    if (data.users.length < 1000) break;
  }
  const ids = new Map<string, string>(); // seed id → auth id
  for (const u of SEED_USERS) {
    const meta = { name: u.name, kind: u.kind ?? "couple" };
    let id = existing.get(u.email);
    if (id) {
      const { error } = await admin.auth.admin.updateUserById(id, { password: DEMO_PASSWORD, email_confirm: true, user_metadata: meta });
      if (error) throw error;
    } else {
      const { data, error } = await admin.auth.admin.createUser({ email: u.email, password: DEMO_PASSWORD, email_confirm: true, user_metadata: meta });
      if (error) throw error;
      id = data.user.id;
    }
    await admin.from("profiles").upsert({ id, email: u.email, name: u.name, kind: meta.kind });
    ids.set(u.id, id);
  }
  return ids;
}

async function insert(admin: SupabaseClient, table: string, rows: Row[]) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await admin.from(table).insert(rows.slice(i, i + 500));
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

export async function loadDemoSeed(admin: SupabaseClient, log: (msg: string) => void = () => {}) {
  const d: Database = buildSeed();
  const users = await ensureUsers(admin);
  const user = (id?: string) => (id ? users.get(id) ?? id : undefined);
  log(`accounts: ${users.size}`);

  // Start clean: the wedding cascades to everything that belongs to it.
  const { error: delW } = await admin.from("weddings").delete().eq("id", DEMO_WEDDING_ID);
  if (delW) throw delW;
  const { error: delL } = await admin.from("listings").delete().in("id", d.listings.map((l) => l.id));
  if (delL) throw delL;

  const rows = (key: TableKey, extra?: (x: any, r: Row) => void) =>
    (d[key] as object[]).map((x) => { const r = toRow(key, x); extra?.(x, r); return r; });

  await insert(admin, "listings", rows("listings", (x, r) => { r.owner_user_id = user(x.ownerUserId) ?? null; }));
  await insert(admin, "weddings", d.weddings.map((w) => weddingToRow(w)));
  await insert(admin, "wedding_private", d.weddings.map((w) => ({ wedding_id: w.id, mahr_amount: w.mahr?.amount ?? null, mahr_notes: w.mahr?.notes ?? null })));
  await insert(admin, "wedding_collaborators", rows("collaborators", (x, r) => { r.user_id = user(x.userId); }));
  for (const key of ["events", "households", "guests", "invitations", "rsvps"] as const) {
    await insert(admin, ({ events: "events", households: "households", guests: "guests", invitations: "event_invitations", rsvps: "rsvp_responses" })[key], rows(key));
  }
  await insert(admin, "invitation_tokens", rows("tokens", (x, r) => { r.token_hash = tokenHashHex(x.token); }));
  await insert(admin, "public_registrations", rows("registrations"));
  await insert(admin, "vendors", rows("vendors"));
  await insert(admin, "expenses", rows("expenses"));
  await insert(admin, "tasks", rows("tasks"));
  await insert(admin, "invitation_designs", rows("designs"));
  await insert(admin, "outfits", rows("outfits"));
  await insert(admin, "boards", rows("boards"));
  await insert(admin, "inquiries", rows("inquiries"));
  await insert(admin, "audit_log", rows("audit", (_x, r) => { delete r.id; }));
  log(`wedding: ${d.events.length} events, ${d.households.length} households, ${d.guests.length} guests, ${d.invitations.length} invitations, ${d.rsvps.length} RSVPs`);
  log(`marketplace: ${d.listings.length} listings, ${d.inquiries.length} inquiries`);
  return d;
}
