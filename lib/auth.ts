import "server-only";
import { cookies } from "next/headers";
import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import { db, mutate } from "./db";
import type { Collaborator, Household, InviteToken, User, Wedding } from "./types";

const SECRET = process.env.SESSION_SECRET || "qubool-dev-secret-change-me";
export const ORG_COOKIE = "q_org";
export const GUEST_COOKIE = "q_guest";
export const siteCookie = (weddingId: string) => `q_site_${weddingId}`;

function sign(value: string) {
  return createHmac("sha256", SECRET).update(value).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function verifyPassword(pw: string, stored: string) {
  const [salt, hash] = stored.split(":");
  return safeEqual(scryptSync(pw, salt, 32).toString("hex"), hash);
}

// ---------- organizer sessions ----------

export async function startOrganizerSession(userId: string) {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 14;
  const payload = `${userId}.${exp}`;
  (await cookies()).set(ORG_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 14,
  });
}

export async function endOrganizerSession() {
  (await cookies()).delete(ORG_COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const raw = (await cookies()).get(ORG_COOKIE)?.value;
  if (!raw) return null;
  const [userId, exp, sig] = raw.split(".");
  if (!userId || !exp || !sig || !safeEqual(sign(`${userId}.${exp}`), sig) || Number(exp) < Date.now()) return null;
  return db().users.find((u) => u.id === userId) ?? null;
}

export interface OrgContext {
  user: User;
  wedding: Wedding;
  collaborator: Collaborator;
}

/** The organizer's wedding + role, or null when signed out / not a collaborator. */
export async function organizerContext(): Promise<OrgContext | null> {
  const user = await currentUser();
  if (!user) return null;
  const d = db();
  const collaborator = d.collaborators.find((c) => c.userId === user.id);
  if (!collaborator) return null;
  const wedding = d.weddings.find((w) => w.id === collaborator.weddingId);
  return wedding ? { user, wedding, collaborator } : null;
}

// ---------- guest sessions (personalized invitation links) ----------

/** Validate a token: must exist and not be revoked. Constant work regardless of outcome. */
export function lookupToken(token: string | undefined): InviteToken | null {
  if (!token || token.length < 20 || token.length > 64) return null;
  const t = db().tokens.find((x) => x.token.length === token.length && safeEqual(x.token, token));
  return t && !t.revokedAt ? t : null;
}

export async function setGuestSession(token: string) {
  (await cookies()).set(GUEST_COOKIE, token, {
    httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 180,
  });
}

/**
 * The household behind the current visitor's invitation cookie, scoped to one wedding.
 * A token for a different wedding, or a revoked token, yields null (public view).
 */
export async function guestHousehold(weddingId: string): Promise<Household | null> {
  const t = lookupToken((await cookies()).get(GUEST_COOKIE)?.value);
  if (!t || t.weddingId !== weddingId) return null;
  return db().households.find((h) => h.id === t.householdId && h.weddingId === weddingId) ?? null;
}

export function recordTokenUse(token: string) {
  mutate((d) => {
    const t = d.tokens.find((x) => x.token === token);
    if (t) { t.lastUsedAt = new Date().toISOString(); t.useCount++; }
    const h = t && d.households.find((x) => x.id === t.householdId);
    if (h && h.deliveryStatus !== "bounced") h.deliveryStatus = "opened";
  });
}

// ---------- site password ----------

export async function hasSiteAccess(w: Wedding) {
  if (!w.passwordProtected) return true;
  if (await guestHousehold(w.id)) return true; // personal links bypass the shared password
  if (await organizerContext()) return true;
  const v = (await cookies()).get(siteCookie(w.id))?.value;
  return !!v && safeEqual(v, sign(`${w.id}:${w.sitePassword ?? ""}`));
}

export async function grantSiteAccess(w: Wedding) {
  (await cookies()).set(siteCookie(w.id), sign(`${w.id}:${w.sitePassword ?? ""}`), {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 60,
  });
}
