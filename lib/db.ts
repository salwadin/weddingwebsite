import "server-only";
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { buildSeed, DB_VERSION } from "./seed";
import type { AuditEntry, Database } from "./types";

/**
 * Local persistence: a single JSON document, written atomically on every change.
 * It is created from the sample wedding the first time the app runs.
 * Every read/write goes through this module, which is server-only, so nothing
 * here can be bundled into client code. See README → "Moving to Supabase".
 *
 * On Vercel (read-only filesystem) the file lives in /tmp, which is temporary:
 * changes last while an instance is warm, then the sample wedding is rebuilt.
 */
const FILE = process.env.QUBOOL_DATA_FILE
  || (process.env.VERCEL ? "/tmp/qubool-db.json" : path.join(process.cwd(), "data", "db.json"));

const g = globalThis as unknown as { __qubool?: Database };

function load(): Database {
  if (g.__qubool) return g.__qubool;
  const saved = fs.existsSync(FILE) ? (JSON.parse(fs.readFileSync(FILE, "utf8")) as Database) : null;
  if (saved && saved.version === DB_VERSION) {
    g.__qubool = saved;
  } else {
    g.__qubool = buildSeed();
    persist(g.__qubool);
  }
  return g.__qubool;
}

function persist(db: Database) {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    const tmp = FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, FILE);
  } catch (err) {
    // Keep serving from memory if the disk isn't writable.
    console.warn("[qubool] could not save data file:", (err as Error).message);
  }
}

export function db(): Database {
  return load();
}

/** Run a mutation and persist it. */
export function mutate<T>(fn: (db: Database) => T): T {
  const d = load();
  const out = fn(d);
  persist(d);
  return out;
}

export function resetDb() {
  g.__qubool = buildSeed();
  persist(g.__qubool);
}

export function uid(prefix: string) {
  return `${prefix}_${randomBytes(9).toString("base64url")}`;
}

export function audit(d: Database, weddingId: string, actor: string, action: string, detail: string) {
  const entry: AuditEntry = { id: uid("aud"), weddingId, at: new Date().toISOString(), actor, action, detail };
  d.audit.unshift(entry);
  if (d.audit.length > 2000) d.audit.length = 2000;
}
