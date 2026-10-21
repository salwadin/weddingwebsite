// Mapping between the domain types in lib/types.ts and database rows.
// Shared by the app (lib/db.ts), the seed script and the tests, so no server-only import.
import type { Database, Wedding } from "./types";

export type Row = Record<string, unknown>;
export type TableKey = Exclude<keyof Database, "users" | "invites" | "weddings">;

export interface TableSpec {
  table: string;
  /** Every field of the domain type that maps to a column, in camelCase. */
  fields: string[];
  /** camelCase field → column name, where it isn't the plain snake_case form. */
  rename?: Record<string, string>;
  /** Required string fields: a null column reads back as "". */
  strings?: string[];
  /** Array / jsonb-list fields (NOT NULL in the schema): undefined is written as []. */
  lists?: string[];
  /**
   * How changed rows are written back: `upsert` in batches (tables whose policy
   * covers insert + update), `update` row by row (update-only policies), or
   * `append` (logs: only new rows are written, nothing is ever changed or deleted).
   */
  write: "upsert" | "update" | "append" | "readonly";
  /** For `update` tables: the columns that may change. */
  updatable?: string[];
}

export const TABLES: Record<TableKey, TableSpec> = {
  collaborators: { table: "wedding_collaborators", write: "upsert", strings: ["relationship"],
    fields: ["id", "weddingId", "userId", "role", "relationship", "eventIds", "invitedAt"] },
  events: { table: "events", write: "upsert", lists: ["mealOptions", "timeline", "palette"],
    strings: ["startTime", "endTime", "venueName", "address", "dressCode", "description", "publicMessage"],
    fields: ["id", "weddingId", "type", "name", "date", "startTime", "endTime", "venueName", "address", "dressCode", "description",
      "publicMessage", "hostSide", "visibility", "rsvpMode", "rsvpDeadline", "capacity", "waitlist", "mealOptions", "timeline",
      "genderSeparated", "womenOnly", "noPhotography", "prayerSpace", "halal", "budget", "sortOrder", "palette"] },
  households: { table: "households", write: "upsert", strings: ["relationship"], lists: ["tags"],
    fields: ["id", "weddingId", "name", "side", "relationship", "tags", "email", "phone", "notes", "deliveryStatus", "createdAt"] },
  guests: { table: "guests", write: "upsert", rename: { table: "seating_table" }, strings: ["lastName"],
    fields: ["id", "householdId", "firstName", "lastName", "isChild", "isPrimary", "isPlusOne", "email", "phone", "dietary", "table"] },
  invitations: { table: "event_invitations", write: "upsert", lists: ["guestIds"], fields: ["id", "householdId", "eventId", "guestIds", "createdAt"] },
  rsvps: { table: "rsvp_responses", write: "upsert",
    fields: ["id", "eventId", "guestId", "householdId", "status", "meal", "updatedAt", "updatedVia"] },
  // token_hash is added on insert (lib/db.ts); the raw token is never stored.
  tokens: { table: "invitation_tokens", write: "update", updatable: ["revoked_at", "last_used_at", "use_count"],
    fields: ["id", "householdId", "weddingId", "createdAt", "revokedAt", "lastUsedAt", "useCount"] },
  registrations: { table: "public_registrations", write: "update", updatable: ["status"],
    fields: ["id", "eventId", "name", "email", "phone", "adults", "children", "status", "duplicateOf", "createdAt"] },
  vendors: { table: "vendors", write: "upsert", strings: ["contact"], lists: ["eventIds"],
    fields: ["id", "weddingId", "category", "name", "contact", "phone", "email", "eventIds", "status", "notes", "listingId"] },
  expenses: { table: "expenses", write: "upsert",
    fields: ["id", "weddingId", "eventId", "vendorId", "category", "description", "estimated", "actual", "paid", "responsibility", "dueDate"] },
  tasks: { table: "tasks", write: "upsert", strings: ["assignee"],
    fields: ["id", "weddingId", "eventId", "title", "assignee", "dueDate", "done", "side"] },
  designs: { table: "invitation_designs", write: "upsert", strings: ["englishText", "urduText", "arabicText"],
    fields: ["id", "weddingId", "eventId", "template", "englishText", "urduText", "arabicText", "showQr"] },
  outfits: { table: "outfits", write: "upsert", strings: ["designer"], lists: ["colors", "pieces", "fittings"],
    fields: ["id", "weddingId", "eventId", "vendorId", "wearer", "role", "side", "title", "designer", "status", "colors", "image",
      "cost", "paid", "dueDate", "pieces", "fittings", "notes"] },
  boards: { table: "boards", write: "upsert", lists: ["items"], fields: ["id", "weddingId", "eventId", "name", "kind", "items", "updatedAt"] },
  outbox: { table: "outbox", write: "append", rename: { to: "recipient" }, strings: ["subject", "body"],
    fields: ["id", "weddingId", "channel", "to", "householdId", "subject", "body", "kind", "eventId", "createdAt", "status", "sentAt", "error"] },
  // audit_log.id is an identity column: read back as a string, never sent.
  audit: { table: "audit_log", write: "append", strings: ["detail"], fields: ["weddingId", "at", "actor", "action", "detail"] },
  listings: { table: "listings", write: "readonly", strings: ["city", "tagline", "description"], lists: ["serves", "images", "tags", "traditions"],
    fields: ["id", "ownerUserId", "name", "category", "city", "serves", "tagline", "description", "images", "priceRange", "tags",
      "traditions", "email", "phone", "website", "tier", "rating", "reviewCount", "published", "views", "createdAt"] },
  inquiries: { table: "inquiries", write: "readonly",
    fields: ["id", "listingId", "weddingId", "fromName", "fromEmail", "eventDate", "guests", "message", "status", "createdAt"] },
};

