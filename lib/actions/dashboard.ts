"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit, mutate, newInviteToken, uid } from "../db";
import { siteUrl } from "../auth";
import { deliverNow } from "../email/deliver";
import { canEditEvent, canTouchHousehold, type Area } from "../access";
import { assertFeature, requireOrg, type Org } from "../dashboard";
import { PLANS } from "../plans";
import { DEMO_WEDDING_ID } from "../seed";
import { loadDemoSeed } from "../seed-load";
import { demoEnabled } from "../supabase/env";
import { adminClient } from "../supabase/server";
import type { EventType, Expense, Guest, Role, RsvpMode, Side, Task, ThemeSettings, Vendor, Visibility, WeddingEvent } from "../types";
import type { FormState } from "./site";

const str = (f: FormData, k: string, max = 500) => String(f.get(k) ?? "").trim().slice(0, max);
const num = (f: FormData, k: string) => { const n = Number(f.get(k)); return Number.isFinite(n) ? n : 0; };
const bool = (f: FormData, k: string) => f.get(k) === "on" || f.get(k) === "true";

function refresh(o: Org) {
  revalidatePath("/dashboard", "layout");
  revalidatePath(`/w/${o.ctx.wedding.slug}`, "layout");
}

async function edit(area: Area) {
  return requireOrg(area, "edit");
}

/** Plan limits on counts. Existing data is never removed; only additions are blocked. */
function assertRoom(o: Org, kind: "events" | "guests", adding: number) {
  const w = o.ctx.wedding.id;
  if (kind === "events") {
    const max = PLANS[o.plan].maxEvents;
    if (o.d.events.filter((e) => e.weddingId === w).length + adding > max) throw new Error(`Your plan includes ${max} events. Upgrade under Plan & Billing to add more.`);
  } else {
    const max = PLANS[o.plan].maxGuests;
    const hh = new Set(o.d.households.filter((h) => h.weddingId === w).map((h) => h.id));
    if (o.d.guests.filter((g) => hh.has(g.householdId)).length + adding > max) throw new Error(`Your plan includes up to ${max} guests. Upgrade under Plan & Billing to add more.`);
  }
}

function householdOrThrow(o: Org, id: string) {
  const h = o.d.households.find((x) => x.id === id && x.weddingId === o.ctx.wedding.id);
  if (!h || !canTouchHousehold(o.scope, h, o.d)) throw new Error("Not permitted");
  return h;
}

// ======================= EVENTS =======================

export async function saveEvent(form: FormData) {
  const o = await edit("events");
  const id = str(form, "id");
  const existing = id ? o.d.events.find((e) => e.id === id && e.weddingId === o.ctx.wedding.id) : null;
  if (id && (!existing || !canEditEvent(o.scope, existing))) throw new Error("Not permitted");
  if (!id && o.scope.role !== "admin" && !o.scope.side) throw new Error("Not permitted");
  if (!id) assertRoom(o, "events", 1);

  const timeline = str(form, "timeline", 4000).split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const m = l.match(/^(\d{1,2}:\d{2})\s*[-–·]?\s*(.+)$/);
    return m ? { time: m[1].padStart(5, "0"), label: m[2] } : { time: "", label: l };
  });
  const capacity = num(form, "capacity");
  const values: Partial<WeddingEvent> = {
    type: (str(form, "type") || "custom") as EventType,
    name: str(form, "name", 80) || "Untitled event",
    date: str(form, "date", 10), startTime: str(form, "startTime", 5), endTime: str(form, "endTime", 5),
    venueName: str(form, "venueName", 120), address: str(form, "address", 200),
    dressCode: str(form, "dressCode", 300), description: str(form, "description", 2000), publicMessage: str(form, "publicMessage", 300),
    hostSide: (str(form, "hostSide") || "both") as Side,
    visibility: (str(form, "visibility") || "invite") as Visibility,
    rsvpMode: (str(form, "rsvpMode") || "required") as RsvpMode,
    rsvpDeadline: str(form, "rsvpDeadline", 10) || undefined,
    capacity: capacity > 0 ? capacity : undefined, waitlist: bool(form, "waitlist"),
    mealOptions: str(form, "mealOptions", 1000).split("\n").map((s) => s.trim()).filter(Boolean),
    timeline,
    genderSeparated: bool(form, "genderSeparated"), womenOnly: bool(form, "womenOnly"), noPhotography: bool(form, "noPhotography"),
    prayerSpace: bool(form, "prayerSpace"), halal: bool(form, "halal"), budget: num(form, "budget"),
    palette: str(form, "palette", 200).split(/[,\s]+/).filter((c) => /^#[0-9a-f]{6}$/i.test(c)).slice(0, 8),
  };
  if (o.scope.side && values.hostSide !== o.scope.side && values.hostSide !== "both") values.hostSide = o.scope.side;
  let newId = id;
  await mutate(o, (d) => {
    if (existing) {
      const e = d.events.find((x) => x.id === id)!;
      const visChanged = e.visibility !== values.visibility;
      Object.assign(e, values);
      audit(d, o.ctx.wedding.id, o.ctx.user.name, "event_update", `${e.name}${visChanged ? ` (visibility → ${e.visibility})` : ""}`);
    } else {
      newId = uid("evt");
      d.events.push({ ...(values as WeddingEvent), id: newId, weddingId: o.ctx.wedding.id, sortOrder: d.events.length + 1 });
      audit(d, o.ctx.wedding.id, o.ctx.user.name, "event_create", values.name!);
    }
  });
  refresh(o);
  redirect(`/dashboard/events/${newId}?saved=1`);
}

