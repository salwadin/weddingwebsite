import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { columns, fromRow, type Row } from "./rows";
import { loadWeddingRow } from "./db";
import { serverClient } from "./supabase/server";
import type { Collaborator, User, Wedding } from "./types";

// Organizers and vendors sign in with Supabase Auth (email + password, verified
// email). Its session lives in Supabase's own cookies, refreshed by proxy.ts.
// Guests never sign in: their personal invitation link sets GUEST_COOKIE.
export const GUEST_COOKIE = "q_guest";
/** Proof that this browser entered a wedding's site password (see site_unlock()). */
export const siteCookie = (slug: string) => `q_site_${slug}`;

const secure = process.env.NODE_ENV === "production";

/** The signed-in user (verified with Supabase Auth on every request), or null. */
export const currentUser = cache(async (): Promise<User | null> => {
  const sb = await serverClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data: p } = await sb.from("profiles").select("name,kind").eq("id", user.id).maybeSingle();
  return {
    id: user.id, email: user.email ?? "", name: (p?.name as string) ?? user.email ?? "",
    kind: (p?.kind as User["kind"]) ?? "couple", createdAt: user.created_at,
  };
});

export interface OrgContext {
  user: User;
  wedding: Wedding;
  collaborator: Collaborator;
}

/** The organizer's wedding + role, or null when signed out / not a collaborator. */
export const organizerContext = cache(async (): Promise<OrgContext | null> => {
  const user = await currentUser();
  if (!user) return null;
  const sb = await serverClient();
  const { data } = await sb.from("wedding_collaborators").select(columns("collaborators"))
    .eq("user_id", user.id).order("invited_at").limit(1).maybeSingle();
  if (!data) return null;
  const collaborator = fromRow("collaborators", data as unknown as Row);
  const wedding = await loadWeddingRow(sb, collaborator.weddingId);
  return wedding ? { user, wedding, collaborator } : null;
});

// ---------- guest sessions (personalized invitation links) ----------

/** The raw invitation token from this browser's cookie. Only ever sent to the guest RPCs. */
export async function guestToken() {
  return (await cookies()).get(GUEST_COOKIE)?.value ?? null;
}

export async function setGuestSession(token: string) {
  (await cookies()).set(GUEST_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", secure, maxAge: 60 * 60 * 24 * 180 });
}

// ---------- site password ----------

export async function siteKey(slug: string) {
  return (await cookies()).get(siteCookie(slug))?.value ?? null;
}

export async function grantSiteAccess(slug: string, key: string) {
  (await cookies()).set(siteCookie(slug), key, { httpOnly: true, sameSite: "lax", path: "/", secure, maxAge: 60 * 60 * 24 * 60 });
}

// ---------- auth helpers ----------

/** Absolute URL on this site, for links inside auth emails. */
export async function siteUrl(path: string) {
  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  return new URL(path, origin).toString();
}

/** Where a signed-in user belongs: vendors to their portal, couples to their wedding (or onboarding). */
export async function homeFor(userId: string) {
  const sb = await serverClient();
  const { data: p } = await sb.from("profiles").select("kind").eq("id", userId).maybeSingle();
  if (p?.kind === "vendor") return "/vendor";
  const { count } = await sb.from("wedding_collaborators").select("id", { count: "exact", head: true }).eq("user_id", userId);
  return count ? "/dashboard" : "/onboarding";
}