export const WEDDING_FIELDS = ["id", "slug", "partner1", "partner2", "partner1Family", "partner2Family", "tagline", "heroImage", "story",
  "gallery", "faqs", "travel", "registry", "theme", "culture", "passwordProtected", "published", "totalBudget", "currency", "createdAt",
  "plan", "trialEndsAt", "tradition", "customDomain"];
/** Columns an administrator may change directly (plan/trial/password go through the server). */
export const WEDDING_UPDATABLE = WEDDING_FIELDS.filter((f) => !["id", "createdAt", "plan", "trialEndsAt"].includes(f));
const WEDDING_STRINGS = ["partner1Family", "partner2Family", "tagline", "heroImage"];

export const snake = (s: string) => s.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
const col = (spec: Pick<TableSpec, "rename">, f: string) => spec.rename?.[f] ?? snake(f);

/** "19:00:00" → "19:00" (Postgres `time` → the app's HH:mm). */
const hhmm = (v: unknown) => (typeof v === "string" && /^\d{2}:\d{2}:\d{2}/.test(v) ? v.slice(0, 5) : v);

function read(fields: string[], spec: Pick<TableSpec, "rename" | "strings">, row: Row) {
  const out: Row = {};
  for (const f of fields) {
    const c = col(spec, f);
    if (!(c in row)) continue;
    let v = row[c];
    if (v === null) v = spec.strings?.includes(f) ? "" : undefined;
    if (f === "startTime" || f === "endTime") v = hhmm(v);
    if (v !== undefined) out[f] = v;
  }
  return out;
}

function write(fields: string[], spec: Pick<TableSpec, "rename" | "lists">, obj: Row) {
  const out: Row = {};
  for (const f of fields) {
    let v = obj[f];
    if (v === undefined && spec.lists?.includes(f)) v = [];
    else if (v === undefined || (v === "" && (f === "startTime" || f === "endTime" || f.endsWith("Date") || f === "rsvpDeadline"))) v = null;
    out[col(spec, f)] = v;
  }
  return out;
}

export function fromRow<K extends TableKey>(key: K, row: Row): Database[K][number] {
  const spec = TABLES[key];
  const out = read(spec.fields, spec, row);
  if (key === "audit") out.id = String(row.id);
  return out as unknown as Database[K][number];
}

/** Every column of the table, so batched upserts never fall back to defaults for a missing key. */
export function toRow(key: TableKey, obj: object): Row {
  return write(TABLES[key].fields, TABLES[key], obj as Row);
}

export function weddingFromRow(row: Row): Wedding {
  return read(WEDDING_FIELDS, { strings: WEDDING_STRINGS }, row) as unknown as Wedding;
}

export function weddingToRow(w: Wedding, fields = WEDDING_FIELDS): Row {
  return write(fields, {}, w as unknown as Row);
}

/** Column list for a select, e.g. "id,wedding_id,…". */
export const columns = (key: TableKey | "weddings") =>
  key === "weddings" ? WEDDING_FIELDS.map(snake).join(",") : TABLES[key].fields.map((f) => col(TABLES[key], f)).concat(key === "audit" ? ["id"] : []).join(",");