export async function deleteEvent(form: FormData) {
  const o = await edit("events");
  const id = str(form, "id");
  const e = o.d.events.find((x) => x.id === id && x.weddingId === o.ctx.wedding.id);
  if (!e || !canEditEvent(o.scope, e) || o.scope.role !== "admin") throw new Error("Not permitted");
  await mutate(o, (d) => {
    d.events = d.events.filter((x) => x.id !== id);
    d.invitations = d.invitations.filter((x) => x.eventId !== id);
    d.rsvps = d.rsvps.filter((x) => x.eventId !== id);
    d.registrations = d.registrations.filter((x) => x.eventId !== id);
    audit(d, o.ctx.wedding.id, o.ctx.user.name, "event_delete", e.name);
  });
  refresh(o);
  redirect("/dashboard/events");
}

// ======================= GUESTS & HOUSEHOLDS =======================

function parseMembers(text: string) {
  // One per line: "First Last", optional "(child)" or "(plus one)"
  return text.split(/\n|;/).map((l) => l.trim()).filter(Boolean).slice(0, 30).map((l, i) => {
    const isChild = /\((child|kid)\)/i.test(l);
    const isPlusOne = /\((plus[ -]?one|guest)\)/i.test(l) || /^guest$/i.test(l);
    const clean = l.replace(/\(.*?\)/g, "").trim();
    const [first, ...rest] = clean.split(/\s+/);
    return { firstName: isPlusOne && !clean ? "Guest" : first || "Guest", lastName: rest.join(" "), isChild, isPlusOne, isPrimary: i === 0 };
  });
}

export async function createHousehold(form: FormData) {
  const o = await edit("guests");
  const side = (str(form, "side") || o.scope.side || "bride") as Side;
  if (o.scope.side && side !== o.scope.side && side !== "both") throw new Error("Not permitted");
  const members = parseMembers(str(form, "members", 3000));
  if (!members.length) throw new Error("Add at least one person");
  assertRoom(o, "guests", members.length);
  const hid = uid("hh");
  const eventIds = form.getAll("events").map(String).filter((id) => o.events.some((e) => e.id === id));
  await mutate(o, (d) => {
    d.households.push({
      id: hid, weddingId: o.ctx.wedding.id, name: str(form, "name", 120) || `${members[0].firstName} ${members[0].lastName}`,
      side, relationship: str(form, "relationship", 120), tags: form.getAll("tags").map(String),
      email: str(form, "email", 200) || undefined, phone: str(form, "phone", 40) || undefined, notes: str(form, "notes", 1000) || undefined,
      deliveryStatus: "not_sent", createdAt: new Date().toISOString(),
    });
    const gs: Guest[] = members.map((m) => ({ ...m, id: uid("g"), householdId: hid }));
    d.guests.push(...gs);
    for (const eid of eventIds) d.invitations.push({ id: uid("inv"), householdId: hid, eventId: eid, guestIds: gs.map((g) => g.id), createdAt: new Date().toISOString() });
    d.tokens.push(newInviteToken(hid, o.ctx.wedding.id));
    audit(d, o.ctx.wedding.id, o.ctx.user.name, "household_create", `${str(form, "name") || members[0].firstName} (${gs.length})`);
  });
  refresh(o);
  redirect(`/dashboard/guests/${hid}?saved=1`);
}

export async function updateHousehold(form: FormData) {
  const o = await edit("guests");
  const h = householdOrThrow(o, str(form, "id"));
  const side = (str(form, "side") || h.side) as Side;
  await mutate(o, (d) => {
    const x = d.households.find((y) => y.id === h.id)!;
    Object.assign(x, {
      name: str(form, "name", 120) || x.name, side: o.scope.side ? x.side : side, relationship: str(form, "relationship", 120),
      tags: form.getAll("tags").map(String), email: str(form, "email", 200) || undefined, phone: str(form, "phone", 40) || undefined,
      notes: str(form, "notes", 2000) || undefined,
    });
    for (const g of d.guests.filter((g) => g.householdId === h.id)) {
      const first = form.get(`first:${g.id}`);
      if (first === null) continue;
      g.firstName = String(first).trim().slice(0, 60) || g.firstName;
      g.lastName = str(form, `last:${g.id}`, 60);
      g.isChild = bool(form, `child:${g.id}`);
      g.dietary = str(form, `diet:${g.id}`, 120) || undefined;
      g.table = str(form, `table:${g.id}`, 30) || undefined;
    }
    const added = parseMembers(str(form, "addMembers", 2000)).map((m) => ({ ...m, isPrimary: false, id: uid("g"), householdId: h.id }));
    d.guests.push(...added);
    audit(d, o.ctx.wedding.id, o.ctx.user.name, "household_update", x.name);
  });
  refresh(o);
  redirect(`/dashboard/guests/${h.id}?saved=1`);
}

export async function removeGuest(form: FormData) {
  const o = await edit("guests");
  const h = householdOrThrow(o, str(form, "householdId"));
  const gid = str(form, "guestId");
  await mutate(o, (d) => {
    d.guests = d.guests.filter((g) => !(g.id === gid && g.householdId === h.id));
    for (const i of d.invitations) if (i.householdId === h.id) i.guestIds = i.guestIds.filter((x) => x !== gid);
    d.rsvps = d.rsvps.filter((r) => r.guestId !== gid);
    audit(d, o.ctx.wedding.id, o.ctx.user.name, "guest_remove", h.name);
  });
  refresh(o);
  redirect(`/dashboard/guests/${h.id}`);
}

export async function deleteHousehold(form: FormData) {
  const o = await edit("guests");
  const h = householdOrThrow(o, str(form, "id"));
  await mutate(o, (d) => {
    d.households = d.households.filter((x) => x.id !== h.id);
    d.guests = d.guests.filter((x) => x.householdId !== h.id);
    d.invitations = d.invitations.filter((x) => x.householdId !== h.id);
    d.rsvps = d.rsvps.filter((x) => x.householdId !== h.id);
    for (const t of d.tokens) if (t.householdId === h.id) t.revokedAt = new Date().toISOString();
    audit(d, o.ctx.wedding.id, o.ctx.user.name, "household_delete", h.name);
  });
  refresh(o);
  redirect("/dashboard/guests");
}

/** Set exactly which members of a household are invited to each event. */
export async function saveInvitations(form: FormData) {
  const o = await edit("invitations");
  const h = householdOrThrow(o, str(form, "householdId"));
  const members = o.d.guests.filter((g) => g.householdId === h.id);
  await mutate(o, (d) => {
    const changes: string[] = [];
    for (const e of o.events) {
      if (!canEditEvent(o.scope, e) && o.scope.role !== "guest_manager" && !o.scope.side) continue;
      const ids = members.filter((m) => bool(form, `inv:${e.id}:${m.id}`)).map((m) => m.id);
      const inv = d.invitations.find((i) => i.householdId === h.id && i.eventId === e.id);
      if (ids.length && !inv) { d.invitations.push({ id: uid("inv"), householdId: h.id, eventId: e.id, guestIds: ids, createdAt: new Date().toISOString() }); changes.push(`+${e.name}`); }
      else if (!ids.length && inv) { d.invitations = d.invitations.filter((i) => i !== inv); changes.push(`−${e.name}`); }
      else if (inv && ids.join() !== inv.guestIds.join()) { inv.guestIds = ids; changes.push(`~${e.name}`); }
    }
    if (changes.length) audit(d, o.ctx.wedding.id, o.ctx.user.name, "invitation_update", `${h.name}: ${changes.join(", ")}`);
  });
  refresh(o);
  redirect(`/dashboard/guests/${h.id}?saved=1`);
}

/** Organizer override of an RSVP (e.g. a phone call from Nani). Logged in the audit trail. */
export async function setRsvp(form: FormData) {
  const o = await edit("rsvps");
  const h = householdOrThrow(o, str(form, "householdId"));
  const eventId = str(form, "eventId"); const guestId = str(form, "guestId");
  const status = str(form, "status") as "attending" | "declined" | "pending";
  const inv = o.d.invitations.find((i) => i.householdId === h.id && i.eventId === eventId);
  if (!inv?.guestIds.includes(guestId)) throw new Error("Not invited");
  await mutate(o, (d) => {
    const r = d.rsvps.find((x) => x.eventId === eventId && x.guestId === guestId);
    const meal = str(form, "meal", 80) || r?.meal;
    if (status === "pending") d.rsvps = d.rsvps.filter((x) => x !== r);
    else if (r) Object.assign(r, { status, meal, updatedAt: new Date().toISOString(), updatedVia: "organizer" });
    else d.rsvps.push({ id: uid("rsvp"), eventId, guestId, householdId: h.id, status, meal, updatedAt: new Date().toISOString(), updatedVia: "organizer" });
    const g = d.guests.find((x) => x.id === guestId);
    const e = d.events.find((x) => x.id === eventId);
    audit(d, o.ctx.wedding.id, o.ctx.user.name, "rsvp_override", `${g?.firstName} ${g?.lastName} · ${e?.name} → ${status}`);
  });
  refresh(o);
  redirect(`/dashboard/guests/${h.id}`);
}

export async function regenerateToken(form: FormData) {
  const o = await edit("invitations");
  const h = householdOrThrow(o, str(form, "householdId"));
  await mutate(o, (d) => {
    const now = new Date().toISOString();
    for (const t of d.tokens) if (t.householdId === h.id && !t.revokedAt) t.revokedAt = now;
    d.tokens.push(newInviteToken(h.id, o.ctx.wedding.id));
    audit(d, o.ctx.wedding.id, o.ctx.user.name, "link_regenerate", `${h.name}: old link revoked, new link issued`);
  });
  refresh(o);
  redirect(`/dashboard/guests/${h.id}?saved=1`);
}

export async function revokeToken(form: FormData) {
  const o = await edit("invitations");
  const h = householdOrThrow(o, str(form, "householdId"));
  await mutate(o, (d) => {
    for (const t of d.tokens) if (t.householdId === h.id && !t.revokedAt) t.revokedAt = new Date().toISOString();
    audit(d, o.ctx.wedding.id, o.ctx.user.name, "link_revoke", `${h.name}: access revoked`);
  });
  refresh(o);
  redirect(`/dashboard/guests/${h.id}`);
}

export async function bulkInvite(form: FormData) {
  const o = await edit("invitations");
  const eventId = str(form, "eventId");
  const mode = str(form, "mode");
  const e = o.events.find((x) => x.id === eventId);
  if (!e) throw new Error("Unknown event");
  const ids = str(form, "householdIds", 200000).split(",").filter(Boolean);
  const allowed = new Set(o.households.map((h) => h.id));
  let n = 0;
  await mutate(o, (d) => {
    for (const hid of ids) {
      if (!allowed.has(hid)) continue;
      const existing = d.invitations.find((i) => i.householdId === hid && i.eventId === eventId);
      if (mode === "add" && !existing) {
        const guestIds = d.guests.filter((g) => g.householdId === hid).map((g) => g.id);
        d.invitations.push({ id: uid("inv"), householdId: hid, eventId, guestIds, createdAt: new Date().toISOString() }); n++;
      } else if (mode === "remove" && existing) {
        d.invitations = d.invitations.filter((i) => i !== existing); n++;
      }
    }
    audit(d, o.ctx.wedding.id, o.ctx.user.name, "bulk_invite", `${mode === "add" ? "Invited" : "Uninvited"} ${n} households ${mode === "add" ? "to" : "from"} ${e.name}`);
  });
  refresh(o);
  redirect(`/dashboard/guests?done=${encodeURIComponent(`${mode === "add" ? "Invited" : "Removed"} ${n} households ${mode === "add" ? "to" : "from"} the ${e.name}`)}`);
}

/**
 * CSV import. Columns (header row required, any order):
 * household, side, relationship, email, phone, members, events, tags
 * members: "Imran Qureshi; Saima Qureshi; Eesa Qureshi (child)"
 * events:  "Nikkah; Shaadi"
 */
export async function importCsv(_prev: FormState, form: FormData): Promise<FormState> {
  const o = await edit("guests");
  assertFeature(o, "csv_import");
  const text = str(form, "csv", 2_000_000);
  const rows = parseCsv(text);
  if (rows.length < 2) return { error: "Paste a CSV with a header row and at least one household." };
  try { assertRoom(o, "guests", rows.length - 1); } catch (e) { return { error: (e as Error).message }; }
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (r: string[], k: string) => (header.indexOf(k) >= 0 ? (r[header.indexOf(k)] ?? "").trim() : "");
  if (!header.includes("members") && !header.includes("household")) return { error: "The header row must include at least 'household' or 'members'." };
  let households = 0, people = 0, skipped = 0;
  await mutate(o, (d) => {
    for (const r of rows.slice(1)) {
      if (!r.some((c) => c.trim())) continue;
      const members = parseMembers(col(r, "members") || col(r, "household"));
      let side = (col(r, "side").toLowerCase().startsWith("g") ? "groom" : col(r, "side").toLowerCase().startsWith("bo") ? "both" : "bride") as Side;
      if (o.scope.side) side = o.scope.side;
      if (!members.length) { skipped++; continue; }
      const email = col(r, "email") || undefined;
      if (email && d.households.some((h) => h.weddingId === o.ctx.wedding.id && h.email?.toLowerCase() === email.toLowerCase())) { skipped++; continue; }
      const hid = uid("hh");
      d.households.push({
        id: hid, weddingId: o.ctx.wedding.id, name: col(r, "household") || `${members[0].firstName} ${members[0].lastName}`, side,
        relationship: col(r, "relationship"), tags: col(r, "tags").split(/[;|]/).map((t) => t.trim().toLowerCase().replace(/\s+/g, "_")).filter(Boolean),
        email, phone: col(r, "phone") || undefined, deliveryStatus: "not_sent", createdAt: new Date().toISOString(),
      });
      const gs = members.map((m) => ({ ...m, id: uid("g"), householdId: hid }));
      d.guests.push(...gs);
      for (const name of col(r, "events").split(/[;|]/).map((s) => s.trim().toLowerCase()).filter(Boolean)) {
        const e = o.events.find((x) => x.name.toLowerCase() === name || x.type === name);
        if (e) d.invitations.push({ id: uid("inv"), householdId: hid, eventId: e.id, guestIds: gs.map((g) => g.id), createdAt: new Date().toISOString() });
      }
      d.tokens.push(newInviteToken(hid, o.ctx.wedding.id));
      households++; people += gs.length;
    }
    audit(d, o.ctx.wedding.id, o.ctx.user.name, "csv_import", `${households} households, ${people} guests (${skipped} skipped)`);
  });
  refresh(o);
  return { ok: true, message: `Imported ${households} households (${people} guests).${skipped ? ` Skipped ${skipped} rows (empty or duplicate email).` : ""}` };
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// ======================= INVITATIONS & MESSAGING =======================

export async function saveDesign(form: FormData) {
  const o = await edit("invitations");
  assertFeature(o, "invitation_designer");
  const eventId = str(form, "eventId");
  if (!o.events.some((e) => e.id === eventId)) throw new Error("Not permitted");
  await mutate(o, (d) => {
    let des = d.designs.find((x) => x.eventId === eventId && x.weddingId === o.ctx.wedding.id);
    if (!des) { des = { id: uid("des"), weddingId: o.ctx.wedding.id, eventId, template: "arch", englishText: "", urduText: "", arabicText: "", showQr: true }; d.designs.push(des); }
    Object.assign(des, {
      template: (str(form, "template") || "arch") as "arch" | "jali" | "minimal",
      englishText: str(form, "englishText", 600), urduText: str(form, "urduText", 300), arabicText: str(form, "arabicText", 300),
      showQr: bool(form, "showQr"),
    });
    audit(d, o.ctx.wedding.id, o.ctx.user.name, "design_update", d.events.find((e) => e.id === eventId)?.name ?? "");
  });
  refresh(o);
  redirect(`/dashboard/invitations?event=${eventId}&saved=1`);
}

/** Queue messages to the outbox and send the email ones (lib/email/deliver.ts). kind: invitation | reminder | save_the_date. */
export async function sendMessages(form: FormData) {
  const o = await edit("invitations");
  const kind = str(form, "kind") as "invitation" | "reminder" | "save_the_date";
  const eventId = str(form, "eventId");
  const channel = str(form, "channel") === "whatsapp" ? "whatsapp" : "email";
  const e = o.events.find((x) => x.id === eventId);
  const w = o.ctx.wedding;
  let targets = o.households;
  if (e) targets = targets.filter((h) => o.d.invitations.some((i) => i.householdId === h.id && i.eventId === e.id));
  if (kind === "invitation") targets = targets.filter((h) => h.deliveryStatus === "not_sent");
  if (kind === "reminder" && e) {
    targets = targets.filter((h) => {
      const inv = o.d.invitations.find((i) => i.householdId === h.id && i.eventId === e.id)!;
      return inv.guestIds.some((g) => !o.d.rsvps.some((r) => r.guestId === g && r.eventId === e.id));
    });
  }
  targets = targets.filter((h) => (channel === "email" ? h.email : h.phone));
  const base = await siteUrl("/");
  await mutate(o, (d) => {
    for (const h of targets) {
      const t = d.tokens.find((x) => x.householdId === h.id && !x.revokedAt);
      if (!t) continue;
      const link = new URL(`/i/${t.token}`, base).toString();
      const subject = kind === "save_the_date" ? `Save the date · ${w.partner1} & ${w.partner2}`
        : kind === "reminder" ? `Kind reminder to RSVP · ${e?.name ?? "our wedding"}` : `You're invited · ${w.partner1} & ${w.partner2}`;
      const body = kind === "reminder"
        ? `Assalamu alaikum ${h.name}, we'd love to know if you can join us for the ${e?.name}. Please reply here: ${link}?to=rsvp`
        : `Assalamu alaikum ${h.name}, ${kind === "save_the_date" ? "please save the date for" : "you are warmly invited to"} the wedding of ${w.partner1} & ${w.partner2}. Your personal invitation: ${link}`;
      d.outbox.unshift({ id: uid("msg"), weddingId: w.id, channel, to: channel === "email" ? h.email! : h.phone!, householdId: h.id, subject, body, kind, eventId: e?.id, createdAt: new Date().toISOString() });
      const hh = d.households.find((x) => x.id === h.id)!;
      if (kind === "invitation") hh.deliveryStatus = "sent";
    }
    audit(d, w.id, o.ctx.user.name, `send_${kind}`, `${targets.length} ${channel} messages${e ? ` · ${e.name}` : ""}`);
  });
  if (channel === "email") await deliverNow({ weddingId: w.id });
  refresh(o);
  redirect(`/dashboard/invitations?event=${eventId}&sent=${targets.length}`);
}

// ======================= RSVPs (public registrations) =======================

export async function setRegistrationStatus(form: FormData) {
  const o = await edit("rsvps");
  const id = str(form, "id");
  const status = str(form, "status") as "confirmed" | "waitlist" | "cancelled";
  const reg = o.d.registrations.find((r) => r.id === id);
  if (!reg || !o.events.some((e) => e.id === reg.eventId)) throw new Error("Not permitted");
  await mutate(o, (d) => {
    const r = d.registrations.find((x) => x.id === id)!;
    r.status = status;
    audit(d, o.ctx.wedding.id, o.ctx.user.name, "registration_status", `${r.name} → ${status}`);
  });
  refresh(o);
  redirect(`/dashboard/rsvps?event=${reg.eventId}`);
}

// ======================= CHECKLIST =======================

export async function addTask(form: FormData) {
  const o = await edit("checklist");
  const eventId = str(form, "eventId") || undefined;
  if (eventId && !o.events.some((e) => e.id === eventId)) throw new Error("Not permitted");
  if (o.scope.eventIds && !eventId) throw new Error("Choose an event");
  const t: Task = {
    id: uid("tsk"), weddingId: o.ctx.wedding.id, eventId, title: str(form, "title", 200), assignee: str(form, "assignee", 80),
    dueDate: str(form, "dueDate", 10) || undefined, done: false, side: (o.scope.side ?? (str(form, "side") || "both")) as Side,
  };
  if (!t.title) return;
  await mutate(o, (d) => { d.tasks.push(t); audit(d, o.ctx.wedding.id, o.ctx.user.name, "task_add", t.title); });
  refresh(o);
}

export async function toggleTask(form: FormData) {
  const o = await edit("checklist");
  const id = str(form, "id");
  await mutate(o, (d) => {
    const t = d.tasks.find((x) => x.id === id && x.weddingId === o.ctx.wedding.id);
    if (!t || (o.scope.eventIds && !o.scope.eventIds.includes(t.eventId ?? ""))) return;
    t.done = !t.done;
  });
  refresh(o);
}

export async function deleteTask(form: FormData) {
  const o = await edit("checklist");
  const id = str(form, "id");
  await mutate(o, (d) => { d.tasks = d.tasks.filter((x) => !(x.id === id && x.weddingId === o.ctx.wedding.id && (!o.scope.eventIds || o.scope.eventIds.includes(x.eventId ?? "")))); });
  refresh(o);
}

export async function addSuggestedTasks(form: FormData) {
  const o = await edit("checklist");
  const e = o.events.find((x) => x.id === str(form, "eventId"));
  if (!e) return;
  const SUGGESTED: Record<string, string[]> = {
    nikkah: ["Confirm imam / officiant", "Agree on Mahr", "Choose two witnesses (gawah) and wakeel", "Prepare Nikkah nama paperwork", "Arrange separate seating & prayer space", "Order mithai and dates", "Book chai & refreshments"],
    shaadi: ["Book venue", "Finalize caterer & tasting", "Stage decor", "Baraat arrival plan", "Rukhsati car", "Seating chart", "Photographer & videographer shot list"],
    walima: ["Book venue", "Finalize caterer", "Couple's entrance plan", "Family speeches", "Return favors", "Seating chart"],
    mehndi: ["Book henna artist", "Dholki song practice", "Mehndi favors & bangles", "Yellow/green decor", "Dance rehearsals"],
  };
  const list = SUGGESTED[e.type] ?? ["Book venue", "Plan menu", "Send invitations", "Confirm timeline"];
  await mutate(o, (d) => {
    for (const title of list) if (!d.tasks.some((t) => t.eventId === e.id && t.title === title))
      d.tasks.push({ id: uid("tsk"), weddingId: o.ctx.wedding.id, eventId: e.id, title, assignee: "", done: false, side: e.hostSide });
  });
  refresh(o);
}

// ======================= BUDGET & VENDORS =======================

export async function setTotalBudget(form: FormData) {
  const o = await edit("budget");
  if (o.scope.side) throw new Error("Only administrators and budget managers can change the overall budget");
  await mutate(o, (d) => { d.weddings.find((w) => w.id === o.ctx.wedding.id)!.totalBudget = Math.max(0, num(form, "total")); });
  refresh(o);
}

export async function saveExpense(form: FormData) {
  const o = await edit("budget");
  const id = str(form, "id");
  const responsibility = (o.scope.side ?? (str(form, "responsibility") || "both")) as Side;
  const values: Omit<Expense, "id" | "weddingId"> = {
    category: str(form, "category", 60) || "Other", description: str(form, "description", 200),
    eventId: str(form, "eventId") || undefined, vendorId: str(form, "vendorId") || undefined,
    estimated: num(form, "estimated"), actual: num(form, "actual"), paid: num(form, "paid"), responsibility, dueDate: str(form, "dueDate", 10) || undefined,
  };
  await mutate(o, (d) => {
    const ex = id && d.expenses.find((x) => x.id === id && x.weddingId === o.ctx.wedding.id);
    if (ex) {
      if (o.scope.side && ex.responsibility !== o.scope.side) return;
      Object.assign(ex, values);
    } else d.expenses.push({ id: uid("exp"), weddingId: o.ctx.wedding.id, ...values });
    audit(d, o.ctx.wedding.id, o.ctx.user.name, "expense_save", values.description);
  });
  refresh(o);
}

export async function deleteExpense(form: FormData) {
  const o = await edit("budget");
  const id = str(form, "id");
  await mutate(o, (d) => { d.expenses = d.expenses.filter((x) => !(x.id === id && x.weddingId === o.ctx.wedding.id && (!o.scope.side || x.responsibility === o.scope.side))); });
  refresh(o);
}

export async function saveVendor(form: FormData) {
  const o = await edit("vendors");
  const id = str(form, "id");
  const values: Omit<Vendor, "id" | "weddingId"> = {
    category: str(form, "category", 60), name: str(form, "name", 120), contact: str(form, "contact", 120),
    phone: str(form, "phone", 40) || undefined, email: str(form, "email", 200) || undefined,
    eventIds: form.getAll("eventIds").map(String), status: (str(form, "status") || "researching") as Vendor["status"], notes: str(form, "notes", 1000) || undefined,
  };
  if (!values.name) return;
  await mutate(o, (d) => {
    const v = id && d.vendors.find((x) => x.id === id && x.weddingId === o.ctx.wedding.id);
    if (v) Object.assign(v, values); else d.vendors.push({ id: uid("ven"), weddingId: o.ctx.wedding.id, ...values });
  });
  refresh(o);
}

export async function setVendorStatus(form: FormData) {
  const o = await edit("vendors");
  await mutate(o, (d) => {
    const v = d.vendors.find((x) => x.id === str(form, "id") && x.weddingId === o.ctx.wedding.id);
    if (v) v.status = str(form, "status") as Vendor["status"];
  });
  refresh(o);
}

export async function deleteVendor(form: FormData) {
  const o = await edit("vendors");
  await mutate(o, (d) => { d.vendors = d.vendors.filter((x) => !(x.id === str(form, "id") && x.weddingId === o.ctx.wedding.id)); });
  refresh(o);
}

// ======================= WEBSITE =======================

export async function saveWebsite(form: FormData) {
  const o = await edit("website");
  const slug = str(form, "slug", 60).toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  // Another wedding's slug is rejected by the unique index when this saves ("That web address is taken").
  const lines = (k: string, max = 8000) => str(form, k, max).split("\n").map((s) => s.trim()).filter(Boolean);
  await mutate(o, (d) => {
    const w = d.weddings.find((x) => x.id === o.ctx.wedding.id)!;
    Object.assign(w, {
      slug: slug || w.slug,
      partner1: str(form, "partner1", 60) || w.partner1, partner2: str(form, "partner2", 60) || w.partner2,
      partner1Family: str(form, "partner1Family", 60), partner2Family: str(form, "partner2Family", 60),
      tagline: str(form, "tagline", 200), heroImage: str(form, "heroImage", 500) || w.heroImage,
      gallery: lines("gallery"),
      story: str(form, "story", 10000).split(/\n\s*\n/).map((block) => { const [title, ...body] = block.trim().split("\n"); return { title: title.replace(/^#+\s*/, ""), body: body.join(" ").trim() }; }).filter((s) => s.title && s.body),
      faqs: str(form, "faqs", 10000).split(/\n\s*\n/).map((block) => { const [q, ...a] = block.trim().split("\n"); return { q: q.replace(/^Q:\s*/i, ""), a: a.join(" ").replace(/^A:\s*/i, "").trim() }; }).filter((f) => f.q && f.a),
      travel: {
        intro: str(form, "travelIntro", 1000), airport: str(form, "airport", 500),
        hotels: lines("hotels").map((l) => { const [name, ...note] = l.split("|"); return { name: name.trim(), note: note.join("|").trim() }; }),
      },
      registry: { message: str(form, "registryMessage", 1000), links: lines("registryLinks").map((l) => { const [label, url] = l.split("|"); return { label: label.trim(), url: (url ?? "").trim() }; }).filter((l) => /^https?:\/\//.test(l.url)) },
      theme: { id: str(form, "themeId") || "noor", heading: str(form, "heading") || "cormorant", pattern: str(form, "pattern") || "arch", accent: /^#[0-9a-f]{6}$/i.test(str(form, "accent")) ? str(form, "accent") : undefined } as ThemeSettings,
      culture: {
        ...w.culture,
        showBismillah: bool(form, "showBismillah"), islamicDates: bool(form, "islamicDates"),
        verse: { enabled: bool(form, "verseEnabled"), arabic: str(form, "verseArabic", 1000), translation: str(form, "verseTranslation", 1000), reference: str(form, "verseReference", 100) },
        urduNames: { partner1: str(form, "urdu1", 40), partner2: str(form, "urdu2", 40) },
        modestyNote: str(form, "modestyNote", 500), prayerNote: str(form, "prayerNote", 500), halalNote: str(form, "halalNote", 300),
      },
      passwordProtected: bool(form, "passwordProtected"), sitePassword: str(form, "sitePassword", 60) || w.sitePassword,
      published: bool(form, "published"),
    });
    audit(d, w.id, o.ctx.user.name, "website_update", "Website settings saved");
  });
  revalidatePath("/", "layout");
  redirect("/dashboard/website?saved=1");
}

// ======================= SETTINGS / COLLABORATORS =======================

export async function inviteCollaborator(form: FormData) {
  const o = await edit("settings");
  assertFeature(o, "collaborators");
  const email = str(form, "email", 200).toLowerCase();
  const role = str(form, "role") as Role;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Invalid email");
  // Adds an existing account right away, or holds the invitation until someone verifies that email.
  const { error } = await o.sb.rpc("invite_collaborator", {
    p_wedding: o.ctx.wedding.id, p_email: email, p_name: str(form, "name", 80), p_role: role,
    p_relationship: str(form, "relationship", 80), p_event_ids: role === "event_organizer" ? form.getAll("eventIds").map(String) : null,
  });
  if (error) throw new Error(error.message);
  await deliverNow({ weddingId: o.ctx.wedding.id, kind: "collaborator_invite" });
  refresh(o);
}

export async function cancelInvite(form: FormData) {
  const o = await edit("settings");
  const { error } = await o.sb.from("collaborator_invites").delete().eq("id", str(form, "id")).eq("wedding_id", o.ctx.wedding.id);
  if (error) throw new Error(error.message);
  refresh(o);
}

/** `op` is bound per button: "update" (the form's default) or "remove". */
export async function updateCollaborator(op: "update" | "remove", form: FormData) {
  const o = await edit("settings");
  await mutate(o, (d) => {
    const c = d.collaborators.find((x) => x.id === str(form, "id") && x.weddingId === o.ctx.wedding.id);
    if (!c || c.userId === o.ctx.user.id) return; // can't demote yourself
    if (op === "remove") { d.collaborators = d.collaborators.filter((x) => x !== c); audit(d, o.ctx.wedding.id, o.ctx.user.name, "collaborator_remove", c.relationship); return; }
    c.role = str(form, "role") as Role;
    c.eventIds = c.role === "event_organizer" ? form.getAll("eventIds").map(String) : undefined;
    audit(d, o.ctx.wedding.id, o.ctx.user.name, "collaborator_role", `${c.relationship} → ${c.role}`);
  });
  refresh(o);
}

export async function saveMahr(form: FormData) {
  const o = await edit("mahr");
  await mutate(o, (d) => {
    const w = d.weddings.find((x) => x.id === o.ctx.wedding.id)!;
    w.mahr = { amount: str(form, "amount", 200), notes: str(form, "notes", 2000) };
  });
  refresh(o);
}

export async function resetDemo() {
  const o = await edit("settings");
  if (!demoEnabled() || o.ctx.wedding.id !== DEMO_WEDDING_ID || o.scope.role !== "admin") throw new Error("Only the demo wedding can be reset");
  await loadDemoSeed(adminClient());
  revalidatePath("/", "layout");
  redirect("/dashboard");
}
